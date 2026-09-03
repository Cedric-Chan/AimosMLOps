# Feature Store 原型 — Vite + React（唯一真源）

本目录为在线特征平台 **交互演示与原型** 的维护入口（原 Figma/Make 导出基础上演进）。产品行为与字段仍以 [../../docs/design/front-design/产品原型图.md](../../docs/design/front-design/产品原型图.md) 及对照文档为准。

- 旧版单文件 HTML 已归档为 [../../docs/prototype/FEATURE_STORE.legacy.html](../../docs/prototype/FEATURE_STORE.legacy.html)，请勿在其上继续迭代功能。
- 入口说明（分享演示）：[../../docs/prototype/公开演示-GitHub-Pages.html](../../docs/prototype/公开演示-GitHub-Pages.html)（**GitHub Pages 自动发布**）、[../../docs/prototype/FEATURE_STORE.html](../../docs/prototype/FEATURE_STORE.html)、[../../docs/prototype/README.md](../../docs/prototype/README.md)。

## 开发

推荐使用 **pnpm**（与 CI / `pnpm-lock.yaml` 一致；也可用 `corepack enable` 后使用）：

```bash
pnpm install
pnpm dev
```

在浏览器打开终端提示的本地地址（默认 `http://127.0.0.1:5173`）。

## 构建与分享

```bash
pnpm run build
# 或
pnpm run build:demo
```

产物在 **`dist/`**（已配置 `base: './'`）。路由使用 **HashRouter**，便于本地 `file://` 打开。

### 同步到文档入口旁（便于 FEATURE_STORE.html 点击打开）

```bash
pnpm run sync-prototype
```

会执行 `build` 并把 `dist/` 复制到 **`docs/prototype/feature-store-demo/`**，与 [../../docs/prototype/FEATURE_STORE.html](../../docs/prototype/FEATURE_STORE.html) 同级。

将 **`dist`** 或 **`feature-store-demo`** 内容 zip 给他人，解压后双击 `index.html`。若浏览器限制本地脚本，在该目录执行：

```bash
python3 -m http.server 8765
```

然后访问 `http://127.0.0.1:8765`。

### GitHub Pages（云端自动构建，推荐对外分享）

仓库根目录 [.github/workflows/deploy-feature-store-pages.yml](../../.github/workflows/deploy-feature-store-pages.yml) 会在推送至 `main`/`master` 且变更涉及本目录时，自动执行 `pnpm install --frozen-lockfile` + `pnpm run build`（并设置 `VITE_BASE_PATH=/仓库名/`），将 `dist` 部署到 GitHub Pages。

首次请在 GitHub 仓库 **Settings → Pages → Source：GitHub Actions**。详细说明见 [../../docs/prototype/公开演示-GitHub-Pages.html](../../docs/prototype/公开演示-GitHub-Pages.html)。

## 代码结构（摘要）

| 区域 | 路径 |
|------|------|
| 路由与壳 | `src/app/App.tsx`, `src/app/layout/AppShell.tsx` |
| WideTable 列表 | `src/app/pages/WideTableListPage.tsx` |
| 画布（实例/编辑/新建） | `src/app/pages/CanvasPageRoutes.tsx`, `src/app/components/CanvasPage.tsx` |
| Mock 数据 | `src/data/mockWideTables.ts` |
| 其他导航页 | `MigratedPlaceholderPage`, `FeatureGroupDetailPage` 等 |

## 原始说明（导出自带）

`package.json` 中定义了 `build`、`dev`、`build:demo` 脚本；锁文件为 **`pnpm-lock.yaml`**。
