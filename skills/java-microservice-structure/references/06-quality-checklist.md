# 06 设计完成后的关键点检查清单

> 模块设计/实现完成后，**必须**按本清单逐项自检。每项给出「怎么查」和「常见问题」。

## 1. 链路追踪逻辑正确性（controller 起始，贯穿整条调用链）

| # | 检查项 | 怎么查 | 常见问题 |
|---|---|---|---|
| 1.1 | Controller 入参校验完整 | 检查 FormDTO/PageQuery 的校验注解（@NotNull/@Min/@EnumValid）、`@Valid` 是否开启 | 缺校验注解导致非法数据进 service |
| 1.2 | Controller 只做接收与返回 | 方法体是否有业务逻辑？ | 业务写在 controller 导致不可测试 |
| 1.3 | 返回值统一包装 | 是否依赖公共 WrapperResponseBodyAdvice？是否有该豁免未豁免（如文件流漏了 @NoWrapper）？ | 手写 R 包装 / 二进制流被包装破坏 |
| 1.4 | Service 事务边界正确 | `@Transactional` 是否覆盖多表写操作？读操作是否误加？ | 事务缺失导致部分成功；事务过大锁表 |
| 1.5 | 异常语义正确 | 抛的是 CommonException 子类？错误码是否在本服务 *ErrorInfo 且全局唯一？ | 直接抛 RuntimeException 被包成 500 |
| 1.6 | 用户上下文链路 | 需要用户身份的接口是否从 UserContext.getUser() 取？异步线程里是否丢失？请求结束是否清理？ | 串号、空指针、ThreadLocal 泄漏 |
| 1.7 | 分页链路 | PageQuery → toMpPage → selectPage → PageDTO 是否统一？排序字段是否做了白名单（防注入）？ | 各写各的分页；sortBy 直接拼 SQL 注入 |
| 1.8 | 参数传递方向 | controller→service→mapper 参数类型是否一致（Long/Long 混用、DTO 直接传 mapper）？ | MP 条件构造器用了实体而非 wrapper |
| 1.9 | 返回对象是否泄漏内部模型 | 是否直接返回 PO/实体（应转 VO）？ | PO 直接序列化暴露敏感字段 |

## 2. 工具实用性分析（复用与选型）

| # | 检查项 | 常见问题 |
|---|---|---|
| 2.1 | 是否重复造轮子 | 手写 JSON/集合/日期工具（应用 hutool 系：JsonUtils/BeanUtils/CollUtils/DateUtils） |
| 2.2 | 工具放的位置正确 | 通用逻辑放 tj-common utils；服务特有才放本服务 utils |
| 2.3 | 断言用对 | 用 AssertUtils（统一异常）而非 if+throw 散落 |
| 2.4 | 异步线程模型正确 | 用线程池而非 new Thread；线程池参数可配置（Properties）；命名工厂 |
| 2.5 | 缓存选择合理 | 高频只读用 Caffeine；分布式共享用 Redis；是否缓存穿透/击穿/雪崩防护（空值缓存/互斥/随机过期） |
| 2.6 | 分页/树/枚举等通用能力 | 复用 PageQuery/PageDTO、TreeDataUtils、BaseEnum+@EnumValid 等，不另起炉灶 |

## 3. 健壮性与幂等

| # | 检查项 | 常见问题 |
|---|---|---|
| 3.1 | Feign 调用判空 | 下游 fallback 返回 null/空集合后调用方是否处理？ | NPE |
| 3.2 | Feign 降级是否配置 | Client 是否带 fallbackFactory？fallback 是否在 tj-api 注册 | 调用失败直接抛 500 |
| 3.3 | MQ 消费者健壮性 | 消息体判空/非法数据直接 return？ | 脏消息抛异常反复重试 |
| 3.4 | MQ 消费幂等 | 重复投递是否幂等（唯一约束/状态机/去重表）？ | 重复加课、重复加积分 |
| 3.5 | 写接口防重 | 前端重复提交/重试：唯一键 or 状态机 or 幂等表 | 重复下单、重复扣款 |
| 3.6 | 分布式锁粒度 | @Lock key 是否含业务维度（userId/orderId）？粒度过大并发低，过小锁不住 | 全局一把锁 |
| 3.7 | 定时任务幂等/补偿 | XXL-Job 任务重复执行是否安全？失败是否有补偿/重试？ | 重复发放、漏处理 |

## 4. 安全与合规

| # | 检查项 | 常见问题 |
|---|---|---|
| 4.1 | 接口鉴权 | 需要登录的接口是否受 LoginAuthInterceptor 保护？放行路径（excludeLoginPaths）是否过宽？ | 匿名可访问敏感接口 |
| 4.2 | 越权（水平/垂直） | 操作他人资源时是否校验归属（userId == UserContext.getUser()）？ | A 用户改 B 用户数据 |
| 4.3 | SQL 注入 | 动态 SQL 是否用 #{} 而非 ${}；排序字段是否白名单 | 排序/模糊查询注入 |
| 4.4 | 敏感信息 | 密码是否加密存储；VO 是否泄漏手机号/身份证 | PO/VO 直出敏感字段 |
| 4.5 | 参数校验兜底 | service 层是否二次校验（controller 校验可绕过，Feign 内部调用无 controller） | 内部调用绕过入参校验 |

## 5. pom 与配置

| # | 检查项 | 常见问题 |
|---|---|---|
| 5.1 | 依赖最小化 | 是否有未使用的依赖（ES/MQ/sentinel 等）？ | 全量复制别的服务 pom |
| 5.2 | 版本统一 | 版本是否在根 pom dependencyManagement？子模块是否误写 version？ | 版本漂移、冲突 |
| 5.3 | 配置齐全 | 4 个 profile 是否都有？swagger/auth/jdbc 等 tj.* 配置是否配置？ | 缺 profile 导致部署失败 |
| 5.4 | 错误码/常量集中 | XxxErrorInfo/RedisConstants 是否集中定义 | 魔法数字/魔法字符串散落 |

## 6. 自检输出格式

```
## 自检结果
- [x] 1.1 入参校验：QuestionFormDTO 已加 @NotNull/@EnumValid(QuestionType)
- [x] 1.6 用户上下文：saveQuestion 用 UserContext.getUser() 记录操作人；无异步
- [ ] 3.5 幂等：新增题目未做防重 → 需补唯一约束 (name+categoryId)
...
结论：<通过 / 有 N 项待修正，列表>
```
