# 04 跨服务协作范式

> 本文件回答：服务之间怎么通信？Feign 契约怎么定义？MQ 消息怎么收发？分布式锁、定时任务的标准姿势？

## 1. 协作方式选型

| 场景 | 方式 | 理由 |
|---|---|---|
| 同步查询（实时需要结果） | **Feign**（契约在 tj-api） | 简单直接，带降级 |
| 异步解耦（通知、积分、状态变更） | **RabbitMQ**（topic 交换机 + 路由 key） | 削峰、解耦、失败不阻塞主流程 |
| 高频只读数据 | **Redis/Caffeine 缓存** + 失效通知 | 避免重复调用 |
| 临界资源（库存、优惠券） | **Redisson 分布式锁 @Lock / Lua 脚本** | 保证原子性 |
| 定时批量（对账、结算、清理） | **XXL-Job** | 分布式调度、补偿 |

## 2. Feign 契约（★契约集中定义在 xxx-api）

**规则**：Feign Client 一律定义在契约模块 `xxx-api` 的 `client/<领域>/` 下，多服务复用；降级实现 `*Fallback` 放同包 `fallback/` 子包。

**Client 定义（tj-api UserClient 实例）**：

```java
package com.xxx.api.client.user;

import com.xxx.api.client.user.fallback.UserClientFallback;
import com.xxx.api.dto.user.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(value = "user-service", fallbackFactory = UserClientFallback.class)
public interface UserClient {

    /** 根据 id 批量查询用户信息（注意：GET 传集合用 @RequestParam("ids") Iterable<Long>） */
    @GetMapping("/users/list")
    List<UserDTO> queryUserByIds(@RequestParam("ids") Iterable<Long> ids);

    /** 根据 id 查询单个用户 */
    @GetMapping("/users/{id}")
    UserDTO queryUserById(@PathVariable("id") Long id);
}
```

要点：
- `@FeignClient(value = "服务名")` —— 走注册中心 `lb://服务名` 负载均衡；
- 接口方法 = 目标服务 controller 的地址（**方法签名要和目标服务 controller 完全对应**：路径、参数注解、返回类型）；
- 跨服务传集合参数用 `@RequestParam("ids") Iterable<Long>`；传对象用 `@RequestBody`；
- **DTO 定义在 tj-api 的 `dto/<领域>/`**，不直接引用对方服务的 domain 类（避免依赖对方模块）。

**降级实现（FallbackFactory）**：

```java
@Slf4j
public class UserClientFallback implements FallbackFactory<UserClient> {
    @Override
    public UserClient create(Throwable cause) {
        log.error("查询用户服务出现异常", cause);
        return new UserClient() {
            @Override
            public List<UserDTO> queryUserByIds(Iterable<Long> ids) {
                return Collections.emptyList();   // 降级：返回空集合，调用方自行处理
            }
            @Override
            public UserDTO queryUserById(Long id) { return null; }
            // ...
        };
    }
}
```

> 用 `FallbackFactory`（能拿到异常）优于 `fallback` 类；配合 tj-api 的 `FallbackConfig` 注册到 Spring。调用方注意降级语义：返回 null/空集合后调用方要判空处理。

**调用方用法**（业务服务注入即可）：

```java
@RequiredArgsConstructor
@Service
public class XxxServiceImpl implements IXxxService {
    private final UserClient userClient;   // 构造器注入

    public UserDTO getUser(Long id) {
        UserDTO user = userClient.queryUserById(id);   // 失败走 fallback → null
        AssertUtils.notNull(user, "用户不存在");        // 判空 + 统一异常
        return user;
    }
}
```

## 3. RabbitMQ 消息（异步解耦）

**常量集中**（tj-common `MqConstants`）：交换机名、路由 key 全部集中定义：

```java
public class MqConstants {
    public static class Exchange {
        public static final String ORDER_EXCHANGE = "trade.order.exchange";  // 订单交换机（topic）
    }
    public static class Key {
        public static final String ORDER_PAY_KEY = "order.pay";     // 支付成功
        public static final String ORDER_REFUND_KEY = "order.refund"; // 退款
    }
}
```

**生产者**（tj-common 提供 `RabbitMqHelper`，业务代码直接发）：

```java
// 发普通消息
rabbitMqHelper.send(MqConstants.Exchange.ORDER_EXCHANGE, MqConstants.Key.ORDER_PAY_KEY, orderDTO);
// 发延迟消息（延迟 30 分钟后消费，如订单超时取消）
rabbitMqHelper.sendDelay(MqConstants.Exchange.ORDER_EXCHANGE, MqConstants.Key.ORDER_PAY_TIMEOUT_KEY, orderDTO, 30 * 60 * 1000);
```

**消费者（tj-learning LessonChangeListener 实例，健壮性检查是标配）**：

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class LessonChangeListener {
    private final ILearningLessonService lessonService;

    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "learning.lesson.pay.queue", durable = "true"),
            exchange = @Exchange(name = MqConstants.Exchange.ORDER_EXCHANGE, type = ExchangeTypes.TOPIC),
            key = MqConstants.Key.ORDER_PAY_KEY))
    public void listenLessonPay(OrderBasicDTO order) {
        // 1. 健壮性处理：消息为空/数据非法直接返回（防止重复消费/脏数据）
        if (order == null || order.getUserId() == null || CollUtils.isEmpty(order.getCourseIds())) {
            log.error("接收到MQ消息有误，订单数据为空");
            return;
        }
        // 2. 业务处理（要求幂等：可重复执行结果一致）
        log.debug("监听到用户{}的订单{}，添加课程{}", order.getUserId(), order.getOrderId(), order.getCourseIds());
        lessonService.addUserLessons(order.getUserId(), order.getCourseIds());
    }
}
```

要点：
- topic 交换机 + 业务路由 key；队列 `durable = "true"`；
- **消费必须幂等**（MQ 至少一次投递，重复消费要能兜底）；
- 消息体用跨服务 DTO（tj-api dto），加 `serialVersionUID`；
- 延迟消息由 tj-common `DelayedMessageProcessor` 处理（死信队列/延迟插件实现）。

## 4. 分布式锁（Redisson @Lock）

**需求**：多实例下保证临界区（抢券、扣库存、幂等提交）只执行一次。

```java
// tj-common redisson autoconfigure 提供 @Lock 注解 + LockAspect
@Lock(name = "coupon:receive:user:{#userId}", waitTime = 3, leaseTime = 30)
public void receiveCoupon(Long userId, Long couponId) { ... }
```

要点：
- key 支持 SpEL（`{#userId}` 取参数），**必须带业务前缀 + 业务维度**（userId/couponId），粒度越小并发越高；
- `waitTime` 等待锁、`leaseTime` 自动释放（防死锁）；锁粒度内操作要快，不要嵌套远程调用；
- 高并发扣减场景（如发券）优先考虑 **Lua 脚本**保证原子性（tj-promotion `resources/lua/receive_coupon.lua` 实例），比锁更高效。

## 5. 定时任务（XXL-Job）

**配置**：tj-common `autoconfigure/xxljob` 提供 `XxlJobConfig` + `XxlJobProperties`（yml 配 admin 地址、执行器名、端口）。

**任务类**（tj-course `CourseJobHandler` 实例风格）：

```java
@Component
public class CourseJobHandler {
    @XxlJob("coursePublishJob")
    public void handle() {
        // 执行定时逻辑：查询待处理数据 → 批量处理 → 失败重试/补偿
        log.info("课程定时发布任务开始");
        courseService.publishScheduledCourses();
    }
}
```

要点：
- 方法名 = 任务名（XxlJob 控制台配置一致）；幂等与补偿由业务保证；
- 任务放 `handler/` 或 `task/` 包；
- 日志用 XxlJobHelper 或 log 输出，控制台可查。

## 6. 统一响应与异常

```
响应体：R<T>（code/message/data）→ WrapperResponseBodyAdvice 自动包装（controller 返回裸对象即可）
异常：controller/service 抛 CommonException 子类 → CommonExceptionAdvice 捕获 → 转 R
错误码：各服务 *ErrorInfo 定义本服务错误码，全局唯一
```

> controller 方法直接返回业务对象（如 `PageDTO<XxxVO>`、`void`），不用手写 R；统一包装由公共组件完成（有 `@NoWrapper` 注解可豁免，如文件流）。
