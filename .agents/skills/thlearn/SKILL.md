---
name: thlearn
description: "/thlearn · learn — answer what they want to know, hand them one new Thursday thing that improves their AI workflow, or walk them through..."
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/thlearn` means **learn**: answer what they want to know, hand them one new
Thursday thing that improves their AI workflow, or walk them through a task they set

Then resolve `030-th-learn.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 030-th-learn.md

It prints one path: the personal copy when there is one, the shipped copy otherwise.
If it exits non-zero the procedure is missing — say so. Never read one from each
place.
