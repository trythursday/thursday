---
thursday-note: setup migration 0003
thursday-revisit: 2026-11-11
---

# 0003 · runtime, not bun

Idempotent. Running it twice is not a defect.

## Requires

- `install.version` at `0.2.0` or newer
- checkout at least `<commit>` — the short hash that carries `setup.ts`,
  `th-proc.ts`, and `gen-th-skills.ts` running on node as well as bun

Before it, the config recorded `[install].bun_path`, a path to bun, and setup
baked `<bun> run <resolver>` into every generated skill. That is correct only
while bun is the runtime.

After it, the config records `[install].runtime`: the interpreter that ran
setup, written as a command prefix. `bun run`, or the path to node. The generated
skills bake that instead, so an install that runs on node keeps working.

Nothing in the personal dir changes. The user's procedures, notes, and scratch
are not touched.

## Resolve

Read these from the config; never hardcode.

- `[paths].root` · the install root
- `[install].repo` · the checkout
- `[install].skills` · one entry per harness
- `[install].bun_path` · the bun that ran setup; carries over as the runtime
- `[personal].procedures` · where the copies live

## Steps

**1. Move the checkout first.**

Everything after this assumes the new rules exist.

```sh
git -C <root>/checkout fetch --quiet origin
git -C <root>/checkout merge --ff-only <commit>
```

- if the checkout has local changes, stop and say so. Never stash, never discard
- if the merge is not fast-forward, stop. The user is ahead of the release; ask,
  do not reset

**2. Re-run setup.**

It rewrites the config with `[install].runtime` and regenerates every skill from
the new checkout in one pass:

```sh
<install.bun_path> run <root>/checkout/scripts/setup.ts \
  --personal <personal> --skills-dir <each skills dir> --yes
```

Whoever runs setup is who gets recorded. Run it with the runtime the user
actually uses:

- bun · `[install].runtime = "<bun> run"`
- node 24+ · `[install].runtime = "<path to node>"`

**3. Settle the personal copies that still describe `bun_path`.**

Your `procedures/` was materialized once and never overwritten, so
`035-th-setup.md` and `075-th-update.md` may still carry `bun_path`. Setup cannot
tell a stale copy from your own edit — it only knows a file is there — and an
install this old has no record to compare against, so it will not touch them.

Settle them by hand. `cmp` prints nothing when the copies are identical, which
means the file is stale and not yours:

```sh
for f in 035-th-setup.md 075-th-update.md; do
  printf '%s: ' "$f"
  git -C <root>/checkout show <previous version commit>:procedures/$f \
    | cmp -s - <personal>/procedures/$f \
    && echo "stale, safe to replace" || echo "edited, or older — ask"
done
```

Replace the stale ones with the copies from the new checkout. For anything that
differs, name the file and ask; do not overwrite it.

**4. Record it, so this is mechanical next time.**

```sh
<install.runtime> <root>/checkout/scripts/setup.ts --refresh-shipped
```

Setup now records a hash of every procedure it writes. A copy matching its record
is one setup wrote and you have not touched: `--refresh-shipped` replaces those
from the checkout, and names everything it leaves. The copies you replaced in step
3 are identical to the shipped file, so this records them, and the next release
needs no hand-work.

Anything it reports as `left alone` had no record. On an install this old that is
expected, once.

**5. Update the config.**

`install.bun_path` is gone; `install.runtime` is there instead. Confirm both. If
a hand-edited config ended up with neither, set `runtime` to `<bun> run`.

## Verify

- `install.version` in the config reads `0.2.0`
- `install.runtime` is set, and running it against the resolver prints one path:

  ```sh
  <install.runtime> <root>/checkout/scripts/th-proc.ts 000-th-how-to-talk.md
  ```

- no generated skill still carries a runtime this install does not have.
  `rg -l "th-proc.ts" <skills dir>` lists the verb skills; each names
  `<install.runtime>`
- `state/install.json` has a `procedures` list, one entry per shipped procedure
  with its hash. Running `--refresh-shipped` again reports every file as
  `current`, and none as `left alone`

## Undo

- set `install.version` back to `0.1.2`, remove `runtime`, and put
  `bun_path = "<bun>"` back by hand
- regenerate the skills from a worktree at the previous commit. A generator older
  than `0.2.0` takes `--bun <runtime>`, not `--runtime`:

  ```sh
  git -C <root>/checkout worktree add <temp>/th-prev <previous commit>
  <bun> run <temp>/th-prev/scripts/gen-th-skills.ts --out <skills dir> \
    --repo <root>/checkout --bun <bun>
  git -C <root>/checkout worktree remove <temp>/th-prev
  ```

- the checkout stays at the new commit. This is not a rollback of Thursday

## Harm reduction

- the only writes are the config and the skill files. Nothing in the personal dir
  is touched
- a node user who reverts gets bun-shaped skills back. Those will not run unless
  bun is installed; say that before starting, not after
- if the checkout will not move cleanly, stop and say so. Updating by force is
  how someone's local work disappears
