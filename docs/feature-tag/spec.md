# Console → Feature Store / Feature Tag — 领域规则与交互规格

> 来源：线上 Feature Tag 实现梳理 + 与 Feature Map 的联动设计（2026-09）。原型：`apps/feature-tag/`（纯静态）。

## 1. 概念模型

- **二级结构**：Category（一级，如 Biz Term / Remark / format / Calculate）→ Feature Tag（二级，注册在某个 Category 下）。
- 一个 Feature（Feature Map 粒度）可以打 **多个 Tag**（multi tag）；(Category, Tag) 二元组唯一。
- Tag 是特征的横向检索维度：在 Feature Map 里按 facet → tag 过滤。

## 2. 页面交互（对齐线上截图）

| 区域 | 内容 |
|------|------|
| 筛选栏 | Category（模糊）/ Feature Tag（模糊）+ Reset / Query |
| 工具栏 | **Category Dir**（浮窗管理一级目录）+ **Add Tag**；右侧 刷新 / 说明 / 列设置 |
| 列表 | 按 Category 聚合（同 Category 合并单元格）：Category / Feature Tag / Description / Action（Edit, Delete） |
| 分页 | 1-10 of N items，10 / page |

### Category Dir 浮窗（交互同 User 模块 Team Dir）
- 一级 Category 以标签展示，每个可 × 删除；「New Directory」原地变输入框，Enter 确认新增。
- 删除 Category **级联移除其下所有 Tag**（确认弹窗提示受影响数量）。
- 已知线上缺陷：自动创建的 Category 出现 `[New]undefined-17846…` 命名，本原型不复刻，改为强制输入名称。

### Add Feature Tag 弹窗
- \* Category（下拉，来自 Category 目录）；\* Feature Tag（输入，必填）；Description（大文本框，选填）。
- (Category, Tag) 唯一性校验。

## 3. 与 Feature Map 的联动（本原型已实现）

- 注册表通过 **localStorage（`aimos.ft.tags` / `aimos.ft.categories`，同源共享）** 在两个原型间传递：
  - Feature Tag 页面的增删改即时写入注册表；
  - **Feature Map** 的 Tag 检索组件（faceted 过滤面板）和 Feature Detail 的打标签下拉 = 「内置种子目录 ∪ 注册表」，注册表项优先。
- 效果：在 Feature Tag 页新增 Tag → Feature Map 里立刻可以给 Feature 打上该 Tag，并按它检索。
- 真实平台对应关系：FS 原型的内置种子目录（Topic / Sensitivity / Transform / Quality）相当于线上「外部 portal」的既有治理目录，注册表是本模块的增量。

## 4. 待细化问题

- Tag 删除时已打标特征的级联策略（线上：标签失效；是否需要提示受影响 Feature 清单）。
- Category 是否支持多级（当前设计固定两级）。
- Tag 的权限治理（谁可以建 Category / 谁可以打 Tag）。
