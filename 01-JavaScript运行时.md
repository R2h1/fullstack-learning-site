# 01 · JavaScript 运行时

> 达标目标：**L2（面试级）硬门槛，核心手写题全部能默写。**
> 一句话理由：JS 是前端一切的地基，也是面试手写题的主战场；AI 能写出能跑的代码，但"为什么这么跑"必须是你自己的理解。
> 学习方法：每节末尾「必会」为自测锚点；手写题必须**合上资料默写**，不是"看过就行"。

---

## 1. 执行上下文、作用域与闭包

### 1.1 执行上下文栈（ECS）

JS 代码运行在"执行上下文"里。三种：全局上下文、函数上下文、`eval` 上下文。调用函数 = 压栈，返回 = 弹栈。

```
全局上下文（栈底，常驻）
  └─ 函数 A 上下文
       └─ 函数 B 上下文（栈顶，当前执行）
```

每个上下文包含三件事：**变量环境（var 声明）、词法环境（let/const）、this 绑定**。

### 1.2 作用域链

词法作用域 = **代码写在哪**决定变量可见性（不是在哪调用）。查找沿"当前上下文 → 外层 → … → 全局"逐层找，找不到报 `ReferenceError`（读）或静默创建全局变量（非严格模式写）。

### 1.3 闭包：形成、内存、经典题

**定义**：函数 + 其声明时词法环境的引用。形成条件：内部函数引用外部变量，且该函数被外部持有（返回/挂载）。

**内存图景**：闭包引用的变量不会随外层函数返回被回收，而是"活"在堆上。误用 = 泄漏（例如把大数组放进闭包且永不释放）。

**经典题——循环 + 闭包**：

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 3 3 3：var 只有一个 i，三个闭包共享它，打印时 i 已是 3

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 0 1 2：let 每次迭代创建新绑定（for 循环体有独立的词法环境）
```

**var 时代的解法（面试可能追问）**：IIFE 传参，或利用函数参数按值传递：

```js
for (var i = 0; i < 3; i++) {
  ((n) => setTimeout(() => console.log(n), 0))(i) // 0 1 2
}
```

### 1.4 `this` 四规则 + 箭头函数（优先级从低到高）

1. **默认绑定**：`fn()` 裸调用 → 非严格 `window/globalThis`，严格模式 `undefined`
2. **隐式绑定**：`obj.fn()` → `obj`（注意：`const f = obj.fn; f()` 丢 this，回到默认绑定）
3. **显式绑定**：`call/apply/bind` → 指定对象；`bind` 返回新函数且 this 不可再改
4. **new 绑定**：`new F()` → 新对象（优先级最高）

**边界易错点**：

```js
const obj = {
  fn: function () { console.log(this) },
  arrow: () => console.log(this),
}
obj.fn()      // obj（隐式）
obj.arrow()   // window（箭头函数继承定义时的 this，与调用方式无关）
const f = obj.fn
f()           // window/undefined（隐式丢失）
```

- 箭头函数：无自己的 `this`/`arguments`/`super`，不能做构造函数
- 回调里用箭头函数保住外层 this，是 Vue/React 组件里最常见的 this 坑解法

### 1.5 提升与 TDZ

```js
console.log(a)  // undefined —— var 声明提升，赋值不提升
var a = 1
foo()           // "foo called" —— 函数声明整体提升，可直接调用
function foo() { console.log('foo called') }
console.log(b)  // ReferenceError —— let/const 存在 TDZ（暂时性死区）
let b = 2
```

TDZ 本质：`let/const` 声明在作用域开头到初始化完成之间，变量"存在但不可访问"。

### 1.6 深拷贝（L2 必写，含循环引用）

```js
function deepClone(target, map = new WeakMap()) {
  if (target === null || typeof target !== 'object') return target
  if (map.has(target)) return map.get(target)          // 循环引用兜底
  if (target instanceof Date) return new Date(target)
  if (target instanceof RegExp) return new RegExp(target.source, target.flags)
  const clone = Array.isArray(target) ? [] : {}
  map.set(target, clone)
  for (const key of Reflect.ownKeys(target)) {          // 含 Symbol 键
    clone[key] = deepClone(target[key], map)
  }
  return clone
}
```

`JSON.parse(JSON.stringify(x))` 为什么不够：丢 `undefined`/函数/Symbol、`Date`→字符串、循环引用直接抛错、`NaN/Infinity`→`null`。

**必会**：闭包形成条件与内存影响；this 四规则+优先级；讲透循环+闭包题；手写深拷贝（循环引用）。

---

## 2. 事件循环：浏览器与 Node 全图景

### 2.1 浏览器：一次 tick 的完整顺序

```
执行一个宏任务
  → 清空全部微任务（新产生的微任务也在这轮清完）
  → （有渲染需求时）执行 requestAnimationFrame 回调 → 渲染
  → 下一个宏任务
```

- **宏任务**：`setTimeout`、`setInterval`、`setImmediate`(Node)、I/O、UI 事件、`MessageChannel`
- **微任务**：`Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`、`process.nextTick`(Node)
- **渲染时机**：微任务清空后、下一宏任务前（所以"微任务里改 DOM"会合并成一次渲染；`setTimeout` 里改则可能多一次渲染）

**async/await 的微任务细节（易错）**：

```js
async function f() {
  console.log('A')
  await 1            // 即使 await 一个普通值，也会产生一次微任务
  console.log('B')
}
f()
console.log('C')
// A C B —— await 之后的部分被放到微任务里
```

**经典输出题（L2 必答）**：

```js
console.log('1')
setTimeout(() => console.log('2'), 0)
Promise.resolve().then(() => console.log('3'))
queueMicrotask(() => console.log('4'))
console.log('5')
// 1 5 3 4 2
```

**进阶变体**（面试分层用）：微任务里再产生微任务 → 本轮全部清完才轮到宏任务；`await` 嵌套 → 每个 await 都是新微任务。

### 2.2 Node：libuv 六阶段

```
timers（setTimeout/setInterval 到期的回调）
  → pending callbacks（上一轮遗留的 IO 回调）
  → idle/prepare（内部使用）
  → poll（等待新 IO；无任务时阻塞等待）
  → check（setImmediate）
  → close callbacks（socket 关闭等）
```

- `process.nextTick` **不属于任何阶段**，在每个阶段切换时"插队"执行（比微任务还优先）
- `setTimeout(0)` vs `setImmediate`：main 模块里顺序**不确定**（取决于进入 poll 的时机）；在 **IO 回调里 `setImmediate` 一定先执行**（因为 IO 回调在 poll 阶段，之后必走 check）

```js
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))
})
// 一定是：immediate → timeout
```

### 2.3 长任务与主线程

- 长任务（long task，>50ms）会阻塞渲染与交互 → 影响 INP
- 拆解手段：`requestIdleCallback`（空闲执行低优先级）、任务分片（`setTimeout`/`MessageChannel` 把大循环切块）、`Web Worker`（纯计算挪出主线程）

**必会**：画浏览器一 tick 顺序；答 `setTimeout(0)` vs `Promise.then`；Node 六阶段 + nextTick 插队；讲 `await 1` 也产生微任务。

---

## 3. Promise 与异步（手写题主战场）

### 3.1 Promise/A+ 完整实现（L2 硬门槛）

要点：状态机（pending→fulfilled/rejected 不可逆）、`then` 返回新 Promise、值穿透、**resolvePromise 过程**（处理返回 thenable/循环引用）。

```js
const PENDING = 'pending', FULFILLED = 'fulfilled', REJECTED = 'rejected'

class MyPromise {
  #state = PENDING
  #value = undefined
  #queue = []

  constructor(executor) {
    const resolve = (v) => this.#settle(FULFILLED, v)
    const reject = (r) => this.#settle(REJECTED, r)
    try { executor(resolve, reject) } catch (e) { reject(e) }
  }

  #settle(state, value) {
    if (this.#state !== PENDING) return
    this.#state = state
    this.#value = value
    this.#queue.forEach((fn) => fn())
    this.#queue = []
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const run = () => {
        const handler = this.#state === FULFILLED ? onFulfilled : onRejected
        const cb = typeof handler === 'function' ? handler : (v) => v // 值穿透
        let result
        try {
          result = cb(this.#value)
        } catch (e) {
          return reject(e)
        }
        this.#resolvePromise(result, resolve, reject)
      }
      this.#state === PENDING ? this.#queue.push(run) : run()
    })
  }

  // resolvePromise：若结果是 thenable，递归等待它；处理自引用死循环
  #resolvePromise(result, resolve, reject) {
    if (result === this) return reject(new TypeError('Chaining cycle'))
    if (result instanceof MyPromise) {
      result.then(resolve, reject)
      return
    }
    if (result && (typeof result === 'object' || typeof result === 'function')) {
      let called = false
      const then = result.then
      if (typeof then === 'function') {
        try {
          then.call(
            result,
            (y) => { if (!called) { called = true; this.#resolvePromise(y, resolve, reject) } },
            (r) => { if (!called) { called = true; reject(r) } }
          )
        } catch (e) {
          if (!called) { called = true; reject(e) }
        }
        return
      }
    }
    resolve(result)
  }

  catch(onRejected) { return this.then(undefined, onRejected) }

  finally(cb) {
    return this.then(
      (v) => MyPromise.resolve(cb()).then(() => v),
      (r) => MyPromise.resolve(cb()).then(() => { throw r })
    )
  }
}
```

### 3.2 四个静态方法（差异 = 高频考点）

| 方法 | 语义 | 失败行为 |
|---|---|---|
| `all` | 全部成功 → 结果数组 | **任一失败立即 reject**（短路） |
| `allSettled` | 全部 settle → 状态数组 | **永不 reject** |
| `race` | 第一个 settle 的结果 | 首个失败则 reject |
| `any` | 第一个 fulfilled | 全部失败才 reject（`AggregateError`） |

```js
MyPromise.all = (ps) => new MyPromise((resolve, reject) => {
  const out = new Array(ps.length)
  let left = ps.length
  if (!left) return resolve(out)
  ps.forEach((p, i) =>
    MyPromise.resolve(p).then(
      (v) => { out[i] = v; if (--left === 0) resolve(out) },
      reject
    )
  )
})
```

注意：`all` 的空数组立即 resolve 空数组；`race` 空数组永远 pending（挂起）。

### 3.3 并发控制（生产级必会）

**限流 N 个并发、全部完成再返回**：

```js
async function pLimit(tasks, limit) {
  const results = new Array(tasks.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (idx < tasks.length) {
      const cur = idx++
      results[cur] = await tasks[cur]()
    }
  })
  await Promise.all(workers)
  return results
}
```

**超时兜底**：`Promise.race([task, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])`。

### 3.4 async/await 与生成器

`async` = Promise 语法糖；`await` 暂停恢复。底层可视为 **generator + 自动执行器**：

```js
function run(gen) {
  const it = gen()
  function step(arg) {
    const { value, done } = it.next(arg)
    if (done) return Promise.resolve(value)
    return Promise.resolve(value).then(
      (v) => step(v),
      (e) => it.throw(e)
    )
  }
  return step()
}
// run(function* () { const a = yield fetch('/a'); return a })
```

**迭代器协议**（广度补充）：`Symbol.iterator` + `next()`；`for...of` 依赖它；手写一个可迭代对象是常见小面题。

**必会**：默写 Promise 核心（含 resolvePromise）；说清四静态方法差异；写并发限流；讲 async 与 generator 的关系。

---

## 4. 原型与继承

### 4.1 三角关系

```
F.prototype —— 原型对象
o.__proto__ —— 指向 F.prototype（o = new F()）
F.prototype.constructor —— 指向 F
```

### 4.2 原型链查找与 instanceof

属性查找沿 `__proto__` 向上；`Object.create(null)` 的对象没有原型链（无 `toString` 等）。

```js
function myInstanceof(obj, Ctor) {
  let proto = Object.getPrototypeOf(obj)
  while (proto) {
    if (proto === Ctor.prototype) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}
```

### 4.3 class 继承 = 寄生组合式继承

`class B extends A` 本质：`B.prototype = Object.create(A.prototype)`（继承方法，不调 A 构造）+ `B` 构造时 `super()` 调 `A` 初始化 this。规则：**子类构造里 `super()` 必须先于 `this`**（this 由父类创建）。

**手写 new（面试高频）**：

```js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype)
  const ret = Ctor.apply(obj, args)
  return (ret && typeof ret === 'object') ? ret : obj
}
```

**手写 call / apply / bind**：

```js
Function.prototype.myCall = function (ctx, ...args) {
  ctx = ctx ?? globalThis
  const key = Symbol('fn')
  ctx[key] = this
  const ret = ctx[key](...args)
  delete ctx[key]
  return ret
}

Function.prototype.myBind = function (ctx, ...bound) {
  const fn = this
  return function (...args) {
    return fn.myCall(ctx, ...bound, ...args)
  }
}
```

**必会**：画三角关系；手写 instanceof / new / call / bind；讲 class 继承与原型继承。

---

## 5. 内存、GC 与性能

### 5.1 V8 回收机制

- **新生代**（对象刚创建）：Scavenge 复制算法，空间换时间，对象多短命
- **晋升**：经历多次 GC 仍存活 → 移入老生代
- **老生代**：标记-清除（清理不可达）+ 标记-整理（去碎片）
- **可达性分析**：从 GC Roots（全局对象、执行栈、闭包引用）出发，不可达即回收。**引用计数**（Vue2 时代常被提及）无法处理循环引用，V8 不用它做主回收

### 5.2 内存泄漏四类（必背）

1. 意外全局变量（未声明赋值、`this` 指向 window 且未清理）
2. 未清理的定时器 / 事件监听 / 观察者 / WebSocket（组件销毁时 `clearInterval`、`removeEventListener`、`off`）
3. 闭包误用（长期持有大对象、DOM 引用）
4. 分离的 DOM（变量仍引用已移除的节点）

### 5.3 排查流程（L3）

DevTools Memory → 录制堆快照 → 重复"触发 → 释放"操作几次 → 比较快照找**只增不减**的对象 → 看 Retainers 保留路径 → 定位到代码行。

**WeakMap/WeakSet 的作用**（广度）：key 是弱引用，不影响 GC——适合缓存/私有字段，不会造成泄漏。

**必会**：说 3 种泄漏场景 + 排查工具流程；讲 WeakMap 为什么适合做缓存。

---

## 6. 高频手写题合集（全部要求闭卷默写）

| 题 | 关键点 |
|---|---|
| `debounce` | 每次调用重置定时器；支持 leading/trailing 选项（leading：立即执行一次） |
| `throttle` | 锁定时段，时段内只执行一次；支持 trailing |
| 深拷贝 | 递归 + WeakMap 防循环 + Date/RegExp 特判 + `Reflect.ownKeys` |
| `Promise.all` | 结果数组 + 计数；空数组立即 resolve；任一 reject 短路 |
| 并发限流 | 固定 worker 数，循环取任务（见 3.3） |
| `instanceof` | 沿 `__proto__` 比较 `Ctor.prototype` |
| `new` | `Object.create(Ctor.prototype)` + 调用 + 对象返回值处理 |
| `call/apply/bind` | Symbol 挂到 ctx 上调用；bind 柯里化参数 |
| `LRU` | `Map` 的迭代顺序特性，get 时删了重插保持"最近使用在尾" |
| 事件总线 | on/off/once/emit，once 包装后自动 off |

**LRU 实现**：

```js
class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map() }
  get(key) {
    if (!this.map.has(key)) return -1
    const v = this.map.get(key)
    this.map.delete(key)      // 先删再插 → 该 key 移到迭代尾部（最近使用）
    this.map.set(key, v)
    return v
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.cap) {
      this.map.delete(this.map.keys().next().value) // 淘汰最久未使用
    }
  }
}
```

**debounce / throttle（带选项）**：

```js
function debounce(fn, wait, immediate = false) {
  let timer = null
  return function (...args) {
    const callNow = immediate && !timer
    clearTimeout(timer)
    timer = setTimeout(() => { timer = null; if (!immediate) fn.apply(this, args) }, wait)
    if (callNow) fn.apply(this, args)
  }
}

function throttle(fn, wait) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= wait) { last = now; fn.apply(this, args) }
  }
}
```

---

## 7. 面试高频题速答

| 题 | 速答要点 |
|---|---|
| 事件循环输出题 | 同步 → 微任务 → 渲染机会 → 宏任务（1 5 3 4 2） |
| `setTimeout(0)` vs `Promise.then` | 宏任务 vs 微任务，微任务先 |
| `await 1` 会怎样 | 也会产生一次微任务，后续代码在微任务里执行 |
| 手写 Promise.all | 结果数组 + 计数；任一 reject 短路；空数组立即 resolve |
| 深拷贝为什么不用 JSON | 丢 undefined/函数/Symbol、Date 变字符串、循环引用报错 |
| 闭包的内存影响 | 被引用的变量不回收；误用即泄漏 |
| `let` 循环为什么是 0 1 2 | 每次迭代新绑定，闭包各自捕获 |
| Node `nextTick` 是什么 | 每个阶段切换时插队，优先级最高 |
| `Map` 为什么能做 LRU | 迭代顺序 = 插入顺序，get 时删了重插即"最近使用在尾" |

## 8. 达标标准

**L2：**
- [ ] 默写：Promise 核心（含 resolvePromise）、`Promise.all`、深拷贝、`debounce`/`throttle`、`LRU`
- [ ] 手写 `instanceof` / `new` / `call` / `bind`
- [ ] 画事件循环一 tick 顺序，答对经典输出题 + `await 1` 微任务细节
- [ ] 讲 Node 六阶段与 `nextTick` 插队，答 `setTimeout` vs `setImmediate`
- [ ] 说清闭包内存影响与 3 种泄漏场景

**L3：**
- [ ] 能写出带 leading/trailing 的 debounce/throttle 并解释选项语义
- [ ] 写出并发限流并说明"为什么固定 worker 数不会饿死任务"
- [ ] 用 DevTools 快照对比定位一次真实内存泄漏（保留路径 → 代码行）
