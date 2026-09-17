## 分布式锁
为什么需要->基础实现->防误删->可重入->Redisson->看门狗续期->RedLock->面试高频题
### 为什么需要分布式锁
```
// 多个服务实例（集群）同时操作共享资源
// 比如：扣库存、发券、定时任务（多实例只执行一次）

// 本地锁（synchronized/ReentrantLock）：
// 只锁当前 JVM → 多实例时无效！

// 例子：
// 订单服务部署 3 个实例
// 定时任务 3 个实例同时触发 → 重复执行！
// 需要"跨实例的锁" → 分布式锁
```
分布式锁的要求
```
// ① 互斥性：同一时刻只有一个线程持有
// ② 防死锁：持有者挂了，锁能自动释放
// ③ 可重入：同一线程可以重复获取
// ④ 高可用：Redis 挂了锁也要可靠
```
### 基础实现
```
// SETNX：不存在才设置（Set if Not Exists）

// 加锁：
SETNX lock:order 1
// 返回 1：加锁成功（key 不存在，设置成功）
// 返回 0：加锁失败（key 已存在）

// 解锁：
DEL lock:order
```
版本一：完整命令
```
// Redis 2.6.12+ 支持 SET 带参数，一个命令原子完成

// 加锁（原子）：
SET lock:order 1 NX EX 30
// NX：不存在才设置（互斥）
// EX 30：30 秒后自动过期（防死锁）

// 解锁：
DEL lock:order
```
示例代码
```
public boolean tryLock(String key, int timeoutSeconds) {
    // SET key value NX EX timeout
    String result = redis.set(key, "1", timeoutSeconds, TimeUnit.SECONDS);
    return "OK".equals(result);  // OK = 加锁成功
}

public void unlock(String key) {
    redis.delete(key);
}
```
初始版本的三个问题
```
// ① 锁过期了，业务没执行完：
//    A 拿到锁，30 秒没执行完，锁自动过期
//    B 拿到锁，A 还在执行 → 两个同时执行 → 互斥失效！

// ② 误删别人的锁：
//    A 的锁过期了 → B 拿到锁
//    A 执行完，DEL 锁 → 把 B 的锁删了！
//    C 又拿到锁 → 完全乱了

// ③ 不可重入
```
### 防误删
解决误删：删除前校验value
```
// 加锁时存"唯一标识"（UUID）
// 删除前先比较标识，是自己的才删

public class RedisLock {
    // 加锁：value 存唯一标识
    public boolean tryLock(String key, String requestId, int timeoutSeconds) {
        return "OK".equals(redis.set(key, requestId, timeoutSeconds, TimeUnit.SECONDS));
    }

    // 解锁：先查 value 是不是自己的，是才删
    public boolean unlock(String key, String requestId) {
        String value = redis.get(key);
        if (requestId.equals(value)) {
            return redis.delete(key);
        }
        return false;  // 不是自己的锁，不删
    }
}

// 使用：
String requestId = UUID.randomUUID().toString();
tryLock("lock:order", requestId, 30);
try {
    // 业务
} finally {
    unlock("lock:order", requestId);
}
```
检查+删除要原子
```
// 问题：get 比较 和 delete 两步之间可能被插队
// 解决：用 Lua 脚本保证原子

// Lua 脚本（Redis 原子执行）：
// if redis.call("get", KEYS[1]) == ARGV[1]
// then return redis.call("del", KEYS[1])
// else return 0 end

String luaScript = "if redis.call('get', KEYS[1]) == ARGV[1] " +
                   "then return redis.call('del', KEYS[1]) " +
                   "else return 0 end";

redis.execute(luaScript, key, requestId);  // 原子执行
```
### 锁续期
解决：锁过期但业务没有执行完
```
// 问题：锁 30 秒过期，业务要 60 秒 → 锁没了 → 互斥失效

// 方案一：设置足够长的过期时间
// 缺点：业务意外卡住，锁要等很久才释放（阻塞他人）

// 方案二：看门狗自动续期（Redisson 方案）
// 拿到锁后，后台线程定期给锁续期
// 业务没结束 → 一直续期
// 业务结束 → 释放锁并停止续期
```
看门狗原理（Redisson）
```
// Redisson 默认：
// ① 加锁：默认 30 秒过期
// ② 看门狗：每 10 秒（1/3 过期时间）自动续期到 30 秒
// ③ 业务执行完：释放锁，停止续期
// ④ 业务卡死/宕机：看门狗也停了 → 锁到期自动释放（防死锁）

// 类比：
// 像"心跳保活"——只要进程活着，锁就一直续期
// 进程死了，心跳停，锁自动过期
```
Redisson使用
```
// Redisson 是 Redis 分布式锁的标准实现
// 自动处理：互斥、防死锁、续期、可重入

@Autowired
private RedissonClient redissonClient;

public void deductStock() {
    // 获取锁（默认 30 秒 + 看门狗续期）
    RLock lock = redissonClient.getLock("lock:stock");

    // 尝试加锁（等待 5 秒，没拿到返回 false）
    boolean locked = lock.tryLock(5, TimeUnit.SECONDS);
    if (!locked) {
        throw new RuntimeException("系统繁忙，请重试");
    }

    try {
        // 业务逻辑
        stockService.deduct();
    } finally {
        lock.unlock();  // 释放锁
    }
}
```
Redisson处理的问题

|问题|解决|
|---|---|
|互斥|SET NX|
|防死锁|过期时间|
|误删|value 标识 + Lua|
|锁过期业务没完|看门狗续期|
|可重入|记录持有线程 + 计数|
|等待锁|tryLock 阻塞等待|
### RedLock（多节点）
单节点锁问题
```
// 如果只在一个 Redis 上加锁：
// 主节点挂了 → 主从切换 → 锁信息丢失！
// 场景：
// ① 客户端 A 在主节点加锁成功
// ② 主节点挂了，还没同步给从节点
// ③ 从节点提升为主节点（锁丢了）
// ④ 客户端 B 在新的主节点加锁成功
// → A、B 同时持有锁 → 互斥失效！
```
RedLock思路
```
// 在多个独立的 Redis 节点上加锁（如 5 个）
// 超过半数（3/5）加锁成功 → 才算获取锁成功

// 流程：
// ① 向 5 个节点依次加锁（带随机 value）
// ② 加锁成功数 >= 3（多数）→ 锁获取成功
// ③ 否则 → 释放所有已获取的锁

// 好处：单个节点挂了，其他节点还有锁 → 更可靠
```
RedLock争议
```
// ① 需要多个独立 Redis（部署成本高）
// ② 仍有争议（Martin Kleppmann 认为有缺陷）
// ③ 大多数业务用不到（单节点 + 哨兵足够）

// 结论：
// 一般业务：Redisson 单节点锁 + 主从/哨兵高可用 就够
// 超高一致性要求：才考虑 RedLock（很少用）
```
### 面试高频题
#### 题目1：分布式锁有那些实现
```
// ① Redis 分布式锁（SETNX，最常用）
// ② ZooKeeper 分布式锁（临时顺序节点）
// ③ 数据库分布式锁（悲观锁/唯一索引）

// 对比：
// Redis：性能好，实现简单 ✅
// ZK：可靠性高，性能差
// DB：简单但性能差
```
#### 题目2：SETNX加锁需要注意什么
```
// ① 必须设过期时间（防死锁）
// ② value 用唯一标识（防误删）
// ③ 删除前校验 + Lua 原子操作
// ④ 业务长时用看门狗续期
```
#### 题目3：锁过期了业务没执行完怎么办
```
// ① 看门狗续期（Redisson 自动）
// ② 业务拆小，尽量在过期时间内完成
// ③ 过期时间设足够长
```
#### 题目4：怎么防误删别人的锁
```
// value 存唯一标识（UUID）
// 删除前 compare + Lua 原子删除
```
#### 题目5：Redisson比手写锁好在哪
```
// 看门狗续期、可重入、等待阻塞、原子 Lua
// 生产直接用 Redisson，不要手写
```
#### 题目6：Redis挂了怎么办
```
// ① 主从 + 哨兵高可用（Redis 不挂）
// ② RedLock 多节点（多数派）
// ③ 降级：加锁失败返回失败/降级处理
```

