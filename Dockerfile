# =============================================================
# 前端 Dockerfile（React + Vite）
# 多阶段构建：第一阶段用 node 打包静态资源，第二阶段用 nginx 托管
# =============================================================

# ---------- 阶段一：构建 ----------
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖清单，利用缓存层
COPY package*.json ./

# 国内服务器可改用淘宝源加速：
# RUN npm config set registry https://registry.npmmirror.com
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# ---------- 阶段二：运行（nginx 托管静态文件 + 反代后端） ----------
FROM nginx:alpine

# 删除 nginx 默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 nginx 配置（托管 SPA + /api 反代到 backend）
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
