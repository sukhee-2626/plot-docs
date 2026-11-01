# Security and permissions

## Current trust model

Plot Docs Analytics is a local-first desktop workspace with one local operating
system user. It does not implement server-side accounts, organizations, roles,
SSO, or multi-tenant row-level security. Those are not claimed.

The Electron renderer is treated as untrusted for data mutation. The main process
validates IPC input and owns all file and SQLite access. The preload bridge
exposes only the typed analytics API.

## Data protection

- Analytics data lives under `userData/analytics/`, outside document files.
- Each dataset is a separate SQLite file; the original source is never edited.
- Cleaning creates a backup before mutation and supports one-step undo.
- Deleting a dataset removes its metadata, saved views, workflows, run history
  and analytics database files.
- Audit events record operations locally. They are not tamper-evident, signed,
  or exported to a compliance service.

## SQL and code execution

- SQL must start with `SELECT` or `WITH`; other statements are rejected.
- Read-only connections set `PRAGMA query_only = ON` and install an authorizer.
- Query result caps and export caps bound memory and output.
- Python is not arbitrary user code. The app generates a fixed aggregation and
  runs it in an isolated process with a timeout.
- Workflows call only the deterministic auto pipeline. They cannot contain SQL,
  scripts, or model-generated code.
- The Plot AI assistant cannot delete datasets, export files, or issue write SQL.

## Import and network controls

- URL import accepts public http/https addresses only.
- Localhost and private IP ranges are blocked.
- Redirects are bounded; timeouts and allowed ports are enforced.
- HTML page size and imported row counts are bounded.
- Database connectors use the existing connection handling; credentials are
  redacted in audit detail.

## AI boundaries

- Model output is untrusted.
- Model-proposed columns and cleaning steps are validated against the real schema.
- Model prose is attached only after local calculations finish.
- Scheduled runs disable model planning and interpretation.
- No provider credentials are stored by the analytics module; it reads the
  application's existing AI settings.

## Known security limitations

- No multi-user isolation, RBAC, SSO, audit export, or encryption-at-rest beyond
  the operating system and SQLite file permissions.
- No workspace sharing, approval workflow, or data-loss prevention.
- No signed audit ledger or remote monitoring.
- Connector credentials and AI provider calls depend on the surrounding app and
  were not penetration-tested here.
- The local operating system account can read the analytics store if it can read
  the userData directory.

These limitations are intentional for the current local-first increment and are
tracked in `docs/implementation/known-limitations.md`.
