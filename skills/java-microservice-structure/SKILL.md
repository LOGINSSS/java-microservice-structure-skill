---
name: java-microservice-structure
description: 通用 Java 微服务（Spring Cloud + Spring Boot + MyBatis-Plus）模块设计的深度技能包。包含：模块划分与标准目录树（含每目录功能详解）、pom 依赖配置指南（核心/可插拔依赖矩阵）、通用工具类库选型（hutool/分页/用户上下文/线程池）、跨服务协作范式（Feign/MQ/分布式锁/定时任务）、模块设计的 CoT 思维链工作流与 few-shot 示例、完成后的质量检查清单（链路追踪/工具实用性等），并附天机学堂 tjxt 完整落地实例。在微服务仓库中设计新模块、导航定位、配置依赖、评估影响面时使用。
whenToUse: 在 Java 微服务项目（Spring Cloud + Spring Boot + MyBatis-Plus）中需要：①新增/重构一个业务模块并按行业标准结构落地；②配置 pom 依赖（核心必备或可插拔可选）；③选择通用工具类或设计跨服务协作（Feign/MQ/锁/任务）；④定位某类代码所在包；⑤设计完成后自查链路与工具质量。本技能包为多文件 bundle，SKILL.md 是导航入口，具体内容按「如何使用」一节读取对应 references 文件。
---

# Java 微服务架构模块设计技能包

本技能包沉淀主流 Java 微服务的**可复用设计技术**，而非单个项目的快照。所有内容以天机学堂（tjxt，Java 17 / Spring Boot 3.3.5 / Spring Cloud 2023.0.3 / Spring Cloud Alibaba / MyBatis-Plus 3.5.9）为真实案例提炼，可直接迁移到任何同类项目。

## 技能包结构（bundle）

```
skills/java-microservice-structure/
├── SKILL.md                        # 本文件：导航入口 + 工作流总览
└── references/
    ├── 01-module-structure.md      # 模块划分范式 + 标准目录树 + 每个目录的功能详解
    ├── 02-pom-guide.md             # pom 依赖配置指南：核心必备/可插拔可选依赖矩阵 + 版本管理 + 完整示例
    ├── 03-common-toolkits.md       # 通用工具类库：hutool 系工具、分页、用户上下文、线程池、断言等
    ├── 04-service-contract.md      # 跨服务协作：Feign 契约与降级、MQ 消息、分布式锁、定时任务
    ├── 05-design-workflow.md       # ★模块设计完整链路：CoT 思维链 + few-shot 完整示例 + 输出模板
    ├── 06-quality-checklist.md     # ★设计完成后的关键点检查清单（链路追踪、工具实用性、健壮性、安全）
    └── 07-tjxt-example.md          # tjxt 落地实例：17 模块完整目录树 + 服务清单 + 各模块差异
```

## 如何使用（按任务选择入口）

| 你的任务 | 读哪个文件 | 关键产出 |
|---|---|---|
| 了解模块怎么划分、目录结构长什么样 | `references/01-module-structure.md` | 标准目录树 + 每目录职责表 |
| 新模块要配 pom、选依赖 | `references/02-pom-guide.md` | 依赖矩阵 + 完整 pom 模板 |
| 想用通用工具类（JSON/集合/分页/用户上下文/线程池） | `references/03-common-toolkits.md` | 工具选型表 |
| 服务间要 Feign 调用 / 发 MQ / 加锁 / 加定时任务 | `references/04-service-contract.md` | 各协作范式代码模板 |
| **设计一个完整的新模块** | `references/05-design-workflow.md` | CoT 步骤 + few-shot 示例 |
| 模块设计完，自查质量 | `references/06-quality-checklist.md` | 逐项检查表 |
| 需要真实项目参照 / 查某个 tjxt 类在哪个包 | `references/07-tjxt-example.md` | tjxt 完整目录树 |

> 所有 `references/` 文件与本 SKILL.md 同目录，可用 read 工具按相对路径读取。
> **跨工具提示**：本技能包为纯 Markdown bundle，兼容 DSH、Claude Code、OpenCode、Cursor 等所有按「SKILL.md + frontmatter(name/description)」发现 skill 的工具（安装器 `bin/install.mjs` 支持 `--target dsh|claude|opencode|cursor|agents`）。若某工具不解析 SKILL.md 内的相对链接（如部分 Claude Code 版本），请用绝对路径或 `${CLAUDE_SKILL_DIR}/references/<文件名>` 形式引用资源；OpenCode/Codex 等支持 AGENTS.md 的工具，也可用 `--target agents` 生成项目级 AGENTS.md 指引。

## 核心设计原则（贯穿所有文件）

1. **分层清晰**：`controller（入参校验）→ service（业务+事务）→ mapper（数据访问）`，领域模型统一 `domain/dto|po|query|vo` 四子包。
2. **依赖最小化**：默认只加核心必备依赖；ES/MQ/缓存/任务等按需可插拔（见 02）。
3. **复用优先**：工具一律用公共模块封装好的 hutool 系工具，禁止重复造轮子（见 03）。
4. **契约集中**：Feign Client 集中在契约模块 `client/<领域>/`，降级用 FallbackFactory（见 04）。
5. **设计即检查**：按 05 的 CoT 走完链路后，必须按 06 逐项自检，特别是 controller 起始的链路追踪正确性与工具实用性。

## 模块设计工作流（概要）

完整 CoT 见 `references/05-design-workflow.md`，八步骨架：

```
① 职责边界 → ② 模块形态 → ③ 数据模型(PO) → ④ 接口(controller+VO/FormDTO)
→ ⑤ 服务层(事务/幂等) → ⑥ 跨服务协作(Feign/MQ) → ⑦ pom 依赖 → ⑧ 配置与资源
→ 完成 → ⑨ 按 06-checklist 自查
```

---

*维护提示：本技能包唯一真相源在开源仓库 `java-microservice-structure-skill` 的 `skills/` 目录；改动了模块结构或沉淀了新范式，应同步更新对应 references 文件并重新发布/安装。*
