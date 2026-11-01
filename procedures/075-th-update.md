---
thursday-note:
  desc: update
  mechanical: true
thursday-revisit: 2026-11-11
verb: [/thupdate]
---

Concept: Move an installed Thursday forward without reinstalling it. The checkout
moves, the pending migrations run, the skills regenerate, and the old version is
named before anything is written.

## Why?

Thursday ships procedures and skills, and they change together. Without a verb,
updating is a git command someone has to remember, followed by a generator they
have to know exists.

An update is not an install. The root, the personal dir, and the user's edits all
stay. Only the checkout, the generated skills, and the copies setup materializes
change.

## What it changes

| thing | changes |
| --- | --- |
| `<root>/checkout` | fast-forward to the new commit |
| generated skills | rewritten from that checkout |
| `<personal>/procedures/` | gains shipped procedures it does not have; existing copies are never overwritten |
| config `install.version` | the new version |

Nothing else. Console history, shell profiles, and the user's own procedures are
not touched.

## General procedure

1. Read the config. Report the installed version, the checkout path, the runtime,
   and every skills dir. If there is no config, this is an install, not an update:
   point at `035-th-setup.md` and stop.
2. Read back and wait. An update writes to an install the user relies on.
3. Stop, and say why, if any of these is true:
   - `git -C <checkout> status --porcelain` is not empty. Never stash, never reset
   - the checkout is not a git repository
   - the network is unreachable
4. Move the checkout first. The rules the update applies have to exist before it
   applies them:
   ```sh
   git -C <checkout> fetch --quiet origin
   git -C <checkout> merge --ff-only <target>
   ```
   If the merge is not fast-forward, the user is ahead of the release. Ask; do not
   reset.
5. Read `<checkout>/procedures/migrations/` and name every one newer than the
   installed version. Each migration says what it changes and what happens to a
   user's copy.
   - if every pending one is mechanical, one run covers them all:
     ```sh
     <install.runtime> <checkout>/scripts/setup.ts --personal <personal> \
       --skills-dir <each> --yes
     ```
   - if one names a human decision, follow that migration by hand first, then run
     setup. Do not skip it because setup succeeded
6. Refresh the shipped copies setup wrote, when the release changed a procedure.
   Setup never overwrites a copy that is already there, so an edited procedure
   stays put — and a stale one stays stale:
   ```sh
   <install.runtime> <checkout>/scripts/setup.ts --refresh-shipped
   ```
   It replaces the copies whose hash still matches the one setup recorded, and
   names every file it leaves. Read those names out. A file it leaves with no
   record predates the manifest; `migrations/0003-runtime.md` says how to settle
   those by hand
7. Verify:
   - `<install.runtime> <checkout>/scripts/th-proc.ts --list` resolves every
     procedure, and says `personal` for the ones setup materialized
   - the generated skills contain the resolver, not a fallback list
   - `install.version` in the config is the new version
8. Report old version to new version in one line, and what was refreshed. Do not
   narrate the steps that needed no decision.

## Harm reduction

- Always say the revert point before step 4: the current commit, the version, and
  the fact that `state/install.json` names every skill entry written.
- Never `git reset`, never `git stash`, never force a merge. If the checkout does
  not move cleanly, that is the answer.
- A shipped procedure update does not reach a personal copy the user has edited.
  Name the file and ask; do not overwrite it.
- If the update fails halfway, the checkout is still at a commit and the skills
  still regenerate from it. Say which of those is true.

## Undo

- set `install.version` back by hand
- regenerate the skills from a worktree at the previous commit:
  ```sh
  git -C <checkout> worktree add <temp>/th-prev <previous commit>
  <install.runtime> <temp>/th-prev/scripts/gen-th-skills.ts --out <skills dir> \
    --repo <checkout> --runtime <install.runtime>
  git -C <checkout> worktree remove <temp>/th-prev
  ```
  a generator older than `0.2.0` takes `--bun <runtime>` instead of `--runtime`
- the copies setup materialized stay. They are files in the user's dir now; remove
  only the ones they did not edit, and say which those are
- the checkout stays at the new commit. This is not a rollback of Thursday

Delete this file and the `/thupdate` skill. Updating goes back to being a git
command and a generator someone has to remember.
