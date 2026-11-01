---
thursday-note:
  desc: zone
  mechanical: true
thursday-revisit: 2026-11-11
verb: [/thzone]
---

Concept: Phase is in the user's head. Zone is the agent's behavior. The agent
proposes a zone, the user picks one, and nobody has to remember a mode.

## Why?

A mode the user has to recall is an escape hatch: they open it to get out of
friction, and autonomy arrives by accident. That fights the whole idea. Thursday
makes things deliberate, not easy.

So zone runs the other way. The agent names how much it is about to do, the user
chooses, and the choice stays with its owner. Autonomy is proposed, never seized
— see `060-th-lenses-intelligence.md`, where autonomy is earned, not granted.

## The rungs

Cheapest first. A rung is what the agent does, not what the user is thinking.

- **mirror** · explain and reflect, change nothing. The default until a goal
  exists.
- **confirm-each** · one step at a time, wait for `/thdoit`. The default once they
  start to execute.
- **bounded-run** · run an agreed batch, stop at a named boundary.
- **plan-run** · run the agreed plan, report at the end.

## Proposing and picking

- propose in **NEXT**, as the smallest set to pick from — never a menu
- the user may set a zone directly at any time. Always user in front seat
- a zone persists for the session, until the task changes or the zone changes
- when the task changes and the rung drops, say it aloud: _dropping to
  confirm-each_
- a higher rung needs a shared picture first. No shared picture, drop a rung —
  `060-th-lenses-intelligence.md`
- `/thlost` overrides every zone: interrupt and reorient, then re-propose

## `/thzone`

- no argument · report the current zone, one line
- a rung name · set it
- a question · answer it, nothing else

## Zone and scope

`/thdoit` and `/thonly` grant scope for **one readback**. Zone is the standing
default **between** readbacks. They are the same axis at two durations:

- `/thonly` ≈ `confirm-each` — one change, then done
- `/thdoit` ≈ `bounded-run` — the whole readback, stop at its boundary
- `plan-run` is the only one beyond a single readback, so it needs an agreed plan

After the readback ends, behavior falls back to the zone. `/thzone` sets that
standing default.

## Harm reduction

Proposing a higher rung must not widen the instruction the user gave. A zone is
not blanket permission for work they did not ask for — `005-th-guide-coding.md`.
Never climb for the user without asking. When in doubt, drop a rung.

## Undo

Delete this file. Nothing else reads it.
