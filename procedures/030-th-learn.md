---
thursday-note:
  desc: learn
  mechanical: true
thursday-revisit: 2026-11-11
verb: [/thlearn]
---

Concept: Thursday helps the user learn it, one addressable concept at a time.
`/thlearn` answers a question, teaches the concept they name, or walks them
through a task they set — and remembers what they already know.

## Why?

A skill loaded all at once is a manual nobody reads. The root skill says just
enough to start. Everything else should arrive when the user is ready for it, or
when they ask.

**Thursday does not teach. It helps people learn and remember.** The user is the
one doing the learning. Your job is to give them the smallest useful thing at the
moment it is useful, and then get out of the way.

Re-explaining is worse than not explaining. If they have seen it, skip it.

## The grammar

`/thlearn` takes one argument, and the argument decides the shape:

- nothing · the menu. One line per concept they have not seen, grouped by what
  they are doing. Never the whole index at once
- `5` · a tour by doing. Ask for a small real task they want, about 5 minutes.
  Do it with them, naming the Thursday workflows as they come up. One or two,
  no more
- `20` · the same, about 20 minutes. More of the workflow surfaces, still their
  task
- `<concept>` · that one concept, now, at any time, whether or not it was covered
- `<verb>` · that verb's meaning, its procedure, and the one mistake people make
  with it. A verb is also a concept name, so this is the same path
- a question · the answer, and the door. Nothing else

Teach the thing they named. Do not append a tour.

## The concepts

Each name resolves to a door. Give the idea, then name the door; do not inline the
procedure.

- `format` · the five sections, and why the shape never changes — `000-th-how-to-talk.md`
- `zoom` · a response is a tree; any part of it zooms one level, and collapses to
  a reference point — `000`, `010-th-situational-awareness.md`
- `verbs` · a prompt is a command; verbs sit inline and several can share one
  prompt — the root skill's verb table
- `scope` · `/thdoit` and `/thonly` answer the same question and differ in size.
  Learn them as a pair — the root skill
- `think-out-loud` · `/th` on a half-formed thought. Mirror it back, add nothing,
  act on nothing. This is the most-used verb and the least understood
- `session` · a goal, a bound, a post-brief — `015-th-session.md`
- `pause` · `/thpause` writes the resume point, `/thback` reads it — `020-th-pause-resume.md`
- `lost` · `/thlost` rebuilds session and project state and stops everything else
  — `010-th-situational-awareness.md`
- `log` · `/thlog` writes their words verbatim, into a thread — `025-th-log.md`
- `revisit` · a date on everything Thursday writes, three buckets, one next step
  each — `070-th-revisit.md`
- `feedback` · `/thfeedback` is about Thursday itself, not the work — `045-th-feedback.md`
- `procedures` · write your own, override any shipped one — `050-th-procedures.md`
- `proc` · `/thproc` turns a process that just ran into a procedure, from the
  transcript rather than from memory — `080-th-proc.md`
- `update` · `/thupdate` moves an installed Thursday forward: checkout, migrations,
  skills, version — `075-th-update.md`
- `lenses` · the lens that produced a decision, handed over — `060-th-lenses-intelligence.md`
- `intelligence` · person, script, heuristic, small model, frontier model. Pick the
  rung on purpose — `060-th-lenses-intelligence.md`
- `complexity` · complexity must be earned — `065-th-slop-complexity.md`
- `harness` · ignore it where it gets in the way, tap into it where it helps —
  `040-th-harnesses.md`
- `think-differently` · find the shape this person reads in — `090-th-think-differently.md`
- `scratch` · durable `scratch/` and revisit dates; temporary `<temp>/th-scratch` —
  the root skill

## How a lesson is shaped

1. One idea. A definition in one line, then why it exists.
2. One or two nodes they can zoom into, named.
3. One example from their project. If there is none yet, use the repo's own
   `procedures/skill-examples/`, which is what those files are for.
4. The door. A procedure path, or the example file. Do not paste its contents.
5. Stop. No summary of what was just said, no list of what is left.

## How a tour is shaped

1. Ask for the task, and the time bound. They set both.
2. Do it with them — real work, not a demo.
3. Name each Thursday workflow in one line as it comes up. Do not stop to teach.
4. Stop at the bound. Do not carry on because the task is nearly done.

## The prompt as a small DSL

A Thursday prompt is a command to a computer with natural language inside it. Verbs
are the command part:

- verbs sit inline, anywhere in the prompt
- more than one verb per prompt is normal: `/thlog scratch <idea>` then `/thdoit`
- the natural language between verbs is the instruction
- ambiguity gets a readback, not a guess

The format itself lives in `000-th-how-to-talk.md`. `/th` is the pointer.

## Suggesting verbs

While `/thlearn` is running, one of the five **FEEDBACK** items may name up to
three verbs, so the user can try them in the moment or build a longer prompt. It
is one item among the five, not a sub-list outside them.

- pick verbs that fit what they are doing now, or that unlock a longer prompt
- one line each: the verb, what it does, nothing else
- three is the cap. Fewer, or none, is fine
- never run a suggestion, and never treat it as permission — `000-th-how-to-talk.md`
- stop suggesting a verb once they use it or decline it

It is not a menu, and it does not appear outside `/thlearn`.

## Remembering

- one flag per concept, in the learned sidecar under `[paths].state`. Never rewrite
  the config; setup owns it
- a flag the config already carries counts as seen
- `learned.<concept>` is enough. Do not record what they thought of it

## Tones

- `/thlearn` · the menu, unread items only
- `/thlearn 5` · a small task they set, about 5 minutes, done with Thursday
  workflows
- `/thlearn 20` · the same, about 20 minutes
- `/thlearn <concept>` · that concept, now
- a question · the answer, then the door

## Harm reduction

Do not start an explanation during a crisis or mid-task. Offer it at a natural
boundary.

Never explain a concept twice unless asked. If they ask again, that is a signal the
first explanation was wrong, not that they forgot — give the example instead.

## Undo

Delete this file. Learned flags stay in the sidecar but nothing reads them.
