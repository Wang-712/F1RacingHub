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

DOMAIN="_"  # IP 模式部署，server_name 使用 _ 匹配任意 Host
EMAIL="admin@F1RacingHub.com"  # 证书到期提醒邮箱（暂未启用 HTTPS）

echo "=========================================="
echo "  F1 Racing Hub 部署脚本（HTTP/IP 模式）"
echo "=========================================="

# ---------- 1. 安装 Docker & Docker Compose ----------
if ! command -v docker &> /dev/null; then
    echo "[1/4] 安装 Docker..."
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
    echo "[1/4] Docker 已安装，跳过。"
fi

# ---------- 1.1 配置 Docker 镜像加速（国内服务器必需） ----------
echo "      配置 Docker 镜像加速器..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://hub.rat.dev",
    "https://docker.1panel.live",
    "https://docker.nastool.de"
  ],
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl daemon-reload
systemctl restart docker
echo "      镜像加速器配置完成。"

# ---------- 2. 构建镜像 ----------
echo "[2/4] 构建前后端镜像（首次较慢）..."
docker compose build --pull

# ---------- 3. 启动服务 ----------
echo "[3/4] 启动服务..."
docker compose up -d
sleep 3
PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org || echo "服务器公网IP")
echo "服务已启动，HTTP 访问：http://${PUBLIC_IP}"

# ---------- 4. 健康检查 ----------
echo "[4/4] 健康检查..."
HEALTH_OK=false
for i in {1..10}; do
    if curl -s --max-time 5 "http://localhost/health" | grep -q "ok"; then
        echo "前端健康检查通过。"
        HEALTH_OK=true
        break
    fi
    sleep 2
done
for i in {1..10}; do
    if curl -s --max-time 5 "http://localhost/api/health" | grep -q "ok"; then
        echo "后端健康检查通过。"
        HEALTH_OK=true
        break
    fi
    sleep 2
done

echo ""
echo "=========================================="
echo "  部署完成！(HTTP 模式，未启用 HTTPS)"
echo "  访问地址：http://${PUBLIC_IP}"
echo "=========================================="
echo ""
echo "后续如需启用 HTTPS："
echo "  1) 将域名 A 记录解析到本服务器公网 IP"
echo "  2) 阿里云控制台完成 ICP 备案"
echo "  3) 修改 deploy.sh 中的 DOMAIN 为你的域名"
echo "  4) 重新执行部署脚本以申请 Let's Encrypt 证书"
echo ""
echo "常用命令："
echo "  查看日志：  docker compose logs -f [backend|frontend]"
echo "  重启服务：  docker compose restart"
echo "  更新部署：  git pull && docker compose up -d --build"
echo "  停止服务：  docker compose down"
