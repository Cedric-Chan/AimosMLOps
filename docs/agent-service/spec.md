# Online Runtime / Agent Service — 领域规则与交互规格

> 来源：2026-10-29 平台实测采集（只读，零写操作），所有值已脱敏为合成占位。
> 本文只定义产品语义与交互口径，不含实现细节；原型见 `apps/agent-service/`（已接入平台导航）。
> 真实平台的 Online Runtime 下并列三个入口：**Orches Service**（编排图）· **Agent Service**（本文）· **LLM Workflow**。Agent Service 已上线，不是 Future 占位。本仓库导航只收录前两个——`LLM Workflow` 按产品决策移除（不收占位项），故本文与 `LLM Workflow` 的边界见待确认项 10。

## 0. 证据等级约定

本文与 [Orches spec](../orches-service/spec.md) 采用同一套约定：每条结论标注证据等级，未标注的表格行默认〔实测〕。

| 标记 | 含义 | 实现方应如何对待 |
|---|---|---|
| 〔实测〕 | 2026-10-29 页面真实渲染或接口真实响应直接读到 | 可直接作为实现依据 |
| 〔推断〕 | 由字段语义、同类页面或产品常理推得，**本次未实测** | 实现前需产品确认；不要写进对外承诺 |
| 〔未采集〕 | 无任何证据 | 阻断实现，见第 12 节 |

> 这份清单本身就是修复项：初版把大量推论写成了实测事实（触发符交互细节、`Overwrite Draft` 语义、部署状态机、角色门控等），本节和逐条的标记是修正手段。

## 1. 概念模型

- **Agent Application（逻辑实体）**：一份可被在线调用的 LLM Agent 配置 + 它的发布版本 + 它的部署记录。列表一行一个应用，`Name` 是展示名。
- **Agent Code（`agentUuid`）**：应用创建时生成的 32 位十六进制标识，配置台页头以 `Agent Code: {agentUuid}` 展示〔实测〕。**是否创建后不可变、是否可作跨页面稳定键，UAT 未验证**（见待确认项 1）。对外文档与跨模块引用**推荐**使用 `agentUuid` 而非内部 `id`——这是口径建议，不是平台既有事实。示例：`4f2a9c7d1e8b4a6f9c0d3e5b7a1f2c84`。
- **`id` 与 `agentUuid` 并存**〔实测〕：列表接口同时返回内部 `id`（number）与 `agentUuid`。**页面路由的占位一律写作 `{agentId}`**（列表 → 配置台 / 部署管理），UAT 未证明路由实际取 uuid 还是内部 `id`。实现时必须按后端路由契约确认，**不要假设 `{agentId} == agentUuid`**。

### 1.1 与 Orches Service 的本质差异

**相同之处**（都属 Online Runtime，列表页形态一致）：都是「筛选栏 + 主按钮 + 表格 + 行内 Action」；`Owner` / `Owning Team` / Permission 的角色主体来自同一套 Console User 体系。

> 注意「形态一致」不等于「同构」。列表页可以做同一套布局模式，**配置页与弹窗能力不行**——见下表与 §10.1。

**不同之处**：

| 维度 | Orches Service | Agent Service |
|---|---|---|
| 被测对象 | **编排图**（pipeline DSL：节点 + 边 + 流量路由）〔实测〕 | **LLM Prompt 配置**（模型 + Prompt + Tools + 记忆轮数）〔实测〕 |
| 配置页 | **编排画布**（React Flow：节点面板 + 画布 + `Run` / `Save` / `Enable`），**没有「表单式 Configure 页」**〔实测〕 | **表单式配置台**（四张卡片左右分栏 + Preview 面板），**没有画布**〔实测〕 |
| 版本形态 | 服务行内嵌**版本表**，`DRAFT / ENABLED / DISABLED` 三态，版本是独立对象〔实测〕 | **没有版本表**〔实测〕。`Current Draft` + `Overwrite Draft` + 部署记录三处出现「版本」概念；「草稿 / 发布版本 / 部署记录」三分法是本文的归纳〔推断〕，平台未用这套命名 |
| 状态位 | 行级无状态，状态在版本上（`versionInfo.status`）〔实测〕 | 行级有状态：列表返回 `onlineStatus`（应用级）〔实测〕 |
| 创建入口 | `Add Service` 弹窗（顶部建服务 / 行内建版本共用同一表单）〔实测〕 | `Create Agent` 弹窗，只有建应用、没有「加版本」入口〔实测〕 |
| 调试图 | Tracing Log（按服务查链路，`success` / `failed`，可多选）〔实测〕 | API Debug（打真实在线端点〔实测：置灰规则〕；弹窗内容〔未采集〕） |
| 批量执行 | **Batch Test**（上传 CSV，表头须覆盖 Start 节点参数）〔实测〕 | **无**：列表与配置台均无批量入口〔实测〕（是否有替代，待确认项 9） |
| 流量控制 | **Traffic Router**：`Max QPS` / Dry Run `Trigger Rate` / Tracing Sampling / Log Enable Rate / Allow Partial Exec〔实测〕 | **无流量配置入口**〔实测：页面无对应区块〕。QPS / 灰度 / 采样由何处决定〔未采集〕 |
| 版本级开关 | 版本行 `Disable` / `Enable`（`ENABLED ⇄ DISABLED`）〔实测〕 | **无版本级开关**。应用级只有「部署 / 不部署」，下线体现为部署记录的 `Offline` 状态（§7.3，其与「下线动作」的关系未采集） |
| 可观测后端 | 服务级 trace，内建 Tracing Log 页〔实测〕 | **Langfuse，每个 Agent 一个 project**（`langfuseProjectId`）〔实测字段〕；平台内无自建 trace 页〔推断：未见对应入口〕 |

> **结论口径：Agent 与 Orches 是两个平行的产品形态，不是「同一个列表 + 换一套字段」。** 说「两者交互范式同构（列表 / Configure / Permission 弹窗）」是错的：**Orches 没有 Configure 页**，它的配置入口是编排画布 + `Add Service` 弹窗；Agent 没有画布。能合理说相近的只有两处——列表页骨架、Permission 弹窗结构（§8.5）。
>
> **LLM Workflow 与本模块的边界**：LLM Workflow 也在 Online Runtime 下（路由 `/online-runtime/llm-workflow/list`〔实测〕），但本次未做采集，**它在录入对象、版本语义、调试与观测上与本模块如何区分，属于〔未采集〕**，不得在文中凭空补写（见待确认项 10）。

**三层结构（Agent 的核心抽象）**：

1. **Draft**：配置台里持续编辑的草稿，随改随存，没有版本号〔实测：页头有 `Draft updated: {time}`〕。草稿的保存粒度（自动保存还是失焦保存）〔未采集〕。
2. **发布版本（published version）**：`Publish` 把草稿固化成一个版本〔推断：由按钮名与 `A prompt is required to save or publish.` 推得，页面未展示版本号〕。发布后草稿是否可继续演进、已发布版本是否不可变，〔未采集〕。
3. **部署记录（deployment record）**：把某个发布版本部署到某个 Region 的一次执行。它**有** `Status` 列，实测标签为 `Pending` / `Building` / `Deploying` / `Success` / `Offline` / `Failed` 六个（§7.3）。**这六个标签之间的先后顺序与终态属性均未实测**。

> 因此 Agent 的「版本」不是一个可点开查看的对象，而是部署记录里的一列 `Version`。回溯某个版本当时长什么样，只能靠部署记录 + 该版本的发布快照（快照查看入口未采集到，见待确认项 2）。

## 2. 列表页

路由 `/online-runtime/agent-service`。

| 区域 | 内容 |
|------|------|
| 筛选栏（可折叠） | `Name`（文本）/ `Owner`（文本）/ `Owning Team`（下拉）〔实测〕 / `Region`（控件形态未采集）/ `Status`（下拉）〔实测〕；`Reset` / `Query` / `Collapse ∧` |
| 工具栏 | 标题 `Agent Service` + `Create Agent` 主按钮〔实测〕 |
| 表格列 | `Name` / `Owner` / `Owning Team` / `Region` / `Status` / `Description` / `Create Time` / `Update Time` / `Action`〔实测〕 |
| 分页 | 实测只见总数文案 `1-10 of 28 items`〔实测〕。每页条数的默认值与是否可改〔未采集〕——不要写死 `10 / page` |
| 空态 | 列表页空态文案〔未采集〕（`No data` 仅见于部署记录表，不能反推到列表页） |

**行 Action（4 个）**：`Configure` / `API Debug` / `Deployment` / `...`〔实测〕

**`...` 菜单（4 项）**：`Copy` / `Edit` / `Logs` / `Permission`〔实测〕

- `Configure` → 配置台，`Deployment` → 部署管理。两者都是页内路由跳转，不是弹窗〔实测〕。
- `Logs` → 观测入口〔实测：动作存在且可点〕。**它指向哪里、如何跳转，未采集**（内嵌面板 / 新标签页打开 Langfuse project / 平台中转页），见待确认项 3。唯一相关的事实是列表接口返回 `langfuseProjectId`（§11.1），据此**推断**观测后端是 Langfuse——不要把推断写成「`Logs` 即跳该 project」。
- `Action` 列容纳 4 个动作，视口窄时是否被裁切〔未采集〕。**Orches 列表存在 5 个动作溢出的实测问题，不能据此断言 Agent 列表也会溢出**；实现口径按通用做法处理（`Action` 列固定宽度 + 表格横向滚动），并标记为设计决策而非缺陷修复。
- `Owner` 筛选目前是文本输入（Orches 同类筛选是下拉）〔实测〕，属同平台同类控件不一致，保留实测形态并在待确认项 16 记录。
- `Copy` 与 `Edit` 的语义边界未采集：`Copy` 复制的是整个应用还是仅草稿？`Edit` 与 `Configure` 是否重复（见待确认项 17）。

## 3. 状态机与 API Debug 门控

`onlineStatus` 是**列表接口下发的应用级状态**，实测只有两个取值〔实测〕：

| 值 | 标签 | 语义 |
|---|---|---|
| `0` | `UnDeployed` | 没有可用的在线服务实例（含义由标签推得） |
| `1` | `Online` | 已有在线服务实例，可被真实调用（含义由标签推得） |

> `onlineStatus` 是**应用级**状态，不是部署记录级状态。部署记录有 6 个状态标签（§7.3），但**应用级状态如何由部署记录推导，未采集到**（见待确认项 4）——不要实现成「存在任一 Success 即 Online」之类的规则，那是猜测。

### 3.1 核心门控：API Debug 仅 Online 可点

| Status | Configure | API Debug | Deployment | `...` |
|---|---|---|---|---|
| `UnDeployed` | ✅ | 🚫 **置灰**〔实测〕 | ✅ | ✅ |
| `Online` | ✅ | ✅ | ✅ | ✅ |

**规则**〔实测〕：`API Debug` 仅在 `onlineStatus == 1` 时可点，`UnDeployed` 时置灰。

**原因**：API Debug 打的是**真实在线服务端点**，不是本地 mock。未部署就没有可打的目标，放行只会返回连接错误，用户会误判为「Agent 配置有问题」。因此判定放在入口，而不是等调用失败再报错。（这是对实测规则的解释，不是额外实测结论。）

**可及性修正**：置灰必须带 `title="Deploy first to enable API Debug"`。实测平台只置灰不给原因，用户无法区分「权限不足」「加载中」「状态不允许」三种置灰。

> **配置台页内的 `API Debug`**：UAT 在配置台里点击该按钮**没有响应**，据此推测也受 `Online` 门控，但**这是推测，不是实测**（见待确认项 5）。§5.1 与 §9 按此口径标注〔推断〕。

### 3.2 权限门控不在本节的二维表里

`onlineStatus` 只管住 `API Debug` 一个动作。凡是看起来「Other 都不受状态影响」的解读都不成立——`Permission` 的角色门槛、`Publish` 的 Prompt 非空门槛是**另一维度**的门控，见 §8.4 与 §9。

## 4. Create Agent 弹窗

标题 `Create Agent Application`〔实测〕。

| 字段 | 必填 | 说明 |
|------|------|------|
| `Name` | ✅ | 文本输入，应用展示名 |
| `Owner` | — | 默认当前登录用户，只读展示（不在弹窗内改归属）〔实测〕 |
| `Owning Team` | ✅ | 下拉，辅助文案 `Select one of the fixed Owner's Teams.`〔实测〕 |
| `Region` | ✅ | 下拉，取 regional 枚举〔实测〕 |
| `Description` | — | textarea，字符计数 `0 / 1000`〔实测〕 |

底部：`Cancel` / `Create`。

**关键约束：`Owning Team` 的候选集 = Owner 所属 Team 集合**，不是全平台 Team 列表。

- 依据〔实测〕：辅助文案明确写 `fixed Owner's Teams`，即只能从 Owner 所属 Team 中选。
- 交互后果：`Owner` 在弹窗内只读且默认当前用户，**正常情况下不存在「Owner 未解析」的中间态**。因此不要求为此设计空态；只有当 Owner 解析失败（接口异常 / 新用户无 Team）时才需要处理，此时应禁用 `Create` 并提示，而不是先展示全量团队再在提交时校验。
- **与 Orches `Biz Team` 的关系：不要写成「规则同源」**。两者确实都依赖 Owner，但约束强度不同：
  - Orches：`Biz Team` 依赖 Owner，**Owner 可改**，未填 Owner 时占位文案 `Please select owner firstly!`〔实测〕。
  - Agent：`Owning Team` 只能从 **Owner 所属 Team** 中选，Owner 只读〔实测〕。
  - 即 Orches 是「先选 Owner 才能选 Team」，Agent 是「Team 被 Owner 集合限定」。两者是否共用同一份后端校验规则〔未验证〕，实现时按 Agent 自己的约束（子集校验）做。
- 术语与字段名的统一口径尚无权威来源：仓库唯一词汇表 `CONTEXT.md` 目前只覆盖 Evals 域，**不含 `Owning Team` / `Biz Team` / `Agent` / `Orches` 的定义**。本模块的术语以本文为准，待 `CONTEXT.md` 扩充后再回填。

## 5. 配置台（Configure）

路由 `/online-runtime/agent-service/config/{agentId}`。

### 5.1 页头

左侧：`←`（Back to Agent Service）+ `{agentName}` + `Agent Code: {agentUuid}`〔实测〕。

右侧：`Draft updated: {time}`（文本，非按钮）+ **三个按钮**〔实测〕：

| 按钮 | 作用 | 门控 |
|---|---|---|
| `Version Management` | 打开右侧抽屉，见 §6 | 〔未采集〕实测未见置灰，按恒可用实现 |
| `API Debug` | 同列表页，打在线端点 | **〔推断〕** 配置台内点击无响应，推测受 `Online` 门控（待确认项 5）；`UnDeployed` 时置灰 + 同上 title。**这条不是实测结论** |
| `Publish` | 把当前草稿固化为发布版本 | Prompt 为空时不可发布（见 §5.2 卡 2 的提示语） |

> `Draft updated` 与列表页 `Update Time` **不是同一时间源**〔实测：同一应用在两处的数值对不上〕：前者是草稿保存时间，后者是应用级更新时间。两者语义不同，UI 上不能共用文案，也不应指望数值一致。数据源属待确认项 11。

### 5.2 左栏（配置区，四张卡片）

**卡 1 · Model**

- `LLM Model`：下拉，占位 `Select model`〔实测〕；候选来自 AI Hub / LLM Mgmt 的模型登记表（见 §10）〔推断〕。
- `Advanced Settings ▾`：折叠面板〔实测存在〕，展开后放什么（面板内容未采集，见待确认项 18）。

**卡 2 · Prompt**

- 提示语 `A prompt is required to save or publish.`〔实测〕 —— 这句话定义了一条硬规则：**空 Prompt 不可保存、不可发布**。
- 右上 `+ Manage variables`〔实测〕：管理变量清单。清单内有什么字段（变量名 / 默认值 / 说明）〔未采集〕。
- 富文本编辑区，placeholder：`Define the Agent role, task, rules, and response behavior. Type / for variables, or @ for tools and knowledge bases.`〔实测〕
- **两个触发符**——UAT 的实测证据只有 placeholder 这一句：输入 `/` 插入变量，输入 `@` 引用 tools 与 knowledge bases。具体如下：

| 触发符 | 插入对象 | 已实测 | 未实测（不得写成规则） |
|---|---|---|---|
| `/` | **变量**（variable） | 存在该触发方式（placeholder 明示） | 浮层样式、候选来源、插入后的 token 形态 |
| `@` | **Tools 与 Knowledge Bases** | 存在该触发方式（placeholder 明示） | 是否两类混排、是否也覆盖 Skills / MCPs |

> **实现前的红线**：以下 5 条曾被写成实测规则，**全部无证据**，已从本文删除，不要据此实现——①浮层只在行首或空格后触发、否则 `@` 当普通字符；②`Esc` 关闭浮层且不回退字符；③变量 token 是不可编辑原子块；④资源 token 是不可编辑原子块；⑤退格一次整体删除 token。
>
> 这些都是常见富文本编辑器的合理做法，**可以作为实现建议**（并配 `ponytail:` 注释说明是自选约束），但必须由产品确认后写入，不能冒充平台实测（见待确认项 6）。

**卡 3 · Tools**（右上 `Tool Settings`）

四行配置入口，每行右侧一个 `Configure`：

| 行 | 配置对象 |
|---|---|
| `Tools` | 可调用工具 |
| `Knowledge Bases` | 知识库 |
| `Skills` | 技能 |
| `MCPs` | MCP 服务 |

- 这里的 `Configure` 是**二级弹窗/子页入口**〔推断：按钮行无开关态〕，不是启停开关；行本身是否展示已选数量〔未采集〕（见待确认项 7）。
- 本卡配置的对象与 Prompt 的 `@` 引用是**同一资源池**〔推断〕：这里决定「有哪些」，`@` 决定「这一句用哪个」。两者的联动是否真实存在〔未验证〕——placeholder 只提到 tools 与 knowledge bases，未提 Skills / MCPs。

**卡 4 · Conversation Memory**

- 副标题 `Number of recent conversation rounds supplied to the Agent.`〔实测〕
- slider `0–30` + 数字 stepper，默认 `10`〔实测：范围与默认值；两控件是否双向同步〔推断〕〕。
- 语义是「喂给模型的历史轮数」，不是存储保留期；`0` 表示无记忆（每轮独立）。这是对副标题文案的解读〔推断〕。

### 5.3 右栏（Preview & Debug）

- 面板标题 `Preview & Debug`，右上折叠/展开图标〔实测〕。
- **空态**：机器人图标 + `{agentName}` + `Start Session` 按钮〔实测〕。
- **会话态**：点 `Start Session` 进入对话流〔未采集〕——消息列表 / 输入框的形态属推测，本文不定义。
- 该面板以草稿还是已发布版本为上下文〔未采集〕（见待确认项 8）——这决定了它是「预览未保存改动」还是「调试线上服务」，是产品上必须钉死的一条。

## 6. Version Management（右侧抽屉）

- 标题 `Version Management`，从配置台页头打开〔实测〕。
- 抽屉内实测只有两项〔实测〕：

| 项 | 形态 | 已实测 | 语义 |
|---|---|---|---|
| `Current Draft` | 带对勾徽标 | 是 | 当前正在编辑的草稿，即配置台左栏这份 |
| `Overwrite Draft` | 动作（文字按钮） | 是（仅知标签与位置） | **未采集** |

- **`Overwrite Draft` 的语义不要臆造**。上一版把它写成「用某个已发布版本覆盖当前草稿」，又与同节的「抽屉里没有版本列表」并存——没有列表就没有选择来源，两个断言互斥。UAT 只给了这个动作的标签，**覆盖来源、覆盖目标、是否需要二次确认，全部未采集**（见待确认项 12）。
- 抽屉里**没有版本列表**〔实测〕——这一点是确定的。因此 `Overwrite Draft` 若要选版本，来源必然在别处（例如部署记录里某一行、或一个未采集的二级选择态），实现前必须先补齐证据。
- 与 Orches 的对比仍然成立：Orches 的版本是**行内嵌版本表**（可展开、逐版本操作），Agent 没有这一层（§1.1）。但不要把两者的动作名对齐——Orches 的对应能力是 `Copy`（复制版本为新草稿），语义与 `Overwrite Draft` 是否相同〔未验证〕。

## 7. 部署管理（Deployment）

路由 `/online-runtime/agent-service/deployment-management/{agentId}`。
面包屑 `Online Runtime / Agent Service`；标题 `← {agentName} Deployment`。

### 7.1 Space Resource Application 区块

Agent 部署需要 Space 资源（计算 / 运行空间）〔实测：warning 文案与 `Service ID` / `Ticket ID` 字段〕。资源通过**工单申请**获得〔推断：字段名为 `Ticket ID`，且文案写 "apply"〕——是否是平台外的独立工单系统〔未采集〕。

三列只读信息 + 申请时间〔实测〕：

| 字段 | 说明 |
|---|---|
| `Service ID` | Space 服务标识（申请通过后回填） |
| `Ticket ID` | 申请工单号（回填） |
| `Status` | 申请状态（回填） |
| `Applied Time` | 申请提交时间（回填） |

**未申请态**：黄色 warning 条
`This agent has not applied for Space resources. Please apply first; deployment will be enabled when the application is complete.`
右侧 `Apply` 按钮发起申请。

**门控**：无 Space 资源时 `Deploy` **必须显式置灰**，而不是只靠 warning 条提示。实测平台的 `Deploy` 按钮状态**未采集到**——只观察到页面给了 warning 条；warning 文案自身写着 `deployment will be enabled when the application is complete`，说明产品意图是「资源就绪才能部署」，但按钮是否真的 disabled〔未采集〕。实现口径：按 warning 文案的意图显式置灰 + title 说明，`Apply` 完成且资源就绪后解锁。

> 注意门控的**前置条件是 Space 资源**，不是 `onlineStatus`——见 §9 的说明。

### 7.2 筛选

`Version`（文本）/ `Status`（多选下拉，选中显示为 tag）+ `Reset`。

### 7.3 部署状态枚举

实测只给出 6 个状态**标签**（部署表的 `Status` 列），以及它们各自的字面含义：

| 状态标签 | 字面含义 |
|---|---|
| `Pending` | 待处理 |
| `Building` | 构建中 |
| `Deploying` | 部署中 |
| `Success` | 成功 |
| `Offline` | 已下线 |
| `Failed` | 失败 |

> **状态机是本次最大的证据缺口之一。** 上一版还给出了「是否终态」列与一条完整的流转链——**两者都没有任何实测依据**，已整体删除。本文不再复述那条链，避免它被当成既定事实沿用。
>
> 已知的只有两点：①这 6 个标签存在；②`Status` 筛选是多选下拉（可一次选多个）。以下问题必须由后端 / 产品补齐后才可实现状态图：允许哪些迁移？`Offline` 是终态还是可被重新部署拉回？`Failed` 能否原地重试，还是必须新建记录？多 Region 时状态是每条记录一个还是聚合（见待确认项 13）。
>
> 实现口径：状态列只做**标签到颜色的映射**（`Success` 绿 / `Failed` 红 / 其余中性），**不画迁移图、不做「下一步会变成什么」的预测、不据此设计按钮门控**，直到状态机被确认。

### 7.4 部署记录表

工具栏：`My operations only` 勾选 + `Deploy` 主按钮〔实测〕；无记录时空态 `No data`〔实测〕。

| 列 | 说明 |
|---|---|
| `Version` | 被部署的发布版本标识 |
| `Deployment Action` | 本次动作类型（如首次部署 / 重新部署）；枚举未采集 |
| `Status` | §7.3 的 6 个标签，徽章展示 |
| `Started Time` | 本次部署开始时间 |
| `Operator` | 触发人 |
| `Action` | 行级动作，**具体项未采集**（见待确认项 14） |

- `My operations only` 按 `Operator` 过滤〔推断：由勾选文案推得〕。它是否影响 `Deploy` 可用性〔未采集〕；按「筛选与动作正交」实现。
- **「重试新增一条记录、失败记录永久保留」是上一版写下的推测，无实测依据，已删除。** `Failed` 之后的路径属待确认项 13。

## 8. Permission 弹窗

`...` 菜单的 `Permission` 打开授权弹窗。结构由页面实测〔实测〕，语义（谁能改、改了何时生效）大部分未采集。

### 8.1 结构

标题 `{agentName} Permission`。

**授权行**（一行四控：`[User] [对象] [Viewer ▾] [Add]`〔实测〕）：

| 控件位 | 内容 | 证据 |
|---|---|---|
| ① `[User]` | `User` / `Team` 二选一的选择器 | 实测存在；「选择器」这一控件语义为〔推断〕 |
| ② `[对象]` | 用户或 Team 选择器 | 实测存在；候选取值来源〔未采集〕 |
| ③ `[Viewer ▾]` | 角色下拉，默认值 `Viewer` | 实测（默认值）；完整候选枚举〔未采集〕，见 8.3 |
| ④ `Add` | 提交，追加一条授权 | 实测 |

**已授权列表**：每行 = 主体名 + 类型徽标 + 当前角色（大写）+ 可改角色下拉〔实测〕。

实测两行形态：

| 主体 | 类型徽标 | 角色 | 行内控件 |
|---|---|---|---|
| `alice@example.com` | `User` | `OWNER` | 角色下拉 |
| `Team-Alpha` | `Team` | `VIEWER` | 角色下拉 |

> 这两行能确定的只有两点：①授权主体既可以是**单个用户**也可以是**整个 Team**；②列表里角色**大写展示**（`OWNER` / `VIEWER`），授权行下拉则显示 `Viewer`（首字母大写）——同一概念两种写法，展示层需统一口径。
>
> **不能确定的是**：`Owner` 能否通过授权行添加。实测只看到下拉默认值是 `Viewer`，没有证据说明候选列表里没有 `Owner`，也没有证据说明所有者只能由创建时确定。上一版据此推出的两条结论都属于过度解读，已删除。

底部：`Done`（关闭弹窗；`Done` 才提交还是每行即时生效，未采集）。

### 8.2 与 `currentUserRole` 的关系

列表接口返回 `currentUserRole`（实测值见 §11.1），它与本弹窗「当前用户那一行」应为同一来源〔推断〕。**但「角色 → 哪些动作可用」的映射完全未采集**，见 8.4 与待确认项 15。

### 8.3 角色枚举（未采集）

- **已实测的取值**：列表行里的 `OWNER`（User 行）、`VIEWER`（Team 行），以及授权行下拉的默认值 `Viewer`。
- Orches 侧实测到四级 `Viewer / Invoker / Editor / Owner`，但**不能直接套到 Agent**——Agent 是否也有 `Invoker`、`Editor` 两档，本次未采集。
- 因此实现时：角色下拉的选项必须由后端下发，**前端不要硬编码四级枚举**。

### 8.4 动作可用性与角色

| 问题 | 状态 |
|---|---|
| 谁能打开 `Permission` 弹窗 | 〔未采集〕 |
| 谁能 `Add` / 改角色 / 移除授权 | 〔未采集〕 |
| 谁能 `Publish` | 〔未采集〕 |
| 谁能 `Deploy` | 〔未采集〕 |
| `OWNER` 能否被降级或移除 | 〔未采集〕 |

> 上一版在 API 字段说明里写过 `currentUserRole`「直接驱动 Action 可用性」——**这是把推荐设计写成了实测事实**。字段确实存在且取值是角色名，但**没有任何实测证据表明某个按钮的 enabled 状态由它决定**。设计上大概率如此，实现前需与后端确认（待确认项 15）。
>
> 本文的立场：`currentUserRole` 目前只能当作**「当前用户角色」这个展示事实**使用。若要拿它做门控，必须先补 §8.4 的映射表——否则会出现「有角色、没规则」的悬空实现，前端只能凭猜把某个按钮藏掉。

### 8.5 与 Orches 的 Permission 的关系

- **结构平行〔实测〕**：两边都是「标题 `{名称} Permission` + 一行四控的授权行（`[User] [对象] [角色 ▾] [Add]`）+ 带 `User` / `Team` 类型徽标的列表 + `Done`」。
- **不能断言「同一套组件、同一套枚举」**〔未验证〕：角色集合是否一致未知（8.3），`Add` 之后是否即时生效未知，两者是否共用同一个后端资源类型也未知。
- 这是本模块与 Orches 在**除列表页骨架之外**唯一结构相近的一页。**配置页完全不同**（画布 vs 表单），能力集差异见 §10.1 —— 因此「Agent 与 Orches 交互范式同构」这类整体性判断不成立，只能在 Permission 这一页上说「结构平行」。

## 9. 完整动作门控矩阵

列头 `<n/a>` 表示**该动作与 `onlineStatus` 无关**，因此不按状态打分。这是对上一版的关键修正：`Deploy` 曾被放在两列里打 🚫/✅，但 `Deploy` 的真实前置是 Space 资源，与 `onlineStatus` 正交，那对符号是伪门控。

| 位置 | 动作 | `UnDeployed` | `Online` | 其他前置条件 | 证据 |
|---|---|---|---|---|---|
| 列表 / 配置台 | `Configure` | ✅ | ✅ | — | 实测 |
| 列表 | `API Debug` | 🚫 置灰 + title | ✅ | 需真实在线端点 | **实测** |
| 配置台 | `API Debug` | 置灰（推断同列表页） | ✅ | 同上 | 推断 |
| 列表 | `Deployment` | ✅ | ✅ | — | 实测 |
| 列表 `...` | `Copy` | ✅ | ✅ | — | 实测（仅知可点） |
| 列表 `...` | `Edit` | ✅ | ✅ | — | 实测（仅知可点） |
| 列表 `...` | `Logs` | ✅ | ✅ | 后端 Langfuse；跳转形态未采集 | 实测（仅知可点） |
| 列表 `...` | `Permission` | ✅ | ✅ | 角色门槛未采集（§8.4） | 实测（仅知可点） |
| 配置台 | `Version Management` | ✅ | ✅ | — | 实测（仅知可点） |
| 配置台 | `Publish` | ✅ | ✅ | Prompt 非空（提示语） | 实测 |
| 配置台 | `Start Session` | ✅ | ✅ | 上下文未采集（§5.3） | 实测（仅知可点） |
| 部署管理 | `Apply` | <n/a> | <n/a> | 仅未申请时出现 | 实测 |
| 部署管理 | `Deploy` | <n/a> | <n/a> | **Space 资源已就绪**（+ 是否有可部署的发布版本才能点，未采集） | 门控意图来自 warning 文案；按钮 disabled 状态未采集 |

**两条硬门控**（性质不同，不要混排成一张二维表）：

1. **`API Debug` ⇐ `onlineStatus == 1`**〔实测〕。这是唯一一条由 `onlineStatus` 直接决定的动作门控。
2. **`Deploy` ⇐ Space 资源已就绪**（`Service ID` / `Ticket ID` 已回填且 `Status` 为通过）〔推断自 warning 文案〕。它与 `onlineStatus` 无关——未部署过的应用同样需要资源才能部署，已在线也不代表资源仍然有效。

> 其余动作在两列均 ✅ 是「实测可点」，**不表示它们**有状态门控；它们真正的门槛（角色、Prompt 非空）另行标注。矩阵只用于回答「这个状态会不会挡住这个动作」，不用于推导业务规则。

## 10. 与其他模块的边界

| 关联模块 | 关系 | 口径 |
|---|---|---|
| **AI Hub / LLM Mgmt** | 消费方 | 配置台 `Model` 卡的 `LLM Model` 下拉，候选即 LLM Mgmt 登记的模型〔推断自页面行为；下拉候选接口未逐一核对〕。Agent 不重复登记模型，只引用。模型下线对 Agent 的影响〔未采集〕——不要断言「Agent 侧不做二次校验」，那是猜测。 |
| **Langfuse**（外部可观测） | 被集成 | 每个 Agent 一个 Langfuse project，project 标识存 `langfuseProjectId`，随列表接口返回〔实测〕。Agent 不维护自建 trace 存储〔推断：接口里只有 Langfuse 标识，无自建 trace 字段〕。 |
| **Console / User** | 依赖 | `Owner`、`Owning Team`、Permission 角色主体全部来自 Console User 体系〔实测：与 Orches 同源〕。`Owning Team` 候选集由 Owner 的 Team 集合限定（§4）。Agent 的资源级角色与 Console 的 Team 级角色是否同一套枚举〔未验证〕。 |
| **Orches Service** | 并列，不嵌套 | 两者都在 Online Runtime 下，但不互相引用：Orches 的编排图不调用 Agent，Agent 也不是编排图的一个节点类型〔推断：无对应节点类型证据〕。**共享范围：列表页骨架 + Permission 弹窗形态 + Console 权限体系。** 配置页形态完全不同（画布 vs 表单），能力集也不同（§10.1）。 |
| **LLM Workflow** | 并列，未采集 | 同属 Online Runtime 的第三个入口。**与本模块的差异本次未采集**，不得臆测；见待确认项 10。 |
| **Model Deployment** | 不同链路 | Model Deployment 部署的是**模型服务**（Build 产物 → Region/Env），在平台内完成发布〔见 [model-deployment/spec.md](../model-deployment/spec.md)〕；Agent Service 部署的是 **Agent 应用**，需先获得 **Space 资源**。两者是否复用同一套部署页〔未验证〕——但至少状态枚举（6 个标签）与「Space 资源申请」这一步是本模块独有的，不要假设可复用。 |
| **Feature Store / Feature Entity** | 无关 | Agent 不消费特征组；`@` 引用按 placeholder 只覆盖 Tools / Knowledge Bases〔实测〕。Skills / MCPs 是否也在 `@` 池内〔未验证〕。 |

### 10.1 能力集差异（Orches 有、Agent 无）

读者最容易混淆「两个都叫 Service、都在 Online Runtime」就以为能力对等。以下能力**Orches 有而 Agent 没有**，是必须显式说明的边界：

| 能力 | Orches | Agent | 依据 |
|---|---|---|---|
| 画布编排（节点 / 边 / DSL 导入导出） | ✅ | ❌ 无 | 实测（Orches 有画布；Agent 配置台无画布区） |
| Traffic Router（`Max QPS` / Dry Run `Trigger Rate` / Tracing Sampling / Log Enable Rate / Allow Partial Exec） | ✅ | ❌ 无流量配置入口 | 实测 |
| Tracing Log（按服务查链路，`success` / `failed`，`Detail` / `Traceback`） | ✅ | ❌ 平台内无；观测在 Langfuse | 实测 |
| Batch Test（CSV 批量执行） | ✅ | ❌ 无 | 实测（Agent 列表无此动作） |
| 版本级 `Enable` / `Disable` | ✅ | ❌ 无（版本不是对象） | 实测 |
| 版本内嵌版本表（可展开） | ✅ | ❌ 无 | 实测 |
| 表单式 Prompt + Tools + 记忆配置 | ❌ 无 | ✅ | Orches 侧为〔推断〕：画布页未见表单式配置台 |
| 应用级在线状态（`onlineStatus` 二元） | ❌ 行级无状态 | ✅ | 实测（Orches 状态在版本上） |
| Space 资源工单申请 | ❌ 无 | ✅ | Orches 侧为〔推断〕：未采集到申请区 |

> 这张表同时是「不要复用页面模板」的依据：需要画布的路由、CSV 批量执行、版本开关全都不存在于 Agent 侧；反过来 Agent 的表单配置台、二元在线状态也不存在于 Orches。

## 11. API 契约

> 以下契约按实测响应抄录并脱敏。
>
> **关于接口路径（口径决定）**：本文沿用 [Orches spec](../orches-service/spec.md) 第 14 节的做法，**保留 `/bff/api/...` 路径**——两份规格的证据形态一致，删掉路径反而让实现方无法对照字段来源。同时遵守两条约束：①路径只作为「内部契约」出现在本节，对外文档、SDK、用户可见的错误信息里不得出现；②**只保留本模块契约实际用到的接口**。上一版还写入了 `LLM Model` 下拉所用的 LLM Mgmt 接口路径，但它不是本模块的契约（只是消费方的一个下拉候选源），已删除，改为在 §10 用文字描述依赖关系。

### 11.1 `POST /bff/api/agent-application/list`

请求：

```json
{ "page": 1, "pageSize": 10 }
```

响应：

```json
{
  "code": 0,
  "data": {
    "list": [{
      "id": 1024,
      "agentUuid": "4f2a9c7d1e8b4a6f9c0d3e5b7a1f2c84",
      "name": "kyc-document-checker",
      "description": "Reviews uploaded identity documents and returns a pass/fail decision.",
      "team": "Team-Alpha",
      "region": "SG",
      "owner": "alice@example.com",
      "langfuseProjectId": "proj_7c1e9a4b",
      "createdAt": 1761782400000,
      "updatedAt": 1761868800000,
      "createdBy": "alice@example.com",
      "updatedBy": "bob@example.com",
      "onlineStatus": 1,
      "currentUserRole": "OWNER"
    }],
    "total": 28
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 内部主键。路由用 `{agentId}` 占位，**是否取该值未验证**（§1） |
| `agentUuid` | string(32 hex) | **Agent Code**，配置台页头展示。是否不可变未验证 |
| `team` | string | Owning Team（注意字段名是 `team`，不是 `owningTeam`） |
| `region` | string | regional 枚举 |
| `langfuseProjectId` | string | Langfuse project 标识，一 Agent 一 project |
| `createdAt` / `updatedAt` | **number（毫秒时间戳）** | 见 §11.2 |
| `onlineStatus` | `0 \| 1` | 应用级在线状态（§3） |
| `currentUserRole` | string | 当前用户在该 Agent 上的角色，实测取值 `OWNER`。**是否驱动按钮可用性未验证**（§8.4）；完整枚举未采集 |

### 11.2 展示层必须统一的点：时间类型不一致

Agent 接口的 `createdAt` / `updatedAt` 是**毫秒时间戳（number）**，而 Orches Service 同类字段是 **ISO 8601 字符串**。同一平台两套时间类型，是本次实测发现的最容易埋雷的一处差异：

- 前端若按 Orches 的习惯直接渲染，会显示成 `1761782400000` 之类的裸数字。
- 排序、筛选、区间比较在两种类型下行为不同，跨模块聚合时容易静默出错。
- **口径**：在**展示层统一格式化**（列表用 `YYYY-MM-DD HH:mm:ss` 本地时区，tooltip 可带原始值）；不在数据层做批量转换，避免与后端契约漂移。若后续推动后端统一，以 ISO 8601 为目标（与 Orches 对齐），需在契约变更中单独立项。

## 12. 待确认项

按「阻断实现」优先排序。前 6 项未确认前，对应小节不应进入开发。

**阻断实现（证据缺口）**

1. **`agentUuid` 的性质与路由键**：`agentUuid` 是否创建后不可变？列表 → 配置台 / 部署管理的 `{agentId}` 实际传的是 `agentUuid` 还是内部 `id`？这决定了外部系统能否安全地引用 Agent Code（§1）。
2. **发布版本快照的可查看性**：Agent 没有版本表，历史版本内容（当时的 Prompt / Model / Tools）是否有只读快照页？若无，出问题只能靠部署记录时间点反推，归因成本高（§1.1）。
3. **`Logs` 的真实跳转形态**：内嵌面板、新标签页打开 Langfuse project，还是平台中转页？决定是否需要 SSO 透传（§2）。**在此确认前，本文不对它下任何结论。**
4. **`onlineStatus` 的换算规则**：应用级二元状态由部署记录如何聚合？是否「存在任一 `Success` 且未 `Offline` 的记录」？多 Region 时是任一成功还是全部成功（§3、§7.3）。
5. **配置台 `API Debug` 的门控**：配置台内点击无响应，是否就是因为 `onlineStatus == 0`？还是按钮未接线（页面缺陷）？这决定了 §5.1「〔推断〕」能否升级为实测（§5.1、§9）。
6. **Prompt 触发符的完整交互**：`/` 与 `@` 的浮层触发位置、候选来源、`Esc` 行为、token 是否原子不可编辑、退格删除粒度——以上 5 项全部无实测证据。可由产品直接定规则，但必须显式承认这是**新定规则**而不是「复刻平台」（§5.2）。

**契约歧义**

7. **Tools 卡的行级信息**：四行是否展示已选数量 / 类型摘要？`Configure` 打开的二级承载是弹窗还是子页（§5.2 卡 3）。
8. **`Preview & Debug` 的上下文与 `API Debug` 的区别**：前者是否用当前草稿聊天（预发布验证），后者是否打线上已发布版本？两者共用同一套会话 UI 还是两套（§5.3）。
9. **批量能力缺失是否有替代**：Agent 没有 Batch Test。是刻意不做（Agent 是单轮对话，批量意义不同），还是待建？若待建，CSV 表头约束应如何定义（§10.1）。
10. **与 LLM Workflow 的边界**：LLM Workflow 的录入对象、版本语义、调试与观测形态，以及它与 Agent Service 的重叠与分工。本次完全未采集（§1.1、§10）。
11. **`Draft updated` 与 `Update Time` 的数据源**：需在产品上显式区分「Draft Time」与「App Update Time」，并决定列表是否需要同时展示两者（§5.1）。

**产品规则**

12. **`Overwrite Draft` 的语义**：覆盖来源是哪个版本？是否需要先选版本（抽屉里没有列表，来源必在别处）？是否需要二次确认？执行后已发布版本是否受影响（§6）。
13. **部署状态机**：6 个标签之间的合法迁移、终态集合、`Offline` 能否被重新部署拉回、`Failed` 能否原地重试、多 Region 的状态是逐记录还是聚合（§7.3）。
14. **部署记录的 `Action` 列**：具体有哪些行级动作（查看详情 / 重试 / 下线 / 取消）？各自的状态门控是什么（§7.4）。
15. **Permission 角色矩阵**：完整角色枚举（是否含 `Invoker` / `Editor`）、「谁可打开 Permission / 谁可 `Add` / 谁可 `Publish` / 谁可 `Deploy`」、`OWNER` 能否被移除或降级、`currentUserRole` 是否真的驱动按钮可用性（§8.3、§8.4）。
16. **`Owner` 筛选控件不一致**：Agent 用文本、Orches 用下拉。是否统一为下拉（本次保留实测形态，记录在案，§2）。
17. **`Copy` 与 `Edit` 的语义边界**：`Copy` 复制出的是应用副本还是仅草稿？`Edit` 与 `Configure` 是否功能重复（若重复应合并入口）（§2）。
18. **`Advanced Settings` 的面板内容**：采样参数（temperature / top_p / max tokens）还是带 Agent 语义的项（如工具调用超时、最大步数）（§5.2 卡 1）。
