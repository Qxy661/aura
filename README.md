# Aura — 个人数字外脑工作站

> 科研雷达 · 财富面板 · 灵感角落 · AI 助手

Aura 是一个全栈个人效率工具，集成论文管理、投资追踪、灵感记录于一体，由 LLM 驱动智能分析。

## 技术栈

| 层 | 技术 |
|---|------|
| **前端** | React 19 + TypeScript + Tailwind CSS v4 + Vite 8 |
| **后端** | Python 3.9 + FastAPI + SQLAlchemy + SQLite |
| **AI** | OpenAI 兼容接口（支持 DeepSeek / Mimo / 任意兼容 API） |
| **数据源** | 新浪财经（股票行情）、东方财富（基金净值/板块资金流） |
| **部署** | 前端 Vercel + 后端 Render.com |

---

## 功能模块

### 1. 财富面板（重点功能）

#### 持仓管理
- **手动添加**：输入基金/股票代码、名称、成本价、份额
- **OCR 导入**：截图识别持仓，自动解析基金/股票信息
- **持仓详情**：点击持仓卡片查看详细信息、价格走势、交易记录
- **交易记录**：买入/卖出记录，支持添加、编辑、删除
- **持仓排序/筛选**：按添加时间、盈亏比例、市值、名称排序；按资产类型筛选（基金/A股/美股/加密）

#### 市场监控
- **实时指数**：上证、深证、创业板、恒生等主要指数行情
- **市场情绪**：综合指数表现、板块资金流、净流向计算情绪分数（0-100）
- **板块热力图**：行业/概念板块涨跌热力图，领涨领跌一览
- **板块资金流**：主力资金净流入/流出，超大单/大单/中单/小单明细
- **板块趋势**：30天板块资金流向历史趋势图

#### 组合分析（可折叠面板）
- **组合概览**：总市值、总成本、总盈亏、持仓数（数字滚动动画）
- **智能预警**：自动检测大涨/大跌、集中度风险、深度亏损、板块集中等
- **收益走势**：90天组合净值走势图 + 风险指标（年化波动率、最大回撤、夏普比率）
- **持仓对比**：选择2-4个持仓并排对比各项指标
- **资产配置**：按资产类型（基金/A股/美股/加密/港股）的饼图分析
- **健康评分**：A/B/C/D 综合评分，涵盖分散度、集中度、收益、波动、回撤、品类6个维度
- **交易总览**：跨持仓交易汇总、月度资金流向图、最近交易列表
- **组合分享**：一键生成格式化文本摘要，复制到剪贴板

#### 智能工具
- **关注列表**：搜索添加想跟踪的基金/股票，设目标价，一键转入持仓
- **定投计算器**：输入初始投入、月投金额、预期年化、投资年限，生成收益预测
- **价格提醒**：设置高于/低于目标价提醒，页面加载自动检查触发
- **基金研究**：搜索基金查看详情（多周期收益、波动率、净值曲线），直接买入或关注
- **AI 再平衡**：AI 分析持仓集中度，给出再平衡建议
- **AI 行为分析**：分析交易行为模式，给出改进建议
- **AI 复盘**：每周自动生成投资复盘报告
- **AI 日报**：跨模块综合日报（持仓+论文+笔记+待办+心情）

### 2. 科研雷达

- **论文抓取**：arXiv + RSS 自动抓取，按研究方向筛选
- **AI 摘要**：一键生成论文总结、核心要点、相关性评分
- **个人相关性**：AI 根据你的研究方向评估每篇论文的个人匹配度
- **论文对话**：与论文对话问答，支持 PDF 全文解析
- **论文关系图**：AI 分析论文间的作者/主题/方法论关联
- **AI 科研建议**：基于已收集论文生成研究趋势和优先阅读推荐
- **智能排序**：按最新抓取 / AI 评分 / 个人相关性排序
- **导出**：一键导出 Markdown 供 Notion 导入

### 3. 灵感角落

#### 书摘 Tab
- **每日书摘**：AI 自动生成经典书摘，滑动卡片浏览
- **3D 翻转卡片**：正面显示金句，翻转查看 AI 解读（按需生成）
- **待办管理**：智能待办，支持 AI 解析自然语言
- **每日回顾**：AI 生成当日综合回顾

#### 闪念 Tab
- **闪念笔记**：随时记录灵感，支持心情标记、语音、标签
- **搜索/筛选**：按关键词搜索，按心情筛选
- **内联编辑**：直接在列表中编辑笔记

#### 心情 Tab
- **心情热力图**：可视化每日心情记录
- **心情趋势**：心情变化趋势图
- **AI 心情关怀**：根据心情状态生成温暖建议

#### 塔罗 Tab
- **每日塔罗**：抽取塔罗牌 + AI 解读

### 4. 设置中心

- **LLM 配置**：运行时切换 API 地址、Key、模型（必填字段验证）
- **连接测试**：一键测试 LLM 连接状态和延迟
- **配置持久化**：localStorage + 后端同步

---

## 页面设计

### 设计系统

- **配色**：暖黄主题（#FFF8EE 背景 + #F5A623 主色 + #8B6914 点缀）
- **组件**：cute-card（圆润卡片）、btn-primary / btn-soft（按钮）、cute-input（输入框）
- **动画**：fade-in-up、puppy-bounce、wiggle、number-roll、3D flip
- **图表**：纯 SVG/CSS 手绘（SparkLine、PieChart、HeatMap、MiniBarChart、TrendLine），无外部图表库
- **响应式**：移动端优先，桌面端自适应（max-w-lg → max-w-4xl）
- **色彩约定**：红色=正收益/上涨（中国市场），绿色=负收益/下跌

### 财富面板布局

```
┌─────────────────────────────┐
│        PageHeader           │
├─────────────────────────────┤
│  [持仓] [资金流] [观点] [复盘]  │  ← Tab 切换
├─────────────────────────────┤
│      MarketIndexBar         │  ← 实时指数行情
│    MarketSentimentCard      │  ← 市场情绪指标
│      PortfolioHeader        │  ← 组合概览（总值/盈亏）
├─────────────────────────────┤
│  ▼ 分析面板 · 收起/展开       │  ← 可折叠
│    PortfolioAlertCard       │  ← 智能预警
│  PortfolioPerformanceCard   │  ← 90天走势+风险指标
│   SectorFlowTrendCard      │  ← 板块资金流趋势
│   HoldingCompareCard       │  ← 持仓对比
│  SectorAllocationCard      │  ← 资产配置饼图
│  PortfolioHealthCard       │  ← 健康评分 A/B/C/D
│     WatchlistCard          │  ← 关注列表
│ TransactionOverviewCard    │  ← 交易总览
│  PortfolioExportCard       │  ← 组合分享
├─────────────────────────────┤
│     QuickActionBar         │  ← 7个快捷按钮
│  [添加][OCR][再平衡][行为]     │
│  [定投][提醒][研究]           │
├─────────────────────────────┤
│    Sort & Filter Bar       │  ← 排序/筛选
├─────────────────────────────┤
│      HoldingCard × N       │  ← 持仓卡片列表
└─────────────────────────────┘
```

### 快捷操作栏

| 按钮 | 功能 | 颜色 |
|------|------|------|
| 添加持仓 | 手动输入持仓信息 | 黄色 |
| OCR 导入 | 截图识别持仓 | 蓝色 |
| AI 再平衡 | AI 分析再平衡建议 | 紫色 |
| 行为分析 | AI 分析交易行为 | 青色 |
| 定投计算 | 定投收益模拟器 | 琥珀色 |
| 价格提醒 | 设置价格目标提醒 | 玫瑰色 |
| 基金研究 | 搜索研究基金详情 | 靛蓝色 |

---

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
│   │   │   ├── wealth.py          # Holding, Transaction, PriceHistory, Insight,
│   │   │   │                      # WeeklyReport, SectorFlowSnapshot,
│   │   │   │                      # DailyMarketSummary, WatchlistItem, PriceAlert
│   │   │   ├── muse.py            # Quote, Note, MoodRecord, TarotDraw
│   │   │   └── productivity.py    # SmartTodo, DailyBrief
│   │   ├── routers/
│   │   │   ├── research.py        # /api/research/* 论文 CRUD + AI 端点
│   │   │   ├── wealth.py          # /api/wealth/* 持仓 + 行情 + 报告 (35+ 端点)
│   │   │   ├── muse.py            # /api/muse/* 书摘 + 笔记 + 心情
│   │   │   └── settings.py        # /api/settings/* LLM 配置
│   │   ├── schemas/               # Pydantic 请求/响应模型
│   │   └── services/
│   │       ├── llm_service.py     # LLM 调用（摘要/对话/分析/OCR）
│   │       ├── arxiv_fetcher.py   # arXiv 论文抓取 + 相关性过滤
│   │       ├── rss_fetcher.py     # RSS 订阅抓取
│   │       ├── pdf_service.py     # PDF 下载 + 全文提取
│   │       ├── market_service.py  # 基金/股票行情 + 基金详情
│   │       ├── sector_flow_service.py  # 板块资金流服务
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
│   │   │   ├── HoldingDetailPage.tsx  # 持仓详情页
│   │   │   ├── MusePage.tsx       # 灵感角落（4 tab 容器）
│   │   │   └── SettingsPage.tsx   # 设置页
│   │   ├── components/
│   │   │   ├── charts/            # SparkLine, PieChart, HeatMap, MiniBarChart, TrendLine
│   │   │   ├── research/          # ArticleCard, PaperChat, PaperNetwork, ScoreBar
│   │   │   ├── wealth/            # 20+ 组件（见下表）
│   │   │   ├── muse/              # QuotePanel, NotePanel, MoodPanel, SwipeableCards, TarotSection
│   │   │   ├── layout/            # BottomNav, PageHeader
│   │   │   └── ui/                # PuppyMascot, ErrorBoundary, WakeUpScreen, ConfirmDialog, Skeleton
│   │   └── hooks/                 # useApi, useToast
│   ├── index.css                  # 全局样式 + 设计系统
│   └── vite.config.ts
│
├── render.yaml                    # Render 部署配置
├── .gitignore
└── README.md
```

### 财富面板组件清单

| 组件 | 文件 | 功能 |
|------|------|------|
| MarketIndexBar | `MarketIndexBar.tsx` | 实时指数行情条 |
| MarketSentimentCard | `MarketSentimentCard.tsx` | 市场情绪指标（0-100） |
| PortfolioHeader | `PortfolioHeader.tsx` | 组合概览（总值/盈亏/刷新） |
| PortfolioAlertCard | `PortfolioAlertCard.tsx` | 智能预警（大涨/大跌/集中度/亏损） |
| PortfolioPerformanceCard | `PortfolioPerformanceCard.tsx` | 90天走势 + 风险指标 |
| SectorFlowTrendCard | `SectorFlowTrendCard.tsx` | 板块资金流历史趋势 |
| HoldingCompareCard | `HoldingCompareCard.tsx` | 多持仓并排对比 |
| SectorAllocationCard | `SectorAllocationCard.tsx` | 资产配置饼图分析 |
| PortfolioHealthCard | `PortfolioHealthCard.tsx` | A/B/C/D 健康评分 |
| WatchlistCard | `WatchlistCard.tsx` | 关注列表 + 目标价 + 转入持仓 |
| TransactionOverviewCard | `TransactionOverviewCard.tsx` | 交易总览 + 月度资金流 |
| PortfolioExportCard | `PortfolioExportCard.tsx` | 组合分享文本生成 |
| SectorHeatMapCard | `SectorHeatMapCard.tsx` | 板块热力图 |
| FundResearchCard | `FundResearchCard.tsx` | 基金研究（多周期收益/波动率） |
| DcaCalculatorCard | `DcaCalculatorCard.tsx` | 定投计算器 |
| AlertManagerCard | `AlertManagerCard.tsx` | 价格提醒管理 |
| QuickActionBar | `QuickActionBar.tsx` | 快捷操作栏（7按钮） |
| ActionOverlay | `ActionOverlay.tsx` | 底部弹出面板 |
| HoldingCard | `HoldingCard.tsx` | 持仓卡片 |
| HoldingForm | `HoldingForm.tsx` | 持仓添加表单 |
| SectorFlowCard | `SectorFlowCard.tsx` | 板块资金流详情 |
| OcrUploader | `OcrUploader.tsx` | OCR 截图导入 |
| InsightPanel | `InsightPanel.tsx` | 碎片观点（增删改） |
| ReportPanel | `ReportPanel.tsx` | AI 复盘报告 |
| RebalanceCard | `RebalanceCard.tsx` | AI 再平衡建议 |
| BehaviorCard | `BehaviorCard.tsx` | AI 行为分析 |
| DailyBriefCard | `DailyBriefCard.tsx` | AI 日报 |

---

## API 端点一览

### 财富 /api/wealth（35+ 端点）

#### 持仓管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /holdings | 持仓列表 |
| POST | /holdings | 添加持仓 |
| PATCH | /holdings/{id} | 更新持仓 |
| DELETE | /holdings/{id} | 删除持仓 |
| GET | /holdings/{id}/detail | 持仓详情（含交易+价格历史） |
| GET | /holdings/{id}/market | 持仓实时行情 |
| GET | /holdings/{id}/history | 价格历史 |
| GET | /holdings/{id}/transactions | 交易记录 |
| POST | /holdings/{id}/transactions | 添加交易 |
| PATCH | /holdings/{id}/transactions/{tx_id} | 更新交易 |
| DELETE | /holdings/{id}/transactions/{tx_id} | 删除交易 |
| GET | /holdings/{id}/benchmark | 持仓基准对比 |
| POST | /holdings/ocr | OCR 识别持仓 |
| POST | /holdings/parse-text | 文本解析持仓 |
| GET | /search | 搜索基金/股票 |

#### 组合分析
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /portfolio | 组合概览 + 实时行情 |
| GET | /portfolio/performance | 90天组合走势 |
| GET | /portfolio/risk-metrics | 风险指标（波动率/回撤/夏普） |
| GET | /portfolio/export | 组合分享文本 |
| GET | /allocation | 资产配置 |

#### 市场数据
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /market-indices | 主要指数行情 |
| GET | /sector-flow | 板块资金流 |
| GET | /sector-flow/market-status | 市场状态 |
| GET | /sector-flow/daily-summary | 当日AI总结 |
| GET | /sector-flow/daily-summaries | 历史AI总结 |
| POST | /sector-flow/generate-summary | 生成AI总结 |
| GET | /sector-flow/trends | 板块趋势历史 |

#### 智能工具
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /watchlist | 关注列表 |
| POST | /watchlist | 添加关注 |
| DELETE | /watchlist/{id} | 取消关注 |
| PATCH | /watchlist/{id} | 更新关注 |
| POST | /watchlist/{id}/convert | 转入持仓 |
| GET | /alerts | 价格提醒列表 |
| POST | /alerts | 创建提醒 |
| DELETE | /alerts/{id} | 删除提醒 |
| POST | /alerts/check | 检查触发提醒 |
| GET | /fund-research/{code} | 基金详情 |
| GET | /transactions/overview | 交易总览 |

#### AI 分析
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /rebalance | AI 再平衡建议 |
| POST | /behavior-analysis | AI 行为分析 |
| POST | /reports/generate | 生成 AI 复盘 |
| GET | /reports | 复盘报告列表 |
| POST | /daily-brief | AI 日报 |

#### 观点
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /insights | 碎片观点列表 |
| POST | /insights | 添加观点 |
| PATCH | /insights/{id} | 编辑观点 |
| DELETE | /insights/{id} | 删除观点 |

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

### 灵感 /api/muse
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /quotes/today | 今日书摘 |
| POST | /quotes/{id}/analyze | AI 解读书摘 |
| GET | /notes | 笔记列表 |
| POST | /notes | 添加笔记 |
| PATCH | /notes/{id} | 编辑笔记 |
| DELETE | /notes/{id} | 删除笔记 |
| GET | /mood/heatmap | 心情热力图 |
| GET | /mood/trend | 心情趋势 |
| GET | /mood/advice | AI 心情建议 |

### 设置 /api/settings
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /llm | 获取当前 LLM 配置 |
| POST | /llm | 保存 LLM 配置 |
| POST | /llm/test | 测试 LLM 连接 |

---

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
| 每日 15:30 | 市场收盘总结 |
| 每周一 09:00 | 生成投资复盘报告 |
| 每 14 分钟 | Keep-alive 自 ping |
