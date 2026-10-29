## Hard rule: this repo is PUBLIC

`Cedric-Chan/AimosMLOps` is a public GitHub repo with a public Pages site. Anything committed is
public immediately and is hard to retract (git history + built bundles + third-party caches).
Never commit proprietary employer code, internal hostnames or internal repo paths, real employee
names/emails, or customer data. Use synthetic placeholders instead.

The internal production codebase used as a read-only reference lives **outside this repo** (a
sibling directory in the workspace); see the repo README's "生产参考代码" section. It is not
tracked here and must never be copied in — `.gitignore` has a tripwire for it, treat that as a
last resort, not a licence.

## Agent skills

### 交互 Demo 的发布：改动即四端同步

**任何对 demo 交互页（平台壳 `index.html` / `assets/` / `apps/`）的调整，必须同时更新四个目标**，不要只改本地或只推 GitHub：

| 端 | 地址 / 位置 | 由谁负责 |
|---|---|---|
| 本地 | `local-dist/`（`python3 -m http.server 8090`） | `scripts/assemble.sh` |
| GitHub 源码 | `origin/main` — https://github.com/Cedric-Chan/AimosMLOps | `git push origin main` |
| GitHub Pages | https://cedric-chan.github.io/AimosMLOps/ | `gh-pages` 分支 |
| Mypage（公司内网） | https://mypage.shopee.io/p/cedric-chencan/aimos-aio/ | `mypage project upload --project-id 4669` |

**一条命令完成**：

```bash
./scripts/publish-all.sh -m "改动说明"
```

选项：`--no-commit`（工作区已提交）、`--no-watch`（跳过 Pages 构建轮询）、`--only <local|github|pages|mypage>`（只发一端）。

注意事项：

- `scripts/assemble.sh` 会剔除 `*.visual-check.*`（视觉验证残留，已被 `.gitignore` 排除），因此 gh-pages 与 Mypage 都不会带上它们。若新增其他本地产物，在 assemble 里加同样的 `find -delete`。
- 改了任一 `apps/` 原型，必须递增 `assets/shell.js` 的 `APPS_VERSION`，否则 iframe 会命中浏览器缓存显示旧页面。
- Mypage 项目默认 `restricted`，只有 `cedric-chencan` 能访问；分享用 `mypage project grant add --project-id 4669 --email <someone@shopee.io>`。

### Issue tracker

Issues live as GitHub issues on `Cedric-Chan/AimosMLOps` (remote `origin`); use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to their own names — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
