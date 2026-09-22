# Evals 采用 Orches 原生自建，不引入 MLflow GenAI 运行时依赖

Status: accepted (2026-09-22)

Aimos 的 LLM 评测闭环（评测集 / 失败转用例 / 版本回归 / 在线采样评分）以四张新表的形式落在 Orches Service 后端，复用其既有的追踪日志、批量测试入口、节点日志与 test-run 发布门；**不引入 MLflow GenAI 的 API 面与运行时**。MLflow 仅作为设计语义参考（alias 指针回滚、registry 版本语义）。

## Considered Options

- **复用内部 MLflow 并升级到 ≥3.14**（原调研的默认推荐）：被否——内部实例版本口径矛盾（2.21.3 与 "3.x UI" 并存），升级排期不受本平台控制；把产出所有权建立在别人团队的排期上会削弱平台对评测覆盖率的可控性。
- **自托管一套独立评测平台（Langfuse 等）**：被否——最轻的可门禁形态（Promptfoo 类）单进程即可，而带数据集/审阅的形态动辄 6 容器级；且与「Orches 是唯一运行时面」的平台叙事冲突。

## Consequences

- 放弃开箱的 judges / review queues / 数据集 UI——调研已论证这些可轻量替代且多数属于可砍项；代价是 judge 校准、统计口径、报告视图需要自建。
- 内部 MLflow 若将来升级且出现真实需求，可再评估把评测 run **镜像**到 MLflow 作 lineage——本决策只排除运行时依赖，不排除旁路登记。
- 评测数据落 regional 数仓与对象存储；不因评测引入新的跨 region 数据流。
