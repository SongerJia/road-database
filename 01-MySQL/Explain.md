## SQL Explain
Explain详解->慢查询排查->索引优化原则->常见SQL优化场景->深分页优化->面试高频题
### Explain详解
使用方式
```
EXPLAIN SELECT * FROM users WHERE age > 20 AND name = '张三';
```
关键字段解读

| 字段            | 含义      | 关注点               |
| ------------- | ------- | ----------------- |
| type          | 访问类型    | All最差，const最好     |
| key           | 实际使用的索引 | 是否为null           |
| rows          | 预估扫描的行数 | 越小越好              |
| Extra         | 额外信息    | Using filesort要警惕 |
| possible_keys | 可能用的索引  |                   |
| ref           | 索引哪列被使用 |                   |
| filtered      | 过滤比例    | 越高越好              |
type从好到差
```
-- 性能从高到低：
system > const > eq_ref > ref > range > index > ALL

-- ① system：系统表，只有一行
-- ② const：主键/唯一索引等值查询
EXPLAIN SELECT * FROM users WHERE id = 1;  -- type=const

-- ③ eq_ref：唯一索引关联查询
-- ④ ref：非唯一索引等值查询
EXPLAIN SELECT * FROM users WHERE age = 20;  -- age 有索引，type=ref

-- ⑤ range：索引范围查询
EXPLAIN SELECT * FROM users WHERE age BETWEEN 20 AND 30;  -- type=range

-- ⑥ index：遍历整个索引树（比 ALL 好一点）
-- ⑦ ALL：全表扫描（最差，要优化！）
EXPLAIN SELECT * FROM users WHERE email = 'x@y.com';  -- 没索引 → ALL
```
Extra额外信息
```
-- ① Using filesort：需要排序（没用到索引排序）⚠️
EXPLAIN SELECT * FROM users ORDER BY age;
-- age 没索引 → Using filesort → 磁盘/内存排序 → 慢

-- ② Using temporary：使用临时表 ⚠️（group by 常出现）
EXPLAIN SELECT age, COUNT(*) FROM users GROUP BY age;

-- ③ Using index：覆盖索引 ✅（最好）
EXPLAIN SELECT age FROM users WHERE age > 20;
-- 字段都在索引里 → Using index → 不用回表

-- ④ Using index condition：索引下推 ✅
-- ⑤ Using where：先取数据再过滤
-- ⑥ Using join buffer：join 没走索引 → 块循环
```
### 慢查询排查
开启慢查询日志
```
-- 查看
SHOW VARIABLES LIKE 'slow_query_log';

-- 开启（my.cnf）：
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1        -- 超过 1 秒的 SQL
log_queries_not_using_indexes = ON  -- 记录没用索引的 SQL
```
分析慢查询
```
-- 查看最近慢查询
SHOW GLOBAL STATUS LIKE 'Slow_queries';

-- 用 mysqldumpslow 分析日志
mysqldumpslow -s t /var/log/mysql/slow.log
-- -s t：按时间排序
-- -s c：按次数排序
-- -s at：按平均时间排序

-- 或 pt-query-digest（percona 工具）
-- 生成统计报告：最慢的 SQL、执行次数最多的 SQL
```
慢查询优化流程
```
① 从慢日志找到慢 SQL
    ↓
② EXPLAIN 分析执行计划
    ↓
③ 定位问题：
   - ALL 全表扫描 → 加索引
   - Using filesort → 优化排序
   - 回表太多 → 覆盖索引
   - 深分页 → 延迟关联
    ↓
④ 优化后验证（rows 是否减少）
```
### 索引优化原则
建索引的原则
```
// ① 选择区分度高的列
// 区分度 = 不重复值 / 总行数
// 性别（0/1）区分度低 → 索引没用
// 身份证区分度高 → 索引有效

// ② 选择查询频繁的列
// ③ 联合索引：等值前置、范围后置
// ④ 控制索引数量（不过度索引）
// ⑤ 覆盖索引思想：查询字段尽量进索引
// ⑥ 长字段用前缀索引
CREATE INDEX idx_email_prefix ON users (email(10));  -- 只索引前 10 位

// ⑦ 索引列不要参与运算/函数
```
查询优化原则
```
// ① SELECT 只取需要的字段（少回表）
// ② 避免 SELECT *（可能回表+大数据传输）
// ③ LIMIT 分页（避免一次取太多）
// ④ 小表驱动大表（join）
// ⑤ 索引列避免隐式转换
// ⑥ OR 拆成 UNION 或保证两边都走索引
```
### 常见索引优化场景
#### 场景1：避免Select *
```
-- ❌ 差
SELECT * FROM users WHERE age > 20;
-- 回表 + 传输所有字段

-- ✅ 好
SELECT id, name FROM users WHERE age > 20;
-- 可能覆盖索引，减少回表
```
#### 场景2：优化Order by
```
-- ❌ Using filesort（慢）
SELECT * FROM users ORDER BY age;

-- ✅ 用索引排序（快）
-- 建联合索引 (age, id)
SELECT id, age FROM users ORDER BY age;
-- 索引本身有序 → 不用排序
```
#### 场景3：优化Group by
```
-- ❌ Using temporary（慢）
SELECT age, COUNT(*) FROM users GROUP BY age;

-- ✅ 建索引 (age) → 分组走索引
```
#### 场景4：优化join
```
-- 关联字段必须建索引！
-- ❌ 被驱动表没索引 → join buffer 全表扫

-- ✅ 被驱动表关联字段建索引
-- 小表驱动大表：
SELECT * FROM small a JOIN big b ON a.id = b.a_id;
-- 外层小表，内层大表走索引
```
#### 场景5：避免子查询嵌套过深
```
-- ❌ 慢（相关子查询每行执行）
SELECT * FROM t1 WHERE id IN (SELECT id FROM t2 WHERE ...);

-- ✅ 改 JOIN（优化器可能等价转换）
SELECT t1.* FROM t1 JOIN t2 ON t1.id = t2.id WHERE ...;
```
#### 场景6：In与Exists
```
-- 外层表大、内层表小 → EXISTS 可能更好
-- 外层表小、内层表大 → IN 可能更好
-- 现代 MySQL 优化器基本会自动转换，差别不大
```
### 深分页优化
```
-- 深分页很慢！
SELECT * FROM users ORDER BY id LIMIT 1000000, 10;
-- MySQL 要先找到前 100 万行，丢弃，再返回 10 行
-- rows = 1000010，扫描巨多！

-- LIMIT 1000000, 10 ≈ 扫描 100 万行，代价巨大
```
为什么慢？
```
// ② 丢弃：前 100 万条全部丢弃（浪费）
// 数据量越大，偏移越大，越慢
```
优化方案
```
-- 方案一：延迟关联（先取主键，再回表）
SELECT * FROM users
JOIN (SELECT id FROM users ORDER BY id LIMIT 1000000, 10) tmp
ON users.id = tmp.id;

-- 子查询只查主键（用索引，快）减少扫描宽表的代价
-- 再按主键回表取 10 行（快）

-- 方案二：基于主键分页（适合连续 ID）
SELECT * FROM users WHERE id > 1000000 ORDER BY id LIMIT 10;
-- 用索引直接跳过去（快）
-- 适合：列表页（上一页最后 id 传入）

```
### 面试高频

> **Q:** "深分页为什么慢？怎么优化？" 
> **A:** "LIMIT 大偏移量时，MySQL 要扫描前面所有行再丢弃。优化：① 延迟关联（子查询只查主键，再回表）；② 基于主键分页（WHERE id > last_id）
### 面试高频题
#### 题目1：Explain的type有哪些
```
// const > eq_ref > ref > range > index > ALL
// 出现 ALL 要警惕，考虑加索引
```
#### 题目2：怎么排查慢查询
```
// 慢查询日志（long_query_time）→ 找到慢 SQL
// EXPLAIN 分析 → 定位全表扫描/回表/排序
// 优化 + 验证
```
#### 题目3：索引优化原则
```
// 区分度高、查询频繁、等值前置范围后置、
// 覆盖索引、前缀索引、不过度
```
#### 题目4：Select * 为什么不好
```
// ① 可能回表（字段不在索引）
// ② 传输数据量大
// ③ 网络开销大
// 应该只取需要的字段
```
#### 题目5：深分页怎么优化
```
// 延迟关联 / 基于主键分页 / 覆盖索引
```
#### 题目6：什么时候字段加索引
```
// WHERE、JOIN、ORDER BY、GROUP BY 的字段
// 区分度高、数据量大
```


