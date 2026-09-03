# docs 目录索引

本目录按用途分为五类，区分「调研预留 / 系统架构 / PRD / 前端设计 / 交互原型」。

---

## 1. 调研整理材料（预留）

**路径**：`docs/research/`

竞品调研、技术选型、方案对比等可放入；不驱动产品定稿。详见 [research/README.md](research/README.md)。

| 文件 | 说明 |
|------|------|
| [research/竞品调研_Hopsworks.md](research/竞品调研_Hopsworks.md) | Hopsworks Feature Store 竞品调研（原文摘录 + 链接 + 与架构说明对标） |

---

## 2. 系统架构设计（可编辑）

**路径**：`docs/architecture/`

| 文件 | 说明 |
|------|------|
| [architecture/在线特征平台架构说明.md](architecture/在线特征平台架构说明.md) | 五层（DataSource / FeatureSource / Transformer / FeatureGroup / FeatureMap）、边界、离线宽表与数据流 |

可选：`在线特征平台-架构图.drawio` 与本说明同目录。

---

## 3. PRD / 产品与交付（可编辑）

**路径**：`docs/design/prd/`

| 文件 | 说明 |
|------|------|
| [design/prd/产品与交付示意图.md](design/prd/产品与交付示意图.md) | 产品架构、操作主流程、数据流转、交付与开发预研 |

---

## 4. 前端 / UI·UX 设计描述（可编辑）

**路径**：`docs/design/front-design/`、`docs/design/`

| 文件 | 说明 |
|------|------|
| [design/front-design/产品原型图.md](design/front-design/产品原型图.md) | 页面结构、分模块原型、交互与 Figma 交付约定 |
| [design/widetable-canvas-nodes-revamp.md](design/widetable-canvas-nodes-revamp.md) | WideTable 画布：Data Ingestion / Data Cleaning、Execute Config、DAG 与 Report 弹窗 |

---

## 5. API 规格（OpenAPI）

**路径**：`docs/api/`

| 文件 | 说明 |
|------|------|
| [api/feature-source-api.yaml](api/feature-source-api.yaml) | Feature Source：CRUD、Test、Manage、Region Config |
| [api/transformation-api.yaml](api/transformation-api.yaml) | Transformation：CRUD、Version、Test、Manage |
| [api/feature-group-api.yaml](api/feature-group-api.yaml) | Feature Group：CRUD、Publish、Sync、Config Diff、Serving 画布 |
| [api/widetable-api.yaml](api/widetable-api.yaml) | WideTable：CRUD、Canvas Config、Instance Trigger/Kill、Report |
| [api/feature-map-api.yaml](api/feature-map-api.yaml) | Feature Map：检索、Module 树、Feature Cart |

---

## 6. 前端交互示意（可编辑）

**路径**：`docs/prototype/`

| 文件 | 说明 |
|------|------|
| [prototype/FEATURE_STORE.html](prototype/FEATURE_STORE.html) | 可交互 HTML 原型（浏览器直接打开） |
