# Console / User 模块 — 领域规则与交互规格

> 来源：线上 User 模块实现梳理（2026-09）。原型：`apps/user-mgmt/`（纯静态，无构建）。

## 1. 领域模型

```
User (Email 唯一标识)
 └── * RoleAssignment (角色分配记录: Email + Biz Team + Role + UpdatedTime)
        Biz Team 目录 (Team Dir) 由 superadmin 维护
```

- 一个用户可以归属**多个 Biz Team**；每个 (Email, Biz Team) 组合产生一条角色记录。
- **一个用户在一个 Team 下同一时间只能有一个角色**（唯一约束：Email + Biz Team）。
- Team 内角色三档：**VIEWER / EDITOR / ADMIN**。

## 2. 页面结构（对齐线上截图）

| 区域 | 内容 |
|------|------|
| 筛选栏 | Email（模糊匹配）/ Biz Team（下拉）/ Role（下拉）+ Reset / Query |
| 工具栏 | Add User、Team Dir（仅 superadmin 可见）；右侧：刷新 / 聚合规则说明 / 列设置（预留） |
| 列表 | Email + Biz Team 聚合展示：同 Email 合并单元格（rowspan）；列：Email / Biz Team / Role / Updated Time / Action（Edit, Delete） |
| 分页 | `1-10 of N items`，页码，10 / page（可选 10/20/50） |

## 3. 关键交互

### Team Dir（superadmin）
- 点击弹出浮窗：现有 Team 以标签展示，每个标签可 × 删除；「New Directory」虚线按钮原地变输入框，Enter 确认新增、Esc 取消。
- Team 命名查重（忽略大小写）。
- **删除 Team 级联移除该 Team 下所有角色记录**（确认弹窗中提示受影响记录数）。

### Add User 弹窗
- 三个必填项：* Email（格式校验）、* Biz Team（下拉，来自 Team 目录）、* Role（VIEWER/EDITOR/ADMIN）。
- 唯一性校验：该 Email 在所选 Team 下已有角色时，阻止提交并提示「请直接 Edit 修改」。

### Edit / Delete
- Edit：同弹窗预填，Email 锁定不可改（改 Team/Role 走同一唯一性校验，排除自身）；保存刷新 Updated Time。
- Delete：确认弹窗后移除该条角色记录。

## 4. 权限模型（现状 + 待细化）

| 能力 | superadmin | Team ADMIN | 其他 |
|------|-----------|------------|------|
| 查看（有权限范围内）用户列表 | ✅ 全量 | 待确认范围 | — |
| Team Dir 增删 Team | ✅ | ✗ | ✗ |
| Add / Edit / Delete 角色记录 | ✅ | 待确认是否限本 Team | ✗ |

> 待细化问题（后续与工程确认）：非 superadmin 的可见范围（全量 vs 本 Team）；Team ADMIN 能否管理本 Team 成员；用户归属 Team 的数据源（SSO / 手工维护）。
