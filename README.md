# java-microservice-structure-skill

DSH skill 包（DeepSeek Harness skill）：**通用 Java 微服务（Spring Cloud + Spring Boot）的模块划分与目录结构设计范式**，附天机学堂（tjxt）完整落地实例（17 个模块、15 个服务的目录树）。

安装后，AI 助手（或你在任意项目里）可加载该 skill，按行业标准结构导航代码、定位类、新增/修改模块、评估影响面，并保持模块结构与约定一致。

## 这是什么

主流 Java 微服务的目录设计高度一致：`common` 公共库、`api` Feign 契约聚合、`gateway` 网关、认证 SDK 化（四子模块）、三段式服务（api/domain/service）、单模块业务服务（`config/constants/controller/domain(dto|po|query|vo)/enums/mapper/service(I+impl)/handler/properties/mq/task/strategy/thirdparty/utils`）。

本 skill 把整套范式 + 12 条关键约定 + 完整落地实例固化下来，避免每次都在新项目里重新摸索。

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
DSH 自动发现，无需重启。

### 方式二：安装到单个项目（项目级）

```bash
npm i -D java-microservice-structure-skill
npx java-microservice-structure-skill          # 安装到当前项目的 .dsh/skills/
```

## 使用

安装后在新会话中，AI 助手会自动在技能目录里看到 `java-microservice-structure`，在微服务仓库工作时会按其指引行事。也可手动向助手提及该 skill 名以强制加载。

## 仓库结构

```
java-microservice-structure-skill/
├── bin/
│   └── install.mjs          # 安装 CLI（无第三方依赖）
├── skills/
│   └── java-microservice-structure/
│       └── SKILL.md         # skill 本体（唯一真相源 source of truth）
├── package.json             # npm 包元数据（bin/files/发布配置）
├── README.md
└── LICENSE                  # MIT
```

## 发布到 npm（可选）

```bash
npm login                     # 首次需登录（注意 registry：当前为 npmmirror 镜像）
npm version patch             # 发版前递增版本号
npm publish                   # 发布；之后其他项目即可 npx 安装
```

## 推送 GitHub（可选）

```bash
# 先在 GitHub 创建同名空仓库（不要勾选 README），然后：
git remote add origin https://github.com/<your-name>/java-microservice-structure-skill.git
git push -u origin main
```

> 提示：发布前把 `package.json` 中 `repository.url` 的 `<your-name>` 替换为真实 GitHub 用户名。

## 维护：更新 skill 内容

1. 修改 `skills/java-microservice-structure/SKILL.md`（保持第 6 节「积淀与更新」的流程：新增模块/包/约定后同步更新）。
2. 提交并推送 GitHub。
3. `npm version patch && npm publish` 发新版本。
4. 各项目/用户目录重新运行安装命令即可覆盖更新。

## License

MIT
