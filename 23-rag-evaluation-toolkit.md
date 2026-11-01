# RAG Golden Set 模板与工具 (23 章)

这是 23 章「项目实操册」的 RAG 验收物核心：golden set（评估集）+ 批量计算工具链。没有这个，RAG 评测就靠嘴说，没数字、没对比、没法量化优化。

## 🎯 一句话目标

**建一个能跑自动化的 RAG 评估流水线**：输入 golden set → 跑出 Recall@k / MRR / Faithfulness → 优化前后对比图 → 入库 CI。

---

## 📁 目录结构

```
rag-evaluation/
├─ data/
│  ├─ golden_set.jsonl       # 评估集（标注好的问题 - 期望答案 - 引用出处）
│  ├─ test_cases/            # 按领域分类的子集
│  └─ bad_case_log.jsonl     # Badcase 记录（持续追加）
├─ scripts/
│  ├─ eval_rag.py            # 主评估脚本（Recall/MRR/Faithfulness）
│  ├─ build_golden_set.py    # 构建 golden set 的工具（从文档抽取）
│  └─ report_generator.py    # 生成对比报告图表
├─ templates/
│  ├─ annotation_form.md     # 人工标注模板
│  └─ llm_as_judge_prompt.md # LLM-as-Judge 提示词模板
├─ notebooks/
│  └─ eval_exploration.ipynb # 探索性分析（指标分布/异常值）
└─ README.md                 # 使用手册 + 结果存档
```

---

## 🧪 Golden Set 格式（JSONL）

每个条目包含三层标注：**问题 → 期望出处 → 参考答案**。

### 1. `golden_set.jsonl` 示例

```jsonl
{
  "id": "q_001",
  "question": "如何申请门窗安装优惠？",
  "expected_sources": ["docs/pricing.html#discounts", "docs/installation.html#promo-codes"],
  "reference_answer": "提交表单后享受 9 折优惠，需填写 Promo Code: SUMMER2026。",
  "difficulty": "medium",
  "category": "pricing",
  "created_at": "2024-10-15T10:30:00Z"
}
```

### 2. 标签字段说明

| 字段 | 说明 | 用途 |
|---|---|---|
| `id` | 唯一标识 | 追踪 badcase |
| `question` | 自然语言问题 | 实际检索查询 |
| `expected_sources` | 正确答案应该引用的文档路径列表 | 召回指标基础 |
| `reference_answer` | 人工/专家标注的标准答案 | Faithfulness 基线 |
| `difficulty` | easy / medium / hard | 分层统计 AC 率 |
| `category` | pricing / installation / support 等 | 分模块评估 |
| `created_at` | 时间戳 | 迭代记录 |

**建议规模**：80–200 条足够起步，其中 hard ≥30%（覆盖边缘 case）。

---

## 🔧 构建工具（`build_golden_set.py`）

### 自动化抽取 + 半人工审核

```python
#!/usr/bin/env python3
"""
从 Markdown/HTML 文档集中自动生成候选问题 - 答案对，再人工审核。
用法：python scripts/build_golden_set.py --input docs/ --output data/candidates.jsonl
"""

import json
from pathlib import Path
from typing import List, Dict
from ragas import evaluate, ChatOpenAI
from ragas.metrics import answer_relevance, faithfulness, context_precision

def extract_sections_from_markdown(file_path: Path) -> List[Dict]:
    """简单提取标题 + 段落组合成候选问答对"""
    sections = []
    current_title = None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'):
                current_title = line.strip('# ').strip()
            elif line.strip() and current_title:
                sections.append({
                    "title": current_title,
                    "content": line.strip(),
                    "source": str(file_path),
                })
    
    return sections

def generate_candidate_qa_pairs(sections: List[Dict], llm: ChatOpenAI) -> List[Dict]:
    """用 LLM 生成问题 - 答案对"""
    candidates = []
    
    for section in sections[:100]:  # 先抽前 100 个片段
        prompt = f"""
基于以下内容生成一个问题及其标准答案：

内容：{section['content']}

要求：
- 问题要像真实用户会问的
- 答案必须只基于提供的上下文
"""
        
        response = llm.generate(prompt)
        candidates.append({
            "source_section": section,
            "candidate_question": response[0],
            "expected_sources": [section['source']],
            "status": "pending_review",
        })
    
    return candidates

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True, help="文档目录")
    parser.add_argument('--output', type=str, required=True, help="输出文件")
    args = parser.parse_args()
    
    input_dir = Path(args.input)
    all_sections = []
    
    for file_path in input_dir.glob('**/*.md'):
        all_sections.extend(extract_sections_from_markdown(file_path))
    
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
    candidates = generate_candidate_qa_pairs(all_sections, llm)
    
    with open(args.output, 'w', encoding='utf-8') as f:
        for c in candidates:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')
    
    print(f"已生成 {len(candidates)} 个候选 QA 对，待人工审核")

if __name__ == "__main__":
    main()
```

---

## 📊 评估脚本（`eval_rag.py`）

### 三指标基准：Recall@k / MRR / Faithfulness

```python
#!/usr/bin/env python3
"""
RAG 评估流水线（三指标）：
- Recall@k: 检索召回率（k=3/5/10）
- MRR: 排序质量
- Faithfulness: 回答是否只基于检索内容（LLM-as-Judge）

用法：python scripts/eval_rag.py --golden data/golden_set.jsonl --retrieval my-rag --output results/baseline.json
"""

import json
import pandas as pd
from typing import List, Dict
from ragas import evaluate, RunResult
from ragas.metrics import (
    answer_correctness,
    answer_relevance,
    faithfulness,
    context_precision,
    context_recall,
    mrr,
    recall
)

class RagEvaluator:
    def __init__(self, golden_file: str):
        self.golden_set = []
        
        with open(golden_file, 'r', encoding='utf-8') as f:
            for line in f:
                self.golden_set.append(json.loads(line.strip()))
        
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
        self.llm_embedder = OpenAIEmbeddings(model="text-embedding-3-large")
    
    def compute_recall(self, retrieved_docs: List[str], expected_sources: List[str]) -> float:
        """Compute Recall@k: 检索结果中有多少命中预期源"""
        retrieved_urls = [doc.metadata.get('url') for doc in retrieved_docs]
        intersection = len(set(retrieved_urls) & set(expected_sources))
        return intersection / max(len(expected_sources), 1)
    
    def compute_mrr(self, retrieved_docs: List[str], expected_sources: List[str]) -> float:
        """Mean Reciprocal Rank: 第一个正确结果的位置倒数"""
        for i, doc in enumerate(retrieved_docs, 1):
            url = doc.metadata.get('url')
            if url in expected_sources:
                return 1.0 / i
        return 0.0
    
    def compute_faithfulness(self, answer: str, context: str) -> float:
        """Faithfulness: 回答是否完全基于检索到的上下文"""
        # 用 Ragas 内置指标
        result = self.llm.evaluate([context], [faithfulness])
        return result[0]
    
    def batch_evaluate(self, retrieval_fn, num_batches: int = 100) -> Dict:
        """批量评估，返回三个指标的中位数 + 95% 置信区间"""
        results = []
        
        for i, item in enumerate(self.golden_set[:num_batches]):
            question = item['question']
            expected_sources = item['expected_sources']
            
            # 调用你的检索函数（假设传入 query 返回 Document 列表）
            retrieved_docs = retrieval_fn(question)
            answer = self._generate_answer(question, retrieved_docs)  # 调用生成器
            
            recall_k = self.compute_recall(retrieved_docs, expected_sources)
            mrr_score = self.compute_mrr(retrieved_docs, expected_sources)
            faithfulness_score = self.compute_faithfulness(answer, "\n".join([d.page_content for d in retrieved_docs]))
            
            results.append({
                'recall': recall_k,
                'mrr': mrr_score,
                'faithfulness': faithfulness_score,
            })
        
        df = pd.DataFrame(results)
        return {
            'recall_mean': round(df['recall'].mean(), 3),
            'recall_std': round(df['recall'].std(), 3),
            'mrr_mean': round(df['mrr'].mean(), 3),
            'mrr_std': round(df['mrr'].std(), 3),
            'faithfulness_mean': round(df['faithfulness'].mean(), 3),
            'confidence_interval_95': {
                'recall': (round(df['recall'].mean() - 1.96 * df['recall'].std(), 3),
                          round(df['recall'].mean() + 1.96 * df['recall'].std(), 3)),
                'mrr': (round(df['mrr'].mean() - 1.96 * df['mrr'].std(), 3),
                       round(df['mrr'].mean() + 1.96 * df['mrr'].std(), 3)),
                'faithfulness': (round(df['faithfulness'].mean() - 1.96 * df['faithfulness'].std(), 3),
                                round(df['faithfulness'].mean() + 1.96 * df['faithfulness'].std(), 3)),
            }
        }

def main():
    import argparse
    parser = argparse.ArgumentParser(description='RAG 评估流水线')
    parser.add_argument('--golden', type=str, required=True, help='Golden set 文件路径')
    parser.add_argument('--retrieval', type=str, required=True, help='检索实现模块路径')
    parser.add_argument('--output', type=str, required=True, help='结果输出文件')
    parser.add_argument('--num-batches', type=int, default=100, help='批次数量')
    args = parser.parse_args()
    
    evaluator = RagEvaluator(args.golden)
    
    # 导入用户的检索函数（假设提供 function retrieve(query) -> List[Document]）
    import sys
    sys.path.append(args.retrieval)
    from my_rag import retrieve
    
    results = evaluator.batch_evaluate(retrieve, num_batches=args.num_batches)
    
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"评估完成，结果已写入 {args.output}")

if __name__ == "__main__":
    main()
```

---

## 📈 报告生成器（`report_generator.py`）

### 优化前后对比图

```python
#!/usr/bin/env python3
"""
生成对比报告（Markdown + PNG 图表）
用法：python scripts/report_generator.py --baseline results/baseline.json --optimized results/optimized.json --output reports/compare.md
"""

import json
import matplotlib.pyplot as plt
from pathlib import Path

def load_results(baseline_path: str, optimized_path: str) -> tuple:
    with open(baseline_path, 'r') as f:
        baseline = json.load(f)
    with open(optimized_path, 'r') as f:
        optimized = json.load(f)
    return baseline, optimized

def generate_comparison_plot(baseline, optimized, output_path: str):
    metrics = ['recall_mean', 'mrr_mean', 'faithfulness_mean']
    labels = ['Recall', 'MRR', 'Faithfulness']
    x = range(len(metrics))
    
    baseline_values = [baseline[m] for m in metrics]
    optimized_values = [optimized[m] for m in metrics]
    
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(8, 5))
    bars1 = ax.bar([i - width/2 for i in x], baseline_values, width, label='Baseline', color='#e74c3c')
    bars2 = ax.bar([i + width/2 for i in x], optimized_values, width, label='Optimized', color='#2ecc71')
    
    ax.set_ylabel('Score')
    ax.set_title('RAG Optimization Comparison')
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend()
    
    # 添加数值标签
    for bar in bars1:
        height = bar.get_height()
        ax.annotate(f'{height:.3f}', xy=(bar.get_x() + bar.get_width()/2, height),
                   xytext=(0, 3), textcoords='offset points', ha='center')
    
    for bar in bars2:
        height = bar.get_height()
        ax.annotate(f'{height:.3f}', xy=(bar.get_x() + bar.get_width()/2, height),
                   xytext=(0, 3), textcoords='offset points', ha='center')
    
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"图表已保存至 {output_path}")

def generate_markdown_report(baseline, optimized, output_path: str):
    report = """# RAG 优化对比报告

## 评估设置

- **Golden Set**: 100 条（easy 40%, medium 40%, hard 20%）
- **Metrics**: Recall@5 / MRR / Faithfulness (LLM-as-Judge)
- **Batch Size**: 100 queries

## 指标对比

| Metric | Baseline | Optimized | Δ |
|--------|----------|-----------|----|
| Recall@5 | {:.3f} | {:.3f} | {:.3f} |
| MRR | {:.3f} | {:.3f} | {:.3f} |
| Faithfulness | {:.3f} | {:.3f} | {:.3f} |

## 结论

{}
""".format(
        baseline['recall_mean'], optimized['recall_mean'], optimized['recall_mean'] - baseline['recall_mean'],
        baseline['mrr_mean'], optimized['mrr_mean'], optimized['mrr_mean'] - baseline['mrr_mean'],
        baseline['faithfulness_mean'], optimized['faithfulness_mean'], optimized['faithfulness_mean'] - baseline['faithfulness_mean'],
        "优化有效！" if optimized['recall_mean'] > baseline['recall_mean'] else "需进一步调优"
    )
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"Markdown 报告已保存至 {output_path}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', type=str, required=True)
    parser.add_argument('--optimized', type=str, required=True)
    parser.add_argument('--output', type=str, required=True)
    args = parser.parse_args()
    
    baseline, optimized = load_results(args.baseline, args.optimized)
    
    # 生成图表
    generate_comparison_plot(
        baseline, optimized, 
        Path(args.output).parent / "comparison.png"
    )
    
    # 生成 Markdown
    generate_markdown_report(
        baseline, optimized,
        Path(args.output).parent / "report.md"
    )

if __name__ == "__main__":
    main()
```

---

## 🧩 LLM-as-Judge 提示词（`templates/llm_as_judge_prompt.md`）

### Faithfulness 打分标准

```markdown
# Faithfulness Judgment Prompt

你是一个评分助手，判断 AI 模型的回答是否**完全基于**给定的检索上下文。

## 任务描述

请比较以下内容：

**检索上下文**：
```context
{context}
```

**模型回答**：
```answer
{answer}
```

## 判断规则

如果回答满足以下条件，给出高分（≥0.8）：
- ✅ 所有事实性陈述都能在上下文中找到依据
- ✅ 没有出现上下文中不存在的信息
- ✅ 对于不确定的部分明确说"根据上下文无法确定"

如果出现以下情况，降低分数：
- ❌ 凭空捏造了上下文中没有的信息
- ❌ 给出了与上下文矛盾的答案
- ❌ 过度推理（超出上下文范围）

## 输出格式

请以 JSON 格式输出：
```json
{
  "score": 0.85,  // 0-1 之间的浮点数
  "reason": "...", // 一句理由
  "hallucinated_statements": [...]  // 如果有幻觉，列出具体语句；否则为空数组
}
```
```

---

## 📊 使用流程（1 小时快速上手）

### Step 1: 构建初始 Golden Set

```bash
# 从现有文档自动抽取候选 QA 对（耗时约 10 min）
python scripts/build_golden_set.py --input docs/ --output data/candidates.jsonl

# 人工审核（在 Notion/Airtable 里标 up/down）
# 完成后转为正式 golden_set.jsonl（保留 80-200 条即可）
```

### Step 2: 跑基线评估

```bash
# 你的 RAG 系统需要提供一个接口：retrieve(query) -> List[Document]
python scripts/eval_rag.py \
  --golden data/golden_set.jsonl \
  --retrieval src/my_rag.py \
  --output results/baseline.json \
  --num-batches 100
```

### Step 3: 优化循环

每改一处优化点（切块策略 / 混合检索 / rerank），就重复 Step 2 → 跑一次对比：

```bash
python scripts/eval_rag.py --golden data/golden_set.jsonl --retrieval src/my_rag_v2.py --output results/v2.json
python scripts/report_generator.py \
  --baseline results/baseline.json \
  --optimized results/v2.json \
  --output reports/compare_v2.md
```

产出：`reports/compare_v2.png` + `reports/compare_v2.md` → 放进简历/复盘文档。

---

## ✅ 验收清单（D4）

- [ ] Golden Set ≥80 条，hard 占比 ≥20%
- [ ] 评估脚本 `eval_rag.py` 能跑通基线 + 优化版本对比
- [ ] 产出对比报告（图表 + Markdown）→ 嵌入项目文档
- [ ] Langfuse trace 接入（采样打分，形成在线看板）
- [ ] 红队自测（2.4 安全章节）用例入库 → 回归测试集

---

## 📚 参考资源

- Ragas 评估框架：https://docs.ragas.io/
- Langfuse 追踪平台：https://langfuse.com/
- RAGAS 论文：https://arxiv.org/abs/2309.15217
- LLM-as-Judge 最佳实践：https://github.com/google-research/language/blob/main/language/llm_eval_harness/

---

## 🛠️ 下一步行动（23 章落地）

| 周次 | 任务 | 里程碑 |
|---|---|---|
| Week 1–2 | 建 golden set（80 条）+ 跑基线 | results/baseline.json 入库 |
| Week 3–4 | 实现混合检索 + rerank | v2.json → report 显示 Δ Recall > 10% |
| Week 5 | Langfuse trace + 语义缓存上线 | 成本下降 30% |
| Week 6 | 红队测试 + 漏洞报告 | 5 类攻击面全覆盖 |
