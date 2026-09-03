# Feature Source 页面交互说明文档

> **文档版本**：v1.0  
> **更新日期**：2026-02-25  
> **适用页面**：后台管理系统 → Feature Source 列表页  

---

## 目录

1. [页面整体结构](#1-页面整体结构)
2. [筛选栏](#2-筛选栏)
3. [一级列表表格](#3-一级列表表格)
4. [二级嵌套子表](#4-二级嵌套子表)
5. [状态机](#5-状态机)
6. [Manage 下拉操作菜单](#6-manage-下拉操作菜单)
7. [Add / Edit / Copy 表单弹窗](#7-add--edit--copy-表单弹窗)
8. [Test 弹窗](#8-test-弹窗)
9. [告警弹窗（Alert Modal）](#9-告警弹窗alert-modal)
10. [分页器](#10-分页器)
11. [字段枚举值参考](#11-字段枚举值参考)

---

## 1. 页面整体结构

```
┌─────────────────────────────────────────────────┐
│  页面 Header：Feature Source（左侧竖色条 + 标题） │
├─────────────────────────────────────────────────┤
│  筛选栏（可收起 / 展开）                          │
├─────────────────────────────────────────────────┤
│  一级列表表格                                     │
│    └── 展开行 → 二级嵌套子表                      │
├─────────────────────────────────────────────────┤
│  分页器                                           │
└─────────────────────────────────────────────────┘
```

- 背景色：浅灰（`bg-slate-50`），卡片均为白色圆角卡片，统一浅色主题。
- 页面整体不出现深色/暗色模式。

---

## 2. 筛选栏

### 2.1 展开 / 收起

| 状态 | 表现 |
|------|------|
| **展开**（默认） | 显示完整筛选表单，顶部展示右箭头朝下图标（旋转 180°） |
| **收起** | 隐藏表单，在标题行右侧以 Pill 形式展示已选筛选条件摘要；无条件时显示"No filters applied" |

点击筛选栏任意标题行区域均可触发展开/收起切换。

若存在已激活筛选条件，标题行左侧显示 **绿色数字徽标**，数值为非空筛选项数量。

### 2.2 筛选字段

| 字段 | 类型 | 说明 |
|------|------|------|
| Feature Source | 文本输入（模糊搜索） | 匹配 Feature Source 名称 |
| Source Type | 单选下拉 | 枚举值见 §11 |
| Region | 单选下拉 | 枚举值见 §11 |
| Creator | 文本输入（模糊搜索） | 匹配创建人邮箱 |

### 2.3 操作按钮

| 按钮 | 行为 |
|------|------|
| **Reset** | 清空所有筛选字段至默认空值 |
| **Search** | 按当前筛选条件过滤一级列表（前端过滤） |

---

## 3. 一级列表表格

### 3.1 表格列定义

| # | 列名 | 内容说明 |
|---|------|----------|
| 1 | —（展开列） | 展开/收起按钮，控制二级子表显示 |
| 2 | Feature Source | 等宽字体（monospace）展示 |
| 3 | Source Type | 带图标的文字标签（HBase/gRPC/Redis/GraphDB） |
| 4 | Data Latency | 纯文字（Online / Nearline / Offline） |
| 5 | Region | 彩色 Tag，颜色由对应子行状态决定（见 §3.2） |
| 6 | Creator | 邮箱地址，超长截断 |
| 7 | CreateTime | 格式：`YYYY-MM-DD HH:mm` |
| 8 | Description | 超长截断，鼠标 hover 显示完整文本（title tooltip） |
| 9 | Action | `Add` \| `Test` \| `Delete` |

### 3.2 Region Tag 颜色规则

Region Tag 的颜色由该 Region 对应二级子行的 **Status** 字段动态决定：

| 子行 Status | Tag 颜色 |
|------------|----------|
| ENABLE（ONLINE） | 绿色（`emerald`） |
| DISABLE（OFFLINE） | 红色（`red`） |
| DRAFT | 灰色（`slate`） |

同一一级行可包含多个 Region，每个 Tag 独立着色。

### 3.3 行展开 / 收起

- 点击 **展开按钮**（左侧 `+`/`-` 图标按钮）或点击 **整行** 均可切换展开状态。
- 展开时，行背景变为浅青色（`teal-50/30`），按钮变为实色绿底白图标（`-`）。
- 若该行无子行数据，展开按钮不可点击（灰色占位）。

### 3.4 Action 列操作

| 操作 | 触发条件 | 行为 |
|------|----------|------|
| **Add** | 始终可用 | 打开快速新增弹窗（Feature Source、Source Type、Data Latency 预填并锁定，见 §7.2） |
| **Test** | 始终可用 | 打开 Test 弹窗（见 §8） |
| **Delete** | 始终可用 | 点击时校验所有二级 Region Config 的 Status：若存在任一 **ENABLE（ONLINE）** 状态的 Region，弹出 Warning 告警弹窗（见 §9.1）阻止删除并提示"需先将所有 Region Config 置为 OFFLINE 或 DRAFT 后才可删除"；若均为 DRAFT/DISABLE 则弹出 PopConfirm 二次确认后删除 |

---

## 4. 二级嵌套子表

### 4.1 表格列定义

| # | 列名 | 内容说明 |
|---|------|----------|
| 1 | Region | 纯文字 |
| 2 | Call Function | Pill 标签 + hover 展示 JSON 详情卡片（见 §4.2） |
| 3 | Input Params | 多个绿色 Tag（`teal`），超出显示 `+N` 标签 |
| 4 | Output Params | 多个绿色 Tag |
| 5 | Status | 状态徽标（见 §5） |
| 6 | UpdateTime | 格式：`YYYY-MM-DD HH:mm` |
| 7 | Action | `Edit` \| `Copy` \| `Manage ▾` |

子表整体带圆角边框，行交替灰白底色，hover 变浅青色。

### 4.2 Call Function 悬浮详情卡片

- 每行 Call Function 列展示一个 **Pill 标签**，文字内容由父级 Source Type 映射决定：

  | Source Type | Pill 显示文字 |
  |-------------|--------------|
  | HBase | `HBaseCall` |
  | gRPC | `grpcCall` |
  | Redis | `RedisCall` |
  | GraphDB | `NebulaCall` |
  | MySQL | `MysqlCall` |
  | Kafka | `KafkaCall` |

- Pill 标签右侧有 **ⓘ 图标**，鼠标 hover Pill 区域时：
  - 以 `position: fixed + getBoundingClientRect()` 定位弹出悬浮卡片（避免被 `overflow: hidden` 截断）。
  - 卡片内展示格式化的 JSON 内容（字段：`table_name`、`qualifier`、`row_missing_value`、`value_missing_value`、`output_values`）。
  - 若 JSON 解析失败，显示原始文本并附红色警告提示"⚠ Not valid JSON"。
  - 鼠标离开区域后卡片自动消失。

### 4.3 Action 列

| 操作 | 行为 |
|------|------|
| **Edit** | 打开编辑弹窗（部分字段预填 + 锁定，见 §7.3） |
| **Copy** | 打开复制弹窗（Region 字段留空，其余预填，见 §7.4） |
| **Manage ▾** | 展开 Manage 下拉菜单（见 §6） |

---

## 5. 状态机

> **Source of Truth**：以《产品原型图》§3.1.0 为准。

```
  ┌──── edit & save ────┐
  ▼                     │
DRAFT ── Test & Enable ──► ENABLE
  ▲                          │
  │        Draft             │ Disable
  └──────────── DISABLE ◄────┘

  DRAFT ── Delete ──► (Deleted)
  DISABLE ── Delete ──► (Deleted)
```

| 状态 | 展示文案 | 颜色 |
|------|----------|------|
| DRAFT | DRAFT | 灰色（`slate`） |
| ENABLE | ONLINE | 绿色（`emerald`） |
| DISABLE | OFFLINE | 红色（`red`） |

**状态转换规则：**

| 操作 | 可执行状态 | 目标状态 |
|------|------------|----------|
| Enable | DRAFT | ENABLE |
| Disable | ENABLE | DISABLE |
| Draft | DISABLE | DRAFT |
| Delete | DRAFT 或 DISABLE | 删除（需无下游依赖） |

---

## 6. Manage 下拉操作菜单

### 6.1 渲染机制

- 使用 `position: fixed + getBoundingClientRect()` 渲染，脱离嵌套表格的 `overflow` 限制。
- 点击触发按钮展开菜单；点击按钮以外区域或页面滚动时自动关闭。

### 6.2 菜单头部

展示当前子行的 **Status 徽标**，用于提示当前状态。

### 6.3 操作项说明

#### Enable（启用）

| 属性 | 说明 |
|------|------|
| 可用条件 | 当前状态为 **DRAFT** |
| 不可用表现 | 文字变灰，右侧提示"DRAFT only"，按钮禁用 |
| 执行结果 | 状态变更为 ENABLE，UpdateTime 更新为当前时间 |

#### Disable（下线）

| 属性 | 说明 |
|------|------|
| 可用条件 | 当前状态为 **ENABLE** |
| 不可用表现 | 文字变灰，右侧提示"ENABLE only"，按钮禁用 |
| 执行流程 | 点击后展示 **PopConfirm 二次确认面板**（在同一下拉容器内切换） |

**PopConfirm 内容：**
- 标题：`Confirm Disable?`
- 说明：`{Region} will be set to OFFLINE and become unavailable.`
- 按钮：`Cancel`（取消，回到菜单主视图）| `Disable`（确认执行）
- 确认后：状态变更为 DISABLE，UpdateTime 更新，下拉菜单关闭

#### Draft（回到草稿）

| 属性 | 说明 |
|------|------|
| 可用条件 | 当前状态为 **DISABLE** |
| 不可用表现 | 状态非 DISABLE 时按钮禁用并灰显，提示"DISABLE only" |
| 执行结果 | 状态变更为 DRAFT，UpdateTime 更新为当前时间 |

#### Delete（删除）

| 属性 | 说明 |
|------|------|
| 可用条件 | 当前状态为 **DRAFT** 或 **DISABLE** |
| 不可用表现 | 状态为 ENABLE 时按钮禁用并灰显 |
| 执行流程 | 调用告警弹窗（见 §9.2）检查下游依赖后决定是否允许删除 |

---

## 7. Add / Edit / Copy 表单弹窗

### 7.1 表单字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Feature Source | 文本输入 | ✅ | 不可重复；不可以数字开头；不包含空格 |
| SourceType | 单选下拉 | ✅ | 枚举值见 §11 |
| Region | 单选下拉 | ✅ | 枚举值见 §11 |
| Data Latency | 单选下拉 | ✅ | Online / Nearline / Offline |
| Input Params | 多选下拉 | ❌ | 预设 12 个参数，已选项以青色 Tag 展示，可逐个移除 |
| Call Function | 大文本框 | ❌ | 普通文本域，支持 `resize-y`，无 JSON 格式强制校验；选择 SourceType 后自动填充对应模板 |
| Description | 大文本框 | ❌ | 不支持 resize |

**Input Params 预设参数列表（12 项）：**
`user_id`、`id_card_no`、`platform_user_id`、`merchant_id`、`device_id`、`phone_no`、`account_id`、`order_id`、`session_id`、`loan_id`、`product_id`、`country_code`

### 7.2 Add 模式（全局新增）

- 触发入口：表格右上角 **Add Feature Source** 按钮
- 所有字段均为空白，用户自由填写
- 选择 SourceType 后，Call Function 自动填充该类型的 JSON 模板（可手动修改）
- 提交后在列表末尾新增一条一级行，子行状态默认为 **DRAFT**

### 7.3 Add 模式（行级快速新增）

- 触发入口：一级行 Action 列 **Add** 按钮
- **预填 + 锁定**字段：Feature Source、SourceType、Data Latency
- **可填写**字段：Region、Input Params、Call Function、Description
- 提交后在该一级行下新增一条子行，状态默认为 **DRAFT**

### 7.4 Edit 模式

- 触发入口：子行 Action 列 **Edit** 按钮
- **预填 + 锁定**字段：Feature Source、SourceType、Region、Data Latency
- **可编辑**字段：Input Params、Call Function、Description
- 提交后更新对应子行的 CallFunction 内容和 UpdateTime

### 7.5 Copy 模式

- 触发入口：子行 Action 列 **Copy** 按钮
- **预填 + 锁定**字段：Feature Source、SourceType、Data Latency
- **预填 + 可修改**字段：Input Params、Call Function、Description
- **留空 + 可填写**字段：Region（必须重新选择，避免与源行重复）
- 弹窗 Header 右侧显示 `Copy from {源Region}` 蓝色徽标
- 提交后作为新子行追加至同一一级行下，状态默认为 **DRAFT**

### 7.6 校验规则

| 字段 | 校验规则 | 错误提示 |
|------|----------|----------|
| Feature Source | 不能为空 | "Required" |
| Feature Source | 不能以数字开头 | "Cannot start with a digit" |
| Feature Source | 不能含空格 | "No spaces allowed" |
| SourceType | 不能为空 | "Please select Source Type" |
| Region | 不能为空 | "Please select Region" |
| Data Latency | 不能为空 | "Please select Data Latency" |

- 错误信息显示在对应字段下方（红色小字），字段边框变红。
- 点击 Submit / Save 时统一校验，未通过不关闭弹窗。

### 7.7 弹窗通用交互

- 点击弹窗外蒙层 或 按 `Esc` 键关闭弹窗（不保存）。
- Footer 按钮：`Cancel`（关闭）、`Submit` / `Save`（Add 时为 Submit，Edit 时为 Save）。

---

## 8. Test 弹窗

### 8.1 触发方式

一级表格每行 Action 列点击 **Test** 按钮，打开对应 Feature Source 的 Test 弹窗。

### 8.2 弹窗结构

弹窗宽度：`max-w-4xl`（约 896px），高度最大 88vh，内容区可滚动。

顶部 Tab 切换：**New Test** | **History**

---

### 8.3 New Test Tab

#### 区域选择

- 必填字段，单选下拉，选项来源于当前 Feature Source 的全部子行 Region。
- 选择 Region 后，**Input Params** 和 **Output Params** 区域自动联动填充该子行的参数定义；切换 Region 时清空已填写的值。

#### Set Input Params By JSON

- 点击按钮弹出 **JSON 编辑面板**（浮层，覆盖在弹窗内容上方）。
- 输入合法 JSON 对象后点击 **Apply**，系统将 JSON 的 key-value 批量映射填入 Input Params 对应行的 Value 输入框（仅填充与 Param Name 匹配的 key）。
- JSON 解析失败时不执行填充，仅关闭面板。

#### Params 表格区域（带边框容器）

**Input Params 表格：**

| 列 | 说明 |
|----|------|
| Name | 参数名称（来自子行 inputParams） |
| Type | 固定为 `string` |
| Value | 可编辑文本框 |

**Output Params 表格（分隔线分区）：**

| 列 | 说明 |
|----|------|
| Name | 参数名称（来自子行 outputParams） |
| Type | 按名称推断：含 score / tier / depth / count / status 等关键字为 `int`，其余为 `string` |
| Value | 只读，执行 Test 后由系统填充；执行中显示三点跳动 Loading 动画；未执行时显示"—" |

#### Duration

- 位于 Params 表格下方，红色小字显示本次请求耗时。
- 格式：`Duration: {n} ms`；未执行时显示 `Duration: — ms`。

#### Footer 按钮

| 按钮 | 状态 | 行为 |
|------|------|------|
| **Cancel** | 始终可用 | 关闭弹窗 |
| **Test** | 必须已选 Region，且不在测试中 | 模拟发起测试请求；执行中按钮变为旋转图标 + "Testing..."，禁用 |
| **OK** | 仅在 Duration 有结果后可用 | 关闭弹窗 |

---

### 8.4 History Tab

#### 筛选栏

| 字段 | 类型 | 说明 |
|------|------|------|
| Region | 单选下拉 | 选项来源于当前 Feature Source 子行 |
| Operator | 文本输入 | 模糊匹配操作人 |
| Status | 单选下拉 | Success / Failed |

- **Query** 按钮：应用当前筛选条件刷新列表。
- **Reset** 按钮：清空所有筛选字段并重置列表。

#### 历史记录表格

| 列 | 说明 |
|----|------|
| Region | 灰色圆角 Tag |
| CreateTime | 格式：`YYYY-MM-DD HH:mm:ss.000` |
| Operator | 操作人邮箱 |
| Status | 成功：绿色圆点 + "Success"；失败：红色圆点 + "Failed" |
| Action | `Load` \| `Detail` |

- **Load**：将该记录的 Region 与 Input 参数回填至 New Test Tab，并自动切换到 New Test Tab。
- **Detail**：弹出 **Test Details 面板**（见下）。

#### Test Details 面板

在弹窗内部以浮层方式展示，点击面板外区域或右上角 X 关闭。

| 区块 | 说明 |
|------|------|
| Input | 展示该次测试的入参 JSON，右上角 **Copy** 按钮（点击后文字变为"Copied!"，2 秒后复原） |
| Output | 展示该次测试的出参 JSON，右上角独立 **Copy** 按钮 |

JSON 以 `<pre>` 格式化展示，支持横向滚动，最大高度限制防止撑穿弹窗。

---

## 9. 告警弹窗（Alert Modal）

### 9.1 一级行 Delete 警告

- **触发条件**：点击一级行 Action 列 Delete，且该行存在任一 **ENABLE（ONLINE）** 状态的 Region Config。
- **弹窗类型**：Warning（橙色警告图标）
- **标题**：`Cannot Delete Feature Source`
- **内容**：说明该 Feature Source 仍有 N 个 ONLINE 状态的 Region 配置，需先将所有 Region Config 置为 OFFLINE 或 DRAFT 后才可删除；以列表形式展示各 ONLINE 子行的 Region + Status。
- **关闭方式**：点击"Got it"按钮 / 点击蒙层 / 按 Esc 键。

### 9.2 子行 Delete 错误提示

- **触发条件**：Manage 下拉点击 Delete（当前状态为 DRAFT 或 DISABLE）。
- **弹窗类型**：Error（红色 Trash 图标）
- **标题**：`Cannot Delete Region Config`
- **内容**：说明该 Region 被 N 个下游 Online Feature Group 引用，列出所有依赖 Feature Group 名称（等宽字体），并提示需先移除或迁移依赖后再删除。
- **关闭方式**：点击"Got it"按钮 / 点击蒙层 / 按 Esc 键。

> **说明**：当前实现中所有子行均存在下游依赖（mock 数据），因此 Delete 操作均会触发此弹窗，实际接入接口后按真实依赖关系判断。

---

## 10. 分页器

位于表格卡片底部，左侧展示当前分页摘要，右侧为翻页控件。

### 10.1 分页摘要

格式：`{起始序号}–{结束序号} of {总数} items`

### 10.2 翻页控件

| 控件 | 说明 |
|------|------|
| `⟪`（首页） | 跳转第 1 页，当前为第 1 页时禁用 |
| `‹`（上一页） | 当前为第 1 页时禁用 |
| 页码按钮 | 当前页高亮（青色背景白字），仅展示当前页页码 |
| `›`（下一页） | 当前为最后一页时禁用 |
| `⟫`（末页） | 当前为最后一页时禁用 |
| 每页条数 | 下拉选择：10 / 20 / 50 / 100 条，切换后重置至第 1 页 |

---

## 11. 字段枚举值参考

### Source Type

**MVP（本期）**：

| 值 | 图标 |
|----|------|
| HBase | Database 图标 |
| gRPC | Zap 图标 |
| Redis | Database 图标 |
| GraphDB | Globe 图标 |

**Phase 2 扩展**（本期不在下拉选项中展示）：

| 值 | 图标 |
|----|------|
| MySQL | — |
| Kafka | — |

### Region

`ID` / `TH` / `MX` / `SG` / `PH` / `VN` / `SHOPEE_SG`

### Data Latency

`Online` / `Nearline` / `Offline`

### Data Latency 与 Source Type 对应关系（业务约定）

| Source Type | Data Latency |
|-------------|--------------|
| HBase | Nearline |
| gRPC | Online |
| Redis | Offline |
| GraphDB | Nearline |

> 以上为 mock 数据中的默认映射，表单中 Data Latency 字段在 Add 模式下仍可自由选择。

### Call Function JSON 结构

```json
{
  "table_name": "string",
  "qualifier": "string",
  "row_missing_value": -1,
  "value_missing_value": -1,
  "output_values": ["string"]
}
```

---

## 12. 通用交互规范

### 弹窗关闭

所有弹窗（Form Modal、Test Modal、Alert Modal、Detail Panel、JSON Editor）均支持：
- 点击右上角 **X** 关闭
- 点击弹窗外**蒙层**关闭
- 按 **Esc** 键关闭（嵌套弹窗时仅关闭最顶层）

### 下拉菜单关闭

ManageDropdown 等下拉菜单在以下情况自动关闭：
- 点击触发按钮以外的区域
- 页面发生滚动

### 时间格式

所有 UpdateTime 在执行状态变更操作（Online / Offline / 新增 / 编辑）后，自动更新为**当前系统时间**，格式 `YYYY-MM-DD HH:mm`。

### 空状态

- 筛选后无匹配结果时，子表历史记录表格显示"No records found"居中提示。
- 子行 Input / Output Params 为空时，Test 弹窗对应区域显示"Select a Region to load params"提示。
