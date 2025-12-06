### 项目需求与开发约束文档:Cortex

- 版本: 1.0
- 日期: 2025年12月6日
- 状态: 已批准,待开发

### 1. 项目概述

Cortex 是一个为个人开发者、研究人员和创意工作者设计的轻量级、高性能的提示词(Prompt)管理系统.其核心目标是提供一个简洁、快速的界面来存储、组织和检索复杂的提示词结构,并通过本地化的AI算法自动对提示词进行智能分类和可视化,以揭示其内在联系

项目遵循本地计算,云端存储的原则,最大化数据隐私与安全,同时将服务器运营成本降至最低

### 2. 设计与开发原则

- 性能优先: 所有技术选型和实现都应以在低配服务器(2核2G)上流畅运行为首要目标
- 数据安全: 用户数据是核心资产.必须提供可靠的备份与恢复机制,并保护API免受未经授权的访问
- 低成本运维: 架构设计必须支持在廉价的云服务器上部署,避免不必要的资源消耗.核心计算任务(向量化、聚类)在用户本地执行
- 现代且实用: UI/UX应遵循现代设计理念,注重功能性、响应式布局和用户体验,避免不必要的装饰

### 3. 核心功能需求

#### 3.1. 提示词管理 (CRUD)
- 创建 (Create): 用户可以创建一个新的提示词.每个提示词必须包含一个标题和至少一个内容块
- 读取 (Read):
    - 在主界面以列表形式展示所有提示词,显示其标题和分类
    - 点击列表项可进入独立的详情/编辑页面,查看其所有内容块
- 更新 (Update): 用户可以修改提示词的标题、用户自定义分类及其所有内容块
- 删除 (Delete): 用户可以永久删除一个提示词及其所有关联的内容块

#### 3.2. 提示词块 (Block) 结构
- 每个提示词由一个或多个有序的文本“块”组成
- 用户可以对块进行新增、编辑和删除操作
- 块排序: 为避免拖拽实现的复杂性,每个块应提供“上移”和“下移”按钮来调整其在提示词内的顺序

#### 3.3. 双分类系统
- 用户分类 (`user_category`): 每个提示词可拥有一个由用户手动选择的分类.此分类可为空.用户可以在界面上创建和管理这些分类标签
- 算法分类 (`algo_category`): 每个提示词可拥有一个由本地聚类算法自动计算出的分类.在计算完成前,此字段为空
- 视图切换: UI界面必须提供一个明确的切换控件(如按钮组或下拉菜单),允许用户在“按用户分类查看”和“按算法分类查看”两种视图间切换

#### 3.4. 内容复制
- 单块复制: 每个提示词块旁边需提供一个“复制”按钮,点击后将该块的文本内容复制到剪贴板
- 全部复制: 在提示词详情页的顶部,需提供一个“全部复制”按钮,点击后将该提示词的所有块按顺序拼接(以两个换行符 `\n\n` 分隔)后,一次性复制到剪贴板

#### 3.5. 数据导入/导出
- 导出: 提供“导出全部”功能,将数据库中所有提示词及其块结构导出为一个JSON文件
- 导入: 提供“导入”功能,允许用户上传一个JSON文件
    - 安全约束: 在执行导入操作前,系统必须自动将当前活动的数据库文件完整备份到指定的备份目录
    - 覆盖逻辑: 导入将清空现有所有提示词数据,并替换为JSON文件中的内容.此操作必须向用户显示明确的警告信息

#### 3.6. 备份与恢复
- 专属页面: 需创建一个独立的“备份管理”页面
- 功能:
    - 查看: 列表展示所有已存在的数据库备份文件(按时间倒序排列)
    - 恢复: 用户可以选择一个备份文件进行恢复.恢复操作将用所选备份文件覆盖当前数据库.恢复操作不应产生新的备份
    - 删除: 用户可以删除不再需要的备份文件
- 安全约束: 所有恢复和删除操作都必须经过二次弹窗确认 (`window.confirm`)

#### 3.7. 聚类可视化
- 专属页面: 需创建一个独立的“提示词浏览器”页面
- 实现方式: 使用HTML5 `<canvas>` 元素进行渲染
- 数据来源: 页面加载时,获取所有包含二维坐标 (`pos_x`, `pos_y`) 的提示词
- 展示逻辑:
    - 每个提示词在Canvas上表现为一个点
    - 点的相对位置由其文本内容的嵌入向量经过降维算法(如 UMAP)计算得出
    - 不同算法分类 (`algo_category`) 的点可以使用不同的颜色进行区分
- 交互: 当鼠标悬停在某个点上时,在点附近显示该提示词的标题

### 4. UI/UX 约束

- 样式: 使用原生CSS(或PostCSS等预处理器)进行样式构建,避免引入大型CSS框架.设计简洁、干净,注重间距和排版
- 响应式: 界面必须同时适配桌面和移动设备浏览器.使用Flexbox、Grid和媒体查询实现流式布局
- 主题:
    - 提供浅色和深色两种主题模式
    - 提供一个易于访问的切换按钮
    - 用户的选择应通过 `localStorage` 持久化,以便下次访问时保持一致
- 资源: 尽量减少或不使用Emoji及SVG/PNG图片,以保证加载速度和界面纯粹性

### 5. 技术架构与约束

- 前端框架: SvelteKit
- 后端逻辑: SvelteKit (Server-side Endpoints / Form Actions)
- 数据库: SQLite.必须使用高性能的Node.js驱动,如 `better-sqlite3`.必须开启WAL (Write-Ahead Logging) 模式
- 本地计算脚本: Python
    - 依赖库: `requests` (与服务器通信), `ollama` (调用本地模型), `numpy` (数学计算), `umap-learn` (降维), `hdbscan` (聚类)
    - 本地模型: 通过Ollama运行 `qwen3-embedding:0.6b` 或 `embedding-gemma:latest`.脚本不应硬编码模型,应允许用户配置
- 部署环境:
    - 服务器: 2核 CPU, 2GB 内存, 40GB ESSD 云服务器
    - 运行方式: SvelteKit项目应使用 `adapter-node` 构建为独立的Node.js服务运行

### 6. 安全约束

- API鉴权:
    - 所有执行写入操作(`POST`, `PUT`, `DELETE`, `PATCH`)的API端点,以及为本地脚本提供数据的端点,都必须受API密钥保护
    - 密钥在服务器端通过环境变量(`.env`文件)`API_SECRET` 定义
    - 客户端(本地Python脚本)在请求的 `Authorization` Header中以 `Bearer <API_SECRET>` 的形式提供密钥
    - SvelteKit应使用 `src/hooks.server.ts` 实现一个全局钩子来验证此密钥
- 文件系统访问:
    - 备份目录的路径应通过环境变量 `BACKUP_DIR` 定义
    - 所有处理文件路径的API(如备份恢复)必须严格校验传入的文件名参数,防止路径遍历攻击(如 `../../`)

### 7. 数据库 Schema (SQLite)

```sql
-- 提示词主表
-- 存储每个提示词的元数据和分类信息
CREATE TABLE prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    user_category TEXT, -- 用户自定义分类, 可为空
    algo_category TEXT, -- 算法聚类分类, 可为空
    pos_x REAL,         -- 可视化2D坐标X, 可为空
    pos_y REAL,         -- 可视化2D坐标Y, 可为空
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 可通过触发器自动更新
);

-- 提示词块表
-- 存储每个提示词的具体内容块, 与主表一对多关联
CREATE TABLE prompt_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL, -- 用于排序, 数值越小越靠前
    FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

-- 创建索引以优化查询性能
CREATE INDEX idx_user_category ON prompts(user_category);
CREATE INDEX idx_algo_category ON prompts(algo_category);
CREATE UNIQUE INDEX idx_prompt_blocks_order ON prompt_blocks(prompt_id, sort_order);
```

### 8. API 端点 (Endpoint) 规范

- `GET /api/prompts`: 获取所有提示词及其块
- `POST /api/prompts`: (Form Action) 新建提示词
- `PUT /api/prompts/:id`: (Form Action) 更新指定ID的提示词
- `DELETE /api/prompts/:id`: (Form Action) 删除指定ID的提示词
- `PATCH /api/prompts/analysis-results`: [需API密钥] 批量更新提示词的`algo_category`, `pos_x`, `pos_y`
    - Request Body: `[{id: number, algo_category: string, pos_x: number, pos_y: number}, ...]`
- `POST /api/import`: [需API密钥] 导入JSON数据
- `GET /api/backups`: 获取备份文件列表
- `POST /api/backups/restore`: 恢复指定的备份文件
    - Request Body: `{ "filename": "backup_name.db" }`
- `DELETE /api/backups/:filename`: 删除指定的备份文件