# Apply this AI-context patch

The ZIP contains **only newly created or updated AI guidance files**, not app source.

## Where to put files
Extract into the **root of your existing `INMinut-Frontend` project** (same directory as `package.json`). Preserve paths:

```text
INMinut-Frontend/
├── AGENTS.md                         (REPLACE existing brief guide)
├── CLAUDE.md                         (KEEP existing file; it points to AGENTS.md)
├── docs/ai/PROJECT_MAP.md            (NEW)
└── .agents/skills/                   (NEW)
    ├── screens-navigation/SKILL.md
    ├── api-state/SKILL.md
    ├── notifications/SKILL.md
    ├── media-sharing/SKILL.md
    ├── build-release/SKILL.md
    └── change-workflow/SKILL.md
```

`PATCH_INSTRUCTIONS.md` is optional documentation; it does not affect the app.

## Usage
Ask your coding assistant to read `AGENTS.md` first and load the relevant `.agents/skills/.../SKILL.md` for the task. `CLAUDE.md` already points to `AGENTS.md` in this repository. Other assistant products may require their own mechanism to discover these instructions.

## Notes
- No runtime code, dependencies, native settings, or Expo config was changed.
- This improves AI navigation **when the assistant has access to these repository files**; it cannot guarantee zero source reading or fully automatic ingestion in every AI product.
- After future architectural changes, keep `PROJECT_MAP.md` and relevant skill up to date.
- The supplied archive included `.git`, `node_modules`, environment/credential-related files; **none** are included in this patch.
