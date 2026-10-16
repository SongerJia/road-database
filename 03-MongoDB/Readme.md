> **模块边界**：Spring Data MongoDB 的 Repository 抽象 → Spring 模块；MongoDB 作为微服务存储层 → 分布式 / 架构模块。本模块覆盖 MongoDB 的数据模型、查询、索引、复制集、分片、事务与运维。

**① MongoDB 总览与选型**

1. 是什么、特点与应用场景
2. 与关系型数据库的术语映射
3. 版本演进（4.x / 5.0 / 6.0 / 7.0）与各版本关键特性
4. **选型决策：何时用 MongoDB 而非 MySQL、与 Redis 的分工**
5. 适用与不适用场景
6. 与 MySQL / Redis 的定位对比

**② BSON 与数据类型** 7. BSON 格式 8. 常用数据类型 9. ObjectId 的构成 10. 数值类型与精度问题 11. 字符集与 collation

**③ 文档模型设计** 12. 内嵌 vs 引用及判据 13. 一对多 / 多对多建模 14. 建模原则（读写比例、原子性边界） 15. 建模模式（Bucket / Outlier / Computed / Subtree） 16. **时间序列集合（5.0）** 17. 模式自由（Schema-less）的利与弊 18. 文档大小限制（16MB）

**④ CRUD 操作** 19. 插入操作 20. 查询操作与查询操作符 21. 更新操作与更新操作符 22. 删除与批量操作 23. 投影、排序与分页

**⑤ 聚合框架** 24. 聚合管道 25. 常用聚合阶段 26. `$lookup` 关联查询及其性能代价 27. 进阶阶段：`$facet` / `$bucket` / `$unwind` 的膨胀风险 28. 聚合优化

**⑥ 索引** 29. 单字段与复合索引 30. 多键索引 31. 唯一 / 稀疏 / 部分索引 32. TTL 索引及原理 33. 文本索引与地理索引 34. ESR 原则与索引覆盖 35. `explain` 分析（executionStats、IXSCAN vs COLLSCAN） 36. 索引构建的性能影响

**⑦ 复制集** 37. 复制集架构 38. Oplog：capped、幂等性、大小与容忍落后时长 39. 选举机制：priority / votes / 多数派 / Arbiter 40. Read Preference / Read Concern / Write Concern（含 w:majority 与 j:true）

**⑧ 分片集群** 41. 分片集群组件与约束（config server 必须为副本集、mongos 无状态） 42. 分片键与分片策略、选择建议与限制（基数 / 写分布 / 不可变 / 不能是数组） 43. chunk 与均衡

**⑨ 事务与一致性** 44. 单文档原子性 45. 多文档事务及其限制（4.0 副本集 / 4.2 分片、超时、跨分片开销） 46. 读写关注与因果一致性

**⑩ 存储引擎与性能** 47. WiredTiger 存储引擎 48. 文档级锁与意向锁 49. 文档级并发与 MVCC 50. 内存与缓存（默认约 50% 物理内存） 51. GridFS（大文件存储） 52. 性能调优

**⑪ 安全、运维与常见坑** 53. 认证与授权 54. 备份恢复与一致性（快照 vs mongodump + oplog 增量） 55. 监控与慢查询（serverStatus / mongostat / mongotop / Profiler） 56. 连接池与驱动配置 57. mongosh / Compass 工具 58. **常见坑清单（大文档 / 无索引全表扫 / 数组无限膨胀 / `$lookup` 滥用 / 分片键选错致热点）**