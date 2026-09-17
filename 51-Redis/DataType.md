## 数据类型与底层编码
五种数据类型->底层编码总览->String->List->Hash->Set->ZSet->编码转换->应用场景->面试高频题
### 五种数据类型
| 类型         | 存储     | 特点        | 典型应用        |
| ---------- | ------ | --------- | ----------- |
| **String** | 字符串/数值 | 最常用，可自增   | 缓存、计数器、分布式锁 |
| **List**   | 有序列表   | 头尾操作 O(1) | 消息队列、时间线    |
| **Hash**   | 键值对映射  | 适合存对象     | 用户信息、商品信息   |
| **Set**    | 无序集合   | 去重、交并差    | 标签、共同好友     |
| **ZSet**   | 有序集合   | 按分数排序     | 排行榜、优先级     |
```
# String
SET name "张三" / GET name

# List
LPUSH queue task1 / RPUSH queue task2 / LRANGE queue 0 -1

# Hash
HSET user:1 name "张三" age 25
HGET user:1 name

# Set
SADD tag:java "spring" / SINTER tag:java tag:web

# ZSet
ZADD rank 90 "张三" 80 "李四" / ZREVRANGE rank 0 -1
```
### 底层编码总览
```
// Redis 每种数据类型，根据数据量/大小，选择不同的底层编码

// 5 种类型对应的底层实现：
// String → int / embstr / raw（SDS）
// List → quicklist（3.2+）／ 7.0+ listpack
// Hash → 压缩列表 / 哈希表
// Set → 整数集合 / 哈希表
// ZSet → 压缩列表 / 跳表+哈希表

// 查看编码：
OBJECT ENCODING key
```

|类型|小数据|大数据|
|---|---|---|
|String|int / embstr|raw（SDS）|
|List|quicklist（压缩块）|quicklist|
|Hash|压缩列表|哈希表|
|Set|整数集合|哈希表|
|ZSet|压缩列表|跳表 + 哈希表|
### String 与SDS
Simple Dynamic String
```
// Redis 的 String 底层用 SDS，不是 C 字符串
// 结构：
// struct sdshdr {
//     int len;      // 已用长度
//     int alloc;    // 分配容量
//     char buf[];   // 字符数组
// };
```
SDS比C字符串好在哪
```
// ① 长度 O(1)：
// C 字符串要遍历到 '\0' 才知道长度（O(n)）
// SDS 直接读 len（O(1)）

// ② 避免缓冲区溢出：
// C 字符串拼接前要手动检查空间
// SDS 自动检查，空间不够自动扩容

// ③ 减少内存重分配：
// C 字符串每次变长都要重新分配
// SDS 空间预分配（扩容时多分配一些）→ 减少分配次数

// ④ 二进制安全：
// C 字符串以 '\0' 结束，不能存二进制
// SDS 用 len 记录长度，可以存任意二进制数据

// ⑤ 惰性空间释放：
// 缩短时不立即释放空间，留作下次使用
```
String的三种编码
```
// ① int：纯数字（Redis 直接存数字）
SET num 100
OBJECT ENCODING num  → int

// ② embstr：短字符串（<= 44 字节，一次分配）
SET name "zhang"
OBJECT ENCODING name → embstr

// ③ raw：长字符串（> 44 字节，SDS）
SET long "a" * 100
OBJECT ENCODING long → raw

// 优化原因：embstr 一次分配内存（更省），raw 两次分配 一次分配redisObject,一次分配SDS
```
### List与quickList
```
// Redis 3.2 之前：
// 小数据 → 压缩列表（ziplist）
// 大数据 → 双向链表（linkedlist）

// Redis 3.2+：
// 统一用 quicklist = 压缩列表 + 双向链表 的组合
```
quickList结构
```
// quicklist = 多个压缩列表（ziplist）通过双向链表连接

// 结构：
// 链表节点（zipnode）→ 每节点是一个小压缩列表
// [ziplist] <-> [ziplist] <-> [ziplist]
//    ↑ 每个 ziplist 存一部分元素

// 好处：
// ① 双向链表：头尾操作 O(1)
// ② 压缩列表：内存紧凑（每块连续）
// ③ 平衡内存和性能
```
为什么用quickList
```
// 纯链表：每个节点有前后指针（内存浪费）
// 纯压缩列表：插入删除要移动数据（大数据慢）
// quicklist：链表管理 + 分块压缩 → 折中方案

// Redis 7.0+：用 listpack 替代 ziplist（更安全）
```
### Hash
两种编码
```
// ① 压缩列表（ziplist）：
// 条件：字段数 < 512 且 每个字段值 < 64 字节
// 内存紧凑，省内存

// ② 哈希表（hashtable）：
// 条件：超过 ziplist 阈值
// 查找 O(1)

// 转换：
// 小 Hash → 压缩列表
// 大 Hash → 哈希表（自动升级）

HSET user:1 name "张三"
OBJECT ENCODING user:1  → ziplist（小）

// 加很多字段后 → hashtable
```
应用：对象存储
```
# 用户信息用 Hash（比 String+JSON 好）
HSET user:1 name "张三" age 25 city "北京"
HGET user:1 name     # 单字段获取（不用整个 JSON 解析）
HGETALL user:1
```
### Set
两种编码
```
// ① 整数集合（intset）：
// 条件：全是整数 且 数量 < 512
// 用数组存储，排序 + 二分查找

// ② 哈希表（hashtable）：
// 条件：含非整数 或 数量大
// 用哈希表，value 为 null

// 转换：加入非整数 → 升级为哈希表
```
应用
```
# ① 去重
SADD visited user:1 user:2 user:1  # user:1 只存一次
SCARD visited    # 数量

# ② 集合运算
SADD tag:java "spring" "jvm" "juc"
SADD tag:web "spring" "vue" "nginx"
SINTER tag:java tag:web    # 交集：spring
SUNION tag:java tag:web    # 并集
SDIFF tag:java tag:web     # 差集：jvm,juc

# 应用：共同好友、标签筛选
```
### ZSet与跳表
两种编码
```
// ① 压缩列表：小数据
// ② 跳表（skiplist）+ 哈希表：大数据（默认）

// 跳表：支持按分数排序、范围查询 O(log n)
// 哈希表：支持按 member 查分数 O(1)
```
什么是跳表
```
// 跳表 = 多层链表（有序链表 + 索引层）

// 结构：
// 层3:  1 ────────────────→ 9
// 层2:  1 ────→ 5 ────────→ 9
// 层1:  1 ──→ 3 ──→ 5 ──→ 7 ──→ 9
// 层0:  1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9（全量链表）

// 查找：
// 从最高层开始，跳过大段 → 逐层下降
// 查找 8：层3: 1→9（8<9，退到1）→ 层2: 1→5→9 → 层1: 5→7→9 → 层0: 7→8 ✅
// 跳过的节点少，O(log n)

// 对比红黑树：
// 跳表实现简单、范围查询友好（有链表指针）
// 红黑树实现复杂
// Redis 选择跳表 ✅
```
跳表vs红黑树vsB+树
```
// 跳表：实现简单、范围查询好、O(log n)
// 红黑树：实现复杂、无范围查询便利
// B+ 树：磁盘友好（页），内存中没优势
// Redis 是内存数据库 → 跳表最合适
```
ZSet应用
```
# 排行榜
ZADD leaderboard 90 "张三" 85 "李四" 95 "王五"
ZREVRANGE leaderboard 0 -1   # 降序：王五 张三 李四
ZSCORE leaderboard "张三"     # 查分数 90
ZINCRBY leaderboard 5 "张三"  # 加 5 分（动态榜）
ZRANGEBYSCORE leaderboard 80 100  # 按分数范围查
```
### 编码转换
转换条件
```
// 所有编码转换都是"自动"的，从小结构升级到大结构

// Hash：ziplist → hashtable（字段>512 或 值>64 字节）
// List：quicklist（内部块可调）
// Set：intset → hashtable（非整数 或 >512）
// ZSet：ziplist → skiplist（元素>128 或 值>64 字节）

// 注意：只能从小到大，不能降级
// （ziplist → hashtable 后，删到小数据也不会回退）
```
参数配置
```
# redis.conf
hash-max-ziplist-entries 512    # Hash 小结构阈值
hash-max-ziplist-value 64
set-max-intset-entries 512      # Set 整数集合阈值
zset-max-ziplist-entries 128    # ZSet 小结构阈值
list-max-ziplist-size 128       # quicklist 每块大小
```

### 应用场景
| 类型         | 场景          | 示例          |
| ---------- | ----------- | ----------- |
| **String** | 缓存、计数器、分布式锁 | 商品库存、接口限流   |
| **List**   | 消息队列、时间线    | 待办列表、Feed 流 |
| **Hash**   | 对象存储        | 用户信息、购物车    |
| **Set**    | 去重、集合运算     | 共同好友、标签     |
| **ZSet**   | 排行榜、优先级     | 热榜、延迟队列     |
```
面试官："Redis 有哪些数据类型？各自应用场景？"

"5 种：
① String：最常用，缓存、计数器（INCR）、分布式锁（SETNX）
② List：双向链表，消息队列、最新列表（LPUSH+LRANGE）
③ Hash：存对象（用户、商品），HGET 取单字段
④ Set：去重、交并差（共同好友、标签）
⑤ ZSet：有序集合（跳表），排行榜、热榜、延迟队列

底层编码会根据数据量自动选择：
小数据用压缩列表/整数集合（省内存），大数据用哈希表/跳表（快）。"
```
