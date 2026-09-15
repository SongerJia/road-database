## 存储引擎
存储引擎是什么->InnoDB vs MyISAM对比->InnoDB三大特性->引擎选择->面试高频题
### 存储引擎是什么
存储引擎：MySQL中负责数据的存储、索引、事务、锁的实现层。插件化架构，可以按表选择不同的引擎。
```
-- 查看引擎
SHOW ENGINES;

-- 默认引擎
SHOW VARIABLES LIKE 'default_storage_engine';  -- InnoDB

-- 建表指定
CREATE TABLE t (id INT) ENGINE=InnoDB;
CREATE TABLE t2 (id INT) ENGINE=MyISAM;
```
常见的引擎

|引擎|说明|现状|
|---|---|---|
|**InnoDB**|事务、行锁、崩溃恢复|✅ 默认（5.5+）|
|**MyISAM**|简单、快、无事务|⚠️ 已被 InnoDB 取代|
|**Memory**|内存表（重启丢数据）|少量使用|
|**Archive**|只支持插入和查询|归档场景|
### InnoDB vs MyISAM对比
|对比维度|InnoDB|MyISAM|
|---|---|---|
|**事务**|✅ 支持|❌ 不支持|
|**行级锁**|✅|❌（只支持表锁）|
|**外键**|✅|❌|
|**崩溃恢复**|✅（redo log）|❌（可能损坏）|
|**索引结构**|B+ 树（聚簇索引）|B+ 树（非聚簇）|
|**主键必须**|✅ 必须有聚簇索引|❌ 可以没有|
|**数据存储**|.ibd（数据和索引一起）|.MYD（数据）+ .MYI（索引）|
|**全文索引**|✅（5.6+）|✅|
|**压缩表**|❌|✅|
|**适用场景**|业务数据、OLTP|读多写少、只读报表|
事务差异
```
-- InnoDB 支持事务
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- 要么全成功，要么全失败

-- MyISAM 不支持事务
-- 没有 COMMIT/ROLLBACK，每条语句立即生效
```
锁粒度差异
```
// MyISAM：表锁（整张表加锁）
// ① 读锁（共享）：其他读可以，写阻塞
// ② 写锁（排他）：读和写都阻塞
// 并发写差

// InnoDB：行锁（只锁涉及的行）
// ① 不同行可以并发写
// ② 配合 MVCC 实现高并发读
// 并发写好

// 场景：UPDATE 1 行
// MyISAM：整表锁，其他写全部阻塞
// InnoDB：只锁这 1 行，其他行写不受影响
```
索引结构差异
```
// MyISAM：非聚簇索引（索引和数据分离）
// ① 索引文件（.MYI）存 B+ 树，叶子存"数据行的磁盘地址"
// ② 数据文件（.MYD）存真实数据
// ③ 主键索引和二级索引结构一样

// InnoDB：聚簇索引（索引和数据一起）
// ① 主键索引的叶子直接存"完整数据行"
// ② 二级索引的叶子存"主键值"（回表）
// ③ 必须有主键（没有则隐藏生成 rowid）

MyISAM（非聚簇）：
主键索引 B+ 树         数据文件 .MYD
┌─────────┐
│ 叶子:地址│ ────→ [行数据]
└─────────┘

InnoDB（聚簇）：
主键索引 B+ 树
┌────────────┐
│ 叶子:行数据  │ ← 数据就在索引里！
└────────────┘
```
崩溃恢复差异
```
// InnoDB：redo log（WAL 机制）
// 崩溃后：根据 redo log 重放，恢复未提交的数据
// 安全

// MyISAM：没有 redo log
// 崩溃后：数据文件可能损坏，需要修复（myisamchk）
// 不安全
```
### InnoDB三大特性
Change Buffer 插入缓冲
```
// 场景：二级索引不是唯一的，插入/更新时
// 如果二级索引页不在 Buffer Pool → 不直接写磁盘
// 先缓存在 Change Buffer，等页被读入时再合并

// 好处：
// ① 减少随机 IO（把多次随机写合并成顺序写）
// ② 提高二级索引的写性能

// 适用：写多读少、二级索引多的表
// 参数：innodb_change_buffer_max_size（默认 25%）
```
Double Write 双写缓冲
```
// 问题：页撕裂（Page Torn Write）
// 写 16KB 页时，只写了一半就崩溃
// → 页数据损坏，且 redo log 恢复也需要完整的页

// 解决：双写缓冲
// ① 先把整个页复制到 doublewrite buffer（顺序写）
// ② 再写到实际位置（随机写）
// ③ 崩溃恢复：从 doublewrite buffer 恢复完整页

// 代价：每次写多一次 IO（用 fsync 控制）
// 参数：innodb_doublewrite（默认 ON）
```
Adaptive Hash Index 自适应哈希索引
```
// 场景：频繁访问某些页（热点数据）
// InnoDB 自动为这些页建立哈希索引
// 把 B+ 树的 O(log n) 查找优化为 O(1)

// 条件：
// ① 热点页访问次数达到阈值
// ② 由 InnoDB 自动维护（不可手动创建）

// 注意：
// ① 只对"等值查询"有效
// ② 无法控制哪些页建立
// ③ 内存占用（innodb_adaptive_hash_index 默认 ON）
```
### 引擎选择
```
// 90%+ 场景：InnoDB（默认，不用纠结）

// MyISAM 什么时候用？
// ① 只读数据（报表、日志）
// ② 全表扫描为主
// ③ 不需要事务、行锁
// （现代 MySQL 基本都用 InnoDB，MyISAM 已被边缘化）

// Memory 什么时候用？
// ① 临时表、缓存表（重启丢数据）
// ② 数据量小、读写频繁
// 注意：内存表也有表锁，并发差
```
### 面试高频

> **Q:** "InnoDB 和 MyISAM 的区别？" 
> **A:** "① 事务：InnoDB 支持，MyISAM 不支持；② 锁：InnoDB 行锁，MyISAM 表锁；③ 索引：InnoDB 聚簇索引（数据在索引里），MyISAM 非聚簇（索引存地址）；④ 崩溃恢复：InnoDB 有 redo log，MyISAM 可能损坏；⑤ 外键：InnoDB 支持。MySQL 5.5+ 默认 InnoDB，生产基本都用它。"

> **Q:** "为什么 InnoDB 必须有主键？" 
> **A:** "InnoDB 用聚簇索引组织数据，主键索引的叶子直接存数据行。没有主键时，InnoDB 会选唯一非空索引，都没有则隐藏生成 rowid 作为聚簇索引。所以主键索引 = 数据的物理组织方式，必须有。"
### 高频面试题
#### 题目1：聚簇索引和非聚簇索引的区别
```
// 聚簇：数据在索引叶子节点（InnoDB 主键）
// 非聚簇：索引叶子存地址/主键（MyISAM、InnoDB 二级索引）
// 聚簇索引查找：直接拿到数据（不用回表）
```
#### 题目2：为什么MyISAM查询比InnoDB快
```
// ① MyISAM 缓存只缓存索引，不缓存数据（内存小但简单）
// ② InnoDB 要维护事务、MVCC、行锁等（有开销）
// ③ MyISAM 无事务 → 少日志写入
// 但：InnoDB 在大量读场景（Buffer Pool 命中）差别不大
// 且 InnoDB 功能完整，综合更优
```
#### 题目3：InnoDB三大特性
```
// Change Buffer（插入缓冲）：合并二级索引写
// Double Write（双写）：防止页撕裂
// Adaptive Hash Index（自适应哈希）：热点页 O(1) 查找
```
#### 题目4：表锁和行锁哪个好
```
// 行锁并发高，但加锁成本高（要定位行）
// 表锁简单，但并发差
// InnoDB 行锁 + MVCC 兼顾并发和安全
```

