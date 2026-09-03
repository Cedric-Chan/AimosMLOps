# Feature Source：Figma 导出 vs 产品规格 vs 当前实现

用于评审：与《产品原型图》或 zip 内交互说明不一致处，确认后再改规格或实现。

**参考**

- 实现：[../../prototypes/feature-widetable/src/app/components/feature-source/FeatureSourcePage.tsx](../../prototypes/feature-widetable/src/app/components/feature-source/FeatureSourcePage.tsx)
- 交互说明（zip 原文）：[`feature-source-interaction-spec.md`](feature-source-interaction-spec.md)
- 规格：[`front-design/产品原型图.md`](front-design/产品原型图.md) §3.1

---

## 差异清单

| # | 主题 | zip 交互说明 / 导出稿 | 《产品原型图》§3.1 | 当前实现 | 说明与确认项 |
|---|------|----------------------|---------------------|----------|--------------|
| A | **筛选区默认展开** | 展开为默认 | 未强调默认展开/收起 | **默认收起**（`filterExpanded` 初始 `false`）；摘要展示 **已应用** 条件 | 与 WideTable `FilterBar` 一致；与 zip 文档 §2.1 不同 |
| B | **Search 应用时机** | 点击 Search 后前端过滤 | 同左 | **是**：草稿条件在点 Search 后写入 `appliedFilters`；Reset 清空草稿与已应用 | — |
| C | **一级行 Delete** | 有子行则告警；无子行可删 | 先校验是否存在 ONLINE Region，再 PopConfirm | **同 zip**：有子行 → Warning Modal；无子行 → 直接删除 | 与原型「ONLINE 校验」逻辑不同 |
| D | **Manage 菜单** | Online / Offline / Delete（文档） | Enable / Disable / **Draft** | **同导出 TSX**：Enable / Disable / Draft；子行 Delete 未接 UI（`handleSubDelete` 未使用） | 文档 §6 与导出代码不一致 |
| E | **状态文案** | ENABLE→ONLINE 展示（§5） | ONLINE / OFFLINE Tag | 子表 **ENABLE / DISABLE / DRAFT** 字面 | 与规格展示文案不同 |
| F | **子行 Action** | Edit / Copy / Manage | 同左 | 额外 **View** + `ViewRegionModal` | 导出较 spec 多一项 |
| G | **Input Params 表单** | 12 项预设多选（§7.1） | Region Modal 含 Input/Output | **`ParamRowEditor`** 可编辑 name + dataType | 交互形态不同 |
| H | **页面壳层** | `bg-slate-50` 等 | 侧栏 + 主内容区 | **对齐 WideTable**：`#f5f7fa`、顶栏 `#13c2c2` 图标块 | — |
| I | **筛选卡片** | Sliders +「Filter」 | 检索区 + Reset/Search | **对齐 FilterBar**：竖条 + `FILTERS`、白卡片、 teal 主按钮；徽标用 **emerald** 表示已应用条件数 | — |
| J | **Region 枚举** | ID / TH / MX / SG / PH / VN / SHOPEE_SG | 含 BR 等 | 以导出 `REGIONS` 常量为准 | 与原型下拉选项可能不一致 |
| K | **Connect-then-OK** | — | Region Modal 可选 Connect / OK | **无** | 以导出为准 |

---

## 签认（可勾选）

- [ ] **A** — 筛选默认收起 + 摘要为已应用条件
- [ ] **B** — Search / Reset 与 applied 状态
- [ ] **C** — 一级 Delete 规则（子行存在即拦截）
- [ ] **D** — Manage 项与 Delete 是否补全
- [ ] **E** — 是否改为 ONLINE/OFFLINE 展示
- [ ] **F** — 是否保留 View
- [ ] **G** — Input Params 是否改为 12 项多选
- [ ] **H–I** — 壳层与筛选视觉
- [ ] **J–K** — Region 列表与 Connect 流程
