# 全栈 × AI 学习路径

> 面试级 · 生产级 · 企业级的全栈 + AI 学习课程——学完能面试，能上线。

一套按 **L1 会用 / L2 面试级 / L3 生产级** 分级验收的个人学习课程，覆盖 **前端、后端、AI 工程、Agent 开发** 四线，用 VitePress 渲染成静态学习站。内容定位为**通用企业级教材**：示例统一用 Fastify + Prisma + MySQL 等生产级技术栈，不绑定任何个人项目。

## 快速开始

```bash
pnpm install        # 首次安装依赖
pnpm run dev        # 本地预览 → http://localhost:5174/fullstack-learning-site/
pnpm run build      # 构建到 .vitepress/dist（纯静态，可独立部署）
pnpm run preview    # 预览构建产物
```

## 课程结构（18 章）

| 分组 | 章节 | 主题 |
|---|---|---|
| 前端底座 | 01-05 | JS 运行时 / TypeScript / 框架原理 / 前端工程化 / 浏览器·网络·性能 |
| 后端 | 06-13 | Node 运行时 / HTTP 框架 / 认证授权 / API 设计 / 后端工程化 / 数据库 / 缓存与分布式 / 系统设计 |
| AI | 14-17 | AI 协作工作流 / LLM 与 RAG / Agent 与 MCP / AI 原生 UI 与端侧 |
| 面试 | 18 | 手写题 / 八股 / 系统设计 / 项目深挖 / 90 天计划 |

每章统一标准：**原理讲解 + 代码示例 + 每节「必会」锚点 + 面试高频题速答 + L2/L3 达标标准**。

## 目录结构

```
learning-site/
├── index.md                  # 首页（hero + 课程卡片 + 能力图谱）
├── 01-*.md ~ 18-*.md         # 课程章节（每章一个学习单元）
├── .github/workflows/        # GitHub Actions：push main 自动构建并发布 gh-pages
├── .vitepress/
│   ├── config.mjs            # 站点配置（base/侧边栏/导航/搜索）
│   ├── theme/                # 主题：ChapterCards 章节卡片、logo
│   └── public/logo.svg       # logo / favicon
├── _backup/                  # 历史版本备份（后端拆分前，只读）
├── AGENTS.md                 # 给 AI 工具的站内说明（CLAUDE.md 为其硬链接镜像）
└── package.json
```

## 如何新增/修改章节

1. 新增章节：写好 `NN-主题.md`，然后同步更新三处——`.vitepress/config.mjs` 的 sidebar、`.vitepress/theme/components/ChapterCards.vue`、`index.md` 的能力图谱表
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
