# Cortex - 提示词管理系统

一个轻量级、高性能的提示词(Prompt)管理系统,专为个人开发者、研究人员和创意工作者设计。

## 功能特性

- **提示词管理**: 创建、编辑、删除提示词,支持多块内容结构
- **双分类系统**: 用户自定义分类 + 算法自动聚类
- **一键复制**: 单块复制或全部复制到剪贴板
- **数据可视化**: Canvas 2D 可视化展示提示词关系
- **导入/导出**: JSON 格式数据导入导出
- **备份管理**: 自动备份、手动恢复功能
- **主题切换**: 浅色/深色主题,偏好持久化

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

## 环境变量

创建 `.env` 文件:

```env
API_SECRET=your-secret-key
DATABASE_PATH=data/cortex.db
BACKUP_DIR=backups
```

## Python 脚本 (可选)

用于生成嵌入向量和聚类分析:

```bash
cd scripts
pip install -r requirements.txt
python compute_embeddings.py --server http://localhost:5173 --api-key your-secret-key
```

需要本地运行 Ollama 和嵌入模型 (如 `qwen3-embedding:0.6b`)

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/prompts | 获取所有提示词 |
| POST | /api/prompts | 创建提示词 |
| PUT | /api/prompts/:id | 更新提示词 |
| DELETE | /api/prompts/:id | 删除提示词 |
| PATCH | /api/prompts/analysis-results | 更新聚类结果 |
| GET | /api/export | 导出数据 |
| POST | /api/import | 导入数据 |
| GET | /api/backups | 获取备份列表 |
| POST | /api/backups/restore | 恢复备份 |
| DELETE | /api/backups/:filename | 删除备份 |

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
