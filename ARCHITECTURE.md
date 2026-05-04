# Aura — 智能科研 & 生活助手 · 应用架构

> 一个面向科研人员的全栈 Web 应用，集成论文追踪、投资管理、灵感记录、AI 对话等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Tailwind CSS v4 + Vite |
| 后端 | FastAPI + SQLAlchemy + SQLite |
| LLM | OpenAI-compatible API (mimo-v2.5) |
| 部署 | 前端 Vercel · 后端 Render.com |
| 主题 | 移动端优先，"小狗"可爱风格 |

## 整体架构

```
┌─────────────────────────────────────────────┐
│                  Frontend (Vercel)           │
│  React 19 + Tailwind + Vite                 │
│  5 Pages · 43 Components · 3 Hooks          │
└──────────────────┬──────────────────────────┘
                   │ REST API (JSON)
┌──────────────────▼──────────────────────────┐
│               Backend (Render)               │
│  FastAPI + SQLAlchemy + SQLite               │
│  7 Routers · 13 Models · 11 Services        │
│                                              │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │ LLM     │  │ Market   │  │ Paper      │  │
│  │ Service │  │ Service  │  │ Fetchers×4 │  │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  │
│       │            │              │          │
│  ┌────▼────────────▼──────────────▼──────┐   │
│  │          SQLite Database              │   │
│  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
         │              │
    ┌────▼────┐   ┌─────▼─────┐
    │ mimo    │   │ External  │
    │ LLM API │   │ APIs      │
    └─────────┘   └───────────┘
```

---

## 后端结构

### Routers (API 路由)

| 文件 | 前缀 | 功能 |
|------|------|------|
| `research.py` | `/api/research` | 论文 CRUD、获取、AI 分析、文献综述 |
| `wealth.py` | `/api/wealth` | 持仓管理、交易记录、基准对比、AI 再平衡 |
| `muse.py` | `/api/muse` | 书摘、闪念、心情、塔罗、AI 解读 |
| `productivity.py` | `/api/productivity` | 智能待办、每日简报、每日复盘 |
| `search.py` | `/api/search` | 跨模块全文搜索 (SQLite LIKE) |
| `chat.py` | `/api/chat` | 全局 AI 对话助手 |
| `settings.py` | `/api/settings` | 应用配置管理 |

### Models (数据模型)

| 文件 | 模型 |
|------|------|
| `research.py` | `Article`, `ResearchField` |
| `wealth.py` | `Holding`, `Transaction`, `PortfolioSnapshot` |
| `muse.py` | `Quote`, `Note`, `MoodRecord` |
| `productivity.py` | `SmartTodo`, `DailyBrief` |

### Services (业务服务)

| 文件 | 功能 |
|------|------|
| `llm_service.py` | LLM 调用核心：论文分析、书摘解读、待办解析、简报/综述/复盘/再平衡/行为分析生成 |
| `market_service.py` | 行情数据获取（5 分钟 TTL 缓存） |
| `arxiv_fetcher.py` | arXiv API 论文抓取 |
| `rss_fetcher.py` | RSS Feed 论文抓取 |
| `semantic_scholar_fetcher.py` | Semantic Scholar API 论文抓取 |
| `pubmed_fetcher.py` | PubMed NCBI E-utilities 论文抓取 |
| `quote_fetcher.py` | 书摘数据获取 |
| `pdf_service.py` | PDF 解析与论文全文提取 |
| `tarot.py` | 塔罗牌数据 |
| `backup.py` | 数据备份 |
| `notion_export.py` | Notion 导出 |
| `research_fields_seed.py` | 研究领域种子数据 |

### Token 节省架构

- **数据库优先**：搜索用 SQLite LIKE，排序用 SQL ORDER BY，零 LLM 成本
- **最小化 Prompt**：待办解析 <100 token，简报生成 ~300 token
- **结果缓存**：DailyBrief 按日期缓存到 DB，行情数据 5 分钟 TTL 缓存
- **批量处理**：一次 LLM 调用处理多条数据

---

## 前端结构

### Pages (页面)

| 文件 | 路由 | 功能 |
|------|------|------|
| `ResearchPage.tsx` | `/` | 科研雷达：每日简报、文献综述、领域选择、论文列表 |
| `WealthPage.tsx` | `/wealth` | 财富面板：持仓总览、资产分布、再平衡、行为分析 |
| `HoldingDetailPage.tsx` | `/wealth/holding/:id` | 持仓详情：价格、盈亏、走势、基准对比、交易记录 |
| `MusePage.tsx` | `/muse` | 灵感角落：待办、书摘盲盒、闪念、心情、塔罗 |
| `SettingsPage.tsx` | `/settings` | 设置面板 |

### Components (组件)

**UI 基础组件** (`components/ui/`)
- `PuppyMascot` — 小狗吉祥物（多心情状态）
- `VoiceInput` — 语音输入（Web Speech API，支持中文）
- `Skeleton` / `ListSkeleton` — 骨架屏加载态
- `Toast` / `ErrorToast` — 消息提示
- `ConfirmDialog` — 确认对话框
- `ErrorBoundary` — 错误边界
- `WakeUpScreen` — 启动画面

**布局组件** (`components/layout/`)
- `PageHeader` — 页面标题 + 吉祥物
- `BottomNav` — 底部导航栏
- `PageTransition` — 页面切换动画

**科研组件** (`components/research/`)
- `ArticleCard` — 论文卡片（翻转查看 AI 解读）
- `FieldSelector` — 研究领域选择器
- `PaperChat` — 论文对话
- `PaperNetwork` — 论文关系网络
- `ScoreBar` — 相关度评分条
- `ResearchSuggestions` — AI 研究建议
- `LiteratureReviewCard` — AI 文献综述生成

**财富组件** (`components/wealth/`)
- `HoldingCard` — 持仓卡片（点击查看详情）
- `HoldingForm` — 添加持仓表单
- `InsightPanel` — AI 洞察面板
- `ReportPanel` — 投资报告
- `NumberRoller` — 数字滚动动画
- `OcrUploader` — OCR 识别上传
- `RebalanceCard` — AI 再平衡建议
- `BehaviorCard` — AI 行为分析

**灵感组件** (`components/muse/`)
- `SwipeableCards` — 可滑动卡片容器
- `FlipCard` — 翻转卡片
- `QuoteCard` — 书摘卡片
- `MoodRainbow` — 心情彩虹图
- `MoodTrend` — 心情趋势图
- `TarotSection` — 塔罗牌区

**图表组件** (`components/charts/`)
- `SparkLine` — 迷你折线图
- `MiniBarChart` — 迷你柱状图
- `HeatMap` — 热力图
- `TrendLine` — 趋势线
- `PieChart` — 饼图

**效率组件** (`components/productivity/`)
- `TodoInput` — 智能待办输入（支持语音）
- `TodoList` — 待办列表（优先级色标、截止提醒）
- `DailyBriefCard` — 每日科研简报
- `DailyReviewCard` — 每日跨模块复盘

**搜索** (`components/search/`)
- `GlobalSearch` — 全局搜索栏（防抖 300ms，按模块分组）

**对话** (`components/chat/`)
- `GlobalChat` — 浮窗 AI 对话助手

### Hooks & Lib

| 文件 | 功能 |
|------|------|
| `hooks/useApi.ts` | 通用数据请求 Hook |
| `hooks/useToast.ts` | Toast 消息 Hook |
| `lib/api.ts` | API 请求封装 |
| `lib/notifications.ts` | 浏览器推送通知 |

---

## 核心功能

### 1. 科研雷达
- **4 大论文源**：arXiv、RSS、Semantic Scholar、PubMed
- **AI 论文分析**：相关度评分 + 解读（翻转卡片按需加载）
- **文献综述**：一键生成结构化综述
- **每日简报**：每日自动生成（DB 缓存，仅首次消耗 token）
- **论文对话**：针对单篇论文的深度问答

### 2. 财富面板
- **多资产支持**：A 股、美股、加密货币、基金
- **实时行情**：5 分钟缓存的市场数据
- **交易记录**：买卖记录 + 自动计算成本
- **持仓详情页**：价格走势、盈亏分析、沪深 300 基准对比
- **AI 再平衡**：基于持仓分析的调仓建议
- **AI 行为分析**：投资行为模式识别

### 3. 灵感角落
- **书摘盲盒**：每日推荐 + AI 解读（翻转卡片按需加载）
- **闪念记录**：文字 + 语音输入，带心情标签
- **心情追踪**：彩虹图 + 趋势图
- **塔罗牌**：每日塔罗 + AI 解读
- **智能待办**：自然语言解析为结构化任务（标题/截止日/优先级）
- **每日复盘**：跨模块 AI 总结

### 4. 全局能力
- **跨模块搜索**：一个搜索栏搜遍论文、持仓、闪念、书摘
- **AI 对话助手**：全局浮窗，可问答所有模块数据
- **浏览器推送**：待办到期自动提醒
- **语音输入**：Web Speech API，支持中文语音记录

---

## 部署

```
前端 (Vercel)          后端 (Render)
    │                      │
    ├─ auto-deploy         ├─ auto-deploy
    │  from main           │  from main
    │                      │
    └─ vercel.json         └─ render.yaml
       (SPA rewrite)          (Python 3.11)
```

- **前端**：`git push origin main` → Vercel 自动构建部署
- **后端**：`git push origin main` → Render 自动构建部署
- **数据库**：SQLite 文件，Render 持久化磁盘

---

## 项目统计

| 维度 | 数量 |
|------|------|
| 后端 Routers | 7 |
| 后端 Models | 13 |
| 后端 Services | 11 |
| 前端 Pages | 5 |
| 前端 Components | 43 |
| 论文数据源 | 4 (arXiv, RSS, Semantic Scholar, PubMed) |
| LLM 功能 | 10+ (分析、解读、解析、简报、综述、复盘、再平衡、行为分析、对话) |
