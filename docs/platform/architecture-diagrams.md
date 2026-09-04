# 平台架构图册（Architecture Diagrams）

由 [archify](https://github.com/tt-a1i/archify) skill（v2.17）从平台文档梳理生成的交互式架构图，嵌入平台交互 Demo 的 **Architecture 入口**（侧边栏左下角页脚 → `#feature-store/architecture`）。

## 图纸清单

| 图 | 类型 | 源规格（唯一事实源） | 产物 | 内容 |
|----|------|---------------------|------|------|
| Aimos 平台架构总览 | architecture | `docs/platform/diagrams/aimos-platform.architecture.json` | `apps/architecture/platform-architecture.html` | 平台模块组件图：Aimos 平台边界（Web Console / AI Hub / 模型链路 / Feature Store / Online Runtime）+ 外部系统 + 内部基建（MLflow、Ray、S3、Hive、HBase/Redis），含模型链路 / 特征链路 / AI 资产导览视图 |
| Aimos 端到端数据流 | dataflow | `docs/platform/diagrams/aimos-platform.dataflow.json` | `apps/architecture/platform-dataflow.html` | 五阶段数据流：数据与代码源 → 特征生产（含 FeatureMap 同步）→ 模型训练 → 注册与交付 → 在线服务；覆盖离线特征流与在线特征流 |
| Feature Store 系统架构 | architecture | `docs/platform/diagrams/featurestore.architecture.json` | `apps/architecture/featurestore-architecture.html` | FS 五层组件图：DataSource → FeatureSource → Transformer → FeatureGroup → FeatureMap；含在线存储（HBase/Redis/GraphDB 内置函数）、BE 外调、WideTable 画布与离在线双出口 |
| Feature Store 数据流 | dataflow | `docs/platform/diagrams/featurestore.dataflow.json` | `apps/architecture/featurestore-dataflow.html` | FS 五阶段数据流：上游数据 → 在线存储 → 取数与加工 → 特征出口 → 消费场景（Training / Serving / FeatureMap 检索） |

嵌入页 `apps/architecture/index.html` 提供五个页签（架构总览 / 端到端数据流 / FS 架构 / FS 数据流 / 说明与口径），hash 路由 `#overview` `#dataflow` `#fsarch` `#fsflow` `#notes`。

## 内容来源

- `docs/platform/architecture.md` — 模块分层与端到端关系（§1、§2）
- `docs/feature-store/architecture/在线特征平台架构说明.md` — FS 五层架构、离在线一致性、§8.1 资产流转全景
- `docs/model-experiment/architecture/系统架构说明.md` — Web 后台 / 后端服务 / Ray 集群 / 存储层
- `docs/model-experiment/architecture/mlflow-integration.md` — Experiment/Run 与 MLflow 实体的 1:1 映射
- `README.md` 平台架构总览

## 已确认口径（2026-09）

首轮梳理的 Pending 事项已全部确认，图与文档按以下口径表达：

1. **训练数据物理路径（Hive → S3）**：训练数据为有权限的任意 Hive 表（含 WideTable 产物）；**Experiment 首个节点 Datasource 负责 Hive → S3 装载**，Ray 集群经 Ray Dataset 从 S3 读取执行。端到端数据流图中 `ray → S3` 边标注「Datasource 装载 / 产物」，卡片同步说明。
2. **AI Hub → Online Runtime 供给关系**：确认成立（LLM / Skill / KB 资产供给在线服务），架构总览对应边保留。
3. **FeatureMap 入图**：FeatureMap 提供**最细特征粒度**的特征检索。已入图——端到端数据流的特征生产阶段（FG 发布自动同步）；FS 两图中作为五层组装的检索出口（FG → FeatureMap，Feature Cart）。
4. **旧 Feature Store 架构图迁移**：原 `apps/feature-store/public/architecture/` 下 archify 2.6.0 旧图经 visual-check 验证**不满足视口标准**（纵向溢出 ~300px），已按当前文档用 2.17 重绘为上面两张 FS 图并迁入图册；旧文件、FS 应用 `#/arch` 路由与 `ArchitectPage` 一并移除。
5. **Console / Background Task 呈现粒度**：维持现状——Console 折叠为 Web Console 副标签（统一导航 · RBAC · Console）；Background Task 为临时后台任务位，暂不细化，后续原型落地后可升级为独立节点。

## 重新生成（维护约定）

调整架构时**改 JSON 源规格**，不要手改产物 HTML。在 archify skill 目录下执行：

```bash
# 迭代验证（showcase 档：需 9 项检查全过、0 错误 0 警告）
node bin/archify.mjs validate architecture docs/platform/diagrams/<spec>.json --quality showcase --json
node bin/archify.mjs validate dataflow     docs/platform/diagrams/<spec>.json --quality showcase --json

# 验证通过后原子交付（自动快照规格并复检，仅通过才覆盖产物）
node bin/archify.mjs deliver architecture docs/platform/diagrams/<spec>.json apps/architecture/<out>.html --quality showcase --json
node bin/archify.mjs deliver dataflow     docs/platform/diagrams/<spec>.json apps/architecture/<out>.html --quality showcase --json

# 浏览器证据（视口无溢出等）
node bin/archify.mjs visual-check apps/architecture/<out>.html --json
```

交付回执（2026-09-04，archify 2.17.0-dev.1，sha256；四图均通过 showcase 9 项检查与 visual-check 明暗主题视口检查）：

| 图 | 规格源（JSON） | 产物（HTML） | 产物大小 |
|----|----------------|--------------|----------|
| 平台架构总览 | `69622aaacb90…6038e689` | `4f337906c123…c09f8c156898` | 725,277 B |
| 端到端数据流 | `d6dacbfacb4c…10c237d68b` | `885aec3661a3…9a5242152c2d` | 722,241 B |
| FS 系统架构 | `cc1534343dbe…11091c49d4` | `da7b6a647b64…4d552bd3d4a` | 718,952 B |
| FS 数据流 | `f55fc655ccd2…d850c5456b` | `346592e41ded…f91bc1b3897` | 717,628 B |
