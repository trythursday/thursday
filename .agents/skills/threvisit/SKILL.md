---
name: threvisit
description: "/threvisit · revisit — show what is due, and plan for it"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/threvisit` means **revisit**: show what is due, and plan for it

Then resolve `070-th-revisit.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 070-th-revisit.md

It prints one path: the personal copy when there is one, the shipped copy otherwise.
If it exits non-zero the procedure is missing — say so. Never read one from each
place.
