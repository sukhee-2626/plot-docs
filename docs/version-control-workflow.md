# Version Control and GitHub Release Workflow

This document explains how Plot Docs is versioned, how updates reach users, and how to publish a release that the in-app update center can detect.

## 1. Repository

- Origin: `https://github.com/sukhee-2626/plot-docs.git`
- Default branch: `main`
- App version source: root `package.json` and `apps/shell/package.json`
- Current release channel: portable Windows `.exe` plus optional installer artifacts

The app does **not** install every commit. A commit is source history. An update is a **GitHub release** with a newer version tag and a downloadable asset.

## 2. Daily development

```powershell
cd C:\Users\HP\ss-office
git status --short
git diff
git add <files>
git commit -m "feat(updates): add notification center"
git push origin main
```

Rules:

- Commit one logical change at a time.
- Never commit `updates/state.json`, `updates/logs/`, `updates/backups/`, `updates/*.part`, or `notifications/state.json`.
- Never commit a downloaded `.exe` unless the user explicitly asks for a release artifact in the repository.
- Keep unrelated uncommitted work intact. Run `git status` before staging.
- Use conventional commit prefixes: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.

## 3. Version numbers

Use semantic versioning:

- `MAJOR` — breaking changes
- `MINOR` — new features
- `PATCH` — fixes

Before a release:

1. Update `package.json` version.
2. Update `apps/shell/package.json` if it carries its own version.
3. Rebuild the app.
4. Verify `app.getVersion()` returns the new version.

The update center compares the installed version with the GitHub release tag. Tags must look like `v1.0.1` or `1.0.1`.

## 4. Build the Windows artifact

```powershell
npm run dist:portable -w @plotdocs/shell
```

The `dist:portable` script generates third-party notices, builds every editor module
plus the shell, and writes the portable artifact to
`apps/shell/release-portable/`. It is the supported portable build command.

Expected output:

```text
apps/shell/release-portable/Plot-Docs-<version>.exe
```

Record the SHA-256:

```powershell
Get-FileHash apps/shell/release-portable/Plot-Docs-1.0.1.exe -Algorithm SHA256
```

## 5. Create a GitHub release

### Option A — GitHub website

1. Open the repository on GitHub.
2. Go to **Releases → Draft a new release**.
3. Create tag `v1.0.1` from `main`.
4. Title: `Plot Docs 1.0.1`.
5. Add release notes.
6. Attach `Plot-Docs-1.0.1.exe`.
7. Publish the release.

### Option B — GitHub CLI

```powershell
gh release create v1.0.1 `
  apps/shell/release-portable/Plot-Docs-1.0.1.exe `
  --title "Plot Docs 1.0.1" `
  --notes "Fixes and improvements."
```

If `gh` is not installed, use the website. The app only needs a published release; it does not require CI.

## 6. How the app detects the release

The update center calls:

```text
GET https://api.github.com/repos/sukhee-2626/plot-docs/releases/latest
```

It runs on:

- app launch
- manual **Check** in the updates panel
- window focus, throttled to once every 15 minutes

It does **not** run a polling interval.

For Windows it prefers a portable `.exe` asset. Setup/installer assets are download-only and are never run automatically.

## 7. Checksums and signatures

GitHub may include an asset `digest` such as `sha256:...`. When present, the app verifies the downloaded file. If no digest is published, the panel marks the download unverified and requires an extra acknowledgement before install.

For a local package, put the checksum in `updates/update.json`:

```json
{
  "version": "1.0.1",
  "file": "Plot-Docs-1.0.1.exe",
  "sha256": "<64-char hex>",
  "releaseNotes": "Release notes"
}
```

Windows Authenticode is checked best-effort at install time:

- `Valid` — allowed after confirmation
- `NotSigned` — requires the unsigned-update acknowledgement
- invalid — blocked
- unknown — treated like unsigned for safety

Smart App Control may still block an unsigned executable at the operating-system level. The app must not disable Smart App Control.

## 8. Local `/updates` workflow (no GitHub release)

1. Build `Plot-Docs-1.0.1.exe`.
2. Copy it into `updates/`.
3. Optionally add `updates/update.json` with version, file, SHA-256, and notes.
4. Open the bell panel → **Updates**.
5. Review the version, date, checksum, and notes.
6. Click **Install update**, read the confirmation, acknowledge unsigned if needed.
7. The old executable is backed up to `updates/backups/`.
8. Restart when ready.

In development, the folder is the repository-root `updates/`. In the packaged app it is `%APPDATA%\Plot Docs\updates` by default. A writable `updates/` folder beside the executable is also watched.

## 9. Rollback

The backup is named like:

```text
updates/backups/Plot-Docs-1.0.0-2026-11-08T12-00-00-000Z.exe
```

To roll back:

1. Quit Plot Docs.
2. Copy the backup over the installed executable.
3. Start Plot Docs.

Your documents and settings are stored separately and are not touched by an update.

## 10. Release checklist

- [ ] Version bumped in `package.json`
- [ ] Typecheck passes
- [ ] Unit tests pass
- [ ] App builds
- [ ] Portable exe built
- [ ] SHA-256 recorded
- [ ] Release notes written
- [ ] GitHub release published with tag `vX.Y.Z`
- [ ] Portable exe attached
- [ ] Update center detects the release
- [ ] Download and install tested on a clean profile
- [ ] Backup verified
- [ ] Restart verified

## 11. Secrets

Never commit:

- GitHub tokens
- signing certificates
- `electron-builder.env`
- private keys

Optional environment variables for the update center:

- `PLOTDOCS_GITHUB_REPO` — `owner/repo`
- `PLOTDOCS_GITHUB_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN`
- `PLOTDOCS_UPDATES_DIR`
- `PLOTDOCS_NOTIFICATIONS_DIR`

Tokens are used only in the main process and are never sent to the renderer.
