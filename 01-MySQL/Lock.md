## 锁机制
锁的分类->表锁vs行锁->行锁类型->间隙锁与Next-Key Lock->乐观锁vs悲观锁->死锁->面试高频题
### 锁的分类
按粒度分
```
// ① 表锁（Table Lock）—— 锁整张表
// ② 行锁（Row Lock）—— 锁单行
// ③ 页锁 —— 锁一页（很少用）
```
按类型分
```
// ① 共享锁（Shared Lock，S 锁 / 读锁）
// ② 排他锁（Exclusive Lock，X 锁 / 写锁）

// 兼容性：
// S 和 S：兼容（多个读可同时）
// S 和 X：互斥
// X 和 X：互斥
```

|兼容性|共享锁 S|排他锁 X|
|---|---|---|
|**共享锁 S**|✅ 兼容|❌ 互斥|
|**排他锁 X**|❌ 互斥|❌ 互斥|
加锁语句
```
-- 共享锁（读锁）
SELECT * FROM t WHERE id = 1 LOCK IN SHARE MODE;

-- 排他锁（写锁）
SELECT * FROM t WHERE id = 1 FOR UPDATE;
UPDATE t SET ... WHERE id = 1;   -- 自动加 X 锁
DELETE FROM t WHERE id = 1;      -- 自动加 X 锁
INSERT INTO t ...;               -- 自动加 X 锁
```
### 表锁 vs 行锁
表锁
```
-- 手动加表锁
LOCK TABLES t READ;     -- 读锁（共享）
LOCK TABLES t WRITE;    -- 写锁（排他）
UNLOCK TABLES;          -- 解锁

-- 特点：
-- ① 粒度大，开销小
-- ② 并发差（写锁阻塞所有）
-- MyISAM 只有表锁
```
行锁
```
-- 特点：
-- ① 粒度小，并发好
-- ② 开销大（要定位行）
-- ③ 死锁可能

-- 只有 InnoDB 支持
-- 加锁前提：查询走索引
-- 如果不走索引 → 行锁升级为表锁（扫描全表）
```
### 面试高频

> **Q:** "行锁什么时候会升级成表锁？" 
> **A:** "当查询没走索引（全表扫描）时，InnoDB 会锁住扫描到的所有行，相当于表锁。所以必须给 WHERE 条件加索引，否则行锁失效、并发性能下降。"
### 行锁的类型
InnoDB三种行锁（按锁定范围）
```
// ① Record Lock（记录锁）
// 锁单行记录

// ② Gap Lock（间隙锁）
// 锁一个"范围"（间隙），防止插入

// ③ Next-Key Lock（临键锁）
// 记录锁 + 间隙锁的组合
// 锁住记录和它前面的间隙
```
Record Lock 记录锁
```
-- 锁住 id=5 这一行
SELECT * FROM t WHERE id = 5 FOR UPDATE;
-- 其他事务无法修改/删除 id=5，但可以插入 id=6
```
Gap Lock 间隙锁
```
-- 表数据：id = 1, 3, 5, 8
-- 查询 id 在 (3, 5) 范围（无匹配记录）：
SELECT * FROM t WHERE id BETWEEN 4 AND 4 FOR UPDATE;
-- 间隙锁锁住 (3, 5) 的间隙
-- 其他事务无法插入 id=4（被间隙锁挡住）
-- 但 3 和 5 的记录本身不受影响
```
Next-Key Lock 临键锁
```
-- 表数据：id = 1, 3, 5, 8
-- 查询 id >= 3 AND id <= 5：
SELECT * FROM t WHERE id = 5 FOR UPDATE;
-- Next-Key Lock：锁住 (3, 5] 区间
-- 即：id=5 的记录 + (3, 5) 的间隙
-- 其他事务：
-- 不能修改 id=5 ✅（记录锁）
-- 不能插入 id=4 ✅（间隙锁）
-- 可以操作 id<3 或 id>5 ✅

作用
// ① 防止幻读（当前读场景）
// ② 防止插入到被锁的间隙
// ③ 解决 RR 隔离级别下的幻读

// 注意：
// ① 只在 REPEATABLE READ 默认生效
// ② READ COMMITTED 下间隙锁失效（只锁记录）
// ③ 唯一索引等值查询会退化为记录锁（无间隙可锁）
```
### 间隙锁与幻读
```
-- 事务 A（当前读）：
SELECT * FROM t WHERE id > 10 FOR UPDATE;
-- 返回：id=12, 15

-- 事务 B（并发）：
INSERT INTO t (id) VALUES (13);  -- 尝试插入 13

-- 没有间隙锁：B 插入成功 → A 再查多了 13 → 幻读！
-- 有间隙锁：B 被阻塞（(10, 15) 间隙被锁）→ 无幻读 ✅
```
间隙锁 vs行锁分工

|场景|用的锁|
|---|---|
|锁定已有记录|Record Lock|
|防止插入到间隙|Gap Lock|
|锁记录 + 防插入|Next-Key Lock|
### 乐观锁vs悲观锁
Pessimistic Lock 悲观锁
```
-- 认为一定会冲突，先加锁再操作
-- 数据库层面：行锁、表锁
SELECT * FROM t WHERE id = 1 FOR UPDATE;
-- 事务 A 锁住 id=1
-- 事务 B 操作 id=1 被阻塞，直到 A 提交

-- 适用：写冲突频繁、强一致场景
-- 缺点：阻塞、性能差
```
Optimicstic Lock 乐观锁
```
// 认为很少冲突，不加锁，更新时检查版本

// ① 版本号方式
UPDATE t SET name = 'B', version = version + 1
WHERE id = 1 AND version = 1;
-- 影响行数为 0 → 版本不对 → 更新失败（重试）

// ② CAS 方式（compare and set）
UPDATE t SET count = count - 1
WHERE id = 1 AND count = 10;
-- 只有 count 还是 10 才减，否则失败

// 适用：读多写少、冲突少场景
// 优点：无阻塞、并发高
// 缺点：冲突多时大量重试
```

|对比|悲观锁|乐观锁|
|---|---|---|
|**思想**|先锁后做|做了再检查|
|**实现**|FOR UPDATE|version/CAS|
|**冲突处理**|阻塞等待|失败重试|
|**并发**|低|高|
|**适用**|写多、强一致|读多、冲突少|
|**数据库**|数据库机制|应用层实现|
### 死锁
什么是死锁
```
// 两个事务互相持有对方需要的锁，互相等待

// 场景：
// 事务 A：UPDATE t1 → 拿到 t1 的锁
// 事务 B：UPDATE t2 → 拿到 t2 的锁
// 事务 A：UPDATE t2 → 等 B 释放 t2 锁（阻塞）
// 事务 B：UPDATE t1 → 等 A 释放 t1 锁（阻塞）
// → 互相等待，死锁！

-- 事务 A：
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 锁 id=1
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- 等 id=2...

-- 事务 B：
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 锁 id=2
UPDATE accounts SET balance = balance + 100 WHERE id = 1;  -- 等 id=1...

-- 结果：A 等 2，B 等 1 → 死锁！
```
MySQL怎么处理死锁
```
// ① 自动检测：死锁检测（等待图）
// ② 回滚代价小的事务（undo log 少的）
// ③ 报错：ERROR 1213: Deadlock found when trying to get lock

// 注意：MySQL 会回滚一个事务，另一个继续
// 应用层要捕获死锁异常并重试
```
排查死锁
```
-- 查看最近死锁信息
SHOW ENGINE INNODB STATUS;
-- LATEST DETECTED DEADLOCK 部分
-- 能看到：两个事务的 SQL、持有的锁、等待的锁
```
避免死锁
```
// ① 固定加锁顺序（先 id 小的，再 id 大的）
// ② 尽量缩小事务范围（减少锁持有时间）
// ③ 避免大事务
// ④ 合理索引（避免锁太多行）
// ⑤ 用乐观锁替代悲观锁（无锁）
```
### 面试高频题
#### 题目1：共享锁和排他锁
```
// 共享锁（读锁）：多个可同时
// 排他锁（写锁）：只能一个
// 读读兼容，读写/写写互斥
```
#### 题目2：三种行数
```
// Record Lock（记录锁）：锁单行
// Gap Lock（间隙锁）：锁间隙防插入
// Next-Key Lock（临键锁）：记录+间隙组合
```
#### 题目3：间隙锁什么时候失效
```
// ① READ COMMITTED 下不生效（只锁记录）
// ② 唯一索引等值查询（无间隙可锁）
```
#### 题目4：乐观锁和悲观锁
```
// 悲观：FOR UPDATE，冲突先加锁
// 乐观：version/CAS，更新时检查
```
#### 题目5：死锁怎么处理
```
// MySQL 自动检测，回滚代价小的事务
// 应用层捕获重试
// 避免：固定顺序、小事务
```
#### 题目6：行锁为什么需要索引
```
// 行锁是靠索引定位行的
// 没有索引 → 全表扫描 → 锁全部行 → 变相表锁
```

