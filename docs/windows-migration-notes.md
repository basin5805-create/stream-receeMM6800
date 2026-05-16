# Windows Migration Notes

This document exists to help a future Codex instance analyze the current Windows implementation before attempting Linux adaptation.

## Currently Verified Only On Windows

- frontend running in Docker while backend runs directly on the Windows host
- Xiaohongshu recording through the host backend plus `host/runtime-scripts/xhs_live_room.py`
- frontend startup through `scripts/windows/start-stream-rec-frontend-xhs.ps1`
- backend startup through `scripts/windows/start-stream-rec-host.ps1`
- helper fallback behavior that prefers Windows-friendly repo-local or system binaries

## Windows-Specific Implementation Details

- PowerShell scripts manage startup, shutdown, process lookup, and port checks
- frontend talks to backend with `host.docker.internal`
- the host backend script creates `python3.cmd` as a Windows shim
- the scripts assume `.ps1`, `.cmd`, and Windows path separators
- `Get-NetTCPConnection` and `Start-Process` are used in the host scripts

## Likely Linux Migration Risk Points

### Host / container networking

- `host.docker.internal` may behave differently on Linux
- the verified Windows flow relies on a Docker frontend reaching a host backend

### Script portability

- current authoritative startup scripts are PowerShell
- Linux will need shell equivalents or a compose-driven replacement

### Runtime path assumptions

- current scripts assume Java, Python, and ffmpeg can be discovered in Windows-style ways
- path quoting, executable discovery, and file permissions will differ on Linux

### Xiaohongshu helper chain

- `host/runtime-scripts/xhs_live_room.py` depends on:
  - Python
  - bundled vendor module `xhshow`
  - crypto package compatible with `Cryptodome`
- Linux packaging should verify imports, SSL behavior, and executable invocation carefully

### File naming and output behavior

- current Windows flow was tuned around Windows output paths and filename handling
- Linux may expose differences in path normalization, permissions, and mounted volume behavior

### Backend container parity

- a pure backend Docker path exists at the source level, but was not the primary verified Xiaohongshu runtime path on the source machine
- Linux migration should not assume parity without re-testing

## Known Executable / Script Dependencies

- PowerShell scripts:
  - `scripts/windows/start-stream-rec-host.ps1`
  - `scripts/windows/stop-stream-rec-host.ps1`
  - `scripts/windows/start-stream-rec-frontend-xhs.ps1`
  - `scripts/windows/stop-stream-rec-frontend-xhs.ps1`
  - `scripts/windows/build-host-jar.ps1`
  - `scripts/windows/record-xhs-live.ps1`
- Java runtime
- Python runtime
- ffmpeg
- Docker Desktop / Docker Engine

## Recommended Migration Order

1. read this repository and identify runtime boundaries
2. preserve frontend behavior first
3. preserve Xiaohongshu cookie and streamer workflow
4. reproduce backend build from source
5. replace Windows startup scripts with Linux-safe equivalents
6. validate Xiaohongshu recording behavior only after the baseline runtime is stable
