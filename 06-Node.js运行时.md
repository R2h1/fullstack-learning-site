# 06 · Node.js 运行时

> 达标目标：**L2 硬门槛——事件循环/进程模型/Stream 能讲透；L3——异步工程与排障落地。**
> 一句话理由：Node 是后端的运行时地基，事件循环与进程模型是面试必考，Stream/背压是生产级文件处理的必备认知。
> 以生产级 Fastify + Prisma + MySQL 服务为全程教材（企业级技术栈），`index.ts` 的优雅关闭是范本。

---

## 1. Node 运行时模型（L2）

### 1.1 单线程 + 事件循环 + 非阻塞 IO

- **单线程**：JS 执行只有一个主线程（事件循环线程）
- **为什么能高并发**：IO 是**非阻塞 + 异步**的——发起 IO 后不等待，继续执行后续代码，IO 完成后回调再进事件循环
- **两类 IO 的执行者**：
  - **网络 IO**（TCP/HTTP）：交给内核，事件循环空闲时等待，完成通知回调
  - **文件/ DNS / crypto**：交给 **libuv 线程池**（默认 4 个，`UV_THREADPOOL_SIZE` 可调）
- **关键认知**：`fs` 读文件不是"不占线程"，而是**占线程池**——大量并发 fs 操作会耗尽线程池，拖慢所有文件操作

```js
const { readFile } = require('node:fs')
readFile('big.txt', (err, data) => { /* 回调：不阻塞主线程 */ })
console.log('继续执行') // 立刻执行，不等读文件
```

### 1.2 CPU 密集会卡死事件循环

- 同步大循环/`JSON.parse` 大对象/加密会**独占主线程**，期间所有请求、定时器、IO 回调全部排队
- 解法：`worker_threads`（第 3 节）、拆小任务让出、或换成子进程
- 面试点：Node 的适用边界 = IO 密集；CPU 密集要 Worker

**必会**：讲"单线程 + 事件循环 + 非阻塞 IO"如何支撑高并发；说清文件 IO 走线程池、网络 IO 走内核。

## 2. libuv 事件循环六阶段（L2 硬门槛，能画图）

### 2.1 阶段全景

```
┌─ timers（setTimeout/setInterval 到期回调）
├─ pending callbacks（上一轮遗留的 IO 回调，如 TCP 错误）
├─ idle / prepare（libuv 内部使用，可忽略）
├─ poll（★核心：等待新 IO 事件；无任务时阻塞等待）
├─ check（setImmediate）
└─ close callbacks（socket 关闭等清理）
```

- **poll 阶段的行为**：有 IO 事件 → 处理；无事件但有 timers/check 待执行 → 继续前进；无任何事 → **阻塞等待**（这正是"Node 空闲不占 CPU"的原因）
- `process.nextTick` **不属于任何阶段**：每个阶段切换时**插队**执行（微任务队列之上）

### 2.2 优先级（面试第一题）

```
process.nextTick > Promise 微任务 > 当前阶段回调
```

### 2.3 setTimeout vs setImmediate（必考）

```js
// main 模块里：顺序不确定（取决于进入 poll 的时机）
setTimeout(() => console.log('timeout'), 0)
setImmediate(() => console.log('immediate'))
// 可能 timeout 先，也可能 immediate 先

// IO 回调里：immediate 一定先
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))
})
// 一定：immediate → timeout
// 原因：IO 回调在 poll 阶段执行，之后必然进入 check（setImmediate），
//       而 setTimeout 要到下一轮 timers 阶段
```

### 2.4 经典输出题（L2 必答）

```js
const fs = require('node:fs')
process.nextTick(() => console.log('nextTick'))
Promise.resolve().then(() => console.log('promise'))
setTimeout(() => console.log('timeout'), 0)
setImmediate(() => console.log('immediate'))
fs.readFile(__filename, () => {
  process.nextTick(() => console.log('nextTick-in-io'))
  Promise.resolve().then(() => console.log('promise-in-io'))
  setTimeout(() => console.log('timeout-in-io'), 0)
  setImmediate(() => console.log('immediate-in-io'))
})
// 主线程：nextTick → promise（nextTick 优先于微任务）
// 第一轮宏任务：timeout 或 immediate 先后不确定
// IO 回调里：nextTick-in-io → promise-in-io → immediate-in-io → timeout-in-io（下一轮 timers）
```

**必会**：画六阶段图；讲 nextTick 插队；答 setTimeout vs setImmediate；默写经典输出题。

## 3. 进程模型（L2/L3）

### 3.1 process 与三种子进程

| API | 场景 | 特点 |
|---|---|---|
| `exec` | 跑命令拿输出 | 缓冲式（有 1MB 上限），简单 |
| `spawn` | 流式交互/大输出 | 流式，推荐；`stdio: 'pipe'/'inherit'/'ignore'` |
| `fork` | 跑 JS 子进程 | 自带 IPC channel（`child.send`/`message` 事件） |

```js
const { spawn } = require('node:child_process')
const child = spawn('node', ['worker.js'], { stdio: ['ignore', 'pipe', 'pipe'] })
child.stdout.on('data', (d) => process.stdout.write(d))
child.on('exit', (code) => console.log('退出码', code))
```

### 3.2 cluster：多进程共享端口

- **原理**：master 进程监听端口，把连接**分发**给多个 worker（默认 round-robin）；worker 各自跑事件循环
- **粘性问题（session sticky）**：负载均衡可能把同一用户的请求分到不同 worker——若 session 在内存（生产项目用 JWT 无状态则天然免疫）会有问题
- **与 PM2 的关系**：PM2 cluster 模式就是帮你管理 cluster 进程
- 常见问题：worker 崩溃 → master 是否重启它（默认不会，需自己监听 `exit` 重启——生产要配）

```js
const cluster = require('node:cluster')
const http = require('node:http')
const os = require('node:os')

if (cluster.isPrimary) {
  for (let i = 0; i < os.cpus().length; i++) cluster.fork()
  cluster.on('exit', (worker) => {          // worker 崩了自动重启
    console.log('worker', worker.process.pid, 'died')
    cluster.fork()
  })
} else {
  http.createServer((req, res) => { res.end('ok') }).listen(3000)
}
```

### 3.3 worker_threads：真多线程（CPU 密集）

- 与 cluster 的分工：**cluster 管"多核跑服务"，worker_threads 管"单进程内并行计算"**
- 共享内存：`SharedArrayBuffer` + `Atomics`；否则靠 postMessage 拷贝

```js
// main.js
const { Worker } = require('node:worker_threads')
const worker = new Worker('./crypto-worker.js')
worker.postMessage(10 ** 8)                       // 大计算丢给 worker
worker.on('message', (result) => console.log('结果', result))

// crypto-worker.js
const { parentPort } = require('node:worker_threads')
parentPort.on('message', (n) => {
  let sum = 0
  for (let i = 0; i < n; i++) sum += i             // CPU 密集：不卡主线程
  parentPort.postMessage(sum)
})
```

### 3.4 IPC 与进程间通信

- fork/worker 的 `postMessage`/`send` 是结构化克隆（函数/原型丢失）
- 进程间共享数据要 `SharedArrayBuffer` 或外部存储（Redis/DB）

**必会**：讲 cluster 原理与粘性问题；说清 cluster vs worker_threads 分工；写一个 worker_threads 示例。

## 4. 优雅关闭与信号（L3，对照生产级 `index.ts`）

### 4.1 信号语义

| 信号 | 含义 | 生产用法 |
|---|---|---|
| `SIGINT` | Ctrl+C | 开发环境终止 |
| `SIGTERM` | 请求终止（kill 默认、PM2/docker stop 发送） | **生产优雅关闭** |
| `SIGHUP` | 终端断开 | 有时用于重载配置 |

### 4.2 完整优雅关闭（L3 必会，企业级标配）

```
收到 SIGTERM/SIGINT
  → 停止接收新请求（close 服务器）
  → 等待进行中请求完成（或超时强杀）
  → 清理定时器/订阅（onClose 钩子）
  → 释放 DB 连接池
  → process.exit(0)
```

```js
const server = app.listen(3000)

async function shutdown(signal) {
  console.log(`${signal} 收到，开始优雅关闭`)
  server.close(async () => {              // 1. 停新请求，等存量请求完成
    try {
      await app.close()                    // 2. 触发 onClose 钩子（清理定时器）
      await prisma.$disconnect()           // 3. 释放连接池
      console.log('已释放全部资源')
      process.exit(0)
    } catch (e) {
      console.error('关闭出错', e)
      process.exit(1)
    }
  })
  // 4. 兜底：超时强杀（防止某请求永远不结束）
  setTimeout(() => { console.error('超时强制退出'); process.exit(1) }, 10_000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

- **为什么顺序重要**：先关服务再断 DB——否则"请求还在处理、连接池已释放"会报连接错误
- 生产版 `index.ts` 的写法：`fastify.close()` → `prisma.$disconnect()` → `process.exit(0)`，并监听 SIGINT/SIGTERM

**必会**：默写优雅关闭完整代码；讲信号语义；解释为什么顺序重要。

## 5. Stream 与 Buffer（面试高频 + 生产必备）

### 5.1 四类 Stream

| 类型 | 用途 |
|---|---|
| Readable | 读数据源（文件/HTTP 响应） |
| Writable | 写数据（文件/HTTP 请求体） |
| Duplex | 可读可写（socket） |
| Transform | 读→处理→写（gzip、加密、日志） |

### 5.2 背压（backpressure）机制（L2 必答）

- 内部有缓冲区：Readable 的 `highWaterMark`（默认 64KB）、Writable 的写缓冲
- **读方消费慢 → 内部缓冲满 → 流暂停（pause）→ 通知上游暂停产出**——这就是背压
- **手动消费要自己处理背压**：

```js
// 错误示范：不处理背压，大文件可能撑爆内存
stream.on('data', (chunk) => { /* 处理 */ })

// 正确：监听 data 时用 pause/resume 或直接用 pipe/pipeline
stream.on('data', (chunk) => {
  stream.pause()                    // 处理不过来就暂停
  process(chunk, () => stream.resume())
})
```

- **`pipe`/`pipeline` 自动处理背压**——生产用 `pipeline`（还自动清理错误）：

```js
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

await pipeline(
  createReadStream('big.zip'),
  createWriteStream('copy.zip')     // 自动背压 + 错误清理
)
```

### 5.3 为什么大文件必须流式（L2 必答）

```js
// 坏：整个文件进内存
const data = fs.readFileSync('2GB.zip')      // 2GB 内存直接爆
// 好：分块处理，峰值内存 = chunk 大小
createReadStream('2GB.zip', { highWaterMark: 16 * 1024 })
  .on('data', (chunk) => { /* 每块 16KB */ })
```

- 面试题："给用户下载一个大文件"——`createReadStream` + `pipeline` 接到响应流，别 `readFile` 再返回
- 上传同理：用流式接收，别 `await req.body` 一次性攒完

### 5.4 Buffer 要点

- Buffer = `Uint8Array` 子类（Node 特有，处理二进制）
- 创建：`Buffer.alloc(n)`（清零，安全）/ `Buffer.from(str, 'utf8')` / `Buffer.concat([...])`
- 编码：`utf8` / `base64` / `hex`；`toString('utf8')` 还原
- 注意：`Buffer` 和字符串互转有性能与内存拷贝成本；大文件别反复转

**必会**：讲背压机制（highWaterMark、暂停/恢复）；写 pipeline 大文件示例；答"为什么大文件必须流式"。

## 6. 异步资源与错误处理（L3）

### 6.1 AsyncLocalStorage：请求级上下文（traceId）

```js
const { AsyncLocalStorage } = require('node:async_hooks')
const als = new AsyncLocalStorage()

// 入口：每个请求创建独立上下文
app.use((req, res, next) => {
  const traceId = crypto.randomUUID()
  als.run({ traceId }, () => next())
})

// 任何深层的异步回调里都能取到同一个 traceId
function log(msg) {
  const ctx = als.getStore()
  console.log(JSON.stringify({ traceId: ctx?.traceId, msg }))
}
```

- 为什么需要它：普通全局变量在并发请求间会串；`als.run` 把上下文"绑"到整个异步链

### 6.2 uncaughtException / unhandledRejection 的正确姿势

```js
// 错误姿势：吞掉，继续跑（状态可能已损坏）
process.on('uncaughtException', () => {})

// 正确姿势：记录 + 退出，交给 PM2/守护进程重启
process.on('uncaughtException', (err) => {
  console.error('未捕获异常，退出重启', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('未处理拒绝', reason)
})
```

- 理由：异常后的进程状态不可信（半写的文件、损坏的连接池），**重启比带病运行安全**
- 兜底：PM2 `restart` / Docker `restart policy`

### 6.3 Node 侧内存与性能排查（L3）

- `node --inspect` 接 Chrome DevTools：Memory 快照、CPU profile
- **heapdump**：线上抓堆快照离线分析（`heapdump` 模块）
- 事件循环阻塞检测：`blocked-at` 定位阻塞代码；业务侧记录"请求耗时异常"日志
- 常见泄漏（衔接 01 章）：全局缓存无上限、闭包持有大对象、事件监听器无限添加（`process.on` 滥用）

**必会**：写 AsyncLocalStorage traceId 示例；讲 unhandledRejection 正确处理；说 Node 侧泄漏排查工具。

## 7. 面试高频题速答

| 题 | 速答要点 |
|---|---|
| Node 为什么能高并发 | 单线程 + 非阻塞 IO + 事件循环；文件 IO 走线程池 |
| 画 libuv 阶段 | timers → pending → poll → check → close；nextTick 插队 |
| setTimeout vs setImmediate | main 模块不确定；IO 回调里 immediate 先 |
| cluster vs worker_threads | 多进程共享端口 vs 单进程多线程算 CPU |
| 粘性会话怎么解决 | 无状态 JWT / 外部 session 存储 |
| 大文件为什么流式 | 整块读爆内存；pipeline 自动背压 |
| 背压是什么 | 缓冲满 → 暂停上游；pipe/pipeline 自动处理 |
| 优雅关闭顺序 | 停请求 → 等完成 → 断 DB → exit；超时兜底强杀 |
| unhandledRejection 怎么办 | 记录 + 退出重启，不吞掉 |
| traceId 怎么做 | AsyncLocalStorage 贯穿请求 |

## 8. 达标标准

**L2：**
- [ ] 画 libuv 六阶段 + nextTick 插队，默写经典输出题
- [ ] 答 setTimeout vs setImmediate（含 IO 回调场景）
- [ ] 讲背压机制与大文件流式处理，写 pipeline 示例
- [ ] 讲 cluster / worker_threads 分工与粘性问题

**L3：**
- [ ] 默写完整优雅关闭（停服务 → 等请求 → 断 DB → 超时兜底）
- [ ] 用 AsyncLocalStorage 实现请求级 traceId 贯穿日志
- [ ] 给服务配 uncaughtException/unhandledRejection 兜底 + 进程守护
- [ ] 用 --inspect/heapdump 定位一次 Node 侧内存问题
