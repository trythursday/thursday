---
thursday-note:
  desc: log
  mechanical: true
thursday-revisit: 2026-11-11
verb: [/thlog]
---

Concept: The durable stream of the user's own thoughts as they work. `/thlog`
writes it down and returns.

## Why?

The agent's output is not the precious thing. The user's thinking is. A log entry
costs three seconds and survives compaction, restarts, and the user's own memory.

It is also the cheapest way to keep a tangent from becoming a task: the thought
gets captured without derailing the current work.

## General procedure

1. Write exactly what the user said. **Verbatim. No commentary, no cleanup, no
   paraphrase.**
2. Do not act on it. `/thlog` is a write and a return, nothing else.
3. Put it where the current work says: the user's Thursday dir, the repo's
   `scratch/`, or the file under discussion. Prefer theirs. If it is genuinely
   unclear, ask once.
4. Timestamp it. One line of context around it is allowed — the date, the file,
   the goal it belongs to — but never a summary.
5. Say where it went, in one line.
6. Do not ask whether they want it committed. Scratch is not committed unless
   they say so.

## Skipping the ambiguity

The user can name the destination inline, in natural language:

```
/thlog scratch idea-expander should probably become one tool with this-to-that
/thlog ~/th the interview story needs a shorter version
/thlog tree brainstorming split points is a harm reduction idea
```

Everything before the idea is the destination. Everything after is the entry,
verbatim. Do not over-parse — take the first plausible destination phrase, and if
it is ambiguous enough that you would have to guess, ask once instead.

Without a destination, fall back to step 3.

## Threads

A thread is a durable line of thinking that outlives one session. Log entries land
in one.

- organise however the user likes: by topic, by person, by project, by vibe
- the only real rule is retrieve-ability. If they cannot find it later, the
  organisation failed
- duplication across threads is fine. These are views over crisscrossing data, not
  a taxonomy
- a thread can be a single file, a dir, or one line in a bigger note
- name a thread for how the user would look for it, not for how it is structured

The user's threads dir is the example: `<threads>/<thread>/`, with a `personal/`
dir for anything about a person. A scratch tree lives at
`<threads>/personal/scratch/tree.md`.

When the user logs something, prefer an existing thread over making a new one.
Create a new thread only when the entry would be hard to find inside any existing
one — and say which thread you chose.

## Shape

```md
- `2026-10-19 14:02` [project] the exact words the user typed
```

An idea is a leaf: a thing nothing is built on yet. If a log entry never grows
into anything, that is a fine outcome.

## Harm reduction

Logging must never interrupt flow. One write, one line back, carry on.

## Undo

Delete this file. Log entries already written belong to the user's threads and are
never removed by removing this procedure.
