# Updates folder

Drop a portable Windows `.exe` (or another package for manual use) in this folder. Plot Docs watches it and shows an update card in the bell panel.

## Where this folder is

- **Development:** the repository root `updates/` folder (this folder).
- **Packaged app:** `%APPDATA%\Plot Docs\updates` by default. A writable `updates/` folder beside the executable is also watched.
- **Override:** set `PLOTDOCS_UPDATES_DIR` to an absolute path before starting the app.

Generated files (`state.json`, `logs/`, `backups/`, `*.part`) are ignored by Git and by the scanner.

## Manifest (optional but recommended)

A JSON manifest gives the update a version, checksum, and release notes. The file name can be `update.json`, `latest.json`, or any `*.json` name that is not `state.json`, `package.json`, or `*.example.json`.

```json
{
  "version": "1.0.1",
  "file": "Plot-Docs-1.0.1.exe",
  "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "releaseNotes": "Fixes and improvements.",
  "publishedAt": "2026-11-08T12:00:00.000Z"
}
```

If no manifest exists, Plot Docs tries to read the version from the file name and then from the Windows file version metadata.

## Statuses

`Available` → `Downloading` (GitHub only) → `Downloaded` → `Installing` → `Installed`, or `Failed` with the error shown in the panel.

## Safety rules

- The app never runs an installer automatically.
- Only a portable `.exe` can replace the running executable.
- Installation requires explicit confirmation.
- The previous executable is copied to `updates/backups/` before replacement.
- A published SHA-256 is verified before install.
- Windows Authenticode is checked best-effort. Invalid signatures are blocked. Unsigned files require an extra acknowledgement.
- The app must be restarted before the new executable runs. Documents and settings are not touched.
- Smart App Control may still block an unsigned executable at the operating-system level. That is outside the app; use a signed build or make the OS trust decision yourself.

## GitHub releases

The app checks `https://api.github.com/repos/sukhee-2626/plot-docs/releases/latest` on launch, on demand, and on window focus (throttled to once every 15 minutes). It does not poll continuously.

Publish a GitHub release whose tag is the version, for example `v1.0.1`, and attach a portable asset such as `Plot-Docs-1.0.1.exe`. Newer GitHub API responses include a `digest` field; when present it is checked as SHA-256. If no digest is published, the panel marks the download unverified and asks for confirmation before install.

Environment overrides:

- `PLOTDOCS_GITHUB_REPO` — `owner/repo`
- `PLOTDOCS_GITHUB_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN` — optional token for private repositories or higher rate limits
- `PLOTDOCS_UPDATES_DIR` — absolute updates folder
- `PLOTDOCS_NOTIFICATIONS_DIR` — absolute notifications folder

## Duplicate downloads

A release asset with the same file name is reused when its published checksum matches. A concurrent second download is rejected while the first is in progress. Interrupted `.part` files are removed on the next launch and the download can be retried.
