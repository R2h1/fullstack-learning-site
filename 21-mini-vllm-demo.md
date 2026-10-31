---
layout: home

hero:
  name: mini-vLLM
  text: AI 模型层与推理优化
  tagline: mini-vLLM 调度器 + KV Cache 分页实现骨架代码、正确性测试脚本、基准对比报告
  actions:
    - theme: brand
      text: 📖 阅读章节
      link: /21-长矛一-AI 模型层与推理优化
    - theme: alt
      text: 💻 示例仓库
      link: https://github.com/R2h1/mini-vllm-stub

features:
  - icon: ⚙️
    title: Continuous Batching Scheduler
    details: 请求动态进出 batch，实时释放已完成 slot 并用新请求填充（对比静态 batch 的队头阻塞）
  - icon: 💾
    title: PagedAttention KV Allocator
    details: KV Cache 分页管理，用显存换计算；无泄漏测试通过；支持单 GPU + 单个 HF 小模型
  - icon: ✅
    title: 正确性验证
    details: same output different arrival order 一致性测试；内存泄漏检测（跑 10k 请求后显存平稳）
  - icon: 📊
    title: 吞吐压测
    details: tokens/s / TTFT / TPOT 对比 vLLM 官方推理 / HuggingFace transformers baseline

---

## 🧱 目录结构

```
mini-vllm-stub/
├─ src/
│  ├─ scheduler.py        # continuous batching 调度器（伪代码骨架）
│  ├─ kv_cache.py         # KV Cache 分页分配器（BlockTable + Allocator）
│  └─ engine.py           # 推理服务入口（SSE stream）
├─ tests/
│  ├─ test_scheduler.py   # 调度器正确性测试
│  ├─ test_kv_cache.py    # KV Cache 分配/释放测试
│  └─ perf_test.py        # 吞吐对比脚本
└─ benchmarks/             # 压测结果存档
```

## 🔑 核心伪代码（摘要）

### Scheduler.step() 主循环

```python
def step(self, model, max_batch_size=32):
    # Step 1: 释放已完成的请求（回收 KV blocks）
    finished = [r for r in self.running_requests if r.is_finished]
    for r in finished:
        self.kv_allocator.free(r.block_ids)
    
    # Step 2: 从等待队列挑选新请求填槽
    to_run = min(len(self.waiting_queue), max_batch_size - len(self.running_requests))
    candidates = self.waiting_queue[:to_run]
    
    # Step 3: concat token → forward → sample → update state
    input_ids = torch.tensor([r.output_tokens[-1] for r in self.running_requests])
    logits, kv_cache = model(input_ids, past_key_values=kvcache)
    
    # Step 4: 更新每个请求状态（检查结束条件）
    results = []
    for i, r in enumerate(self.running_requests):
        next_token = sample(logits[i], temperature=0.8)
        r.output_tokens.append(next_token)
        if next_token == EOS_TOKEN or len(r.output_tokens) >= r.max_new_tokens:
            r.is_finished = True
        results.append((r.id, r.output_tokens.copy()))
    
    return results
```

### KVAllocator.allocate()

```python
def allocate(self, request_id: int, num_required_blocks: int) -> BlockTable:
    available = sorted(list(self.physical_blocks))
    allocated = available[:num_required_blocks]
    self.physical_blocks -= set(allocated)
    
    table = BlockTable()
    table.blocks = allocated
    self.request_blocks[request_id] = table
    
    return table
```

## 🧪 正确性测试用例

| 测试 | 目标 | 断言 |
|---|---|---|
| `test_determinism_same_output_different_arrival_order` | 相同输入不同到达时序 → 相同输出 | `outputs_A == outputs_B`（固定随机种子） |
| `test_no_memory_leak_over_long_run` | 跑 10k 请求后显存平稳 | `len(physical_blocks) == num_physical_blocks` |

## 📈 压测指标

- **tokens/s**：吞吐能力（对比 vLLM 官方推理）
- **TTFT**：首 token 延迟（prefill 阶段算力密集）
- **TPOT**：每 token 时间（decode 阶段带宽密集）

## 🛠️ 下一步行动

1. **Week 1-2**: 用 PyTorch 写一个简化 decoder-only Transformer，能加载 HF 权重并运行 inference
2. **Week 3-4**: 实现基本版 KV cache（无分页），跑通流式生成
3. **Week 5-6**: 插入 Scheduler（先用 static batch），加正确性测试
4. **Week 7-8**: 实现 PagedAttention 分页版，替换 KV cache
5. **Week 9-10**: 写基准测试，产出吞吐对比报告
6. **Week 11-12**: 封装 FastAPI SSE stream，前端对接 demo

## 📚 参考资源

- [vLLM Paper](https://arxiv.org/abs/2309.06180)
- [nanoGPT](https://github.com/karpathy/nanoGPT)
- [Transformers Inference Guide](https://huggingface.co/docs/transformers/main_classes/text_generation)

---

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
