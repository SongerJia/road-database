## 进阶特性
Pipeline->慢查询->Pub/Sub->stream->redis7多线程->面试高频题
### Pipeline（管道）
解决什么问题
```
// 每次命令都要一次网络往返（RTT）
// 100 条命令 → 100 次网络往返 → 慢！

// Pipeline：一次性发送多条命令，一次网络往返
// 100 条命令 → 1 次网络往返 → 快！
```
对比
```
// 无 Pipeline：
// 命令1 → 等返回 → 命令2 → 等返回 → 命令3 → ...
// 100 条 = 100 次 RTT

// 有 Pipeline：
// 命令1 命令2 命令3 ... → 一起发送 → 一起返回
// 100 条 = 1 次 RTT
```
使用
```
// Spring Data Redis
List<Object> results = redisTemplate.executePipelined(
    (RedisCallback<Object>) connection -> {
        for (int i = 0; i < 1000; i++) {
            connection.set(("key:" + i).getBytes(), "value".getBytes());
        }
        return null;
    }
);
// 一次网络往返执行 1000 条命令

// 注意：
// ① Pipeline 不是事务（不保证原子，可能部分执行）
// ② 大量命令一次性发送 → 内存占用
// ③ 适合：批量写入、批量读取（无依赖）
```
Pipeline vs 事务 vs lua

|对比|Pipeline|MULTI/EXEC|Lua|
|---|---|---|---|
|网络往返|1 次|2 次|1 次|
|原子性|❌|✅ 连续|✅ 原子|
|逻辑|❌|❌|✅|
|场景|批量无依赖|简单批量|复杂原子|
### Slow Log
慢查询是什么
```
// 记录执行时间超过阈值的命令
// 排查 Redis 卡顿的原因
```
配置与查看
```
# 慢查询阈值（微秒，默认 10000 = 10ms）
CONFIG GET slowlog-log-slower-than
CONFIG SET slowlog-log-slower-than 10000

# 慢查询日志长度（默认 128）
CONFIG GET slowlog-max-len

# 查看慢查询（最近 10 条）
SLOWLOG GET 10

# 清空
SLOWLOG RESET
```
常见的慢命令
```
// ① KEYS *：遍历所有 key（O(n)）→ 用 SCAN 替代
// ② 大 key 操作：获取/删除大 key
// ③ SMEMBERS（大 set 全部元素）→ 用 SSCAN
// ④ HGETALL（大 hash）→ 用 HSCAN
// ⑤ SORT（复杂度高）
// ⑥ ZRANGEBYSCORE 大范围
// ⑦ FLUSHALL / FLUSHDB（清库）

// 原则：避免 O(n) 命令、避免大 key、避免 KEYS
```
### Pub/Sub  发布订阅
```
// 消息发布/订阅模式
// 发布者发消息到频道，订阅者接收
// 一对多广播
```
使用
```
# 订阅者（阻塞等待消息）
SUBSCRIBE channel:news

# 发布者
PUBLISH channel:news "hello"

# 按模式订阅
PSUBSCRIBE channel:*   # 订阅所有 channel 开头的频道
```
特点
```
// ① 消息不持久化：
//    订阅者不在线 → 消息丢失！
//    没有消息队列的积压能力
// ② 不适合做消息队列（发布即焚）
// ③ 适合：实时广播通知（在线通知、订阅推送）

// 对比 MQ（RabbitMQ/Kafka）：
// Pub/Sub：无持久化、无确认、无积压
// MQ：持久化、确认、积压 ✅
```
### 面试高频

> **Q:** "Redis Pub/Sub 能当消息队列用吗？" 
> **A:** "不能。Pub/Sub 消息不持久化，订阅者不在线就丢失，没有确认机制和积压能力。要做可靠消息队列用 RabbitMQ/Kafka，或者用 Redis 5.0+ 的 Stream（支持持久化和消费者组）。"
### Stream（流，5.0+）
```
// Redis 5.0 引入的消息队列类型（List/List 的升级）
// 支持：持久化、消费者组、ACK 确认、积压
// 弥补 Pub/Sub 的不足
```
核心特性
```
# ① 追加消息（XADD）
XADD stream:order * orderId 1001 status created
# 返回消息 ID（时间戳-序号）

# ② 读取消息（XREAD）
XREAD COUNT 10 BLOCK 5000 STREAMS stream:order 0

# ③ 消费者组（XGROUP）
XGROUP CREATE stream:order group1 0
XREADGROUP GROUP group1 consumer1 COUNT 10 STREAMS stream:order >

# ④ 确认（XACK）
XACK stream:order group1 1650000000-0
```
Stream vs Pub/Sub vs MQ

|对比|Pub/Sub|Stream|Kafka/RabbitMQ|
|---|---|---|---|
|持久化|❌|✅|✅|
|消费者组|❌|✅|✅|
|ACK|❌|✅|✅|
|积压|❌|✅|✅|
|适用|简单广播|轻量队列|生产级队列|
### Redis 7多线程
```
// ① 命令执行：仍然单线程（保证原子性）
// ② IO 读写：多线程（默认开启）
//    网络读写（解析/序列化）并行处理
// ③ 后台任务：独立线程（持久化、AOF 重写等）

// Redis 6.0：IO 多线程可选（默认关闭）
// Redis 7.0：IO 多线程默认开启
```
为什么命令执行还要单线程
```
// ① 保证命令原子性（无需锁）
// ② 避免多线程上下文切换
// ③ 命令本身快（内存操作），瓶颈在网络 IO 不在执行
// ④ 简单、可维护

// IO 多线程只解决：大量连接的读写解析瓶颈
```
参数
```
# Redis 7
io-threads 4          # IO 线程数（默认开启）
io-threads-do-reads yes  # 读也走 IO 线程
```
### 面试高频题
#### 题目1：Pipeline是什么，有什么好处
```
// 批量发送命令，减少网络往返（RTT）
// 100 条命令 1 次往返
// 注意：不是事务（不保证原子）
```
#### 题目2：Redis慢查询怎么排查
```
// SLOWLOG 配置阈值 + 查看
// 常见慢命令：KEYS、大 key 操作
// 避免 O(n) 命令
```
#### 题目3：Pub/Sub和Stream区别
```
// Pub/Sub：不持久化、无消费者组（简单广播）
// Stream：持久化、消费者组、ACK（轻量队列）
```
#### 题目4：Redis能做消息队列吗
```
// 轻量场景：List（LPUSH/BRPOP）或 Stream
// 可靠场景：用专门的 MQ（RabbitMQ/Kafka）
```
#### 题目5：Redis7多线程是怎么回事
```
// IO 多线程（网络读写），命令执行仍单线程
// 解决高连接数的网络瓶颈
```
#### 题目6：Keys命令有什么危险
```
// O(n) 全量遍历，阻塞 Redis（单线程）
// 用 SCAN 替代（分批游标遍历）
```