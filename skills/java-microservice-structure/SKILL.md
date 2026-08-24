---
name: java-microservice-structure
description: 通用 Java 微服务（Spring Cloud + Spring Boot）项目的模块划分与目录结构设计范式。在微服务仓库中开发、导航、新增/修改模块、定位代码、评估影响面时使用本 skill 获取标准模块树、服务命名/端口/路由前缀、包分层约定与跨服务协作方式。本 skill 以天机学堂（tjxt）仓库为落地实例，改动了模块结构后应按文末「积淀与更新」流程把新结构沉淀回本 skill。
whenToUse: 在 Java 微服务项目（Spring Cloud + Spring Boot + MyBatis-Plus 等）中工作时，需要了解微服务项目有哪些模块、某个类通常位于哪个包、新增服务/新增功能该按什么目录结构落地、或需要保持模块结构与行业约定一致时。
---

# Java 微服务架构模块结构

主流 Java 微服务（Spring Cloud + Spring Boot + Spring Cloud Alibaba + MyBatis-Plus）的模块划分与目录结构有高度一致的行业范式。本 skill 先给通用范式，再以天机学堂（tjxt）仓库为落地实例展示完整目录树。

## 0. 架构速览（通用形态）

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
   服务间调用：Feign（契约集中定义 client + fallback）+ RabbitMQ/RocketMQ（异步/延迟消息）+ XXL-Job（定时任务）
   基础设施：MySQL（每服务独立库）/ Redis / Elasticsearch / 对象存储（OSS·COS）/ 第三方支付·短信
```

## 1. 模块划分范式

一个完整的微服务工程通常包含以下几类模块（构建顺序即依赖顺序）：

| 类别 | 模块 | 是否有启动类 | 职责 |
|---|---|---|---|
| 公共基础 | `xxx-common`（如 tj-common） | 否（library） | 工具类、统一响应/异常、通用自动配置（MyBatis 填充、Redis 锁、MQ 助手、Swagger、XXL-Job） |
| 契约聚合 | `xxx-api`（如 tj-api） | 否（library） | 所有 Feign Client、跨服务 DTO、共享常量/缓存，供多个服务复用 |
| 网关 | `xxx-gateway`（如 tj-gateway） | 是 | 路由转发（lb://）、统一鉴权过滤器、跨域、聚合 Swagger |
| 认证中心 | `xxx-auth` | 视子模块而定 | 登录/令牌/权限；常 SDK 化拆分（见 1.1） |
| 业务服务 | `xxx-user`、`xxx-course`、`xxx-order`… | 是 | 单一业务域，独立库 `xxx_<domain>` |
| 三段式服务 | `xxx-message`、`xxx-pay`… | service 子模块是 | 对外 SDK + 共享领域模型 + 服务本体（见 1.2） |

### 1.1 认证中心 SDK 化（四子模块）

认证服务常拆 4 个子模块，网关与业务服务通过 SDK 复用，避免重复实现：

```
xxx-auth/
├── xxx-auth-common/        # 认证公共常量/领域对象（错误码、JWT 常量、权限 DTO）
├── xxx-auth-gateway-sdk/   # 网关侧 SDK：网关过滤器/校验工具、JWT 签名持有者（自动配置）
├── xxx-auth-resource-sdk/  # 资源服务侧 SDK：登录拦截器、用户信息透传拦截器、Feign 透传配置
└── xxx-auth-service/       # 认证服务本体（账号/角色/权限/菜单控制器，签发 JWT 的 jks 密钥）
```

### 1.2 三段式服务（api / domain / service）

对外暴露能力、被其他服务依赖的服务（消息、支付等）常拆三段：

```
xxx-message/
├── xxx-message-api/        # 对外 SDK：Feign Client 或异步 Client + 自动配置（META-INF/spring.factories）
├── xxx-message-domain/     # 共享领域模型：跨服务 DTO、枚举（无启动类）
└── xxx-message-service/    # 服务本体：标准业务结构（见 2），含第三方接入
```

### 1.3 单模块业务服务

大多数内部业务服务（用户、课程、订单…）为单模块，直接套用第 2 节标准结构。

## 2. 业务服务标准目录结构（核心范式）

```
xxx-user/                             # 单模块业务服务
├── pom.xml                           # 依赖 tj-common、tj-api、tj-auth-resource-sdk 等
└── src/main/
    ├── java/com/company/             # 包根：com.<组织>.<领域>；启动类在 com.<组织> 下
    │   ├── UserApplication.java      # 启动类命名 = <领域>Application（如 CourseApplication、TradeApplication）
    │   └── user/                     # 领域包 = com.<组织>.<领域>
    │       ├── config/               # 业务配置类（SecurityConfig、ThreadPoolConfig、业务 Properties）
    │       ├── constants/            # XxxConstants（常量）、XxxErrorInfo（错误码文案）
    │       ├── controller/           # HTTP 接口；后台/前台常拆分 *AdminController 或按角色分控制器
    │       ├── domain/
    │       │   ├── dto/              # 入参/传输对象：*FormDTO、*SaveDTO、*AddDTO、*DTO
    │       │   ├── po/               # 数据库实体（MyBatis-Plus），表名驼峰
    │       │   ├── query/            # 分页查询：*Query、*PageQuery（继承公共模块 PageQuery）
    │       │   └── vo/               # 出参对象：*VO、*PageVO、*DetailVO
    │       ├── enums/                # 业务枚举（实现公共 BaseEnum 便于校验/序列化）
    │       ├── mapper/               # MyBatis-Plus Mapper 接口（复杂 SQL 对应 resources/mapper/*.xml）
    │       ├── service/
    │       │   ├── I<Xxx>Service.java        # 接口（I 前缀）
    │       │   └── impl/<Xxx>ServiceImpl.java # 实现（继承 MP IService/ServiceImpl）
    │       ├── handler/              # XXL-Job 任务 *JobHandler、MQ 消息处理器 *Handler
    │       ├── properties/           # @ConfigurationProperties 配置类（*Properties）
    │       ├── mq/                   # 消息：message/（消息体）、*Listener/*Handler（消费）
    │       ├── task/                 # 定时任务（也可并入 handler/）
    │       ├── strategy/             # 策略模式（如优惠策略 discount/scope、支付渠道）
    │       ├── thirdparty/ 或 third/ # 第三方接入：ali/、tencent/、wx/（含 config/Properties/Handler）
    │       ├── storage/              # 存储抽象（IFileStorage/IMediaStorage + 各云实现）
    │       ├── repository/           # 仓储模式（如 ES 仓储 CourseRepository + impl）
    │       └── utils/                # 业务工具类
    └── resources/
        ├── mapper/*.xml              # MyBatis XML（与 Mapper 接口同名）
        ├── application.yml           # 基础配置：server.port、spring.application.name、自定义 tj.* 配置
        ├── application-dev.yml       # 开发环境（注册中心地址、密钥）
        ├── application-local.yml     # 本地环境
        ├── application-test.yml      # 测试环境（生产部署 profile）
        └── static/favicon.ico
```

## 3. 公共 / 契约模块标准结构

```
xxx-common/                           # 全项目共享
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
    ├── exceptions/                   # 公共异常基类 + 语义化子类（BadRequest/BizIllegal/Forbidden/Unauthorized/Db…）
    ├── filters/                      # 全局过滤器（如 RequestIdFilter 请求链路）
    ├── utils/                        # 通用工具类（Bean/Coll/Json/Date/Web/UserContext…）
    └── validate/                     # 参数校验（枚举校验注解 + 校验器）
    └── resources/META-INF/spring.factories 或 AutoConfiguration.imports   # 自动配置注册

xxx-api/                              # 服务间契约聚合
└── src/main/java/com/xxx/api/
    ├── annotations/                  # 开关型注解（如 @EnableXxxCache）
    ├── cache/                        # 共享缓存实现（如分类/角色缓存）
    ├── client/<领域>/                # Feign Client，按目标服务分包
    │   └── <领域>/fallback/          # 同名 *Fallback（降级实现）
    ├── config/                       # FallbackConfig、缓存配置、RequestId 透传配置
    ├── constants/                    # 跨服务常量
    └── dto/<领域>/                   # 跨服务传输对象
    └── resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

## 4. 关键约定

1. **包根**：`com.<组织>`；业务领域包 `com.<组织>.<领域>`，启动类命名 `<领域>Application` 放在包根。
2. **分层**：`controller → service（I 接口 + impl 实现）→ mapper`；领域模型统一 `domain/` 下 `dto|po|query|vo` 四子包（少数服务用 model/ 或平铺，属特例）。
3. **命名**：接口 `I<Xxx>Service`、实现 `<Xxx>ServiceImpl`（继承 MyBatis-Plus IService）；PO 即表实体；入参 `*FormDTO/*SaveDTO/*AddDTO`，出参 `*VO`，分页查询 `*PageQuery` 继承公共 `PageQuery`。
4. **统一响应与异常**：响应统一包装（`R<T>` + ResponseBodyAdvice）；错误码集中在各服务 `*ErrorInfo`，异常用公共异常体系。
5. **服务间调用**：Feign Client 一律集中在契约模块 `client/<领域>/`，降级 `*Fallback` 放同包 `fallback/`；消费方声明依赖契约模块。
6. **消息**：MQ 助手/延迟消息由公共模块提供；消费方在 `mq/` 或 `handler/` 定义 Listener/Handler。
7. **缓存**：Redis + Redisson 分布式锁（公共模块 @Lock）；业务 key 常量放各服务 `constants/RedisConstants.java`。
8. **定时任务**：XXL-Job（公共模块配置），任务类命名 `*JobHandler` 或 `*Task`，放 `handler/` 或 `task/`。
9. **配置**：每服务 `application.yml` 定义 `spring.application.name` 与端口，自定义配置用统一前缀（如 `tj.*`）；profile 文件 `application-{dev|local|test}.yml`；生产常用 Docker 部署（Dockerfile + 启动脚本，`SPRING_PROFILES_ACTIVE=test`）。
10. **数据库**：每服务独立库 `xxx_<domain>`；字段自动填充由公共模块 MetaObjectHandler 提供。
11. **安全**：JWT（RS256，认证服务持有 jks），网关过滤器校验并透传用户，资源 SDK 拦截器解析用户上下文，Feign 拦截器透传用户。
12. **网关路由**：`/<前缀>/**` → `lb://<service-name>`，默认 StripPrefix 去前缀；新服务需在网关配置增加路由。

## 5. 落地实例：天机学堂（tjxt）

tjxt 完全按上述范式落地，技术栈 Java 17 / Spring Boot 3.3.5 / Spring Cloud 2023.0.3 / Spring Cloud Alibaba 2023.0.3.2 / MyBatis-Plus 3.5.9。根 POM `com.tianji:tjxt` 聚合 17 个模块。

### 5.1 模块与服务清单

| 模块 | spring.application.name | 端口 | 网关前缀 | 职责要点 |
|---|---|---|---|---|
| tj-gateway | gateway-service | 10010 | `/` | 路由（lb://）、StripPrefix=1、鉴权过滤器、跨域、Swagger 聚合 |
| tj-auth | auth-service | 8081 | `/as/**` | 登录（JWT RS256 + jks）、账号/角色/权限/菜单、JWK |
| tj-user | user-service | 8082 | `/us/**` | 用户（学生/教师/员工）、详情 |
| tj-search | search-service | 8083 | `/ss/**` | ES 课程搜索、兴趣推荐 |
| tj-media | media-service | 8084 | `/ms/**` | 文件/视频上传（阿里 OSS + 腾讯 COS/VOD） |
| tj-message | message-service | 8085 | `/sms/**` | 短信（阿里/腾讯/云片）、站内信、通知 |
| tj-course | course-service | 8086 | `/cs/**` | 课程管理（草稿/正式双轨）、目录、分类、学科 |
| tj-pay | pay-service | 8087 | `/ps/**` | 支付（支付宝/微信）、支付/退款订单、回调 |
| tj-trade | trade-service | 8088 | `/ts/**` | 购物车、订单、退款申请 |
| tj-exam | exam-service | 8089 | `/es/**` | 题库 |
| tj-learning | learning-service | 8090 | `/ls/**` | 我的课程、学习记录、问答、笔记、积分/签到/排行榜 |
| tj-remark | remark-service | 8091 | `/rs/**` | 点赞 |
| tj-promotion | promotion-service | 8092 | `/prs/**` | 优惠券（发放/兑换/核销）、营销策略 |
| tj-data | data-service | 8093 | `/ds/**` | 数据中心：今日数据、排行榜、Top10 |
| tj-aigc | aigc-service | 8094 | `/ais/**` | Spring AI 智能体（聊天、会话、Embedding、工具） |

### 5.2 各模块落地差异

- **tj-course**（复杂业务范本）：草稿/正式双轨（`*Draft` 表与 PO、CataSubject 中间表）、`handler/CourseJobHandler`、`properties/CourseProperties`。
- **tj-learning**：`mq/`（SignInMessage、LearningPointsListener、LessonChangeListener、LikeTimesChangeListener）；`utils/` 延迟任务（DelayTask、LearningRecordDelayTaskHandler、TableInfoContext 分表上下文）。
- **tj-trade**：`handler/PayMessageHandler`、`RefundJobHandler`；`config/ThreadPoolConfig`、`TradeProperties`。
- **tj-promotion**：`strategy/discount` 与 `strategy/scope` 策略族；`resources/lua/`（exchange_coupon.lua、receive_coupon.lua 原子发放）；`utils/` 自研锁（MyLock*、RedisLock）。
- **tj-search**：`repository/CourseRepository + impl`；`mq/`（CourseEventListener、OrderEventListener 同步 ES）；`config/ElasticSearchConfig`。
- **tj-media**：`storage/`（IFileStorage/IMediaStorage + ali/tencent）；`task/PullEventTask`。
- **tj-pay**：三段式（tj-pay-api / tj-pay-domain / tj-pay-service）；`third/`（ali、wx + model/）；`tasks/`（PayOrderCheckTask、RefundOrderCheckTask 对账）。
- **tj-remark**：`service/impl` 双实现（LikedRecordServiceImpl、LikedRecordServiceRedisImpl）；`task/LikedTimesCheckTask`。
- **tj-message**：三段式（tj-message-api / tj-message-domain / tj-message-service）；`thirdparty/ali|tencent|uc`。
- **tj-data**：`model/`（dto/po/vo）替代 domain/；service 接口无 I 前缀（BoardService 等）。
- **tj-aigc**：dto/ 与 entity/ 平铺；`memory/`（RedisChatMemoryRepository）、`tools/`（CourseTools、OrderTools 智能体工具）；配置文件用 `.yaml` 而非 `.yml`。
- **tj-auth**：四子模块（tj-auth-common / tj-auth-gateway-sdk / tj-auth-resource-sdk / tj-auth-service）；`util/JwtTool`、`task/LoadPrivilegeRunner`、resources 下 `tjxt.jks`。
- **tj-api**：`client/` 下 auth、course、exam、learning、promotion、remark、search、trade、user 九个领域包，含 `fallback/` 降级；`cache/`（CategoryCache、RoleCache）。
- **tj-common**：`autoconfigure/mq|mvc|mybatis|redisson|swagger|xxljob` 六组自动配置；utils 约 30 个工具类。

### 5.3 完整目录树（排除 target/.git/.idea/logs/job）

```
tj-common/
└── src/main/java/com/tianji/common/
    ├── annotations/              # NoWrapper
    ├── autoconfigure/
    │   ├── mq/                   # RabbitMqHelper、DelayedMessageProcessor、BasicIdMessageProcessor、MqConfig
    │   ├── mvc/                  # advice/(CommonExceptionAdvice|WrapperResponseBodyAdvice)、aspects/CheckerAspect、
    │   │                         # converter/WrapperResponseMessageConverter、JsonConfig、MvcConfig、ParamCheckerConfig
    │   ├── mybatis/              # BaseMetaObjectHandler、MyBatisAutoFillInterceptor、MybatisConfig
    │   ├── redisson/             # annotations/Lock、aspect/LockAspect、enums/(LockStrategy|LockType)、RedissonConfig
    │   ├── swagger/              # Knife4jConfiguration、SwaggerConfigProperties、Swagger 插件
    │   └── xxljob/               # XxlJobConfig、XxlJobProperties
    ├── constants/                # Constant、ErrorInfo、MqConstants、RegexConstants
    ├── domain/                   # dto/(BaseDTO|IdNameDTO|LoginUserDTO|PageDTO)、query/PageQuery、R
    ├── enums/                    # BaseEnum、CommonStatus、UserType
    ├── exceptions/               # CommonException + BadRequest/BizIllegal/Db/Forbidden/RequestTimeout/Unauthorized
    ├── filters/                  # RequestIdFilter
    ├── utils/                    # BeanUtils、CollUtils、JsonUtils、UserContext、TokenContext、RequestUtils、
    │                             # WebUtils、DateUtils、TreeDataUtils 等约 30 个
    └── validate/                 # annotations/(EnumValid|ParamChecker)、Checker、EnumValidator、EnumValueValidator

tj-api/
└── src/main/java/com/tianji/api/
    ├── annotations/              # EnableCategoryCache
    ├── cache/                    # CategoryCache、RoleCache
    ├── client/<领域>/            # AuthClient、CatalogueClient、CategoryClient、CourseClient、SubjectClient、ExamClient、
    │                             # LearningClient、PromotionClient、RemarkClient、SearchClient、CartClient、TradeClient、UserClient
    │   └── <领域>/fallback/      # 同名 *ClientFallback
    ├── config/                   # FallbackConfig、CategoryCacheConfig、RoleCacheConfig、RequestIdRelayConfiguration
    ├── constants/                # CourseStatus、SmsConstants
    └── dto/<领域>/               # auth/ course/ exam/ leanring/(拼写) promotion/ remark/ sms/ trade/ user/ + IdAndNumDTO

tj-auth/
├── tj-auth-common/               # constants/(AuthErrorInfo|JwtConstants)、domain/PrivilegeRoleDTO
├── tj-auth-gateway-sdk/          # config/AuthAutoConfiguration、util/(AuthUtil|JwtSignerHolder)
├── tj-auth-resource-sdk/         # config/(FeignRelayUserAutoConfiguration|ResourceAuthProperties|ResourceInterceptorConfiguration)
│                                 # interceptors/(FeignRelayUserInterceptor|LoginAuthInterceptor|UserInfoInterceptor)
└── tj-auth-service/              # AuthApplication + auth/{config|constants|controller|domain|mapper|service|task|util}
                                  # resources/: mapper/*.xml、tjxt.jks

tj-gateway/
└── src/main/java/com/tianji/
    ├── GatewayApplication.java
    └── gateway/                  # config/AuthProperties、exception/handler/GatewayExceptionHandler、
                                  # filter/(AccountAuthFilter|RequestIdRelayFilter)、swagger/(GatewaySwaggerResourceProvider|SwaggerResourceController)

tj-user/                          # ★ 单模块业务服务标准范本
└── src/main/java/com/tianji/
    ├── UserApplication.java
    └── user/
        ├── config/SecurityConfig.java
        ├── constants/(UserConstants|UserErrorInfo).java
        ├── controller/(Staff|Student|Teacher|User)Controller.java
        ├── domain/ dto/(StudentFormDTO|UserFormDTO) | po/(User|UserDetail) | query/UserPageQuery
        │            vo/(StaffVO|StudentPageVo|TeacherPageVO|UserBasicVO|UserDetailVO)
        ├── enums/UserStatus.java
        ├── mapper/(UserDetailMapper|UserMapper).java
        └── service/ I*.java + impl/*ServiceImpl.java（6 组：Code/Staff/Student/Teacher/UserDetail/User）

tj-course/
└── src/main/java/com/tianji/
    ├── CourseApplication.java
    └── course/
        ├── config/ThreadPoolConfig.java
        ├── constants/            # CourseConstants、CourseErrorInfo、CourseStatus、RedisConstants、RedisContants、SubjectConstants
        ├── controller/           # CatalogueController、CategoryController、CourseController、CourseInfoController
        ├── domain/ dto/*(SaveDTO|AddDTO|ListDTO) | po/*(+Draft 双轨、CataSubject 中间表) | query/CoursePageQuery | vo/*VO
        ├── handler/CourseJobHandler.java
        ├── mapper/*Mapper.java（13 个，含 Draft 系列）
        ├── properties/CourseProperties.java
        ├── service/ I*.java + impl/*ServiceImpl.java
        └── utils/(CategoryDataWrapper|CategoryDataWrapper2|CourseSaveBaseGroup|SubjectUtils).java

tj-learning/
└── src/main/java/com/tianji/
    ├── LearningApplication.java
    └── learning/
        ├── config/MybatisConfiguration.java
        ├── constants/(LearningConstants|RedisConstants).java
        ├── controller/           # LearningLesson、LearningRecord、Note(+Admin)、InteractionQuestion(+Admin)、
        │                         # InteractionReply(+Admin)、PointsBoard、PointsRecord、SignRecord
        ├── domain/ dto|po|query|vo   # po 含 PointsBoard(按月分表)、PointsBoardSeason
        ├── enums/                # LessonStatus、PlanStatus、PointsRecordType、QuestionStatus、SectionType
        ├── handler/PointsBoardPersistentHandler.java
        ├── mapper/*Mapper.java（9 个）
        ├── mq/ message/SignInMessage + (LearningPoints|LessonChange|LikeTimesChange)Listener
        ├── service/ I*.java + impl/*ServiceImpl.java
        └── utils/(DelayTask|LearningRecordDelayTaskHandler|TableInfoContext).java

tj-trade/
└── src/main/java/com/tianji/
    ├── TradeApplication.java
    └── trade/
        ├── config/(ThreadPoolConfig|TradeProperties).java
        ├── constants/            # OrderCancelReason、OrderStatus、RefundStatus、TradeErrorInfo
        ├── controller/           # Cart、Order、OrderDetail、Pay、RefundApply
        ├── domain/ dto|po|query|vo   # po: Cart、Order、OrderDetail、RefundApply
        ├── handler/(PayMessageHandler|RefundJobHandler).java
        ├── mapper/(Cart|Order|OrderDetail|RefundApply)Mapper.java
        └── service/ I*.java + impl/*ServiceImpl.java

tj-promotion/
└── src/main/java/com/tianji/
    ├── PromotionApplication.java
    └── promotion/
        ├── config/(ExchangeCodeConfig|PromotionConfig).java
        ├── constants/ 与 enums/  # CouponStatus、DiscountType、ExchangeCodeStatus、ObtainType、ScopeType、UserCouponStatus
        ├── controller/           # Coupon、ExchangeCode、UserCoupon
        ├── domain/ dto|po|query|vo   # po: Coupon、CouponScope、ExchangeCode、Promotion、UserCoupon
        ├── handler/(CouponIssueTaskHandler|CouponJobHandler|PromotionMqHandler).java
        ├── mapper/*Mapper.java（5 个）
        ├── service/ I*.java + impl/*ServiceImpl.java
        ├── strategy/ discount/(Discount|DiscountStrategy|NoThreshold|PerPrice|Price|Rate) + scope/(Scope|ScopeNameHandler|CategoryScope|CourseScope|NoScope)
        └── utils/                # AESUtil、Base32、CodeUtil、PermuteUtil、MyLock*、RedisLock
    resources/lua/(exchange_coupon.lua|receive_coupon.lua)

tj-search/
└── src/main/java/com/tianji/
    ├── SearchApplication.java
    └── search/
        ├── config/(ElasticSearchConfig|InterestsProperties).java
        ├── controller/           # Course、Interests、Recommend
        ├── domain/ po/(Course|Interests) | query/CoursePageQuery | vo/(CourseVO|InterestCategoryVO)
        ├── enums/CourseStatus.java
        ├── mapper/InterestsMapper.java
        ├── mq/(CourseEventListener|OrderEventListener).java
        ├── repository/ CourseRepository + impl/CourseRepositoryImpl
        └── service/ I*.java + impl/*ServiceImpl.java

tj-media/
└── src/main/java/com/tianji/
    ├── MediaApplication.java
    └── media/
        ├── config/               # AliConfig、AliProperties、TencentConfig、TencentProperties、PlatformProperties
        ├── constants/ 与 enums/  # FileConstants、FileErrorInfo、FilePlatform、FileStatus、Platform
        ├── controller/(File|Media)Controller.java
        ├── domain/ dto|po|query|vo
        ├── mapper/(File|Media)Mapper.java
        ├── service/ I*.java + impl/*ServiceImpl.java
        ├── storage/ IFileStorage、IMediaStorage、MediaUploadResult + ali/AliFileStorage + tencent/(TencentFileStorage|TencentMediaStorage|UserAccessInfo)
        └── task/PullEventTask.java

tj-exam/
└── src/main/java/com/tianji/
    ├── ExamApplication.java
    └── exam/
        ├── constants/(ExamErrorInfo|QuestionType).java
        ├── controller/(Question|QuestionBiz)Controller.java
        ├── domain/ dto|po|query|vo   # po: Question、QuestionDetail、QuestionBiz
        ├── mapper/(Question|QuestionDetail|QuestionBiz)Mapper.java
        └── service/ I*.java + impl/*ServiceImpl.java

tj-remark/
└── src/main/java/com/tianji/
    ├── RemarkApplication.java
    └── remark/
        ├── constants/RedisConstants.java
        ├── controller/LikedRecordController.java
        ├── domain/ dto/LikeRecordFormDTO | po/LikedRecord
        ├── mapper/LikedRecordMapper.java
        ├── service/ ILikedRecordService + impl/(LikedRecordServiceImpl|LikedRecordServiceRedisImpl)
        └── task/LikedTimesCheckTask.java

tj-data/
└── src/main/java/com/tianji/
    ├── DataCenterApplication.java
    └── data/
        ├── constants/(DataTypeEnum|RedisConstants).java
        ├── controller/(Board|TodayData|Top10)Controller.java
        ├── model/ dto|po|vo   # vo: AxisVO、EchartsVO、SerierVO、TodayDataVO、Top10DataVO
        ├── service/ + impl/   # BoardService、TodayDataService、Top10Service（接口无 I 前缀）
        └── utils/DataUtils.java

tj-aigc/
└── src/main/java/com/tianji/
    ├── AIGCApplication.java
    └── aigc/
        ├── config/              # AIProperties、SessionProperties、SpringAIConfig、SystemPromptConfig、ToolResultHolder
        ├── constants/Constant.java
        ├── controller/(Chat|Embedding|Session)Controller.java
        ├── dto/ChatDTO.java
        ├── entity/ChatSession.java
        ├── enums/(ChatEventTypeEnum|MessageTypeEnum).java
        ├── mapper/ChatSessionMapper.java
        ├── memory/              # RedisChatMemoryRepository、MyMessage、MyAssistantMessage、MessageUtil
        ├── service/ + impl/     # ChatService、ChatSessionService
        ├── tools/ CourseTools、OrderTools + result/(CourseInfo|PrePlaceOrder)
        └── vo/(ChatEventVO|ChatSessionVO|MessageVO|SessionVO).java
    resources/application*.yaml   # 注意用 .yaml

tj-message/                       # 三段式范本
├── tj-message-api/               # client/(AsyncSmsClient|MessageClient)、config/MessageClientConfiguration
├── tj-message-domain/            # dto/SmsInfoDTO、enums/SmsTemplate
└── tj-message-service/           # MessageApplication + message/{config|constants|controller|domain|enums|handler|mapper|properties|service|thirdparty}
    resources/mapper/*.xml        # IExamService.xml、ISmsHandler.xml、NoticeTaskMapper.xml 等

tj-pay/                           # 三段式范本
├── tj-pay-api/                   # client/PayClient、config/PayApiImportConfiguration
├── tj-pay-domain/                # sdk/{constants,dto}（PayChannel、PayConstants、PayApplyDTO、PayResultDTO…）
└── tj-pay-service/               # PayApplication + pay/{constants|controller|domain/po|mapper|service|tasks|third}
    └── third/                    # ali/(config|AliPayService)、wx/(config|WxPayClient|WxPayService)、model/(PayStatus|RefundStatus|…)、IPayService
```

## 6. 积淀与更新（本 skill 的维护）

当以下情况发生时，应更新本 skill（保持与仓库结构一致）：
1. **新增/删除模块**：更新第 1 节模块分类、服务清单表（第 5.1 节）与架构图；给出新模块目录树（多子模块按 1.1/1.2 范式）。
2. **模块内新增包/重要文件**：更新对应模块的完整树（第 5 节），并提炼到第 4 节约定（若形成新模式）。
3. **约定变化**：更新第 4 节关键约定；与通用范式不同的特例在对应模块树旁标注。

维护要点：
- 用 `Get-ChildItem -Recurse`（Windows）或 `tree`/`find`（Linux/macOS）生成目录树时排除 `target/`、`.git/`、`.idea/`、`logs/`、`job/` 等生成目录。
- 保持树形图为 ASCII 缩进（`├──`/`└──`），深路径用注释横向合并说明。
- 更新后无需重启任何服务；DSH 自动发现 skill，编辑正文后下次加载即为最新（frontmatter 变更才触发目录刷新）。
