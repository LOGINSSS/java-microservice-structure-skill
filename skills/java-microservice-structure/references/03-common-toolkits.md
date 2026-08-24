# 03 通用工具类库选型

> 本文件回答：项目里有哪些**通用可复用**的工具？什么时候用什么？为什么不要重复造轮子？

素材来自 tjxt 的 tj-common 模块——公共工具类的标准写法是**继承著名第三方库（hutool）再扩展**，业务代码直接用，禁止自己写 JSON/集合/日期工具。

## 1. 工具类全景（tj-common utils）

```
tj-common/src/main/java/com/tianji/common/
├── utils/
│   ├── JsonUtils.java        # JSON：继承 hutool JSONUtil
│   ├── BeanUtils.java        # Bean 转换：继承 hutool BeanUtil + 自定义转换器
│   ├── CollUtils.java        # 集合：继承 hutool CollectionUtil
│   ├── DateUtils.java        # 日期：继承 hutool LocalDateTimeUtil + 常用格式常量
│   ├── StringUtils.java      # 字符串：继承 hutool StrUtil
│   ├── NumberUtils.java      # 数值转换
│   ├── BooleanUtils.java     # 布尔转换
│   ├── ArrayUtils.java / ByteUtils.java / IoUtils.java
│   ├── AssertUtils.java      # 断言（抛公共异常）
│   ├── UserContext.java      # ★用户上下文：ThreadLocal 存当前登录用户
│   ├── TokenContext.java     # 令牌上下文
│   ├── RequestIdUtil.java    # 请求链路 ID
│   ├── RequestUtils.java     # 请求参数处理（排序签名等）
│   ├── WebUtils.java         # Servlet 相关（getRequest/getResponse/Cookie）
│   ├── HttpUtils.java        # HTTP 客户端
│   ├── TreeDataUtils.java    # 树形数据构建（菜单/分类）
│   ├── SPELUtils.java        # SpEL 表达式
│   ├── SignUtils.java        # 签名
│   ├── QrCodeUtils.java      # 二维码
│   ├── RandomUtils.java      # 随机
│   ├── ReflectUtils.java / AspectUtils.java / SqlWrapperUtils.java / SwaggerUtils.java
│   └── Convert.java / TjTemporalConverter.java / MarkedRunnable.java
├── domain/query/PageQuery.java   # ★分页请求参数（含 toMpPage()）
├── domain/dto/PageDTO.java       # ★分页响应
├── domain/dto/LoginUserDTO.java  # 登录用户 DTO
├── domain/R.java                 # 统一响应体
├── constants/ErrorInfo.java      # 错误码
└── exceptions/                   # 公共异常体系
```

## 2. hutool 系工具（复用场景最多）

| 工具 | 继承自 | 典型用法 | 场景 |
|---|---|---|---|
| `JsonUtils` | hutool `JSONUtil` | `JsonUtils.toJsonStr(obj)`、`JsonUtils.toBean(json, Clazz)`、`JsonUtils.toList(json, Clazz)` | JSON 序列化/反序列化（MQ 消息、缓存、HTTP） |
| `BeanUtils` | hutool `BeanUtil` | `BeanUtils.copyProperties(src, target)`、`BeanUtils.copyBean(src, Clazz, convert)` | PO↔DTO/VO 转换（带字段不一致时的自定义转换器） |
| `CollUtils` | hutool `CollectionUtil` | `CollUtils.isEmpty(list)`、`CollUtils.toList(iterable)`、`CollUtils.emptyList()` | 集合判空/转换/分组 |
| `DateUtils` | hutool `LocalDateTimeUtil` | `DateUtils.now()`、`DateUtils.format(dt, pattern)`、周/月格式常量 | 时间处理，统一格式常量 |
| `StringUtils` | hutool `StrUtil` | `StringUtils.isBlank(s)`、`StringUtils.join(...)` | 字符串判空/拼接 |

> **写法要点**：`public class JsonUtils extends JSONUtil {}` —— 继承后所有父类方法直接可用，子类再加项目定制方法。业务代码**必须**用这些包装类，不直接用 hutool 原生类（便于统一升级/定制）。

## 3. 分页三件套（*PageQuery → toMpPage → PageDTO）

请求分页入参（每个查询接口都用）：

```java
@Data
@Schema(description = "分页请求参数")
public class PageQuery {
    public static final Integer DEFAULT_PAGE_SIZE = 20;
    @Schema(description = "页码", example = "1")
    @Min(value = 1, message = "页码不能小于1")
    private Integer pageNo = DEFAULT_PAGE_NUM;   // 默认第 1 页
    @Schema(description = "每页大小", example = "5")
    @Min(value = 1, message = "每页查询数量不能小于1")
    private Integer pageSize = DEFAULT_PAGE_SIZE;
    private Boolean isAsc = true;                 // 是否升序
    private String sortBy;                        // 排序字段

    public int from() { return (pageNo - 1) * pageSize; }   // 分页偏移（手写 SQL 用）

    /** 转 MyBatis-Plus 分页对象，支持前端排序字段 */
    public <T> Page<T> toMpPage(OrderItem... orderItems) { ... }
    public <T> Page<T> toMpPage(String defaultSortBy, boolean isAsc) { ... }
    public <T> Page<T> toMpPageDefaultSortByCreateTimeDesc() {
        return toMpPage(Constant.DATA_FIELD_NAME_CREATE_TIME, false);
    }
}
```

Service 里分页查询的标准写法：

```java
public PageDTO<XxxVO> queryXxxPage(XxxPageQuery query) {
    // 1. 转 MP 分页对象（默认按创建时间倒序）
    Page<Xxx> page = query.toMpPageDefaultSortByCreateTimeDesc();
    // 2. 条件查询（LambdaQueryWrapper 或 XML）
    Page<Xxx> result = mapper.selectPage(page, wrapper);
    // 3. 转 VO（BeanUtils）
    List<XxxVO> vos = BeanUtils.copyList(result.getRecords(), XxxVO.class);
    // 4. 包装 PageDTO 返回
    return PageDTO.of(result, vos);
}
```

Controller 返回分页的规范：`PageDTO<XxxVO> queryXxxPage(XxxPageQuery query)`（入参直接绑定，无需 @RequestBody）。

## 4. 用户上下文（多文件流转信息的核心工具）

**需求**：登录用户信息（userId、userType 等）要在一次请求的 controller→service→mapper 整条链路中随处可取，无需每个方法显式传参。

**标准实现**：ThreadLocal 静态工具（tj-common UserContext）：

```java
public class UserContext {
    private static final ThreadLocal<Long> TL = new ThreadLocal<>();

    /** 保存用户 id（登录拦截器写入） */
    public static void setUser(Long userId) { TL.set(userId); }
    /** 获取当前用户 id（业务代码随处调用） */
    public static Long getUser() { return TL.get(); }
    /** 请求结束清理（拦截器 afterCompletion 调用，防内存泄漏） */
    public static void removeUser() { TL.remove(); }
}
```

**使用链路**（tj-auth-resource-sdk 的拦截器体系）：

```
请求 → 网关 AccountAuthFilter（校验 JWT）→ 透传用户头（user-info）
     → 业务服务 LoginAuthInterceptor/UserInfoInterceptor（解析头 → UserContext.setUser）
     → Controller（@RequireLogin 或直接 UserContext.getUser()）
     → Service / Mapper（UserContext.getUser() 取 userId）
     → FeignRelayUserInterceptor（Feign 调用时把用户头透传给下游服务）
     → afterCompletion（removeUser 清理）
```

**易错点**：
- 异步线程（线程池/`@Async`）中 ThreadLocal **不传递**，要么手动传参，要么用 `TransmittableThreadLocal`；
- 请求结束必须 `removeUser()`，否则连接池复用导致**串号**（A 用户看到 B 用户数据）；
- 同一项目还有配套 `TokenContext`（令牌）、`RequestIdUtil`（全链路追踪 ID，日志/Feign 头透传）。

## 5. 线程池（异步处理的正确姿势）

**需求**：异步化耗时操作（发短信、写学习记录、刷积分），不能直接用裸 `new Thread`。

**标准做法**：服务级 `config/ThreadPoolConfig` 注册线程池 Bean（tj-course/tj-trade 实例）：

```java
@Configuration
public class ThreadPoolConfig {
    @Bean
    public ExecutorService courseExecutor(ThreadPoolProperties props) {
        // 建议：手动 new ThreadPoolExecutor（核心/最大线程数、队列、拒绝策略、命名工厂）
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
            props.getCoreSize(), props.getMaxSize(),
            props.getKeepAliveTime(), TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(props.getQueueCapacity()),
            new ThreadFactoryBuilder().setNameFormat("course-exec-%d").build(),  // hutool 命名工厂
            new ThreadPoolExecutor.CallerRunsPolicy());   // 拒绝策略：调用者执行
        return pool;
    }
}
// ThreadPoolProperties：@ConfigurationProperties(prefix = "tj.xxx.thread")，yml 可配
```

**配套工具**：`MarkedRunnable`（包装任务加标记/日志）、`DelayedMessageProcessor`/`BasicIdMessageProcessor`（MQ 延迟消息，见 04）。

## 6. 断言与异常（业务校验的正确姿势）

**需求**：参数/状态校验失败时抛统一异常，由全局异常处理器转成统一响应。

```java
// tj-common AssertUtils（内部封装 hutool Assert + 公共异常）
AssertUtils.isTrue(condition, "xxx 不能为空");        // 不满足抛 BadRequestException
AssertUtils.notNull(obj, "xxx 不存在");               // 抛 BizIllegalException
AssertUtils.isNotNull(userId, "未登录");              // 抛 UnauthorizedException
```

异常体系：`CommonException` 基类 → `BadRequestException`（400）/`UnauthorizedException`（401）/`ForbiddenException`（403）/`BizIllegalException`（业务）/`DbException`（数据库）/`RequestTimeoutException`（超时）。全局 `CommonExceptionAdvice` 统一捕获并包装为 `R`。

## 7. 其他高频工具速查

| 工具 | 用途 |
|---|---|
| `WebUtils` | `getRequest()`/`getResponse()`/Cookie 读写 |
| `RequestUtils` | 请求参数排序（签名校验用） |
| `TreeDataUtils` | 把平铺列表构建成树（分类/菜单，注意"从哪个字段找父、根节点判定"） |
| `QrCodeUtils` | 生成二维码 |
| `SignUtils` / `SPELUtils` | 签名 / SpEL 表达式求值 |
| `BaseEnum` + `@EnumValid` | 枚举校验注解，入参自动校验枚举合法性 |
| `BaseMetaObjectHandler` | MyBatis-Plus 自动填充 create_time/update_time（公共 autoconfigure 已注册） |
| `@Lock`（redisson 切面） | 分布式锁注解（见 04） |

## 8. 工具实用性判断（自检用）

设计/实现时问自己：
1. 这个功能 tj-common utils 或 hutool 是否已有？→ 有则直接用，**禁止重写**；
2. 自写工具是否真的项目特有？→ 项目通用逻辑放 common，服务特有才放本服务 utils；
3. 是否用了正确的线程模型？→ 异步必须用线程池，跨线程传用户信息要处理 ThreadLocal 丢失；
4. 分页是否统一走 PageQuery/PageDTO？→ 禁止各写各的分页参数。
