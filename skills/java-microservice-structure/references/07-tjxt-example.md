# 07 落地实例：天机学堂（tjxt）

> 本文件是技能包的**真实参照**：tjxt 完整目录树、服务清单、各模块与通用范式的差异。查"某个类在哪个包"或"真实项目长什么样"时读这里。

技术栈：Java 17 / Spring Boot 3.3.5 / Spring Cloud 2023.0.3 / Spring Cloud Alibaba 2023.0.3.2 / MyBatis-Plus 3.5.9 / hutool 5.8.36。根 POM `com.tianji:tjxt` 聚合 17 个模块（构建顺序即依赖顺序）。

## 1. 模块与服务清单

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
| tj-exam | exam-service | 8089 | `/es/**` | 题库（05 的 few-shot 即此模块） |
| tj-learning | learning-service | 8090 | `/ls/**` | 我的课程、学习记录、问答、笔记、积分/签到/排行榜 |
| tj-remark | remark-service | 8091 | `/rs/**` | 点赞 |
| tj-promotion | promotion-service | 8092 | `/prs/**` | 优惠券（发放/兑换/核销）、营销策略 |
| tj-data | data-service | 8093 | `/ds/**` | 数据中心：今日数据、排行榜、Top10 |
| tj-aigc | aigc-service | 8094 | `/ais/**` | Spring AI 智能体（聊天、会话、Embedding、工具） |

## 2. 完整目录树（排除 target/.git/.idea/logs/job）

### 2.1 公共与契约模块

```
tj-common/
└── src/main/java/com/tianji/common/
    ├── annotations/              # NoWrapper（豁免统一响应包装）
    ├── autoconfigure/
    │   ├── mq/                   # RabbitMqHelper、DelayedMessageProcessor、BasicIdMessageProcessor、MqConfig
    │   ├── mvc/                  # advice/(CommonExceptionAdvice|WrapperResponseBodyAdvice)、aspects/CheckerAspect、
    │   │                         # converter/WrapperResponseMessageConverter、JsonConfig、MvcConfig、ParamCheckerConfig
    │   ├── mybatis/              # BaseMetaObjectHandler（自动填充）、MyBatisAutoFillInterceptor、MybatisConfig
    │   ├── redisson/             # annotations/Lock、aspect/LockAspect、enums/(LockStrategy|LockType)、RedissonConfig
    │   ├── swagger/              # Knife4jConfiguration、SwaggerConfigProperties、Swagger 插件
    │   └── xxljob/               # XxlJobConfig、XxlJobProperties
    ├── constants/                # Constant、ErrorInfo、MqConstants、RegexConstants
    ├── domain/                   # dto/(BaseDTO|IdNameDTO|LoginUserDTO|PageDTO)、query/PageQuery、R
    ├── enums/                    # BaseEnum、CommonStatus、UserType
    ├── exceptions/               # CommonException + BadRequest/BizIllegal/Db/Forbidden/RequestTimeout/Unauthorized
    ├── filters/                  # RequestIdFilter
    ├── utils/                    # 约 30 个（详见 03 工具库）
    └── validate/                 # annotations/(EnumValid|ParamChecker)、Checker、EnumValidator、EnumValueValidator

tj-api/
└── src/main/java/com/tianji/api/
    ├── annotations/              # EnableCategoryCache
    ├── cache/                    # CategoryCache、RoleCache（Caffeine 本地缓存）
    ├── client/<领域>/            # auth/AuthClient、course/(Catalogue|Category|Course|Subject)Client、exam/ExamClient、
    │                             # learning/LearningClient、promotion/PromotionClient、remark/RemarkClient、search/SearchClient、
    │                             # trade/(Cart|Trade)Client、user/UserClient
    │   └── <领域>/fallback/      # 同名 *ClientFallback（FallbackFactory）
    ├── config/                   # FallbackConfig、CategoryCacheConfig、RoleCacheConfig、RequestIdRelayConfiguration
    ├── constants/                # CourseStatus、SmsConstants
    └── dto/<领域>/               # auth/ course/ exam/ leanring/(拼写注意) promotion/ remark/ sms/ trade/ user/ + IdAndNumDTO
```

### 2.2 认证（四子模块）

```
tj-auth/
├── tj-auth-common/               # constants/(AuthErrorInfo|JwtConstants)、domain/PrivilegeRoleDTO
├── tj-auth-gateway-sdk/          # config/AuthAutoConfiguration、util/(AuthUtil|JwtSignerHolder)
├── tj-auth-resource-sdk/         # config/(FeignRelayUserAutoConfiguration|ResourceAuthProperties|ResourceInterceptorConfiguration)
│                                 # interceptors/(FeignRelayUserInterceptor|LoginAuthInterceptor|UserInfoInterceptor)
└── tj-auth-service/              # AuthApplication + auth/{config|constants|controller|domain|mapper|service|task|util}
                                  #   task/LoadPrivilegeRunner（启动加载权限缓存）、util/(JwtTool|PrivilegeCache)
                                  # resources/: mapper/*.xml、tjxt.jks（JWT 密钥库）
```

### 2.3 网关

```
tj-gateway/
└── src/main/java/com/tianji/
    ├── GatewayApplication.java
    └── gateway/
        ├── config/AuthProperties.java
        ├── exception/handler/GatewayExceptionHandler.java
        ├── filter/               # AccountAuthFilter（JWT 校验）、RequestIdRelayFilter
        └── swagger/              # GatewaySwaggerResourceProvider、SwaggerResourceController（聚合各服务文档）
```

### 2.4 单模块业务服务

```
tj-user/                          # ★单模块标准范本（controller→service→mapper 见 03/05 示例）
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
        └── service/ I*.java + impl/*ServiceImpl.java（Code/Staff/Student/Teacher/UserDetail/User 六组）

tj-course/                        # 复杂业务范本
└── src/main/java/com/tianji/
    ├── CourseApplication.java
    └── course/
        ├── config/ThreadPoolConfig.java
        ├── constants/            # CourseConstants、CourseErrorInfo、CourseStatus、RedisConstants、RedisContants、SubjectConstants
        ├── controller/           # CatalogueController、CategoryController、CourseController、CourseInfoController
        ├── domain/ dto/*(SaveDTO|AddDTO|ListDTO) | po/*(+Draft 草稿/正式双轨、CataSubject 中间表) | query/CoursePageQuery | vo/*VO
        ├── handler/CourseJobHandler.java              # XXL-Job
        ├── mapper/*Mapper.java（13 个，含 Draft 系列）
        ├── properties/CourseProperties.java
        ├── service/ I*.java + impl/*ServiceImpl.java
        └── utils/(CategoryDataWrapper|CategoryDataWrapper2|CourseSaveBaseGroup|SubjectUtils).java

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

tj-exam/                          # 题库（05 few-shot 的落地）
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
        ├── service/ ILikedRecordService + impl/(LikedRecordServiceImpl|LikedRecordServiceRedisImpl)  # 双实现
        └── task/LikedTimesCheckTask.java
```

### 2.5 特色模块（范式之外的差异点，理解"何时偏离标准"）

```
tj-learning/                      # MQ + 分表 + 延迟任务
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
        ├── mq/                   # message/SignInMessage + (LearningPoints|LessonChange|LikeTimesChange)Listener
        ├── service/ I*.java + impl/*ServiceImpl.java
        └── utils/(DelayTask|LearningRecordDelayTaskHandler|TableInfoContext).java   # 延迟写 + 分表上下文

tj-promotion/                     # 策略模式 + Lua 原子脚本
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
        ├── strategy/ discount/(Discount|DiscountStrategy|NoThreshold|PerPrice|Price|Rate)
        │             + scope/(Scope|ScopeNameHandler|CategoryScope|CourseScope|NoScope)   # 策略模式双族
        └── utils/                # AESUtil、Base32、CodeUtil、PermuteUtil、MyLock*、RedisLock
    resources/lua/(exchange_coupon.lua|receive_coupon.lua)   # Redis Lua 原子发放

tj-search/                        # ES 仓储 + MQ 同步
└── src/main/java/com/tianji/
    ├── SearchApplication.java
    └── search/
        ├── config/(ElasticSearchConfig|InterestsProperties).java
        ├── controller/           # Course、Interests、Recommend
        ├── domain/ po/(Course|Interests) | query/CoursePageQuery | vo/(CourseVO|InterestCategoryVO)
        ├── enums/CourseStatus.java
        ├── mapper/InterestsMapper.java
        ├── mq/(CourseEventListener|OrderEventListener).java     # 消费课程/订单变更 → 同步 ES
        ├── repository/ CourseRepository + impl/CourseRepositoryImpl   # ES 仓储
        └── service/ I*.java + impl/*ServiceImpl.java

tj-media/                         # 存储抽象 + 第三方
└── src/main/java/com/tianji/
    ├── MediaApplication.java
    └── media/
        ├── config/               # AliConfig、AliProperties、TencentConfig、TencentProperties、PlatformProperties
        ├── constants/ 与 enums/  # FileConstants、FileErrorInfo、FilePlatform、FileStatus、Platform
        ├── controller/(File|Media)Controller.java
        ├── domain/ dto|po|query|vo
        ├── mapper/(File|Media)Mapper.java
        ├── service/ I*.java + impl/*ServiceImpl.java
        ├── storage/              # IFileStorage、IMediaStorage、MediaUploadResult + ali/AliFileStorage
        │                         # + tencent/(TencentFileStorage|TencentMediaStorage|UserAccessInfo)
        └── task/PullEventTask.java

tj-data/                          # 数据中心
└── src/main/java/com/tianji/
    ├── DataCenterApplication.java
    └── data/
        ├── constants/(DataTypeEnum|RedisConstants).java
        ├── controller/(Board|TodayData|Top10)Controller.java
        ├── model/ dto|po|vo      # ★用 model/ 替代 domain/；vo: AxisVO、EchartsVO、SerierVO、TodayDataVO、Top10DataVO
        ├── service/ + impl/      # BoardService、TodayDataService、Top10Service（接口无 I 前缀）
        └── utils/DataUtils.java

tj-aigc/                          # Spring AI 智能体
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
        ├── tools/ CourseTools、OrderTools + result/(CourseInfo|PrePlaceOrder)   # 智能体工具
        └── vo/(ChatEventVO|ChatSessionVO|MessageVO|SessionVO).java
    resources/application*.yaml   # ★注意用 .yaml
```

### 2.6 三段式服务

```
tj-message/                       # ★三段式范本
├── tj-message-api/               # client/(AsyncSmsClient|MessageClient)、config/MessageClientConfiguration
├── tj-message-domain/            # dto/SmsInfoDTO、enums/SmsTemplate
└── tj-message-service/           # MessageApplication + message/{config|constants|controller|domain|enums|handler|mapper|properties|service|thirdparty}
    └── thirdparty/               # ali/(AliProperties|AliSmsConfig|AliSmsHandler)、tencent/TencentSmsHandler、uc/UcSmsHandler、ISmsHandler

tj-pay/                           # ★三段式范本
├── tj-pay-api/                   # client/PayClient、config/PayApiImportConfiguration
├── tj-pay-domain/                # sdk/{constants,dto}（PayChannel、PayConstants、PayApplyDTO、PayResultDTO…）
└── tj-pay-service/               # PayApplication + pay/{constants|controller|domain/po|mapper|service|tasks|third}
    ├── tasks/                    # PayOrderCheckTask、RefundOrderCheckTask（对账补偿）
    └── third/                    # ali/(config|AliPayService)、wx/(config|WxPayClient|WxPayService)、model/、IPayService
```

## 3. 各模块差异点总结（偏离标准结构的合理场景）

| 差异 | 模块 | 原因 |
|---|---|---|
| `model/` 替代 `domain/` | tj-data | 数据展示域简单，无 PO 分层的复杂需求 |
| 接口无 I 前缀 | tj-data | 团队局部约定（不推荐推广） |
| 双实现 Service | tj-remark | Redis 版/DB 版切换（策略/开关） |
| `repository/` 仓储 | tj-search | 脱离 MyBatis-Plus 的 ES 数据源 |
| `strategy/` 双策略族 | tj-promotion | 优惠类型与适用范围维度扩展 |
| `mq/` 多 Listener | tj-learning | 跨域事件驱动（订单→课表、点赞→积分） |
| `third/`+`tasks/` 对账 | tj-pay | 支付回调与对账补偿 |
| `.yaml` 配置 | tj-aigc | 团队新模块偏好（不推荐新旧混用） |
| `leanring` 包名拼写错误 | tj-api dto | 历史遗留（新代码不要模仿） |
