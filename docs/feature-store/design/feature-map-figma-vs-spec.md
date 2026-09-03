# Feature Map：Figma 导出 vs 产品规格 vs 当前原型

用于评审与签认：确认前不擅自改《产品原型图》正文；签认后可决定是否修订 [`front-design/产品原型图.md`](front-design/产品原型图.md) 或调整导出/实现。

**参考来源**

- 导出稿（zip）：[../../prototypes/feature-map/](../../prototypes/feature-map/)
- 规格：[`front-design/产品原型图.md`](front-design/产品原型图.md) §3.4 / §5.3
- 原型：[`../prototype/FEATURE_STORE.html`](../prototype/FEATURE_STORE.html) `#page-fm`

---

## 差异清单（A–J）

| # | 主题 | 导出稿（zip） | 《产品原型图》§3.4 / §5.3 | 当前 `FEATURE_STORE.html`（`#page-fm` 静态还原后） |
|---|------|----------------|---------------------------|---------------------------|
| A | **整页壳层** | 独立 `header`：Logo 方块 + 标题「Feature Map」+ 右侧「Last updated: …」；主区 `bg-[#f5f7fa]` | 未描述独立顶栏与 Last updated；整体为平台内嵌页面 | 页内 **FM 顶栏** + Last updated；`#page-fm` 背景 `#f5f7fa`；仍保留平台全局侧栏 + 顶栏标题 |
| B | **Feature Cart 位置文案** | 购物车始终在工具栏 **右侧** | §3.4.2 写「工具栏**右侧**」；§2 导航图注写「**左下角**」— **文档内部矛盾** | 与导出一致：**工具栏右侧** |
| C | **筛选字段** | Keyword、Region、Entity、**Serving Avail.**（第二行可折叠）；无 **Module** 下拉、无 **Online Avail.** 命名 | §3.4.1：多条件含 **实体、biz_team、关键词** 等；未强制与导出字段一一对应 | 与导出一致：四字段 + 折叠第二行；**无** Module / Online Avail. 下拉 |
| D | **筛选生效方式** | `filters` vs `appliedFilters`，点 **Search** 才应用到列表；**Reset** 清空 | 未明确「点 Search 才生效」 | 已实现：**Search** 提交 applied、**Reset** 清空并重绘 |
| E | **左侧树** | 宽 `w-56`（224px）、标题「**Module Navigator**」、「**All Modules**」+ 总数、文件夹图标、展开线与圆点 | Module > FG 二级树 + 括号个数 + 搜索 | 与导出对齐：**224px**、Navigator、All Modules、展开/圆点/徽章计数 |
| F | **工具栏左侧** | 有选中：绿点 +「N feature(s) selected」+ **Clear**；无选中：「N feature(s) found」 | 未描述「found」与工具栏 **Clear** | 与导出一致：**found / selected** 与 **Clear** |
| G | **购物车交互** | 下拉面板：列表、单项移除、**Clear all**、底栏 **Training Workflow** / **Serving Workflow** | 点击衔接 WideTable / Serving **创建页** | 与导出一致：下拉 + 列表 + 移除 + Clear all + 双按钮（Workflow 为 **toast 占位**，非真实跳转） |
| H | **表格** | **Sticky** 首两列（勾选 + Feature Name）；自定义 **方框勾选** SVG；选中行底 `#e6fffb`；斑马纹；Training/Serving 用 **圆点 + 文案** | Region **灰色 tag**；Training/Serving **bool-tag**；表头三态 | 与导出一致：sticky 前两列、自定义勾选、行高亮、斑马纹、BOOL 圆点 |
| I | **分页** | 独立白卡片；`1–20 of N`；页码按钮 + 省略号；page size **10/20/50/100** | 默认 **20 条/页** | 与导出一致：独立卡片、`M–N of T`、省略号、**10/20/50/100** |
| J | **演示默认选中** | `App.tsx` 默认 `selectedIds` 含 f1,f2,f3 | 未要求默认选中 | 与 `App.tsx` 一致：默认 **f1、f2、f3** 选中 |

**说明**：导出中 **Feature** 类型无 **Partition** 列，与 §3.4.1 列清单一致；当前 HTML 表格也无 Partition，此项无冲突。

**原型状态**：`#page-fm` 已按 [../../prototypes/feature-map/](../../prototypes/feature-map/) 做静态近 1:1 还原；上表 **第三列**反映该实现。与《产品原型图》的差异仍以 **第二列**为准，供你是否修订规格文档时核对。

---

## 签认（可勾选）

- [ ] **A** — 整页壳层 / Last updated
- [ ] **B** — Cart 位置与文档矛盾处理
- [ ] **C** — 筛选字段命名与是否保留 Module / Online Avail.
- [ ] **D** — Search / Reset 与 applied 行为
- [ ] **E** — 左侧树：Navigator / All Modules / 宽度
- [ ] **F** — 工具栏：found / selected / Clear
- [ ] **G** — 购物车：下拉与 Workflow 按钮
- [ ] **H** — 表格：sticky、勾选、行样式、圆点
- [ ] **I** — 分页：省略号、page size
- [ ] **J** — 演示默认是否预选中 3 条
