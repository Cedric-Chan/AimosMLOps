# Model Platform / Model Mgmt — 领域规则与交互规格

> 来源：线上 Model Mgmt 实现梳理（2026-09）。原型：`apps/model-mgmt/`（纯静态）。术语对齐 [model-experiment/GLOSSARY.md](../model-experiment/GLOSSARY.md)：Model（逻辑模型）→ ModelVersion → Build。

## 1. 概念模型

- **模型逻辑实体 = (Name, Version)**，二者组合唯一；这是 Create/Edit 操作的对象。
- 元信息：Region、Product、Biz Team、Owner[]（多选）、Description。
- **Model Status** 两态（原型范围内）：`Deployed`（可 Edit / Build / Deprecate）/ `Deprecate`（仅 View）。
- **View → Build Detail**：展示某个 Build 的部署明细，页面标题为「Model Deployment」——Build 即部署单元，与 Model Deployment 模块上下游衔接。

## 2. 列表页交互

| 区域 | 内容 |
|------|------|
| 筛选栏（可折叠） | Model Name / Version / Region / Biz Team；展开后：Product / Model Status / Owner；Reset / Query / Collapse∧ |
| 工具栏 | Owned by me 勾选（按当前用户过滤）+ Create Model + 刷新/说明/列设置 |
| 列表 | Model Name / Version / Region（彩色圆角 chip：id·ph·mx·sg·th）/ Biz Team / Product / Model Status（Deployed 绿 · Deprecate 红）/ CreateTime / UpdateTime / Owner（多邮箱竖排）/ Action |
| 分页 | 1-10 of N items，10 / page |

**Action 随状态变化**：Deployed → `View｜Edit｜Build｜Deprecate`；Deprecate → 仅 `View`。

## 3. Create / Edit Model 弹窗（逻辑实体元信息）

| 字段 | 必填 | Create | Edit |
|------|------|--------|------|
| Name | ✅ | 输入 | **锁定**（逻辑标识） |
| Version | ✅ | 输入 | **锁定** |
| Region | ✅ | 下拉 | **锁定** |
| Product | ✅ | 输入 | **锁定** |
| Owner | — | 多选邮箱 chips（回车添加 / × 移除） | 可改 |
| Biz Team | ✅ | 下拉，**依赖 Owner：未选 Owner 时禁用**（"Please select owner firstly!"）；可选项由 Owner 所在 Team 推导 | 可改 |
| Description | ✅ | 大文本框 | 可改 |

- 逻辑实体唯一性：Name + Version 组合查重。
- Build：确认后触发部署构建流水线（原型 toast 模拟）；Deprecate：确认后状态翻转为 Deprecate、仅剩 View。

## 4. View — Build Detail（Model Deployment 页）

- 头部：← 返回 + 标题「Model Deployment」。
- **Model Info**：Model Name / Model Version / Region / Biz Team / Owner。
- **Build Info**：Build Version（`{version}.{YYYYMMDD}.1`）、Deployment Status（Online 绿 chip）、Deployment Time、Model Type（FpDataSci）、Source File、Python Release、Operator、Addition Method（Add Via SDK）、Dependencies / Pips（依赖清单 JSON）、Commands、Run Module、Envs、Model S3 Path。
- **Input Parameter**：Name + Data Type 内滚动表格（mock 205 行），底部 `Input Parameter Count:205`，右上 **Copy Setting**（复制参数 JSON 到剪贴板）。
- **Output Parameter**：同结构（prediction / float，Count:1）+ 右下 **Back**。

## 5. 待细化问题

- 新建模型的初始状态（原型给 Deployed；真实领域里新逻辑实体应无 Build，是否引入 `Draft` 态）。
- Owner → Biz Team 推导的真实来源（User 模块的 Team 角色，而非本原型的静态映射）。
- Build 详情与 Model Deployment / Online Runtime 的状态同步口径。
- Deprecate 前置校验（是否要求先下线所有 Online Build）。
