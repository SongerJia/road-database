> **模块边界**：分库分表中间件（ShardingSphere / MyCat）→ 中间件模块；分布式事务（XA / TCC / Seata）→ 分布式模块；Redis 缓存 → 缓存 / 数据库方向下一站。本模块只讲单机 MySQL 与主从复制。

**① MySQL 总览与架构**

1. MySQL 逻辑架构（连接层 / 服务层 / 引擎层 / 存储层）
2. 一条 SQL 的完整执行流程
3. 存储引擎对比（InnoDB / MyISAM / Memory）
4. MySQL 版本差异（5.7 / 8.0）
5. 连接数与线程模型、连接池

**② 数据类型与字符集** 6. 整数类型与取值范围 7. 浮点 / 定点（DECIMAL）类型 8. 字符串类型（CHAR / VARCHAR / TEXT / BLOB） 9. 日期时间类型（DATETIME / TIMESTAMP） 10. JSON 类型及其增强（8.0） 11. ENUM / SET 类型 12. 类型选择原则 13. 隐式类型转换的坑（字符串 vs 数字比较导致索引失效） 14. 字符集与排序规则（utf8 vs utf8mb4、collation 影响）

**③ SQL 与查询** 15. SQL 分类（DDL / DML / DCL / TCL） 16. JOIN 类型 17. 子查询与派生表 18. CTE 公用表表达式（8.0） 19. 窗口函数（8.0） 20. 聚合与分组 21. 排序与分页（LIMIT） 22. UNION 与 UNION ALL 23. 视图、存储过程、触发器、游标、事件调度器

**④ 索引** 24. 索引的数据结构（B+ 树）与索引的代价（写放大） 25. 聚簇索引与二级索引 26. 联合索引与最左前缀原则 27. 覆盖索引与索引下推 28. 回表 29. 索引失效的常见场景 30. Cardinality 与选择率 31. 降序索引、不可见索引、直方图（8.0）

**⑤ 事务与 MVCC** 32. ACID 33. 四种隔离级别 34. 脏读 / 不可重复读 / 幻读 35. MVCC：undo 版本链 + ReadView 36. RC 与 RR 的 ReadView 生成时机差异 37. 当前读 vs 快照读

**⑥ 锁** 38. 全局锁 / 表锁 / 行锁 39. 记录锁 / 间隙锁 / 临键锁（间隙锁的适用级别） 40. 加锁规则（唯一索引 / 非唯一索引 / 未命中） 41. 意向锁 IS / IX 42. 死锁与排查

**⑦ 日志** 43. redo log 与 WAL 思想、写入链路与 innodb_flush_log_at_trx_commit 44. undo log 45. binlog 与三种格式（STATEMENT / ROW / MIXED） 46. 两阶段提交（redo 与 binlog 的一致性） 47. 组提交（group commit） 48. 查询缓存及其移除（8.0）

**⑧ InnoDB 存储引擎** 49. Buffer Pool 与改进版 LRU（分代 + midpoint insertion） 50. 脏页刷新、checkpoint、LSN 与脏页比例控制 51. Change Buffer 52. 自适应哈希索引 53. 行格式与页结构、表空间（段 / 区 / 页） 54. 分区表

**⑨ 复制与高可用** 55. 主从复制原理（binlog → relay log） 56. 复制三种模式（异步 / 半同步 / 组复制） 57. GTID 58. 读写分离与主从切换 59. 主从延迟及解决

**⑩ 扩展与分库分表** 60. 垂直拆分与水平拆分 61. 分片键与路由 62. 全局 ID

**⑪ 性能优化与运维** 63. EXPLAIN 执行计划 64. EXPLAIN ANALYZE 与 Hash Join（8.0） 65. 慢查询日志 66. SQL 优化技巧（避免 SELECT *、大分页优化） 67. 参数调优 68. 慢查询闭环：定位 → 优化 → 验证 69. 备份恢复（mysqldump、xtrabackup） 70. 在线 DDL（8.0 instant）与权限管理