# Release Checklist

Use this before publishing any Plot Docs release that the in-app update center should detect.

## 1. Code gate

- [ ] All intended changes are committed
- [ ] Unrelated uncommitted work is preserved
- [ ] `git status --short` reviewed
- [ ] `npm run typecheck -w @plotdocs/shell` passes
- [ ] Focused update/notification tests pass
- [ ] Relevant analytics tests pass
- [ ] No secrets, tokens, certificates, or generated state staged
- [ ] `history.txt` and `development-docs/` updated

## 2. Version gate

- [ ] `package.json` version bumped (semver)
- [ ] `apps/shell/package.json` version checked
- [ ] Version is newer than the installed version
- [ ] Release tag will be `vX.Y.Z`

## 3. Build gate

- [ ] `npm run build -w @plotdocs/shell`
- [ ] `npm run dist:portable -w @plotdocs/shell`
- [ ] Portable exe exists under `apps/shell/release-portable/`
- [ ] App launches from the portable exe
- [ ] Bell and update panel appear
- [ ] SHA-256 recorded with `Get-FileHash`

## 4. Update-system gate

- [ ] Local package detection works with `updates/Plot-Docs-X.Y.Z.exe`
- [ ] Manifest version/notes/checksum display correctly
- [ ] Install confirmation appears
- [ ] Unsigned warning appears when applicable
- [ ] Backup created in `updates/backups/`
- [ ] Replacement succeeds
- [ ] Restart launches the new version
- [ ] User documents/settings are intact
- [ ] Installer/setup asset is download-only
- [ ] Invalid checksum is blocked
- [ ] Invalid signature is blocked
- [ ] `.part` cleanup works
- [ ] Duplicate download prevention works

## 5. GitHub gate

- [ ] Release published with tag `vX.Y.Z`
- [ ] Portable exe attached
- [ ] Release notes present
- [ ] `releases/latest` returns the release
- [ ] App detects the version
- [ ] Download completes
- [ ] Checksum/digest matches
- [ ] Rate-limit/no-release states are friendly

## 6. Notification gate

- [ ] Test notification JSON detected in real time
- [ ] Badge increments
- [ ] Toast appears
- [ ] Mark read persists
- [ ] Mark all read persists
- [ ] Delete removes source file
- [ ] Native notification click opens the panel
- [ ] Malformed/oversized files are ignored safely

## 7. Publish

```powershell
git push origin main

gh release create vX.Y.Z `
  apps/shell/release-portable/Plot-Docs-X.Y.Z.exe `
  --title "Plot Docs X.Y.Z" `
  --notes "Release notes"
```

If `gh` is unavailable, use the GitHub web UI.

## 8. After publish

- [ ] Install the published build on a clean profile
- [ ] Confirm the next launch sees the release
- [ ] Record the result in `06-test-log.md`
- [ ] Update `history.txt` and `02-current-status.md`
- [ ] Keep the previous executable backup available for rollback

## Rollback

1. Quit Plot Docs.
2. Copy the desired file from `updates/backups/` over the installed executable.
3. Start Plot Docs.
4. Record the rollback reason in the test log.
