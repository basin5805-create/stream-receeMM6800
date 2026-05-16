# Scripts Overview

All startup-related entry points are kept under `scripts/`.

## Windows

- `windows/build-host-jar.ps1`
  - builds `backend/stream-rec/build/libs/stream-rec.jar`
- `windows/start-stream-rec-host.ps1`
  - starts the backend on the Windows host
- `windows/stop-stream-rec-host.ps1`
  - stops the Windows host backend
- `windows/start-stream-rec-frontend-xhs.ps1`
  - builds and starts the frontend Docker container
- `windows/stop-stream-rec-frontend-xhs.ps1`
  - stops the frontend Docker container
- `windows/record-xhs-live.ps1`
  - standalone Xiaohongshu smoke-test recorder

These scripts are kept because they document the current verified Windows operation.

For Linux migration, treat them as behavior references, not as directly portable scripts.
