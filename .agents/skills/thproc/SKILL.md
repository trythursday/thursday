---
name: thproc
description: "/thproc · record — turn a process that just ran into a procedure, or scaffold one about to"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/thproc` means **record**: turn a process that just ran into a procedure, or
scaffold one about to

Then resolve `080-th-proc.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 080-th-proc.md

It prints one path: the personal copy when there is one, the shipped copy otherwise.
If it exits non-zero the procedure is missing — say so. Never read one from each
place.
