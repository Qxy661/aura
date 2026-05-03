# Aura — 个人数字外脑工作站

> 科研雷达 · 财富面板 · 灵感角落 · AI 助手

Aura 是一个全栈个人效率工具，集成论文管理、投资追踪、灵感记录于一体，由 LLM 驱动智能分析。

## 技术栈

| 层 | 技术 |
|---|------|
| **前端** | React 19 + TypeScript + Tailwind CSS v4 + Vite 8 |
| **后端** | Python 3.9 + FastAPI + SQLAlchemy + SQLite |
| **AI** | OpenAI 兼容接口（支持 DeepSeek / Mimo / 任意兼容 API） |
| **部署** | 前端 Vercel + 后端 Render.com |

## 功能模块

### 1. 科研雷达

- **论文抓取**：arXiv + RSS 自动抓取，按研究方向筛选
- **AI 摘要**：一键生成论文总结、核心要点、相关性评分
- **个人相关性**：AI 根据你的研究方向评估每篇论文的个人匹配度
- **论文对话**：与论文对话问答，支持 PDF 全文解析
- **论文关系图**：AI 分析论文间的作者/主题/方法论关联
- **AI 科研建议**：基于已收集论文生成研究趋势和优先阅读推荐
- **智能排序**：按最新抓取 / AI 评分 / 个人相关性排序
- **导出**：一键导出 Markdown 供 Notion 导入

### 2. 财富面板

- **持仓管理**：手动添加或 OCR 截图识别基金/股票持仓
- **实时行情**：自动获取基金/股票/加密货币实时价格
- **组合概览**：总市值、总成本、盈亏汇总（数字滚动动画）
- **可视化图表**：持仓占比环形图、盈亏热力图、价格走势线
- **持仓柱状图**：各持仓盈亏百分比对比
- **AI 复盘**：每周自动生成投资复盘报告
- **碎片观点**：记录市场观点，支持标签分类

### 3. 灵感角落

- **每日书摘**：AI 自动生成经典书摘，滑动卡片浏览
- **3D 翻转卡片**：正面显示金句，翻转查看 AI 解读（按需生成）
- **闪念笔记**：随时记录灵感，支持心情标记
- **心情追踪**：心情热力图 + 趋势图
- **AI 心情关怀**：根据心情状态生成温暖建议
- **塔罗指引**：每日塔罗牌 + AI 解读

### 4. 设置中心

- **LLM 配置**：运行时切换 API 地址、Key、模型
- **连接测试**：一键测试 LLM 连接状态和延迟
- **配置持久化**：localStorage + 后端同步

## 项目结构

```
.
├── backend/
│   ├── app/
│   │   ├── config.py              # 配置管理（支持运行时覆盖）
│   │   ├── database.py            # SQLAlchemy 引擎 + SQLite 迁移
│   │   ├── main.py                # FastAPI 入口 + CORS + 路由注册
│   │   ├── scheduler.py           # APScheduler 定时任务 + keep-alive
│   │   ├── models/
│   │   │   ├── research.py        # Article, ResearchField, PaperRelation
│   │   │   ├── wealth.py          # Holding, Insight, WeeklyReport, PriceHistory
│   │   │   └── muse.py            # Quote, Note, MoodRecord, TarotDraw
│   │   ├── routers/
│   │   │   ├── research.py        # /api/research/* 论文 CRUD + AI 端点
│   │   │   ├── wealth.py          # /api/wealth/* 持仓 + 行情 + 报告
│   │   │   ├── muse.py            # /api/muse/* 书摘 + 笔记 + 心情
│   │   │   └── settings.py        # /api/settings/* LLM 配置
│   │   ├── schemas/               # Pydantic 请求/响应模型
│   │   └── services/
│   │       ├── llm_service.py     # LLM 调用（摘要/对话/分析/OCR）
│   │       ├── arxiv_fetcher.py   # arXiv 论文抓取 + 相关性过滤
│   │       ├── rss_fetcher.py     # RSS 订阅抓取
│   │       ├── pdf_service.py     # PDF 下载 + 全文提取
│   │       ├── market_service.py  # 基金/股票行情获取
│   │       ├── quote_fetcher.py   # 书摘抓取
│   │       ├── backup.py          # 数据库备份
│   │       └── tarot.py           # 塔罗牌逻辑
│   ├── requirements.txt
│   └── runtime.txt                # Render Python 版本
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # 路由 + 布局
│   │   ├── lib/api.ts             # API 客户端（wake-up + 重试 + LLM headers）
│   │   ├── pages/
│   │   │   ├── ResearchPage.tsx   # 科研雷达主页
│   │   │   ├── WealthPage.tsx     # 财富面板主页
│   │   │   ├── MusePage.tsx       # 灵感角落主页
│   │   │   └── SettingsPage.tsx   # 设置页
│   │   ├── components/
│   │   │   ├── charts/            # PieChart, HeatMap, TrendLine, MiniBarChart
│   │   │   ├── research/          # ArticleCard, PaperChat, PaperNetwork, ScoreBar, ResearchSuggestions
│   │   │   ├── wealth/            # HoldingCard, NumberRoller, OcrUploader, InsightPanel, ReportPanel
│   │   │   ├── muse/              # SwipeableCards, FlipCard, QuoteCard, MoodRainbow, TarotSection
│   │   │   ├── layout/            # BottomNav, PageHeader
│   │   │   └── ui/                # PuppyMascot, ErrorBoundary, WakeUpScreen, ConfirmDialog
│   │   └── hooks/                 # useApi, useToast
│   ├── index.css                  # 全局样式 + 设计系统
│   └── vite.config.ts
│
├── render.yaml                    # Render 部署配置
├── .gitignore
└── README.md
```

## 设计系统

- **配色**：暖黄主题（#FFF8EE 背景 + #F5A623 主色 + #8B6914 点缀）
- **组件**：cute-card（圆润卡片）、btn-primary / btn-soft（按钮）、cute-input（输入框）
- **动画**：fade-in-up、puppy-bounce、wiggle、number-roll、3D flip
- **图表**：纯 SVG/CSS 手绘，无外部图表库
- **响应式**：移动端优先，桌面端自适应（max-w-lg → max-w-4xl）

## 部署

### 前端（Vercel）

```bash
# 环境变量
VITE_API_URL=https://aura-backend-xxxx.onrender.com/api
```

### 后端（Render.com）

```bash
# 环境变量
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.example.com/v1
LLM_MODEL=your-model-name
PYTHON_VERSION=3.9.18
```

### 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
cp .env.example .env  # 配置 LLM_API_KEY 等
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## 定时任务

| 时间 | 任务 |
|------|------|
| 每日 07:00 | 自动生成书摘 |
| 每日 08:00 | 自动抓取论文 |
| 每日 02:00 | 数据库备份 |
| 每周一 09:00 | 生成投资复盘报告 |
| 每 14 分钟 | Keep-alive 自 ping |

## API 端点一览

### 科研 /api/research
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /articles | 论文列表（支持排序/筛选） |
| POST | /fetch | 触发论文抓取 |
| POST | /articles/smart-filter | AI 个人相关性评估 |
| POST | /articles/{id}/summarize | AI 摘要 |
| POST | /articles/{id}/chat | 论文对话 |
| POST | /articles/{id}/fetch-fulltext | 获取 PDF 全文 |
| GET | /network | 论文关系图数据 |
| POST | /network/build | 构建论文关系 |
| GET | /suggestions | AI 科研建议 |

### 财富 /api/wealth
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /holdings | 持仓列表 |
| GET | /portfolio | 组合概览 + 实时行情 |
| GET | /allocation | 持仓占比 |
| GET | /holdings/{id}/history | 价格历史 |
| POST | /holdings/ocr | OCR 识别持仓 |
| POST | /reports/generate | 生成 AI 复盘 |

### 灵感 /api/muse
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /quotes/today | 今日书摘 |
| POST | /quotes/{id}/analyze | AI 解读书摘 |
| GET | /mood/heatmap | 心情热力图 |
| GET | /mood/advice | AI 心情建议 |

### 设置 /api/settings
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /llm | 获取当前 LLM 配置 |
| POST | /llm | 保存 LLM 配置 |
| POST | /llm/test | 测试 LLM 连接 |
