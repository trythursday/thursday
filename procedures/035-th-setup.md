---
thursday-note:
  desc: setup
  mechanical: true
thursday-revisit: 2026-11-11
---

Concept: Set Thursday up in one pass, on any platform, and name the delete for
everything it creates.

## Why?

Setup and teardown are symmetric. A user should be able to get rid of Thursday at
any point without hunting for what it left behind. Every install path names its
own undo.

Setup is also the only thing that writes `thursday.toml`. One writer, many
readers.

The same experience on Linux, macOS, and Windows. Nothing in the instructions
should assume one of them.

## Resolve paths first

Never hardcode a path. Resolve, then write the absolute result into the config.

**Thursday root** — everything the install owns lives under one directory

- Linux · `${XDG_DATA_HOME:-~/.local/share}/thursday/`
- macOS · `${XDG_DATA_HOME:-~/Library/Application Support}/thursday/`
- Windows · `%LOCALAPPDATA%\thursday\`

Honor `XDG_DATA_HOME` if set, on any platform. That is the escape hatch for
people who keep their dotfiles in one place.

Inside the root:

```txt
thursday.toml        the only static path; everything else resolves from it
checkout/            git clone of thursday
state/               usage sidecar, logs, caches, schedules
state/install.json   exactly what setup wrote, and where
state/session.json   the open session block, if any
.gitignore           ignores checkout/ and state/
```

The `.gitignore` exists so a dotfiles repo that swallows `~/.local/share` leaves
the clone and the state out. `thursday.toml` stays tracked: it is the one file
worth restoring on a new machine.

**Personal dir defaults** — the user's own procedures, scratch, and notes. Kept
outside the root so it survives a reinstall.

- Linux · `~/th`
- macOS · `~/Documents/Thursday`
- Windows · `%USERPROFILE%\th`

**Temp scratch** — `<system temp>/th-scratch`, `/tmp/th-scratch` on Unix,
`%TEMP%\th-scratch` on Windows.

Resolve all of these through the platform's own conventions, then store absolute
paths in the toml. Do not store `~` or `%VAR%` — they do not expand consistently.

## General procedure

1. **Open with a readback.** Read `000-th-how-to-talk.md` first. The install is
   not an exception to the format, and the first turn explains what is about to
   happen before anything is written:
   - **READBACK** · open with "Welcome and thank you for trying Thursday." Then
     the install in one line, in their terms
   - **PICTURE** · the four things that will be written, and where
   - **NEXT** · the one question: where their personal state should live
   - **DATA** · what will not be touched — shell profile, git config, other
     skills — and the undo for each thing written
   - **FEEDBACK** · nothing yet unless something is genuinely unclear
   Nothing is created until they answer. Do not greet separately; the greeting is
   the READBACK line.
2. **Detect the platform.** OS, shell, and where their agent loads skills.
   Ask only if detection is genuinely ambiguous.
3. **Read the config.** If it exists and is current, say so and stop — this is
   not a reinstall.
4. **Ask one question.** Where should personal Thursday state live? Offer the
   platform default first, the other common option second.
   - Linux · `~/th` or `~/Documents/Thursday`
   - macOS · `~/Documents/Thursday` or `~/th`
   - Windows · `%USERPROFILE%\th` or `Documents\Thursday`
   Do not ask anything else yet.
5. **Get a runtime.** `sh scripts/bunstrap.sh` on Unix,
   `powershell -File scripts\bunstrap.ps1` on Windows. It uses a bun that is
   already on PATH, and otherwise installs a pinned version into the root's own
   `bin/`. If the user does not run bun but has node 24 or newer, it uses node
   instead and installs nothing. Never install a runtime system-wide and never
   edit a shell profile.
   If bunstrap cannot reach the network, say so and fall back to writing the
   files by hand from the rules in `050-th-procedures.md`; a real user got a
   working install that way.
6. **Create the root.** Everything below names something in the undo, so each one
   is created explicitly:
   - the root, `state/`, and `.gitignore`
   - `checkout/` — a git clone of Thursday. If it is already there, leave it and
     say so; a second run is not a reinstall
   - the personal dir, and `scratch/` and `procedures/` inside it
   - copy the shipped procedures into `procedures/`, leaving every file that is
     already there untouched. After this the personal dir holds the whole set,
     the checkout is only the fallback, and a procedure update never lands in a
     copy the user has edited — a migration says what to do with that copy
7. **Write the config.** The single static path resolved above. Everything else
   resolves from it. See the shape below.
8. **Install the skills.** From the checkout, copy
   `.agents/skills/thursday/SKILL.md` into every skills dir the user gave, and run
   `scripts/gen-th-skills.ts --out <skills dir>` with the runtime from step 5, for
   each. One user can have several harnesses; ask whether there are more than one
   before installing. See `040-th-harnesses.md` for where each harness keeps them.
9. **Offer the default, once.** The install is a skill the user triggers; that is
   the default unless they say otherwise. Right after it works, ask once whether
   they would like Thursday to be the default mode in their harness.
   - yes · register the load hook or persona, and name the undo
   - no · accept it and move on. Do not ask why
   Ask again only after they have used Thursday to finish five goals. That is when
   it is fair to ask what would have to change. See `045-th-feedback.md`.
10. **Turn off yolo mode.** One of the first things. Make the shell tool
   always-ask, and say the exact setting for their shell:
   - bash / zsh · the harness's confirmation setting, or a wrapper
   - fish · same, via `fish` config if the harness uses it
   - PowerShell · same, via the harness's setting
   - Windows native without a POSIX shell · the harness's command tool
   Taking back situational awareness is the point. They can re-enable
   auto-accept deliberately when they want a burst of autonomy.
11. **Verify.** Read the config back, list the generated skills, and check that
    every skill pointing at a procedure resolves through the resolver:
    `<install.runtime> <install.repo>/scripts/th-proc.ts <file>`. Exit 1 means it
    is missing. Run it once per procedure; do not check both directories by hand.
12. **Close the first run.** Tell them Thursday is meant to be inobtrusive and
    disrupt their workflow as little as possible. The only thing to remember:
    type `/thursday` at any time — mid-session, fresh session, brand-new
    project — then vibe like normal. After they install it: you can type
    `/thlearn` at any time to learn more about Thursday.

## Config shape

```toml
# resolved per platform — see "Resolve paths first"
[install]
repo = "/home/sid/.local/share/thursday/checkout"
version = "0.2.0"
skills = [
  "/home/sid/.commandcode/skills",
  "/home/sid/.config/opencode/skills",
]
runtime = "bun run"  # or the path to node, e.g. "/usr/local/bin/node"
platform = "linux"   # linux | darwin | win32

[personal]
dir = "/home/sid/th"
procedures = "/home/sid/th/procedures"
scratch = "/home/sid/th/scratch"
scope = "global"     # or "repo"

[paths]
root = "/home/sid/.local/share/thursday"
state = "/home/sid/.local/share/thursday/state"
temp = "/tmp/th-scratch"

[learned]
spiel = false
lenses = false
```

Rules:

- `[personal].dir` and `[personal].procedures` are the only copies an agent reads.
  Setup materializes the shipped procedures there once, so the personal dir is
  complete; a file already present is never overwritten
- `install.repo` is the shipped checkout. It is the fallback for a procedure name
  the personal dir does not have, and the source setup copies from
- never write the user's state, notes, or scratch into `install.repo`; it is a
  clone, and a checkout update would lose them
- `install.skills` is a list, one entry per harness. A user with Claude Code and
  OpenCode gets the same procedures installed in both; the config is the only
  place that knows about either
- `install.runtime` is the interpreter that ran setup, written as a command
  prefix: `bun run`, or the path to node. Use it for later runs instead of
  re-detecting, so a bootstrapped bun in `<root>/bin` keeps working
- `install.platform` lets later migrations branch without re-detecting
- the config is written by setup only
- usage and learning state go in an append-only sidecar in `[paths].state`, not
  in the file itself
- paths are absolute. If the user moves the root, setup rewrites these fields;
  nothing else needs to know.

## Migrations

Setup is a sequence of migrations, not one script. Each migration is a file in
`migrations/`, numbered, and does one thing.

- `0001-setup.md` · first install
- `0002-materialize.md` · copy the shipped procedures into the personal dir
- `0003-runtime.md` · record the runtime that ran setup, not a bun path
- `TEMPLATE.md` · the shape to copy for every one after it
- **the first step is always the checkout.** A migration names a commit and moves
  `<root>/checkout` to at least that commit before touching anything. The rules
  it applies have to exist before it applies them. Never stash or discard local
  changes to get there; stop and say so
- each later one names what it changes and what to do with older procedures
- a migration is idempotent: running it twice is not an error
- when a procedure changes shape, the migration says what happens to a user's
  copy
- a migration that touches the filesystem resolves paths the same way setup does,
  and works on all three platforms

## Harness specifics

See `040-th-harnesses.md` for:

- how to register the load hook, so `/thursday` does not have to be remembered
- how to set up a persona so the user starts in Thursday mode

## Harm reduction

Do not install anything the user did not ask for. Do not edit shell profiles,
git configs, or global ignores without saying so first.

## Undo

`state/install.json` is the record: the root, the personal dir, every skill
directory with the exact entries written into it, and every shipped procedure with
the hash of the copy setup wrote. Undo reads the first half; `--refresh-shipped`
reads the second. Run it before deleting the root — once the root is gone, the
record is gone.

Say this out loud during setup, not just in a file. Give the command for their
platform.

- `scripts/setup.ts --undo` · removes Thursday's entries from every harness it
  wrote to, then the root
- delete the personal dir → removes the user's procedures, scratch, and notes.
  Setup never writes there except to create the folders, but it is their content,
  so it needs `--purge-personal` instead of being swept up

Nothing else was written. No shell profile edits without asking.

