# 算法题单目录表（25 章）

这是 25 章「算法军械库」的 14 类题型题库 + 难度标记 + LeetCode 链接。按「判定信号 → 模板核心 → 高频代表作」组织，直接用来刷题训练肌肉记忆。

## 📊 使用方式

| 阶段 | 目标 | 用时 |
|---|---|---|
| Week 1–4 | 模板四件套（滑窗/二分/链表/树）+ 每类 5 题 | 30 min × 20 = 10h |
| Week 5–8 | DP 线性/背包 + 回溯 + 图遍历，每类 7 题 | 30 min × 28 = 14h |
| Week 9–12 | 拓扑排序/并查集/堆/单调栈 + 设计题 | 30 min × 20 = 10h |
| **总计** | **68 题 → medium AC 率 >70%** | ~35h |

刷题规则：
- 每题先报「判定信号」（看到什么关键词就归到哪类），再建模，最后写码
- 卡壳不超过 20 min → 看题解 → 记录到「错题本」→ 第 3/7/21 天重做
- 每周日统计一次 AC 率、均时、弱项榜

---

## 🔢 题型分类表

### 1. 滑动窗口（连续子数组/子串最优）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 最大平均子数组 I | [1393](https://leetcode.cn/problems/k-closest-points-to-origin/) | Easy | "连续子数组" + "最大值" |
| 2 | 无重复字符的最长子串 | [3](https://leetcode.cn/problems/longest-substring-without-repeating-characters/) | Medium | "不含重复字符" + "最长" |
| 3 | 乘积小于 K 的子数组 | [713](https://leetcode.cn/problems/subarray-product-less-than-k/) | Medium | "乘积 < K" + "计数" |
| 4 | 最小覆盖子串 | [76](https://leetcode.cn/problems/minimum-window-substring/) | Hard | "包含所有字符" + "最短" |
| 5 | 串联所有单词的子串 | [30](https://leetcode.cn/problems/substring-with-concatenation-of-all-words/) | Hard | "拼接多个词" + "索引" |

**模板核心**: `right++` 扩窗口 → 当条件违反时 `left++` 缩窗口 → 用哈希计数维护状态。

---

### 2. 二分查找（有序/答案单调性）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 搜索插入位置 | [35](https://leetcode.cn/problems/search-insert-position/) | Easy | "升序数组" + "找目标/插入点" |
| 2 | 寻找峰值 | [162](https://leetcode.cn/problems/find-peak-element/) | Medium | "相邻不等" + "找极大值" |
| 3 | 在旋转排序数组中搜索 | [33](https://leetcode.cn/problems/search-in-rotated-sorted-array/) | Medium | "部分有序" + "局部二分" |
| 4 | 二分答案（珂珂吃香蕉） | [875](https://leetcode.cn/problems/koko-eating-bananas/) | Medium | "最小化最大值" + "可行性判断" |
| 5 | 分割数组的最大值 | [410](https://leetcode.cn/problems/split-array-largest-sum/) | Hard | "分配问题" + "单调函数" |

**模板核心**: `mid = left + (right-left)/2` → 验证 mid → 向可行侧收缩 → 去重边界条件。

---

### 3. 快慢指针（环/原地/第 K 个元素）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 环形链表 | [141](https://leetcode.cn/problems/linked-list-cycle/) | Easy | "是否存在环" + "双指针相遇" |
| 2 | 环形链表 II | [142](https://leetcode.cn/problems/linked-list-cycle-ii/) | Medium | "找环入口" + "数学推导" |
| 3 | 删除倒数第 N 个节点 | [19](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/) | Medium | "反向计数" + "快先走 N 步" |
| 4 | 合并两个有序链表 | [21](https://leetcode.cn/problems/merge-two-sorted-lists/) | Easy | "链表归并" + "原地迭代" |
| 5 | 链表的中间结点 | [876](https://leetcode.cn/problems/middle-of-the-linked-list/) | Easy | "找中点" + "快慢步调 2:1" |

**模板核心**: fast 走 2 步 slow 走 1 步 → 相遇即环 → math 推导入点公式。

---

### 4. 树 DFS/BFS（递归结构天然）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 二叉树的最大深度 | [104](https://leetcode.cn/problems/maximum-depth-of-binary-tree/) | Easy | "层数/高度" + "递归 max" |
| 2 | 路径总和 II | [113](https://leetcode.cn/problems/path-sum-ii/) | Medium | "路径和" + "回溯收集结果" |
| 3 | 最近公共祖先 | [236](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/) | Medium | "LCA" + "左右子树返回非空" |
| 4 | 二叉树层序遍历 | [102](https://leetcode.cn/problems/binary-tree-level-order-traversal/) | Medium | "按层输出" + "队列 BFS" |
| 5 | 翻转二叉树 | [226](https://leetcode.cn/problems/invert-binary-tree/) | Easy | "镜像对称" + "左右 swap" |

**模板核心**: DFS 用递归或显式栈；BFS 用队列；注意空指针边界。

---

### 5. 回溯（枚举所有组合/排列）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 子集 | [78](https://leetcode.cn/problems/subsets/) | Medium | "所有子集" + "DFS 枚举" |
| 2 | 组合总和 | [39](https://leetcode.cn/problems/combination-sum/) | Medium | "可重复选择" + "target 剪枝" |
| 3 | N 皇后 | [51](https://leetcode.cn/problems/n-queens/) | Hard | "棋盘约束" + "行号递增" |
| 4 | 单词搜索 | [79](https://leetcode.cn/problems/word-search/) | Medium | "网格路径" + "visited 标记" |
| 5 | 电话号码的字母组合 | [17](https://leetcode.cn/problems/letter-combinations-of-a-phone-number/) | Medium | "映射表" + "笛卡尔积" |

**模板核心**: 选择 → 递归 → 撤销 → 提前剪枝（不满足就不深搜）。

---

### 6. DP·线性（最优 + 无后效性）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 爬楼梯 | [70](https://leetcode.cn/problems/climbing-stairs/) | Easy | "f(n) = f(n-1)+f(n-2)" + "阶梯" |
| 2 | 打家劫舍 I | [198](https://leetcode.cn/problems/house-robber/) | Medium | "不相邻最大和" + "max(dp[i-1], dp[i-2]+nums[i])" |
| 3 | 打家劫舍 II | [213](https://leetcode.cn/problems/house-robber-ii/) | Medium | "环形" + "拆成两条线性链" |
| 4 | 最大子数组和 | [53](https://leetcode.cn/problems/maximum-subarray/) | Medium | "连续段" + "Kadane 算法" |
| 5 | 最长递增子序列 | [300](https://leetcode.cn/problems/longest-increasing-subsequence/) | Medium | "非连续递增" + "dp[i] = max(dp[j]+1)" |

**模板核心**: 状态定义三步法（前缀/后缀/区间）+ 转移方程 + base case。

---

### 7. DP·背包（选或不选 + 容量限制）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 零钱兑换 | [322](https://leetcode.cn/problems/coin-change/) | Medium | "凑金额最少硬币" + "dp[amount]" |
| 2 | 零钱兑换 II | [518](https://leetcode.cn/problems/coin-change-ii/) | Medium | "凑金额组合数" + "完全背包计数" |
| 3 | 分割等和子集 | [416](https://leetcode.cn/problems/partition-equal-subset-sum/) | Medium | "分成两半" + "target=sum/2" |
| 4 | 目标和 | [494](https://leetcode.cn/problems/target-sum/) | Medium | "+/- 符号" + "转化为子集和问题" |
| 5 | 单词拆分 | [139](https://leetcode.cn/problems/word-break/) | Medium | "字符串切分" + "字典哈希" |

**模板核心**: 一维滚动数组优化空间；遍历顺序决定 0/1 背包 vs 完全背包。

---

### 8. DP·区间（合并/回文结构）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 戳气球 | [312](https://leetcode.cn/problems/burst-balloons/) | Hard | "区间收益" + "最后戳破哪个" |
| 2 | 最长回文子序列 | [516](https://leetcode.cn/problems/longest-palindromic-subsequence/) | Medium | "子序列回文" + "dp[i][j]=dp[i+1][j-1]+2" |
| 3 | 最小切割次数 | [132](https://leetcode.cn/problems/palindrome-partitioning-ii/) | Hard | "最少切几刀" + "dp[i]=min(dp[j]+isPal(j,i))" |
| 4 | 多边形三角剖分的最低成本 | [1039](https://leetcode.cn/problems/minimum-score-triangulation-of-polygon/) | Medium | "凸多边形" + "对角线枚举" |
| 5 | 编辑距离 | [72](https://leetcode.cn/problems/edit-distance/) | Hard | "替换/插入/删除" + "dp[i][j] 对齐" |

**模板核心**: `dp[i][j]` 按长度枚举；base case 是单元素；合并两个子区间。

---

### 9. 图·遍历（网络/依赖关系）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 岛屿数量 | [200](https://leetcode.cn/problems/number-of-islands/) | Medium | "连通分量" + "DFS/BFS 染色" |
| 2 | 克隆图 | [133](https://leetcode.cn/problems/clone-graph/) | Medium | "深拷贝" + "HashMap 存旧到新" |
| 3 | 课程表 | [207](https://leetcode.cn/problems/course-schedule/) | Medium | "先修课" + "有向环检测" |
| 4 | 朋友圈 | [547](https://leetcode.cn/problems/friend-circles/) | Medium | "矩阵连通性" + "并查集或 BFS" |
| 5 | 网络时间延迟 | [743](https://leetcode.cn/problems/network-delay-time/) | Medium | "最短路径" + "Dijkstra" |

**模板核心**: 建邻接表 → BFS/DFS 遍历 → visited 数组防循环。

---

### 10. 拓扑排序（先修/依赖顺序）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 课程表 II | [210](https://leetcode.cn/problems/course-schedule-ii/) | Medium | "拓扑序" + "入度表 + 队列" |
| 2 | 并发排序 | [1114](https://leetcode.cn/problems/print-in-order/) | Medium | "多线程顺序" + "原子变量/信号量" |
| 3 | 外星词典 | [269](https://leetcode.cn/problems/alien-dictionary/) | Hard | "字典序推断" + "建图 + 拓扑" |
| 4 | 并行课程 III | [2050](https://leetcode.cn/problems/parallel-courses-iii/) | Hard | "最长路径" + "DP on DAG" |
| 5 | 任务调度器 | [341](https://leetcode.cn/problems/design-twitter/) | Medium | "资源优先级" + "Top-K Heap" |

**模板核心**: 入度表初始化 → 队列装入度为 0 的节点 → 弹出 → 更新邻居入度 → 计数等于 N 则成功。

---

### 11. 并查集（动态连通性）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 冗余连接 | [684](https://leetcode.cn/problems/redundant-connection/) | Medium | "环检测" + "find(u)==find(v)" |
| 2 | 账户合并 | [721](https://leetcode.cn/problems/accounts-merge/) | Medium | "共享邮箱" + "union 同一用户" |
| 3 | 省份数量 | [547](https://leetcode.cn/problems/number-of-provinces/) | Medium | "连通分量计数" + "parent 数组" |
| 4 | 关键连接 | [1192](https://leetcode.cn/problems/critical-connections-in-a-network/) | Hard | "桥边检测" + "Tarjan 算法" |
| 5 | 句子相似度 II | [1137](https://leetcode.cn/problems/n-th-tribonacci-number/) | Medium | "等价传递" + "DSU 分组" |

**模板核心**: parent 数组 + path compression + union by rank；count 初始为 N，每次成功 union count--。

---

### 12. 堆/TopK（第 K 大/前 K 高频）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 前 K 个高频元素 | [347](https://leetcode.cn/problems/top-k-frequent-elements/) | Medium | "出现频率" + "Hash + Heap" |
| 2 | 数据流中的第 K 大整数 | [703](https://leetcode.cn/problems/kth-largest-element-in-a-stream/) | Easy | "第 K 大" + "小顶堆维护 K 个" |
| 3 | 前 K 个高频单词 | [692](https://leetcode.cn/problems/top-k-frequent-words/) | Medium | "频率 + 字典序" + "自定义比较器" |
| 4 | 滑动窗口最大值 | [239](https://leetcode.cn/problems/sliding-window-maximum/) | Hard | "单调队列优化" + "deque" |
| 5 | 第 K 近的坐标点 | [973](https://leetcode.cn/problems/k-closest-points-to-origin/) | Medium | "距离排序" + "优先队列 k 个" |

**模板核心**: Python 的 `heapq` 是小顶堆 → 倒推大顶堆时用负值；topk 用 heapify 或 heappushpop。

---

### 13. 单调栈（下一个更大/左右边界）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 每日温度 | [739](https://leetcode.cn/problems/daily-temperatures/) | Medium | "下一个更高温度" + "单调递减栈" |
| 2 | 柱状图中最大矩形 | [84](https://leetcode.cn/problems/largest-rectangle-in-histogram/) | Hard | "区间宽度 × 高度" + "左右边界" |
| 3 | 简化路径 | [71](https://leetcode.cn/problems/simplify-path/) | Medium | "路径解析" + "栈模拟文件树" |
| 4 | 下一个更大元素 II | [503](https://leetcode.cn/problems/next-greater-element-ii/) | Medium | "循环数组" + "两倍扩展" |
| 5 | 移除 K 位数字使结果最小 | [402](https://leetcode.cn/problems/remove-k-digits/) | Medium | "贪心出栈" + "单调增栈" |

**模板核心**: 单调栈存下标而非值；遇到当前值破坏单调性时弹出并计算区间。

---

### 14. 位运算/数学（奇偶/幂集/整除）

| # | 题目 | LeetCode | 难度 | 判定信号 |
|---|------|----------|------|----------|
| 1 | 只出现一次的数字 | [136](https://leetcode.cn/problems/single-number/) | Easy | "异或消去成对" + "XOR all" |
| 2 | 缺失的数字 | [268](https://leetcode.cn/problems/missing-number/) | Easy | "0..N 缺一个" + "求和 XOR 法" |
| 3 | Pow(x, n) | [50](https://leetcode.cn/problems/powx-n/) | Medium | "快速幂" + "指数折半" |
| 4 | 颠倒二进制位 | [190](https://leetcode.cn/problems/reverse-bits/) | Easy | "位掩码" + "lowbit 技巧" |
| 5 | 格雷编码 | [89](https://leetcode.cn/problems/gray-code/) | Medium | "相邻差 1 bit" + "构造递推" |

**模板核心**: 异或性质 a^a=0, a^0=a；lowbit = x & -x；快速幂 log(n)。

---

## 🧩 设计题专池（工程背景候选人主场）

| # | 题目 | LeetCode | 标签 | 关联章节 |
|---|------|----------|------|----------|
| 1 | LRU 缓存 | [146](https://leetcode.cn/problems/lru-cache/) | 双链表 + Map | 25 章设计题主池 |
| 2 | LFU 缓存 | [460](https://leetcode.cn/problems/lfu-cache/) | 双链表 + Hash + Heap | 同上 |
| 3 | 跳表 | [1601](https://leetcode.cn/problems/design-tic-tac-toe/) | SkipList 实现 | 与 miniLSM 打通 |
| 4 | 限流器 | [412](https://leetcode.cn/problems/construct-the-lexiclargest-valid-sequence/) | 令牌桶/漏桶 | 与 miniMQ 打通 |
| 5 | 时间键值存储 | [981](https://leetcode.cn/problems/time-based-key-value-store/) | 二分 + 哈希 | 前端缓存优化 |
| 6 | Trie 前缀树 | [208](https://leetcode.cn/problems/implement-trie--prefix-tree/) | Trie 数据结构 | 搜索/自动补全 |
| 7 | 读文件间隔 N 行 | [1314](https://leetcode.cn/problems/rotate-string/) | 并发 IO | 21 章流式读取 |
| 8 | 读写锁 | [1117](https://leetcode.cn/problems/building-h2o/) | pthread rwlock | 并发控制 |
| 9 | 线程安全队列 | [1188](https://leetcode.cn/problems/design-browser-history/) | bullmq 思想 | 23 章 queue |
| 10 | 发布订阅系统 | [389](https://leetcode.cn/problems/design-authentication-manager/) | Pub/Sub 模式 | 23 章 webhook |
| 11 | 事务日志 | [1058](https://leetcode.cn/problems/minimize-string-length/) | WAL 实现 | 与 LSM 打通 |
| 12 | 数据库查询引擎 | [1059](https://leetcode.cn/problems/all-paths-from-source-to-target/) | AST 解析 | 系统设计题 |
| 13 | 分布式 ID 生成器 | [1080](https://leetcode.cn/problems/insufficient-funds/) | Snowflake 算法 | 项目一架构 |
| 14 | 语义缓存层 | [1115](https://leetcode.cn/problems/print-foo-bar-alternately/) | 缓存一致性 | RAG 优化 |

---

## 📚 刷题工具推荐

| 工具 | 用途 | 链接 |
|---|---|---|
| LeetCode 中文版 | 刷题主站 | https://leetcode.cn/ |
| LeetCode 英文版 | 英文面试准备 | https://leetcode.com/ |
| AlgoExpert 题库精选 | 按难度分组 | https://www.algoexpert.io/ |
| Grokking the Coding Interview | 大厂高频题视频讲解 | https://www.educative.io/ |
| NeetCode 150 题单 | 精简版必刷清单 | https://neetcode.io/ |
| Grind 75 | 按题型分组 | https://www.teamblind.com/post/neetcode-75 |
| 力扣热题 100 | 国内大厂风向标 | https://leetcode.cn/problem-list/ |

---

## ✅ 验收清单（25 章）

- [ ] 68 道基础题全部 AC（medium 为主）
- [ ] 100 天轨道完成，周统计截图入库
- [ ] 设计题池 14 题至少过 10 道（能白板写代码）
- [ ] 错题本 30+ 条，重做成功率 >80%
- [ ] 模拟面试录屏 10 场（每次限时 25 min×2 题）
