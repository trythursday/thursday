---
name: thback
description: "/thback · return — read the resume point; report state before acting"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/thback` means **return**: read the resume point; report state before acting

Then resolve `020-th-pause-resume.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 020-th-pause-resume.md

Follow its output. It prints the personal copy when there is one, the shipped copy
otherwise. If it exits non-zero the procedure is missing — say so. Never read one
from each place.
