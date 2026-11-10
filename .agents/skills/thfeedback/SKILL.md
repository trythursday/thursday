---
name: thfeedback
description: "/thfeedback · feedback — file feedback about Thursday itself"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/thfeedback` means **feedback**: file feedback about Thursday itself

Then resolve `045-th-feedback.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 045-th-feedback.md

Follow its output. It prints the personal copy when there is one, the shipped copy
otherwise. If it exits non-zero the procedure is missing — say so. Never read one
from each place.
