# 平台架构图册（Architecture Diagrams）

由 [archify](https://github.com/tt-a1i/archify) skill（v2.17）从平台文档梳理生成的交互式架构图，嵌入平台交互 Demo 的 **Architecture 入口**（侧边栏左下角页脚 → `#feature-store/architecture`）。

## 图纸清单

| 图 | 类型 | 源规格（唯一事实源） | 产物 | 内容 |
|----|------|---------------------|------|------|
| Aimos 平台架构总览 | architecture | `docs/platform/diagrams/aimos-platform.architecture.json` | `apps/architecture/platform-architecture.html` | 平台模块组件图：Aimos 平台边界（Web Console / AI Hub / Model Platform 链 / Feature Store / Online Runtime）+ 外部系统（DS GitLab、业务系统）+ 内部基建（MLflow、Ray、S3、Hive、HBase/Redis），含模型链路 / 特征链路 / 训练执行 / AI 资产四个导览视图 |
| Aimos 端到端数据流 | dataflow | `docs/platform/diagrams/aimos-platform.dataflow.json` | `apps/architecture/platform-dataflow.html` | 五阶段数据流：数据与代码源 → 特征生产 → 模型训练 → 注册与交付 → 在线服务；覆盖离线特征流（Hive ODS → FS → WideTable）与在线特征流（Kafka → HBase/Redis → FG Serving），含模型交付 / 特征训练 / 特征在线三个导览视图 |

嵌入页 `apps/architecture/index.html` 提供三个页签（架构总览 / 端到端数据流 / 说明与待确认），hash 路由 `#overview` `#dataflow` `#notes`。

## 内容来源

- `docs/platform/architecture.md` — 模块分层与端到端关系（§1、§2）
- `docs/feature-store/architecture/在线特征平台架构说明.md` — FS 五层架构、离在线一致性、§8.1 资产流转全景
- `docs/model-experiment/architecture/系统架构说明.md` — Web 后台 / 后端服务 / Ray 集群 / 存储层
- `docs/model-experiment/architecture/mlflow-integration.md` — Experiment/Run 与 MLflow 实体的 1:1 映射
- `README.md` 平台架构总览 ASCII 图

## 重新生成（维护约定）

调整架构时**改 JSON 源规格**，不要手改产物 HTML。在 archify skill 目录下执行：

```bash
# 迭代验证（showcase 档：需 9 项检查全过、0 错误 0 警告）
node bin/archify.mjs validate architecture docs/platform/diagrams/aimos-platform.architecture.json --quality showcase --json
node bin/archify.mjs validate dataflow     docs/platform/diagrams/aimos-platform.dataflow.json    --quality showcase --json

# 验证通过后原子交付（自动快照规格并复检，仅通过才覆盖产物）
node bin/archify.mjs deliver architecture docs/platform/diagrams/aimos-platform.architecture.json apps/architecture/platform-architecture.html --quality showcase --json
node bin/archify.mjs deliver dataflow     docs/platform/diagrams/aimos-platform.dataflow.json    apps/architecture/platform-dataflow.html      --quality showcase --json

# 浏览器证据（视口无溢出等）
node bin/archify.mjs visual-check apps/architecture/platform-architecture.html --json
```

交付回执（2026-09-03，archify 2.17.0-dev.1，sha256）：

| 图 | 规格源（JSON） | 产物（HTML） | 产物大小 |
|----|----------------|--------------|----------|
| 架构总览 | `baa2ce5e87e9…96d490b10` | `64122b50a79a…756bd8fcb` | 725,262 B |
| 端到端数据流 | `a51a84533c80…94db7f5d72` | `ee539bd361d2…a4d7c36b8b` | 720,165 B |

> 两图均通过 showcase 9 项检查（single_svg / finite_svg / orthogonal_arrows / label_route_clearance / relationship_crossings / relationship_corridors / container_border_runs / route_rhythm / legend_clearance）与 visual-check（1440×900 / 1600×1000 / 1920×1080 明暗主题视口均无溢出）。

## Pending 确认事项

以下为梳理过程中发现、**图中已按某种口径表达但需确认**的事项（同步展示在图册「说明与待确认」页签）：

1. **训练数据物理路径**：Model Experiment 的 RunConfig 数据源为 Hive 表（含 Fetch 校验），但《系统架构说明》§2 描述 Ray Dataset「从 S3 路径读取」。图按「训练数据取自 Hive（含 WideTable 产物）、执行产物落 S3」表达；Hive → S3 的导入环节归属（平台 or 上游 or 训练任务自身）**待与工程确认**。
2. **AI Hub → Online Runtime 供给关系**：LLM Workflow 消费 AI Hub 的 LLM / Skill / KB 资产，该边按 README 架构示意推导，实际交互协议（同步 API / 资产引用）与治理边界**待产品确认**。
3. **FeatureMap 是否入图**：FeatureMap 定位为检索与文档层、非数据流参与方，两张图均未纳入；如需展示「检索 → Feature Cart → 画布注册」链路，可增补第三张 workflow 图。
4. **旧 Feature Store 级架构图**：`apps/feature-store/public/architecture/` 仍保留 archify 2.6.0 时代的 featurestore-arch / featurestore-dataflow 两张旧图（随 FS 构建发布，未在导航暴露）。是否迁入本图册（升版重绘）或删除**待确认**。
5. **Console / Background Task 在图中的呈现**：当前折叠为 Web Console 副label（统一导航 · RBAC · Console）与卡片备注，未画独立组件；若后续 User / Alert Group 原型与权限链路细化，可升级为独立节点。
