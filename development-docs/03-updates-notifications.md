# Updates and Notifications Architecture

Detailed manual: `../docs/updates-and-notifications.md`

## Main process

`apps/shell/src/main/updates-center.ts`

- Resolves folders (dev repo root or packaged userData; optional exe-adjacent folder)
- Starts `fs.watch` watchers with 250 ms debounce
- Scans `/updates` and `/notifications`
- Persists update history/installed records to `updates/state.json`
- Persists notification read/deleted/hash state to `notifications/state.json`
- Checks GitHub releases on launch, manual request, and throttled focus
- Streams downloads to `.part`
- Verifies SHA-256
- Checks Authenticode best-effort
- Backs up and replaces the executable
- Requires user-triggered restart
- Pushes state to the renderer

`apps/shell/src/main/updates-center-core.ts`

Pure, Electron-free logic:

- Version normalization/comparison
- File-name version parsing
- Manifest parsing
- Package scanning
- Notification parsing/scanning
- Directory watcher
- SHA-256
- Executable replacement
- GitHub release parsing/asset selection
- URL allowlist

## Shared contract

`apps/shell/src/shared/updates-center-api.ts`

- `UpdatePackage`
- `InAppNotification`
- `UpdateHistoryEntry`
- `GithubReleaseInfo`
- `UpdatesCenterState`
- `UpdatesCenterApi`
- IPC channel names

## Preload

`apps/shell/src/preload/index.ts`

Exposes `window.plotdocsUpdates`:

- `getState`
- `refresh`
- `checkGithub`
- `downloadGithub`
- `installUpdate`
- `restartApp`
- `markRead`
- `markAllRead`
- `deleteNotification`
- `openFolder`
- `onChanged`
- `onOpenRequested`

## Renderer

`apps/shell/src/renderer/src/updates-center-client.ts`

- One module-level subscription to `onChanged`
- Shared cached state
- `useUpdatesCenter()` hook

`apps/shell/src/renderer/src/NotificationsCenter.tsx`

- Bell panel
- Notifications tab
- Updates tab
- Persistent update hero above the tabs when an update is available or a restart is pending
- Prominent `UpdateToast` popup with **View update**, **Later**, and close
- GitHub release card
- Local package cards
- Inline install confirmation
- Unsigned warning
- Progress
- Error/notice banners
- Restart banner
- History
- Folder paths
- Notification toast

`apps/shell/src/renderer/src/TabBar.tsx`

- Bell button
- Unread badge
- Update dot

`apps/shell/src/renderer/src/AppFrame.tsx`

- Owns panel open/tab state
- Activates Home before opening because editor WebContentsViews paint above shell DOM
- Listens for native-notification open requests
- Renders panel, notification toast, and update popup
- Wires **Restart now** to the main-process restart action
- Hides the update popup while the panel is open and counts the panel as acknowledgement

## Update flow

```text
launch / focus / manual check
  -> GET GitHub releases/latest
  -> compare tag version with app.getVersion()
  -> newer version: show update popup + bell dot + panel hero
  -> View update: open Updates tab with release notes + asset
  -> Later: dismiss popup for this session; update stays in the panel
  -> user clicks Download
  -> stream to .part + SHA-256
  -> verify published digest
  -> rename to final file
  -> user clicks Install
  -> confirm + unsigned acknowledgement
  -> check checksum/signature
  -> backup current exe
  -> rename current exe aside
  -> copy new exe into place
  -> mark Installed
  -> user clicks Restart
  -> app.relaunch + quit
```

## Local package flow

```text
drop .exe + optional update.json into /updates
  -> fs.watch
  -> scan manifest/filename/PE version
  -> show Available card
  -> user clicks Install
  -> same confirmation/backup/replace path
```

## Notification flow

```text
drop .json into /notifications
  -> fs.watch
  -> parse object/array/wrapped notifications
  -> merge read/deleted/hash state
  -> push state
  -> badge + toast + panel
  -> mark read / delete
  -> persist state
```

## Why no continuous polling

- GitHub is checked on launch, manual request, and focus (15-minute throttle).
- Folders use `fs.watch`.
- There is no `setInterval` release check.

## Security boundaries

- Renderer never supplies paths or URLs.
- Main scans and resolves everything.
- Install path must be inside a watched updates folder.
- Only portable `.exe` is installable.
- Installers are download-only.
- Invalid signatures blocked.
- Unsigned requires acknowledgement.
- No auto-run.
- No automatic restart.
- User data/settings untouched.
