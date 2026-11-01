---
name: thpause
description: "/thpause · leave — write the resume point; stop"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/thpause` means **leave**: write the resume point; stop

Then resolve `020-th-pause-resume.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 020-th-pause-resume.md

It prints one path: the personal copy when there is one, the shipped copy otherwise.
If it exits non-zero the procedure is missing — say so. Never read one from each
place.
