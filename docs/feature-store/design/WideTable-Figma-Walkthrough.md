# WideTable：Figma 导出走查清单

> 2025-03：已在 `[FEATURE_STORE.html](../prototype/FEATURE_STORE.html)` 落地一版与导出稿对齐的 Modals / 列表 / Frame Table 面板与其它节点脚标；后续仍以本表做回归。

**主参考**：[../../prototypes/feature-widetable/](../../prototypes/feature-widetable/)（`AddWideTableModal.tsx`、`WideTableMetaModal.tsx`、`TriggerInstanceModal.tsx`、`WideTableList.tsx`、`CanvasPage.tsx`）。

**冲突规则**：与内部 PRD / 《产品原型图》不一致时，**以导出稿为准**。**例外**：画布节点命名与结构（Data Ingestion / Data Cleaning、Execute Config、移除 Start）以 `[widetable-canvas-nodes-revamp.md](widetable-canvas-nodes-revamp.md)` 与《产品原型图》§3.5.2 为准，导出对齐后再恢复「以导出为准」。

**禁止项**：

- 禁止用 `wtc-pr-row` **只读行**代替节点配置区的**可编辑表单**（只读时间线/实例展示等除外）。
- Frame Table（节点 B）右侧面板字段集合 **不得少于** `CanvasPage.tsx` 中 `FrameTablePanel` 的配置区字段。

---

## 1. 文案与字符串（Modals + 校验）


| 位置                 | 原型（HTML）                                    | 导出稿 | 状态  |
| ------------------ | ------------------------------------------- | --- | --- |
| 新建主按钮              | To Canvas + 箭头 SVG                          | 同左  | 已对齐 |
| 新建副标题              | Fill in metadata — all fields are required. | 同左  | 已对齐 |
| 字段名 WideTable Name | `WideTable Name`                            | 同左  | 已对齐 |
| Region 占位          | Select region...                            | 同左  | 已对齐 |
| Owner 占位           | Select owners… / N owners selected          | 同左  | 已对齐 |
| Biz Team           | `Biz Team` / Select biz team...             | 同左  | 已对齐 |
| 校验文案               | 与 `validate()` 一致                           | 同左  | 已对齐 |
| Meta 标题            | WideTable Meta                              | 同左  | 已对齐 |
| Meta 副标题           | WideTable Name and Region are not editable. | 同左  | 已对齐 |
| Trigger 主按钮        | Zap + Trigger                               | 同左  | 已对齐 |


## 2. WideTable 列表（WideTableList）


| 项                                                                    | 导出稿                                                                                                                                       | 原型  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 表头 WIDETABLE NAME … **CLEAN CONFIG** … ACTION                         | 在 `UPDATE TIME` 与 `ACTION` 之间新增 **CLEAN CONFIG**（TRUE / FALSE）列，标记该 WideTable 是否存在「保存且成功执行过」的 Cleaning Background Task；TRUE 以 `teal-600` mono 展示，FALSE 灰色 | 已对齐 |
| 工具栏 Add WideTable、Owned by me、Refresh、Column Settings                 | 同左                                                                                                                                       | 已对齐 |
| 行操作 **Edit / Copy / Clean / Delete**                                  | 现行为：**Add** 入口收敛至工具栏 `+ Add WideTable`；**Clean** 打开 Data Cleaning & Reports 弹窗（紧凑 Fillna / Value Mapping + Raw / Cleaned Data Report 入口）           | 已对齐 |
| 内层 Action **View / Kill / Debug / Task**                              | **Debug** 在 Kill 与 Task 之间；仅 `status === FAILED` 可点。点击后右上角浮窗（slide-in drawer，~440px × max `calc(100vh-6rem)`）显示自动记录的失败原因，需用户手动关闭             | 已对齐 |
| Instance 状态枚举 `SUCCESS / FAILED / RUNNING / QUEUING / KILLED`         | `QUEUING` 替代旧 `PENDING`，语义为「等待 Spark 队列释放资源后执行」                                                                                            | 已对齐 |


### 2.1 Copy → 快速新建（New WideTable）


| 行为                   | 说明                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Copy**             | 一级 Action **Copy** 打开与「Add WideTable」相同的 **New WideTable** 弹窗，作为快速新建入口。                                                                                                                |
| 提示文案                 | 副标题下展示 `**Copy from {源表 WideTable Name}`**（英文）。                                                                                                                                        |
| Description 默认值      | `**Copy from {源表名}**` 预填，可改。                                                                                                                                                           |
| **To Canvas**        | 按源表 **最新配置 snapshot**（mock：`getCanvasSnapshotByRow`）预填 **DAG 节点位置/标题**、Frame Table / Feature Group / Data Ingestion / Data Cleaning 等与 snapshot 一致的配置；**Instance History 为空**（新画布无实例）。 |
| 节点 **Last Instance** | 在 **Current Config** 下，各节点 Drawer 的 **Last Instance** 页签为 **空态**（无 mock 运行记录）；进入 **Instance View** 后仍可按实例展示（与列表 View 进画布一致）。                                                           |


## 3. Canvas — Frame Table（FrameTablePanel）


| 区块                                     | 导出稿                                       | 状态  |
| -------------------------------------- | ----------------------------------------- | --- |
| Source Type Hive / SQL                 | 双按钮 + 文案 Hive / SQL                       | 已对齐 |
| Data Server、Hive 表字段、SQL 编辑器           | 含行号区、全屏编辑                                 | 已对齐 |
| Columns：idle / parsing / ready / error | 含 Select All、Search columns…              | 已对齐 |
| Entity Column 多选、EventTime Column      | 同左                                        | 已对齐 |
| Custom Filter（Hive，Optional）           | 同左                                        | 已对齐 |
| Config / Last Instance 页签              | 同左                                        | 已对齐 |
| Last Instance 摘要块                      | Status、Instance ID、Data Source、Statistics | 已对齐 |
| 底部提示文案                                 | Node · …                                  | 已对齐 |


## 4. 其他节点面板（CanvasPage 各 Panel）

**实现状态**：`CanvasPage.tsx` 已对齐规格——**无 Start**；**Data Ingestion**、**Data Cleaning**（Config / Last Instance、Report 弹窗）；顶栏 **Execute Config**；连线 **FG → Data Ingestion → Data Cleaning**。字段与交互以 `[widetable-canvas-nodes-revamp.md](widetable-canvas-nodes-revamp.md)` 为准；回归时对照 §4 与本节。

## 5. 回归 grep（每 PR）

- `wtc-pr-row`：仅应出现在只读展示（实例/时间线等），不得作为唯一配置 UI。
- `#tsModalPrimary`：`add` 模式须为 To Canvas，不得为 Confirm。

---

## 签认（可选）

- §1 弹窗（Modals）
- §2 列表（List）
- §3 Frame Table
- §4 其他节点
- §5 Grep / 像素终验