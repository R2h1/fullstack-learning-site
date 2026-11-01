# mini-vLLM 代码骨架

这个仓库是 21 章「AI 模型层与推理优化」的 D4 验收物之一，目标是实现一个最小化的 vLLM 调度器原型：
- **核心目标**：continuous batching（请求动态进出 batch）+ KV Cache 分页分配
- **范围控制**：单 GPU + 单个 HuggingFace 小模型（如 `TinyLlama/TinyLlama-1.1B-Chat-v1.0`），不做量化、多卡并行
- **验收标准**：正确性测试通过（相同输入不同到达时序输出一致）、显存泄漏检测、吞吐压测报告

---

## 目录结构

```
mini-vllm/
├─ src/
│  ├─ scheduler.py        # continuous batching 调度器
│  ├─ kv_cache.py         # KV Cache 分页管理
│  ├─ model_wrapper.py    # HF 模型适配层
│  └─ engine.py           # 推理服务入口
├─ tests/
│  ├─ test_scheduler.py   # 调度器正确性测试
│  ├─ test_kv_cache.py    # KV Cache 分配/释放测试
│  └─ perf_test.py        # 吞吐对比脚本
├─ benchmarks/             # 压测结果存档
│  └─ throughput_report.md
└─ README.md               # 设计取舍文档
```

---

## 核心伪代码

### 1. Continuous Batching Scheduler（调度器）

**关键思想**：传统静态 batch 会等所有请求生成完才释放 slot；continuous batching 在解码过程中实时释放已结束的请求，并用新请求填充 slot。

```python
class Request:
    """代表一次推理请求"""
    def __init__(self, request_id: int, prompt_tokens: list, max_new_tokens: int):
        self.id = request_id
        self.prompt_tokens = prompt_tokens      # 输入 token ids
        self.max_new_tokens = max_new_tokens
        self.output_tokens = []                 # 累计生成的输出 token ids
        self.is_finished = False                # 是否结束
        self.block_ids = None                   # 分配的 KV block ids (由分页管理器分配)

class Scheduler:
    def __init__(self, num_gpu_blocks: int):
        self.running_requests: list[Request] = []
        self.waiting_queue: list[Request] = []
        self.kv_allocator = KVAllocator(num_gpu_blocks)
        
    def add_request(self, request: Request):
        """新请求进入等待队列"""
        self.waiting_queue.append(request)
    
    def step(self, model: torch.nn.Module, max_batch_size: int = 32):
        """调度一步：分配 slots + 执行前向传播"""
        # Step 1: 释放已完成的请求（回收 KV blocks）
        finished = [r for r in self.running_requests if r.is_finished]
        for r in finished:
            self.kv_allocator.free(r.block_ids)
        self.running_requests = [r for r in self.running_requests if not r.is_finished]
        
        # Step 2: 从等待队列挑选新请求填槽（按优先级：FIFO）
        to_run = min(len(self.waiting_queue), max_batch_size - len(self.running_requests))
        candidates = self.waiting_queue[:to_run]
        self.waiting_queue = self.waiting_queue[to_run:]
        
        for req in candidates:
            req.block_ids = self.kv_allocate(req.max_num_tokens)  # 预分配 KV blocks
            req.output_tokens = []
            self.running_requests.append(req)
        
        if not self.running_requests:
            return []
        
        # Step 3: concat 所有 running requests 的最后一个 token，批量推理
        input_ids = torch.tensor([r.output_tokens[-1] for r in self.running_requests])
        with torch.inference_mode():
            logits, kv_cache = model(input_ids, past_key_values=rkv_cache)
        
        # Step 4: 采样下一个 token，更新每个请求状态
        results = []
        for i, r in enumerate(self.running_requests):
            next_token = sample(logits[i], temperature=0.8)
            r.output_tokens.append(next_token)
            
            # 检查结束条件：生成 eos 或达到 max_new_tokens
            if next_token == EOS_TOKEN or len(r.output_tokens) >= r.max_new_tokens:
                r.is_finished = True
            results.append((r.id, r.output_tokens.copy()))
        
        return results

```

### 2. KV Cache 分页管理（PagedAttention）

**关键思想**：KV Cache 的显存占用随并发×上下文长度线性增长，会导致碎片化浪费；PagedAttention 把 KV Cache 切成分页块（block），按需分配，类似操作系统的虚拟内存。

```python
import numpy as np

class BlockTable:
    """一个请求对应的 KV block 链表"""
    def __init__(self):
        self.blocks: list[int] = []
        
class KVAllocator:
    def __init__(self, num_physical_blocks: int):
        self.num_physical_blocks = num_physical_blocks
        self.physical_blocks = set(range(num_physical_blocks))  # 空闲池
        self.request_blocks: dict[int, BlockTable] = {}        # 已分配映射
        
    def allocate(self, request_id: int, num_required_blocks: int) -> BlockTable:
        """为请求分配 KV blocks（连续或不连续均可）"""
        available = sorted(list(self.physical_blocks))
        if len(available) < num_required_blocks:
            raise RuntimeError("Out of memory")
        
        allocated = available[:num_required_blocks]
        self.physical_blocks -= set(allocated)
        
        table = BlockTable()
        table.blocks = allocated
        self.request_blocks[request_id] = table
        
        return table
    
    def free(self, request_id: int):
        """释放请求占用的所有 blocks"""
        table = self.request_blocks.pop(request_id)
        self.physical_blocks.update(table.blocks)
    
    def get_block_address(self, request_id: int, block_idx: int):
        """根据 logical block idx 返回物理块地址"""
        return self.request_blocks[request_id].blocks[block_idx]
```

---

## 正确性测试要点

### 测试 1：调度一致性（相同输入不同时序 → 相同输出）
```python
def test_determinism_same_output_different_arrival_order():
    scheduler = Scheduler(num_gpu_blocks=1000)
    model = MockModel()
    
    # Case A: 同时到达
    req1 = Request(1, [1,2,3], max_new_tokens=5)
    req2 = Request(2, [4,5,6], max_new_tokens=5)
    scheduler.add_request(req1); scheduler.add_request(req2)
    
    outputs_A = []
    while any(not r.is_finished for r in scheduler.running_requests):
        outputs_A.extend(scheduler.step(model))
    
    # Case B: 先后到达
    scheduler_b = Scheduler(num_gpu_blocks=1000)
    scheduler_b.add_request(req1)
    outputs_step1 = scheduler_b.step(model)
    scheduler_b.add_request(req2)
    outputs_B = outputs_step1 + [x for x in outputs_step2 if not r.is_finished for r in scheduler_b.running_requests]
    
    # 验证：两种时序的输出序列应该完全一致（允许随机采样的微小差异，用种子固定）
    assert compare_outputs(outputs_A, outputs_B), "调度器确定性失效"
```

### 测试 2：无显存泄漏（跑 10k 请求后显存平稳）
```python
def test_no_memory_leak_over_long_run():
    allocator = KVAllocator(num_physical_blocks=1000)
    for i in range(10000):
        req = Request(i, [1]*10, max_new_tokens=20)
        table = allocator.allocate(i, num_required_blocks=2)
        # ...模拟完成...
        allocator.free(i)
    
    assert len(allocator.physical_blocks) == 1000, "Block 未全部回收"
    assert len(allocator.request_blocks) == 0, "Request 表非空"
```

### 测试 3：压力测试（吞吐对比）
- 对比方案：本调度器 vs 静态 batch（只算同一批内的吞吐）
- 指标：tokens/s、TTFT、TPOT、P99 延迟
- 方法：k6 或 vegeta 发不同并发流量（8/16/32/64）

---

## 实现步骤建议

| 阶段 | 周次 | 任务 | 里程碑 |
|---|---|---|---|
| Phase 1 | Week 1-2 | 用 PyTorch 写一个最简化 decoder-only Transformer，能跑 inference | model 可加载 HF 权重、可 forward |
| Phase 2 | Week 3-4 | 实现 KV cache 的基本版（无分页），跑通单条 decode 循环 | 输出流式生成 |
| Phase 3 | Week 5-6 | 插入 Scheduler（先不用分页，static batch），加正确性测试 | same output test green |
| Phase 4 | Week 7-8 | 实现 PagedAttention 分页版，替换 KV cache | no leak test green |
| Phase 5 | Week 9-10 | 写基准测试，对比 vLLM / Huggingface 官方推理 | throughput_report.md 完成 |
| Phase 6 | Week 11-12 | 封装引擎接口（FastAPI SSE stream），前端对接 | demo 录屏 + README |

---

## 参考资源

- vLLM 论文：[vLLM: Easy, Fast, and Efficient LLM Inference with PagedAttention](https://arxiv.org/abs/2309.06180)
- Karpathy nanoGPT 路线：[nanoGPT](https://github.com/karpathy/neoGPT) + [build-nanogpt](https://www.youtube.com/watch?v=LbU0nQ9Ss9c)
- Transformers 官方推理文档：[Inference API & Streaming](https://huggingface.co/docs/transformers/main_classes/text_generation)
- 工程实践：LangChain / vLLM 部署文档（学习工业级用法）

---

## 验收清单（本章终点）

- [ ] 调度器有 continuous batching 逻辑 + static batch 对比测试
- [ ] KV cache 分页实现通过正确性测试（无泄漏）
- [ ] 压测报告包含吞吐曲线 + TTFT/TPOT 数据
- [ ] README 清晰写出取舍记录（为什么不支持量化/多卡？为什么选 single model？）
- [ ] 至少一人 review（GitHub PR 或社区讨论）

---

## 🔗 相关脚手架

### 分布式内核：mini-Raft 正确性测试用例集

| 文件 | 链接 | 说明 |
|---|---|---|
| 测试用例集 | [`22-mini-raft-test-suite.md`](./22-mini-raft-test-suite.md) | Test1-Test5（选举/日志复制/term monotonicity/snapshot）+ 网络模拟器伪代码 |
