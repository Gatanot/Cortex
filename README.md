# Cortex - 提示词管理系统

一个轻量级、高性能的提示词(Prompt)管理系统,专为个人开发者、研究人员和创意工作者设计。

## 功能特性

### 核心功能
- **提示词管理**: 创建、编辑、删除提示词,支持多块内容结构
- **双分类系统**: 用户自定义分类 + 算法自动聚类
- **一键复制**: 单块复制或全部复制到剪贴板
- **数据可视化**: Canvas 2D 可视化展示提示词关系
- **导入/导出**: JSON 格式数据导入导出
- **备份管理**: 自动备份、手动恢复功能
- **主题切换**: 浅色/深色主题,偏好持久化

### 安全与访问控制 🔐
- **双模式认证**: 
  - Web 用户登录 (密码 + Session)
  - API Key 认证 (Python 脚本访问)
- **会话管理**: 签名 Cookie，防 CSRF 和 XSS
- **路径保护**: 自动拦截未授权访问

### 文件管理系统 📁
- **临时文件上传**: 支持拖拽/点击上传
- **智能配额管理**: 
  - 单文件限制: 100MB
  - 总容量限制: 20GB
- **自动清理**: 12小时过期自动删除
- **流式传输**: 高效处理大文件，防止内存溢出

## 技术栈

- **前端**: SvelteKit + Svelte 5
- **数据库**: SQLite (better-sqlite3, WAL 模式)
- **本地计算**: Python (Ollama + UMAP + HDBSCAN)

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173

### 生产构建

```bash
npm run build
npm run preview
```

## 环境变量配置

复制 `.env.example` 文件并重命名为 `.env`，然后配置以下变量:

```env
# API 认证密钥 (用于 Python 脚本访问)
API_SECRET=your-secret-key-here

# Web 登录密码
WEB_PASSWORD=your-web-password-here

# Session 配置
SESSION_SECRET=your-session-secret-at-least-32-characters-long-here
SESSION_MAX_AGE=604800  # 7天 (秒)

# 数据库和备份路径
DATABASE_PATH=data/cortex.db
BACKUP_DIR=backups
```

**重要提示**:
- `SESSION_SECRET` 必须是至少 32 字符的高熵字符串
- 生产环境务必修改默认密码
- 不要将 `.env` 文件提交到版本控制系统

## Python 脚本 (可选)

用于生成嵌入向量和聚类分析:

```bash
cd scripts
pip install -r requirements.txt
python compute_embeddings.py --server http://localhost:5173 --api-key your-secret-key
```

需要本地运行 Ollama 和嵌入模型 (如 `qwen3-embedding:0.6b`)

## 使用指南

### 首次使用

1. 配置 `.env` 文件（参见上方环境变量配置）
2. 启动开发服务器: `npm run dev`
3. 访问 http://localhost:5173
4. 使用配置的 `WEB_PASSWORD` 登录
5. 开始管理提示词！

### 文件上传功能

访问 `/upload` 页面可以:
- 拖拽或点击上传文件（最大 100MB）
- 查看已上传文件列表
- 下载或删除文件
- 文件自动在 12 小时后过期删除

### Python 脚本访问

使用 `Authorization: Bearer <API_SECRET>` header 访问 API:

```bash
curl -H "Authorization: Bearer your-api-secret" \
     http://localhost:5173/api/prompts
```

## API 端点

### 提示词管理
| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | /api/prompts | Session/API | 获取所有提示词 |
| POST | /api/prompts | Session/API | 创建提示词 |
| PUT | /api/prompts/:id | Session/API | 更新提示词 |
| DELETE | /api/prompts/:id | Session/API | 删除提示词 |
| PATCH | /api/prompts/analysis-results | API Key | 更新聚类结果 |

### 数据管理
| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | /api/export | Session/API | 导出数据 |
| POST | /api/import | API Key | 导入数据 |
| GET | /api/backups | Session/API | 获取备份列表 |
| POST | /api/backups/restore | Session/API | 恢复备份 |
| DELETE | /api/backups/:filename | Session/API | 删除备份 |

### 文件管理
| 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|
| GET | /api/file/:filename | Session/API | 下载文件 |

## 项目结构

```
src/
├── lib/server/db.ts    # 数据库连接和操作
├── hooks.server.ts     # API 鉴权钩子
├── app.css             # 全局样式
└── routes/
    ├── +layout.svelte  # 主布局 (导航、主题)
    ├── +page.svelte    # 主页 (提示词列表)
    ├── prompts/
    │   ├── new/        # 新建提示词
    │   └── [id]/       # 详情/编辑
    ├── explorer/       # 可视化页面
    ├── backups/        # 备份管理
    └── api/            # API 端点
```

## 许可证

MIT
