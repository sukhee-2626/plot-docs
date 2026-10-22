# @plotdocs/cli

`plotdocs` is the Plot Docs command line. It exposes the suite's document engines
to scripts and AI agents without opening a window: the packaged app runs the
bundled CLI on its own Node runtime (`ELECTRON_RUN_AS_NODE`), so nothing extra
has to be installed.

```
plotdocs info report.docx
plotdocs convert scan.pdf --to docx
plotdocs convert data.csv --to xlsx --out out/data.xlsx
plotdocs open report.docx
plotdocs convert scan.pdf --to pptx --json
plotdocs guide slides                         # op groups; `plotdocs guide slides insert` for one group, `plotdocs guide slides setText` for one op
plotdocs slides read deck.pptx [--full] --json # durable ids + geometry an agent targets ops at; --full: whole text, tables, notes; text elements add `effective` (displayed style of the first run + `src` = the inheritance layer each value comes from)
plotdocs slides read deck.pptx --units in --json # box and size in inches (or cm, pt, px at 96 dpi) with `unit` named; default emu
plotdocs create --type pptx --ops deck.json --out deck.pptx
plotdocs create --type pptx --spec deck/pages --outline deck/outline.json --out deck.pptx   # one page spec file per slide (`plotdocs guide slides design|spec`)
plotdocs create --type pptx --spec deck.json --out deck.pptx --render deck/previews --audit   # plus one PNG per slide (detail.previews) and the geometry audit (detail.audit) in the same call
plotdocs slides check deck/outline.json | deck/pages/03.json   # outline rules (exit 1 on errors) / build + audit one page file
plotdocs slides replace deck.pptx --slide 2 --spec deck/pages/03.json   # rebuild one slide from its page file
plotdocs slides apply deck.pptx --ops edit.json [--dry-run] [--out copy.pptx]
plotdocs slides audit deck.pptx [--slide 0] --json            # out_of_bounds / off_slide / text_overflow / text_overflow_width / overlap / picture_distorted: typed issues with durable ids and a setTransform `suggest` where geometry fixes it
plotdocs slides render deck.pptx --out shots/ [--scale 2]     # one PNG per slide through the app's PDF export
plotdocs render report.docx|book.xlsx|page.html|file.pdf --out shots/ [--page 3] [--scale 2]   # one PNG per page of any document, to look at what was made
plotdocs render deck.pptx --out shots/ --el e_12 [--pad 16]   # plus the page cropped to that element (<stem>-NN-e_12.png)
plotdocs render deck.pptx --out shots/ --grid [--cols 4] [--tile 320]   # plus <stem>-grid.png: every page on one contact sheet
plotdocs create --type xlsx --from table.json --out book.xlsx   # 2-D array or {sheets:[{name,rows}]}; "=..." cells are formulas
plotdocs create --type xlsx --from data.csv --out data.xlsx [--header] [--decimal ,]   # ISO dates become real dates; sep= lines are honoured
plotdocs sheet read book.xlsx [--sheet Data] [--range A1:D20] [--formats] --json   # values, formulas, sheet features; --formats adds styles, widths, heights
plotdocs sheet apply book.xlsx --cells cells.json    # [{cell:"B2", value|formula, style?, sheet?}]
plotdocs sheet apply book.xlsx --ops ops.json [--dry-run]   # workbook DSL: cells, formats, charts, tables, filters, conditional formats, validation, links, notes, panes, page setup, sheets (`plotdocs guide sheets`)
plotdocs sheet check book.xlsx --json                # formula errors, missing-sheet references, broken defined names, chart ranges off the data, ### columns (suggest: set_col_width), placeholder text, existing rules; exit 0
plotdocs create --type docx --from report.md --out report.docx      # or --from fragment.html (restricted HTML)
plotdocs convert notes.md --to docx|html
plotdocs convert report.docx --to html               # the Word editor's standalone-HTML export
plotdocs convert page.html --to docx                 # html2docx, same as the HTML app's Export as Word
plotdocs convert report.docx --to md                 # GFM via the markdown editor's serializer
plotdocs convert book.xlsx --to csv [--sheet Data]   # one sheet, cell text as displayed, UTF-8 BOM, CRLF
plotdocs capabilities --json                        # which cloud features Plot Docs has configured (no network call)
plotdocs search "electron headless export" [--images] [--max 6] --json
plotdocs image "isometric office, soft light" --aspect 16:9 --out hero.png
plotdocs media photo.jpg --ask "What text is in this picture?" --json
plotdocs docs read report.docx [--range 0-9] [--html] [--full] [--comments] [--revisions] [--header-footer] [--properties] --json   # blocks (--full: whole text), comment threads, tracked changes, header/footer text, document properties
plotdocs docs apply report.docx --ops ops.json [--dry-run]           # apply_ops entries + insert_content / replace_blocks / insert_image / insert_chart / edit_chart / set_header_footer / reply_comment / resolve_comment / set_properties (document metadata)
plotdocs docs check report.docx --json                               # fields without results, broken bookmark references, stale TOC, missing images, empty charts/headings, heading level skips, placeholder text, pending revisions, open comments; exit 0
plotdocs merge invoice-template.docx --data values.json --out invoice.docx [--force] [--strict]   # fill {{key}} placeholders in a docx/pptx/xlsx template; reports used, unused and unresolved keys (or --data '{"name":"Ada"}')
plotdocs pdf read scan.pdf [--page 3 | --range 1-5] [--full] --json     # text layer page by page (pages 1-20 by default, 4000 characters each) with page sizes and metadata; headless pdfium, no app process
plotdocs guide docs                                                   # op signatures + restricted-HTML rules (`guide <domain> --json` = the catalog with each op's schema and a fingerprint)
plotdocs selection report.docx --json   # what the user has selected in the editor showing the file
plotdocs skill list   # coding agents found on this machine and the skill version each has
plotdocs skill install --dir ./skills --force   # copy the bundled skill into a skills directory
plotdocs install-cli   # put plotdocs on the PATH
plotdocs mcp --http 3000 [--host 127.0.0.1] [--token secret]   # Streamable HTTP for clients on other machines; omit --http for stdio
plotdocs mcp --compact-schemas   # advertise ops/cells/data as plain arrays instead of the per-op schema (smaller tools/list; also PLOTDOCS_MCP_COMPACT_SCHEMAS=1)
plotdocs mcp install all   # register the stdio server with every coding agent found (or one: claude-code, codex, cursor, gemini, copilot, opencode, windsurf)
plotdocs mcp list          # each agent's MCP config and whether plotdocs is registered; `mcp uninstall <agent>` removes the entry
```

Word and Markdown commands run the docs and markdown editors under jsdom (installed once per process, loaded lazily). Those modules are imported from the app renderers by relative path until they move into packages of their own.

Workbook writes go through `@plotdocs/xlsx-gateway` (the app's save path). The in-memory workbook validates and applies the cell, format and structure ops; ops the snapshot cannot hold (charts, images, tables, filters, conditional formats, validation, hyperlinks, notes, panes, page setup, protection, defined names, tab order) become the gateway's declarative save payloads, as the app's edit journal does. `add_pivot` and `add_sparkline` run headless too; only `refresh_pivot` and edits to objects created in an editor session (`add_table_row` / `add_table_column`, `delete_table_row` / `delete_table_column` / `delete_table`, `edit_shape`, `delete_visual`) are refused headless. After writing formulas plotdocs evaluates them with the xlsx sidecar and stores the results as cached values, so `sheet read` and plain readers see numbers, not blanks.

`create`/`slides apply` take the same ops the in-app AI uses (`@plotdocs/pptx-ops`), as a JSON array or `{ "ops": [...] }`; `--ops -` reads stdin. Image ops accept a local file path in their `bytes` field. A rejected op comes back with the guided error and its usage line so the caller can fix and retry; atomic transactions leave the file untouched.

`create --type pptx --spec` is the CLI end of the app's deck generation pipeline (`@plotdocs/pipelines`): the caller's agent does the design work following `plotdocs guide slides design`, writing the style sheet, the outline and one page spec file per slide (`plotdocs guide slides spec`), and the same page builder the app uses turns them into a pptx, measuring every text box and growing it to its content. Where the app separates the stages into model calls, the CLI separates them into files: `slides check` validates the outline against the planning rules and builds and audits a single page file, then checks it against its outline entry and the style sheet's palette (both found beside the page files), `create --spec <dir>` runs the same checks on every file and refuses to assemble a deck with pages missing or disagreeing with the outline, and `slides replace` rebuilds one slide from its file. `slides audit` runs the app's deterministic layout audit; `slides render` gives the agent PNGs to look at. No model call happens inside plotdocs.

Every command prints a one-line human summary by default or a single JSON
object with `--json` (`{ status, command, summary, output_path?, warnings?, detail? }`);
`warnings[]` (`{ code, message, suggestion? }`) carries advisories about a
result that still succeeded.
Errors are `{ status: "error", code, error, message, suggestion?, detail? }`:
`code` is the exit code, `error` a stable snake_case reason (`unknown_op`,
`target_not_found`, `out_of_range`, `sheet_not_found`, `file_open_in_gui`, …)
and `suggestion` the next step (with `did you mean …?` for one-typo
mistakes); the facts an agent needs to retry (valid
ranges, available ids, sheet names, usage lines) come back as fields in
`detail` rather than only inside the message. Exit codes: `0` ok, `1` usage,
`2` file, `3` conversion failed, `4` app not available.

## Template merge

`plotdocs merge <template> --data <values> --out <file>` fills `{{key}}`
placeholders in a `.docx`, `.pptx` or `.xlsx` template from a JSON object
(a file, inline JSON or `-` for stdin). Nested objects flatten to dotted keys
(`{{a.b}}`); arrays are not expanded and come back in `detail.ignored_keys`;
whitespace inside the braces is tolerated. The fill runs on the engines' own
find/replace paths: `findReplace` in the docs editor (a table block with a placeholder that has a
value goes through `replace_blocks` on its restricted HTML, since `findReplace`
does not reach cells; a table nothing fills is left untouched), deck-level `findReplace` plus `setNotes` in pptx-ops, and the workbook DSL's `set_cell`,
one per placeholder cell: a cell that is exactly one placeholder takes the
value's type (a number becomes a number cell), every other cell gets its
substituted text as literal text (`type: "text"`, so a value starting with
`=` does not become a formula).

The result lists `used_keys`, `unused_keys` and `unresolved_placeholders`
(`{ placeholder, key, reason, location }` with the block index, slide and
element id, or sheet and cell). `reason: no_key` is a placeholder the data
does not cover; `split_placeholder` is one Word or PowerPoint stored across
runs with different formatting, which run-level replace cannot match (retype
it in one run); `unreachable_nested` sits inside a nested pptx group or a
table in a group, which deck-level `findReplace` does not reach (ungroup it). Unresolved placeholders stay in place and the result carries an
`unresolved_placeholder` warning; `--strict` turns them into an error of the
same name and writes nothing. The output is written atomically, an existing
file needs `--force`, and the GUI-open check and `PLOTDOCS_ALLOWED_ROOTS`
apply as for every other write.

## MCP server

`plotdocs mcp` serves the same commands as Model Context Protocol tools on
stdio, for clients that cannot run a shell or should not (Claude Desktop,
Cursor, sandboxed agents). Nothing else is needed on the machine: the process
runs on the app's Node runtime like every other command, and Plot Docs itself
only starts, hidden, for the conversions that need its renderer.

```bash
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```json
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

`plotdocs mcp install <agent|all> [--dir <path>] [--force]` writes that entry
for you, pointing at the absolute launcher path so it works without `plotdocs`
on the PATH (on Windows, where MCP clients spawn without a shell, the entry
runs `Plot Docs.exe` as Node on the bundled `plotdocs.cjs` with
`ELECTRON_RUN_AS_NODE=1`, the same entry the app's Settings snippet shows): `~/.claude.json` (Claude Code, user scope; `CLAUDE_CONFIG_DIR`
honoured), `~/.codex/config.toml` (`[mcp_servers.plotdocs]`; `CODEX_HOME`),
`~/.cursor/mcp.json`, `~/.gemini/settings.json`, `~/.copilot/mcp-config.json`
(Copilot CLI), `~/.config/opencode/opencode.json` and
`~/.codeium/windsurf/mcp_config.json`. Only the `plotdocs` key is touched; an
entry of that name starting another program is reported as `occupied` and left
alone unless `--force`, a file that cannot be parsed is reported as `manual`
with the snippet to paste. `--dir` names the agent's config folder for one
agent; `mcp uninstall <agent|all>` removes the entry; `mcp list` shows every
agent, detected or not, with its config path and state (`--json` for the
structured rows).

The tool table is `src/mcp/tools.ts`: one tool per command verb
(`docs_read`, `docs_apply`, `sheet_apply`, `slides_render`, `convert`, …),
each parameter taken from the command's own option list, so the two surfaces
cannot drift. Ops, cell lists, specs and Markdown are passed inline and land
in a scratch directory for the length of the call; `render` and
`slides_render` return the PNGs as image content. Results are the same JSON
envelope `--json` prints; an error comes back with `isError` and the same
`error` reason. The `ops`, `cells` and `data` parameters carry the per-op
schema of `guide <domain> --json` (one variant per op with its fields), so a
client sees the fields without reading the guide; `plotdocs mcp
--compact-schemas` (or `PLOTDOCS_MCP_COMPACT_SCHEMAS=1`) advertises them as
plain arrays for clients with a small context budget. The op references are
also resources (`plotdocs://guide/docs`, `…/sheets`, `…/slides`,
`…/slides/design`, `…/slides/spec`).

A new deck goes through `deck_start` (style sheet + outline, returns the
design and spec guides), `deck_page` (one page per call, checked against its
outline entry and the palette), `deck_build` and `deck_replace`
(`src/mcp/deck.ts`). The deck directory is the state, laid out exactly as the
command line's staged flow, so a deck started from either side can be finished
from the other.

Behind a reverse proxy, set `PLOTDOCS_TRUST_PROXY_HEADERS=1` so the download
URLs the server hands out use the forwarded host and scheme; by default the
`X-Forwarded-*` headers are ignored.

`plotdocs mcp --http <port> [--host <addr>] [--token <secret>]` serves the
same tools over Streamable HTTP for clients on other machines (`src/mcp/http.ts`).
Files travel with the calls: `PUT /files/<name>` uploads one and returns a URL,
every path parameter also takes an http(s) URL (fetched into the session's
scratch directory, `src/mcp/files.ts`), and a tool that writes a file returns
`output_url` plus the bytes as an embedded resource when small or a
`resource_link` otherwise (`src/mcp/remote.ts`). Each session has its own
scratch directory, working directory and deck state; `open` and `selection`
are not registered;
with `PLOTDOCS_ALLOWED_ROOTS` unset the tools are confined to the server's
file store.

## Putting plotdocs on the PATH

- **macOS**: the app tries to symlink `/usr/local/bin/plotdocs` (or `/opt/homebrew/bin/plotdocs`) on every launch until one succeeds. If neither directory is writable it stays silent; run `plotdocs install-cli` from the launcher, or `sudo mkdir -p /usr/local/bin && sudo ln -sf "/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs" /usr/local/bin/plotdocs`.
- **Windows**: the installer appends `<install dir>\resources\cli` to the user PATH (`apps/shell/build/installer.nsh`, REG_EXPAND_SZ preserved, removed on uninstall) and the app re-checks once per version; new terminals see `plotdocs`. The directory holds `plotdocs.cmd` for cmd / PowerShell and the extension-less `plotdocs` for Git Bash.
- **Linux**: the deb/rpm post-install links `/usr/bin/plotdocs`; the AppImage relies on the first-launch symlink into `/usr/local/bin` when it is writable.

`plotdocs install-cli` repeats the attempt and prints the manual command when it cannot finish. jsdom (for Word/Markdown) ships beside the bundle as `Resources/cli/node_modules`, collected by `collect-deps.mjs` at build time.

Independently of the PATH, every launch of the packaged app writes the launcher directory to `~/.plotdocs/launcher` (`PLOTDOCS_AUTH_DIR` overrides the directory, as for `auth.json`). The `plotdocs` agent skill (`skills/plotdocs/SKILL.md`) reads it when `plotdocs` is not on the PATH. `plotdocs --version` prints this package's version, inlined by `build.mjs`.

## Layout

- `src/cli.ts` — argv parsing, dispatch, output; `runCli()` is embeddable.
- `src/registry.ts` — `CommandDef` table (`name`, `usage`, `run`), the single
  place future entry points (in-app AI, MCP) dispatch through.
- `src/commands/` — `info`, `convert`, `create`, `render`, `slides`, `sheet`, `docs`,
  `guide`, `open`, `capabilities`, `search`, `image`, `media`, `install-cli`.
- `src/dom.ts` — the jsdom bootstrap the Word/Markdown paths need.
- `src/formats/` — thin adapters over `@plotdocs/pdf2docx`, the xlsx sidecar
  and the sheets CSV importer.
- `src/resources.ts` — locates pdfium wasm, the xlsx sidecar and the OCR
  helper in both the packaged `Resources/` layout and the dev checkout.
- `bin/plotdocs`, `bin/plotdocs.cmd` — launchers copied next to `plotdocs.cjs` in the
  packaged app.

## Path policy and audit log

- `PLOTDOCS_ALLOWED_ROOTS` (PATH-style list of directories) confines every file plotdocs
  reads or writes to those trees; symlinks are resolved before the check. A path
  outside exits 2 with the roots in `detail.allowed_roots`. Unset means
  unrestricted.
- `apply --out` onto another existing file needs `--force`, like `create` / `convert`;
  editing in place never does. Unknown options are rejected instead of ignored.
- A file the running Plot Docs shell has open in a tab is not rewritten in place
  (exit 2, `detail.gui_pid`): the shell publishes its open tabs to
  `userData/open-documents.json` and plotdocs reads it (`PLOTDOCS_USER_DATA`
  overrides the location). `--force` writes anyway; the editor then warns about
  the on-disk change at its next save (Word, Excel) or may overwrite it (PowerPoint).
- Every executed command appends one JSON line (`ts`, `command`, `argv`,
  `status`, `code`, `output_path`, `ms`, `cwd`) to
  `~/.plotdocs/cli-audit.jsonl`, rotated at 2 MB. `PLOTDOCS_AUDIT_LOG=<path>`
  redirects it, `PLOTDOCS_AUDIT_LOG=off` disables it.

## Cloud commands

`search`, `image` and `media` reuse the editors' provider routing. Search uses
the selected Serper / Serply / Tavily / Parallel provider when its key is configured;
otherwise Soopus is the default when signed in (`~/.plotdocs/auth.json`)
and cloud tools are on, then Parallel's free, rate-limited Search MCP, then
DuckDuckGo. Parallel
and Tavily provide web search only. Image generation and media analysis use
the corresponding provider chosen in the app's AI settings
(`Plot Docs/ai-settings.json` in the platform config directory, override with
`PLOTDOCS_AI_SETTINGS`). `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY` are honoured.
Search results, image bytes and analysis text come back in the JSON `detail`;
`image` also writes the file. These are the only commands that send data off
the machine.

## Build and run in a checkout

```
npm run build -w @plotdocs/cli       # esbuild → dist/plotdocs.cjs
packages/cli/bin/plotdocs info file.docx  # falls back to the system node
```

Conversions that need an app renderer (Word/PowerPoint/Excel/HTML/Markdown → PDF,
Word → HTML, HTML → Word, `create --type pdf`) run inside the Plot Docs binary
through its hidden `--headless-export` mode: plotdocs spawns it (Dock hidden, no
window), reads the JSON envelope it prints and maps its exit code. Set
`PLOTDOCS_APP_BIN` to point at a specific executable; in a checkout the dev Electron
plus `apps/shell` is used, so `npm run build:all` first.
