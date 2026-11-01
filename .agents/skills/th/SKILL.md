---
name: th
description: "/th · talk — read `000` and respond in that format"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/th` means **talk**: read `000` and respond in that format. Also means: *you
answered in prose — say that again in the standard format, same information*

Then resolve `000-th-how-to-talk.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 000-th-how-to-talk.md

It prints one path: the personal copy when there is one, the shipped copy otherwise.
If it exits non-zero the procedure is missing — say so. Never read one from each
place.
