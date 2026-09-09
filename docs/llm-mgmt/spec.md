# AI Hub / LLM Mgmt — 领域规则与交互规格

> 来源：线上 LLM Management 实现梳理（2026-09）。原型：`apps/llm-mgmt/`（纯静态）。

## 1. 概念模型

- **LLM 资产（逻辑实体）**：接入平台的每一个大模型服务实例，`Name` 全局唯一。
- 接入三元组：**Provider**（OpenAI / Gemini / Claude / Compass）+ **Model Name**（供应商侧模型标识，如 `Monee/Qwen3-VL-8B-Instruct`）+ **Endpoint**（推理服务地址）+ **API Key**。
- **Region** 枚举：ID / TH / PH / VN / MY / SG / TW / BR（按部署地域隔离接入）。
- **Model Type** 枚举：**Chat**（对话生成）/ **Embedding**（向量化）。
- **可见范围**：Team Access = None (Private) 时仅 Owner 可用；选择 Biz Team 后该团队可用。

## 2. 页面交互（对齐线上截图）

| 区域 | 内容 |
|------|------|
| 筛选栏（可折叠） | Name / Model Name / Model Type / Region；展开：Provider / Team Access；Reset / Query / Collapse∧ |
| 列表 | Name / Model Name / Provider / Model Type（chip：Chat 蓝 · Embedding 紫）/ Owner（多邮箱）/ Team Access（None 显示 Private）/ Region / Endpoint（截断 + tooltip）/ Description（空显示 -）/ Create Time / Update Time / Action（Edit, Delete） |
| 分页 | 1-10 of N items + 页码 + 10 / page + **Go to __ Page** 跳页 |

## 3. Create / Edit LLM Model 弹窗

| 字段 | 必填 | 说明 |
|------|------|------|
| Name | ✅ | 全局唯一（查重校验） |
| Region | ✅ | 8 地区枚举 |
| Provider | ✅ | 4 供应商枚举 |
| Model Type | ✅ | Chat / Embedding |
| Model Name | ✅ | 供应商侧标识 |
| API Key | ✅ | **Edit 时掩码显示（****n）**，未修改则沿用原值 |
| Endpoint | ✅ | URL |
| Need Proxy | — | 开关，Create 默认开 |
| Owner | ✅ | 单选邮箱 chip |
| Team Access | — | 默认 None (Private)，含 ⓘ 帮助与固定提示文案 |
| Description | — | 大文本框 |

按钮：**Cancel / Check / Submit**。
- **Submit** 在必填项未满足或 Name 重复时禁用（置灰）。
- **Check** 在必填项满足后可用：向 Endpoint 发起连通性测试（原型 mock，按钮进入 Checking… 状态后 toast 结果）。

## 4. 待细化问题

- Check 的真实实现口径（连通性 ping vs 鉴权调用 vs 模型探活）。
- API Key 的加密存储与掩码回显策略（原型仅前端掩码）。
- Team Access 多团队共享是否需要（当前单选）。
- 与 Model Platform 的模型卡片关系（LLM 资产是否进 Model Mgmt 统一登记）。
