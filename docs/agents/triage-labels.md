# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker (GitHub — `Cedric-Chan/AimosMLOps`).

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Current label state in the tracker

`wontfix` already exists on `Cedric-Chan/AimosMLOps` (GitHub's default label, description "This will not be worked on"). The other four (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`) do not exist yet — the `triage` skill creates them on first use rather than mapping to an existing label.

The repo's other existing labels (`bug`, `documentation`, `enhancement`, `question`, `invalid`, `duplicate`, `good first issue`, `help wanted`, `accessibility`) are ordinary GitHub defaults and are unrelated to triage state.
