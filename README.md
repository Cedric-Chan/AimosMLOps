# Aimos MLOps — 通用风控模型平台（Monee）Full Picture

Aimos 平台（Monee 通用风控模型平台）的**平台级统一设计仓库**：覆盖 模型训练 + 模型部署 + 在线服务 + AI 服务 的完整架构、文档与交互原型。本仓库是后续平台迭代设计的**唯一维护入口**。

> 历史仓库 [FeatureStore](https://github.com/Cedric-Chan/FeatureStore) 与 [ModelExperiment](https://github.com/Cedric-Chan/ModelExperiment) 已停止维护，其文档与原型已整合进本仓库（见下方「历史仓库」）。

**线上演示（GitHub Pages）**：<https://cedric-chan.github.io/AimosMLOps/>

---

## 平台导航结构（对齐线上真实平台）

左侧导航分模块展示、二级菜单可折叠：

| 模块 | 子模块 | 现状 | 说明 |
|------|--------|------|------|
| **Online Runtime** | Orches Service | Placeholder | 传统模型实时服务编排 |
| | LLM Workflow | Placeholder | AI Workflow 编排 |
| | Agent App | Future | 未来空槽位，预留 |
| **AI Hub** | LLM Mgmt | Placeholder | AI 资产统一管理（线上为 (new) LLM Management / LLM Model / LLM Provider，目标收敛为此） |
| | Skill Market | Placeholder | Skill 资产市场 |
| | Knowledge Base | Placeholder | 知识库 |
| **Model Platform** | MLFlow | Placeholder | 连接 DS GitLab 与 Aimos 平台的桥梁 |
| | Model Mgmt | Placeholder | 模型逻辑容器（Model / ModelVersion / Build）列表 |
| | Model Experiment | ✅ 原型已覆盖 | 原 Model Train 改名；训练任务全生命周期（来自 ModelExperiment 仓库） |
| | Model Deployment | Placeholder | 部署训练产物为在线服务 |
| **Feature Store** | Data Source | ✅ 原型已覆盖 | 数据源接入与映射 |
| | Feature Source | ✅ 原型已覆盖 | 特征源定义 |
| | Transformation | ✅ 原型已覆盖 | 特征转换加工 |
| | Feature Group | ✅ 原型已覆盖 | 特征包组装与在线/离线 Serving |
| | Feature Map | ✅ 原型已覆盖 | 特征检索文档 |
| | Feature Entity | Placeholder | 特征实体管理（原型暂缺独立页） |
| | Feature Tag | Placeholder | 特征标签管理（现内嵌于 Feature Map 过滤） |
| | Wide Table | ✅ 原型已覆盖 | 离线宽表画布 |
| | Architecture | 🟡 Placeholder | 入口在页面左下角页脚；原架构图资产已下线，待填充新内容 |
| **Console** | User | ✅ 原型已覆盖 | 多 Biz Team 归属 + Team 内单角色（Viewer/Editor/Admin）+ Team Dir 管理；规格见 docs/user-mgmt/spec.md（Udf 暂不纳入） |
| | Alert Group | ✅ 原型已覆盖 | 告警接收组（Name / Type / Webhook）管理，Verify 发送测试消息动效 |
| **Background Task** | — | Placeholder | 后台任务（独立顶级模块） |

## 平台架构总览

```
  ┌────────────────────────────── AI Hub ──────────────────────────────┐
  │   LLM Mgmt   ·   Skill Market   ·   Knowledge Base                 │
  └──────────────────────────────┬─────────────────────────────────────┘
                                 │ AI 资产
  ┌───────────────┐   ┌──────────▼───────────┐   ┌────────────────────┐
  │  DS GitLab    │──▶│ Model Platform        │──▶│ Online Runtime      │
  │  (算法工程仓)  │   │ MLFlow（同步桥梁）      │   │ Orches Service      │
  └───────────────┘   │ Model Mgmt（逻辑容器）  │   │ LLM Workflow        │
                      │ Model Experiment（训练）│   │ Agent App（预留）    │
                      │ Model Deployment（部署）│   └─────────┬──────────┘
                      └──────────┬───────────┘             │ 业务请求
                                 │ 训练数据                  ▼
                      ┌──────────▼───────────┐   ┌────────────────────┐
                      │ Feature Store         │──▶│  在线推理服务        │
                      │ DS→FS→TF→FG→FM→WT     │   │  （特征检索 Serving） │
                      └──────────────────────┘   └────────────────────┘
  ┌────────────────────────────── Console ─────────────────────────────┐
  │   User · Alert Group        Background Task（独立模块）              │
  └─────────────────────────────────────────────────────────────────────┘
```

- **Model Platform 链路**：DS GitLab（算法工程仓）→ MLFlow（实验产物同步）→ Model Experiment（训练，Ray 执行，产物回传 S3 并注册）→ Model Mgmt（Model / ModelVersion / Build 登记）→ Model Deployment（发布上线）。
- **Feature Store 链路**：DataSource → FeatureSource → Transformation → FeatureGroup（离在线一致性保障层）→ FeatureMap（检索文档）/ Wide Table（离线宽表，Point-in-Time Join）。
- **Online Runtime**：承载传统模型实时服务（Orches Service）、AI Workflow，以及未来的 Agent App。
- 详见 [docs/platform/architecture.md](docs/platform/architecture.md) 与各模块文档索引。

## 仓库结构

```
Aimos MLOps/
├── index.html                     # 平台壳：左侧导航（对齐线上平台）+ 内容区
├── assets/                        # 平台壳样式与导航配置（shell.js 为导航唯一配置源）
├── apps/
│   ├── feature-store/             # Feature Store 原型（Vite + React，来自 FeatureStore 仓库）
│   │                              #   hash 路由：#/ds #/fs #/tf #/fg #/fm #/wt #/arch
│   └── model-experiment/          # Model Experiment 原型（Vite + React，来自 ModelExperiment 仓库）
│   └── user-mgmt/                 # Console / User 原型（纯静态 HTML/CSS/JS，无构建）
│   └── alert-group/               # Console / Alert Group 原型（纯静态，无构建）
├── docs/
│   ├── platform/                  # 平台级文档（架构总览、模块清单）
│   ├── user-mgmt/                 # User 模块领域规则与交互规格
│   ├── feature-store/             # Feature Store 设计文档（架构 / PRD / 前端规格 / API / 调研）
│   └── model-experiment/          # Model Experiment 文档（系统架构 / PRD / 流水线 / 术语表 / API）
└── .github/workflows/
    └── deploy-pages.yml           # 构建两个原型 + 平台壳，发布 GitHub Pages
```

## 如何迭代维护

- **调整导航结构**：只改 `assets/shell.js` 顶部的 `NAV` 配置（新增模块 / 调整占位页描述 / 挂接新原型）。
- **迭代 Feature Store 原型**：改 `apps/feature-store/`（Vite + React），`pnpm install && pnpm dev` 本地开发。
- **迭代 Model Experiment 原型**：改 `apps/model-experiment/`，`npm install && npm run dev`。
- **文档**：平台级放 `docs/platform/`，模块级分别放 `docs/feature-store/`、`docs/model-experiment/`。
- 推送到 `main` 后，Actions 自动构建并发布 Pages（首次需在仓库 Settings → Pages 将 Source 设为 **GitHub Actions**）。

## 历史仓库（已冻结，不再维护）

| 仓库 | 内容去向 |
|------|----------|
| [Cedric-Chan/FeatureStore](https://github.com/Cedric-Chan/FeatureStore) | `prototypes/feature-widetable` → `apps/feature-store`；`docs/` → `docs/feature-store/` |
| [Cedric-Chan/ModelExperiment](https://github.com/Cedric-Chan/ModelExperiment) | `docs/prototype/model-experiment-web` → `apps/model-experiment`；文档 → `docs/model-experiment/` |

原仓库的 GitHub Pages（FeatureStore / ModelExperiment）仍在线但不再更新，请以本仓库 Pages 为准。
