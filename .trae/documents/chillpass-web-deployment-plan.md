# ChillPass Web 部署方案

## 摘要

将 ChillPassWeb 从本地离线应用部署为本地 Windows 机器上的 Web 服务，同学可通过学校内网访问（链接形式：`http://本机IP:3001`）。ChillPassWeb 项目已具备完整的 Express 后端 + SQLite 数据库 + JWT 认证架构，部署工作聚焦于配置调整、前端构建、Windows 服务化、网络配置四个环节。

---

## 当前状态分析

### 项目架构（ChillPassWeb）

| 层级 | 技术栈 | 状态 |
|------|--------|------|
| 前端 | React 18 + TypeScript + Vite 5 | 源码完整，需构建后通过 Express 托管 |
| 后端 | Express 4 + SQLite (better-sqlite3) | 完整可用，10 张表，自动迁移 |
| 认证 | JWT (jsonwebtoken) + bcryptjs | 完整可用，7 天过期 |
| 文件 | multer 上传到 `data/uploads/` | 完整可用 |
| AI | 通过 DeepSeek API（支持流式/非流式） | 完整可用，API Key 可从环境变量或用户设置读取 |

### 关键发现

1. 后端已绑定 `0.0.0.0:3001`，已有局域网访问能力
2. 前端 API 客户端已指向 `/api`（通过 Express 静态文件服务代理）
3. 后端 `server/src/index.js` 已内置 dist/ 静态文件服务 + SPA 路由回退
4. 数据库 Schema 自动迁移，无需手动建表
5. vite.config.ts 中 `base: './'` 是为本地文件协议设计的，Web 部署需要改为 `'/'`

---

## 变更方案

### 1. 复制项目文件到 chillpasslink

**源目录**：`C:\Users\chenyuchong\Products\ChillPassWeb`

**目标目录**：`C:\Users\chenyuchong\Products\chillpasslink`

**复制内容**：前端源码 + 后端源码 + 配置文件，排除本地开发/桌面端相关文件

| 复制项 | 说明 |
|--------|------|
| `server/`（不含 node_modules） | 先复制源码，再在目标目录安装依赖 |
| `src/` | 前端源码，用于构建 |
| `public/` | 前端静态资源 |
| `index.html` | Vite 入口 HTML |
| `package.json` + `package-lock.json` | 前端依赖清单 |
| `tsconfig.json` + `tsconfig.node.json` | TypeScript 配置 |
| `vite.config.ts` | 需要修改后复制 |

**不复制**：`node_modules/`、`dist/`、`build/`、`release/`、`installer/`、`server.mjs`、`tray.ps1`、`start-dev.bat`、`start-server.bat`、`使用说明.md`（这些是开发/单机/桌面端相关，不适用于服务端部署）。

### 2. 修改 Vite 配置

**文件**：`vite.config.ts`

**改动**：`base: './'` → `base: '/'`

**原因**：`'./'` 是为 Electron 本地文件协议设计的，Web 部署下会导致资源加载路径错误（例如 CSS/JS 引用变为相对路径，浏览器解析时路径拼接出错）。

### 3. 配置生产环境变量

**文件**：`server/.env`

```ini
PORT=3001
JWT_SECRET=<生成一个安全的随机 64 字符十六进制字符串>
CHILLPASS_DB_PATH=./data/chillpass.db
UPLOAD_DIR=./data/uploads
DEEPSEEK_API_KEY=<填入实际的 DeepSeek API Key，可选>
```

**JWT_SECRET 生成方式**：使用 PowerShell 的 `RNGCryptoServiceProvider` 生成 32 字节（64 个十六进制字符）的随机字符串。当前默认值 `chillpass-jwt-secret-change-in-production` 在生产环境必须更换，否则任何知道此默认值的人都可以伪造 JWT 令牌。

**DEEPSEEK_API_KEY 说明**：可以留空让用户在 Web 设置页面自行配置，也可在 `.env` 中预配置一个共享 Key 方便所有同学使用。

### 4. 安装依赖并构建前端

```powershell
# 安装前端依赖
cd C:\Users\chenyuchong\Products\chillpasslink
npm install

# 安装后端依赖
cd server
npm install
cd ..

# 构建前端（输出到 dist/）
npx vite build
```

构建完成后，`dist/` 目录包含 `index.html` + `assets/` 子目录，Express 服务器启动后会自动检测并挂载。

### 5. 封装部署脚本

**目录结构**：`chillpasslink/deploy/`

| 脚本 | 用途 |
|------|------|
| `setup.ps1` | 一键部署脚本（复制文件、生成配置、安装依赖、构建前端） |
| `start.bat` | 一键启动服务（自动检测并构建前端） |
| `stop.bat` | 停止服务（NSSM 方案） |
| `install-service.bat` | 安装为 Windows 服务 |
| `remove-service.bat` | 移除 Windows 服务 |

### 6. 配置 Windows 防火墙

以管理员身份添加入站规则，放行 TCP 3001 端口：

```powershell
New-NetFirewallRule -DisplayName "ChillPass Web 3001" `
  -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any
```

### 7. 服务器持久运行方案

#### 推荐方案：NSSM + Windows 服务

使用 NSSM（Non-Sucking Service Manager）将 Node.js 进程注册为 Windows 服务，支持：
- 开机自启
- 进程崩溃自动重启
- 日志轮转（按大小切割，最大 10MB）

NSSM 下载地址：https://nssm.cc/release/nssm-2.24.zip（约 500KB）

#### 备选方案：PM2

```powershell
npm install -g pm2
pm2 start server/src/index.js --name "chillpass-web"
pm2 save
pm2 startup
```

---

## 假设与决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 端口号 | 3001 | 项目原始配置，避免与 80/443 等常见端口冲突 |
| 持久化方案 | NSSM Windows 服务 | 轻量稳定，不依赖 npm 生态，日志管理直观 |
| 数据库 | SQLite（保持不变） | 无需额外安装数据库服务，适合小规模并发（< 20 人） |
| 协议 | HTTP（内网） | 学校内网环境，自签名 HTTPS 会增加配置复杂度 |
| 前端托管 | Express 静态文件服务 | 项目已内置，无需额外配置 Nginx |
| 文件存储 | 本地文件系统 | 项目已内置 multer 上传，`data/uploads/` 目录 |

---

## 验证步骤

1. **本地健康检查**：`curl http://localhost:3001/api/health` 返回 `{"status":"ok","version":"1.2.3"}`
2. **前端页面加载**：浏览器访问 `http://localhost:3001`，页面正常渲染，无资源 404
3. **SPA 路由**：刷新任意页面不出现 404
4. **注册/登录**：创建新账号并登录，功能正常
5. **局域网访问**：另一台设备访问 `http://<本机IP>:3001`，功能正常
6. **防火墙端口**：`Test-NetConnection -ComputerName localhost -Port 3001` 返回成功
7. **服务持久化**（NSSM 方案）：安装服务后重启计算机，服务自动启动，页面可直接访问

---

## 注意事项

### 端口冲突
- 检查 `netstat -ano | findstr ":3001"`，如有冲突修改 `PORT` 值
- 常见冲突源：其他 Web 开发工具、代理软件

### 网络环境限制
- 学校内网 VLAN 隔离可能导致不同宿舍区无法互通，需先确认可达性
- 部分校园网限制非标准端口，可尝试 8080、8888 等常见端口
- Windows 网络配置文件建议设为"专用网络"（Private）

### 性能考虑
- SQLite 适合轻量并发（建议不超过 10-20 个并发写操作）
- Node.js 进程内存占用约 50-200MB
- 可设置内存限制：`node --max-old-space-size=512 server/src/index.js`

### 数据安全
- 建议定期备份 `data/chillpass.db`

### 快速排查

| 问题 | 排查步骤 |
|------|---------|
| 服务无法启动 | 检查端口是否被占用（`netstat -ano \| findstr :3001`） |
| 前端页面空白 | 检查浏览器 Console 是否有 404，确认 `base: '/'` 配置 |
| 局域网无法访问 | 检查防火墙规则、网络配置文件、本机 IP 是否正确 |
| API 请求失败 | 检查 `/api/health` 端点，确认后端运行正常 |
| 数据库错误 | 检查 `data/` 目录权限，确认 SQLite 文件可写 |