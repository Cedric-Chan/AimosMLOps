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

### Issue tracker

Issues live as GitHub issues on `Cedric-Chan/AimosMLOps` (remote `origin`); use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to their own names — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
