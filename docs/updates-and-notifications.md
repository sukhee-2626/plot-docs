# Updates and Notifications Center

Plot Docs has an in-app notification bell and an update center. It combines two file-backed channels with a GitHub release check.

## User-facing behavior

- Bell in the tab strip, always visible.
- Red badge with unread notification count.
- Green dot when an update is available.
- Panel with two tabs:
  - **Notifications** — title, message, date, type, read/unread, delete.
  - **Updates** — GitHub release, local packages, progress, checksums, signatures, install confirmation, backup, restart, history.
- A toast appears when a new unread notification file is detected.
- **Update popup** — when a newer version is detected, a prominent card appears with the version, release-note summary, **View update**, **Later**, and close. It is shown once per version per app session (and again on the next launch while the update is still available). Opening the updates panel counts as acknowledgement and does not re-pop the same version.
- **Update hero** — the panel keeps a persistent “Update available · vX.Y.Z” strip above the tabs, so the update is visible even when Notifications is the selected tab. It becomes a “Restart to finish the update” strip with **Restart now** after installation.
- The bell opens the **Updates** tab directly when an update is waiting; otherwise it opens Notifications.
- Native OS notifications are shown when the app is not focused; clicking one opens the panel.

The panel is shell DOM. Editor documents are `WebContentsView` children that paint above shell DOM, so clicking the bell from a document tab first activates Home. The panel is intentionally hidden while a document tab is active.

## Update UX patterns borrowed from other desktop apps

We follow the common desktop pattern rather than inventing a new one:

| App | Pattern we adopted |
| --- | --- |
| VS Code | Quiet background check; badge the entry point; show a clear update notification; keep **Restart to Update** user-triggered. |
| Slack | Badge the help/bell entry point; open an update card with release information; offer **Restart to Apply Update** instead of forcing it. |
| GitHub Desktop | Separate “check”, “download”, and “install/restart” steps; never replace the running app without confirmation. |
| Chrome / Edge | Installer assets are download-only; the app does not silently execute them. |

What this means in Plot Docs:

1. The check is quiet and throttled (launch, manual, focus at most every 15 minutes).
2. A new version gets one visible popup plus a persistent badge/hero.
3. **Later** dismisses the popup for the current session; the update remains available in the panel.
4. **View update** opens the Updates tab with release notes, download progress, and install controls.
5. **Restart now** appears only after the replacement is installed; the app never restarts on its own.
6. Manual **Check** is always available in the panel, matching Slack’s Help → Check for Updates.

## Folder locations

| Mode | Updates | Notifications |
| --- | --- | --- |
| Development | `<repo>/updates` | `<repo>/notifications` |
| Packaged | `%APPDATA%\Plot Docs\updates` | `%APPDATA%\Plot Docs\notifications` |
| Packaged, if writable | `<exe folder>/updates` | `<exe folder>/notifications` |
| Override | `PLOTDOCS_UPDATES_DIR` | `PLOTDOCS_NOTIFICATIONS_DIR` |

Generated state:

- `updates/state.json` — installed records and update history
- `updates/logs/update.log` — append-only update log
- `updates/backups/` — pre-install executable backups
- `notifications/state.json` — read state, content hashes, deleted tombstones

These are ignored by Git.

## Notification files

A `.json` file directly inside the notifications folder can contain:

```json
{
  "title": "Backup complete",
  "message": "Your settings were saved.",
  "date": "2026-11-08T12:00:00.000Z",
  "type": "success"
}
```

Also supported:

- an array of objects
- `{ "notifications": [ ... ] }`

Fields:

- `title` / `heading` / `subject`
- `message` / `body` / `text` / `content`
- `date` / `createdAt` / `timestamp` (ISO or Unix timestamp)
- `type` — `info`, `success`, `warning`, `error`, `update`
- `read` — optional initial state
- `id` — optional stable id

Ignored files: dotfiles, `state.json`, `read-state.json`, `*.example.json`, `*.sample.json`, files over 1 MB, and malformed JSON. A malformed file is retried on the next watcher event.

Read state is keyed by notification id and content hash. If the file content changes, the notification becomes unread again. Deleting a notification from the panel removes the source JSON file after confirmation and stores a tombstone.

## Update packages

The updates folder accepts `.exe`, `.msi`, `.msix`, `.appx`, `.zip`, `.7z`, `.dmg`, `.pkg`, `.AppImage`, `.deb`, and `.rpm`.

Only a portable `.exe` can replace the running executable. Setup/installer/uninstall names are detected and marked download-only. The app never runs them automatically.

Version resolution order:

1. Matching JSON manifest `version`
2. File name, e.g. `Plot-Docs-1.0.1.exe`
3. Windows `VersionInfo.FileVersion`
4. Unknown version (still shown, with a warning)

Manifest:

```json
{
  "version": "1.0.1",
  "file": "Plot-Docs-1.0.1.exe",
  "sha256": "<64-char hex>",
  "releaseNotes": "Notes",
  "publishedAt": "2026-11-08T12:00:00.000Z"
}
```

Supported shapes: one object, an array, `{ updates: [...] }`, `{ files: [...] }`. A manifest without `file` applies to every package in the folder.

Statuses:

- `Available` — newer than the running version, or unknown version
- `Downloading` — GitHub stream in progress
- `Downloaded` — file present and ready
- `Installing` — replacement in progress
- `Installed` — replacement complete; restart required
- `Failed` — error shown, retry available

## GitHub release check

Default repository: `sukhee-2626/plot-docs`.

```text
GET https://api.github.com/repos/sukhee-2626/plot-docs/releases/latest
```

Headers:

- `Accept: application/vnd.github+json`
- `X-GitHub-Api-Version: 2022-11-28`
- `User-Agent: Plot-Docs-Updates`
- optional `Authorization: Bearer <token>`

Timing:

- once on launch
- manual **Check** button
- window focus, throttled to 15 minutes

No continuous polling.

Asset selection:

- Windows: `.exe`; portable names preferred over setup/installer names
- macOS: `.dmg`, then `.pkg`
- Linux: `.AppImage`, then `.deb`, then `.rpm`

Only `https://github.com`, `https://objects.githubusercontent.com`, `https://github-releases.githubusercontent.com`, `https://release-assets.githubusercontent.com`, and `*.githubusercontent.com` URLs are accepted.

If the API returns 404, the panel says no release has been published yet. Rate limits are shown with the reset time when available.

## Download and verification

1. The renderer asks main to download the currently checked release asset.
2. Main streams to `<file>.part`.
3. Progress is pushed to the renderer at most every 200 ms.
4. SHA-256 is computed while streaming.
5. If the release publishes a digest, it must match.
6. A `.part` file is removed on failure or on the next launch.
7. An existing file with the same name is reused only when its checksum matches. A concurrent download is rejected.

A 4 GB safety limit and a 10-minute timeout apply.

## Install and backup

Preconditions:

- explicit `confirmed: true`
- packaged app
- Windows
- portable `.exe`
- path inside a watched updates folder
- checksum match when a checksum is known
- signature not invalid
- unsigned acknowledgement when signature is unsigned/unknown

Replacement order:

1. Copy the current executable to `updates/backups/Plot-Docs-<version>-<timestamp>.exe`.
2. Rename the running executable to `<name>.old-<timestamp>`.
3. Copy the new executable into the original path.
4. If the copy fails, rename the old executable back.
5. Mark installed, record history, show **Restart now**.
6. On restart, `app.relaunch` starts the new executable.

The app does not restart automatically. This protects unsaved documents.

`PORTABLE_EXECUTABLE_FILE` is honored for electron-builder portable builds, so the portable wrapper is the file that gets replaced.

## Security model

- Renderer never sends file paths or download URLs. It sends opaque package ids and a folder kind.
- Main resolves every path from its own scan.
- Install paths must be inside a watched updates folder.
- Installer files are never executed.
- Invalid signatures are blocked.
- Unsigned files require an extra acknowledgement.
- User documents and settings are not modified.
- Smart App Control is not disabled by app code.
- GitHub tokens stay in the main process.

## IPC contract

Shared file: `apps/shell/src/shared/updates-center-api.ts`.

Channels:

- `updates-center:get-state`
- `updates-center:refresh`
- `updates-center:check-github`
- `updates-center:download-github`
- `updates-center:install-update`
- `updates-center:restart-app`
- `updates-center:mark-read`
- `updates-center:mark-all-read`
- `updates-center:delete-notification`
- `updates-center:open-folder`
- `updates-center:changed`
- `updates-center:open-requested`

Renderer API: `window.plotdocsUpdates`.

## Troubleshooting

**Bell does not appear**
- Check that preload exposed `window.plotdocsUpdates`.
- Check main logs for `[updates] failed to start`.
- In development, confirm `updates/` and `notifications/` exist.

**Notification does not appear**
- Confirm the file is directly in the folder and ends in `.json`.
- Confirm it is valid JSON and not named `state.json` or `*.example.json`.
- Check the file size (max 1 MB).
- Check `notifications/state.json` for a deleted tombstone.

**Update version is unknown**
- Add a manifest with `version`.
- Or rename the file to include the version.
- Or ensure Windows file version metadata exists.

**Install button is disabled**
- Installer/setup files are download-only.
- Development builds cannot replace `electron.exe`.
- Invalid signatures are blocked.
- Unsigned files require the acknowledgement checkbox.

**GitHub check fails**
- Publish a release; 404 is expected before the first release.
- Check network/proxy.
- Check rate limit.
- Set `PLOTDOCS_GITHUB_TOKEN` for private repositories or higher limits.

**Smart App Control blocks the downloaded exe**
- This is an OS trust decision outside the app.
- Use a signed build, or make the SAC decision yourself.
- Do not disable SAC in app code.
