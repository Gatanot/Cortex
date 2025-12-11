# Cortex 项目功能拓展技术规格说明书 (v1.0)

## 1. 概述
本项目旨在为 Cortex 现有架构增加 Web 安全访问控制层及临时文件中转服务。系统需在保持原有 Python 脚本 API 访问畅通的前提下,通过 SvelteKit 服务端钩子实现鉴权,并利用 Node.js 文件流处理技术实现高效的文件管理

## 2. 模块一：认证与授权系统 (Authentication & Authorization)

### 2.1 核心逻辑约束
- 架构模式：采用 RBAC (Role-Based Access Control) 的简化变体
    - Role A (System/Script): 持有 `API_KEY`,拥有数据读写权限,无视 Session 状态
    - Role B (Web User): 持有有效 `Session`,拥有完整 Web 界面访问权限
    - Guest: 无凭证,仅可访问 `/login` 及静态资源
- 拦截点：必须在 `src/hooks.server.ts` 的 `handle` 函数中实现全局拦截

### 2.2 详细功能需求

#### A. 环境变量配置
系统需从 `.env` 读取以下新变量：
- `WEB_PASSWORD`: 纯文本密码(用于 Web 登录比对)
- `SESSION_SECRET`: 用于签名 Cookie 的高熵字符串(至少 32 字符)
- `SESSION_MAX_AGE`: Session 有效期(建议设置为 7 天,秒为单位)

#### B. 登录流程 (`/login`)
1. UI: 提供包含密码输入框的简单表单
2. 提交: POST 请求至 `?/login` Action
3. 验证:
    - 若密码匹配 `WEB_PASSWORD`,生成 Session
    - Session 实现: 推荐使用 SvelteKit 的 `cookies.set` 方法,写入一个经过签名的 Cookie(名称如 `cortex_session`),内容可以是简单的状态标识(如 `{ auth: true }`)
    - 属性强制: Cookie 必须设置 `HttpOnly: true`, `Path: /`, `Secure: true` (生产环境), `SameSite: Lax`
4. 跳转: 验证成功后,强制重定向至用户原本请求的页面(默认为 `/`)

#### C. 鉴权逻辑优先级 (Hook Implementation)
在 `hooks.server.ts` 中,请求处理顺序如下(严禁颠倒)：
1. 静态资源豁免: 若 URL 匹配 `/_app`, `/favicon.ico` 等,直接放行
2. API 豁免: 检查 HTTP Header `Authorization`
    - 格式: `Bearer <你的环境变量API_KEY>`
    - 若匹配,直接放行(这是 Python 脚本的通道)
3. Session 检查: 解析 Cookie
    - 若 Cookie 有效且签名正确,放行
4. 拒绝策略:
    - 上述均不满足,且当前路径不是 `/login` -> HTTP 303 Redirect 至 `/login`

---

## 3. 模块二：文件管理系统 (File Manager)

### 3.1 存储架构约束
- 物理路径: `/data/upload`
    - *注意*: 此路径位于项目根目录之外或 Docker Volume 挂载点,严禁放入 `src` 或 `static` 目录
- 文件操作: 必须使用 Node.js 的 `fs/promises` 或 `fs` 模块

### 3.2 文件上传 (`/upload`)
- UI: 支持拖拽或点击上传,显示上传进度
- 传输模式: 必须使用 Stream (流) 处理
    - *禁止* 将整个文件读入 Buffer(内存),防止大文件并发导致 OOM(内存溢出)
    - 使用 `fs.createWriteStream` 将请求流直接管道传输到磁盘
- 配额检查 (Pre-write check):
    1. 单文件限制: 前端校验 + 后端校验(读取 Request Header `Content-Length` 或在流传输中统计字节数,超过 100MB 立即截断并报错)
    2. 总量限制 (20GB): 每次写入前,快速检查 `/data/upload` 占用空间。若 `Current + New > 20GB`,拒绝写入
- 安全性:
    - 文件名清洗: 必须过滤 `../`, `/`, `\` 等字符,防止 Path Traversal (路径遍历攻击)。建议重命名文件或仅保留安全字符

### 3.3 文件列表与下载
- 列表展示:
    - 字段: 文件名、大小 (MB/KB)、上传时间、剩余有效期 (倒计时)
    - 排序: 按 `mtime` (修改时间) 倒序排列
- 下载机制:
    - 由于文件不在 `static` 目录,需创建服务端路由 `src/routes/api/file/[filename]/+server.ts`
    - 该路由需复用 模块一 的鉴权逻辑
    - 实现: 创建 `ReadStream` 并通过 `new Response(stream)` 返回,Header 设置 `Content-Disposition: attachment; filename="xxx"`.

### 3.4 生命周期管理 (TTL Daemon)
- 策略: 12小时过期策略 (`Date.now() - file.mtime > 12h`).
- 触发机制:
    - *方案*: 在 `hooks.server.ts` 的顶层(Server 启动时)初始化一个 `setInterval`
    - *频率*: 每 1 小时执行一次
    - *动作*: 遍历目录 -> 检查 mtime -> `fs.unlink` 删除过期文件
- 硬性约束: 过期文件直接物理删除,不设回收站,确保空间释放

---

## 4. 开发与工程约束 (Constraints)

### 4.1 技术栈规范
- 语言: TypeScript (必须开启 `strict: true`)
- 框架: SvelteKit (利用 Form Actions 处理 POST 请求,Server Load 处理数据加载)
- 样式: TailwindCSS (保持与现有项目一致,若有)

### 4.2 错误处理
- HTTP 状态码:
    - `401 Unauthorized`: 未登录
    - `403 Forbidden`: 密码错误或无权访问
    - `413 Payload Too Large`: 文件超过 100MB
    - `507 Insufficient Storage`: 总容量超过 20GB
- 反馈: 所有错误必须在前端有明确的 Toast 或 Banner 提示

### 4.3 安全性 Checklist
1. [ ] CSRF 防护: 确保 SvelteKit 默认的 CSRF 保护开启(Form Actions 自动处理)
2. [ ] Path Traversal: 验证上传和下载的文件名不包含路径跳转字符
3. [ ] Session Hijacking: 确保 Cookie 为 `HttpOnly`,防止 XSS 窃取

---

## 5. 实施路线图 (Roadmap)

1. Phase 1: 基础设施 (Backend)
    - 配置环境变量
    - 编写 `src/hooks.server.ts` 鉴权逻辑
    - 编写 `lib/server/fileUtils.ts` (封装配额计算、清理逻辑)

2. Phase 2: 登录模块 (Frontend + Integration)
    - 开发 `/login` 页面及 Action
    - 测试 Session 登录与 API Key 穿透访问

3. Phase 3: 文件模块 (Core)
    - 开发文件列表 `load` 函数
    - 实现文件下载 API Endpoint
    - 实现文件上传 Action (带 Stream 处理)

4. Phase 4: 自动化与测试
    - 挂载自动清理任务 (Interval)
    - 进行边界测试 (上传 101MB 文件,填满 20GB,测试过期删除)
