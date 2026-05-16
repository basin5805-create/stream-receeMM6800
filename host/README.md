# Host Directory

This directory does not contain a full runtime snapshot.

For this Linux-migration-oriented repository, only the helper material that documents the current Windows host flow is kept here:

- `runtime-scripts/xhs_live_room.py`

Why the runtime snapshot was removed:

- database snapshots are machine-specific
- bundled cookies and secrets should not be the migration baseline
- large runtime outputs and logs would make the repository noisy

If a future maintainer needs to reproduce the current Windows-host runtime exactly, they should:

1. build the backend jar from `backend/`
2. create a fresh runtime directory under `runtime/`
3. use the scripts in `scripts/windows/`
