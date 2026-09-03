# Feature WideTable：Figma 导出 vs 产品规格 vs 原型

用于评审：与导出或《产品原型图》不一致处需你确认后再改规格文档或实现。

**参考**

- 导出：[../../prototypes/feature-widetable/](../../prototypes/feature-widetable/)
- 规格：`[front-design/产品原型图.md](front-design/产品原型图.md)` §3.5；画布节点与 Execute Config 以 `[widetable-canvas-nodes-revamp.md](widetable-canvas-nodes-revamp.md)` 为准
- 原型：`[../prototype/FEATURE_STORE.html](../prototype/FEATURE_STORE.html)` `#page-ts-list`

---

## 差异清单


| #   | 主题       | 导出稿（zip）                                                                                                          | 《产品原型图》§3.5                                                                           | 说明与确认项                                                                                       |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A   | **整页壳层** | 独立顶栏 `Feature Store / WideTable` + 标题区副文案                                                                         | 侧栏内嵌列表，未要求独立 breadcrumb 顶栏                                                            | 原型保留全局侧栏+顶栏标题；**不**复刻 zip 全宽顶栏（与 Feature Map 处理一致）                                           |
| B   | **筛选区**  | 「Filters」卡片：NAME / REGION / OWNER / BIZ TEAM；**Query** 才应用；Reset；整块可 Collapse                                     | 检索区字段类似；未强调「Filters」标题条与折叠头                                                           | `#page-ts-list` 对齐 zip：**应用式 Query** + 折叠                                                    |
| C   | **工具栏**  | **Owned by me** 开关、Refresh、Column Settings、**Add WideTable**                                                      | §3.5.1 提右上角 Add、嵌套表；未写 Owned by me / Column Settings                                  | 与导出一致：**Owned by me** 过滤 `cedric.chencan@seamoney.com`；Refresh/Settings 为占位                  |
| D   | **外层列**  | **WIDETABLE NAME、REGION、OWNER、BIZ TEAM、DESCRIPTION、UPDATE TIME、CLEAN CONFIG、ACTION**                              | 列含 WideTable、Region、Owner、Biz Team、UpdateTime；**未单列 Description / CLEAN CONFIG**      | 实现已新增 **CLEAN CONFIG**（TRUE/FALSE）列：标记该 WideTable 是否存在「保存且成功执行过」的 Cleaning Background Task；同时保留 **Description**（截断 + tooltip） |
| E   | **主行操作** | **Edit / Copy / Clean / Delete** 文字按钮                                                                             | **Edit / Add / Delete**（Add = 新增 Instance）                                            | 现已采用 **Edit / Copy / Clean / Delete**；**Add** 入口收敛至工具栏 `+ Add WideTable`；**Clean** 打开 Data Cleaning & Reports 弹窗 |
| F   | **内层表**  | 列 **INSTANCE ID、STATUS、NOTES、CREATE/START/FINISH TIME、DURATION、ROWS/COLS CNT**；操作 **View / Kill / Debug / Task** | **Instance Version**、Status、CreateTime、Creator、**Trigger**、More 等                     | 与实现对齐列名与 **View / Kill / Debug / Task**：**Debug** 仅在 `status === FAILED` 时可点（拉取自动记录的失败原因，右上角浮窗展示，手动关闭）；**Kill** 仅 `RUNNING` 可点；**View** → `goToInstanceCanvas`；**Task** → Task Page |
| G   | **状态枚举** | SUCCESS / FAILED / RUNNING / QUEUING / KILLED                                                                     | 含 DRAFT / READY 等画布状态机                                                                | `QUEUING` 替代旧 `PENDING`，语义为「等待 Spark 队列释放资源后执行」；Mock 数据以 zip 为准；与 §3.5 状态机并集不一致处以 **API 为准** |
| H   | **分页**   | 默认 **pageSize=5**；独立白卡片；`Showing M–N of T`；省略号 + 10/20/50/100                                                     | 未写默认条数                                                                                | 与导出一致默认 **5 条/页**（可改 page size）                                                              |
| I   | **视觉**   | Region **indigo** tag、Biz **purple** tag、Status **圆点胶囊**                                                          | 多为灰色 `tag-gray` / 绿红标签                                                                | 与导出一致用 indigo/purple/状态色                                                                     |
| J   | **画布节点** | Start / Data Sink / End 等（`CanvasPage` 导出）                                                                        | **无 Start**；**Data Ingestion** / **Data Cleaning**；**Execute Config**；DAG 见 revamp 文档 | 实现前以 **规格**为准；导出对齐后改走查                                                                       |


**原型状态**：`#page-ts-list` 已按 zip 做结构与交互还原（嵌入 `wt-json-data`、Query/Reset、Owned by me、展开子表、分页）；与规格冲突项仍以上表为准。《产品原型图》若需统一「Add Instance」与「Copy」命名，可单独修订 §3.5。

---

## 签认（可勾选）

- **A** — 是否保留全局壳层、不加重顶栏
- **B** — Filters 卡片 + Query 应用逻辑
- **C** — Owned by me / 占位按钮
- **D** — Description 列是否写入正式 PRD 表头
- **D** — CLEAN CONFIG 列是否写入正式 PRD 表头
- **E** — 主行 Edit / Copy / Clean / Delete（Add 入口仅工具栏）
- **F** — 内层 View / Kill / Debug / Task 命名；Debug 仅 FAILED 可点
- **G** — `QUEUING` 替代 `PENDING` 的状态命名是否确认
- **H** — 默认每页 5 条
- **I** — Region/Biz/Status 配色