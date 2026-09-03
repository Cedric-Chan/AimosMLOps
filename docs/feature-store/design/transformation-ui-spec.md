# Transformation 模块 UI / 交互说明

与 Feature Store React 原型（`prototypes/feature-widetable`）实现对齐，供评审与迭代使用。

## 路由

| 路径 | 说明 |
|------|------|
| `/tf` | 列表页 |
| `/tf/new` | 新建；支持 query `copyFrom`、`copyVersion`（More > Add 复制新版本） |
| `/tf/edit/:tfName/:tfVersion` | 编辑；`tfName` / `tfVersion` 为经 `encodeURIComponent` 编码的路径段 |

`View`：与编辑路由相同；当 `location.state.readOnly === true` 时表单只读。

## 列表页

- **顶栏**：与 Feature Source / WideTable 一致（背景 `#f5f7fa`、`#13c2c2` 图标块）。
- **Filters**：默认**收起**；展开为两排字段 — **Name、Owner、Type、Language**；**Region、Script**。**Reset** + **Query**；摘要展示**已应用**筛选条件。
- **工具栏**：`Total N records`、**Owned by me**、**Add Transformation**、Refresh / Export / Settings（图标占位）。
- **表格**：列 — Name、Version、Type、Language、Status、Region、Owner、CreateTime、Description、Action。同名多 Version 时 **Name 列 rowspan**（按当前分页切片合并，不跨页）。
- **Status**：DRAFT / ENABLED / DISABLED / PENDING 胶囊样式。
- **Action**：**View** | **Test** | **More** | **Manage**。
- **More**：Edit → 编辑页；Add → `/tf/new?copyFrom=&copyVersion=`；Monitor → 占位弹窗。
- **Manage**：**Draft**（仅 DISABLED）、**Enable**（仅 DRAFT）、**Disable**（仅 ENABLED，二次确认）、**Delete**（DRAFT/DISABLED，确认）。
- **Test 弹窗**：标题 `{Name} {Version} Transformation Test`；**New Test** | **History**；Region 取自该版本 **regions**；JSON 填参、Input/Output 表、Duration、**Cancel / Test / OK**；History 支持 Query/Reset、Load、Detail。

## 详情页（Add / Edit）

- **顶栏**：返回列表；**Copy Settings**、**Edit in Script**、**Save Draft**（占位）、**Test**（必填未齐则 disabled）。
- **Test 与 AI Review**：仅当用户在详情页点击顶栏 **Test** 打开弹窗，并在弹窗内 **mock 运行成功**后，本地 `hasPassedTest = true`，**AI Review** 才可点；界面英文提示为 `Please pass the Test first to enable AI Review`（通过后改为简短成功提示）。**列表行上的 Test 不会**解锁详情页 AI Review。
- **Basic Info**：Name、只读 Version、Type*、Owner、Description*、Region*（多选 chip）、Language*。
- **Transformation Script**：Script*、行号 + 编辑区、右上角全屏展开。
- **Params Config**：**Input Params**、**Output Params** 各一虚线区，右侧 **+ Add**。
- **Transformation Agent Review**：**AI Review**（未通过 Test 时 disabled）+ 上述提示文案。
- **页脚**：**Cancel**、**Submit**（校验未通过时 disabled）。

## 参考截图（工作区）

- 列表 / 测试弹窗 / 详情 Basic Info：见会话内 Figma 导出图。
- Params Config + Agent Review 补充示意：`image-12ef1370-788b-4a1d-954a-42ee1cd4bba0.png`（Cursor assets）。
