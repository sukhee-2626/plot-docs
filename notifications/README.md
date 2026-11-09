# Notifications folder

Add a `.json` or `.txt` file here and Plot Docs shows it in the in-app bell panel immediately. The folder is watched with `fs.watch`; no polling is used.

This folder is also published to GitHub. If you push `not.txt` (or any `.txt` / `.json` file) into the repository's `notifications/` folder, every Plot Docs installation that checks GitHub sees it as an in-app notification. The app checks GitHub on launch, on **Check**, and on window focus (at most once every 15 minutes); it does not poll continuously.

## Where this folder is

- **Development:** the repository root `notifications/` folder (this folder).
- **Packaged app:** `%APPDATA%\Plot Docs\notifications` by default. A writable `notifications/` folder beside the executable is also watched.
- **Override:** set `PLOTDOCS_NOTIFICATIONS_DIR` to an absolute path before starting the app.

## Plain-text notifications

The simplest notification is `not.txt`:

```text
Maintenance tonight

Plot Docs will be read-only from 18:00 to 18:30 UTC.
```

The first non-empty line becomes the title; the rest becomes the message. You can also use a header block:

```text
Title: Maintenance tonight
Type: warning
Date: 2026-11-09T18:00:00Z

Plot Docs will be read-only from 18:00 to 18:30 UTC.
```

Or frontmatter:

```text
---
title: Maintenance tonight
type: warning
date: 2026-11-09T18:00:00Z
---

Plot Docs will be read-only from 18:00 to 18:30 UTC.
```

Supported types: `info`, `success`, `warning`, `error`, `update`.

## JSON file format

One notification:

```json
{
  "id": "release-1-0-1",
  "title": "Plot Docs 1.0.1 is available",
  "message": "Open the updates tab to review the release.",
  "date": "2026-11-08T12:00:00.000Z",
  "type": "update"
}
```

Several notifications in one file:

```json
{
  "notifications": [
    { "title": "Welcome", "message": "Your workspace is ready.", "type": "success" },
    { "title": "Backup complete", "message": "Your settings were saved.", "type": "info" }
  ]
}
```

An array at the top level is also accepted.

Fields:

- `title` — required in practice; defaults to `Notification`
- `message` / `body` / `text` — notification text
- `date` / `createdAt` / `timestamp` — ISO string or Unix timestamp; defaults to the file modification time
- `type` — `info`, `success`, `warning`, `error`, or `update`
- `read` — optional initial read state
- `id` — optional stable id

Read state and deleted-file tombstones are stored in `notifications/state.json`, which is ignored by Git. Deleting a local notification from the panel deletes its source file after confirmation.

Files ending in `.example.json`, `.sample.json`, `.example.txt`, and `.sample.txt` are ignored so templates do not appear in the panel.

## GitHub notifications

When the app checks GitHub, it also reads `notifications/` from the configured repository:

- `.txt` files use the plain-text/header/frontmatter formats above.
- `.json` files use the JSON formats above.
- Remote notifications can be marked read. The delete button is hidden because deleting the source would require write access to the repository.
- Undated remote notifications keep a stable first-seen date, so they do not become unread again on every check.

See `docs/github-update-notification-flow.md` for the complete flow and a Mermaid flowchart.
