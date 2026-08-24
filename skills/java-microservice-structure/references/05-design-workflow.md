# 05 模块设计完整链路（CoT 思维链 + Few-shot）

> 本文件是**技能包核心**：用思维链（Chain-of-Thought）带领 agent 完成「从需求到模块落地」的整条设计链路，配一个 few-shot 完整示例。设计完成后必须按 `06-quality-checklist.md` 逐项自检。

## 0. 什么时候走这个流程

- 新增一个微服务模块（如"题库服务""订单服务"）；
- 在现有服务中新增一个完整业务域（如"积分域"）；
- 重构一个混乱的模块，需要按标准结构重新组织。

## 1. 八步 CoT 思维链（按顺序执行，每步想清楚再进下一步）

```
STEP 1 职责与边界
  1.1 这个模块/业务域要对外提供哪些能力？（列 API 清单）
  1.2 它依赖哪些其他服务？（Feign 调用谁）
  1.3 谁依赖它？（是否要对外暴露 SDK → 决定三段式还是单模块）
  1.4 数据边界：它管哪些表？哪些数据是别人的？（独立库原则）

STEP 2 模块形态
  2.1 纯内部业务服务 → 单模块（标准结构 §3）
  2.2 要被其他服务依赖能力 → 三段式（api/domain/service，§5）
  2.3 是全项目公共能力 → common/api 契约模块
  → 产出：模块目录骨架（只建空目录结构）

STEP 3 数据模型（PO → 表）
  3.1 列出实体清单（名词提取：订单、订单明细、退款单…）
  3.2 每个实体：字段、主键策略（雪花/自增）、索引、与公共 BaseEntity 的关系
  3.3 关系建模（1:N 拆表、中间表）、状态机（枚举）
  → 产出：PO 类 + 表结构说明

STEP 4 接口设计（controller）
  4.1 按 API 清单分控制器（按资源/角色分）
  4.2 每个接口：方法+路径+入参（FormDTO/PageQuery）+出参（VO/PageDTO）
  4.3 权限：哪些要登录（UserContext）、哪些管理员、哪些放行
  → 产出：controller 骨架 + 全部 VO/FormDTO/PageQuery

STEP 5 服务层设计（业务核心）
  5.1 每个 controller 方法对应的 service 接口方法
  5.2 事务边界：哪些方法 @Transactional（多表写操作）
  5.3 幂等：写接口如何防重（唯一键/锁/状态机）
  5.4 异常与断言：用 AssertUtils + 本服务 *ErrorInfo
  → 产出：I 接口 + impl 骨架（方法注释写明业务规则）

STEP 6 跨服务协作
  6.1 需要调别人的：在 tj-api 定义/复用 Feign Client + Fallback
  6.2 需要通知别人的：定义 MQ 交换机/路由 key（MqConstants）+ 发消息
  6.3 需要听别人的：定义 @RabbitListener 消费者（健壮性检查 + 幂等）
  6.4 临界资源：@Lock 或 Lua
  6.5 定时补偿：XXL-Job 任务
  → 产出：协作清单（谁调谁、发什么消息、听什么消息）

STEP 7 pom 依赖
  7.1 对照 02-pom-guide：核心必备全部？可选按需？（不加不需要的）
  7.2 版本是否在根 pom 管理（子模块不写 version，内部模块除外）
  → 产出：pom 依赖清单

STEP 8 配置与资源
  8.1 application.yml：端口、服务名、tj.* 配置（swagger/auth/jdbc）
  8.2 4 个 profile 文件（dev/local/test）
  8.3 resources/mapper/*.xml（复杂 SQL）
  8.4 常量（XxxConstants/XxxErrorInfo/RedisConstants）、枚举（实现 BaseEnum）
  → 产出：配置 + 资源文件

完成后 → 按 06-quality-checklist.md 逐项自检，发现问题回到对应 STEP 修正。
```

## 2. Few-shot 完整示例：设计「题库服务」（tj-exam 还原演示）

以下演示按八步走完一个真实模块的设计，输出即标准结构。**需求**：课程系统需要题目库——教师维护题目（单选/多选/判断），按业务分类管理；后续考试服务要按业务抽取题目。

### STEP 1 职责与边界

```
能力清单：
  - 题目 CRUD（管理端）：增删改查、分页、按题型/业务筛选
  - 题目业务（QuestionBiz）：把题目归到业务（考试/练习），可绑定分值
依赖：无（纯数据维护，暂不调其他服务）
被依赖：考试服务将来要按 bizId 取题目 → 需对外提供能力（Feign）
数据边界：question（题目主表）、question_detail（题目内容详情）、question_biz（题目-业务关联）三张表
```

### STEP 2 模块形态

```
单模块业务服务 tj-exam 即可（被依赖的取题能力通过 tj-api ExamClient 暴露，无需三段式）。
目录骨架：
tj-exam/src/main/java/com/tianji/
├── ExamApplication.java
└── exam/
    ├── constants/  ├── controller/  ├── domain/{dto,po,query,vo}
    ├── enums/      ├── mapper/      └── service/{impl}
```

### STEP 3 数据模型

```
PO 设计：
  Question      : id(雪花), name(题干), type(题型枚举), categoryId(分类), score(分值), status, create_time...
  QuestionDetail: id, questionId, analysis(解析), answer(答案 JSON: 选项/正误)
  QuestionBiz   : id, questionId, bizId(业务id), score(该业务下分值)
枚举：QuestionType { SINGLE, MULTIPLE, JUDGE }（实现 BaseEnum）
```

### STEP 4 接口设计

```java
@RestController
@RequestMapping("/questions")
@Tag(name = "题目管理接口")
public class QuestionController {
    @GetMapping("/page")        // 分页查询 → PageDTO<QuestionPageVO>
    public PageDTO<QuestionPageVO> queryQuestionPage(QuestionPageQuery query) {...}
    @PostMapping               // 新增题目 → void
    public void saveQuestion(@RequestBody QuestionFormDTO dto) {...}
    @PutMapping                // 修改 → void
    public void updateQuestion(@RequestBody QuestionFormDTO dto) {...}
    @DeleteMapping("/{id}")    // 删除 → void
    public void deleteQuestion(@PathVariable("id") Long id) {...}
    // QuestionBizController: /question-bizs 管理题目与业务的绑定
}
```

### STEP 5 服务层

```java
public interface IQuestionService extends IService<Question> {
    void saveQuestion(QuestionFormDTO dto);       // 事务：写 question + question_detail
    void updateQuestion(QuestionFormDTO dto);
    void deleteQuestion(Long id);
    PageDTO<QuestionPageVO> queryQuestionPage(QuestionPageQuery query);
}
// impl 要点：
//  saveQuestion: 校验 → BeanUtils 转 PO → 保存主表 → 保存详情（@Transactional）
//  deleteQuestion: 检查是否被业务引用（QuestionBiz）→ 物理/逻辑删除（@Transactional）
//  queryQuestionPage: query.toMpPageDefaultSortByCreateTimeDesc() → selectPage → 转 VO
```

### STEP 6 跨服务协作

```
被依赖方向：在 tj-api 定义 ExamClient（@FeignClient("exam-service")）+ ExamClientFallback
  GET /questions/{id} → QuestionDTO        （考试服务取单题）
  GET /questions/biz/{bizId} → List<QuestionBizDTO> （按业务取题）
暂无 MQ/锁/任务需求（未来批量导入可加 XXL-Job）。
```

### STEP 7 pom

```
对照 02-pom-guide §5 模板：web + knife4j + mybatis-plus + mysql + redis + nacos×2 + loadbalancer
+ tj-auth-resource-sdk + tj-api；可选依赖（ES/MQ/xxl-job）均不需要 → 不加。
```

### STEP 8 配置

```
application.yml: port=8089, name=exam-service, tj.swagger(package-path=com.tianji.exam.controller),
                 tj.auth.resource(excludeLoginPaths=...), tj.jdbc.database=tj_exam
4 个 profile；constants/ExamErrorInfo、QuestionType 枚举；mapper XML（复杂统计 SQL）
```

> 产出对照：真实 tj-exam 的结构就是上面这样（见 07 实例），证明八步流程可落地。

## 3. 输出模板（agent 设计完模块后按此交付）

```
## 模块设计交付：<模块名>

### 1. 形态与边界
- 模块形态：单模块 / 三段式 / 公共库；依赖关系图
- API 清单：<method> <path> → <出参>  （每个接口一行）

### 2. 目录结构（实际创建/计划的）
<目录树>

### 3. 数据模型
| PO | 表 | 关键字段 | 索引 | 枚举 |
|---|---|---|---|---|

### 4. 关键设计决策
- 事务边界：<方法> @Transactional 原因
- 幂等方案：<写接口> 如何防重
- 跨服务：Feign 调用 <谁>；MQ <交换机/路由>；锁 <key>

### 5. pom 依赖
<依赖清单 + 可选依赖理由>

### 6. 自检结果（对应 06-checklist）
- [x] 链路追踪：...
- [x] 工具实用性：...
- [ ] 遗留问题：...
```
