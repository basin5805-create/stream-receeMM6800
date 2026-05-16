# Codex Handoff For Future Linux Migration

This repository is prepared for a future Codex instance that will analyze the current Windows-customized project and migrate it toward Ubuntu Linux / Docker.

## Primary Goal

Do not start by rewriting everything.

First understand:

- what the source project currently does
- which behavior is already verified on Windows
- which files are actual sources of truth
- which parts are only startup wrappers or migration aids

## Important Context

The source machine's currently verified Xiaohongshu workflow was:

- frontend in Docker
- backend on Windows host
- helper logic in `host/runtime-scripts/xhs_live_room.py`

This repository intentionally preserves source code and Windows startup scripts so you can analyze the real working behavior before designing the Linux version.

## What To Preserve

When adapting to Linux, preserve these behaviors if possible:

- Xiaohongshu platform appears in the frontend UI
- Xiaohongshu cookies can be configured in the UI
- browser-exported Xiaohongshu cookie JSON can be converted and used
- Xiaohongshu streamers can be added from the UI
- template and streamer edit behavior stays consistent
- output path, output format, and segmented recording behavior remain understandable to users

## What Not To Assume

- do not assume the pure backend Docker path is already fully verified for Xiaohongshu
- do not assume Windows PowerShell scripts can be translated 1:1 into Linux shell scripts
- do not assume host/container networking will behave the same as `host.docker.internal`
- do not assume the current helper invocation and crypto dependency chain will work unchanged on Linux

## Files To Read First

1. `README.md`
2. `docs/windows-migration-notes.md`
3. `scripts/README.md`
4. `host/runtime-scripts/xhs_live_room.py`
5. `backend/platforms/src/main/kotlin/github/hua0512/plugins/xiaohongshu/download/Xiaohongshu.kt`
6. `backend/platforms/src/main/kotlin/github/hua0512/plugins/xiaohongshu/download/XiaohongshuExtractor.kt`
7. `frontend/src/app/[locale]/(feat)/streamers/components/streamer-form.tsx`
8. `frontend/src/app/[locale]/(feat)/settings/platform/platform-form.tsx`
9. `frontend/src/lib/data/streams/payload.ts`
10. `frontend/src/lib/data/streams/streamer-apis.ts`

## Suggested Migration Strategy

1. confirm backend can still be built from source
2. map current Windows-only runtime assumptions
3. keep frontend behavior stable
4. build a Linux-safe runtime plan for:
   - Java
   - Python helper
   - ffmpeg
   - Docker networking
5. only then implement Linux runtime scripts or compose changes

## Why This Repository Was Cleaned

Large and noisy runtime artifacts were intentionally removed so future analysis is not polluted by:

- old recordings
- logs
- database snapshots
- virtual environments
- node_modules
- build caches
- one-machine-only absolute paths

This repository is a migration-oriented source package, not a frozen machine image.
