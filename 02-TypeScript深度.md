# 02 · TypeScript 深度

> 达标目标：**L2 硬门槛——工具类型能默写、类型体操能读懂+会写常见、讲清类型系统心智；L3——类型设计与运行时校验习惯。**
> 一句话理由：AI 生成的 TypeScript 里，类型漏洞（`any` 泛滥、断言滥用、边界没收窄）是最常见的一类坑——**审 AI 代码先审类型**。
> 本页按"类型系统心智 → 函数/类 → 类型编程 → 体操题解 → 工程配置 → 运行时校验"推进。

---

## 1. 类型系统的底层心智

### 1.1 结构化类型（structural typing）

TS 是**结构化类型**（鸭子类型）：只要形状兼容就能互相赋值，**不靠类型名**（与 Java 等名义类型不同）。

```ts
interface Point { x: number; y: number }
function f(p: Point) {}
f({ x: 1, y: 2 })        // OK
const obj = { x: 1, y: 2, z: 3 }
f(obj)                   // OK —— 多余属性 z 不影响（结构化类型）
f({ x: 1, y: 2, z: 3 })  // 报错 —— 对象字面量有"多余属性检查"（excess property check）
```

**关键差异**：**对象字面量**直接传入会做多余属性检查（抓拼写错误/多余字段）；**变量**赋值则只看"是否包含所需字段"（结构化兼容）。这是面试常考的"为什么这两个不一样"。

### 1.2 类型层级（assignability）

```
unknown（顶类型：任何类型可赋给它）
  └─ any（双向兼容的逃生舱，关闭检查）
      └─ string / number / boolean / object / ...
          └─ 联合类型（string | number）
              └─ 字面量类型（'dark'、42）
                  └─ never（底类型：可赋给一切，自身不可赋值给它）
```

- `unknown`：必须**收窄后才能用**（安全）；`any`：一切检查都放行（危险，生产禁止裸 any）
- `never`：不可达/永远不返回（如 `throw`、穷尽联合后的分支）——配合**穷尽性检查**（exhaustive check）是好模式
- `void`：函数"没有有意义的返回值"（可返回 undefined）；`undefined` 是一个具体值类型

### 1.3 宽化（widening）与收窄（narrowing）

**宽化**：`let` 推断会放宽为基类型，`const` 保留字面量；`as const` 强制保留。

```ts
let mode = 'dark'      // string（let 会宽化）
const mode2 = 'dark'   // 'dark'（字面量）
const cfg = { mode: 'dark' } as const  // { readonly mode: 'dark' }
```

**收窄**（narrowing）手段与适用场景：

| 手段 | 示例 |
|---|---|
| `typeof` | `typeof x === 'string'` |
| `instanceof` | `x instanceof Date` |
| `in` | `'key' in obj`（对象/数组判别） |
| `Array.isArray` | 数组判别 |
| 真值/判空 | `if (x !== null && x !== undefined)` |
| **判别联合** | `if (shape.kind === 'circle')`（最常用，见下） |
| 类型谓词 `is` | `function isUser(x: any): x is User` |

**判别联合（discriminated union）+ 控制流分析（CFA）**——L2 必会：

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number }

function area(s: Shape): number {
  switch (s.kind) {        // kind 是判别字段（字面量类型）
    case 'circle':   return Math.PI * s.radius ** 2   // 这里 s 已收窄为 circle
    case 'square':   return s.size ** 2
    case 'triangle': return (s.base * s.height) / 2
    default:
      const _exhaustive: never = s   // 穷尽性检查：少写分支会编译报错
      return _exhaustive
  }
}
```

**必会**：讲结构化类型 + 多余属性检查；画类型层级（unknown/any/never）；写判别联合 + 穷尽性检查。

## 2. 函数类型深度

### 2.1 重载（overloads）

重载 = "声明多个签名 + 一个实现"，实现签名要兼容所有重载：

```ts
function pad(n: number, width: number): string
function pad(s: string, width: number): string
function pad(v: string | number, width: number): string {
  const s = String(v)
  return s.padStart(width, '0')
}
```

> 面试追问点：重载的**调用顺序**——TS 按声明顺序匹配，宽泛签名放后面；重载做不了"参数个数不同"的默认值（那是可选参数的事）。

### 2.2 泛型函数：约束、默认值、rest、this

```ts
// 约束：T extends keyof U 常用
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key] }

// 泛型默认值
function createList<T = string>(): T[] { return [] }

// rest 参数推导成元组
function tuple<T extends unknown[]>(...args: T): T { return args }
const t = tuple(1, 'a', true)  // [number, string, boolean]
```

**泛型 vs 联合**（高频思想题）：联合 = "调用方自选其一，实现方处理所有"；泛型 = "调用方定类型，实现方保持同一类型"。能用泛型保留类型关系的地方别退回 `any`/联合。

### 2.3 回调类型与逆变（结合 strictFunctionTypes）

`strictFunctionTypes` 开启后，**函数类型参数按逆变**严格检查：

```ts
type OnCat = (c: { name: string; meow(): void }) => void
const handleAnimal: (a: { name: string }) => void = () => {}
const onCat: OnCat = handleAnimal   // OK：能处理所有 Animal 的回调必然能处理 Cat
```

直观记忆：**回调的入参类型写"宽"了才安全**（`(a: Animal)` 比 `(a: Cat)` 宽，可赋给窄的期望）。这是审 AI 代码时看"回调参数方向"的依据。

**必会**：写一个重载；讲泛型 vs 联合；一句话讲逆变并举例。

## 3. 对象、接口与类

### 3.1 interface vs type（何时用哪个）

| | interface | type |
|---|---|---|
| 对象形状 | ✅ 声明合并（同名合并） | ✅ 无合并 |
| 联合/交叉/映射类型 | ❌ | ✅ |
| 继承 | `extends` | 交叉 `&` |
| 三元/泛型表达式 | ❌ | ✅ |

**建议**：对象/类形状用 `interface`（或 `type` 都行，团队一致即可）；**联合、工具类型、映射类型只能用 `type`**。

### 3.2 索引签名与工具修饰

```ts
interface Dict { [key: string]: number }        // 索引签名
interface Cfg { color?: string; readonly id: number }  // 可选 / 只读
```

### 3.3 类

- `implements` 只是"形状检查"，不改变运行时；`private`（TS 编译期）vs `#field`（运行时真私有，ES2022）
- `abstract` 抽象类/方法；`protected` 仅子类可访问
- **`this` 类型**：方法返回 `this` 实现链式调用且类型正确

```ts
class Builder {
  private parts: string[] = []
  add(part: string): this { this.parts.push(part); return this }
  build(): string { return this.parts.join('+') }
}
```

**必会**：答 interface vs type 取舍；讲 `private` vs `#` 的区别。

## 4. 条件类型与类型编程

### 4.1 分配律与关闭分配

```ts
type IsString<T> = T extends string ? true : false
type A = IsString<string | number>   // boolean = true | false（逐成员求值，分配律）
type NoDist<T> = [T] extends [string] ? true : false
type B = NoDist<string | number>     // false（用元组包住，关闭分配）
```

### 4.2 infer 的多位置

```ts
type Elem<T> = T extends (infer E)[] ? E : never          // 数组元素
type Args<F> = F extends (...a: infer A) => any ? A : never  // 参数元组
type R<F> = F extends (...a: any) => infer R ? R : never     // 返回值
type P<T> = T extends Promise<infer V> ? V : never           // Promise 值
type First<S extends string> = S extends `${infer H}${string}` ? H : never  // 模板串首个字符
```

### 4.3 递归条件类型

TS 4.1 支持递归，4.5 起对"尾递归"条件类型做优化（深类型不再爆栈）：

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T
type Join<S extends string[]> = S extends [infer H, ...infer T]
  ? H extends string ? (T extends string[] ? `${H}${Join<T>}` : H) : ''
  : ''
```

### 4.4 模板字面量与字符串工具

内置字符串工具：`Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize`。经典应用：给事件/键加前缀、路由拼接、CSS 变量名。

```ts
type CssVar<K extends string> = `--${K}`                 // '--primary'
type Handler<K extends string> = `on${Capitalize<K>}`    // 'onClick'
type KeysWithId<T> = { [K in keyof T as `${K & string}Id`]: T[K] }
```

**必会**：默写 MyPartial/MyPick/MyOmit + `Awaited`；讲分配律 + 关闭分配；写 infer 多位置示例。

## 5. 类型体操题解（每题：思路 + 答案）

| 题 | 思路 | 实现 |
|---|---|---|
| `DeepReadonly<T>` | 映射类型 + 递归；键加 `readonly` | 见 4.3 |
| `KebabCase<'FooBar'>` | 模板字面量拆首个字符；遇大写转 `-小写` | 见下 |
| `UnionToIntersection<U>` | 函数参数逆变 + infer 反推 | 见下 |
| `DeepPick<T, K>` | 拆分路径 + 递归映射 | 见下 |
| `TupleToObject<T>` | 映射元组为对象 | 见下 |
| `LengthOfString<S>` | 递归 + 元组 | 见下 |
| `Split<S, D>` | 模板字面量递归切分 | 见下 |

```ts
// KebabCase：'FooBar' → 'foo-bar'
type KebabCase<S extends string> =
  S extends `${infer C}${infer Rest}`
    ? Rest extends Uncapitalize<Rest>
      ? `${Uncapitalize<C>}${KebabCase<Rest>}`
      : `${Uncapitalize<C>}-${KebabCase<Rest>}`
    : S

// UnionToIntersection：U 联合 → (k:U)=>void 联合 → 逆变求交
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// TupleToObject：['a','b'] → { a:'a'; b:'b' }
type TupleToObject<T extends readonly string[]> =
  { [K in T[number]]: K }

// LengthOfString：递归累加元组长度
type LengthOfString<S extends string, A extends string[] = []> =
  S extends `${string}${infer Rest}`
    ? LengthOfString<Rest, [...A, string]>
    : A['length']

// DeepPick：'a.b.c' 路径取值
type DeepPick<T, K extends string> =
  K extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T ? { [P in Head]: DeepPick<T[Head], Tail> } : never
    : K extends keyof T ? { [P in K]: T[P] } : never
```

> 面试不会要求默写全部，但要**能读懂 + 能写 DeepReadonly/KebabCase/UnionToIntersection**，其余见思路即可。

**必会**：闭卷默写 DeepReadonly / KebabCase / UnionToIntersection 三连。

## 6. 模块、声明与工程配置（L3）

### 6.1 声明文件

- 三方库没类型时：`@types/xxx`（DefinitelyTyped）；再不行自己 `declare module 'xxx'`（**先声明再检查，别为了编译过写 `any`**）
- `.d.ts` 只含类型，不产出运行时；`declare` 描述已有运行时全局（`declare global`）

### 6.2 tsconfig 生产配置逐项（对照生产级 web 与 server 包）

| 选项 | 作用 | 为什么生产要开 |
|---|---|---|
| `strict` | 总开关（含 strictNullChecks 等） | 关闭 = 一堆隐藏 null/undefined bug |
| `noUncheckedIndexedAccess` | 数组/索引访问可能是 `undefined` | 抓 `arr[0].x` 空指针（AI 代码最爱漏） |
| `exactOptionalPropertyTypes` | 可选属性不能再赋 `undefined` | 收紧"没传 vs 传 undefined" |
| `verbatimModuleSyntax` | 强制 `import type` | 保证 ESM 语义正确、利于摇树 |
| `moduleResolution: "bundler"` | 对齐 Vite 的解析 | 别名/extension 不写也能解析 |

> 审 AI 生成的 `tsconfig` 时，第一看 `strict` 是否被偷偷关掉——这是最常见的手脚。

**必会**：逐项解释 strict 系列开关（strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes/verbatimModuleSyntax）。

## 7. 运行时校验与 zod（L3 核心习惯）

**核心认知**：编译期类型 ≠ 运行时安全。**类型在运行时被擦除**——接口数据、用户输入、localStorage、`JSON.parse`、AI 生成的代码，边界数据一律不可信。

**zod 范式**（一个 schema = 类型 + 校验，单一来源）：

```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  role: z.enum(['user', 'super_admin']).default('user'),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
})
type User = z.infer<typeof UserSchema>

const r = UserSchema.safeParse(raw)      // 失败不抛异常，返回 discriminated union
if (!r.success) {
  // r.error.flatten() 拿字段级错误；记录 + 降级，绝不带病继续
} else {
  // r.data 已被收窄为 User
}
```

**生产注意**：
- `safeParse` 优于 `parse`（后者抛异常，错误上下文丢失）
- 大 schema 的 `parse` 有性能开销——热点路径缓存 schema 或抽样校验
- 与 API 层结合：**在服务入口校验一次**，别散落到处校验
- 给 AI 生成的接口模型配 zod，是 L3 的默认动作

**必会**：写 zod `safeParse` 失败处理；背审 AI 代码 5 条类型检查清单。

## 8. 面试高频题速答

| 题 | 速答要点 |
|---|---|
| `any` / `unknown` / `never` 区别 | 逃生舱 / 需收窄的顶类型 / 不可达底类型 |
| 为什么函数参数传对象字面量会"多余属性"报错 | 字面量做 excess property check；变量走结构化兼容 |
| `interface` vs `type` | 合并 vs 联合/映射；对象用 interface，联合必用 type |
| 判别联合怎么收窄 | 公共字面量判别字段 + switch + 穷尽性 `never` |
| 分配律是什么 | 裸类型参数的条件类型对联合逐成员求值；元组包裹关闭 |
| 协变/逆变一句话 | 返回值协变、参数逆变（strictFunctionTypes） |
| 为什么 `as const` 有用 | 保留字面量 + readonly，推导更精确 |
| 类型能被当运行时校验吗 | 不能——类型被擦除，边界数据必须运行时校验（zod） |
| 手写工具类型 | Partial/Pick/Omit/ReturnType/Awaited/DeepReadonly/KebabCase/UnionToIntersection |

## 9. 达标标准

**L2：**
- [ ] 默写 5 个工具类型 + `Awaited`；讲清 `infer` 与分配律
- [ ] 能写 DeepReadonly / KebabCase / UnionToIntersection（读 + 手写）
- [ ] 讲清判别联合收窄 + 穷尽性检查
- [ ] 讲协变/逆变与 `strictFunctionTypes` 的影响

**L3：**
- [ ] 审一个 AI 生成的接口数据类型，指出 `any`/断言/`noUncheckedIndexedAccess` 类问题并修复
- [ ] 给真实接口配 zod（类型 + 运行时校验），写清 `safeParse` 失败处理
- [ ] 能逐项解释生产 tsconfig 的 strict 系列开关为什么开
