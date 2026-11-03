# 全栈 × AI 学习路径

> 企业级全栈 + AI 训练站——随随便便过面试只是底线，目标是造得出、改得动、被市场看见。

一套按 **L1/L2/L3（讲与做）× D1–D5（楼层）** 双梯验收的学习系统，两层结构：**教材环 01–18 章**（通用企业级教材，覆盖前端/后端/AI 工程/Agent 四线）+ **操练册 19–25 章**（长矛区：D 级框架、24 个月训练计划、AI 推理层与分布式内核两把长矛、项目实操、证据链、算法军械库）。教材定位为**通用企业级**：示例统一用 Fastify + Prisma + MySQL 等生产级技术栈，不绑定任何个人项目；操练册以**验收物**（仓库+测试/报告/链接）计数。

## 快速开始

```bash
pnpm install        # 首次安装依赖
pnpm run dev        # 本地预览 → http://localhost:5174/fullstack-learning-site/
pnpm run build      # 构建到 .vitepress/dist（纯静态，可独立部署）
pnpm run preview    # 预览构建产物
```

## 课程结构（教材环 18 章 + 操练册 7 章）

| 分组 | 章节 | 主题 |
|---|---|---|
| 前端底座 | 01-05 | JS 运行时 / TypeScript / 框架原理 / 前端工程化 / 浏览器·网络·性能 |
| 后端 | 06-13 | Node 运行时 / HTTP 框架 / 认证授权 / API 设计 / 后端工程化 / 数据库 / 缓存与分布式 / 系统设计 |
| AI | 14-17 | AI 协作工作流 / LLM 与 RAG / Agent 与 MCP / AI 原生 UI 与端侧 |
| 面试 | 18 | 手写题 / 八股 / 系统设计 / 项目深挖 / 90 天计划 |
| 长矛区 | 19-25 | D1–D5 分级框架 / 24 个月训练计划 / AI 模型层与推理优化 / 分布式内核 / 项目实操册 / 证据与影响力 / 算法军械库 |

教材环每章统一标准：**原理讲解 + 代码示例 + 每节「必会」锚点 + 面试高频题速答 + L2/L3 达标标准 + 章末「深潜入口（D4）」框**。
操练册以**任务、里程碑、验收物**组织，另附脚手架文件（`21-mini-vllm-skeleton`、`22-mini-raft-test-suite`、`23-saas-backend-scaffold`、`23-rag-evaluation-toolkit`、`25-algo-question-bank`）。

## 目录结构

```
learning-site/
├── index.md                  # 首页（hero + ChapterCards + RoadmapEntry + 长矛区表）
├── 01-*.md ~ 18-*.md         # 教材环章节（每章一个学习单元，含深潜入口）
├── 19-*.md ~ 25-*.md         # 操练册（长矛区）+ 配套脚手架 *-skeleton/*-toolkit/*-scaffold 文件
├── public/                   # 静态文件，原样复制到产物根目录
│   ├── roadmap.html          # 交互式训练路线图（六阶段 24 个月，独立单文件页）
│   ├── logo.svg              # logo / favicon
│   └── robots.txt
├── .github/workflows/        # GitHub Actions：push main 自动构建并发布 gh-pages
├── .vitepress/
│   ├── config.mjs            # 站点配置（base/侧边栏/导航/搜索/sitemap/OG）
│   └── theme/                # 主题：Layout、样式覆盖、ChapterCards、RoadmapEntry
├── AGENTS.md                 # 给 AI 工具的站内说明（CLAUDE.md 为其硬链接镜像）
└── package.json
```

> `public/` 必须在项目根目录。VitePress 的 publicDir 取 `srcDir/public`，放在 `.vitepress/public` 不会被打包（logo 与 favicon 会 404）。

## 学习路线图

`public/roadmap.html` 现为 **24 个月 · 三大局六阶段**：宽环（1–9 月，后端全栈/AI 应用/生产深化/面试整合）→ 长矛深潜（10–18 月，mini-vLLM/Raft/LSM/MQ + 项目二评估红队）→ 证据收口（19–24 月，PR/写作/简历/模拟面试）。可勾选任务、进度存 localStorage，支持切换 Java 存量路线，与 20 章计划口径一致。

与章节的分工：**教材是知识点，操练册是验收物，路线图是每天做到哪**。顶部导航与首页都有入口；由于它是静态页而非 VitePress 路由，链接统一 `target="_blank"` 打开，避免被客户端路由拦截。

## 如何新增/修改章节

1. 新增章节：写好 `NN-主题.md`，然后同步更新三处——`.vitepress/config.mjs` 的 sidebar（操练册归"长矛区"分组）、`.vitepress/theme/components/ChapterCards.vue`（操练册 track 用 `depth`）、`index.md` 的对应表
2. 修改章节：直接编辑对应 `.md`，dev 模式热更新即时生效
3. **拆章/重排编号前先备份到 `_backup/`**（历史对照）
4. 详细约定见 [AGENTS.md](./AGENTS.md)

## 部署（GitHub Pages）

push 到 `main` 分支后，`.github/workflows/deploy.yml` 自动构建并发布到 gh-pages 分支：

```bash
git remote add origin https://github.com/R2h1/fullstack-learning-site.git
git push -u origin main
```

- 站点地址：`https://R2h1.github.io/fullstack-learning-site/`
- 首次部署后需在仓库 Settings → Pages 里把 Source 设为 **gh-pages 分支**
- base 已在 `.vitepress/config.mjs` 配好（`/fullstack-learning-site/`），本地 dev 与线上路径一致
- 也可手动部署：`pnpm run build` 后把 `.vitepress/dist` 内容推送到 gh-pages 分支（参照 silver-bullet 的 deploy.sh 思路）

## 说明

本项目是**独立仓库**，不与其他项目共享 pnpm workspace。依赖 pnpm（本机全局 v11），`pnpm-workspace.yaml` 已配置 `allowBuilds.esbuild: true`。
