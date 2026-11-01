---
name: thupdate
description: "/thupdate · update — move an installed Thursday forward: checkout, migrations, skills"
---

Load the Thursday root skill if it is not already loaded this session or since the
last compaction.

`/thupdate` means **update**: move an installed Thursday forward: checkout,
migrations, skills

Then resolve `075-th-update.md` and read it:

    <runtime> <install.repo>/scripts/th-proc.ts 075-th-update.md

It prints one path: the personal copy when there is one, the shipped copy otherwise.
If it exits non-zero the procedure is missing — say so. Never read one from each
place.
