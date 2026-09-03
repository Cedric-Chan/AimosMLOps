# 模块清单与设计状态（Module Inventory）

平台每个子模块的现状、来源与待设计事项。调整导航时同步维护本清单（导航配置源在 `assets/shell.js` 的 `NAV`）。

状态说明：✅ 原型已覆盖 ｜ 🟡 Placeholder（占位待设计） ｜ 🔮 Future（预留空槽，暂不设计）

## Online Runtime

| 子模块 | 状态 | 说明 | 待设计事项 |
|--------|------|------|-----------|
| Orches Service | 🟡 | 传统模型实时服务的编排入口 | 服务列表、编排画布、版本与流量治理 |
| LLM Workflow | 🟡 | AI Workflow 编排页 | Workflow 画布、节点配置、调试与发布链路 |
| Agent App | 🔮 | 未来空槽位，承载 Agent 应用 | 待 Agent 应用形态明确后启动 |

## AI Hub

| 子模块 | 状态 | 说明 | 待设计事项 |
|--------|------|------|-----------|
| LLM Mgmt | 🟡 | AI 资产统一管理。线上平台当前为 (new) LLM Management / LLM Model / LLM Provider 三项，目标结构收敛为 LLM Mgmt 一个子模块 | 资产列表、接入表单、供应商配置 |
| Skill Market | 🟡 | Skill 资产市场 | 上架流程、市场列表、使用统计 |
| Knowledge Base | 🟡 | 知识库管理 | 知识库列表、文档导入、索引构建链路 |

## Model Platform

| 子模块 | 状态 | 说明 | 待设计事项 |
|--------|------|------|-----------|
| MLFlow | 🟡 | 连接 DS GitLab 与 Aimos 平台的桥梁（实验产物同步） | 集成架构已定（见 mlflow-integration.md），管理页 UI 待设计 |
| Model Mgmt | 🟡 | 模型逻辑容器列表（Model → ModelVersion → Build） | 列表 / 详情 / 版本与 Build 管理 UI；领域模型见 GLOSSARY.md |
| Model Experiment | ✅ | 原「Model Train」改名；训练任务全生命周期：任务配置 → 调度执行 → Pipeline → 评估 → 归档 → 注册。原型来自 ModelExperiment 仓库 | 原型已对齐 GitPages PRD；持续迭代中 |
| Model Deployment | 🟡 | 部署训练产物（Build）为在线推理服务 | 部署表单、实例列表、发布与回滚 |

## Feature Store

| 子模块 | 状态 | 说明 | 待设计事项 |
|--------|------|------|-----------|
| Data Source | ✅ | 数据源接入与映射（`#/ds`） | — |
| Feature Source | ✅ | 特征源定义（`#/fs`） | — |
| Transformation | ✅ | 特征转换加工（`#/tf`） | — |
| Feature Group | ✅ | 特征包组装与 Train-Serve 双模式（`#/fg`） | — |
| Feature Map | ✅ | 特征检索文档（`#/fm`） | — |
| Entity | 🟡 | 特征实体管理；**原型暂缺独立页面** | Entity 列表与定义表单 |
| Feature Tag | 🟡 | 特征标签管理；**原型暂缺独立页面**（现内嵌于 Feature Map 过滤面板，数据见原型 tagCatalog） | 独立标签管理页 |
| Wide Table | ✅ | 离线宽表画布（`#/wt`） | — |
| Architecture | 🟡 | 入口在页面左下角页脚（不在导航组内）；原 /arch 原型资产已下线 | 待填充：新架构图、数据流说明 |

## Console / Background Task

| 子模块 | 状态 | 说明 | 待设计事项 |
|--------|------|------|-----------|
| User | ✅ | 用户管理中心：多 Biz Team 归属，Team 内单角色（VIEWER/EDITOR/ADMIN），按 Email + Biz Team 聚合展示，superadmin 经 Team Dir 管理 Team 目录。原型 `apps/user-mgmt/`，规格见 [user-mgmt/spec.md](../user-mgmt/spec.md) | 非 superadmin 可见范围、Team ADMIN 权限边界待与工程确认 |
| Alert Group | ✅ | 告警接收组管理：Name（唯一）/ Type（SeaTalk）/ Webhook；Verify 向 webhook 发送测试消息（原型为动效演示）。原型 `apps/alert-group/` | 待确认：Type 扩展（Lark / 钉钉等）、Delete 对已引用告警的级联策略 |
| Background Task | 🟡 | 独立顶级模块；后台异步任务查询与管理 | 任务列表、重试 / 终止操作 |
| ~~Udf~~ | — | 暂不纳入（线上平台存在，本 demo 排除） | — |

## 设计流程约定

1. Placeholder → 启动设计时：在本文件补「待设计事项」为具体 PRD 链接，并在 `assets/shell.js` 将该项替换/追加为 `iframe` 类型挂接原型。
2. 原型开发在 `apps/<module>/` 进行；推送到 `main` 自动发布 Pages。
3. 模块级 PRD / 交互规格放 `docs/<module>/design/`。
