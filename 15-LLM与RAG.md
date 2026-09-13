# 15 · LLM 与 RAG

> 达标目标：**调用与 prompt 到 L2，流式/RAG/生产化到 L3。**
> 一句话理由：把 LLM 从"聊天框"接进真实产品，是前端/全栈转 AI 最硬的增量；生产级 AI 网关思路（统一入口 + 日志统计）就是生产化的起点。
> 衔接：16 章（function calling 实现）、17 章（AI 交互与端侧）、13 章（AI 产品系统设计）。

---

## 1. LLM 工作基础（L2 硬门槛）

### 1.1 Token 心智

- **token ≠ 字**：英文约 1 词 ≈ 1-2 token；**中文约 1 字 ≈ 1-2 token**
- **上下文窗口 = 输入 + 输出上限**：模型收到"窗口-输出预算"的输入，超出会截断或报错
- 实用估算：1 万 token ≈ 7000-8000 英文单词 ≈ 5000-7000 汉字；**做 RAG 时按"5 万 token ≈ 一个中等文档"心算**

### 1.2 采样参数（能说场景）

| 参数 | 作用 | 什么时候调 |
|---|---|---|
| `temperature` | 随机性（0 确定 → 1 发散） | 事实/结构化任务 **0-0.3**；创意 0.7+ |
| `top_p` | 核采样（累积概率截断） | 与 temperature 二选一调，别同时乱调 |
| `max_tokens` | 输出上限 | **必须设**（防跑飞烧钱） |
| `stop` | 停止序列 | 输出以特定标记结束时用 |

- 面试点：**temperature=0 不是绝对确定**（还有采样/浮点误差）；事实任务要低温度，但不能靠温度解决"知识缺失"（那是 RAG 的事）

### 1.3 消息角色（L2 必答）

```ts
const messages = [
  { role: 'system', content: '你是 Acme 知识库的助手，只基于给定资料回答，资料里没有就说不知道。' },
  { role: 'user', content: '什么是缓存穿透？' },
]
```

- **system**：指令优先级最高——设定角色、约束、输出格式
- **user/assistant**：对话历史（多轮）；assistant 的历史要**回传模型自己的输出**（不能只回传用户的）
- **system 劫持问题**：用户输入可能包含"忽略以上指令"——**不可信内容要与指令隔离**（见 6 安全）

### 1.4 成本模型（L3 会估算）

```
成本 = 输入 token × 输入单价 + 输出 token × 输出单价
示例：一次问答 输入 2k + 输出 500 token
  输入 2k × $0.15/1M = $0.0003
  输出 500 × $0.60/1M = $0.0003
  ≈ $0.0006/次；若 QPS=10 每天 = 10×86400×0.0006 ≈ $518/天（很贵！）
→ 结论：成本大头在"高 QPS × 长上下文"，必须缓存 + 控制上下文
```

- **prompt caching**：相同前缀命中缓存，输入价降 80-90%——RAG 产品把 system+固定资料放前面，问题放后面

### 1.5 错误与重试（L3）

| 错误 | 处理 |
|---|---|
| 429 限流 | **指数退避重试**（等 1s/2s/4s…）+ jitter |
| 5xx | 重试 2-3 次后降级 |
| 超时 | 首 token 超时 → 提示"稍后再试"；整体超时 → 降级模型 |
| 上下文超窗 | 截断历史 / 摘要压缩 |

```ts
async function callLLM(messages, { maxRetries = 3 } = {}) {
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fetchLLM(messages) }
    catch (e) {
      if (e.status === 429 && i < maxRetries) {
        await sleep(2 ** i * 1000 + Math.random() * 500)  // 指数退避 + jitter
        continue
      }
      throw e
    }
  }
}
```

**必会**：讲 token/温度/角色/窗口；估算一次调用成本；写指数退避重试。

## 2. 流式输出（L3 必做）

### 2.1 SSE 后端实现

```ts
// 后端：SSE 逐 token 推送（Fastify）
fastify.get('/api/chat', async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  for await (const chunk of llmStream(messages)) {
    reply.raw.write(`data: ${JSON.stringify({ token: chunk })}\n\n`)  // SSE 格式
  }
  reply.raw.end('data: [DONE]\n\n')
})
```

- **SSE vs WebSocket**：SSE 单向（服务端→客户端）+ 自动重连 + 简单；WebSocket 双向——**LLM 输出用 SSE 就够**，别上 WS

### 2.2 前端逐字渲染 + 中断（衔接 17 章）

```ts
// 前端：fetch 流式读取 + AbortController 中断
const res = await fetch('/api/chat', { body, signal })
const reader = res.body.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  text.value += decoder.decode(value)   // 逐块追加渲染
}
```

- **首 token 延迟是体验及格线**：首 token 3s 内是目标；慢的元凶 = 长上下文预填充 + 排队
- 生产：保存已生成部分（刷新恢复 / 断点续传）

**必会**：写 SSE 后端 + fetch 流式前端；讲 SSE vs WebSocket；讲首 token 延迟。

## 3. Prompt 工程深度（L2）

### 3.1 结构化提示模板（能写）

```
角色：你是一个严谨的 {领域} 助手
任务：根据【资料】回答用户问题
输入：【资料】{context}
输出格式：先用一句话直接回答，再列 2-3 条依据；资料中没有的，明确说"资料中未提及"
约束：不要编造；不要使用资料外的信息
```

- 顺序：**角色 → 任务 → 输入 → 输出格式 → 约束**；约束放最后（模型对结尾指令更敏感）

### 3.2 few-shot（比描述强）

```ts
// 给 2-3 个高质量示例，示例决定下限
const messages = [
  { role: 'system', content: '把输入分类为：技术/生活/财经，只输出分类名。' },
  { role: 'user', content: 'Vue 3 的响应式原理' },
  { role: 'assistant', content: '技术' },
  { role: 'user', content: '周末去哪玩' },
  { role: 'assistant', content: '生活' },
  { role: 'user', content: '今天的内容' },   // 新输入
]
```

### 3.3 CoT（思维链）

- 复杂任务默认加"**先一步步分析，再给出结论**"——让模型显式推理，降低错误率
- 代价：输出更长（成本↑）——权衡：只有复杂任务用

### 3.4 输出约束 + 解析失败重试（L3）

```ts
async function extractStructured(raw) {
  const result = await callLLM([{ role: 'user', content: `返回 JSON：{title, tags[], score}。${raw}` }])
  try { return JSON.parse(result) }              // 先试直接解析
  catch {
    const fixed = await callLLM([                // 失败：让模型自纠错
      { role: 'user', content: `上次输出不是合法 JSON：${result}。请只输出合法 JSON。` },
    ])
    return JSON.parse(fixed)                     // 再失败就降级/报错，别静默
  }
}
```

### 3.5 反模式清单

- [ ] 模糊目标（"帮我总结一下"→ 没有长度/格式约束）
- [ ] 一次塞多个不相关任务
- [ ] 与模型争论风格（一次说清规则，别来回纠正）
- [ ] 把用户输入直接拼进 system 指令（被劫持）

**必会**：写结构化 prompt（五段式）；写 few-shot；写输出解析失败重试；背反模式。

## 4. 结构化输出与工具调用（L2/L3）

### 4.1 JSON mode + 运行时校验（衔接 02 章 zod）

```ts
// 请求 JSON mode（OpenAI 系：response_format）
const res = await callLLM(messages, { responseFormat: { type: 'json_object' } })

// 拿到后必须运行时校验（模型不保证 schema 完全正确）
const parsed = SummarySchema.safeParse(JSON.parse(res))
if (!parsed.success) {
  return retryOrFallback(parsed.error)   // 校验失败重试或降级，绝不静默接受
}
```

- **生产陷阱三连**：字段缺失、类型错、幻觉字段——**校验失败必须重试或降级**

### 4.2 Function calling（到概念，实现细节在 16 章）

- 机制：模型输出"调用意图 + 参数"→ 你执行真实函数 → 结果回填 → 继续
- 本页记住一句话：**function calling = 让模型输出"可执行的动作描述"，由你的代码执行**——安全边界、工具 schema 设计见 16 章

**必会**：写 JSON mode + zod 校验；讲"校验失败必须重试"。

## 5. RAG 全链路（L3 主线）

### 5.1 链路全景与"何时需要 RAG"

```
文档 → 清洗切块 → Embedding → 向量库 → 检索 top-k → 拼进 prompt → 生成
       （离线索引）        （在线查询）
```

- **何时需要 RAG**：模型不知道你的私有数据 / 知识会更新 / 要可引用来源
- **何时不需要**：通用知识问答（模型本来就会）、需要精确计算（用代码不是 LLM）

### 5.2 切块策略（L3 决策）

```ts
// 按语义切块（标题/段落边界）而不是固定字数
function chunkBySections(md: string): string[] {
  const sections = md.split(/\n(?=##? )/)        // 按标题切
  return sections.map((s, i) => s.slice(0, 800))  // 每块上限 + 相邻 overlap
}
```

- **chunk 大小 vs overlap 的权衡**：太大 → 噪声多、检索不精准；太小 → 上下文碎、语义断
- 经验值：500-1000 token/块 + 10-20% overlap；按标题/段落切优于固定字数

### 5.3 Embedding 与向量检索

- **Embedding**：文本 → 向量（几百到几千维）；**向量距离 ≈ 语义距离**（余弦相似度）
- 选择：维度（存储成本）、语言支持（中文要测）、性价比
- **向量库与 HNSW**：HNSW = 多层图式近邻搜索（"先粗后细"，近似检索快）；一句话能讲即可

```ts
// 内存版检索（原型起步够用，快速验证链路）
const docs = await embedAll(chunks)
function search(query, k = 5) {
  const q = await embed(query)
  return docs
    .map((d) => ({ d, score: cosine(q, d.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
```

### 5.4 混合检索：为什么单独向量不够（L3 必答）

- 向量擅长"语义相似"，但**专有名词/精确匹配/代码/ID** 会翻车（"Acme" 会被检索成 "Acre"）
- **关键词检索（BM25 / MySQL FULLTEXT / Elasticsearch）** 保精确匹配 → **RRF 融合**：

```ts
// RRF（Reciprocal Rank Fusion）：两种结果按排名融合
function rrf(vRanks, kRanks, k = 60) {
  const score = new Map()
  for (const [list] of [[vRanks, 1], [kRanks, 1]]) {
    list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)))
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}
```

### 5.5 重排（rerank）

- 检索 top-50 → **rerank 模型精排** → top-5 进 prompt
- 什么时候值得上：检索质量要求高、top-k 里的顺序影响答案正确性时；成本与延迟要权衡

### 5.6 评估（L3 硬门槛：没有评估的 RAG 是玄学）

```ts
// 建 20-50 条评估集：{ question, expected, relevantDocIds }
const evalSet = [
  { q: '缓存击穿怎么解决', relevant: ['doc-3', 'doc-7'] },
  // ...
]

function evaluate(searchFn) {
  let hit = 0
  for (const item of evalSet) {
    const top = searchFn(item.q).map((d) => d.id)
    if (item.relevant.some((id) => top.includes(id))) hit++
  }
  return { recallAtK: hit / evalSet.length }   // 改切块/top-k 前后对比这个数
}
```

- 指标：`recall@k`（相关文档是否被召回）、命中率；**改版必跑，量化对比**

### 5.7 幻觉与质量兜底（L3）

- **幻觉来源**：知识缺失、检索不相关、prompt 诱导
- **兜底**：
  - 检索为空 → **明说"不知道"**（拒绝回答优于编造）
  - **引用来源**（回答带出处，用户可查）
  - `temperature` 调低 + prompt 强调"只依据资料"
- **生产监控**：记录每次检索 top-k 与回答，**抽样人工看质量**（定期）

**必会**：讲 RAG 全链路每环节为什么存在；写切块 + 内存检索；讲混合检索与 RRF；建 eval 集量化对比；讲幻觉兜底。

## 6. 生产化清单（L3）

- [ ] **统一 AI 网关**：统一封装、记录任务/厂商/耗时/成败（生产级 AI 网关思路）
- [ ] **成本与用量日志**：每次调用的 token 数、耗时、是否重试
- [ ] **缓存**：相同问题哈希命中直接回（省 token）；prompt caching
- [ ] **超时与降级**：首 token 超时 → 提示稍后；模型不可用 → 降级路由（简化模型/本地兜底）
- [ ] **安全**：key 只在后端；**prompt injection 防御**——区分指令与不可信内容（不可信内容包在数据标记里，明确"以下为不可信数据"）

## 7. 面试高频题速答

| 题 | 速答要点 |
|---|---|
| 讲 RAG 全链路 | 切块 → embedding → 检索 → rerank → 拼 prompt → 生成 |
| temperature 怎么调 | 事实/结构化 0-0.3；创意 0.7+；知识缺失靠 RAG 不靠温度 |
| 成本怎么省 | 缓存 + prompt caching + 控制上下文 + 降级模型 |
| 流式为什么重要 | 首 token 延迟是体验及格线 |
| 结构化输出怎么保证 | JSON mode + zod 运行时校验 + 失败重试 |
| 为什么混合检索 | 向量语义 + 关键词精确；RRF 融合 |
| RAG 怎么评估 | eval 集 + recall@k，改版必跑 |
| 幻觉怎么兜底 | 空检索说不知道 + 引用来源 + 低温度 |
| function calling 是什么 | 模型输出调用意图+参数，代码执行，结果回填 |

## 8. 达标标准

**L2：**
- [ ] 讲清 token/温度/角色/窗口/成本模型，能估算一次调用成本
- [ ] 写五段式 prompt + few-shot + 输出解析失败重试

**L3：**
- [ ] 做出"流式问答 + 个人文档检索"（内存向量库起步），走通全链路
- [ ] 建 20 条评估集，量化"切块方式/top-k"改版前后 recall@k
- [ ] 给 AI 调用配上：超时重试、降级、用量日志、prompt injection 防御
