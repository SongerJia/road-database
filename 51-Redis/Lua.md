## 事务与Lua
Redis事务是什么->MULTI/EXEC->事务的局限->Lua脚本->Lua实现原子性->对比->面试高频题
### Redis事务是什么
Redis事务：一次执行多条命令，保证这些命令连续执行，不被其他命令插队。
和MySQL事务的区别
```
// MySQL 事务：ACID（原子性、一致性、隔离性、持久性）
// Redis 事务：
// ① 没有"回滚"（出错不撤销前面命令）
// ② 没有隔离级别（单线程执行，天然隔离）
// ③ 本质：命令的"批量排队执行"

// 核心保证：
// ① 一个事务的命令连续执行（中间不插队）
// ② 命令都执行或都排队（但不保证不部分失败）
```
### MULTI/EXEC
基本用法
```
# ① MULTI：开始事务（排队）
MULTI
# OK

# ② 排队命令
SET user:1 "张三"
QUEUED
INCR count
QUEUED

# ③ EXEC：执行所有命令
EXEC
# 1) OK
# 2) (integer) 1

# 取消事务
DISCARD
```
事务执行流程
```
// ① MULTI：开启事务，之后命令进入"队列"（不执行）
// ② 命令入队：返回 QUEUED（排队成功）
// ③ EXEC：一次性执行所有排队命令
// ④ DISCARD：放弃事务（清空队列）
```
Java中使用
```
// Spring Data Redis
redisTemplate.execute(new SessionCallback<Object>() {
    @Override
    public Object execute(RedisOperations operations) throws DataAccessException {
        operations.multi();                    // 开始事务
        operations.opsForValue().set("user:1", "张三");
        operations.opsForValue().increment("count");
        return operations.exec();              // 执行事务
    }
});
```
### 事务的错误处理
入队时错误（语法错误）
```
MULTI
SET user:1 "张三"
QUEUED
INCR user:1          # 类型错误（user:1 是字符串，INCR 会失败）
QUEUED                # 注意：排队时不检查类型，返回 QUEUED
EXEC
# 1) OK
# 2) (error) WRONGTYPE  ← 执行时才发现错误
# 结果：SET 执行了，INCR 失败了 → 没有回滚！
```
执行时报错
```
// Redis 事务没有回滚机制！
// 一条命令失败，不影响其他命令执行
// 和 MySQL 完全不同（MySQL 会全部回滚）

// 为什么 Redis 不支持回滚？
// ① Redis 设计简单优先
// ② 回滚会增加复杂度
// ③ Redis 认为命令失败是"编程错误"（应该避免）
```
### 面试高频

> **Q:** "Redis 事务和 MySQL 事务的区别？" 
> **A:** "MySQL 有 ACID，出错会回滚；Redis 事务只是把命令排队连续执行，没有回滚。一条命令失败不影响其他命令。Redis 事务保证的是'连续执行不插队'，不保证'全成功或全失败'。"
### Redis事务的局限性
```
// ① 没有回滚（部分失败）
// ② 不能基于"读到的值"做条件判断：
//    WATCH 可以解决（乐观锁）
// ③ 复杂逻辑难写（if-else 不行）
```
WATCH（乐观锁）
```
# WATCH：监视 key，如果被其他客户端修改，事务失败
WATCH balance        # 监视 balance
MULTI
DECR balance 100
EXEC
# 如果 WATCH 期间 balance 被改 → EXEC 返回 nil（事务放弃）
# 相当于"读-改-写"的乐观锁

// 场景：转账时，检查余额够不够
// WATCH + 事务 = 先读后写的安全保证

// 流程：
// ① WATCH balance
// ② 读 balance（在 MULTI 前）
// ③ 判断足够 → MULTI → DECR → EXEC
// ④ 期间 balance 被改 → EXEC 失败 → 重试

// 但：WATCH 复杂、重试麻烦
// 更简单的方案：Lua 脚本（原子执行）
```
### Lua脚本
为什么用Lua
```
// 事务的局限：
// ① 无回滚
// ② 不能写复杂逻辑
// ③ WATCH 重试麻烦

// Lua 脚本：
// ① Redis 支持执行 Lua 脚本（内置 Lua 引擎）
// ② 脚本整体原子执行（不会被其他命令插队）
// ③ 支持逻辑判断（if-else、循环）
// ④ 出错可以控制

// 结论：Redis 中"多步操作要原子" → 用 Lua
```
基本用法
```
# EVAL 执行脚本
EVAL "return 1 + 1" 0
# (integer) 2

# 带参数
EVAL "return KEYS[1] .. ':' .. ARGV[1]" 1 user:1 "张三"
# "user:1:张三"

# 调用 Redis 命令
EVAL "return redis.call('get', KEYS[1])" 1 user:1
# 获取 user:1 的值
```
经典场景：扣库存
```
// 需求：扣库存，不能扣成负数
// 多步操作：检查库存 > 0 → 减库存
// 必须原子（否则超卖）

// Lua 脚本：
// local stock = redis.call('get', KEYS[1])
// if tonumber(stock) <= 0 then
//     return -1          -- 库存不足
// end
// redis.call('decr', KEYS[1])
// return 1               -- 扣减成功

String luaScript =
    "local stock = redis.call('get', KEYS[1]) " +
    "if tonumber(stock) <= 0 then return -1 end " +
    "redis.call('decr', KEYS[1]) " +
    "return 1";

// 执行
Long result = redisTemplate.execute(
    new DefaultRedisScript<>(luaScript, Long.class),
    Collections.singletonList("stock:sku:100")
);

if (result == -1) {
    throw new RuntimeException("库存不足");
}
// 原子执行：检查 + 扣减 一气呵成，不会超卖
```
Lua的好处
```
// ① 原子性：整个脚本一条龙执行（类似单命令）
// ② 网络优化：多条命令一次网络请求
// ③ 逻辑能力：if/while 等
// ④ 复用：脚本可以缓存（SCRIPT LOAD）

// 实际项目：复杂原子操作用 Lua，比 MULTI 好用
```
### 事务与Lua对比
|对比|MULTI/EXEC 事务|Lua 脚本|
|---|---|---|
|**原子性**|连续执行（无插队）|整体原子 ✅|
|**回滚**|❌ 无回滚|可自己控制|
|**逻辑**|❌ 不能写逻辑|✅ if/while|
|**条件判断**|WATCH（复杂）|✅ 脚本内判断|
|**使用场景**|简单批量|复杂原子操作|
|**推荐**|简单场景|✅ 生产更常用|
### 面试高频

> **Q:** "Redis 实现原子操作用什么？" 
> **A:** "Lua 脚本。Redis 事务（MULTI/EXEC）不能写逻辑、没有回滚；Lua 脚本整体原子执行，支持 if-else，适合扣库存、限流等复杂原子操作。"
### 面试高频题
#### 题目1：Redis事务是什么？
```
// MULTI 开始，命令排队，EXEC 一起执行
// 保证连续执行不插队
// 没有回滚
```
#### 题目2：Redis事务和MySQL事务的区别
```
// MySQL：ACID + 回滚
// Redis：排队连续执行，无回滚，无隔离问题（单线程）
```
#### 题目3：为什么Redis不支持回滚
```
// 设计简单优先
// 命令失败视为编程错误
// 回滚复杂度高
```
#### 题目4：Lua脚本有什么好处
```
// 原子执行、支持逻辑、减少网络开销
```
#### 题目5：扣库存为什么用Lua
```
// 检查 + 扣减必须原子（防超卖）
// MULTI 不能做条件判断
// Lua 一条龙完成
```
#### 题目6：WATCH是什么
```
// 乐观锁：监视 key，被修改则事务失败
// 类似"读-改-写"的并发控制
```