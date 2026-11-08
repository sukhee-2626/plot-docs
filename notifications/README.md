# Notifications folder

Add a `.json` file here and Plot Docs shows it in the in-app bell panel immediately. The folder is watched with `fs.watch`; no polling is used.

## Where this folder is

- **Development:** the repository root `notifications/` folder (this folder).
- **Packaged app:** `%APPDATA%\Plot Docs\notifications` by default. A writable `notifications/` folder beside the executable is also watched.
- **Override:** set `PLOTDOCS_NOTIFICATIONS_DIR` to an absolute path before starting the app.

## File format

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

Read state and deleted-file tombstones are stored in `notifications/state.json`, which is ignored by Git. Deleting a notification from the panel deletes its source JSON file after confirmation.

Files ending in `.example.json` and `.sample.json` are ignored so templates do not appear in the panel.
