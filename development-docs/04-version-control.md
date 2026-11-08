# Version Control Quick Reference

Detailed manual: `../docs/version-control-workflow.md`

## Repository

- Origin: `https://github.com/sukhee-2626/plot-docs.git`
- Branch: `main`
- Upstream reference: `https://github.com/genspark-ai/genoffice.git`

## Daily commands

```powershell
cd C:\Users\HP\ss-office
git status --short
git diff
git add <files>
git commit -m "feat(updates): ..."
git push origin main
```

## Important

- Commits are not app updates.
- An app update is a **GitHub release** with a newer tag and a portable `.exe`.
- Bump the version before building a release.
- Never commit tokens, certificates, or generated update state.
- Keep uncommitted analytics changes intact.

## Release flow

```text
bump version
  -> typecheck
  -> tests
  -> build
  -> portable exe
  -> SHA-256
  -> GitHub release tag vX.Y.Z
  -> attach portable exe
  -> app checks /releases/latest
  -> user downloads/installs/restarts
```

## Release commands

```powershell
npm run typecheck -w @plotdocs/shell
npm run dist:portable -w @plotdocs/shell
Get-FileHash apps/shell/release-portable/Plot-Docs-1.0.1.exe -Algorithm SHA256

gh release create v1.0.1 `
  apps/shell/release-portable/Plot-Docs-1.0.1.exe `
  --title "Plot Docs 1.0.1" `
  --notes "Release notes"
```

If `gh` is unavailable, create the release in the GitHub web UI.

## Rollback

1. Quit Plot Docs.
2. Copy a file from `updates/backups/` over the installed executable.
3. Start Plot Docs.

## What the app watches

- `updates/` for local packages and manifests
- `notifications/` for JSON notifications
- `https://api.github.com/repos/sukhee-2626/plot-docs/releases/latest`

It does not poll continuously.
