---
thursday-note:
  desc: an optional small-task profile using existing procedures
  undo: delete this guide; it installs nothing
thursday-revisit: 2026-11-30
---

# A small-task profile

For a bounded change, try the smallest useful combination of Thursday's pieces.
Keep the response format and approval behavior you have configured. This guide
does not change the shipped defaults or authorize another task.

## Start with the work

Use one goal, one bounded change and one observable success check. When a short
readback resolves those, move to the user's decision. Keep explanations brief;
offer a lesson at a natural pause if the user wants one.

After the user authorizes the change, inspect the relevant implementation and
caller, use the existing project pattern, and check the affected behavior. For a
bug, reproduce it with a focused failing check before changing the behavior.
Retain project validation, security, accessibility and acceptance requirements.

Prepare needed local test setup once. Batch independent reads or final checks
when safe, and inspect every result. Keep dependent edits and failing/passing
checks in order. Rerun a passing check when a relevant change or unresolved
concern warrants it. Add cases for distinct risks, rather than a larger suite
solely to make the test count grow.

Stop at the verified unit and report the result, evidence and remaining gap.
Unit tests, caller integration and deployment are different evidence boundaries.
Keep useful decisions in the project's existing handoff or logging system.

## Fit it to an existing workflow

Reuse an installed specialist when it helps; another procedure need not restate
it. Broader dependencies, unclear failures or changed scope need a wider check.
Follow [procedure overrides](../procedures/050-th-procedures.md) to adapt the
pieces deliberately. Leave unrelated procedures and personal notes intact.

## Check whether it helped

Compare equivalent tasks/settings and preserve failed runs and unknown counters.
Fewer words, commands or tests alone do not demonstrate an improvement. Keep
correctness, human intervention and observable resource use together. See the
[measurement discussion](https://github.com/trythursday/thursday/issues/8).
