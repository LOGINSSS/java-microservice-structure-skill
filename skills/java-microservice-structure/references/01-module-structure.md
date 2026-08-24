# 01 模块划分范式与标准目录结构

> 本文件回答：一个 Java 微服务工程有哪些模块？业务服务内部目录怎么组织？**每个目录的职责是什么**？

## 1. 架构速览（通用形态）

```
                       ┌──────────────────┐
   前端 / 客户端  ───▶  │   gateway（网关）  │  路由、鉴权、跨域、聚合文档
                       └────────┬─────────┘
             注册中心（Nacos/Eureka）+ 负载均衡（Spring Cloud LoadBalancer）
   ┌──────┬──────┬──────┬──────┼──────┬──────┬──────┬──────┐
   │      │      │      │      │      │      │      │      │
  auth  user  course  trade  pay  promotion  exam  ...（业务服务）
   │      │      │      │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
   服务间调用：Feign（契约集中定义 client + fallback）+ RabbitMQ（异步/延迟消息）+ XXL-Job（定时任务）
   基础设施：MySQL（每服务独立库）/ Redis / Elasticsearch / 对象存储 / 第三方支付·短信
```

## 2. 模块分类

| 类别 | 模块命名 | 启动类 | 职责 |
|---|---|---|---|
| 公共基础 | `xxx-common` | 无（library） | 工具类、统一响应/异常、通用自动配置（MyBatis 填充、Redis 锁、MQ 助手、Swagger、XXL-Job 配置） |
| 契约聚合 | `xxx-api` | 无（library） | 所有 Feign Client、跨服务 DTO、共享常量/缓存 |
| 网关 | `xxx-gateway` | 有 | 路由（lb://）、统一鉴权过滤器、跨域、Swagger 聚合 |
| 认证中心 | `xxx-auth` | service 子模块有 | 登录/令牌/权限；SDK 化拆 4 子模块（见 §4） |
| 业务服务 | `xxx-user`、`xxx-course`… | 有 | 单一业务域，独立库 `xxx_<domain>` |
| 三段式服务 | `xxx-message`、`xxx-pay`… | service 子模块有 | 对外 SDK + 共享领域模型 + 服务本体（见 §5） |

**构建顺序即依赖顺序**：common → api/auth → gateway → 各业务服务。

## 3. 业务服务标准目录树（★核心范式，逐目录详解）

```
xxx-user/
├── pom.xml
└── src/main/
    ├── java/com/<org>/             # 包根
    │   ├── UserApplication.java    # 启动类
    │   └── user/                   # 领域包 = com.<org>.<domain>
    │       ├── config/
    │       ├── constants/
    │       ├── controller/
    │       ├── domain/
    │       │   ├── dto/
    │       │   ├── po/
    │       │   ├── query/
    │       │   └── vo/
    │       ├── enums/
    │       ├── mapper/
    │       ├── service/
    │       │   └── impl/
    │       ├── handler/            # 可选
    │       ├── properties/         # 可选
    │       ├── mq/                 # 可选
    │       ├── task/               # 可选
    │       ├── strategy/           # 可选
    │       ├── thirdparty/         # 可选
    │       ├── storage/            # 可选
    │       ├── repository/         # 可选
    │       └── utils/              # 可选
    └── resources/
        ├── mapper/*.xml
        ├── application.yml
        ├── application-dev.yml
        ├── application-local.yml
        ├── application-test.yml
        └── static/favicon.ico
```

### 逐目录功能详解

| 目录 | 职责 | 典型内容 | 注意事项 |
|---|---|---|---|
| `UserApplication.java` | 启动类 | `@SpringBootApplication`、`@MapperScan`、main 方法 | 位于包根 `com.<org>`，命名 `<Domain>Application` |
| `config/` | 业务配置 | `SecurityConfig`（放行路径）、`ThreadPoolConfig`（线程池 Bean）、业务 `@Configuration` | 不要放公共/全局配置（那些在 tj-common autoconfigure） |
| `constants/` | 常量与错误码 | `XxxConstants`（业务常量）、`XxxErrorInfo`（错误码文案，与公共 `ErrorInfo` 呼应）、`RedisConstants`（Redis key） | 错误码全局唯一；Redis key 必须集中定义避免散落 |
| `controller/` | HTTP 接口层 | `@RestController` + `@RequestMapping` + `@Tag`/`@Operation`（Swagger 文档）；后台/前台常拆 `*AdminController` 或按角色（Student/Teacher/Staff） | **只做参数接收与返回**，不写业务；分页入参直接绑定 `*PageQuery` |
| `domain/dto/` | 入参/传输对象 | `*FormDTO`、`*SaveDTO`、`*AddDTO`（前端提交）；跨服务用 tj-api 的 DTO | 入参校验注解（`@NotNull`、`@Valid`、自定义 `@EnumValid`）放这里 |
| `domain/po/` | 数据库实体 | MyBatis-Plus 实体，`@TableName`/`@TableId`，继承公共 `BaseEntity`（含 create_time/update_time 自动填充） | 字段与表一一对应；禁止塞入非表字段 |
| `domain/query/` | 分页查询参数 | `*PageQuery` 继承公共 `PageQuery`（含 pageNo/pageSize/sortBy + `toMpPage()`） | 带校验注解（页码 ≥1） |
| `domain/vo/` | 出参对象 | `*VO`、`*PageVO`、`*DetailVO`、`*AdminVO` | 按前端需要裁剪字段，禁止直接返回 PO |
| `enums/` | 业务枚举 | 状态/类型枚举，**实现公共 `BaseEnum`**（getValue/getDesc）以便校验与序列化 | 与 constants 中状态常量统一，避免两套 |
| `mapper/` | 数据访问接口 | MyBatis-Plus `BaseMapper<PO>` 接口；复杂 SQL 写 `resources/mapper/*.xml` | 简单 CRUD 用 MP 内置方法，不写 XML |
| `service/` | 业务逻辑 | `I<Xxx>Service` 接口 + `impl/<Xxx>ServiceImpl` 实现（继承 MP `IService/ServiceImpl`） | **业务核心在此**：事务 `@Transactional`、幂等、跨表操作 |
| `handler/`（可选） | 任务/消息处理 | XXL-Job `*JobHandler`、MQ `*Handler`、`*Listener` | 与 mq/、task/ 职责可重叠，按团队约定统一 |
| `properties/`（可选） | 配置属性类 | `@ConfigurationProperties(prefix = "xxx")` 的 `*Properties` | 复杂配置才拆类，简单配置直接 yml |
| `mq/`（可选） | 消息消费 | `message/`（消息体 POJO）、`*Listener`/`*Handler`（`@RabbitListener` + QueueBinding） | 消费方法必须先做健壮性检查（空消息、非法数据直接 return） |
| `task/`（可选） | 定时任务 | `*Task`、`*JobHandler`（XXL-Job 或 `@Scheduled`） | 注意分布式环境只跑一次 |
| `strategy/`（可选） | 策略模式 | 接口 + 多实现（如优惠 `discount/`、适用范围 `scope/`），配合枚举类型路由 | 新增类型时新增实现类即可，避免 if-else 膨胀 |
| `thirdparty/` 或 `third/`（可选） | 第三方接入 | 按厂商分包 `ali/`、`tencent/`、`wx/`，每包含 config/Properties/Handler；对外提供统一接口（如 `ISmsHandler`、`IPayService`） | 隔离厂商差异，业务只依赖抽象接口 |
| `storage/`（可选） | 存储抽象 | `IFileStorage`/`IMediaStorage` 接口 + `ali/`、`tencent/` 实现 | 上传下载统一走抽象，便于切换云厂商 |
| `repository/`（可选） | 仓储模式 | 如 ES 搜索 `CourseRepository` + `impl/CourseRepositoryImpl` | 用于脱离 MP 的复杂数据源（ES/Mongo） |
| `utils/`（可选） | 业务工具 | 本服务专用工具；通用工具必须在 tj-common utils 中 | 与公共工具重复的方法不要放这里 |

### resources 文件

| 文件 | 内容 |
|---|---|
| `mapper/*.xml` | 复杂 SQL（多表 join、动态 SQL），文件名与 Mapper 接口一致 |
| `application.yml` | 基础：`server.port`、`spring.application.name`、自定义 `tj.*`（swagger/auth/jdbc 等） |
| `application-dev.yml` | 开发环境（Nacos 地址、密钥） |
| `application-local.yml` | 本地环境 |
| `application-test.yml` | 测试环境（生产部署 profile，Docker 启动脚本用 `SPRING_PROFILES_ACTIVE=test`） |

## 4. 认证中心 SDK 化（四子模块）

```
xxx-auth/
├── xxx-auth-common/        # 认证公共常量/领域对象（错误码、JWT 常量、权限 DTO）
├── xxx-auth-gateway-sdk/   # 网关侧 SDK：网关过滤器/校验工具、JWT 签名持有者（自动配置）
├── xxx-auth-resource-sdk/  # 资源服务侧 SDK：登录拦截器、用户信息透传拦截器、Feign 透传配置
└── xxx-auth-service/       # 认证服务本体（账号/角色/权限/菜单控制器，签发 JWT 的 jks 密钥）
```

网关与业务服务分别依赖 `-gateway-sdk` 与 `-resource-sdk`，避免重复实现 JWT 校验。

## 5. 三段式服务（api / domain / service）

对外暴露能力、被其他服务依赖的服务（消息、支付等）常拆三段：

```
xxx-message/
├── xxx-message-api/        # 对外 SDK：Feign Client 或异步 Client + 自动配置（META-INF/spring.factories）
├── xxx-message-domain/     # 共享领域模型：跨服务 DTO、枚举（无启动类）
└── xxx-message-service/    # 服务本体：标准业务结构（§3），含第三方接入
```

- 被依赖方用 `-api` 暴露能力，依赖方只引入 `-api`，不引入服务本体；
- 领域模型放 `-domain` 供两段共享，避免 api 与服务重复定义 DTO。

## 6. 公共 / 契约模块结构

```
xxx-common/                           # 全项目共享（详见 03 工具库）
└── src/main/java/com/xxx/common/
    ├── annotations/                  # 自定义注解
    ├── autoconfigure/                # 自动配置，按场景分子包：
    │   ├── mq/                       #   MQ 助手、延迟消息处理器、消息配置
    │   ├── mvc/                      #   统一响应包装、全局异常、参数校验切面、JSON/MVC 配置
    │   ├── mybatis/                  #   MetaObjectHandler 自动填充、MyBatis 配置
    │   ├── redisson/                 #   @Lock 注解 + 切面、锁策略枚举、Redisson 配置
    │   ├── swagger/                  #   Knife4j/Swagger 配置、文档属性
    │   └── xxljob/                   #   XXL-Job 配置与属性
    ├── constants/                    # 全局常量、错误码接口、MQ 常量、正则
    ├── domain/                       # dto/（BaseDTO、IdNameDTO、LoginUserDTO、PageDTO）、query/（PageQuery）、统一响应 R
    ├── enums/                        # BaseEnum、CommonStatus、UserType 等通用枚举
    ├── exceptions/                   # 公共异常基类 + 语义化子类
    ├── filters/                      # 全局过滤器（如 RequestIdFilter 请求链路）
    ├── utils/                        # 通用工具类（详见 03）
    └── validate/                     # 参数校验（枚举校验注解 + 校验器）

xxx-api/                              # 服务间契约聚合（详见 04）
└── src/main/java/com/xxx/api/
    ├── annotations/                  # 开关型注解（如 @EnableXxxCache）
    ├── cache/                        # 共享缓存实现
    ├── client/<领域>/                # Feign Client，按目标服务分包
    │   └── <领域>/fallback/          # 同名 *Fallback（降级实现）
    ├── config/                       # FallbackConfig、缓存配置、RequestId 透传配置
    ├── constants/                    # 跨服务常量
    └── dto/<领域>/                   # 跨服务传输对象
```

## 7. 关键命名约定（速查）

| 项 | 约定 |
|---|---|
| 包根 | `com.<org>`；领域包 `com.<org>.<domain>` |
| 启动类 | `<Domain>Application`（放在包根） |
| Service | 接口 `I<Xxx>Service`，实现 `impl/<Xxx>ServiceImpl`（继承 MP `IService`） |
| 入参 | `*FormDTO` / `*SaveDTO` / `*AddDTO` |
| 出参 | `*VO` / `*PageVO` / `*DetailVO` |
| 分页查询 | `*PageQuery` 继承公共 `PageQuery` |
| PO | 即表实体，`@TableName` 驼峰 |
| Mapper XML | `resources/mapper/<Mapper名>.xml` |
| 配置 profile | `application-{dev|local|test}.yml` |
| 数据库 | 每服务独立库 `xxx_<domain>` |
