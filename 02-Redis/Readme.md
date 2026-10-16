> **模块边界**：Redis 与 Spring 的集成、缓存注解（`@Cacheable`）→ Spring 模块；分布式锁在业务中的编排 → 分布式模块；底层单机架构（Reactor 实现细节）→ 可衔接网络编程模块。本模块覆盖 Redis 的数据、持久化、高可用、缓存模式与运维。

**① Redis 总览**

1. Redis 是什么、核心特点
2. 为什么快（内存 / 单线程 / IO 多路复用 / 数据结构）
3. 线程模型：文件事件处理器 + Reactor + epoll
4. 命令执行单线程与 6.0 网络 IO 多线程
5. Redis vs Memcached
6. 典型应用场景
7. 部署模式选择（单机 / 主从 / 哨兵 / 集群）

**② 数据类型** 8. String（SDS 与应用） 9. List（quicklist） 10. Hash 11. Set 12. ZSet（跳表） 13. 特殊类型：Bitmap / HyperLogLog / GEO / Stream 14. 各类型的业务应用映射（缓存 / 计数 / 排行榜 / 去重 / 限流 / 会话）

**③ 底层数据结构** 15. SDS 简单动态字符串 16. 压缩列表 ziplist / listpack 17. 字典 dict 与渐进式 rehash 18. 跳表 skiplist 19. 整数集合 intset 20. 对象编码（type 与 encoding）

**④ 持久化** 21. RDB、fork 与写时复制（COW） 22. AOF、AOF 重写与重写缓冲区 23. RDB vs AOF 24. 混合持久化与 Multi-Part AOF（7.0）

**⑤ 过期与淘汰** 25. 过期删除策略（惰性 + 定期） 26. 内存淘汰策略（8 种） 27. 近似 LRU 与 LFU 28. 内存碎片与 activedefrag

**⑥ 高可用** 29. 主从复制、psync、repl_backlog_buffer、全量 / 增量同步 30. 哨兵 Sentinel：主观 / 客观下线（quorum）、故障转移 31. Cluster：16384 槽、MOVED / ASK 重定向、Gossip、集群故障转移

**⑦ 缓存问题** 32. 缓存穿透（布隆过滤器 / 空值缓存） 33. 缓存击穿（互斥锁 / 逻辑过期） 34. 缓存雪崩（过期时间打散 / 多级缓存） 35. 缓存与数据库一致性（延迟双删 / binlog 订阅） 36. 缓存预热与缓存降级 37. 多级缓存架构（本地 Caffeine + Redis）

**⑧ 事务与 Lua** 38. Redis 事务（MULTI / EXEC / WATCH）与"不支持回滚"的原因 39. Lua 脚本：原子性原理、限制与超时

**⑨ 分布式锁** 40. SETNX 实现 41. 正确实现要点：唯一 value、Lua 原子删除、锁续期 42. Redisson（看门狗、可重入） 43. RedLock 及其争议

**⑩ 高级功能** 44. Pipeline 45. 发布订阅 46. Stream：消费者组、ACK、Pending 列表 47. ACL、客户端缓存、Function（6.0 / 7.0）

**⑪ 运维与客户端** 48. 内存管理 49. 慢查询日志 50. 大 key / 热 key：成因、危害与治理 51. SCAN 与 KEYS 的对比 52. Key 设计规范（命名、TTL、避免大 key） 53. 客户端生态：Jedis / Lettuce / Redisson 与连接池 54. 问题排查工具：INFO、`--bigkeys` / `--hotkeys`、MONITOR 55. Memcached 对比补充与选型（企业落地视角） 56. 常见线上故障案例与处置思路 57. Redis 使用规范总纲（适合团队落地的红线清单）