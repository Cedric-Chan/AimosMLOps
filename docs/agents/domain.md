# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Repo: `Cedric-Chan/AimosMLOps` — the platform-level design repo for Aimos (Monee 通用风控模型平台): architecture, module specs, and interactive prototypes. **Layout: single-context.**

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
  - This repo is single-context, so `CONTEXT-MAP.md` is not expected here. If one ever appears, that is a deliberate switch to multi-context and this file should be updated.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/                       ← architecture decision records
│   ├── agents/                    ← engineering-skill config (this file, issue tracker, triage labels)
│   ├── platform/                  ← platform-level architecture + module inventory
│   └── <module>/                  ← per-module product docs (e.g. model-mgmt/spec.md)
├── apps/
│   └── <module>/                  ← per-module interactive prototypes
└── assets/                        ← platform shell (shell.js is the single source of truth for nav)
```

## What counts as a domain doc here

Only `CONTEXT.md` (glossary of record) and `docs/adr/` (decisions). The per-module docs under `docs/<module>/` — specs such as `docs/model-mgmt/spec.md`, `docs/model-deployment/spec.md`, `docs/feature-entity/spec.md` — are product and interaction specs, not domain docs. Read them as background for the module you're working in, but don't treat their wording as the project's canonical vocabulary; `CONTEXT.md` wins on naming.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
