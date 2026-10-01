# 优质资源导航

> 这里是本站 18 章主线之外的**站外补充资源**，分四类：系统教程、工程知识库、面试题库、开源项目。
> 挑选偏向「内容成体系、有可运行代码或真实题目、仍在持续更新」。收录不代表内容背书；star 数与规模数据核实于 2026-09，会随时间变化。

## 一、系统教程 / 学习路线

### [AI Agent 全栈学习课程](https://agent-study-ruddy.vercel.app/)

**在线课程 · 中文 · 37 章 · 7 层递进**

从零到一，系统掌握 AI Agent 核心理论与工程实践。

### [AI 智能体实战速成指南](https://didilili.github.io/ai-agents-from-zero/#/)

**在线书 · 中文 · 5.0k star**（[源码仓库](https://github.com/didilili/ai-agents-from-zero)）

Python 路线的大模型应用 / AI Agent 教程，把教程、可运行源码、实战项目、面试题库做成一体，直接对标「AI 智能体 / 大模型应用开发工程师」的岗位要求。

- 主线：大模型基础 → LangChain（LCEL / Memory / Tools）→ LangGraph（State / Node / Edge、多智能体）→ MCP Server 开发 → A2A 跨 Agent 通信
- 企业级实战：多路召回（向量 + 稀疏 + Neo4j）、HyDE / BGE-Rerank、RAGAS 评估、MinerU / OCR 文档解析；低代码 Coze / Dify 与 vLLM、Xinference 部署
- 两个完整项目：电商问数（MySQL + Qdrant + Elasticsearch + LangGraph + FastAPI SSE）、深度研搜（DeepAgents 多智能体 + WebSocket）
- 适合：零基础入门，或前端 / 后端 / 产品背景转型 AI 方向；可对照本站 15、16 章的工程化视角一起看

### [2026 最全大模型学习路线 · 卡码笔记](https://notes.kamacoder.com/llm/)

**文档站 · 中文 · 11 章约 90 篇**（[配套仓库](https://github.com/youngyangyang04/llm-master)，1.0k star）

延续「代码随想录」风格的 LLM 应用开发路线，面向做 Java / C++ / Go 的后端程序员转大模型方向，理论、工程落地与面试话术结合得比较紧。

- Prompt 与上下文：结构化 Prompt、Few-shot / CoT、JSON Schema 结构化输出、Context Engineering、Token 成本与延迟
- RAG 全链路：Embedding 选型、向量数据库、四种切片策略、Query 改写与 Context 压缩、Agentic RAG、RAG 评估
- Agent 工程：ReAct / Reflection / Planning、Agent vs Workflow、Tool Use 设计、MCP 与 Function Calling 的区别、记忆与失败模式兜底、Multi-Agent 上下文治理
- 部署与原理：KV Cache / PagedAttention、量化、TTFT·TPOT 压测；Transformer 原理并附「手撕 Attention / MHA / LayerNorm / FFN / Tiny Transformer」
- 适合：后端转 LLM 应用开发，或需要 LLM 八股与面经的求职者

### [全栈 + AI Agent 学习路线](https://github.com/Karovia/fullstack-ai-agent-roadmap)

**路线仓库 · 中文 · 511 star · 110 篇约 58 万字**

零基础到 AI Agent 全栈的系统化中文学习路线，不是链接清单，而是自带代码与验收项目的教程包，用 Obsidian 组织。

- 9 个模块：学习方法论 → Python → JavaScript → HTML/CSS → React（含手写 mini-react / Fiber / Hooks 源码）→ 后端 FastAPI + Hono/Node → 数据库与工程化 → AI 基础（Prompt 工程、企业文档问答、从零实现 GPT）→ AI Agent 框架与源码
- Agent 模块 14 篇（12 周）：LangGraph 等框架与源码、自建 MCP Server、`mini-agent-sdk`
- 每章配验收项目，另有 400+ GitHub 项目精选（按入门 / 进阶 / 源码级分级，标注「怎么用它学」）
- 附 Obsidian Canvas 思维导图、学习契约 / 周报 / 里程碑模板；README 标注 CC BY-SA 4.0
- 适合：零基础转型，路线完整但周期长（每天 3 小时约 12–15 个月）

## 二、工程知识库 / 资料合集

### [AI Infra Guide](https://caomaolufei.github.io/AIInfraGuide/)

**文档站 · 中文 · 81 篇**（[源码仓库](https://github.com/caomaolufei/AIInfraGuide)，2.5k star）

偏底层硬核的 AI Infra 全栈知识库，从 GPU 体系结构一路讲到 CUDA 算子、分布式训练与推理优化，作者为在职 AI Infra 工程师，站内另设「面试宝典」。

- 前置基础：GPU 架构、计算机体系结构
- CUDA 编程与算子优化：编程模型、算子开发、性能调优
- 分布式训练：数据并行、模型并行、大规模训练
- 推理优化：模型压缩、量化加速、推理引擎优化
- 适合：想入门或转岗 AI Infra（训练 / 推理 / 算子）的开发者；本站 15、16 章偏应用层，这里是往底层走的方向

### [AI 驯龙笔记](https://github.com/charliedream1/ai_wiki)

**知识库仓库 · 中文 · 740 star · 46+ 主题目录**

以「工程问题怎么解」为线索的 AI 全栈知识库，用 Jupyter Notebook + Markdown 分目录沉淀解决策略、关键代码与前沿追踪，作者自称「全网优秀资源搜集站」。

- 大模型应用：LLM 原理 / 训练 / 推理加速 / 评估 / 幻觉治理、多模态、图像视频生成、Prompt 工程
- RAG 与 Agent：文档解析、检索优化、知识图谱 RAG、记忆 RAG、Agentic RAG、Agent 评测与观测落地
- 基础设施：向量数据库（Milvus / Chroma / Faiss / Vespa / ES）、图数据库（Neo4j / NebulaGraph）、对象存储、数据工程
- 理论体系：数学基础、机器学习、深度学习、强化学习、图网络；另有图像识别、NLP、音频、视频、模型部署等方向目录
- 注意：仓库体积约 1 GB，克隆前有心理准备；只看资料的话用网页浏览就够了

### [Node.js 全栈技术博客 · inode.club](https://www.inode.club/)

**技术博客 · 中文**

作者 koala（公众号「程序员成长指北」）的前端 / Node.js / 数据库技术博客，内容偏「必知必会 + 面试汇总」，另有 NestJS 中文网子站。**这个站没有 AI 内容，纯全栈方向**，作为本站 06–11 章的补充读物。

- 系列：JavaScript 必知必会、Node 必知必会、MySQL 必知必会、前端框架、面试汇总
- 栏目：node / 前端 / 数据库 / 面试问题 / 标签云，另有 NestJS 中文网（nestjs.inode.club）
- 适合：Node.js 方向的初中级开发者与前端 / Node 面试准备者

## 三、面试题库 / 八股

### [agent-interview-qa：Agent 岗位面试题解](https://github.com/yimengyisheng/agent-interview-qa)

**面试题库 · 中文 · 169 题 / 15 分类**

一位 8 年前端工程师转型 AI Agent / 全栈方向后，把面试十几家公司的全程录音用 AI 整理出的真实面试题，按主题重分类并附参考答案——少见的「转型视角 + 真题」。

- Agent 与多智能体 14 题、Prompt / 上下文工程与成本优化 10 题、RAG 与检索增强 18 题、模型选型与 AI 系统落地 9 题、Claude Code 与 AI 编程工具 10 题
- 工程面：SSE / WebSocket 8 题、高并发缓存与消息队列 15 题、Node.js 9 题、MySQL / PostgreSQL 8 题、运维部署 10 题
- 前端面：JavaScript / 浏览器 8 题、Vue 与 React 12 题、CSS / Canvas / 动画 7 题、项目经验与软技能 16 题
- 高频考点：为什么需要多 Agent、Claude Code 的 Agentic Loop 与上下文压缩、MCP / Function Calling / Skills 三者区别、AI 成本优化、SSE 断线续传与降级
- 适合：前端 / 全栈转型 Agent 方向的求职者，配合本站 18 章一起刷效果更好

### [码力全开](https://javaup.chat/)

**文档站 · 中文 · 约 991 页（AI 方向 199 篇）**

以 Java 后端面试 + AI 大模型面试为主线的知识库，同时给生产级实战项目。**技术主线是 Java（本站主线是 Node / TS）**，但其中的 AI 大模型面试部分与语言无关，参考价值最高。

- AI 大模型面试详解：RAG 全链路 22 篇（解析、切片与 ChunkViz、Embedding、向量检索、混合检索、Rerank、Graph RAG、幻觉治理、评估、知识库动态更新）、MCP 8 篇、Function Calling 5 篇、Spring AI 8 篇、Prompt 7 篇、Skills 6 篇、系统设计（大模型网关、AI 语音 Agent）
- AI 编程精华：Claude Code 10 篇（上下文预算与腐化、Hooks 自动化、Skills 运行时、多 Agent 选型、长任务交接）、Codex 2 篇
- 超级八股：Java 基础 / 集合 / 并发 / JVM、MySQL / Redis、Spring / MQ / ES / Netty、分库分表 / 分布式事务 / 限流熔断
- 实战项目：Nexus Agent（企业级智能体，五路检索 + 交叉编码器精排 + 知识图谱 + Harness 治理）、大麦高并发、大麦 AI（Spring AI + RAG + Function Calling）
- 适合：Java 后端求职者，或想看「企业级 RAG / Agent 怎么做深」的人

## 四、开源项目 / 实战代码

### [Agent Craft：从零构建全栈 AI 智能体](https://github.com/Annyfee/agent-craft)

**教学代码库 · 中文 · 497 star · MIT**

系统性的开源教学项目，用 Python 从 LLM 调用一路手把手写到可运行的 AI Agent，配套万字博客详解，每个模块都有能跑起来的代码。

- 基础篇：Agent 入门与环境、LLM 调用与上下文记忆、Function Calling 与工具封装
- 框架篇：LangChain（`@tool`、ReAct、SQL Agent、流式）、RAG（FAISS → Chroma 持久化 + Reranker 精排 + 工具化）、LangGraph（三要素、LangSmith 调试、持久化记忆、Human-in-the-Loop、Graph-as-a-Tool、Multi-Agent 编排）
- MCP 实战：模块 10 用 FastMCP 写 Stdio / Streamable HTTP 双传输 Server；模块 11 用 langchain-mcp-adapters 搭双模 Client
- 产品化：模块 12 OpenAI Agents SDK & Swarm（Handoff、共享上下文）、模块 13 Streamlit「智能客服驾驶舱」
- 适合：卡在「知道概念但不会动手」或「会调 API 但不懂原理」阶段的 Agent 学习者

### [MiraFrame 弥镜](https://github.com/Lsq128/MiraFrame)

**全栈 Agent 项目 · 中文 · 71 star · TypeScript**

用 LangGraph.js 编排多 Agent 的 AI 漫剧生成流水线：故事大纲 → 角色设定 → 分镜脚本 → 角色图 → 镜头素材 → 导出，把「可观察、可重试、可人工反馈」做进了产品里。**想要 TypeScript 全栈 Agent 参考实现的，这个比 Python 教程更贴近本站技术栈。**

- Agent 编排：LangGraph.js 多节点状态图、节点间上下文传递、失败重试、审批与工作流恢复
- Human-in-the-Loop：大纲 / 角色 / 分镜三阶段可反馈触发局部重生成，另有评审开关与评分阈值
- 工程链路：pnpm monorepo（React 18 + Vite 6 + Zustand / Nest.js 11 + Drizzle + PostgreSQL 16 + Redis 7 + BullMQ / Zod 作为类型单一数据源），Socket.IO 实时推送节点状态
- 多模态接入：文本 / 图像 / 视频 provider 可配置可测试，带 Fake Provider 无 Key 跑通全流程；Docker Compose 部署、Vitest + Playwright 测试
- 注意：仓库暂无 LICENSE 文件（README 自称 MIT），商用前需自行确认

### [wow-fullstack](https://github.com/datawhalechina/wow-fullstack)

**教程 + 练手项目 · 中文 · 296 star · TypeScript**

Datawhale 与自塾团队合作开源的全栈教程，特点是「教程与可运行项目互相印证」——13 门教程配一个时间管理实战项目，代码可以一路拷着跑通。

- 教程：Vue3、TypeScript、ElementUI-Plus、FastAPI 入门、CSS，以及 Excel / Word / PPT / PDF / 压缩包 / 键鼠自动化
- 技术栈：前端 TS + Vue3 + Vite，后端 FastAPI，含 Alembic 迁移、SQLite、seed 数据的完整启动流程
- 项目功能：任务与时长记录、课程学习、积分系统、集成 Coze AI 智能体对话、学习统计、后台管理
- 注意：AI 含量只有「集成 Coze 智能体」这一处，主体是全栈工程练习；README 标注 CC BY-NC-SA 4.0（禁商用）
- 适合：想完整跟做一个 Vue3 + FastAPI 项目来练手的初中级开发者
