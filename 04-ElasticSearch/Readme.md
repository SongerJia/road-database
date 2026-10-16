> **模块边界**：Spring Data Elasticsearch 的 Repository 抽象 → Spring 模块；ES 作为可观测性后端（日志 / APM）→ 运维 / 监控方向。本模块覆盖 ES 的索引、查询、聚合、分布式与运维。

**① ES 总览与选型**

1. 是什么、基于 Lucene
2. 核心概念与关系型数据库对比
3. 倒排索引（term dictionary / posting list / FST）
4. 正排与 `_source`、`doc_values`
5. 版本演进（7.0 移除 type、8.x 默认开启安全）
6. 应用场景
7. 与 MySQL / MongoDB 的定位对比

**② 架构与分布式** 8. 节点角色 9. 集群、分片、副本 10. 写流程（主分片 + 并行转发副本）与读流程 11. Lucene segment 与 merge（自动策略 / force merge） 12. refresh / flush / translog（durability：request / async） 13. 近实时（NRT） 14. 分片分配感知与冷热分离

**③ 索引与映射** 15. mapping 定义 16. 字段类型 17. dynamic mapping 18. 分词器 19. text vs keyword 20. nested 类型 21. mapping 不可变与 reindex 22. `index` / `doc_values` 属性控制 23. 索引别名（alias） 24. runtime fields

**④ 查询 DSL** 25. match / term / terms 26. match_phrase 27. bool 查询 28. filter vs query（不评分 + bitset 缓存） 29. range / exists / prefix / wildcard / fuzzy 30. script（painless） 31. 分页：from+size、scroll（缺点）、search_after + PIT 32. 向量检索（dense_vector + kNN）

**⑤ 聚合** 33. metric 聚合 34. bucket 聚合（date_histogram 的时区处理） 35. 嵌套聚合 36. cardinality 精度（HLL 与 precision_threshold）

**⑥ 相关度** 37. TF-IDF vs BM25（k1 / b 参数） 38. `_score` 与 boost、explain 调优入口 39. 高亮 40. 同义词与停用词 41. suggest 拼写纠错 42. 中文分词（IK）

**⑦ 写入与一致性** 43. 写入流程 44. 版本控制与乐观并发 45. bulk 批量（单批大小建议） 46. 一致性（wait_for_active_shards / quorum） 47. `_routing` 路由

**⑧ 集群** 48. 集群健康 49. 主节点选举与脑裂（7.x voting configuration） 50. 集群扩容与再平衡 51. 跨集群搜索 CCS 与跨集群复制 CCR

**⑨ 性能优化** 52. 索引设计（分片 / 副本、单分片容量经验值） 53. 查询优化与 profile API 54. 写入优化 55. JVM 与堆内存（不超过 32GB）

**⑩ 运维、生态与规范** 56. 备份恢复（snapshot / restore） 57. 监控 58. ILM 生命周期管理与 data stream 59. 数据同步方案（Canal / Logstash / 双写） 60. ELK / Elastic Stack 生态（Logstash / Kibana / Beats） 61. 常见坑清单（mapping 字段爆炸 / 深分页 / 分片过多 / 大文档 / script 滥用 / 副本为 0） 62. 使用规范总纲（先定 mapping、禁深翻页、聚合独立索引）