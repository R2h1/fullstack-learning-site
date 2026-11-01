# mini-Raft 正确性测试用例集

这是 22 章「分布式内核」的 D4 验收物之一，目标是给 `miniraft` 实现一套**以正确性为裁判**的测试集，而不是跑个 demo 就算交差。

## 为什么测试是 Raft 实现的唯一裁判

Raft 的核心难点不是写代码，而是**覆盖所有边界情况**：节点宕机、网络分区、心跳超时、term 竞争、日志复制丢失、旧 leader 回滚... 没有测试，你根本不知道是不是真的"对"。

工业级共识协议（etcd/Kafka KRaFT/TiKV）都有一套**multi-node cluster test**，这套用例集的灵感来自 tests-in-etcd + raft.github.io 可视化器 + paper。

---

## 测试环境设计

### 1. 虚拟集群模拟器

```python
class VirtualNode:
    """模拟一个 Raft 节点"""
    def __init__(self, node_id: int):
        self.id = node_id
        self.state = "follower"  # follower / candidate / leader
        self.current_term = 0
        self.voted_for = None
        self.log = []
        self.commit_index = -1
        self.last_applied = -1
        
        # 网络状态
        self.network_partitioned = False  # 是否被隔离
        self.response_delay_ms = 0         # 延迟模拟
        
class NetworkSimulator:
    """模拟消息传递 + 分区/丢包"""
    def __init__(self, num_nodes: int):
        self.nodes = {i: VirtualNode(i) for i in range(num_nodes)}
        self.partitions: list[set[int]] = [set(range(num_nodes))]  # 初始全连通
        
    def partition(self, nodes: set[int]):
        """将给定节点集合隔离到独立分区"""
        self.partitions = [nodes, set(range(len(nodes))) - nodes]
    
    def unpartition(self):
        """恢复全连接"""
        self.partitions = [set(self.nodes.keys())]
    
    def send_messages_from_leader(self, leader_id: int) -> list[tuple]:
        """从 leader 向外广播 append_entries 消息"""
        if leader_id not in self.nodes or self.nodes[leader_id].state != "leader":
            return []
        
        messages = []
        for target_id, target_node in self.nodes.items():
            if not self._is_connected(leader_id, target_id):
                continue
            
            msg = {
                "type": "append_entries",
                "leader_id": leader_id,
                "term": self.nodes[leader_id].current_term,
                "prev_log_index": ...,
                "prev_log_term": ...,
                "entries": ...,
                "leader_commit": ...,
            }
            messages.append((target_id, msg))
        
        return messages
    
    def _is_connected(self, a: int, b: int) -> bool:
        """判断两个节点是否在同一分区"""
        for p in self.partitions:
            if a in p and b in p:
                return True
        return False
```

### 2. 场景测试框架

```python
def run_cluster_test(test_fn, num_nodes=3):
    """通用集群测试框架"""
    net = NetworkSimulator(num_nodes)
    threads = []
    
    # 启动每个节点（选举/复制心跳线程）
    for node_id in range(num_nodes):
        t = threading.Thread(target=node_loop, args=(net.nodes[node_id], net))
        t.daemon = True
        threads.append(t)
        t.start()
    
    sleep(0.1)  # 等待 leader 选举完成
    result = test_fn(net)  # 运行测试逻辑
    assert result, f"测试失败：{test_fn.__name__}"
```

---

## 核心测试用例

### ✅ Test 1: Leader Election (选主成功)

**目标**: 任意一个节点宕机后重启，能够触发新一轮选举并选出新 leader

**场景**:
1. 启动 3 节点集群 → 选举出 leader
2. kill leader → 其他两节点检测到心跳丢失
3. 启动 leader → 三节点重新加入网络
4. 验证：经过新的 election timeout 后，某个节点成为新 leader

**断言**:
- new term > old term
- 恰好一个 leader 存在（防止脑裂）
- 三节点都能收到新 leader 的心跳

```python
def test_election_after_leader_failure():
    net = NetworkSimulator(3)
    threads = start_all_nodes(net)
    sleep(random_election_timeout(500, 1500))  # 等待一轮稳定领导权
    
    old_leader = get_current_leader(net)
    old_term = net.nodes[old_leader].current_term
    
    # 杀 leader
    stop_node(old_leader)
    sleep(random_election_timeout(1000, 2000))  # 等待新选举
    
    # 重启
    restart_node(old_leader)
    
    new_leader = wait_for_new_leader(threads, timeout=5s)
    new_term = net.nodes[new_leader].current_term
    
    assert new_term == old_term + 1, "Term 未递增"
    assert count_leaders(net) == 1, "出现多个 leader（脑裂）"
    assert all_are_healthy(net), "并非所有节点都知道新 leader"
```

### ✅ Test 2: Log Replication Consistency (日志复制一致性)

**目标**: 提交后的日志在所有副本上必须一致，即使发生网络分区

**场景**:
1. leader 发送 N 条日志条目
2. 分区：只有 2 个节点能收到（满足多数派）
3. leader 确认 commit
4. 修复分区
5. 验证：所有三节点的日志序列完全一致（包括已提交的未提交条目）

**断言**:
- committed entries 在三个节点上 log[i].term == log[i].term
- 如果某个 entry 在不同节点有冲突（如不同 index 对应不同 term），必须回滚或丢弃

```python
def test_log_replication_with_partition():
    net = NetworkSimulator(3)
    start_all_nodes(net)
    
    leader = get_current_leader(net)
    
    # 发送 5 条日志
    for i in range(5):
        net.send_messages_from_leader(leader).append({"data": f"cmd{i}"})
    sleep(0.5)
    
    # 分区：只允许 2 个节点（包括 leader）通信
    net.partition({leader, (leader+1)%3})
    
    # 再发 3 条（只有这 2 个能收）
    for i in range(5, 8):
        net.send_messages_from_leader(leader).append({"data": f"cmd{i}"})
    sleep(0.5)
    
    # 检查：这两个节点应该有全部 8 条
    assert len(net.nodes[leader].log) == 8
    assert len(net.nodes[(leader+1)%3].log) == 8
    
    # 第三个节点只有前 5 条
    third = (leader+2)%3
    assert len(net.nodes[third].log) == 5
    
    # 修复分区
    net.unpartition()
    sleep(0.5)  # 等待复制
    
    # 验证：三节点日志长度应该都是 8，内容完全一致
    for node in net.nodes.values():
        assert len(node.log) == 8, f"节点{node.id}日志长度不对"
        assert same_log_structure(net.nodes[leader].log, node.log)
```

### ✅ Test 3: Follower Crash & Recovery ( follower 宕机 + 恢复)

**目标**: 单个 follower 宕机不会阻塞 leader 的日志复制，恢复后能追上 lag

**场景**:
1. 正常运行的集群中有 N 条日志
2. kill 一个 follower
3. leader 继续处理客户端请求
4. restart follower
5. 验证：recover 后该 follower 通过 replicate 追上所有缺失条目

**断言**:
- leader 的心跳没有被该 follower 卡住
- 追平后 commit index 提升
- 无数据丢失（commit 过的条目都在）

```python
def test_follower_crash_and_recovery():
    net = NetworkSimulator(3)
    start_all_nodes(net)
    
    leader = get_current_leader(net)
    
    # 先发 10 条让集群稳定
    for i in range(10):
        net.send_messages_from_leader(leader).append(f"cmd{i}")
    sleep(0.5)
    
    # kill follower
    crash_node((leader+2)%3)
    
    # 继续发 5 条（killer follower 会 lag）
    for i in range(10, 15):
        net.send_messages_from_leader(leader).append(f"cmd{i}")
    sleep(0.5)
    
    # 检查：crashed follower 还是只有 10 条
    crashed = net.nodes[(leader+2)%3]
    assert len(crashed.log) == 10
    
    # restart
    restart_node((leader+2)%3)
    
    # 等待追平
    wait_until(lambda: len(crashed.log) >= 15, timeout=5s)
    
    # 断言：所有节点都有至少 15 条，且 committed 数量 ≥10
    for node in net.nodes.values():
        assert len(node.log) >= 15
        assert node.commit_index >= 9  # 前 10 条已经提交过
```

### ✅ Test 4: Term Monotonicity (term 严格递增)

**目标**: term 永远不会回退，即使网络分区导致旧 leader 回来也不会骗过新节点

**场景**:
1. 初始 leader 生成 term T1
2. 分区：leader 与 majority 断开
3. minority 中选举出 term T2（T2 > T1）
4. 恢复分区：旧 leader 回来的时候，它的 term 是 T1
5. 验证：所有节点拒绝 term T1 的请求（因为本地已经有更高 term）

**断言**:
- 所有节点的 term ≥ max(all terms ever seen)
- 没有任何节点接受比它当前 term 低的 leader 请求

```python
def test_term_monotonicity():
    net = NetworkSimulator(3)
    start_all_nodes(net)
    
    leader_t1 = get_current_leader(net)
    term_t1 = net.nodes[leader_t1].current_term
    
    # 分区：把 leader 隔离出去
    net.partition({leader_t1})
    
    # minority 中选举出新 leader（term 一定增加）
    sleep(election_timeout_multiplier * 2)
    leader_t2 = get_current_leader(net.minority_part)
    term_t2 = net.nodes[leader_t2].current_term
    
    assert term_t2 > term_t1, "minority leader 的 term 没增加"
    
    # 恢复分区
    net.unpartition()
    sleep(0.5)
    
    # 断言：所有节点的 term 都等于 term_t2（旧 leader 无法回退）
    for node in net.nodes.values():
        assert node.current_term == term_t2
```

### ✅ Test 5: Snapshot & Compaction (快照 + 截断)

**目标**: 当日志太长时，可以安全地创建快照，旧的日志可以删除而不影响 consistency

**场景**:
1. 写入大量日志（比如 10k 条）
2. 触发 snapshot（每 100 条切一次）
3. 验证：snapshot 后的节点仍然能正常响应客户端请求
4. 验证：老日志被 truncate，但提交索引仍然正确推进

**断言**:
- snapshot 的 state 与最后一条已提交条目一致
- 截断后仍能 catch up 到新日志
- 不出现 "gap in log"（如 missing term N）

```python
def test_snapshot_and_compaction():
    net = NetworkSimulator(3)
    start_all_nodes(net)
    
    leader = get_current_leader(net)
    
    # 写入足够多的日志触发 snapshot
    write_batch_size = 1000
    for batch in range(10):
        for i in range(batch_size):
            net.send_messages_from_leader(leader).append(f"cmd_{batch}_{i}")
        sleep(0.2)
        
        # 检查 snapshot 是否生成
        snapshot_created = any(
            node.last_snapshot_idx >= (batch+1)*batch_size 
            for node in net.nodes.values()
        )
        assert snapshot_created, "Snapshot 未在预期时间点生成"
    
    # 断言：所有节点的 commit_index 都已推进到最后
    for node in net.nodes.values():
        assert node.commit_index == 10000 - 1, "Commit index 未推进"
        
    # 验证：新日志还能正常追加
    new_entry_count_before = len(get_latest_log_entry(leader))
    net.send_messages_from_leader(leader).append("new_cmd")
    sleep(0.2)
    
    for node in net.nodes.values():
        assert len(node.log) == new_entry_count_before + 1, "新条目未追加"
```

---

## 测试执行建议

| 阶段 | 测试范围 | 频率 |
|---|---|---|
| CI 每 PR | Test1-Test3（选举/日志复制/节点恢复） | 每次提交自动跑 |
| 每周 | Test4-Test5（term monotonicity/snapshot） | 手动触发 + 日志分析 |
| 发布前 | 所有测试 + 随机网络抖动注入 | 压力测试模式 |

---

## 参考资源

- Raft 论文 + visualization: https://raft.github.io/
- etcd tests-in-go: https://github.com/etcd-io/etcd/tree/main/tests
- Go Raft implementation: https://github.com/etcd-io/raft
- Java Raft: https://github.com/apache/rocketmq-raft

---

## 验收清单（D4）

- [ ] Test1-Test5 全部 green（截图入库）
- [ ] 至少一个测试有自动化脚本（pytest/unittest）
- [ ] README 写清测试设计思路（为什么覆盖这些场景）
- [ ] 有人 review 过测试用例（GitHub discussion/comment）
