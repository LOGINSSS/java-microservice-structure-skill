<div align="center">

# Java Microservice Structure Skill

**通用 Java 微服务模块设计的 DSH 技能包** — 从需求到落地的完整设计链路

[![version](https://img.shields.io/badge/version-0.2.0-blue)](./package.json)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933)](./package.json)
[![type](https://img.shields.io/badge/type-DSH%20skill-brightgreen)](./skills/java-microservice-structure/SKILL.md)

一键安装到任意项目 / 全局 DSH 用户目录，让 AI 助手按行业标准完成微服务模块的导航、设计与自检。

</div>

---

## ✨ 特性一览

| | | |
|---|---|---|
| 🧩 **标准模块划分** | 📦 **pom 依赖矩阵** | 🧰 **通用工具库选型** |
| 公共库 / 契约聚合 / 网关 / 认证 SDK / 三段式 / 单模块业务服务，含每目录功能详解 | 核心必备 vs 可插拔可选（Redis / MySQL / MyBatis / Spring Cloud / OpenFeign / ES / MQ…） | hutool 系、分页三件套、UserContext（ThreadLocal 用户流转）、线程池、断言 |
| 🔗 **跨服务协作范式** | 🧠 **CoT 设计工作流** | ✅ **质量自检清单** |
| Feign 契约集中 + Fallback、RabbitMQ 幂等消费、Redisson @Lock、XXL-Job | 八步思维链 + few-shot 完整示例，带领 agent 走完模块设计全链路 | 链路追踪逻辑、工具实用性、健壮性/幂等、安全、依赖配置逐项自查 |

## 🏗️ 覆盖的完整技术链路

```
需求 / 业务域
   │
   ▼
① 模块形态 ──▶ 单模块 / 三段式(api·domain·service) / 认证SDK / 公共库
   ▼
② 目录骨架 ──▶ controller · domain(dto/po/query/vo) · mapper · service(I+impl)
   │             config · constants · enums · handler · mq · strategy · thirdparty
   ▼
③ 数据模型 ──▶ PO / 表设计 / 枚举(BaseEnum) / MyBatis-Plus 自动填充
   ▼
④ 接口层 ────▶ controller：入参校验(FormDTO·PageQuery) → 出参(VO·PageDTO)
   ▼
⑤ 服务层 ────▶ 事务边界 · 幂等 · 断言异常(AssertUtils + ErrorInfo)
   ▼
⑥ 协作层 ────▶ Feign(契约集中+Fallback) · RabbitMQ(异步解耦) · @Lock(临界资源) · XXL-Job(定时补偿)
   ▼
⑦ 依赖配置 ──▶ pom：核心必备 + 可插拔可选，版本统一在根 dependencyManagement
   ▼
⑧ 配置资源 ──▶ application-{dev|local|test}.yml · mapper XML · Redis key 集中管理
   ▼
⑨ 质量自检 ──▶ 06-checklist：链路追踪 · 工具实用性 · 健壮性 · 安全
```

## 📚 技能包内容

| 文件 | 精炼介绍 | 跳转 |
|---|---|---|
| **SKILL.md** | 导航入口：按任务分派 + 工作流总览 | [打开](./skills/java-microservice-structure/SKILL.md) |
| **01 模块结构** | 模块划分范式 + 标准目录树，30+ 目录逐一讲职责与坑 | [打开](./skills/java-microservice-structure/references/01-module-structure.md) |
| **02 pom 指南** | 核心必备/可插拔可选依赖矩阵 + 版本管理 + 完整 pom 模板 | [打开](./skills/java-microservice-structure/references/02-pom-guide.md) |
| **03 工具库** | hutool 系、分页三件套、UserContext、线程池、断言异常 | [打开](./skills/java-microservice-structure/references/03-common-toolkits.md) |
| **04 服务协作** | Feign + FallbackFactory、MQ 幂等消费、@Lock、XXL-Job | [打开](./skills/java-microservice-structure/references/04-service-contract.md) |
| **05 设计工作流** | ★ 八步 CoT 思维链 + few-shot 完整示例 + 交付模板 | [打开](./skills/java-microservice-structure/references/05-design-workflow.md) |
| **06 质量自检** | ★ 链路追踪 / 工具实用性 / 幂等 / 安全逐项 checklist | [打开](./skills/java-microservice-structure/references/06-quality-checklist.md) |
| **07 落地实例** | 17 模块真实工程完整目录树与差异点总结 | [打开](./skills/java-microservice-structure/references/07-tjxt-example.md) |

> 内容沉淀自生产级 Spring Cloud 微服务实战工程（17 模块、15 服务），均为可直接迁移的通用范式。

## 🚀 快速开始

```bash
# 全局安装（推荐）：任何项目可用
npx java-microservice-structure-skill --user

# 项目级安装：仅当前项目
npm i -D java-microservice-structure-skill
npx java-microservice-structure-skill
```

安装到 `$DSH_HOME/skills/` 或 `<project>/.dsh/skills/`，**复制整个 bundle**，DSH 自动发现、无需重启。

## 🧭 使用导航

| 我想… | 打开 |
|---|---|
| 了解目录怎么组织 | [01 模块结构](./skills/java-microservice-structure/references/01-module-structure.md) |
| 配 pom 依赖 | [02 pom 指南](./skills/java-microservice-structure/references/02-pom-guide.md) |
| 选通用工具 | [03 工具库](./skills/java-microservice-structure/references/03-common-toolkits.md) |
| 设计 Feign/MQ/锁/任务 | [04 服务协作](./skills/java-microservice-structure/references/04-service-contract.md) |
| **设计一个新模块** | [05 设计工作流](./skills/java-microservice-structure/references/05-design-workflow.md) → 完成后 [06 质量自检](./skills/java-microservice-structure/references/06-quality-checklist.md) |
| 参考真实工程结构 | [07 落地实例](./skills/java-microservice-structure/references/07-tjxt-example.md) |

## 🗂️ 仓库结构

```
java-microservice-structure-skill/
├── bin/
│   └── install.mjs                  # 安装 CLI（零依赖，复制整个 bundle）
├── skills/
│   └── java-microservice-structure/ # ★ 技能包本体（唯一真相源）
│       ├── SKILL.md                 # 导航入口
│       └── references/              # 7 个深度主题文件（见上方内容表）
├── package.json                     # npm 包元数据（bin / files / publishConfig）
├── README.md
└── LICENSE                          # MIT
```

## 🔄 维护与发布

```bash
git push origin main            # 提交后推送到 GitHub
npm version patch && npm publish # 发版（之后其他项目 npx 即可安装）
# 各项目/用户目录重跑安装命令即覆盖更新（幂等）
```

## 📄 License

[MIT](./LICENSE)
