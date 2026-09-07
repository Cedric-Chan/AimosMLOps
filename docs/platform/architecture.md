# Aimos 平台架构总览（Full Picture）

Aimos 是 Monee 通用风控模型平台：覆盖 **模型训练 + 模型部署 + 在线服务 + AI 服务** 的端到端链路。本文档是平台级架构索引；模块内详细架构见各模块文档。

## 1. 平台模块分层

| 层 | 模块 | 职责 |
|----|------|------|
| AI 服务 | **AI Hub** | AI 资产统一管理：LLM Mgmt / Skill Market / Knowledge Base |
| 在线服务 | **Online Runtime** | 传统模型实时服务（Orches Service）、AI Workflow、预留 Agent App |
| 模型链路 | **Model Platform** | MLFlow（内部改造嵌入，训练迭代管理）→ Model Experiment（训练）→ Model Mgmt（登记）→ Model Deployment（上线） |
| 特征链路 | **Feature Store** | DataSource → FeatureSource → Transformation → FeatureGroup → FeatureMap / Wide Table |
| 平台管理 | **Console / Background Task** | 用户、告警组、后台任务等平台治理能力 |

## 2. 端到端数据流

> 交互版架构图（archify 生成，嵌入交互 Demo 左下角 Architecture 入口）：**平台架构总览** 与 **端到端数据流** 两张，规格源与维护约定见 [architecture-diagrams.md](architecture-diagrams.md)。

```
 DS GitLab（算法工程仓）
   │  实验代码 / 配置
   ▼
 MLFlow ──────────────► Model Experiment（训练编排，Ray 集群执行）
 （训练迭代管理，               │  Run SUCCESS → ModelArtifact @ S3
  内部改造嵌入的                ▼
  开源 MLflow）           Model Mgmt（Model → ModelVersion → Build 登记）
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

- **MLFlow ↔ Model Experiment**：内部改造嵌入的开源 MLflow（基线 2.21.3），承担训练迭代管理（Tracking + Registry）——Run 对比 / 指标曲线 / Artifact 浏览 / 模型版本 lineage，UI 以平台 MLFlow 页签内嵌。Experiment / Run / 画布节点执行 1:1 映射为 MLflow Experiment / Parent Run / Nested Run，artifact 统一存 S3。官方概念对照与映射细节见 [model-experiment/architecture/mlflow-integration.md](../model-experiment/architecture/mlflow-integration.md)。
- **Model Experiment → Model Mgmt**：训练成功的 Run 产物注册为 Build（Model → ModelVersion → Build 领域模型），见 [model-experiment/GLOSSARY.md](../model-experiment/GLOSSARY.md)。
- **Feature Store → 训练/Serving**：训练侧经 Wide Table 取数（Point-in-Time Join），在线侧经 FeatureGroup Serving 检索；离在线特征一致性（避免 Training/Serving Skew）由 FG 层保障，见 [feature-store/architecture/在线特征平台架构说明.md](../feature-store/architecture/在线特征平台架构说明.md)。
- **Model Deployment → Online Runtime**：部署产物最终以 Orches Service 承载的在线服务对外提供推理。

## 3. 模型全生命周期（状态链与口径索引）

一个模型从实验到下线的完整状态链，以及各阶段状态机的权威文档归属：

```
Experiment（DRAFT → ENABLED ⇄ DISABLED）                    ← 训练编排单元
  └─ Run（QUEUING → RUNNING →〔CHECKING〕→ SUCCESS / FAILED / KILLED）
       └─ SUCCESS → 用户 Review → 注册 Build
            Model（Name+Version 唯一）→ ModelVersion → Build   ← 模型资产登记
            └─ Model Status（Draft → Deployed → Offline）
                 └─ Build 发布 → Model Deployment（部署构建）
                      └─ Online Runtime / Orches Service（Online 服务）
                           └─ 业务请求 → FG Serving 在线特征 + 推理
（监控 / 再训练回流：平台内暂无承载，见下方模糊点 C-4）
```

| 阶段 | 状态机 / 实体 | 权威文档 |
|------|--------------|----------|
| 实验 / 执行 | Experiment 三态、Run 六态、调度与队列 | [model-experiment/GLOSSARY.md](../model-experiment/GLOSSARY.md) |
| MLflow 映射 | Experiment / Run / 节点 ↔ MLflow 实体，Build ↔ Registry 版本 | [model-experiment/architecture/mlflow-integration.md](../model-experiment/architecture/mlflow-integration.md) |
| 模型资产登记 | Model / ModelVersion / Build、Model Status 与 Action 矩阵 | [model-mgmt/spec.md](../model-mgmt/spec.md) |
| 部署上线 | Deployment Status（Deploying → Deployed / Failed → Offline）、Action 门控 | [model-deployment/spec.md](../model-deployment/spec.md)；Build 明细页见 [model-mgmt/spec.md](../model-mgmt/spec.md) §4 |
| 在线服务 | Orches Service 服务生命周期 | 待设计（Placeholder） |

### 全生命周期模糊点（2026-09 review）

跨模块梳理发现的不清晰点，按归属分组；MLflow 相关明细见 mlflow-integration.md §8：

**A. 实体与状态机（model-mgmt / model-experiment）**

已确认（2026-09-07）：Model 状态链为 **Draft → Deployed → Offline**——Draft 为新建初始态，Offline 取代原 Deprecate 命名。按粗粒度三态流转记录，不做逐状态操作矩阵的过度设计（原型 `apps/model-mgmt/` 仍为 Deployed / Deprecate 两态，后续对齐）。

剩余待细化（粗粒度记录，模块设计时再展开）：

1. Build 的 Deployment Status（Online）与 Model Deployment 模块状态的单一事实源归属（两处状态如何同步）。
2. ModelVersion 升级流：何时新建 ModelVersion（架构 / 特征集重构）、注册 Build 时归属版本由谁选择，交互未设计。
3. Offline 前置校验（是否要求先下线所有 Online Build）、FAILED / KILLED Run 重跑口径，模块细化时一并处理。

**B. MLflow 映射（mlflow-integration.md §8）**

Registered Model 命名与 ModelVersion 层级对齐、Registry Alias 与部署联动、数据集血缘 log_input、Logged Models 链路、git 溯源标签、Experiment 生命周期级联、内嵌 UI 权限、内部版功能裁剪。

**C. 跨模块断点（平台级）**

1. ~~Model Deployment 模块未设计~~：原型 `apps/model-deployment/` 已覆盖（部署列表 / Deploy 表单 / Redeploy 重发 / Offline 下线），见 [model-deployment/spec.md](../model-deployment/spec.md)。
2. 两个"Build"动词边界：Model Mgmt 的 Build action（触发部署构建流水线）与 Model Deployment 的"发布 Build"，谁是构建、谁是发布需明确定义；且 Model Mgmt 的 Build Detail 页标题就叫「Model Deployment」，存在认知混淆。
3. Online Runtime / Orches Service 未设计：Build 上线后的服务生命周期（启动 / 扩缩 / 下线）与模型生命周期衔接。
4. 监控与再训练回流缺失：上线后效果监控（AUC 漂移 / PSI）与再训练触发无承载模块，当前生命周期为开环。
5. 特征变更影响传播：FeatureGroup / Transformer 版本变更后，依赖模型的重训 / 重评估提示（FS → Model Platform 断点）。

## 4. 模块现状与设计入口

见 [module-inventory.md](module-inventory.md)：每个子模块的现状（原型已覆盖 / Placeholder / Future）、来源与下一步设计事项。

## 5. 文档索引

| 领域 | 文档 |
|------|------|
| 平台架构交互图册（archify 图 + Pending 确认事项） | [platform/architecture-diagrams.md](architecture-diagrams.md)（源规格 `platform/diagrams/`） |
| Feature Store 五层架构、离在线一致性、宽表 | [feature-store/architecture/在线特征平台架构说明.md](../feature-store/architecture/在线特征平台架构说明.md) |
| Feature Store PRD / 交付示意 | [feature-store/design/prd/产品与交付示意图.md](../feature-store/design/prd/产品与交付示意图.md) |
| Feature Store OpenAPI | [feature-store/api/](../feature-store/api/)（feature-group / feature-map / feature-source / transformation / widetable） |
| Model Experiment 系统架构（Web 后台 / 后端 / Ray / 调度） | [model-experiment/architecture/系统架构说明.md](../model-experiment/architecture/系统架构说明.md) |
| Model Experiment 全量流水线（PRD 级） | [model-experiment/MODEL_PIPELINE.md](../model-experiment/MODEL_PIPELINE.md) |
| Model Experiment 术语表（唯一来源） | [model-experiment/GLOSSARY.md](../model-experiment/GLOSSARY.md) |
| MLflow 集成设计（含官方概念对照） | [model-experiment/architecture/mlflow-integration.md](../model-experiment/architecture/mlflow-integration.md) |
