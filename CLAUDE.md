# AGENTS.md

本文件是学习站给 AI 编码工具的**站内权威说明**，供 dsh / Claude Code / Codex 等工具在会话开始时自动读取。`CLAUDE.md` 是本文件的镜像（内容逐字节相同），改约定时只改本文件，然后用硬链接重新同步 `CLAUDE.md`（Windows：`cmd /c mklink /H CLAUDE.md AGENTS.md`）。

## 项目概述

**全栈 × AI 学习路径**——一套面试级 · 生产级 · 企业级的全栈 + AI 学习课程（18 章），用 VitePress 渲染成静态学习站。核心判断：**AI 把"能跑的代码"变成免费商品，把"能上线的判断"变成核心竞争力**，所以每章都按 L1/L2/L3 分级验收。

## 架构

- **内容即课程**：根目录 `01-*.md` ~ `18-*.md`，每章一个学习单元（纯 Markdown，不绑框架）
- **站点骨架**：
  - `.vitepress/config.mjs`：站点配置（侧边栏、顶部导航、本地搜索）
  - `.vitepress/theme/`：`index.js`（主题入口）、`components/ChapterCards.vue`（首页章节卡片）、`public/logo.svg`（logo/favicon）
  - `index.md`：首页（hero + 能力卡片 + 课程目录 + 能力图谱）
- **备份**：`_backup/backend-pre-split/` 是后端拆分前的历史版本，**只读不修改**

## 命令

```bash
pnpm run dev       # 本地预览，http://localhost:5174/fullstack-learning-site/（与线上子路径一致）
pnpm run build     # 构建到 .vitepress/dist（纯静态，可独立部署）
pnpm run preview   # 预览构建产物
```

依赖：pnpm（本机全局 v11，`pnpm-workspace.yaml` 里 `allowBuilds.esbuild: true` 已配好）。本项目是**独立仓库**，不与其他项目共享 workspace。

## 关键约定（硬规则，改内容前必读）

### 章节标准（每章必须齐备，这是"面试级"的保障）

1. 开头 `> 达标目标`（标注 L2/L3 要求）与"一句话理由"
2. 正文：**原理讲解 + 可运行的代码/SQL 示例**，不止列点
3. 每个大节末尾有 **「必会」锚点**（该节 L2 自测题）
4. 章节末尾有 **「面试高频题速答」表** 与 **「达标标准」**（L2/L3 勾选清单）

### 分级定义

- **L1 会用**：能写、能跑
- **L2 面试级**：不看资料能答出「必会」/速答表
- **L3 生产级**：能在真实项目做对工程决策、说出坑与兜底

### 编号与新增章节

- 章节编号 **01-18 线性**，按 前端(01-05) → 后端(06-13) → AI(14-17) → 面试(18) 分组
- **新增/插入章节**要重排编号，并同步更新**三处**：
  1. `.vitepress/config.mjs` 的 `sidebar`
  2. `.vitepress/theme/components/ChapterCards.vue` 的 `chapters` 数组
  3. `index.md` 的「能力图谱」表
- **拆章/重排编号前，先备份原文件到 `_backup/`**（历史对照）

### 内容写作约束

- 语言：中文；代码示例要真实可运行（伪代码要注明）
- **Markdown 里 `{{ }}` 会被 VitePress 当 Vue 模板插值**：内联代码/正文里**禁止**写（如 `${{ xxx }}` 会导致页面编译报错白屏）；fenced 代码块安全（带 v-pre）
- 章节交叉引用用**当前章号**（如"衔接 15 章"），改编号后必须全局核查
- **内容保持通用教材定位**：示例用企业级通用技术栈与命名（如 Fastify + Prisma + MySQL、`acme-api` 这类占位名），**不绑定任何个人项目**；写"对照某个生产项目"时用泛化描述，不出现具体私有仓库/域名/进程名
- 分级定位：L2 面试级 / L3 生产级，正文示例按**企业级标准**（MySQL、可观测、安全、容量）组织，个人项目式简化方案只作为对照出现
- 不修改 `_backup/` 目录内容
