# 09 · API 设计

> 达标目标：**L2——REST 规范与状态码能脱口而出；L3——分页/幂等/限流/版本化能落地。**
> 一句话理由：接口是前后端契约，设计差一点，前端改起来痛苦十倍；生产级接口要"别人能安全重试、能平滑升级"。
> 以生产级 API 规范为全程教材：`/api/*` 前缀 + Fastify schema。

---

## 1. REST 规范（L2 硬门槛）

### 1.1 资源化 URL

- **名词复数**：`/api/users`、`/api/users/:id/books`
- **动作用方法表达**，不在 URL 里写动词（避免 `/api/getUser`、`/api/deleteBook` 这种 RPC 风）

| 方法 | 语义 | 幂等 | 示例 |
|---|---|---|---|
| GET | 读 | ✅ | `/api/books?page=1` |
| POST | 创建 | ❌ | `/api/books` |
| PUT | 全量替换 | ✅ | `/api/books/:id` |
| PATCH | 部分更新 | 视实现 | `/api/books/:id` |
| DELETE | 删除 | ✅ | `/api/books/:id` |

- **嵌套关系**：`/api/users/:id/books`（用户的藏书）；避免过度嵌套（>2 层就用查询参数或扁平）

### 1.2 状态码语义（能脱口而出）

| 码 | 含义 | 何时用 |
|---|---|---|
| 200 | 成功 | GET/PUT/PATCH |
| 201 | 已创建 | POST（返回 Location） |
| 204 | 无内容 | DELETE 成功 |
| 400 | 参数错 | schema 校验失败 |
| 401 | 未认证 | 没登录/token 失效 |
| 403 | 无权限 | 登录了但角色不够 |
| 404 | 不存在 | 资源缺失 |
| 409 | 冲突 | 唯一约束/状态冲突 |
| 422 | 语义错误 | 业务规则不满足（可选，和 400 二选一统一） |
| 429 | 限流 | 超出配额（带 Retry-After） |
| 500 | 服务端错误 | 兜底，不泄露细节 |

### 1.3 错误响应统一结构（L3 生产规范）

```json
{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "书不存在",
    "details": { "id": 42 },
    "traceId": "a1b2c3"
  }
}
```

- `code` 是机器可读的业务码（前端可分支），`message` 给人看，`traceId` 联调用（衔接 06 章）
- **前端一个拦截器处理所有错误**——结构不统一，前端就要到处写 if

**必会**：背状态码表；写统一错误结构；讲"为什么 URL 不写动词"。

## 2. 分页（L2/L3）

### 2.1 offset vs cursor（L2 必答）

| | offset（page/size） | cursor（游标） |
|---|---|---|
| 请求 | `?page=3&size=20` | `?cursor=<base64(id)>` |
| 深层性能 | **O(offset) 扫描，越深越慢** | 稳定（索引定位） |
| 数据变动 | 插入/删除会**跳页/重复** | 不受影响 |
| 适用 | 后台列表、小表 | 大表、feed、无限滚动 |

```ts
// cursor 分页实现（按 id 排序）
// 返回：{ items, nextCursor }
const items = await prisma.book.findMany({
  where: { id: { gt: cursorId } },        // 游标 = 上页最后一条的 id
  orderBy: { id: 'asc' },
  take: 20,
})
const nextCursor = items.length === 20 ? items[items.length - 1].id : null
```

- **为什么深层 offset 慢**：`LIMIT 10000, 20` 要扫描前 10020 行再丢弃
- 面试点：能说"**数据量大/会变动 → cursor**，简单后台 → offset 够用"

### 2.2 响应结构

```json
{
  "items": [...],
  "page": 3,
  "pageSize": 20,
  "total": 1523,
  "hasMore": true
}
```

- `total` 是可选（大表 COUNT 也贵，feed 场景可省略）
- cursor 场景：`{ items, nextCursor, hasMore }`

**必会**：讲 offset vs cursor 取舍；写 cursor 分页代码。

## 3. 幂等（L3 核心）

### 3.1 为什么必须幂等（L2 能讲）

- **网络重试是常态**：客户端超时重发、MQ 重投、代理重试——重复请求不能产生重复副作用
- 典型事故：用户点"提交订单"按钮超时 → 重试 → 下了两单

### 3.2 Idempotency-Key 完整实现（L3 必会）

```ts
// 客户端：POST 写操作带 Idempotency-Key（每次业务操作生成一个唯一 key）
const key = crypto.randomUUID()
await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': key },
  body: JSON.stringify({ bookId: 42 }),
})

// 服务端：key 查结果，命中直接返回首次结果
async function handleCreate(req, reply) {
  const key = req.headers['idempotency-key']
  if (!key) return reply.code(400).send({ error: '缺少 Idempotency-Key' })

  const cached = await redis.get(`idem:${key}`)
  if (cached) return reply.send(JSON.parse(cached))   // 重复请求 → 返回首次结果

  const order = await createOrder(req.body)
  await redis.set(`idem:${key}`, JSON.stringify(order), 'EX', 3600)
  return reply.code(201).send(order)
}
```

### 3.3 幂等的另一条腿：唯一约束

- 业务上天然唯一：订单号、请求流水号 → **DB 唯一约束兜底**（重复插入直接报 409）

```prisma
model Order {
  id          Int    @id @default(autoincrement())
  requestKey  String @unique        // 幂等兜底：同一 requestKey 只能存在一条
  // ...
}
```

- 面试点：**幂等 = 客户端 key + 服务端缓存结果 + DB 唯一约束兜底**三件套

**必会**：写 Idempotency-Key 完整实现；讲唯一约束兜底；说"为什么 POST 非幂等需要设计"。

## 4. 限流（L3）

### 4.1 令牌桶 vs 漏桶（L2 必答）

| | 令牌桶 | 漏桶 |
|---|---|---|
| 模型 | 桶里按速率**攒令牌**，请求消耗令牌 | 桶里请求**按固定速率漏出** |
| 突发 | **允许突发**（桶容量=突发上限） | 平滑，不允许突发 |
| 适用 | 大多数业务（允许短时突发） | 严格平滑（如下游脆弱） |

```ts
// 令牌桶（内存版，理解原理；生产用 Redis + Lua 做分布式）
class TokenBucket {
  constructor(public capacity: number, public ratePerSec: number) {
    this.tokens = capacity
    setInterval(() => { this.tokens = Math.min(this.capacity, this.tokens + this.ratePerSec) }, 1000)
  }
  tryAcquire(): boolean {
    if (this.tokens >= 1) { this.tokens -= 1; return true }
    return false
  }
}

// Fastify 接入：按用户限流，超出 429 + Retry-After
fastify.addHook('preHandler', async (req, reply) => {
  const key = `rate:${req.user?.id ?? req.ip}`
  const allowed = await redisRateLimit(key, { limit: 100, windowSec: 60 })  // Redis INCR + EXPIRE
  if (!allowed) {
    return reply.code(429).header('Retry-After', '60').send({ error: { code: 'RATE_LIMITED' } })
  }
})
```

- **维度**：按用户 / 按 IP / 按接口（登录接口限 IP，业务接口限用户）
- **分布式限流**：Redis `INCR` + `EXPIRE`（固定窗口）或 `Lua` 脚本（滑动窗口/令牌桶）——单机内存版多实例会超限

**必会**：讲令牌桶 vs 漏桶；写 Redis 固定窗口限流；答 429 + Retry-After。

## 5. 版本化与兼容（L3）

### 5.1 两种方式

| | URL 版本 | Header 版本 |
|---|---|---|
| 示例 | `/api/v1/books` | `Accept: application/vnd.acme.v2+json` |
| 优点 | 直观、可缓存可调试 | URL 干净 |
| 缺点 | URL 语义混入版本 | 调试/缓存麻烦 |

- 推荐：**URL 版本**（`/api/v1/...`），简单直白；内部 API 可先不加，等有外部消费者再说

### 5.2 向后兼容铁律（L3）

- **只加字段不删**、加可选不破坏必填、不改字段语义
- 不兼容变更 → **开新版本 + 弃用期**（v1 保留 N 个月，返回 `Deprecation` 头）

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sun, 01 Jan 2027 00:00:00 GMT   # 告诉客户端 v1 何时下线
```

**必会**：讲两种版本化取舍；背向后兼容铁律。

## 6. 接口契约与前端协作（L3）

- **Schema 即契约**：Fastify 的 request/response schema（衔接 07 章）→ 用 `fastify-type-provider` 生成 TS 类型给前端用，**一处定义两端受益**
- 首屏字段：**别一次返回全量**（前端用不到的别给）——性能 + 带宽
- 弱网/重试：前端 axios 拦截器统一处理 401（跳登录）、429（提示稍后）、网络错误（重试）

## 7. 面试高频题速答

| 题 | 速答要点 |
|---|---|
| REST 状态码 | 200/201/204/400/401/403/404/409/422/429/500 |
| 为什么 URL 不写动词 | 资源化 + 方法语义，动词用 HTTP 方法表达 |
| 深层分页为什么慢 | OFFSET 越深扫描越多；cursor 索引定位稳定 |
| 幂等怎么保证 | Idempotency-Key + 服务端缓存结果 + DB 唯一约束兜底 |
| 令牌桶 vs 漏桶 | 允许突发 vs 匀速平滑 |
| 分布式限流怎么做 | Redis INCR+EXPIRE 固定窗口 / Lua 滑动窗口 |
| 版本化怎么选 | URL v1/v2 直观；只加不删保兼容 |
| 429 带什么头 | Retry-After |

## 8. 达标标准

**L2：**
- [ ] 背状态码表，写统一错误结构
- [ ] 讲 offset vs cursor 取舍

**L3：**
- [ ] 写 Idempotency-Key 完整实现 + 唯一约束兜底
- [ ] 写 Redis 限流（固定窗口）+ 429/Retry-After
- [ ] 设计一次不兼容变更的版本化方案（v1 弃用期 + Deprecation 头）
