# WideTable 画布：Data Ingestion / Data Cleaning 与 Execute Config 规格

> **状态**：产品规格（阶段 B）。实现见 React 原型 [`prototypes/feature-widetable/`](../../prototypes/feature-widetable/)。  
> **曾用名**：Data Sink → **Data Ingestion**；END → **Data Cleaning**。

**关联**：[产品原型图 §3.5.2](front-design/产品原型图.md)。

### 从列表 Copy 新建画布

- **入口**：WideTable 列表一级 Action **Copy** → **New WideTable** 弹窗（展示 **Copy from {源表名}**，Description 默认 **`Copy from {源表名}`**）→ **To Canvas**。
- **配置**：以源表的 **最新配置 snapshot**（原型中为 `getCanvasSnapshotByRow` mock）预填 **DAG** 与各节点 **Config**；新任务 **尚无实例**，顶栏 **Instance History** 为空。
- **Last Instance**：在 **Current Config** 下，各节点 Drawer 的 **Last Instance** 页签为 **空态**（无运行记录）；与从列表 **View** 进入某实例的只读 Instance View 区分。

---

## 1. 术语与全局规则

| 术语 | 说明 |
|------|------|
| Data Ingestion | 原「Data Sink」；负责 Raw 数据落库与 Raw 侧报告路径回显。 |
| Data Cleaning | 原「END」节点；负责可选清洗（Fillna、Value Mapping）及 Clean 表/报告回显。 |
| Queue Priority | 与旧版「Task Priority」为同一语义；**界面与文档统一使用「Queue Priority」**（Execute Config）。 |
| Report Template | **无前端配置项**；由**后端策略**统一处理，**默认内置模板**执行，**界面不展示**。 |

**画布**：**不再包含 Start 节点**（不展示、不提供添加）。

---

## 2. DAG 与连线

**拓扑（串接）**：

```text
Frame Table ──▶ Feature Group(s) ──▶ Data Ingestion ──▶ Data Cleaning
```

- **Frame Table**：一个 output → 各 **Feature Group** 的 input（可多 FG 并行）。
- **Feature Group**：input 接 Frame Table；**output 仅接 Data Ingestion**。
- **Data Ingestion**：input 接所有 FG 的 output（汇聚）；**output 接 Data Cleaning**。
- **Data Cleaning**：末端节点，仅 **input**（接 Data Ingestion）。

**Data Cleaning 开关关闭时**：**仍保留 Data Cleaning 节点**于画布（占位与连线不变）；任务执行时 **跳过清洗步骤**（不落 Clean 表 / 不执行清洗逻辑，具体以后端为准）。

---

## 3. 顶栏：Execute Config

**位置**：画布顶栏**右上**，在 **Instance History** 与 **Action**（及同区域其它顶栏按钮）之间。

**交互**：点击打开 **Modal**，用于配置**实例级执行参数**（与旧版节点内 Task Priority 分离，统一归集于此）。

| 字段 | 控件 | 选项 / 规则 |
|------|------|----------------|
| Resource | 单选下拉 | **Normal**（默认）、**High** |
| Queue Priority | 单选下拉 | **Low**（默认）、**Medium**、**High** |
| Scheduler | 单选下拉 | **ONCE**（默认）、**Cron** |

- 当 **Scheduler = Cron**：展示 **一行 Cron 表达式输入**；需通过 **语法校验**；校验通过后，在输入框下方 **英文**回显可读说明（示例：`Run at 6:00 am every day`）。

---

## 4. 节点：Data Ingestion（右侧 Drawer）

**结构**：**Tab：Config | Last Instance**。

### 4.1 Config（自上而下）

| 顺序 | 配置项 | 交互 | 说明 |
|------|--------|------|------|
| 1 | Raw Data Result | 文本，置灰只读 | 回显写入的 Raw Data **Hive 表全名**；支持 **Copy** |
| 2 | Date Partition | 文本，置灰只读 | 回显 **Hive 表日期分区名**；仅 View |
| 3 | Raw Data Report | 文本，置灰只读 | 回显 **S3 路径**；支持 **Copy** |

### 4.2 Last Instance

| 展示项 | 说明 |
|--------|------|
| Status | 实例状态 |
| Instance ID | 实例标识 |
| Raw Data 写入的 Hive 表名 | 与执行结果一致 |
| 最终 Raw Data Rows cnt | 行数 |
| 最终 Raw Data Columns cnt | 列数 |
| Data Report 入口 | 点击打开弹窗（见 §6） |

---

## 5. 节点：Data Cleaning（右侧 Drawer）

**结构**：**Tab：Config | Last Instance**。

### 5.1 Config（自上而下）

| 顺序 | 配置项 | 交互 | 说明 |
|------|--------|------|------|
| 1 | Data Cleaning 开关 | Switch，**默认关闭** | 关闭时，下方 2a–4 可整段隐藏 |
| 2a | Fillna 配置区（开关开启后） | 行级增删；每行先选 **Fillna method**（单选），再 **多选 Feature name**（模糊匹配）；**整区可为空** | Feature 选项集：Frame Table + 各 FG 参与拼接后的列/特征并集（与旧规一致） |
| 2b | Value Mapping 配置区（开关开启后） | 行级增删；每行 **单选下拉 Feature name**（模糊匹配）+ 右侧 **SQL 文本**；**放大编辑**组件 | 技术侧等价 Case When / SQL |
| 3 | Clean Data Result | 文本，置灰只读 | Clean Data **Hive 表名**；支持 **Copy** |
| 4 | Clean Data Report | 文本，置灰只读 | **S3 路径**；支持 **Copy** |

**校验**：开关开启时，Fillna / Value Mapping 仍允许全部为空行（无额外必填，与旧版一致）。

### 5.2 Last Instance

| 展示项 | 说明 |
|--------|------|
| Status | |
| Instance ID | |
| Clean Data 写入的 Hive 表名 | |
| 最终 Clean Data Rows cnt | |
| 最终 Clean Data Columns cnt | |
| Clean Data Report 入口 | 弹窗同 §6 |

---

## 6. Data Report / Clean Data Report 弹窗（共用）

点击 **Data Report** 或 **Clean Data Report** 入口后，**弹窗内表格**：

**表头（从左到右）**：

`Column Name` | `Cnt` | `Cnt Uniq` | `Max` | `Min` | `Avg` | `0 cnt` | `null cnt` | `neg cnt`

**能力**：

- **下载结果 CSV**
- **检索**：按 **feature / 列名** 检索

---

## 7. 与旧版 §3.5.2「单 Data Sink 节点」的差异摘要

| 旧版 | 新版 |
|------|------|
| 单节点 Data Sink 含 Raw + Task Priority + Report Template + Data Cleaning | 拆为 **Data Ingestion**（Raw 侧回显）与 **Data Cleaning**（清洗配置 + Clean 侧回显） |
| Task Priority、Report Template 在节点 Config | **Queue Priority** 等在 **Execute Config**；**Report Template** 后端内置、前端不展示 |
| 连线：FG → Data Sink | **FG → Data Ingestion → Data Cleaning** |
| 存在 Start 节点（导出走查） | **移除 Start** |

---

## 8. Instance 生命周期管理

详见 [架构说明 §12](../architecture/在线特征平台架构说明.md)。要点摘要：

- **Re-trigger**：FAILED / KILLED 可手动 Trigger 重新执行；无自动重试。
- **并发**：同一 WideTable 下同一时刻仅允许一个 RUNNING Instance；若已有 RUNNING 则 Trigger 返回 409。
- **删除**：本期不支持单独删除 Instance；仅支持删除整个 WideTable（级联）。
- **结果表**：平台不自动删除 Hive 结果表；Phase 2 可配置 TTL。

---

## 9. API / 枚举（实现依赖）

- **Fillna method** 选项：由**后端枚举**提供（示例：`mean` / `median` / `constant` / `forward_fill` 等），以 API 为准。
- Raw / Clean 表名、S3 路径、实例统计、Report 表格数据：以 **Instance / 报告 API** 返回为准。
- **API 规格**：详见 [`docs/api/widetable-api.yaml`](../api/widetable-api.yaml)。
