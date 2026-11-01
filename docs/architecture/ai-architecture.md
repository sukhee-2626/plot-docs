# AI architecture

## Principle

The local engine calculates. AI explains, plans, or chooses among validated
operations. A model response is never treated as evidence and is never allowed
to invent rows, SQL results, or a successful action.

## Providers

Plot AI uses the existing application AI settings and model picker. Supported
paths are Soopus AI and OpenAI-compatible providers, including a local model
endpoint. The provider choice is shared with the document editors. No new
provider or duplicate credential store was introduced for analytics.

When no provider is configured, the workspace remains usable:

- **Run full auto** uses the deterministic local pipeline.
- Plot AI returns a local automation result and labels it **Local automation**.
- Inline question answering fails honestly instead of fabricating an answer.
- Model-assisted dataset understanding is optional; a local plan is used when it
  is unavailable.

Live provider calls require credentials and were not verified in this
environment without an authenticated account or API key.

## Orchestration layers

1. **Dataset understanding (`plan.ts`)** reads schema, profiles and sample rows,
   then proposes grain, roles, metric, dimension, time axis and preparation.
   Every column and operation is validated against the real imported schema.
   Invalid model output is replaced by a deterministic local plan.
2. **Assistant (`assistant.ts`)** exposes 25 tools over real application services:
   import, inspect URL, SQL, cleaning, joins, appends, ranking, pivot, funnel,
   cohort, correlation, outlier detection, forecast, charts, saved views, and the
   full auto pipeline. The `analytics-agent-v5` harness includes nine
   input/output training examples. Identical calls are blocked, tool errors are
   returned to the model with a retry instruction, and malformed plans get a
   bounded repair attempt.
3. **Interpretation (`interpret.ts`)** receives completed evidence and writes a
   plain-language reading. It cannot change calculations. If it fails, a local
   reading generated from the same evidence is shown with a note.
4. **Question answering (`ai.ts`)** can issue only validated read-only SQL through
   the local query tool. The returned rows and SQL remain visible.

## Safety properties

- Model output cannot execute arbitrary code.
- Model output cannot write SQL or delete datasets.
- SQL is validated and executed with a read-only authorizer.
- Cleaning operations are limited to the supported operation set and checked
  against real column names and types.
- Joins are limited to one validated key per side and inner/left semantics. They
  materialize a new dataset, never modify either source, and return the logical
  SQL plus key/collision warnings as evidence.
- Appends require the same column names on both sides, align columns by name,
  materialize a new dataset, and support `UNION ALL` (keep every row) or `UNION`
  (remove exact duplicate rows). Sources are never modified and the result is
  capped at 250,000 rows.
- Tool observations are bounded. Before a sample row or page preview reaches a
  model, obvious contact, payment and identifier columns/values are replaced
  with `[redacted]`; signed URL query strings and database passwords/secret
  parameters are removed. The full dataset and exact local result stay on the
  device. The assistant may still receive the schema, profile counts, bounded
  sample/query rows, and page content the user asked it to inspect, so arbitrary
  sensitive prose is not guaranteed to be classified.
- Workflow execution is deterministic and does not use model planning or
  interpretation, so a schedule cannot silently change its method.
- The assistant cannot export files, delete datasets, or bypass approval.
- Prompts and responses are subject to the existing application AI settings;
  analytics does not create a second logging or retention system.

## Failure behavior

| Failure | Behavior |
| --- | --- |
| No provider configured | Local automation / honest no-result message. |
| Provider timeout or error | Local fallback reading with the error noted. |
| Invalid plan | Validated local plan or omitted analysis. |
| Invalid SQL | Rejected before execution; no partial result shown. |
| Assistant tool failure | Error returned to the model for a bounded retry. |
| Model unavailable during a scheduled run | Scheduled runs do not call the model at all. |

## Not implemented

- Autonomous model-created workflows with approval gates.
- Model-generated transformation pipelines or arbitrary code execution.
- Semantic-model generation, vector search over data, or agent memory.
- Cloud AI audit export, per-organization policy, or data residency controls.
