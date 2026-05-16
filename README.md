# stream-receeMM6800

This repository is a cleaned handoff package for a customized `stream-rec` stack with Xiaohongshu support.

Its purpose is not only to preserve the current Windows behavior, but to make the project easier for a future Codex instance to analyze and migrate to Ubuntu Linux / Docker.

## Project Purpose

This project extends `stream-rec` so that:

- the frontend UI can add Xiaohongshu live rooms
- Xiaohongshu cookies can be configured in the UI
- Xiaohongshu recording can run through the current verified Windows flow
- existing frontend fixes for templates, streamer status, cookie handling, and path handling are preserved

## Current Verified Runtime Model

The only runtime model verified on the source machine is:

- Frontend: Docker container
- Backend: Windows host process started from a built `stream-rec.jar`
- Xiaohongshu helper: Python script invoked by the host backend

This matters because a future Linux migration should preserve behavior first, not assume that the pure backend Docker path is already the authoritative Xiaohongshu path.

## Repository Layout

- `frontend/`
  - Next.js frontend source with Xiaohongshu UI integration
- `backend/`
  - Kotlin / Ktor backend source and platform plugins
- `host/runtime-scripts/xhs_live_room.py`
  - signed Xiaohongshu helper used by the host backend flow
- `scripts/`
  - centralized startup and utility scripts
- `config/`
  - example configuration files and minimal samples
- `docs/`
  - migration notes and repository guidance

## Main Entry Files

These are the main files a future maintainer should understand first.

### Frontend

- `frontend/package.json`
- `frontend/Dockerfile`
- `frontend/src/app/[locale]/(feat)/streamers/components/streamer-form.tsx`
- `frontend/src/app/[locale]/(feat)/settings/platform/platform-form.tsx`
- `frontend/src/lib/data/streams/payload.ts`
- `frontend/src/lib/data/streams/streamer-apis.ts`

### Backend

- `backend/stream-rec/build.gradle.kts`
- `backend/platforms/src/main/kotlin/github/hua0512/plugins/xiaohongshu/download/Xiaohongshu.kt`
- `backend/platforms/src/main/kotlin/github/hua0512/plugins/xiaohongshu/download/XiaohongshuExtractor.kt`
- `backend/server/src/main/kotlin/github/hua0512/backend/routes/Streamer.kt`
- `host/runtime-scripts/xhs_live_room.py`

### Scripts

- `scripts/windows/build-host-jar.ps1`
- `scripts/windows/start-stream-rec-host.ps1`
- `scripts/windows/start-stream-rec-frontend-xhs.ps1`
- `scripts/windows/record-xhs-live.ps1`

## Current Windows Run Method

The current source-machine workflow is:

1. build the backend jar if needed
2. start the backend on Windows host
3. start the frontend in Docker
4. open the browser UI and manage streamers there

Suggested sequence:

```powershell
.\scripts\windows\build-host-jar.ps1
.\scripts\windows\start-stream-rec-host.ps1
.\scripts\windows\start-stream-rec-frontend-xhs.ps1
```

Frontend URL after startup:

- `http://localhost:15281/zh/login`

## Dependencies

### Required for the current Windows-host path

- Java 21
  - used to build and run `stream-rec.jar`
  - source machine used Temurin / OpenJDK 21
- Python 3.10+
  - used for `host/runtime-scripts/xhs_live_room.py`
  - helper also needs `xhshow` plus a crypto package compatible with `Cryptodome`
- ffmpeg 7+
  - used for actual recording
  - source machine testing used ffmpeg 8.1
- Docker Desktop
  - used to run the frontend container

### Helpful for source-level development

- Node.js 20+
- npm
- Gradle wrapper from `backend/gradlew` or `backend/gradlew.bat`

## Required Configuration Files

- `.env.example`
  - environment variable template
- `config/backend.config.example.json`
  - backend configuration example
- `config/xhs_config.example.json`
  - example global config including `xiaohongshuConfig`
- `config/xhs.cookies.example.txt`
  - cookie string format example
- `config/minimal-test-input.md`
  - smallest practical Xiaohongshu test input notes

## Windows-Specific Parts

These parts are Windows-oriented today:

- `scripts/windows/*.ps1`
- the verified runtime model that keeps backend on the Windows host
- PowerShell process control and port checks
- current frontend script behavior using `host.docker.internal`

## Linux Migration Goal

When this project is later migrated to Ubuntu Linux / Docker, the intended preserved behavior is:

- same frontend pages and Xiaohongshu UI support
- same ability to configure Xiaohongshu cookies in the UI
- same ability to add Xiaohongshu streamers and templates
- same recording output behavior as closely as possible
- same non-Xiaohongshu platform behavior unless intentionally changed

Do not treat this repository as “already Linux-ready”.
Treat it as a cleaned source package prepared for Linux analysis and migration.

## Minimal Test Input

See:

- `config/minimal-test-input.md`

This file shows:

- a valid Xiaohongshu live URL shape
- cookie string format expected by the current workflow
- a minimal smoke-test checklist

## Migration Notes

Read:

- `docs/windows-migration-notes.md`

This file lists:

- what has only been validated on Windows
- what is likely to break on Linux
- which pieces depend on PowerShell, host networking, or Windows runtime assumptions
