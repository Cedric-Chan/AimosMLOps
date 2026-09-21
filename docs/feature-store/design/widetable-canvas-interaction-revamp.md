# WideTable 画布：交互 revamp（对齐线上实例页）

> **状态**：已实现（`apps/feature-store/src/app/components/CanvasPage.tsx`）。
> **输入**：线上 WideTable 实例页的 Instance View 截图 + full copied elements（2026-09-16）。

**关联**：节点字段与 DAG 规格见 [`widetable-canvas-nodes-revamp.md`](widetable-canvas-nodes-revamp.md)；产品原型见 [`front-design/产品原型图.md`](front-design/产品原型图.md) §3.5.2。

---

## 1. 为什么要 revamp

线上画布（React Flow + antd）与本地原型（手写 transform + lucide）在**同一件事上有两套做法**，其中三处是明确缺陷：

| 线上观察 | 判定 |
| --------- | ---- |
| 每个节点卡片承载 `Join` / `Columns` 行（线上 `w-[240px]`，一屏 21 节点） | 原型节点只有标题+副标题，**信息密度不足**，一眼看不出拼接口径 |
| 连线 `/` 节点状态用 `Waiting / Runing / Success / Failed` 图例 | 原型用 `Pending`，且**拼写与线上不一致**；线上 `Runing` 本身是漏字母 |
| 尺寸/缩放/工具簇（迷你图、缩放、撤销重做、add/select/hand/layout） | 原型只有缩放 + 迷你图，**无指针模式**，导致只读页也误报「可拖拽」 |

原型自身的两处硬缺陷（非对齐问题，属 bug）：

1. **Instance View 仍可拖动节点** —— 只读页允许改图，语义错误。
2. **实例信息条字段全丢** —— `Trigger / Start / Finish / Duration` 的标签被写成空 `<span>·</span>`，用户只看到一串无名分隔号（见 `CanvasPage.tsx` 旧版 1734–1737 行）。
3. **切换实例不刷新** —— 组件复用时不重读 `initialInstanceId`，URL 变了画面不变。

---

## 2. 本次改动

### 2.1 图规模：从「3 个写死节点」到「任意个 Feature Group」

线上单张 WideTable 可扇入 **19 个 Feature Group**，原型把节点 id 写死为 `B/C/D/E/F`：

- `NodeId` 由 `"B"|"C"|"D"|"E"|"F"` 改为 **`string`**；Feature Group 节点 id 形如 `fg:<name>`。
- 新增 `buildSnapshot()`：**节点坐标、卡片参数、边列表全部派生**，不再手写数组。加一个 FG 不需要动坐标或 DAG。
- 画布尺寸由 `canvasBounds(nodes)` **按节点实际范围推导**，替换固定 `CANVAS_W/CANVAS_H = 1060×520`。
- 布局：≤4 个 FG 单列竖排；更多则自动换行成方阵（19 个 → 5×4）。

### 2.2 节点卡片对齐线上密度

| 项 | 线上 | 本原型实现 |
| --- | ---- | ---------- |
| 宽度 | `240px` | `NODE_W = 240` |
| 标题 | 大写字重（CSS `text-transform:uppercase`） | 标题原文 + `uppercase` 类 |
| 参数行 | `Join: …` / `Columns: …` 灰底行 | 同左，来自 `NodeDef.params` |
| 端口 | 静止隐藏、hover 显形 | `NodePort`，`group-hover/node` 显形；Instance View 不渲染 |
| Frame Table 参数 | `sourceType/tableSchema/tableName` | 由 `frameTable` 快照派生（SQL 源则显示 `sourceType/dataServer`） |
| 卡片高度 | 随参数行数增长 | `nodeHeight(params)` 派生 |

### 2.3 指针模式：修掉「只读页也能拖」

新增工具栏 **Select / Pan**（+ Auto Layout）：

- **Instance View**：强制 `pan`，节点不可拖（只读），拖拽即平移画布。
- **Current Config**：默认 `select`，拖节点改位置；**Alt-拖** 或切到 Pan 平移。
- 底栏提示文案**随模式变化**，不再固定写死的「Right-drag to pan」。
- **Auto Layout**：按 DAG 形状（Frame Table → FG 网格 → Data Ingestion）重排并 `fit`。

### 2.4 实例信息条：补齐字段与进度

- 补齐 **`Trigger / Start / Finish / Duration`** 标签（原来只有分隔号）。
- 新增 **`Stages: N/M done · K failed`** 汇总，来自 `getRunProgress(nodeStatuses)`。
- 图例 **`Pending` → `Waiting`**，对齐线上语义。

### 2.5 节点状态：按图结构推导

旧版把状态写死到 `B/C/D/E/F`。改为按**节点类型**推导（`getMockNodeStatuses(status, nodes)`）：

| 实例状态 | Frame Table | Feature Groups | Data Ingestion |
| -------- | ----------- | -------------- | -------------- |
| SUCCESS | Success | Success | Success |
| FAILED | Success | Success | **Failed** |
| RUNNING | Success | 首个 Cached、其余 Running | Waiting |
| KILLED | Cached | 首个 Failed、其余 Waiting | Waiting |
| QUEUING | Waiting | Waiting | Waiting |

> **FAILED 落在 Data Ingestion**：FG 必须先全部成功，sink 才可能执行，因此「失败在末端」比旧版「失败在 D」更符合真实依赖。

### 2.6 Graph Config + 抽屉 Tab

- **Graph Config**（右上）从死链 `<a>` 变为可用菜单：`Status legend`、`Node parameters` 两个显示开关。
- **Data Ingestion 抽屉**补齐规格要求的 **`Config | Last Instance`** 双 Tab（规格 §4.2）：Last Instance 展示 Status / Instance ID / Start / Finish / Duration / Raw 表名 / Rows / Columns cnt。
- **Last Instance 在 Current Config 下不出现**——没有运行记录就不该给空页签（规格 §1）。
- **Esc** 关闭抽屉与菜单；点击画布空白取消选中。

---

## 3. 验证

| 手段 | 结果 |
| ---- | ---- |
| `pnpm build` | 通过 |
| `node scripts/check-widetable-canvas.mjs` | 通过：节点数/边数/无重叠/包络/源→FG→sink 阅读序/19 FG 换行 |
| ego-browser 截图 | Edit 画布、SUCCESS 实例、FAILED 实例 + Last Instance 抽屉、Graph Config 菜单、19 FG 压测 |
| 拖拽实测 | Instance View 拖动后节点坐标不变；Edit 模式拖动生效；Auto Layout 复位成栅格 |

**脚本**：`apps/feature-store/scripts/check-widetable-canvas.mjs`（esbuild/vite 打包模型后断言几何不变量，覆盖 3 与 19 个 FG 两档）。

---

## 4. 未做（有意）

- **未引入 React Flow**：原型是手写 transform，本次只对齐交互与密度；换库属独立工程，收益不足以顺带做。
- **未实现连线拖拽建图**：DAG 由配置派生（FG → Ingestion 固定扇入），端口仅作可连提示。若后续需要自由连边，再引入真实图库。
- **MiniMap 未支持点击跳转**：线上支持，优先级低于上述缺陷，留待后续。
- **未做撤销/重做**：线上该组按钮本身是 disabled 态，未复刻。
