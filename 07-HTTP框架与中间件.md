# 07 · HTTP 框架与中间件

> 达标目标：**L2 硬门槛——请求生命周期与钩子顺序能画能讲；L3——插件作用域、校验与错误处理落地。**
> 一句话理由：AI 能生成路由，但"校验在哪层做、错误在哪层兜、插件作用域怎么封"必须是你的判断——这是后端代码的骨架。
> 示例统一用 Fastify 4（企业主流框架），全程对照生产级服务的 `src/` 组织。

---

## 1. 框架选型：Fastify vs Express（L2）

### 1.1 对比表

| 维度 | Express | Fastify |
|---|---|---|
| 性能 | 一般（约 3-5 万 req/s 量级） | 快约 2-3 倍（schema 序列化优化） |
| 校验 | 手动/第三方（Joi/zod 自己接） | **内置 JSON Schema**（校验 + 响应序列化加速） |
| 插件模型 | 中间件扁平（无作用域） | **插件树 + encapsulation**（作用域隔离） |
| 日志 | 无内置，接 morgan/pino | **内置 pino**（结构化日志） |
| 类型 | 一般 | 类型友好（请求/响应类型推导） |
| 生态 | 极全（老牌） | 够用且快速增长 |
| 异步 | 支持（回调/async） | 原生 async/await |

### 1.2 选型判断（能说 trade-off）

- **新项目、无强 Express 生态依赖 → Fastify**：校验/日志/性能内置，代码更少
- **需要大量老牌中间件（passport/multer 生态）→ Express**：生态成熟
- 面试点：不要说"Fastify 更快所以选它"，要说"**内置 schema 校验 + 插件作用域**让代码更可控，快是附带收益"

**必会**：讲对比表 + 选型 trade-off（为什么选 Fastify 而不是"它更快"）。

## 2. 请求生命周期与钩子（L2 硬门槛）

### 2.1 完整钩子顺序（能画）

```
incoming request
  → onRequest（最早，可拦/鉴权）
  → preParsing（改请求体流，罕见）
  → preValidation（schema 校验之前）
  → preValidation 内的 schema 校验（框架自动）
  → preHandler（★鉴权/通用前置逻辑放这）
  → handler（业务）
  → preSerialization（响应序列化前，改响应）
  → onSend（改响应体/加头，最后关卡）
  → onResponse（日志/统计，响应已发出）
```

### 2.2 每个钩子干什么（表）

| 钩子 | 典型用途 | 时机 |
|---|---|---|
| `onRequest` | 请求级日志、全局拦截 | 最早 |
| `preValidation` | 校验前预处理（改 query） | 校验前 |
| `preHandler` | **鉴权、限流、上下文注入** | 校验后、业务前 |
| `handler` | 业务 | 核心 |
| `onSend` | 统一改响应体、加响应头、压缩 | 发送前 |
| `onResponse` | 耗时统计、访问日志 | 响应后 |

### 2.3 代码示例（L2 能写）

```ts
// 请求日志 + 耗时统计（生产项目 stats 类功能的原型）
fastify.addHook('onRequest', async (req) => {
  req.log.info({ method: req.method, url: req.url }, 'request start')
})

fastify.addHook('onResponse', async (req, reply) => {
  const duration = reply.elapsedTime
  req.log.info({ status: reply.statusCode, durationMs: duration }, 'request done')
})

// 鉴权放 preHandler（校验已过、业务未跑，最适合拦）
fastify.addHook('preHandler', async (req, reply) => {
  const user = await authenticate(req)      // 查 JWT/session
  if (!user) return reply.code(401).send({ error: '未授权' })
  req.user = user
})
```

**必会**：画完整钩子顺序；说每层职责；写 onRequest/onResponse 日志钩子 + preHandler 鉴权钩子。

## 3. 中间件 vs 钩子（L2）

### 3.1 Express 洋葱模型

```
请求 → mw1(前) → mw2(前) → handler → mw2(后) → mw1(后) → 响应
```

- 每个中间件 `next()` 之后还能做"后置"逻辑（洋葱出层）
- 中间件顺序 = 注册顺序；`next()` 不调用则请求停在这层

### 3.2 Fastify 怎么处理

- Fastify 兼容 Express 中间件：`fastify.use()`（但**推荐用钩子**）
- **钩子 vs 中间件**：

| | 中间件 | 钩子 |
|---|---|---|
| 作用域 | 全局（无隔离） | **可限定插件作用域** |
| 后置逻辑 | 洋葱模型天然支持 | onResponse 单独做 |
| 错误处理 | 需 4 参错误中间件 | errorHandler 统一 |

- 面试点：Fastify 为什么"不推荐中间件"——中间件无法利用插件封装的作用域隔离，钩子可以

**必会**：画洋葱模型；讲钩子 vs 中间件差异（作用域 + 错误处理）。

## 4. 插件与封装（L3 核心）

### 4.1 encapsulation（封装）原理

- Fastify 的 `register()` 创建**新的插件作用域（上下文）**：插件内注册的钩子、装饰器、路由**默认不泄漏**到外层
- 类似"闭包"：父看不到子，子看得到父（继承）
- **注册顺序影响可见性**：A 插件先注册、B 后注册，B 看不到 A 里的私有东西

### 4.2 fastify-plugin：穿透封装

- 想让插件的东西全局可见 → 用 `fastify-plugin` 包裹（会**跳过封装**，注册到更外层）

```ts
import fp from 'fastify-plugin'

// 不包：只在当前作用域可见
export default async function myAuth(app) {
  app.decorate('auth', authFn)
}
// 包了：全局可见（所有后续插件/路由都能用 app.auth）
export default fp(async (app) => {
  app.decorate('auth', authFn)
})
```

### 4.3 装饰器与依赖注入

```ts
// decorate：给实例/请求/响应挂共享能力
app.decorate('config', { jwtSecret: process.env.JWT_SECRET })
app.decorateRequest('user', null)          // req.user 类型化
app.decorateReply('success', function (data) { this.send({ ok: true, data }) })

// 类型化（TypeScript）：用 declare module 扩展
declare module 'fastify' {
  interface FastifyInstance { config: typeof config }
}
```

### 4.4 生产级实践（对照 `src/` 目录组织）

- 路由拆成独立插件文件（`routes/*.ts`）在 `index.ts` 统一 `register`
- 认证相关封装在 `plugins/auth.ts` / `auth-middleware.ts`
- 好处：**每个模块一个作用域**，钩子/装饰器互不污染；也方便单独测试

**必会**：讲 encapsulation 原理（为什么注册顺序影响可见性）；写 fastify-plugin 穿透示例；讲生产级路由组织。

## 5. Schema 校验（L3 生产规范）

### 5.1 完整用法（body/query/params/response）

```ts
fastify.post('/books', {
  schema: {
    params: { type: 'object', properties: { userId: { type: 'string' } } },
    body: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 100 },
        author: { type: 'string', maxLength: 50 },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      },
      additionalProperties: false,          // 禁止多余字段（防脏数据）
    },
    response: {
      200: {
        type: 'object',
        properties: { id: { type: 'integer' }, title: { type: 'string' } },
      },
    },
  },
}, async (req, reply) => {
  const book = await db.create(req.body)    // 到这里 body 已校验
  return reply.send(book)                   // response schema 顺便加速序列化
})
```

### 5.2 校验失败的统一 400（L3）

```ts
fastify.setErrorHandler((error, req, reply) => {
  if (error.validation) {                    // schema 校验失败
    return reply.code(400).send({
      error: { code: 'VALIDATION_ERROR', message: '参数校验失败', details: error.validation },
    })
  }
  req.log.error(error)                       // 其他错误：记录
  return reply.code(500).send({ error: { code: 'INTERNAL', message: '服务器错误' } })
})
```

- **校验失败响应结构必须和业务错误统一**，前端一个拦截器处理所有
- 面试点：response schema 不只为契约，**还能让 Fastify 走 schema 序列化（快）**

### 5.3 与 zod 的关系（L2/L3）

- Fastify 生态用 **JSON Schema**（内置）；前端/跨层共享可用 zod（衔接 02 章）
- 判断：接口边界校验 Fastify schema 就够；复杂业务模型校验（如领域对象）用 zod 更舒服

**必会**：写完整 schema（body/params/response + additionalProperties）；写 setErrorHandler 统一错误；讲 response schema 加速序列化。

## 6. 路由设计（L3）

- **前缀与版本化**：`register(routes, { prefix: '/api/v1/books' })`——按模块挂前缀，版本化衔接 09 章
- 参数校验：`:id` 参数在 schema params 里约束类型（别手写 `parseInt` 判断）
- 通配：`*` 通配路由处理 404（记得最后注册）
- 组织：按资源拆文件 + `prefix`，别把几百条路由堆在一个文件

## 7. 错误处理深度（L3）

```ts
// 自定义错误类：业务错误带 code，前端可分支
class BizError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
  }
}

// handler 里直接抛
if (!book) throw new BizError('BOOK_NOT_FOUND', '书不存在', 404)

// 全局兜底：setErrorHandler 里按类型分发
fastify.setErrorHandler((err, req, reply) => {
  if (err instanceof BizError) {
    return reply.code(err.status).send({ error: { code: err.code, message: err.message } })
  }
  // 未知错误：记录 + 500，别把内部信息漏给前端
  req.log.error(err)
  return reply.code(500).send({ error: { code: 'INTERNAL', message: '服务器错误' } })
})
```

- 铁律：**未知错误不向前端暴露内部细节**（堆栈/表名/密钥）
- `reply.send` 只调一次；`onSend` 里改响应体是最后机会

**必会**：写 BizError + setErrorHandler 分发；讲"未知错误不泄露内部信息"。

## 8. 面试高频题速答

| 题 | 速答要点 |
|---|---|
| Fastify vs Express | 内置 schema 校验 + 插件作用域 + pino；生态 Express 更全 |
| 钩子顺序 | onRequest → preValidation → preHandler → handler → onSend → onResponse |
| 鉴权放哪层 | preHandler（校验后、业务前） |
| 中间件 vs 钩子 | 中间件无作用域隔离；钩子可限定插件作用域 |
| encapsulation 是什么 | register 创建独立作用域，插件内部不泄漏；fastify-plugin 穿透 |
| 为什么注册顺序重要 | 后注册的插件看不到先注册的私有装饰器 |
| schema 校验失败返回什么 | 统一 400 + errorHandler 定制结构 |
| response schema 有什么用 | 契约 + 序列化加速 |
| 未知错误怎么返回 | 记录日志 + 500，不泄露内部细节 |

## 9. 达标标准

**L2：**
- [ ] 画完整钩子顺序，讲每层职责
- [ ] 画 Express 洋葱模型，讲钩子 vs 中间件
- [ ] 讲 Fastify vs Express 选型 trade-off

**L3：**
- [ ] 写完整 schema（body/params/response）+ setErrorHandler 统一错误
- [ ] 写 fastify-plugin 穿透封装，讲 encapsulation 对路由组织的影响
- [ ] 给示例服务加一个路由插件（prefix + schema + 统一错误），对照生产级 routes/ 组织方式
