---
layout: home

hero:
  name: 全栈 × AI
  text: 学完能面试，能上线，牛逼
  tagline: 前端、后端、AI 工程、Agent 开发四线贯通，18 章打底 + 7 章长矛 = 地表最强候选人的证据链。
  actions:
    - theme: brand
      text: 🚀 开始学习
      link: /01-JavaScript运行时
    - theme: alt
      text: 🗺️ 路线图
      link: /roadmap.html
    - theme: alt
      text: 🧠 D 级框架
      link: /19-深度分级框架

features:
  - icon: 🧱
    title: 前端底座（D2–D3）
    details: JS/TS 深度 · 框架原理 · 工程化 · 浏览器网络性能——能审查 AI 的代码，能定位线上问题
  - icon: 🖥️
    title: 后端工程（D2–D3）
    details: Node 运行时 · 认证 · API · 数据库 · 系统设计——全栈标准，接口自己扛得住线上
  - icon: 🤖
    title: AI 工程（D2–D3→D4）
    details: LLM/RAG · Agent/MCP · AI 原生 UI——把模型接进真实产品；往下走一层到推理与评估，是区分度的分水岭
  - icon: ⚔️
    title: 两把长矛（D4）
    details: AI 推理层（mini-vLLM/LoRA 实证）+ 分布式内核（Raft/LSM/MQ）——造得出，才能讲到底
  - icon: 📊
    title: 证据链（D5）
    details: 真实用户数字 + 项目复盘 + 开源 PR + 技术写作 —— 让实力被市场看得见
  - icon: 🎯
    title: 算法军械库（门票）
    details: 100 天轨道 → medium 20min AC 率 >70% —— 没有这个，八股再好也过不了一面

---

## 📚 课程结构（18 章教材环）

::: details 点击展开完整目录
- **前端底座**：01–05｜JS 运行时、TypeScript、框架原理、工程化、浏览器·网络·性能
- **后端**：06–13｜Node 运行时、HTTP 框架、认证授权、API 设计、后端工程化、数据库、缓存与分布式、系统设计
- **AI**：14–17｜AI 协作工作流、LLM 与 RAG、Agent 与 MCP、AI 原生 UI 与端侧
- **面试**：18｜手写题、八股、系统设计、项目深挖、90 天倒排
:::

<div class="text-center">
  <a href="/19-深度分级框架" class="vp-button brand">进入长矛区 →</a>
</div>

## 🗡️ 长矛区（新增 7 章操练册）

长矛不是「知识点」，而是「验收物」。你造出一件就离 D4 近一步，凑齐两把长矛 + 证据链就是地表 strongest candidate。

| 新章 | 交付物（验收标准） |
|---|---|
| **19 · D 级分级框架** | 能用 D1–D5 给自己的每一项能力定坐标，并说出下一级的具体交付物 |
| **20 · 训练计划与里程碑** | 18–24 个月三阶段执行表；每月底 journal 复盘一次；20 章验收物清单填绿 |
| **21 · AI 模型层与推理优化** | mini-GPT 实证 + LoRA 微调报告 + vLLM 压测 + mini-vLLM 调度器仓库（连续批处理 + KV Cache 分页） |
| **22 · 分布式内核** | mini-Raft（带正确性测试）+ miniLSM + minimq（at-least-once+死信队列）三件引擎仓库 |
| **23 · 项目实操册** | 项目一（SaaS 后端）：50+ 真实用户 + P99/QPS/成本三组数字 + 故障复盘文档<br>项目二（RAG）：golden set 评估报告 + 红队安全报告 + 成本账单 + badcase 复盘 |
| **24 · 证据与影响力** | ≥1 个非 docs PR 被 merge + 10 篇深度文 + 简历三条 bullet 能被追问三层 |
| **25 · 算法军械库** | 100 题轨道（medium 20min AC 率 >70%）；设计与并发池补强 |

### 为什么必须造这三样

- **算法**：国内大厂单程票，八股和作品再好都绕不过
- **两个旗舰项目**：「做过什么」不靠描述，靠 QPS/P99/成本/故障这些数字
- **评估与安全**：RAG 谁都会搭 demo，拼的是「检索质量怎么量化、幻觉怎么兜底」的工业级方法

## 🧩 如何读这本站

| 你的目标 | 路径建议 |
|---|---|
| 前端转全栈，能面试 | 01–18 → 20 章计划（前 9 个月）→ 25 章算法轨道 |
| 要拿头部 offer（D3→D4） | 01–18（L2/L3）并行 → 21/22/25 三把长矛（10–18 个月）→ 23 章项目收口 → 24 章证据链 |
| 要独立做出产品（营收验证） | 23 章项目一为主线 → 15/16/21 章按需补齐 → 每周公开迭代，真实用户反馈驱动 |

> AGENTS.md 约定：内容保持通用教材定位，不绑定个人项目；长矛区和项目册是专门写给「要做出成果的人」的操练册，不受通用教材约束。

<style scoped>
.text-center {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 24px 0;
}
.vp-button.brand {
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}
.vp-button.alt {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}
</style>
