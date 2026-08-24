# 02 pom 依赖配置指南

> 本文件回答：一个微服务模块的 pom 应该包含什么？哪些是**核心必备**，哪些是**可插拔可选**？版本如何统一管理？

素材来自 tjxt 真实 pom（根 pom 版本管理 + tj-user/tj-common/tj-api/tj-gateway/tj-search/tj-learning/tj-auth 等模块依赖）。

## 1. 依赖分层总览

```
        ┌──────────────────────────────────────────────┐
        │ 根 pom：dependencyManagement 统一版本（唯一版本源）│
        └──────────────────────────────────────────────┘
    ┌──────────────────────┬───────────────────────────┐
    │ 核心必备（几乎所有服务） │ 可插拔可选（按业务按需添加）    │
    ├──────────────────────┼───────────────────────────┤
    │ spring-boot-starter-web│ ES：spring-boot-starter- │
    │ knife4j（API 文档）     │      data-elasticsearch + │
    │ mybatis-plus-spring-  │      rest-high-level-client│
    │   boot3-starter       │ MQ：spring-boot-starter-  │
    │ mysql-connector-java  │      amqp                 │
    │ spring-boot-starter-  │ 锁/缓存：redisson、caffeine│
    │   data-redis          │ 任务：xxl-job-core         │
    │ nacos-discovery/config│ 容错：sentinel             │
    │ loadbalancer          │ 对象存储/支付/短信：阿里/腾讯│
    │ auth-resource-sdk     │      SDK（按厂商）          │
    │ 内部模块（common/api）  │ hutool（工具，common 里已带）│
    └──────────────────────┴───────────────────────────┘
```

## 2. 核心必备依赖（复用场景最多，基本每个业务服务都加）

| 依赖 | 作用 | 说明 |
|---|---|---|
| `spring-boot-starter-web` | Web 服务 | 业务服务必有；网关用 `gateway`，公共库不引 |
| `knife4j-openapi3-jakarta-spring-boot-starter` | 接口文档 | 结合 OpenAPI3 注解 `@Tag`/`@Operation` |
| `mybatis-plus-spring-boot3-starter` | ORM | Spring Boot 3 专用坐标；公共库用 `mybatis-plus-core/extension` |
| `mysql-connector-java` | 数据库驱动 | 版本由根 pom 管理（8.0.x） |
| `spring-boot-starter-data-redis` | Redis 客户端 | 缓存/分布式场景必备 |
| `spring-cloud-starter-alibaba-nacos-discovery` | 服务注册发现 | 服务间调用的基础 |
| `spring-cloud-starter-alibaba-nacos-config` | 配置中心 | 统一配置管理（bootstrap 读取） |
| `spring-cloud-starter-loadbalancer` | 客户端负载均衡 | 配合 Feign 的 `lb://` 调用 |
| `tj-auth-resource-sdk`（内部） | 登录鉴权拦截 | 业务服务解析用户上下文 |
| `tj-api`（内部） | Feign 契约 | 跨服务调用 |
| `tj-message-api`（内部） | 消息 SDK | 需要发短信/通知时 |
| 父工程 `spring-boot-starter-parent` | 依赖版本基线 | 根 pom 继承 |

## 3. 可插拔可选依赖（按业务场景按需添加）

| 场景 | 依赖 | 用途 | 典型使用者 |
|---|---|---|---|
| 搜索 | `spring-boot-starter-data-elasticsearch` + `elasticsearch-rest-high-level-client` | ES 索引/搜索 | tj-search |
| 异步消息 | `spring-boot-starter-amqp` | RabbitMQ 生产/消费 | tj-learning/tj-remark/tj-search（消费订单/课程变更） |
| 分布式锁/更丰富缓存 | `redisson` | `@Lock` 注解、RedissonClient | tj-common（全局）、tj-learning/tj-search/tj-auth |
| 本地缓存 | `caffeine` | 高频只读数据的 JVM 缓存（如角色/分类） | tj-api（CategoryCache/RoleCache） |
| 定时任务 | `xxl-job-core` | XXL-Job 分布式调度 | tj-common（全局配置）、tj-learning/tj-message |
| 服务容错 | `spring-cloud-starter-alibaba-sentinel` | 限流/熔断（配合 Feign fallback） | tj-api |
| 工具 | `hutool-all` | JSON/集合/日期/加密等通用工具 | tj-common（全局），业务服务间接获得 |
| 第三方（按厂商） | 阿里 OSS/KMS/支付宝 SDK、腾讯 COS/VOD/短信 SDK | 文件存储、支付、短信 | tj-media/tj-pay/tj-message |

> **可插拔原则**：不需要的依赖不要加。例如普通业务服务（tj-user/tj-course/tj-trade）**不加** ES、MQ、xxl-job；只有涉及异步/搜索/任务的模块才引入。

## 4. 版本管理（根 pom 的 dependencyManagement）

版本只在根 pom 的 `properties` + `dependencyManagement` 定义一次，子模块**不写 version**（内部模块除外，见下）：

```xml
<properties>
    <maven.compiler.source>17</maven.compiler.source>
    <spring-cloud.version>2023.0.3</spring-cloud.version>
    <spring-cloud-alibaba.version>2023.0.3.2</spring-cloud-alibaba.version>
    <mybatis-plus.version>3.5.9</mybatis-plus.version>
    <hutool.version>5.8.36</hutool.version>
    <!-- ... -->
</properties>
<dependencyManagement>
    <dependencies>
        <dependency> <!-- Spring Cloud BOM -->
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring-cloud.version}</version>
            <type>pom</type><scope>import</scope>
        </dependency>
        <dependency> <!-- Spring Cloud Alibaba BOM -->
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-alibaba-dependencies</artifactId>
            <version>${spring-cloud-alibaba.version}</version>
            <type>pom</type><scope>import</scope>
        </dependency>
        <dependency> <!-- MyBatis-Plus BOM -->
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-bom</artifactId>
            <version>${mybatis-plus.version}</version>
            <type>pom</type><scope>import</scope>
        </dependency>
        <!-- 具体版本管理：knife4j、腾讯/阿里 SDK、redisson、xxl-job、swagger 等 -->
    </dependencies>
</dependencyManagement>
```

子模块写法（tj-user 实例）：

```xml
<parent>
    <artifactId>tjxt</artifactId>
    <groupId>com.tianji</groupId>
    <version>1.0.0</version>
</parent>
<artifactId>tj-user</artifactId>
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- 内部模块需显式 version（不在 dependencyManagement 中） -->
    <dependency>
        <groupId>com.tianji</groupId>
        <artifactId>tj-auth-resource-sdk</artifactId>
        <version>1.0.0</version>
    </dependency>
</dependencies>
<build>
    <finalName>${project.artifactId}</finalName>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

## 5. 典型业务服务完整 pom（模板，可直接套用）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <artifactId>xxx-parent</artifactId>
        <groupId>com.xxx</groupId>
        <version>1.0.0</version>
    </parent>
    <modelVersion>4.0.0</modelVersion>
    <artifactId>xxx-user</artifactId>

    <dependencies>
        <!-- Web -->
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
        <!-- 接口文档 -->
        <dependency><groupId>com.github.xiaoymin</groupId><artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId></dependency>
        <!-- ORM + 驱动 -->
        <dependency><groupId>com.baomidou</groupId><artifactId>mybatis-plus-spring-boot3-starter</artifactId></dependency>
        <dependency><groupId>mysql</groupId><artifactId>mysql-connector-java</artifactId></dependency>
        <!-- Redis -->
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-redis</artifactId></dependency>
        <!-- 注册/配置中心 -->
        <dependency><groupId>com.alibaba.cloud</groupId><artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId></dependency>
        <dependency><groupId>com.alibaba.cloud</groupId><artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId></dependency>
        <!-- 负载均衡 -->
        <dependency><groupId>org.springframework.cloud</groupId><artifactId>spring-cloud-starter-loadbalancer</artifactId></dependency>
        <!-- 内部：鉴权 SDK + 契约 -->
        <dependency><groupId>com.xxx</groupId><artifactId>xxx-auth-resource-sdk</artifactId><version>1.0.0</version></dependency>
        <dependency><groupId>com.xxx</groupId><artifactId>xxx-api</artifactId><version>1.0.0</version></dependency>
        <!-- 可选：按需添加 ES / amqp / redisson / xxl-job / caffeine ... -->
    </dependencies>

    <build>
        <finalName>${project.artifactId}</finalName>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

## 6. 各类型模块依赖速查

| 模块类型 | 额外依赖 | 不需要的 |
|---|---|---|
| 网关 | `spring-cloud-starter-gateway` + `xxx-auth-gateway-sdk` + nacos + loadbalancer | mybatis、mysql、redis（除非网关用） |
| 公共库 common | hutool、mybatis-plus-core/extension、redisson、spring-amqp/rabbit、feign-core、xxl-job-core、knife4j、tomcat-embed-core | starter-web（不启动 web） |
| 契约库 api | openfeign + feign-httpclient + sentinel + caffeine + swagger-annotations + hibernate-validator | starter-web、mybatis、mysql |
| 业务服务 | §5 模板 | ES/MQ 等除非业务需要 |
| 搜索服务 | §5 + data-elasticsearch + rest-high-level-client + amqp（消费同步） | — |
| 消息服务 | §5（三段式） + amqp + 短信厂商 SDK | — |
