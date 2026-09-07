# Model Platform / Model Deployment — 领域规则与交互规格

> 2026-09-07 随原型 `apps/model-deployment/`（纯静态）建立。上游：Model Mgmt（Build 登记，[model-mgmt/spec.md](../model-mgmt/spec.md)）；下游：Online Runtime / Orches Service（服务治理，待设计）。

## 1. 概念模型

- **部署单元 = (Model Name+Version 的某个 Build, Region, Env)**；一行一个部署实例。Build 即 Model Mgmt 登记的部署产物（`{version}.{YYYYMMDD}.1`）。
- 元信息：DeployType（Epic / K8s / Serverless）、Owner[]、CreateTime / UpdateTime。
- **Deployment Status 状态链**：`Deploying → Deployed / Failed`；`Deployed → Offline`（终态，恢复需重新 Deploy）。Redeploy 是 Failed → Deploying → Deployed 的重发路径。
- 与 Model Mgmt 的边界（对应 architecture.md 模糊点 C-2 的落地口径）：**Model Mgmt 的 Build = 构建产物登记；Model Deployment 的 Deploy = 发布动作**。Model Mgmt Build Detail 页与本项目 View 明细页同构（同一 Build 的两处视图），Deployment Status 的单一事实源在本模块。

## 2. 列表页交互

| 区域 | 内容 |
|------|------|
| 筛选栏（可折叠） | Model Name / Version / Region / DeployType；展开后：Build Version / Status（**多选下拉**，选中显示为 tag）；Reset / Query / Collapse∧ |
| 工具栏 | Owned by me 勾选 + **Deploy** 主按钮 + 刷新 / 说明 |
| 列表 | Model Name / Version / Region（彩色 chip）/ DeployType（pill）/ Build Version / Env / Status（徽章+状态点，Deploying 呼吸动画）/ CreateTime / UpdateTime / Owner（多邮箱竖排）/ Action |
| 分页 | 1-10 of N items，10 / page |

**Action 门控矩阵**（核心规则，`#selftest` 自检覆盖）：

| Status | View | Test Run | Redeploy | Monitor | Logs | Offline |
|--------|------|----------|----------|---------|------|---------|
| Deploying | ✅ | ✅ | 🚫 置灰 | ✅ | ✅ | 🚫 置灰 |
| Deployed | ✅ | ✅ | 🚫 置灰 | ✅ | ✅ | ✅ 红色危险链接 + **popconfirm 二次确认** |
| Failed | ✅ | ✅ | ✅ 可点击重发 | ✅ | ✅ | 🚫 置灰 |
| Offline | ✅ | ✅ | 🚫 置灰 | ✅ | ✅ | 🚫 置灰 |

- **View** → 部署明细页：Model Info（Model Name / Version / Region / Biz Team / Owner）→ Build Info（Build Version / Deployment Status / DeployType / Env / Deployment Time / Model Type / Source File / Python Release / Operator / Addition Method / Dependencies / Pips / Commands / Run Module / Envs / Model S3 Path）→ Input Parameter（205 行 mock + Copy Setting）→ Output Parameter。结构与 Model Mgmt 的 Build Detail 完全同构。
- **Test Run** → 弹窗（参考 Feature Store Transformation Test Modal）：选 Region → Input Params 表格手动输入值（支持 Set Input Params By JSON 批量填充）→ 点击 Test → Output Params 展示 mock 结果（prediction 概率值）+ Duration(ms)。
- **Redeploy**：仅 Failed 可点击；点击后状态流转 Failed → Deploying →（mock 1.8s）→ Deployed。
- **Monitor**：进入外部 Grafana 监控页（整页深色 mock：QPS / P99 / Error Rate / Pods 指标卡、请求率与延迟多序列图、分数分布直方图、Region 服务表），带 Back to Aimos 返回条。
- **Logs**：进入外部日志台（整页深色 mock：服务选择、INFO/WARN/ERROR 级别过滤、关键字过滤、Live tail 视觉），带返回条。
- **Offline**：仅 Deployed 可点击（红色危险链接）；点击弹 **popconfirm 气泡**（非居中弹窗）二次确认「下线后停止在线推理服务，状态转为 Offline」；确认后状态转 Offline。

## 3. Deploy 弹窗（发布入口）

| 字段 | 必填 | 说明 |
|------|------|------|
| Model | ✅ | 下拉选择逻辑实体（Name+Version，来自 Model Mgmt 登记表） |
| Build Version | — | 由所选 Model 自动推导（`{version}.{YYYYMMDD}.1`），只读 |
| Region | ✅ | 跟随 Model 预填，可改 |
| Env | ✅ | prod / staging |
| DeployType | ✅ | Epic / K8s / Serverless |

Submit 后新增一行 Deploying（列表顶部），mock 2.2s 后流转 Deployed。

## 4. 架构对齐与后续

- 本模块补齐 architecture.md 全生命周期缺口 C-1：Build 发布 → 部署实例 → Online Runtime 承载。发布后的服务生命周期（扩缩容 / 流量治理）仍归 Online Runtime（待设计）。
- 监控 / 日志为外部系统（Grafana / 日志台）跳转，原型内置深色整页 mock 示意，真实实现为外链。
- 待细化：DeployType 枚举的真实来源；Offline 前置校验（是否要求 staging 先行）；状态回写 Model Mgmt Build Detail 的同步口径。
