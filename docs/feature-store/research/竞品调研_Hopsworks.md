# 竞品调研：Hopsworks 特征平台（Feature Store）

**文档性质**：调研整理，不驱动产品定稿。产品与架构以 [在线特征平台架构说明.md](../architecture/在线特征平台架构说明.md) 及 `docs/design/` 为准。

**官方文档入口**：[Hopsworks Platform](https://docs.hopsworks.ai/latest/concepts/hopsworks/) | [Feature Store Architecture](https://docs.hopsworks.ai/latest/concepts/fs/)

正文引用采用 **原文（英）** + **中译**；链接仍指向官方页面。

---

## 1. 平台总览（模块化 MLOps）

**原文**：

> Hopsworks is a **modular** MLOps platform with:
>
> - a feature store (available as standalone)
> - model registry and model serving based on KServe
> - vector database based on OpenSearch
> - a data science and data engineering platform

> Hopsworks was the first open-source and first enterprise feature store for ML. You can use Hopsworks as a **standalone feature store** with the **HSFS API**.

**中译**：Hopsworks 是**模块化**的 MLOps 平台，包含：可独立使用的特征库、基于 KServe 的模型注册与服务、基于 OpenSearch 的向量数据库、以及数据科学与数据工程平台。Hopsworks 是较早的开源与企业级 ML 特征库之一；可通过 **HSFS API** 将 Hopsworks 作为**独立特征库**使用。

**Governance（与资产目录相关）**

**原文**：

> Hopsworks provides a **data-mesh architecture** for managing ML assets and teams, with multi-tenant **projects**. Not unlike a GitHub repository, a project is a sandbox containing team members, data, and ML assets. In Hopsworks, **all ML assets (features, models, training data) are versioned, taggable, lineage-tracked, and support free-text search**. Data can be also be securely shared between projects.

**中译**：Hopsworks 以**数据网格架构**管理 ML 资产与团队，采用多租户 **Project**。Project 类似 GitHub 仓库，是包含成员、数据与 ML 资产的沙箱。平台内**特征、模型、训练数据等 ML 资产均可版本化、打标签、做血缘并可全文检索**；数据也可在项目间安全共享。

- 参考：[Hopsworks Platform](https://docs.hopsworks.ai/latest/concepts/hopsworks/)

---

## 2. Feature Store 总架构与 HSFS API

**原文**：

> The Hopsworks Feature Store provides the **HSFS API** to enable clients to **write features to feature groups** in the feature store, and to **read features from feature views** — either through a **low latency Online API** to retrieve pre-computed features for operational models or through a **high throughput, latency insensitive Offline API**, used to create training data and to retrieve batch data for scoring.

**中译**：Hopsworks 特征库通过 **HSFS API** 让客户端向特征库中的 **Feature Group 写入特征**，并从 **Feature View 读取特征**——要么通过**低延迟 Online API** 取预计算特征供线上模型使用，要么通过**高吞吐、对延迟不敏感的 Offline API** 生成训练数据或取批打分数据。

**HSFS 帮助解决的问题（原文列表）**

**原文**：

> - point-in-time JOINs of features to create training data with **no data leakage**
> - **consistent features for training and serving**
> - centralized, secure access to features
> - use of external tables as features
> - easier connection and backfilling of features from external data sources
> - transparent computation of statistics and usage data for features

**中译**：

- 对特征做 **point-in-time JOIN** 生成训练数据，**无数据泄露**
- **训练与服务侧特征一致**
- 对特征的集中、安全访问
- 将外部表作为特征使用
- 更易连接外部数据源并回填特征
- 透明计算特征的统计与使用数据

**写 FG、读 FV**

**原文**：

> You **write to feature groups** with a feature pipeline program. The program can be written in **Python, Spark, Flink, or SQL**.
>
> You **read from views** on top of the feature groups, called **feature views**. That is, a feature view **does not store feature data**, but is a **logical grouping of features**.

**中译**：通过特征管道程序**写入 Feature Group**，管道可用 **Python、Spark、Flink 或 SQL** 编写。在 Feature Group 之上通过 **Feature View** **读取**；Feature View **不存储特征数据**，只是特征的**逻辑分组**。

- 参考：[Architecture (What is Hopsworks Feature Store)](https://docs.hopsworks.ai/latest/concepts/fs/)

---

## 3. Feature Group：离线存储、在线存储与表模型

### 3.1 特征与 Feature Group 定义

**原文**：

> As a programmer, you can consider a **feature**, in machine learning, to be a **variable associated with some entity** that contains a value that is useful for helping train a model to solve a prediction problem.

> A **feature group** is a **table of features**, where each feature group has a **primary key**, and optionally an **event_time** column (indicating when the features in that row were observed), and a **partition key**.

**中译**：在机器学习中，**特征**可理解为与某**实体相关联的变量**，其取值有助于训练模型完成预测任务。**特征组（Feature Group）**是**特征表**，每张表有**主键**，可选 **event_time**（该行特征被观测的时间），以及**分区键**。

### 3.2 Online Storage

**原文**：

> The **online store** stores **only the latest values** of features for a feature group. It is used to **serve pre-computed features to models at runtime**.

**中译**：**在线存储**仅保存该特征组的特征**最新值**，用于在**运行时向模型提供预计算特征**。

### 3.3 Offline Storage

**原文**：

> The **offline store** stores the **historical values** of features for a feature group so that it may store much more data than the online store. Offline feature groups are used, typically, to **create training data** for models, but also to **retrieve data for batch scoring** of models.

> In most cases, offline data is stored in Hopsworks, but through the implementation of **data sources**, it can reside in an **external file system**. The externally stored data can be managed by Hopsworks by defining ordinary feature groups or it can be used for **reading only** by defining [External Feature Group](https://docs.hopsworks.ai/latest/concepts/fs/feature_group/external_fg/).

**中译**：**离线存储**保存特征的**历史值**，容量可远大于在线存储；离线特征组通常用于**生成模型训练数据**，也用于**批打分取数**。多数情况下离线数据在 Hopsworks 内；通过 **Data Source** 也可放在**外部文件系统**。外部数据可由 Hopsworks 管理（普通 FG），或通过 [External Feature Group](https://docs.hopsworks.ai/latest/concepts/fs/feature_group/external_fg/) **只读**使用。

- 参考：[Feature Group — Overview](https://docs.hopsworks.ai/latest/concepts/fs/feature_group/fg_overview/)

---

## 4. 写入 Feature Group：Stream / Batch / Connector

官方强调 **write to feature groups, read from feature views**（写入特征组、从特征视图读取）。

### 4.1 Stream API（离在线同步写入）

**原文**：

> The Stream API is the only API for Python and Flink clients, and is the preferred API for Spark, as it **ensures consistent features between offline and online feature stores**. The Stream API first writes data to be ingested to a **Kafka topic**, and then Hopsworks ensures that the data is synchronized to the **Online and Offline Feature Groups** through the **OnlineFS service** and **Hudi DeltaStreamer jobs**, respectively. The data in the feature groups is guaranteed to arrive **at-most-once**, through **idempotent writes** to the online feature group (only the latest values of features are stored there, and duplicates in Kafka only cause idempotent updates) and **duplicate removal by Apache Hudi** for the offline feature group.

**中译**：Stream API 是 Python、Flink 客户端的唯一写入方式，也是 Spark 的推荐方式，因它能**保证离线与在线特征存储中的特征一致**。数据先入 **Kafka**，再由 **OnlineFS** 与 **Hudi DeltaStreamer** 分别同步到**在线与离线特征组**。到达保证 **at-most-once**：在线侧**幂等写入**（仅存最新值，Kafka 重复仅导致幂等更新），离线侧由 **Apache Hudi 去重**。

### 4.2 Batch API

**原文**：

> For very large updates to feature groups, such as when you are **backfilling** large amounts of data to an **offline** feature group, it is often preferential to write **directly to the Hudi tables** in Hopsworks, instead of via Kafka — thus reducing write amplification. **Spark** clients can write directly to Hudi tables…

**中译**：对特征组做**大批量回填**等超大更新时，往往更适合**直接写 Hopsworks 内 Hudi 表**而非经 Kafka，以降低写放大。**Spark** 客户端可直接写 Hudi 表……

### 4.3 Connector API（外部表）

**原文**：

> Hopsworks supports **external tables** as feature groups. You can mount a table from an external database as an offline feature group using the Connector API…

**中译**：Hopsworks 支持将**外部表**挂成特征组；可用 Connector API 把外部库中的表挂载为离线特征组……

- 参考：[Write APIs](https://docs.hopsworks.ai/latest/concepts/fs/feature_group/write_apis/)

---

## 5. Feature View：逻辑视图、Join、衍生（Transformation）

**原文**：

> A **feature view** is a **logical view over (or interface to) a set of features** that may come from **different feature groups**. You create a feature view by **joining together features** from existing feature groups.

**中译**：**Feature View** 是覆盖（或对接）来自**不同 Feature Group** 的特征集合的**逻辑视图**；通过把已有特征组中的特征 **Join** 起来创建。

**Feature View 能力（原文）**

**原文**：

> - the ability to retrieve a feature vector with the **most recent** feature values
> - the ability to **create training data**
> - **transformation functions** that should be applied to specified features **consistently between training and serving**
> - the label for the supervised ML problem

> … a feature in a feature view is not only defined by its data type … but also by its **transformation**.

> … if features are stored **untransformed** in feature groups, they become even more reusable, as **different feature views can apply different transformations** to the same feature.

> … the **same feature view** is used to retrieve feature vectors for operational model that was created with **training data from this feature view**.

**中译**：

- 按**最新**特征值取特征向量
- **生成训练数据**
- 对指定特征在训练与服务间**一致**应用 **transformation functions**
- 监督学习问题的标签

特征视图中的特征不仅由数据类型定义，还由其 **transformation（变换）** 定义。若在特征组中**不落变换**存储特征，则更易复用——**不同 Feature View 可对同一特征应用不同变换**。线上取数与训练使用**同一 Feature View**：用该视图训练出的模型，线上仍用该视图取向量。

- 参考：[Feature View — Overview](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/fv_overview/)

---

## 6. External Feature Group（外部只读、按需 SQL）

**原文**：

> External feature groups are **offline feature groups** where their data is stored in an **external table**. An external table requires a **data source**, defined with the Connector API … An external feature group **doesn't allow for offline data ingestion or modification**; instead, it includes a **user-defined SQL string** for retrieving data. You can also perform SQL operations, including projections, aggregations, and so on. The SQL query is executed **on-demand** when HSFS retrieves data from the external Feature Group, for example, when **creating training data** using features in the external table.

**中译**：External Feature Group 是数据存放在**外部表**的**离线特征组**；外部表需用 Connector API 定义 **Data Source**……外部特征组**不允许向离线侧摄入或修改数据**；代之以用户定义的 **SQL** 拉数，可做投影、聚合等。HSFS 从外部特征组取数时**按需执行** SQL，例如在**用外部表特征创建训练数据**时。

- 参考：[External Feature Groups](https://docs.hopsworks.ai/latest/concepts/fs/feature_group/external_fg/)

---

## 7. Spine Group（训练实体 + event_time，不物化）

**原文**：

> Often times, however, it is more convenient to provide the **training events or entities in a Dataframe** when reading feature data from the feature store through a feature view. We call such a Dataframe a **Spine** as it is the structure around which the training data or batch data is built.

> The spine Dataframe together with this additional metadata (which columns define the **primary key**, and which column indicates the **event time** at which the label was valid) is what we call a **Spine Group**.

> A Spine Group **does not materialize any data** to the feature store itself, and always needs to be provided when retrieving features from the [offline API](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/offline_api/).

**中译**：通过 Feature View 读特征时，用 **DataFrame 提供训练事件或实体**往往更方便；该 DataFrame 称为 **Spine（脊柱）**，训练数据或批数据围绕其构建。Spine DataFrame 加上**哪列是主键、哪列是标签有效的 event time** 等元数据，即 **Spine Group**。Spine Group **不向特征库物化任何数据**，通过 [offline API](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/offline_api/) 取特征时必须提供。

- 参考：[Spine Group](https://docs.hopsworks.ai/latest/concepts/fs/feature_group/spine_group/)

---

## 8. 离在线一致性、Point-in-Time、Training/Serving Skew

### 8.1 架构层表述

HSFS 明确列出 **consistent features for training and serving**（训练与服务特征一致）与 **point-in-time JOINs**（见 §2 中译）。

### 8.2 写入路径一致（Stream API）

见 §4.1：**保证离线与在线特征存储一致**（ensures consistent features between offline and online feature stores），Kafka → OnlineFS + Hudi。

### 8.3 Point-in-time Correct Training Data

**原文**：

> When you create training data from features in **different feature groups**, it is possible that the feature groups are updated at **different cadences** … It is very complex to write code that joins features together … and ensures there is **no data leakage** in the resultant training data. **HSFS hides this complexity** by performing the **point-in-time JOIN transparently** …

> HSFS uses the **event_time** columns on both feature groups to determine the **most recent (but not newer)** feature values that are joined together with the feature values from the feature group **containing the label**. That is, the features in the feature group containing the label are the **observation times** for the features in the resulting training data, and we want feature values from the other feature groups that have the most recent timestamps, **but not newer** than the timestamp in the label-containing feature group.

**中译**：多个**特征组更新节奏不同**时，手写 Join 并保证结果**无数据泄露**很复杂。**HSFS 透明执行 point-in-time JOIN** 隐藏该复杂度……HSFS 用各特征组的 **event_time** 决定与**含标签的特征组**拼接时，取**最近但不超过**标签侧时间戳的特征值：含标签组提供结果训练数据的**观测时刻**，其他组取**不晚于**该时刻的最新特征。

**Spine 与 label 更新节奏导致的偏差**

**原文**：

> When using feature groups also to save labels/prediction targets, it can happen that you end up with the **same entity multiple times** in the training dataset depending on the cadence at which the label group was updated … This can lead to **bias** in the training dataset … users can either **narrow down the event time interval** … or use a **spine** in order to **precisely define the entities** to be included in the training dataset.

**中译**：若用特征组存标签/预测目标，按标签组更新节奏，训练集中可能出现**同一实体多行**，带来**偏差**。用户可**缩小 event_time 区间**，或使用 **spine** **精确定义**纳入训练的实体。

- 参考：[Offline API — Point-in-time Correct Training Data / Spine Groups](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/offline_api/)

### 8.4 Online API：最新值与 passed_features

**原文**：

> The Feature View provides an Online API to return … containing the **latest feature values**.

> Some features will be provided by the client … We call these **'passed' features** … they can also be transformed by the HSFS client in … `feature_view.get_feature_vector(entry, passed_features={...})`

**中译**：Feature View 的 Online API 返回……含**最新特征值**。部分特征由客户端传入，称为 **passed features（传入特征）**，也可在 `feature_view.get_feature_vector(entry, passed_features={...})` 中由 HSFS 客户端做变换。

- 参考：[Online API](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/online_api/)

### 8.5 Consistent Transformations（防 Training/Serving Skew）

**原文**：

> It is crucial that the transformations performed when creating features (for training or serving) are **consistent** - use the **same code** - to avoid **training/serving skew**.

**中译**：训练与服务侧生成特征时的变换必须**一致**（**同一套代码**），以避免 **training/serving skew（训练/服务skew）**。

文档给出 **3 种**路径（节选，条目已为中文概括）：

1. **模型内预处理层**（如 Keras/TF，状态随模型保存）
2. **Sklearn/TF/PyTorch 变换管道** + **Model Registry** 版本化
3. **HSFS 内 Python UDF**：附在 Feature View 特征上；生成训练数据或 Online 取向量时由 HSFS 应用；训练大批量可在 Spark 上跑 Python UDF。

> **Note**：官方「Consistent Transformations」主题与 [training_inference_pipelines](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/training_inference_pipelines/) 为同一文档（旧路径 `consistent_transformations` 可能已合并）。

- 参考：[Consistent Transformations / Training & Inference Pipelines](https://docs.hopsworks.ai/latest/concepts/fs/feature_view/training_inference_pipelines/)

---

## 9. 与内部「在线特征平台」架构对标

内部基准文档：[在线特征平台架构说明.md](../architecture/在线特征平台架构说明.md)（FeatureSource、Transformer、FeatureGroup、FeatureMap；FG 层保障离在线一致性；离线宽表 Smart Join + Key Table）。

| 内部概念 / 能力 | Hopsworks 近似概念 | 同 / 异 |
|-----------------|-------------------|---------|
| **FeatureGroup**（1 FS + 1 Transformer，**只读注册**，上游管道写入） | **Feature Group**（平台内 **Stream/Batch 写入**）+ **External FG**（外部表、只读、按需 SQL） | **差异大**：内部 FG 不承接平台内批量写入；Hopsworks 以 FG 为写入单元，外部表用 External FG 对齐「只读外部特征」 |
| **FeatureSource + Transformer** | FG 内数据由 **Feature Pipeline** 写入；FV 上 **Transformation Functions（Python UDF）** | 内部取数+变换分层；Hopsworks 变换多在 **FV** 或模型/管道侧 |
| **FeatureMap**（检索、Cart、同步 FG） | **Governance**：Project、versioned、search、lineage | 均有「可发现资产」；Hopsworks 强调 **多租户 Project** 与跨项目共享 |
| **Offline**：Hive 历史；**Online**：HBase/Redis 等最新 | **Offline store** / **Online store**（per Feature Group） | **语义对齐**：离线历史、在线最新 |
| **Smart Join + event_time + Key Table（Spine）** | **Point-in-time JOIN** + **event_time** + **Spine Group** | **强对齐**：防泄露、左表实体+时间语义 |
| **同一 Transformer Version 防 skew** | HSFS UDF / 模型预处理 / Registry 管道 | **目标一致**；Hopsworks **多条实现路径**，内部明确 **绑定单一 Transformer 版本** |
| **Feature Cart → 离线宽表画布** | **Feature View** 多 FG Join → **Training Data（Offline API）** | **场景对齐**：多源组合训练数据；内部产品化为画布，Hopsworks 以 **API/HSFS** 为主 |

---

## 10. 扩展阅读（官方子页，正文未展开）

| 主题 | 文档线索 |
|------|----------|
| Feature Group 创建 / External 创建 | [Create Feature Group](https://docs.hopsworks.ai/latest/user_guides/fs/feature_group/create/) · [Create External](https://docs.hopsworks.ai/latest/user_guides/fs/feature_group/create_external/) |
| Feature View — Training data / Batch / Query | [Feature View User Guides](https://docs.hopsworks.ai/latest/user_guides/fs/feature_view/) |
| Transformation Functions（用户指南） | [Transformation Functions](https://docs.hopsworks.ai/latest/user_guides/fs/transformation_functions/) |
| On-Demand Feature / Data Validation / Feature Monitoring | [Concepts → Feature Store 目录树](https://docs.hopsworks.ai/latest/concepts/hopsworks/) |
| Data Source（JDBC、Snowflake、Kafka、S3 等） | [Data Source — Configuration](https://docs.hopsworks.ai/latest/user_guides/fs/data_source/) |

---

*调研整理：基于 docs.hopsworks.ai `latest` 概念页；**引用段落下附官方原文与中文译文**，细节以实现版本为准。*
