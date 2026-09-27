# ---------- 后端 FastAPI 容器 ----------
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量：Python 不写 .pyc、输出不缓冲
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 仅复制依赖清单，利用 Docker 缓存层
COPY requirements.txt .

# 安装依赖（国内服务器可改用清华源加速，此处保留官方源）
RUN pip install -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动：uvicorn 监听 0.0.0.0:8000（容器内所有网卡）
# 生产环境不加 --reload；workers=2 提升并发
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
