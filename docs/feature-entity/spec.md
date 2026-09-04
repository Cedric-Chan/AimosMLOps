# Console → Feature Store / Feature Entity — 领域规则与交互规格

> 来源：线上 Entity Mgmt 实现梳理 + 实体/特征概念模型讨论（2026-09）。原型：`apps/feature-entity/`（纯静态）。

## 1. 概念模型（PM 定义）

- **实体（Entity）** = 万事万物的唯一实体说明，避免混用和歧义。Entity 名是全局唯一标识。
- **特征（Feature）** = 描述实体的客观度量：
  - 属性信息 → **维度**（如 device_id、app_id）
  - 统计信息 → **指标**（如近 30 天登录次数）
- **多实体特征** = 描述实体与实体之间的关系（如 device_fingerprint ↔ user_id 的关联强度）。

## 2. 现状与定位

- 线上当前用法较为单一：仅用于 **FG 注册** 与 **Orches Service 链路 Start 节点的 auto complete**。
- 未来定位：**特征实体的统一治理入口**——实体的唯一性、命名规范、引用关系都在这里管理。

## 3. 页面交互（对齐线上截图）

| 区域 | 内容 |
|------|------|
| 筛选栏 | Entity（模糊匹配）+ Reset / Query |
| 列表 | Entity / Description / Update Time / Action（Edit, Delete）；Update Time 为 ISO UTC 格式 |
| 分页 | 1-10 of N items，10 / page |
| Add Entity | * Entity（输入，必填）+ * Description（大文本框，必填） |

## 4. 校验规则

- Entity 全局唯一（忽略大小写）——重复即「混用/歧义」，阻止提交。
- Description 必填：没有说明的实体不具备「唯一说明」的治理价值。
- Delete：确认弹窗提示需先解除 Feature Group / Service 的引用（原型不做引用校验）。

## 5. 待细化问题

- Entity 命名规范是否强制 snake_case（线上数据基本遵循，但未见强制）。
- 实体与 Feature Map 特征的挂载关系是否要在本页展示（反向引用列表）。
- 多实体特征（关系）的建模是否引入显式的「关系实体」或保留隐式多 entity 标注。
