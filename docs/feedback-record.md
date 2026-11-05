# Optional local machine feedback

This experiment provides a small JSON record alongside human `/thfeedback`.
It does not collect sessions, change confirmation rules, install a hook, or
upload anything. Use it only when the operator opts into measurement.

## Create and validate

From the repository root:

```sh
bun run scripts/feedback-record.ts --template
bun run scripts/feedback-record.ts --validate < examples/feedback-record.json
bun test scripts/feedback-record.test.ts
```

The first command prints a synthetic template. To keep a private record, redirect
it to an operator-chosen local destination outside the source repository. Replace
only observations supported by the harness/tool receipts and change `record_kind`
to `observed`. Unknown values stay `null`; a measured zero is `0`.

The validator reads at most 16 KiB of UTF-8 stdin. Success prints `{"valid":true}`
and exits 0. Invalid records print a bounded JSON error and exit 1, without echoing
input keys or values. No output file or network request is created. The validator
implements this flat versioned schema, not a general JSON Schema engine.

## Record contract

[JSON Schema](../schemas/feedback-record.schema.json) is the source of truth;
[the example](../examples/feedback-record.json) is deliberately unmeasured.
Every field is required, and extra fields are rejected. This limits accidental
raw-content inclusion; it is not a privacy audit or proof that a count is true.

| Field | Meaning |
|---|---|
| `schema_version` | `1` |
| `record_kind` | `synthetic_example` or `observed` |
| `workflow_mode` | `standard` or an explicitly authorized `scoped` workflow; the record grants no authority |
| `verification_boundary` | `none`, `unit_test`, `integration`, `deployment`, or `acceptance`: what was directly checked for the declared unit |
| `consumer_verified` | Whether an actual consumer/caller was exercised; `null` if unobserved |
| `confirmation_turns` | Observed turns requesting confirmation, without judging whether they were necessary |
| `source_bytes_returned` | UTF-8 source bytes actually returned to the agent, not source-file sizes or bytes read internally |
| `truncated_tool_results` | Observed tool results marked truncated |
| `repeated_unchanged_reads` | Repeated source reads only when unchanged input identity is known |
| `check_runs` | Executed verification attempts, including intentional failing tests |
| `failed_check_runs` | Attempts returning failure, including expected red tests |
| `expected_red_runs` | The failed attempts deliberately expected to fail; record separately so TDD is not mistaken for avoidable rework |
| `input_tokens`, `output_tokens` | Counts exposed by the harness, never estimates derived from bytes or text length |

All counters are non-negative safe integers or `null`. The validator checks
shape/types, not evidence authenticity or relationships between reported counts.
Human judgments such as "unnecessary confirmation" or "avoidable rework" belong
in a separate private review, not a machine counter pretending to be objective.

## A bounded experiment

1. Declare the task/unit and observation window privately before starting.
   Decide which counters the harness can actually expose. Keep unavailable or
   incompletely observed counters `null`, even if a partial count looks useful.
2. Record an agreed goal, first bounded change and success check. Carry confirmed
   scope forward; resolve changed decisions or authorization boundaries. This
   experiment does not change Thursday's defaults or authorize autonomous work.
3. Prefer the smallest complete change using existing patterns, including its
   affected consumers and fixtures. Check one verifiable unit before the next.
4. Bound source reads and inspect actual artifact/revision evidence. A passing
   helper test is not consumer integration; a passing build is not deployment.
   These boundary labels are not automatic whole-feature completion states.
5. Fill the record from observed receipts. Include failed/incomplete runs and
   keep expected-red checks visible. Compare matched tasks with the same
   model/settings before attributing time, token or rework differences to a tool.
6. Keep the record local. Inspect the exact aggregate and audience before any
   authorized sharing. Never automatically include transcripts, source, paths,
   credentials or raw tool payloads. Existing publication rules still apply.

This combines Thursday's scoped readbacks with the smallest-complete-change and
verifiable-unit ideas discussed in [issue 8](https://github.com/trythursday/thursday/issues/8).
It supplies a template and validation, not instrumentation or a measured saving.

Related principles: [Ponytail](https://github.com/DietrichGebert/ponytail) and
[pstack](https://github.com/backnotprop/pstack). No code or skill pack from those
projects is bundled here.
