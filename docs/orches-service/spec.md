# Online Runtime / Orches Service — 领域规则与交互规格

> 本模块的评测闭环与责任层（权限 / 审计 / 回滚 / 降级 / 归属）另篇，见 [evals-spec.md](./evals-spec.md)。
> **已知文档缺陷（未在本篇修复）**：`evals-spec.md` 有两处对外死链——第 6 节第 2 条指向一个仅内部可见的标准模板目录，其文首又引用了一篇内部调研文档；两者所在的目录在本公开仓库中被排除，对外读者打不开。因本次修订范围限定在本文件，未改动该篇。修复方式：把那两处引用改为自包含的口径描述，或把模板以脱敏形式随仓库提供。
> 来源：线上 Orches Service 的 UAT 实测（页面真实渲染 + BFF 接口响应，只读采集），已脱敏。示例中的名称、ID、TraceId、配置数值均为合成占位或去标识后的代表值，不代表任何生产实例。
> 上游：Model Platform / Model Deployment（`CallModel` 节点消费 Build，见 [model-deployment/spec.md](../model-deployment/spec.md)）。
> 说明：本文区分「实测」（已核对页面与接口）与「推断」两种证据等级，未核实的项统一收敛到第 15 节待确认。

## 1. 概念模型

两层实体，一对多：

```
FeatureService（服务，逻辑实体 = 一个编排业务的稳定标识）
 └── * ServiceVersion（版本，一次可发布的编排快照）
        └── versionInfo.chartConfig（节点 + 边的图表 DSL，画布与执行共用的单一来源）
```

- **FeatureService**：`FeatureService`（名称）+ `Region` + `Owner[]` + `Biz Team` + `CreateTime` / `UpdateTime`。服务本身不承载可执行内容，只承载**名称、归属与流量配置**（`routerConfig`，见第 8 节）。`isDelete` 为软删标记。
- **ServiceVersion**：`Version`（如 `V1`）+ `Status` + `Router` + `Description` + 编排图。版本是可执行单元，也是 Batch Test / Tracing Log 的作用对象。
- **版本状态 `versionInfo.status`**（三值，实测）：

| 值 | 枚举 | 语义 | 版本表 `Router` 列 |
|---|---|---|---|
| `1` | `DRAFT` | 刚创建，未启用；不可被流量命中 | `-` |
| `2` | `ENABLED` | 已启用，可接流量 | `ONLINE` |
| `3` | `DISABLED` | 已停用；`Edit` 置灰，`Copy` / `Batch Test` 仍可用 | 未采集 |

- **`Router` 列是独立信号，不是状态别名**：它表示「该版本当前是否在流量路由中」，取值 `ONLINE` / `-`（对应接口字段 `routerTag`）。状态描述版本生命周期，Router 列描述流量事实；两者通常同向（`ENABLED` → `ONLINE`），但语义上分开维护，不要用一个去推导另一个。
- **Router 列只实测到两格**：`DRAFT` → `-`、`ENABLED` → `ONLINE`。`DISABLED` 行的显示值本次未采集，因此上表记「未采集」而不是 `-`——照抄 `-` 会把推断写成实测（第 15 节）。
- **Region 枚举**（由接口下发，前端不硬编码，新增地区不需要改前端）：实测 10 个取值 —— `ID` / `TH` / `PH` / `VN` / `MY` / `SG` / `TW` / `BR` / `MX` / `SHOPEE_SG`。顺序由后端下发，不要在前端固化。
- **导航上下文（实测）**：顶层模块 `Online Runtime` 下只有三个入口 —— `Orches Service` / `Agent Service` / `LLM Workflow`。`Agent Service` 是**已上线**模块（有自己的列表、配置台、部署管理与 Permission 弹窗，状态机与门控和本模块不同），不是占位或 Future 项。本模块的全部页面挂在 `/online-runtime/orches-service/*` 下（第 2 节），不要按「Online Runtime 只有 Orches 一个模块」的前提设计导航。
- **仓库导航与真实平台的对齐状态**：真实平台的 `Online Runtime` 分组是 `Orches Service` / `Agent Service` / `LLM Workflow` 三个入口；本仓库 `assets/shell.js` 只收录前两个（都是 `iframe` 原型），**`LLM Workflow` 已按产品决策从本仓库导航移除**（不收占位项）。真实平台顶层还有 `(legacy) Online FeatureStore` 与 `Copilot` 两个模块，本仓库 `NAV` 中亦未收录，属后续工作。

## 2. 路由

| 页面 | 路由 |
|---|---|
| 服务列表 | `/online-runtime/orches-service` |
| 编排画布 | `/online-runtime/orches-service/pipeline/{serviceId}/{versionId}` |
| 流量路由 | `/online-runtime/orches-service/router/{serviceId}` |
| 链路日志 | `/online-runtime/orches-service/tracing-log/{serviceId}` |

Router 与 Tracing Log 只带 `serviceId`（服务级下钻）；画布带 `serviceId` + `versionId`（版本级下钻）。这是路由表的实测形状，**平台为何这样切分未采集到**。一种可能的解释是 Router / Tracing Log 面向跨版本的历史流量与历史日志，但这个动因没有任何实测或文档依据，不要当成设计约束引用。可确定的是：这三个页面的 URL 契约如此，新增页面应沿用同一层级约定。

## 3. 列表页交互

| 区域 | 内容 |
|---|---|
| 筛选栏（可折叠） | FeatureService（文本）/ Region（下拉）/ Biz Team（下拉）/ Owner（下拉）+ `Reset` / `Query` / `Collapse∧` |
| 工具栏 | `Owned by me` 勾选 + `Add Service` 主按钮 + 列宽设置 + 刷新 |
| 主表格 | `FeatureService` / `Region` / `Biz Team` / `Owner` / `CreateTime` / `UpdateTime` / `Action` |
| 展开行 | 行首 `Expand row` 展开**内嵌版本表**（不跳页） |
| 分页 | `1-10 of N items`，Page Size 默认 10 |

**版本表**（内嵌在主行下方）：

| 列 | 说明 |
|---|---|
| `Version` | 版本号，如 `V1` |
| `Status` | `DRAFT` / `ENABLED` / `DISABLED` 徽章 |
| `Router` | `ONLINE` 或 `-`；`DISABLED` 行的取值未采集（见第 1 节） |
| `Updater` | 最后修改人 |
| `CreateTime` / `Update Time` | 版本级时间 |
| `Description` | 空显示 `-` |
| `Action` | 4 个动作（见 4.2） |

- 版本表按需加载：列表接口只回 `versionList` 的轻量字段，编排图要另调 `versionDetails`，这是「展开行不卡」的设计前提。
- **Action 列溢出**（实测问题）：视口较窄时 `Permission` / `More` 被裁切，真实平台靠横向滚动兜底，但列宽设置入口没有提示。设计口径：表格容器横向滚动 + 固定列宽，保证 5 个服务动作恒可见。

## 4. 行内动作

### 4.1 服务行 Action（5 个，含 `More` 下拉）

| 动作 | 语义 | 去向 |
|---|---|---|
| `Add` | 为该服务**新增版本** | 打开共用弹窗（预填，见第 5 节），语义是 Add Version |
| `Router` | 流量路由配置 | `/router/{serviceId}` |
| `Tracing` | 链路日志 | `/tracing-log/{serviceId}` |
| `Permission` | 服务授权 | Permission 弹窗（第 11 节） |
| `More ▾` | 次级动作组（第 5 个动作位） | 下拉：`Monitor` / `Alert` / `Delete` |

`More` 下拉三项：`Monitor` 跳外部监控系统（外链）；`Alert` 进入告警配置（承载形态未采集，见第 13 节）；`Delete` 删除**整个服务**（连带其全部版本，需二次确认）。删除是服务级动作而非版本级动作——版本级的「下架」是 `Disable`，两者不可混为一谈。

### 4.2 版本行 Action（4 个）

| 动作 | 语义 |
|---|---|
| `Edit` | 进入编排画布编辑该版本 |
| `Copy` | 复制该版本为新版本（落到 `DRAFT`） |
| `Batch Test` | 批量测试（第 10 节） |
| `Disable` / `Enable` | 状态开关：`ENABLED` 时显示 `Disable`（→ `DISABLED`）；`DISABLED` 时同位置显示 `Enable`（→ `ENABLED`） |

除上述文字链外，该行还有图标按钮位（实测存在，具体图标与功能未采集到，见第 15 节）。

- 第 4 个动作是**状态切换位**，标签随当前状态变，不是新增第 5 个动作。因此 4 个动作实际覆盖 5 种可能文案。
- `DISABLED` 下 `Edit` 置灰且无说明（实测问题）。设计口径：置灰 + `title` 提示「Disabled version is read-only. Enable it first.」

## 5. Add Service / Add Version 弹窗

**同一个表单、同一份字段，标题在实测中均为 `Add FeatureService`。** 通过**入口位置**区分语义：

| 入口 | 语义 | 预填行为 | 应显示标题（设计口径） |
|---|---|---|---|
| 顶部工具栏 `Add Service` | 新建服务 + 首个版本 | 全空 | `Add FeatureService` |
| 服务行 `Add` | 为该服务新增版本 | Region / Owner / Biz Team 预填该服务当前值，仅 `ServiceVersion` 与 `Description` 待填 | `Add Version` |

| 字段 | 必填 | 说明 |
|---|---|---|
| FeatureService | ✅ | Name 输入 |
| Region | ✅ | 下拉 |
| Owner | — | 默认当前登录用户，可改 |
| Biz Team | ✅ | 下拉，**依赖 Owner**：未填 Owner 时占位文案 `Please select owner firstly!` |
| ServiceVersion | ✅ | 默认 `V1` |
| Description | — | textarea |

> **已知交互歧义（实测发现）**：两个入口共用标题 `Add FeatureService`，从服务行 `Add` 进去时用户容易误解为「新建服务」。这是本次设计中必须修掉的一条：
> 1. 按入口区分标题（`Add Version` vs `Add FeatureService`）；
> 2. 行内进入时把 FeatureService / Region / Owner / Biz Team 以**只读**形态呈现，让「这是加版本」无需推断；
> 3. `ServiceVersion` 默认值在当前最大版本号基础上自增（实测默认为 `V1`，自增规则待确认，见第 15 节）。

## 6. 编排画布（pipeline）

页头：`← {serviceName} / {region} {version} {statusBadge}`。右上四个控件：

| 控件 | 内容 |
|---|---|
| `Graph Config ▾` | `Export DSL` / `Import DSL` |
| `Run ▾` | 执行；带运行次数角标 |
| `Save` | 保存当前编排 |
| `Enable` | 启用该版本 |

- 画布为**可拖拽可缩放**的节点图（pannable / zoomable），右下角 mini map + 缩放百分比。
- **初始只有 `Start` 与 `End` 两个节点**，其余从左侧节点面板拖入。
- `Export DSL` / `Import DSL` 是对 `chartConfig` 的整图导出 / 导入（JSON），即画布内容的可移植形态；导入是整图替换还是合并，待确认（第 15 节）。
- 右侧 `Snap Shot` 抽屉，三 Tab：`RESULT` / `DETAIL` / `TRACING`。抽屉有两个唤出入口（实测）：**运行后的 `Run`**，以及**点击画布节点**——点击节点会带出该节点的快照视图。未 Run 时抽屉文案 `Please Click Run firstly!` —— 三 Tab 的数据都来自最近一次运行，没有运行就没有快照。实现时不要把抽屉只挂在 `Run` 上，节点点击是主要的查看入口。
- 节点面板至少含：`Start` / `End` / `UDFProcessor` / `CallModel` / `IfCondition2` / `FeatureGroup`（后者的使用状态见 7.4）。

## 7. 图表 DSL（`versionInfo.chartConfig`）

### 7.1 根结构

```json
{
  "componentName": "Page",
  "id": "node_page_0001",
  "children": [ /* 节点与边在同一数组中混排 */ ]
}
```

- 根是 `Page`，只有 `id` 与 `children`。
- **`children` 里节点和边混排**（不是 `nodes[]` + `edges[]` 分离），顺序即声明顺序；靠 `componentName === "Line"` 区分边。
- 节点通用结构（实测）：`{ componentName, id, props: { nodeMap, type, position:{x,y}, ports[], id, input[], output[], name }, hidden, title, isLocked, condition, conditionGroup }`。

### 7.2 六种 componentName 与 `props.type` 映射

| componentName | `props.type` | 端口 | 用途 |
|---|---|---|---|
| `Start` | `START` | `r` | 入口，定义可用 output 变量清单 |
| `UDFProcessor` | `INVOKE_UDF` | `l` + `r` | 调用 UDF（`groovy` / `python`） |
| `CallModel` | `CALL_MODEL` | `l` + `r` | 调用已部署模型（`modelName` + `modelVersion` + `buildVersion`） |
| `IfCondition2` | `CONDITION` | `l` + `case1` + `case2` | 双分支条件 |
| `End` | `END` | `l` | 出口，声明 dependency 与 output 映射 |
| `Line` | — | — | 边，经 `sourcePortId` / `targetPortId` 连接两个节点 |

- **`componentName` 是画布组件名，`props.type` 是语义类型**，实测两者一一对应。两者的分工（前端按前者选组件、后端按后者编排）**是推断**：采集只覆盖了 DSL 结构与端口，没有观察到前端渲染或后端编排的实现。可确定的是：任何新增节点类型都必须同时给出这两个值，只加一个必然出现「画得出来但跑不起来」——**这一要求是设计约束，不是实测结论**。
- **端口规则**（连线合法性的依据）：`Start` 只有右端口；`End` 只有左端口；`UDFProcessor` / `CallModel` 左右各一；`IfCondition2` 左一右二（`case1` / `case2`）。`case1` / `case2` 是两个**具名输出端口**，分别承载条件为真 / 假的分支。
- **端口 id 即节点 id**：节点若有单端口，端口 id 复用节点 id；边的 `sourcePortId` / `targetPortId` 填端口 id 而非节点 id。`IfCondition2` 的两个分支端口则以 `case1` / `case2` 标识（命名后缀的确切形态待确认，见第 15 节）。
- `IfCondition2` 名字带 `2`，推断存在过 `IfCondition` v1（节点库中未出现）；以 `IfCondition2` 为唯一在用的条件节点。

### 7.3 `input[]` / `output[]` 与 `source` / `mapTo` 语义

| 字段 | 结构 | 语义 |
|---|---|---|
| `input[]` | `{ id, name, type, source, mapTo }` | 该节点的**入参清单** |
| `output[]` | `{ id, name, type, selected }` | 该节点的**出参清单**；`selected` 标记该变量是否对下游可见 |

- `source` 表示取值来源：**上游节点 id**（引用其 output）或字面量 `"staticValue"`（常量，由 `mapTo` 承载实际值）。
- `mapTo` 表示「映射到上游的哪个输出变量 / 常量的什么值」。`source` 决定「从哪来」，`mapTo` 决定「取它的哪一个」——`source === "staticValue"` 时 `mapTo` 是常量本身。
- `Start` 节点只有 `output[]`（定义入口变量，Batch Test 的 CSV 表头就要覆盖它，见第 10 节）；`End` 节点只有 `input[]`（声明输出映射）。
- 数据流方向由 `source` 表达，不必再用边反查。**「两者不一致即非法图」是推断**：采集只确认了 `source` 的取值形态（上游节点 id 或 `staticValue`），没有采集到任何校验行为或报错。设计口径可以按此收紧（不一致时拒绝 Save），但要作为新规则写进需求，不能写成平台既有行为。

### 7.4 平铺字段与 `chartConfig` 的关系

`versionInfo` 上还有一组与 DSL **同构的平铺字段**：

```
startNode{} / featureGroupNode[] / udfNode[] / callModelNode[] / ifElseNode(null|{}) / endNode{}
```

- 平铺字段是 **`chartConfig` 的冗余镜像，供后端执行使用**（避免后端解析图结构）。`startNode` / `endNode` 形如 `{ id, name, type, dependency[], config: { output[] | input[] } }`。
- **`chartConfig` 是权威来源**：节点位置、连线、`condition` 等只有它完整承载；平铺字段只保留执行必需的子集。
- 写路径上必须**同时维护两处**，任一处失配就会出现「画布看到的」与「实际执行的」不一致——这是本模块最容易出错的点。
- **`featureGroupNode` 是预留位**：schema 中存在，但实测样本里 0 次出现。它对应 Feature Store 的联动位（第 13 节），前端节点库已备 `FeatureGroup`，但当前无人使用，不应对外宣称「已支持特征组节点」。
- 另有一个 `newChartConfig` 字段与 `chartConfig` 并存，两者关系未采集到（待确认，第 15 节）——在明确之前，一律以 `chartConfig` 为准。

## 8. Router（流量路由）

路由 `/router/{serviceId}`，标题 `Traffic Router`，两个 Tab：`Manage` / `History`。

### 8.1 Manage

| 界面控件 | 控件形态 | `featureService.routerConfig` 字段 | 单位 / 取值范围 |
|---|---|---|---|
| `Enabled Version` | 只读展示（未配置时 `Not configured`） | — | 版本标识 |
| `Online Traffic` → `Max QPS` | 数字 stepper | `rateLimit` | 整数 |
| `Dry Run Traffic` → `Trigger Rate` | 百分比输入 | `dryRunTriggerRate` | **小数**（`0.1` = 10%） |
| `Advanced Config` → `Tracing Sampling` | slider | `logSample` | 0–100% |
| `Advanced Config` → `Log Enable Rate` | slider | `logEnable` | 0–100%（接口侧疑似布尔化） |
| `Advanced Config` → `Allow Partial Exec` | 开关 | `allowPartialExec` | boolean |
| `Advanced Config` → `Open Tracing Detail` | 开关 | `tracingDetailSwitch` | boolean |

底部 `Cancel` / `Submit`。

```json
{ "rateLimit": 100, "logSample": 0, "logEnable": 1,
  "dryRunTriggerRate": 0.1, "allowPartialExec": false, "tracingDetailSwitch": true }
```

（以上为实测取值的代表形态，非某个真实服务的当前配置。）

> **映射陷阱**：`Trigger Rate` 在界面是百分数、在接口是**小数**；`Log Enable Rate` 在界面是 0–100 的滑杆、在接口看到的是 `1`（`0/1` 还是 `0–100` 无法从单点取值区分，见第 15 节）。两个字段的单位都不与界面直通，展示层必须显式换算，不能直传。
> `Tracing Sampling`（`logSample`）与 `Log Enable Rate`（`logEnable`）是两个独立开关：前者控制**采多少**，后者控制**是否落日志**。采样为 0 且日志开关为 1 是合法组合。

### 8.2 History

表格 `Operation Time` / `Operator` / `Change Details`，无数据时 `No data`。记录的是 `routerConfig` 的**每次提交**（谁、何时、改了什么），是流量变更的审计面。

## 9. Tracing Log（链路日志）

路由 `/tracing-log/{serviceId}`，标题 `{ServiceName} ({Region}) Tracing Log`。

| 区域 | 内容 |
|---|---|
| 筛选栏（可折叠） | `ServiceVersion` / `TraceId` / `Status` / `Tag` / `Duration(ms)`（min ~ max 区间）/ `FlowNo` / `ReqTime`（起 ~ 止 区间）+ `Reset` / `Query` / `Collapse∧` |
| 表格 | `[checkbox]` / `ReqTime` / `Status` / `Tag` / `Duration(ms)` / `FlowNo` / `ServiceVersion` / `TraceId` / `Action` |
| 行动作 | `Detail` / `Traceback` |
| 批量 | 表头 checkbox 全选，支持多选；**批量动作的具体内容未采集到**（第 15 节） |

- `Status` 实测取值：`success` / `failed`。
- `Tag` 实测取值：`test-run`（标记批量测试产生的调用）；其余取值未采集到。
- `TraceId` 为多段冒号分隔的十六进制串，形如 `0123456789abcdef0123456789abcdef:fedcba9876543210:0000000000000000:1`（合成占位示例）。形状为**四段**；「每段依次是 trace / span / parent / 序号」只是常见命名习惯下的猜测，**本次采集没有验证任何一段的含义**。解析、切分、按段过滤都需先确认格式（第 15 节）；在此之前按不透明字符串处理最安全。
- `Detail` 打开右侧 `Snap Shot` 抽屉（`RESULT` / `DETAIL` / `TRACING` 三 Tab），与画布内的抽屉同一组件。
- `Traceback` 语义为沿 trace 回溯上游调用链，具体承载形式未采集到（待确认，见第 15 节）。

## 10. Batch Test

弹窗标题 `Batch Test`：

| 字段 | 必填 | 说明 |
|---|---|---|
| `Upload Type` | — | 仅 `CSV`（默认） |
| `Upload File` | ✅ | `Click to Upload`，仅接受 CSV |

提示文案：`CSV headers should include all input parameters from the start node of this version`。
底部按钮：`Verify` / `Cancel` / `Submit`。

> **核心约束**：CSV 表头必须覆盖该版本 `Start` 节点的**全部 output 参数**。`Start.output[]` 就是这份 CSV 的列契约——缺任一列即视为不合格输入，应在 `Verify` 阶段拦下，而不是等 `Submit` 后执行失败。
> 推论：**改 `Start` 节点的输出变量清单会让既有批量测试 CSV 失效**。因此 `Start.output` 的任何增删都应视为对测试资产的破坏性变更，需在画布 `Save` 前提示影响面。
> `Verify` 与 `Submit` 的分工：`Verify` 做文件级校验（表头覆盖、行数、类型），`Submit` 发起执行并在 Tracing Log 落 `Tag = test-run` 的记录。

## 11. Permission

弹窗标题 `{ServiceName} Permission`。

- 授权行：`[User / Team 选择器]` + `[对象选择器]` + `[角色下拉]` + `Add`。即授权主体可以是**单个用户**或**整个 Team**。
- **角色枚举**：`Viewer` / `Invoker` / `Editor` / `Owner`（四值）。**四个值的高低顺序未实测**，不要假设「依次递增」；赋权时的等级校验需先确认排序（第 15 节）。
- 已授权列表：`{email 或 TeamName}` + 类型徽标（`User` / `Team`）+ 当前角色 + 可改角色下拉。实测只在列表中观察到 `OWNER` 与 `VIEWER` 两种徽标，**不要据此认定列表会展示全部四个角色**；角色文本按接口下发原样展示（大小写不自行改写）。

`currentUserRole` 由 `versionDetails` 接口下发，实测取值：`OWNER` / `VIEWER` / `INVOKER`（`EDITOR` 未在该接口返回值中出现过）。它是**接口字段**，与列表里的角色徽标是两处独立证据，不要互相推导。

> **注意 `Invoker` 这一级**：它是本模块独有的角色，语义是「可调用但不可编辑」——区别于 `Viewer`（只能看）。Permission 弹窗与 Console User 的三档角色（VIEWER / EDITOR / ADMIN）**不是同一套枚举**，不要混用。

## 12. 动作门控矩阵

### 12.1 版本行动作 × 版本状态

| 动作 | `DRAFT` | `ENABLED` | `DISABLED` |
|---|---|---|---|
| `Edit`（进画布） | △ 可编辑 | ? | 🚫 置灰（实测） |
| `Copy` | △ 可用 | △ 可用 | ✅（实测） |
| `Batch Test` | △ 可用 | △ 可用 | ✅（实测） |
| `Disable`（→ `DISABLED`） | — 不呈现（未启用，无可停用） | ✅（实测） | — 不呈现（已是该态） |
| `Enable`（→ `ENABLED`） | △ 可用（草稿转正入口） | — 不呈现（已启用） | △ 按钮存在（实测），可执行性未验证 |

| 图例 | 含义 |
|---|---|
| ✅ | **实测**可用 |
| 🚫 | **实测**置灰 / 不可用 |
| △ | **推断**：状态语义决定（如「未启用的版本无所谓 Disable」），非实测 |
| — | 该状态下不呈现此动作 |
| ? | **未实测且无法从语义推断**，阻断实现（第 15 节） |

> 实测只覆盖了 `DISABLED` 一列，且只到「按钮可见 / 置灰」这一层：`Edit` 置灰不可点，`Copy` / `Batch Test` 可点并可用，第 4 个动作位显示为 `Enable`（**只是看到了按钮，没有点过**）。`DRAFT` / `ENABLED` 列中 △ 是业务语义的直接推论（草稿必须可编辑可测试、已启用版本才能停用），**不是采集结果**；`ENABLED` 下 `Edit` 存疑（已启用版本是否允许直接改编排，可能要求先 `Copy` 出新草稿），故标 `?`。

### 12.2 画布动作 × 版本状态

| 动作 | `DRAFT` | `ENABLED` | `DISABLED` |
|---|---|---|---|
| `Graph Config`（Export / Import DSL） | ? | ? | ? |
| `Run` | ? | ? | ? |
| `Save` | ? | ? | ? |
| `Enable` | ? | — 已启用 | ? |

> 画布页头四个控件的按状态门控**完全未在本次实测中覆盖**（只采集了控件存在性）。这是本规格最大的证据缺口：在补齐前，实现方不应假设「`DISABLED` 版本画布只读」，也不应假设「`ENABLED` 版本画布不可改」。

### 12.3 服务行动作 × 用户角色

服务行 5 个动作与 `currentUserRole` 的对应关系**未实测**。已知角色枚举值为 `Viewer` / `Invoker` / `Editor` / `Owner`（第 11 节，**高低顺序本身也未确认**）。「哪档角色能点哪个动作」需后端 `userRoles` 接口的返回口径确认。下表的「最低角色」纯属按角色名直觉排的推断（**待验证**），排序未定的前提下连「最低」这个词都不成立：

| 动作 | 推断最低角色 |
|---|---|
| `Router` / `Tracing`（查看类） | `Viewer` |
| `Add` / `Batch Test`（调用 / 造版本） | `Invoker` |
| `Permission`（改授权） | `Editor` |
| `More > Delete`（删服务） | `Owner` |

## 13. 与其他模块的边界

| 关联点 | 边界口径 |
|---|---|
| **Model Deployment** | `CallModel` 节点在节点类型层面绑定的字段只实测到 `{ modelName, modelVersion, buildVersion }`（见 7.2）；`modelId` 出现在跨模块关联的记录里，不在节点类型表内，是否为节点字段待确认（第 15 节）。语义上它直接消费 Model Deployment 发布的服务（Build），**Orches 不登记模型、不构建 Build，只引用**；Build 的 `Deployment Status` 单一事实源在 Model Deployment。引用一个已 `Offline` 的 Build 是否在 `Save` 时即拦截，待确认。 |
| **Feature Store** | `featureGroupNode` / `FeatureGroup` 节点是**预留联动位**（schema 已定义，实测 0 使用）。同时 Feature Entity 用于 `Start` 节点的实体 auto complete（见 [feature-entity/spec.md](../feature-entity/spec.md)）。当前属「留了口子、未接线」。 |
| **Console / User** | `Owner[]`、`Biz Team`、`Permission` 的角色主体（User / Team）均来自 Console User 体系。Orches 自己的 `Viewer / Invoker / Editor / Owner` 是**资源级角色**，与 Console 的 Team 级 `VIEWER / EDITOR / ADMIN` 是两套枚举。 |
| **AI Hub / LLM Mgmt** | 画布页会加载 LLM 管理列表；`UDFProcessor` 是否直接引用 LLM Mgmt 资产，未采集到明确节点形态。 |
| **Online Runtime 同层模块** | 顶层 `Online Runtime` 下除本模块外还有 `Agent Service`（已上线，独立列表 / 配置台 / 部署管理 / Permission）与 `LLM Workflow`。三者是并列入口，**不是同一份实体的不同视图**：`Agent Service` 的 `onlineStatus`（`0 = UnDeployed` / `1 = Online`）与本模块的 `versionInfo.status`（三值）是两套状态机，不要归一化。本规格只覆盖 Orches Service，Agent Service 另篇。 |
| **UDF 来源** | `UDFProcessor.udf = { functionName, version, functionType: groovy \| python }`。UDF 函数本身的登记 / 版本管理不在本模块（Console 侧标注「Udf 暂不纳入」），Orches 只按名 + 版本引用。 |
| **监控 / 告警** | `More > Monitor` 实测跳外部监控系统（外链）。`More > Alert` 实测只确认「进入告警配置」，**告警是本模块内建页面、外链，还是独立流程均未证实**——不要与 `Monitor` 合并成同一种边界，也不要假设它由本模块承载（第 15 节）。 |

## 14. 关键 API 契约

只列本模块读路径的核心契约（写路径未采集）。

```
POST /bff/api/featureService/list
  req  { page, pageSize, current }
  resp { code: 0, data: { total,
           list: [{ id, featureService, region, owner[], bizTeam,
                    routerConfig: { rateLimit, logSample, logEnable,
                                    dryRunTriggerRate, allowPartialExec, tracingDetailSwitch },
                    createdAt, updatedAt, createdBy, updatedBy, isDelete,
                    versionList: [{ id, featureServiceId, version, status, routerTag,
                                    description, isDelete, createdAt, updatedAt,
                                    createdBy, updatedBy }] }] } }

GET /bff/api/featureService/versionDetails?id={versionId}&featureServiceId={serviceId}
  resp { data: { id, featureService, region, owner[], bizTeam, routerConfig, currentUserRole,
                 versionInfo: { id, featureServiceId, version, status, routerTag,
                                chartConfig{}, newChartConfig, description,
                                startNode{}, featureGroupNode[], udfNode[],
                                callModelNode[], ifElseNode, endNode{} } } }

GET  /bff/api/datasource/getRegions          -> 地区枚举数组，实测 10 项（见第 1 节），顺序由后端下发
GET  /bff/api/category/biz-team/all          -> [{ id, categoryName, categoryType, descInfo, updater, createTime, updateTime }]
POST /bff/api/user/getCurUser                -> { email, platformAdmin, viewAllBizTeams, roleList:[{ role, bizTeam }] }
POST /bff/api/resource-permission/userRoles  req { resourceType: 5, resourceIds: [] }
POST /bff/api/user/list                      req { page, pageSize }
```

- `status` 为整数枚举 `1/2/3`（第 1 节），前端展示层映射为 `DRAFT` / `ENABLED` / `DISABLED`。
- 列表接口的 `versionList` 是**轻量视图**（无 `chartConfig`）；编排图只在 `versionDetails` 返回。
- `resourceType: 5` 是 Orches Service 在统一资源权限体系里的类型码。

## 15. 待确认项

**证据缺口（本次未实测，阻断实现）**

1. 画布 `Graph Config` / `Run` / `Save` / `Enable` 四控件在三种版本状态下的门控关系（12.2 全为 `?`）。
2. 版本行动作在 `DRAFT` 与 `ENABLED` 下的可用性（12.1 的 △ 与 `?`）；`DISABLED` 只实测到 `Edit` 置灰、`Copy` / `Batch Test` 可用，以及第 4 个动作位**变成 `Enable`**——`Enable` 点击后能否成功启用、是否有二次确认、失败如何提示，均未验证。
3. 服务行动作与 `currentUserRole` 的对应矩阵（12.3 仅为推断）。
4. `Traceback` 的交互承载（弹窗 / 抽屉 / 跳页）与数据来源。
5. 版本行 Action 区域的**图标按钮**：实测存在但图标与功能未采集到。
6. `DISABLED` 版本的版本表 `Router` 列显示值（只实测到 `DRAFT` 为 `-`、`ENABLED` 为 `ONLINE`）。
7. Tracing Log 的**批量动作内容**：实测只确认表头 checkbox 与「支持多选」，多选后出现哪些动作、各自语义与权限均未采集（第 9 节）。
8. `More > Alert` 的承载形态：本模块内建页面 / 外链 / 独立流程，均未证实（第 13 节）。
9. `CallModel` 节点是否带 `modelId` 字段：节点类型层面只见到 `modelName` + `modelVersion` + `buildVersion`（第 13 节）。
10. `TraceId` 各段的语义与格式（段数稳定是四段？能否按段过滤？）——当前按不透明字符串处理（第 9 节）。
11. Permission 四个角色 `Viewer` / `Invoker` / `Editor` / `Owner` 的**高低排序与继承关系**：只采集到枚举值，等级校验依赖排序（第 11 节、12.3）。
12. 已授权列表实际会展示哪些角色徽标：只观察到 `OWNER` 与 `VIEWER`，`INVOKER` / `EDITOR` 是否作为徽标出现未采集（第 11 节）。

**契约歧义**

13. `chartConfig` 与 `newChartConfig` 并存：两者谁权威、在什么条件分别写入。
14. `Import DSL` 是整图替换还是增量合并；导入后 `startNode` / `udfNode` 等平铺镜像是否自动重建。
15. `Line` 的 `source` / `target` / `sourcePortId` / `targetPortId` 的确切嵌套位置（顶层还是 `props` 内）未逐字段验证。
16. `props.nodeMap` 的作用（推断为节点内部子图索引，未验证）。
17. `IfCondition2` 两个分支端口的确切 id 命名（`case1` / `case2` 是逻辑类型还是实际端口 id）。

**产品规则**

18. `ServiceVersion` 默认值的自增规则（当前实测为 `V1`）：按服务内最大号自增，还是允许用户自定义。
19. 引用一个已 `Offline` / 已不存在 Build 的 `CallModel` 节点，是在 `Save` 时拦截还是在 `Run` 时失败。
20. `Tag` 除 `test-run` 外的取值集合（`prod` / 手工标记？），以及是否可被用户写入。
21. `Log Enable Rate` 接口取值到底存 `0/1` 还是 `0–100`（单点取值无法区分）。
22. `Start.output` 变更导致既有 Batch Test CSV 失效时，是否需要在 `Save` 前做影响面提示（本文建议要）。
23. `Biz Team` 下拉在未选 Owner 时的交互：实测只记到占位文案 `Please select owner firstly!`，下拉是否可展开、是否整项置灰未采集（第 5 节）。
24. 平台为何把 Router / Tracing Log 做成服务级路由而画布做成版本级：无动因证据，仅契约形状可信（第 2 节）。
