# Aimos 平台架构总览（Full Picture）

Aimos 是 Monee 通用风控模型平台：覆盖 **模型训练 + 模型部署 + 在线服务 + AI 服务** 的端到端链路。本文档是平台级架构索引；模块内详细架构见各模块文档。

## 1. 平台模块分层

| 层 | 模块 | 职责 |
|----|------|------|
| AI 服务 | **AI Hub** | AI 资产统一管理：LLM Mgmt / Skill Market / Knowledge Base |
| 在线服务 | **Online Runtime** | 传统模型实时服务（Orches Service）、AI Workflow、预留 Agent App |
| 模型链路 | **Model Platform** | MLFlow（同步桥梁）→ Model Experiment（训练）→ Model Mgmt（登记）→ Model Deployment（上线） |
| 特征链路 | **Feature Store** | DataSource → FeatureSource → Transformation → FeatureGroup → FeatureMap / Wide Table |
| 平台管理 | **Console / Background Task** | 用户、告警组、后台任务等平台治理能力 |

## 2. 端到端数据流

> 交互版架构图（archify 生成，嵌入交互 Demo 左下角 Architecture 入口）：**平台架构总览** 与 **端到端数据流** 两张，规格源与维护约定见 [architecture-diagrams.md](architecture-diagrams.md)。

```
 DS GitLab（算法工程仓）
   │  实验代码 / 配置
   ▼
 MLFlow ──────────────► Model Experiment（训练编排，Ray 集群执行）
 （实验产物同步桥梁）         │  Run SUCCESS → ModelArtifact @ S3
                             ▼
                        Model Mgmt（Model → ModelVersion → Build 登记）
                             │  发布 Build
                             ▼
                        Model Deployment（部署为在线推理服务）
                             │
                             ▼
                        Online Runtime / Orches Service（实时服务治理）◄── 业务请求
                             │
                             │ 特征检索（在线 Serving）
                             ▼
 Feature Store：DataSource → FeatureSource → Transformation → FeatureGroup
                             │                    （离在线一致性由 FG 层保障）
                 ┌───────────┴───────────┐
                 ▼                       ▼
           FeatureMap（特征检索文档）   Wide Table（离线宽表，Point-in-Time Join 供训练取数）
```

关键跨模块关系：

- **MLFlow ↔ Model Experiment**：Experiment / Run / 画布节点执行 1:1 映射为 MLflow Experiment / Parent Run / Nested Run，artifact 统一存 S3。详见 [model-experiment/architecture/mlflow-integration.md](../model-experiment/architecture/mlflow-integration.md)。
- **Model Experiment → Model Mgmt**：训练成功的 Run 产物注册为 Build（Model → ModelVersion → Build 领域模型），见 [model-experiment/GLOSSARY.md](../model-experiment/GLOSSARY.md)。
- **Feature Store → 训练/Serving**：训练侧经 Wide Table 取数（Point-in-Time Join），在线侧经 FeatureGroup Serving 检索；离在线特征一致性（避免 Training/Serving Skew）由 FG 层保障，见 [feature-store/architecture/在线特征平台架构说明.md](../feature-store/architecture/在线特征平台架构说明.md)。
- **Model Deployment → Online Runtime**：部署产物最终以 Orches Service 承载的在线服务对外提供推理。

## 3. 模块现状与设计入口

见 [module-inventory.md](module-inventory.md)：每个子模块的现状（原型已覆盖 / Placeholder / Future）、来源与下一步设计事项。

## 4. 文档索引

| 领域 | 文档 |
|------|------|
| 平台架构交互图册（archify 图 + Pending 确认事项） | [platform/architecture-diagrams.md](architecture-diagrams.md)（源规格 `platform/diagrams/`） |
| Feature Store 五层架构、离在线一致性、宽表 | [feature-store/architecture/在线特征平台架构说明.md](../feature-store/architecture/在线特征平台架构说明.md) |
| Feature Store PRD / 交付示意 | [feature-store/design/prd/产品与交付示意图.md](../feature-store/design/prd/产品与交付示意图.md) |
| Feature Store OpenAPI | [feature-store/api/](../feature-store/api/)（feature-group / feature-map / feature-source / transformation / widetable） |
| Model Experiment 系统架构（Web 后台 / 后端 / Ray / 调度） | [model-experiment/architecture/系统架构说明.md](../model-experiment/architecture/系统架构说明.md) |
| Model Experiment 全量流水线（PRD 级） | [model-experiment/MODEL_PIPELINE.md](../model-experiment/MODEL_PIPELINE.md) |
| Model Experiment 术语表（唯一来源） | [model-experiment/GLOSSARY.md](../model-experiment/GLOSSARY.md) |
| MLflow 集成设计 | [model-experiment/architecture/mlflow-integration.md](../model-experiment/architecture/mlflow-integration.md) |
