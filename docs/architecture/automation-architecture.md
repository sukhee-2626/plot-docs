# Automation architecture

## What a workflow is

A workflow is a saved, repeatable instruction to run the existing deterministic
auto-analysis pipeline for one dataset. It is not arbitrary SQL, a Python script,
or model-generated code. The same `autoAnalyzeDataset` service used by **Run full
auto** is called with:

```ts
{
  prepare: workflow.prepare,
  interpret: false,
  understand: false,
}
```

`understand: false` prevents a planning model call. `interpret: false` prevents
an interpretation model call. The calculations and saved dashboard cards are
therefore reproducible without credentials and without model latency.

## Configuration

A workflow stores:

- dataset ID and display name
- local-time schedule: `manual`, `hourly`, `daily`, or `weekly`
- local hour (0–23) and weekday (0=Sunday … 6=Saturday) where applicable
- whether to remove exact duplicates before each run (off by default; the
  scheduled run is analysis-only unless the user opts in)
- retry count (0–3)
- enabled/paused state
- current version and next/last run metadata

Each saved configuration change creates a row in `workflow_versions`. Pausing and
resuming are configuration changes and increment the version. A manual workflow
never gets a `next_run_at` and is started only by **Run now**.

## Scheduling semantics

- The scheduler runs in the Electron main process while Plot Docs is open.
- It checks once shortly after startup and every 60 seconds thereafter.
- Daily and weekly schedules use the machine's local time.
- Hourly runs at the next local hour boundary.
- Manual workflows are never started by the scheduler.
- If the app was closed across a scheduled time, the overdue workflow runs once
  on the next launch. The following run is computed from the finish time, so a
  long backlog is not replayed.
- Runs are sequential. A running workflow is tracked in memory and is skipped if
  a later tick sees it again.
- If the app closes during a run, the next startup marks the stale `running`
  state as interrupted; the workflow remains available for the next schedule or
  a manual run.

## Failure and retry

The run attempts the pipeline once, then retries up to the configured count. Each
attempt is recorded in the run row. A failure stores the error, row counts,
elapsed time and attempt count, updates the workflow's last-run status, and still
computes the next scheduled time. A failed run does not delete the dataset or
its dashboards. There is no dead-letter queue or alert destination yet.

## Run history

`workflow_runs` stores:

- workflow and dataset IDs
- `ok` or `error`
- start/finish timestamps and elapsed milliseconds
- message and optional error
- insight count, saved-card count
- rows before and after (useful when duplicate preparation ran)
- attempt count

The UI shows the most recent runs and the version history for the selected
workflow. The audit trail also records workflow creation, updates, runs,
failures and deletion.

## Operational limits

- No OS-level background service: a closed app cannot run a workflow.
- No email, webhook, folder, Slack, Teams, or cloud destination.
- No approval queue or role-based release gate.
- No distributed scheduler, job queue, or cross-device coordination.
- A single local user; there is no organization tenancy.
- Schedules are local-time only; there is no explicit timezone selector.
- Hourly is the shortest interval.
