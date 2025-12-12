# 阿里云服务器部署登录问题排查指南

## 问题描述
在阿里云服务器上部署后无法登录，即使确认使用了与 `.env` 文件一致的密码。

## 常见原因与解决方案

### 1. 环境变量未正确加载 ⚠️ (最常见)

**原因：**
- `.env` 文件不在正确的位置
- 应用启动时工作目录不正确
- `.env` 文件格式有问题（隐藏字符、编码问题）

**诊断步骤：**

```bash
# 1. 进入项目目录
cd /path/to/cortex

# 2. 运行诊断脚本
node diagnose-env.js

# 3. 查看应用启动日志
# 应该能看到类似这样的输出：
# === Cortex Environment Variables Status ===
# NODE_ENV: production
# WEB_PASSWORD exists in process.env: true
# WEB_PASSWORD exists in env: true
# WEB_PASSWORD length: 16
```

**如果诊断脚本显示变量未加载：**

```bash
# 检查 .env 文件是否存在
ls -la .env

# 查看文件内容（小心，会显示密码）
cat .env

# 检查文件编码（应该是 UTF-8，没有 BOM）
file .env

# 检查是否有隐藏字符
cat -A .env
```

**解决方案 A: 修复 .env 文件**

确保 `.env` 文件格式正确：

```env
# 正确的格式
WEB_PASSWORD=your-password-here
API_SECRET=your-api-secret-here
SESSION_SECRET=your-session-secret-at-least-32-chars

# 如果密码包含特殊字符或空格，使用引号
WEB_PASSWORD="my password with spaces"
API_SECRET="secret!@#$%"

# 错误的格式示例（不要这样写）
WEB_PASSWORD = your-password-here  # ❌ 等号两边有空格
WEB_PASSWORD='your-password-here'  # ❌ 使用单引号可能有问题
WEB_PASSWORD=your-password-here    # ❌ 后面有隐藏空格
```

**解决方案 B: 直接设置系统环境变量（推荐用于生产环境）**

如果使用 systemd：

```bash
# 编辑服务文件
sudo nano /etc/systemd/system/cortex.service

# 添加环境变量
[Service]
Environment="WEB_PASSWORD=your-password"
Environment="API_SECRET=your-secret"
Environment="SESSION_SECRET=your-session-secret"
Environment="NODE_ENV=production"

# 重新加载并重启
sudo systemctl daemon-reload
sudo systemctl restart cortex
```

如果使用 PM2：

```bash
# 方法 1: 使用 ecosystem 配置文件
pm2 ecosystem

# 编辑 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cortex',
    script: 'build/index.js',
    env: {
      NODE_ENV: 'production',
      WEB_PASSWORD: 'your-password',
      API_SECRET: 'your-secret',
      SESSION_SECRET: 'your-session-secret'
    }
  }]
}

# 使用配置文件启动
pm2 start ecosystem.config.js

# 方法 2: 命令行指定
pm2 start build/index.js --name cortex \
  --env WEB_PASSWORD=your-password \
  --env API_SECRET=your-secret \
  --env SESSION_SECRET=your-session-secret \
  --env NODE_ENV=production
```

### 2. HTTPS/HTTP Cookie 安全问题 🔒

**原因：**
生产环境下 Cookie 的 `secure` 属性被设置为 `true`，但服务器使用的是 HTTP 而不是 HTTPS。

**症状：**
- 登录时没有错误提示
- 登录后立即被重定向回登录页
- 浏览器开发者工具中看不到 `cortex_session` Cookie

**诊断：**

```bash
# 检查服务器是否使用 HTTPS
curl -I http://your-server-ip:port

# 或在浏览器中打开开发者工具 (F12)
# 1. 尝试登录
# 2. 查看 Network 标签
# 3. 找到登录请求的响应
# 4. 查看 Set-Cookie 头
```

**解决方案 A: 如果使用 HTTP（开发/内网环境）**

在 `.env` 文件中添加：

```env
# 强制禁用 secure cookie（仅用于 HTTP）
FORCE_SECURE_COOKIE=false
```

**解决方案 B: 如果使用 HTTPS（推荐）**

配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 密码格式问题

**原因：**
密码包含特殊字符但没有正确转义。

**检查：**

```bash
# 运行诊断脚本查看密码长度
node diagnose-env.js

# 比较预期长度和实际长度
```

**解决方案：**

如果密码包含以下字符，务必使用双引号：
- 空格
- `#` (会被当作注释)
- `$` (可能被解析为变量)
- `` ` `` (反引号)
- `"` (引号本身需要转义)

```env
# 正确
WEB_PASSWORD="password with spaces"
WEB_PASSWORD="password#with#hash"
WEB_PASSWORD="password\$with\$dollar"

# 错误
WEB_PASSWORD=password with spaces
WEB_PASSWORD=password#with#hash  # 会被截断
```

### 4. 工作目录问题

**原因：**
应用启动时的工作目录不是项目根目录。

**诊断：**

查看应用启动日志中的 "Working directory" 输出。

**解决方案：**

确保应用从正确的目录启动：

```bash
# systemd
[Service]
WorkingDirectory=/path/to/cortex
ExecStart=/usr/bin/node build/index.js

# PM2
pm2 start build/index.js --cwd /path/to/cortex

# 直接运行
cd /path/to/cortex && node build/index.js
```

## 完整的排查流程

### 步骤 1: 运行诊断脚本

```bash
cd /path/to/cortex
node diagnose-env.js
```

### 步骤 2: 查看应用日志

```bash
# PM2
pm2 logs cortex --lines 100

# systemd
journalctl -u cortex -n 100 -f

# 或直接启动查看输出
node build/index.js
```

查找以下日志输出：

```
=== Cortex Environment Variables Status ===
NODE_ENV: production
WEB_PASSWORD exists in process.env: true  ← 应该是 true
WEB_PASSWORD exists in env: true          ← 应该是 true
WEB_PASSWORD length: 16                   ← 检查长度是否正确
```

尝试登录时查找：

```
[auth] verifyPassword called - WEB_PASSWORD set: true, provided length: 16, expected length: 16
[session] Cookie set with secure: false, NODE_ENV: production
```

### 步骤 3: 测试登录

```bash
# 使用 curl 测试（替换密码和地址）
curl -X POST http://your-server:3000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "password=your-password" \
  -v

# 查看响应中是否有 Set-Cookie
```

### 步骤 4: 检查浏览器

1. 打开浏览器开发者工具 (F12)
2. 切换到 Application/Storage 标签
3. 查看 Cookies
4. 尝试登录
5. 确认是否设置了 `cortex_session` Cookie

## 快速修复清单

```bash
# 1. 确保在正确目录
cd /path/to/cortex
pwd

# 2. 确认 .env 文件存在且格式正确
cat .env
node diagnose-env.js

# 3. 如果使用 HTTP，添加此行到 .env
echo "FORCE_SECURE_COOKIE=false" >> .env

# 4. 重启应用
pm2 restart cortex
# 或
sudo systemctl restart cortex

# 5. 查看日志
pm2 logs cortex --lines 50
# 或
journalctl -u cortex -n 50 -f

# 6. 再次尝试登录
```

## 仍然无法解决？

请提供以下信息：

1. `node diagnose-env.js` 的完整输出
2. 应用启动日志（前 100 行）
3. 登录尝试时的日志输出
4. 浏览器控制台的错误信息
5. Network 标签中登录请求的详细信息

## 安全提示

- 生产环境不要在日志中输出实际密码
- 使用强密码（至少 16 字符，包含大小写字母、数字、符号）
- 定期更换密码
- 使用 HTTPS
- 考虑使用更高级的认证方式（OAuth, JWT 等）
