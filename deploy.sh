#!/usr/bin/env bash
# =============================================================
# F1 Racing Hub - 一键部署脚本
# 适用环境：阿里云 Ubuntu 22.04 / 24.04
# 使用方式：
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# 前置条件：
#   1. 域名 F1RacingHub.com 已解析到本服务器公网 IP
#   2. 阿里云安全组已放行 80、443 端口
#   3. 本脚本位于项目根目录（包含 docker-compose.yml）
# =============================================================
set -euo pipefail

DOMAIN="F1RacingHub.com"
EMAIL="admin@F1RacingHub.com"  # 证书到期提醒邮箱

echo "=========================================="
echo "  F1 Racing Hub 部署脚本"
echo "=========================================="

# ---------- 1. 安装 Docker & Docker Compose ----------
if ! command -v docker &> /dev/null; then
    echo "[1/6] 安装 Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    echo "Docker 安装完成。"
else
    echo "[1/6] Docker 已安装，跳过。"
fi

# ---------- 2. 构建镜像 ----------
echo "[2/6] 构建前后端镜像（首次较慢）..."
docker compose build --pull

# ---------- 3. 启动服务（HTTP 模式，用于申请证书） ----------
echo "[3/6] 启动服务（HTTP 模式）..."
docker compose up -d
sleep 3
echo "服务已启动，HTTP 访问：http://${DOMAIN}"

# ---------- 4. 健康检查 ----------
echo "[4/6] 健康检查..."
for i in {1..10}; do
    if curl -s --max-time 5 "http://localhost/api/health" | grep -q "ok"; then
        echo "后端健康检查通过。"
        break
    fi
    sleep 2
done

# ---------- 5. 申请 Let's Encrypt SSL 证书 ----------
echo "[5/6] 申请 SSL 证书..."
if ! command -v certbot &> /dev/null; then
    apt-get install -y -qq certbot
fi

# 用 webroot 模式申请（80 端口已由 nginx 提供验证路径）
certbot certonly \
    --webroot -w ./certbot-webroot \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos --no-eff-email \
    --keep-until-expiring || \
echo "证书申请失败或已存在，将继续使用 HTTP 模式（可稍后手动申请）。"

# ---------- 6. 切换到 HTTPS 配置 ----------
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "[6/6] 切换到 HTTPS 配置..."
    cp nginx/default-ssl.conf nginx/default.conf
    docker compose restart frontend
    sleep 2
    echo "=========================================="
    echo "  部署完成！"
    echo "  访问地址：https://${DOMAIN}"
    echo "=========================================="
else
    echo "[6/6] 未检测到证书，保持 HTTP 模式。"
    echo "  手动申请证书后执行："
    echo "    cp nginx/default-ssl.conf nginx/default.conf"
    echo "    docker compose restart frontend"
fi

# ---------- 配置证书自动续签 ----------
echo ""
echo "配置证书自动续签（每日检查）..."
( crontab -l 2>/dev/null | grep -v "certbot renew" ; \
  echo "0 3 * * * certbot renew --quiet && docker restart f1-frontend" ) | crontab -
echo "完成。"

echo ""
echo "常用命令："
echo "  查看日志：  docker compose logs -f [backend|frontend]"
echo "  重启服务：  docker compose restart"
echo "  更新部署：  git pull && docker compose up -d --build"
echo "  停止服务：  docker compose down"
