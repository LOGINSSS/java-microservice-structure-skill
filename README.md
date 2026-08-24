# java-microservice-structure-skill

DSH skill 深度技能包（DeepSeek Harness skill，多文件 bundle）：**通用 Java 微服务（Spring Cloud + Spring Boot + MyBatis-Plus）模块设计**。不只是目录结构快照，而是把行业标准范式 + 可复用技术固化为一套可指导 agent 完成「从需求到模块落地」完整链路的设计技能包。

安装后，AI 助手在任意微服务仓库中都会按本技能包的标准结构导航代码、定位类、设计新模块、配置依赖、评估影响面，并在设计完成后自动执行质量自检。

## 技能包内容

| 文件 | 主题 |
|---|---|
| `SKILL.md` | 导航入口：按任务分派到对应 references 文件 + 设计工作流概要 |
| `references/01-module-structure.md` | 模块划分范式 + 标准目录树 + **每个目录的功能详解**（30+ 目录/资源逐一讲职责与坑） |
| `references/02-pom-guide.md` | **pom 依赖配置指南**：核心必备（web/mybatis/mysql/redis/nacos/openfeign/loadbalancer）与可插拔可选（ES/MQ/redisson/caffeine/xxl-job/sentinel）依赖矩阵 + 版本管理 + 完整 pom 模板 |
| `references/03-common-toolkits.md` | **通用工具类库选型**：hutool 系（JsonUtils/BeanUtils/CollUtils/DateUtils）、分页三件套（PageQuery→toMpPage→PageDTO）、UserContext（ThreadLocal 用户信息跨文件流转）、线程池、断言异常 |
| `references/04-service-contract.md` | 跨服务协作：Feign 契约集中 + FallbackFactory 降级、RabbitMQ（topic + 路由 key + 幂等消费）、Redisson @Lock、XXL-Job |
| `references/05-design-workflow.md` | ★**模块设计完整链路**：八步 CoT 思维链 + few-shot 完整示例（题库模块从需求到落地）+ 输出交付模板 |
| `references/06-quality-checklist.md` | ★**设计完成自查清单**：controller 起始的链路追踪逻辑正确性、工具实用性分析、健壮性/幂等、安全、pom/配置，逐项可勾选 |
| `references/07-tjxt-example.md` | 天机学堂（tjxt）完整落地实例：17 模块目录树 + 服务清单 + 偏离标准结构的合理场景 |

内容全部提炼自真实项目 tjxt（Java 17 / Spring Boot 3.3.5 / Spring Cloud 2023.0.3 / Spring Cloud Alibaba / MyBatis-Plus 3.5.9 / hutool），可直接迁移到任何同类项目。

## 安装

### 方式一：安装到 DSH 用户目录（推荐，全局生效）

任何项目都能用，无需每个仓库重复安装：

```bash
# 从 npm 直接运行（无需先安装本包）
npx java-microservice-structure-skill --user

# 或者安装为全局工具后运行
npm i -g java-microservice-structure-skill
java-microservice-structure-skill --user
```

安装位置：`$DSH_HOME/skills/` 或 `~/.dsh/skills/`（Windows: `%USERPROFILE%\.dsh\skills`）。
安装会复制**整个 bundle**（SKILL.md + references/），DSH 自动发现，无需重启。

### 方式二：安装到单个项目（项目级）

```bash
npm i -D java-microservice-structure-skill
npx java-microservice-structure-skill          # 安装到当前项目的 .dsh/skills/
```

## 使用

安装后在新会话中，AI 助手会自动在技能目录里看到 `java-microservice-structure`。它按任务分派读取对应文件：

- 了解目录结构 → `references/01`
- 配 pom 依赖 → `references/02`
- 选工具类 → `references/03`
- 设计跨服务协作 → `references/04`
- **设计新模块** → `references/05`（八步 CoT）+ 完成后按 `references/06` 自检
- 查 tjxt 真实结构 → `references/07`

也可手动向助手提及该 skill 名以强制加载。

## 仓库结构

```
java-microservice-structure-skill/
├── bin/
│   └── install.mjs                  # 安装 CLI（无第三方依赖，复制整个 bundle）
├── skills/
│   └── java-microservice-structure/
│       ├── SKILL.md                 # 导航入口（frontmatter + 分派表）
│       └── references/              # 7 个深度主题文件（唯一真相源 source of truth）
│           ├── 01-module-structure.md
│           ├── 02-pom-guide.md
│           ├── 03-common-toolkits.md
│           ├── 04-service-contract.md
│           ├── 05-design-workflow.md
│           ├── 06-quality-checklist.md
│           └── 07-tjxt-example.md
├── package.json                     # npm 包元数据（bin/files/发布配置）
├── README.md
└── LICENSE                          # MIT
```

## 发布到 npm（可选）

```bash
npm login                     # 首次需登录（注意 registry：当前为 npmmirror 镜像）
npm version patch             # 发版前递增版本号
npm publish                   # 发布；之后其他项目即可 npx 安装
```

## 推送 GitHub

远程已配置并推送过：

```bash
git remote -v                 # origin → ssh://git@github.com/LOGINSSS/java-microservice-structure-skill.git
git push origin main          # 后续改动直接推送
```

## 维护：更新 skill 内容

1. 修改 `skills/java-microservice-structure/` 下对应文件（新增模块/依赖/工具/范式 → 更新 01–04；新增设计模式 → 更新 05；新增自检项 → 更新 06；tjxt 结构变化 → 更新 07）。
2. 提交并推送 GitHub。
3. `npm version patch && npm publish` 发新版本。
4. 各项目/用户目录重新运行安装命令即可覆盖更新（`--user` 幂等覆盖）。

## License

MIT
