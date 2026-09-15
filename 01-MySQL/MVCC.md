## MVCC
MVCC是什么->依赖的基础->快照读vs当前读->ReadView->可见性判断->快照读流程->隔离级别的实现->面试高频题
### MVCC是什么
Multi-Version Concurrency Control：通过保存数据的历史版本，让读操作不加锁也能读到一致的数据快照，实现高并发的读写分离。
核心思想
```
// 传统：读写互斥（加锁）
// MVCC：读不加锁，读历史版本，写加锁
// → 读和写互不阻塞！

// 类比：版本管理
// 每次修改生成一个新版本，旧版本保留
// 读操作选择"自己可见的版本"读取
```
MVCC解决了什么
```
// ① 读写互不阻塞（读不加锁）→ 高并发
// ② 同一事务内多次读一致（可重复读）
// ③ 解决不可重复读、幻读（配合间隙锁）
// 只适用于：READ COMMITTED 和 REPEATABLE READ
```
### 依赖的基础
隐藏列（row的三列）
```
// InnoDB 每行数据有三个隐藏列：
// ① DB_TRX_ID：最近修改该行的事务 ID（6 字节）
// ② DB_ROLL_PTR：回滚指针（指向 undo log 的旧版本）（7 字节）
// ③ DB_ROW_ID：隐藏主键（没有主键时才存在）（6 字节）
```
undo log 回滚日志
```
// 每行数据的修改会生成一个"版本链"：
// 最新版本 ← DB_ROLL_PTR ← 旧版本 ← 更旧版本...

// 示例（事务 100 修改了 id=1 的行的 name）：
// 版本链（从旧到新）：
// v1 (tx=50) → v2 (tx=80) → v3 (tx=100, 当前)

// 每个版本记录在 undo log 中
// 通过 DB_ROLL_PTR 串联成链

版本链结构图
一行数据的版本链（undo log 串联）： 并不会一直存在，如果没有任何事务需要，purge线程就会把旧版本和undo记录回收

┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  v1 (tx=50)    │←───│  v2 (tx=80)    │←───│  v3 (tx=100)   │
│  name='A'      │    │  name='B'      │    │  name='C'      │(当前)
│  DB_ROLL_PTR → │    │  DB_ROLL_PTR → │    │  DB_ROLL_PTR → │
└────────────────┘    └────────────────┘    └────────────────┘
     ↑通过指针找到旧版本（回滚/读历史用）
```
### 快照读 vs 当前读
```
// ① 快照读（Snapshot Read）—— 不加锁
// 普通 SELECT
// 读取事务开始时的"快照版本"
// 用 MVCC，不加锁

// ② 当前读（Current Read）—— 加锁
// SELECT ... FOR UPDATE
// SELECT ... LOCK IN SHARE MODE
// UPDATE / DELETE / INSERT
// 读取最新版本，加锁

// 示例：
SELECT * FROM users WHERE id = 1;        -- 快照读（不加锁）
SELECT * FROM users WHERE id = 1 FOR UPDATE;  -- 当前读（加行锁）
```
为什么快照读不加锁
```
// ① 读的是历史版本（ReadView 可见的版本）
// ② 不需要和其他事务竞争
// ③ 读写互不阻塞 → 并发高

// 代价：可能读到"旧数据"（不是最新）
// 但同一事务内保证一致性（可重复读）
```
### Read View
什么是ReadView 读视图
```
// ReadView：事务进行快照读时生成的"可见性快照"
// 记录当前活跃事务（未提交）的 ID 列表
// 用来判断"哪个版本可见"

// ReadView 包含四个关键信息：
// ① m_ids：生成时所有活跃（未提交）事务的 ID 列表
// ② min_trx_id：活跃事务中最小的 ID
// ③ max_trx_id：下一个将分配的事务 ID（max(活跃) + 1）
// ④ creator_trx_id：创建 ReadView 的事务自己的 ID
```
可见性判断规则
```
// 一个版本的事务 ID = trx_id，判断是否可见：

// ① trx_id < min_trx_id
//    → 事务在 ReadView 生成前已提交 → ✅ 可见

// ② trx_id >= max_trx_id
//    → 事务在 ReadView 生成后才开始 → ❌ 不可见

// ③ min_trx_id <= trx_id < max_trx_id
//    → 判断是否在 m_ids（活跃列表）中
//    → 在列表中：未提交 → ❌ 不可见
//    → 不在列表中：已提交 → ✅ 可见

// ④ trx_id == creator_trx_id
//    → 自己修改的 → ✅ 可见（能读到自己改的）
```
判断流程图
```
判断版本 trx_id 是否可见：
    │
    ├── trx_id == creator_trx_id？ → ✅ 可见（自己改的）
    │
    ├── trx_id < min_trx_id？ → ✅ 可见（已提交）
    │
    ├── trx_id >= max_trx_id？ → ❌ 不可见（未开始）
    │
    └── min <= trx_id < max？
        ├── 在 m_ids 中？ → ❌ 不可见（活跃未提交）
        └── 不在 m_ids 中？ → ✅ 可见（已提交）
```
### 快照读完整流程
查找可见版本
```
// 场景：事务 B 快照读 id=1 的行
// 版本链：v1(tx=50) → v2(tx=80) → v3(tx=100)
// 事务 B 的 ReadView：m_ids=[100], min=100, max=101, creator=90

// ① 从最新版本 v3（tx=100）开始判断
// 100 == max? 100 >= 101? 否
// 100 在 m_ids 中？是（未提交）→ ❌ 不可见

// ② 沿版本链找 v2（tx=80）
// 80 < min(100)？是 → ✅ 可见

// ③ 返回 v2 的数据（name='B'）
// 事务 B 读到的是 v2，不是最新 v3！
```
关键结论
```
// 快照读 = 顺着版本链，找到第一个"可见"的版本
// 未提交事务的修改对其他人不可见（读旧版本）
// 自己事务的修改对自己可见（creator_trx_id）
```
### 隔离级别的实现
RC vs RR
```
// 核心区别：ReadView 的生成时机

// READ COMMITTED：
// 每次快照读都生成新的 ReadView
// → 每次读都是最新的已提交状态
// → 存在不可重复读（两次读可能不同）

// REPEATABLE READ：
// 第一次快照读生成 ReadView，之后复用
// → 整个事务内读同一个快照
// → 可重复读（两次读一致）
```
对比演示
```
// 场景：事务 A 修改并提交，事务 B 两次读

// READ COMMITTED：
// B 第一次读：ReadView1（A 未提交）→ 读旧值
// A 提交后
// B 第二次读：ReadView2（A 已提交）→ 读新值
// → B 两次读到不同数据（不可重复读 ❌）

// REPEATABLE READ：
// B 第一次读：ReadView1（A 未提交）→ 读旧值
// A 提交后
// B 第二次读：复用 ReadView1 → 还是旧值
// → B 两次读到相同数据（可重复读 ✅）
// → 即使 A 已提交，B 也看不到（快照固定）
```
### 面试高频

> **Q:** "MVCC 怎么实现可重复读？" 
> **A:** "REPEATABLE READ 下，事务第一次快照读时生成 ReadView，后续所有快照读都复用同一个 ReadView。所以即使其他事务提交了新数据，本事务看到的还是第一次读时的快照，实现了可重复读。"

> **Q:** "READ COMMITTED 和 REPEATABLE READ 的 MVCC 区别？" 
> **A:** "RC 每次快照读生成新 ReadView（读最新已提交）；RR 第一次生成后复用（读固定快照）。这就是 RC 有不可重复读而 RR 没有的原因。"
### MVCC与锁的配合
当前读如何解决幻读
```
// 快照读：靠 MVCC（读历史版本）
// 当前读：靠 Next-Key Lock（锁范围，防止插入）

// 幻读的本质：当前读 + 其他事务插入新行
// 解决：
// ① 当前读（SELECT FOR UPDATE/UPDATE/DELETE）加 Next-Key Lock
// ② 锁住范围（含间隙）→ 其他事务无法插入 → 无幻读

// 注意：普通快照读（SELECT）本身不会幻读（读固定快照）
```
MVCC和锁的分工

|场景|机制|
|---|---|
|普通 SELECT（快照读）|MVCC（不加锁）|
|SELECT FOR UPDATE（当前读）|Next-Key Lock|
|UPDATE / DELETE|Next-Key Lock|
|INSERT|插入意向锁等|
### 面试高频题
#### 题目1：MVCC是什么，解决了什么问题
```
// 多版本并发控制
// 读历史版本，读写互不阻塞
// 解决不可重复读、幻读（配合锁）
```
#### 题目2：MVCC的3个基础是什么
```
// 隐藏列（DB_TRX_ID、DB_ROLL_PTR）
// undo log（版本链）
// ReadView（可见性快照）
```
#### 题目3：快照读和当前读的区别
```
// 快照读：普通 SELECT，不加锁，读历史版本
// 当前读：FOR UPDATE/UPDATE/DELETE，加锁，读最新
```
#### 题目4：Read View怎么判断可见性
```
// 四条规则：自己可见、小于 min 可见、
// 大于等于 max 不可见、在活跃列表不可见
```
#### 题目5：RC和RR下MVCC区别？
```
// RC：每次生成新 ReadView
// RR：第一次生成后复用
```
#### 题目6：MVCC和锁怎么配合
```
// 快照读用 MVCC，当前读用 Next-Key Lock
// 共同解决幻读
```

