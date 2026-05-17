# Frontend Closure Check

This repository includes a frontend source-closure validation script:

```bash
node scripts/validate-frontend-closure.mjs
```

## What It Checks

- scans `frontend/` source files
- reads local `import`, `export ... from`, and `require(...)` references
- verifies that local alias imports like `@/...` resolve to real files
- verifies that relative local imports resolve to real files

## Important Expected Local Areas

The current frontend depends on these local source areas and they must remain present:

- `frontend/src/lib/`
- `frontend/src/app/hooks/`
- `frontend/src/types/`
- `frontend/src/i18n/`
- `frontend/auth.ts`

## Important Alias Examples

The current project uses aliases such as:

- `@/auth`
- `@/src/i18n/routing`
- `@/src/lib/routes`
- `@/src/lib/utils`
- `@/src/lib/version`
- `@/src/lib/menu-list`
- `@/src/lib/stores/*`
- `@/src/lib/data/*`
- `@/src/types/*`
- `@/src/app/hooks/*`

## Current Result On The Source Machine

The closure script was run against:

- the original `stream-rec-frontend`
- the packaged `frontend/` directory in this repository

Both returned:

- `ok: true`
- `checkedFiles: 288`
- `unresolved: []`

This means the packaged frontend currently has a complete local import closure relative to the original source snapshot used to build this repository.
