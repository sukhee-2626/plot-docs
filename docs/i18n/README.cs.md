<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>První plnohodnotný open-source AI kancelářský balík na světě.</b><br>
Soubory Word, Excel, PowerPoint a PDF, upravované vámi a vaší AI, ukládané zpět ve skutečných formátech.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="Licence: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Nejnovější verze"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Stažení"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="Hvězdy na GitHubu"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <b>Čeština</b> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>Stažení</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>Web</b></a> ·
  <a href="https://plotxyz.ai"><b>Komunita</b></a> ·
  <a href="../../PRIVACY.md"><b>Soukromí</b></a>
</p>

Plot Docs je bezplatná open-source alternativa k Microsoft Office pro macOS,
Windows a Linux. Otevírá a ukládá nativní soubory `.docx`, `.xlsx` a `.pptx`,
upravuje PDF, Markdown a HTML a ke každému dokumentu přidává AI agenta —
nejde o přilepené chatovací okno, ale o editor, který soubor přečte,
provede požadovanou úpravu a přesně vám ukáže, čeho se dotkl.

- **Skutečné formáty, zachování na úrovni bajtů.** Přepíše se jen to, co
  upravíte. Vše ostatní v souboru zůstává bajtově identické, takže dokumenty
  dál bezproblémově fungují ve Wordu, Excelu a PowerPointu.
- **AI, kterou můžete zkontrolovat.** Úpravy přicházejí jako sledované změny
  a rozdíly s možností vrátit je jedním kliknutím. Tabulky získávají živé
  vzorce, ne vložená čísla. Prezentace a stránky se generují přímo na plochu
  a zůstávají plně editovatelné.
- **Lokální už z principu.** Soubory se otevírají, upravují, ukládají
  i převádějí přímo na vašem počítači. PDF → Word / Excel / PowerPoint
  a Markdown → Word i HTML → Word běží celé na zařízení. Zařízení opouštějí
  jen volání AI, a to k poskytovateli, kterého si sami vyberete.
- **Vaše klíče, nebo žádné.** Přihlaste se přes Soopus a klíče nepotřebujete,
  nebo použijte vlastní klíč pro Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM,
  Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty nebo jakýkoli OpenAI
  kompatibilní endpoint, včetně lokálních serverů.
- **Skriptovatelný a připravený pro agenty.** Aplikace obsahuje příkazový
  řádek `plotdocs` a skill pro Claude Code, Codex, Cursor, Gemini CLI,
  GitHub Copilot, OpenCode a Windsurf, takže kódovací agent může na vašem
  počítači vytvářet, převádět, číst a upravovat skutečné soubory Office, aniž
  by otevřel jediné okno.

**Stáhnout:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon a Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 a Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
podrobnosti a požadavky najdete v sekci [Stažení](#download).

## Ukázka

<p align="center">
  <img src="../../site/screenshots/home.png" alt="Plot Docs home screen" width="100%">
</p>

<table>
  <tr>
    <td width="50%"><img src="../../site/screenshots/docs.png" alt="Plot Docs Docs editor"></td>
    <td width="50%"><img src="../../site/screenshots/sheets.png" alt="Plot Docs Sheets editor"></td>
  </tr>
  <tr>
    <td width="50%"><img src="../../site/screenshots/slides.png" alt="Plot Docs Slides editor"></td>
    <td width="50%"><img src="../../site/screenshots/pdf.png" alt="Plot Docs PDF editor"></td>
  </tr>
  <tr>
    <td width="50%"><img src="../../site/screenshots/markdown.png" alt="Plot Docs Markdown editor"></td>
    <td width="50%"><img src="../../site/screenshots/html.png" alt="Plot Docs HTML editor"></td>
  </tr>
  <tr>
    <td width="50%"><img src="../../site/screenshots/templates.png" alt="Plot Docs templates"></td>
    <td width="50%"><img src="../../site/screenshots/settings-account.png" alt="Plot Docs local account settings"></td>
  </tr>
</table>

## Proč Plot Docs

- **Open source**, Apache-2.0, vyvíjený otevřeně na GitHubu.
- **Váš k provozování.** Nativní aplikace pro macOS, Windows a Linux; soubory
  zůstávají na vašem disku a každá úprava, uložení i konverze probíhá na
  vašem počítači.
- **Skutečné soubory Office.** Nativní `.docx`, `.xlsx` a `.pptx` se
  zachováním na úrovni bajtů: nedotčené části souboru se kopírují přesně tak,
  jak byly.
- **AI, která upravuje dokument přímo.** Sledované změny v Docs, živé vzorce
  a grafy v Sheets, prezentace kreslené přímo na plochu, každý krok AI je
  snapshot, ke kterému se lze vrátit.
- **Vlastní model, vlastní klíč.** Přihlaste se přes Soopus, nebo použijte
  klíč pro Claude, OpenAI, Gemini, DeepSeek a další, včetně lokálních serverů
  a jakéhokoli OpenAI kompatibilního endpointu.
- **PDF udělané správně.** Upravujte text přímo na stránce a převádějte PDF
  do Word, Excel nebo PowerPoint na zařízení, se systémovým OCR pro skeny.
- **Také Markdown a HTML**, se stejným panelem AI a místním exportem do Word.
- **Skriptovatelný.** Příkazový řádek `plotdocs`, agentní skill a MCP
  server dávají každý engine do služeb Claude Code, Claude Desktop, Codex,
  Cursor a dalších agentů, stále na zařízení.
- **Zdarma**, pro jednotlivce i týmy.

## AI backendy

**Přihlaste se přes Soopus** a nemusíte nic nastavovat: volání modelů
prochází přes proxy Soopus (rodiny Claude, GPT a Gemini) a agenti získávají
webové a obrázkové vyhledávání, generování obrázků a analýzu
obrázků/zvuku/videa.

**Nebo použijte vlastní klíč.** Nastavení → AI nabízí Claude, OpenAI, Gemini,
DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty
a OpenCode Zen/Go, plus vlastní slot pro jakýkoli OpenAI kompatibilní
endpoint (base URL + klíč), včetně lokálních serverů s modely. Vyhledávání
a média mají vlastní poskytovatele pro každou schopnost pod **AI Media
& Search**: Serper nebo Tavily pro webové vyhledávání a OpenAI, Gemini,
Doubao/Seedream, GLM, Grok, Qwen, MiniMax nebo jakýkoli OpenAI kompatibilní
endpoint pro obrázky, generování obrázků a analýzu obrázků/videa.

Celý balík nabízí světlý, tmavý a systémový vzhled. Vzhledy mění pouze to,
co je vidět na obrazovce: exporty, tisky a uložené soubory si vždy zachovávají
vlastní barvy dokumentu.

<a id="command-line-and-agent-skill"></a>

## Příkazový řádek a agentní skill

Vše, co aplikace umí se souborem, umí příkazový řádek `plotdocs`
z terminálu: prohlížet, převádět, vytvářet, číst a upravovat Word, Excel,
PowerPoint, PDF, Markdown a HTML na stejných enginech, bez grafického
rozhraní. Instaluje se spolu s Plot Docs, nepotřebuje vlastní runtime
a nikdy žádný dokument nikam neodesílá. Ve spojení s přibaleným **agentním
skillem** promění kódovacího agenta v dokumentového pracovníka, který
vytváří skutečné soubory Office místo přibližných napodobenin v Markdownu.

**Funguje s:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode a Windsurf hned po instalaci, s jakýmkoli dalším agentem, který čte
skilly, a díky [MCP serveru](#mcp-server) také s Claude Desktop a jakýmkoli
MCP klientem.

### Instalace skillu

| Jak                                    | Co se stane                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Nastavení → Integrace** v aplikaci   | Vypíše agenty nalezené na tomto počítači; jedním kliknutím zapíše skill do každého, který vyberete. Když nové vydání Plot Docs přinese novější skill, objeví se tlačítko **Aktualizovat**. |
| **Stáhnout jako zip** na téže stránce  | Rozložení, které claude.ai, desktopové aplikace Claude a další asistenti přijímají jako nahraný skill.                                                                                     |
| `npx skills add plotxyz-ai/plot-docs` | Nainstaluje z tohoto repozitáře do jakéhokoli agenta podporujícího skilly.                                                                                                                 |

Pak začněte nový chat a požádejte o dokument. Skill agenta naučí, kdy sáhnout
po `plotdocs`, jak si soubor přečíst před úpravou a jak zkontrolovat vlastní
práci.

### Rychlý start z terminálu

```bash
plotdocs --version
plotdocs info report.docx --json                  # headings and blocks; or sheets, slides, pages
plotdocs convert report.md --to pdf               # md/html/docx/xlsx/pptx → pdf, pdf → docx/xlsx/pptx/md/html, …
plotdocs create --type docx --from notes.md --out notes.docx
plotdocs create --type xlsx --from table.json --out sales.xlsx   # "=SUM(B2:B9)" cells stay live formulas
plotdocs docs read report.docx --range 0-9 --json # then `docs apply --ops edits.json` edits in place
plotdocs render report.docx --out shots/          # one PNG per page, to look at what you made
plotdocs open sales.xlsx                          # hand the result to the editor
```

Každý příkaz vypíše jednořádkové shrnutí, nebo s `--json` jediný objekt JSON.
Úpravy jsou atomické: odmítnutá operace nechá soubor nedotčený a vrátí se
s návodnou chybovou hláškou. `plotdocs help` vypíše aktuální sadu příkazů;
úplná reference je v [packages/cli/README.md](../../packages/cli/README.md).

### Co agent ve skutečnosti spouští

Prezentace o sluneční soustavě v ukázce výše vznikla z jediného promptu
v Claude Code. Agent za ní postupoval podle fázovaného pracovního postupu ze
skillu a CLI zkontrolovalo každou fázi, než začala další:

```bash
plotdocs capabilities --json                        # which cloud tools Plot Docs has configured
plotdocs guide slides design                        # the deck workflow and layout library
plotdocs image "the eight planets in a row …" --aspect 16:9 --out deck/assets/cover.jpg
plotdocs slides check deck/outline.json --json      # 8 pages, no findings
plotdocs slides check deck/pages/01.json --json     # builds one slide, audits overflow and overlap
…                                                    # one page file per slide, fixed until each check is clean
plotdocs create --type pptx --spec deck/pages --outline deck/outline.json --out deck/solar-system.pptx --json
plotdocs slides render deck/solar-system.pptx --out deck/shots --json
plotdocs slides audit deck/solar-system.pptx --json    # 8 slides, no layout issues
plotdocs slides replace deck/solar-system.pptx --slide 4 --spec deck/pages/05.json --json
plotdocs open deck/solar-system.pptx
```

Uvnitř `plotdocs` neprobíhá žádné volání modelu: agent přemýšlí, CLI staví
a kontroluje a výsledek se otevře v Plot Docs nebo PowerPointu jako obyčejný
soubor `.pptx`.

<a id="mcp-server"></a>

### MCP server

Stejné příkazy jsou dostupné jako nástroje [Model Context Protocol](https://modelcontextprotocol.io)
pro asistenty, kteří neumí spustit terminál nebo kterým byste ho raději
nedávali. Vedou k tomu dvě cesty, obě ukázané s připravenými fragmenty ke
zkopírování v **Nastavení → Integrace → MCP**:

| Cesta                                | Co to je                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A · `plotdocs mcp`** (doporučeno) | stdio server, který si asistent spustí sám; Plot Docs nemusí být otevřené. Jeden nástroj na příkaz (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) plus fázovaný postup sestavování prezentace `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Operace, specifikace a Markdown se předávají přímo v argumentech, takže funguje i klient bez souborového systému. |
| **B · Lokální HTTP server**          | Běží uvnitř aplikace Plot Docs na `http://127.0.0.1:3093/mcp` (Streamable HTTP, se starším SSE). Jeho nástroje ovládají viditelnou záložku editoru Word: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session` — a vy sledujete, jak dokument vzniká. Ve výchozím stavu vypnutý; zapíná se ve stejném panelu nastavení.                                                                                                                                                                 |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop nebo jakýkoli jiný MCP klient
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

`plotdocs` je tady CLI dodávané uvnitř aplikace (na macOS
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; panel
nastavení vypíše přesnou cestu pro vaši instalaci). Server nese vlastní
instrukce k pracovnímu postupu a zpřístupňuje referenční příručky k operacím
jako zdroje `plotdocs://guide/*`, takže skill není potřeba; skill a MCP
server mohou koexistovat a asistent si jeden z nich vybere. Cloudové funkce
(`search`, `image`, `media`) stále jdou přes poskytovatele nastaveného v
Plot Docs; všechno ostatní běží lokálně a `PLOTDOCS_ALLOWED_ROOTS` omezuje
každý nástroj na složky, které uvedete.

Prezentace o obnovitelné energii z dema výše je to, jak jeden prompt v
Claude Code s připojeným pouze MCP serverem `plotdocs` vypadá ze strany
protokolu:

```text
capabilities · guide(slides, spec) · guide(slides, design)
search(query) ×4                         → IEA, BNEF and IRENA figures for the slides
search(query, images) ×7 · media(url, ask) ×7
                                         → candidate photos, each one checked to be a real photograph
deck_start(dir, style, outline)          → outline checked: 8 pages to write
deck_page(dir, 0, page) … deck_page(dir, 7, page)
                                         → each page checked against the outline and the palette; one page sent again
deck_build(dir, out)                     → renewables-2026.pptx, no image failures
slides_audit(file) · slides_render(file, out)
                                         → no layout findings; 8 PNGs come back as image content
deck_replace(dir, n, page) ×3 · slides_render(file, out)
                                         → three pages fixed after looking at the renders
```

Osmatřicet volání, zhruba třináct minut, a asistent se ani jednou nedotkl
shellu: obrázky, fotografie, průvodci, kontroly i rendery cestovaly jako
výsledky volání MCP nástrojů. Pouze `search` a `media` opustily počítač, k
poskytovateli nastavenému v Plot Docs.

<a id="download"></a>

## Stažení

| Platforma                            | Požadavky                                             | Stažení                                                                                        |
| ------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [Nejnovější `.dmg` (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)          |
| **macOS** — Intel (x64)              | macOS 11+                                             | [Nejnovější `.dmg` (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)            |
| **Windows** (x64, většina PC)        | Windows 10+, Intel/AMD                                | [Nejnovější instalátor `-x64.exe`](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** na Arm (ARM64)           | Windows 11 na Arm (Snapdragon X a podobné)            | [Nejnovější instalátor `-arm64.exe`](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 nebo novější)       | [Nejnovější `.deb`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Nejnovější `.rpm`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — ostatní distribuce       | x86_64, glibc 2.34+, FUSE 2                           | [Nejnovější `.AppImage`](https://github.com/plotxyz-ai/plot-docs/releases/latest)             |

Všechny sestavení pocházejí z `main`; instalátory pro macOS a Windows jsou
podepsané. Starší verze jsou na stránce [Releases](https://github.com/plotxyz-ai/plot-docs/releases).

<details>
<summary><b>Instalace na Linuxu</b></summary>

Balíček deb se instaluje pomocí apt — stáhne závislosti a přidá Plot Docs
do nabídky aplikací:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

Na Fedoře / v rodině RHEL / na openSUSE nainstalujte místo toho rpm balíček:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage běží na místě: nainstalujte runtime FUSE 2
(`sudo apt install libfuse2`; na Ubuntu 24.04 se balíček jmenuje `libfuse2t64`),
udělejte soubor spustitelným a spusťte jej:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## Jak to funguje

Sedm aplikací Electron — Docs, Sheets, Slides, PDF, Markdown, HTML
a záložková shell aplikace — sdílí jednu vrstvu enginu z čistých TypeScript
balíčků plus Rust sidecar pro `.xlsx`. Původní soubor je vždy zdrojem pravdy:
úpravy se aplikují jako úzké patche a vše, čeho se editor nedotkl, přežije
zpětné uložení beze změny.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

Prohlídka balíčků po balíčcích (enginy docx/pptx, `pdf2docx`, `html2docx`,
jádro agenta a poskytovatelé) je v [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Vývoj

```bash
npm install
npm run fixtures     # generate test .docx fixtures
npm test             # engine + app unit tests (docs/sheets/slides need no display)
npm run typecheck    # tsc --noEmit across every workspace
npm run dev          # all six editors + shell against Vite dev servers
npm run dev:docs     # a single app (same pattern works per workspace)
npm run dist:mac     # package macOS dmg (regenerates third-party notices)
npm run dist:win     # package Windows nsis installer
npm run dist:linux   # package Linux AppImage + deb + rpm
```

Aplikace sheets navíc potřebuje pro svůj xlsx sidecar Rust toolchain
(`cargo` na PATH); `npm run build -w @plotdocs/sheets` jej zkompiluje
automaticky. Kontroly, které musí projít každá změna, a postup přijímání
pull requestů najdete v [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Komunita

Plot Docs je v aktivním vývoji a vaše zpětná vazba jej utváří.

- **Nahlaste chybu nebo navrhněte funkci** v
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues).
- **Připojte se ke skupinovému chatu Plot Docs** na
  [PlotCommunity](https://plotxyz.ai), kde si můžete promluvit s týmem
  i ostatními uživateli.
- **Ohvězdičkujte repozitář**, pokud je pro vás Plot Docs užitečný — je to
  nejlepší způsob, jak projekt podpořit.

## Často kladené otázky

<details>
<summary><b>Je Plot Docs zdarma?</b></summary>

Ano. Plot Docs je bezplatný a open-source pod licencí Apache-2.0 — žádná
zkušební verze, žádný placený tarif pro samotné aplikace.

</details>

<details>
<summary><b>Umí Plot Docs otevírat soubory Microsoft Word, Excel a PowerPoint?</b></summary>

Ano. Plot Docs otevírá a ukládá nativní soubory `.docx`, `.xlsx` a `.pptx`.
Ukládání zachovává bajty: části souboru, kterých jste se nedotkli, se zapíší
zpět beze změny, takže dokumenty dál fungují v Microsoft Office.

</details>

<details>
<summary><b>Funguje Plot Docs offline?</b></summary>

Úprava dokumentů je zcela lokální — soubory neopustí váš počítač při
otevírání, úpravách, ukládání ani konverzi. AI funkce (agenti, vyhledávání,
nástroje pro obrázky) potřebují síťové připojení, buď s přihlášením přes
Soopus, nebo s vlastním API klíčem k modelu.

</details>

<details>
<summary><b>Umí Plot Docs upravovat soubory PDF?</b></summary>

Ano — skutečná úprava textu a obrázků v PDF, která přepisuje obsahový proud
stránky se zachováním původních fontů, ne pomocí zakrývacích anotací.

</details>

<details>
<summary><b>Umí Plot Docs převádět PDF do Wordu, Excelu nebo PowerPointu?</b></summary>

Ano — zcela na zařízení: extrakce na úrovni znaků přes PDFium plus analýza
rozvržení na základě geometrie, žádná cloudová služba, žádné nahrávání.
Skenované stránky jsou také podporovány: na macOS a Windows je čte systémové
OCR, takže se převedou na editovatelný text, ne na obrázek stránky.

</details>

<details>
<summary><b>Můžu použít vlastní AI model nebo API klíč?</b></summary>

Ano. Kromě bezklíčového přihlášení Soopus AI podporuje vlastní klíč
pro Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok,
Mistral, OpenRouter, Requesty a OpenCode Zen/Go, plus jakýkoli OpenAI kompatibilní
endpoint — včetně lokálních serverů s modely. Vyhledávání, generování obrázků
a analýza obrázků/videa mají vlastní klíče pod Nastavení → AI Media & Search.

</details>

<details>
<summary><b>Umí Plot Docs převádět HTML do Wordu?</b></summary>

Ano — Export as Word v aplikaci HTML vytvoří nativní, editovatelný soubor
`.docx` zcela na zařízení. Stránka se vykreslí ve vestavěném Chromiu
a zredukuje na skutečné struktury Wordu: nadpisy, odstavce, seznamy, tabulky,
karty, řádky KPI, pole formulářů a pozadí stránky; pouze vizuály bez
odpovídajícího prvku ve Wordu (grafy, ikony, ozdobné rámečky) se vloží jako
obrázky.

</details>

<details>
<summary><b>Můžu Plot Docs ovládat z nástrojů Claude Code, Codex, Cursor nebo ze skriptu?</b></summary>

Ano. Plot Docs nainstaluje příkazový řádek `plotdocs`, který spouští stejné
enginy bez grafického rozhraní: prohlížejte, převádějte, vytvářejte, čtěte
a upravujte dokumenty z terminálu nebo ze skriptu, s výstupem `--json` pro
programy. Přibalený agentní skill naučí Claude Code, Codex, Cursor, Gemini
CLI, GitHub Copilot, OpenCode a Windsurf, jak ho používat; nainstalujte ho
v **Nastavení → Integrace**. Viz
[Příkazový řádek a agentní skill](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Sbírá Plot Docs nějaká data?</b></summary>

Oficiální balíčkované verze standardně odesílají omezenou analytiku
používání a hlášení lze kdykoli vypnout v Nastavení → Obecné. Analytika
nikdy neodesílá obsah dokumentu, názvy souborů, cesty k souborům, identitu
účtu ani e-mailové adresy. Úplný výčet událostí a zveřejnění dat najdete
v dokumentu [Plot Docs Privacy](../../PRIVACY.md).

</details>

## Zabezpečení

Postoj k zabezpečení procesů (sandboxing rendereru, validace IPC, filtrování
externích odkazů) a modely hrozeb pro obsah generovaný AI najdete v
[SECURITY.md](../../SECURITY.md).

## Poděkování

Plot Docs by nebyl možný bez těchto open-source projektů:

- [Electron](https://www.electronjs.org/) — desktopový runtime pro každou aplikaci.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — jádro
  uživatelského rozhraní tabulek, které Sheets rozšiřuje.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, součástí
  balíčku přes [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) —
  engine obsahového proudu za skutečnou úpravou textu a obrázků v PDF.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) a
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — vykreslování PDF
  a sestavování dokumentů.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  blokové editory v Docs a Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — zdrojový editor v HTML.
- [Konva](https://konvajs.org/) — vykreslování plátna pro Slides a grafy v Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — metriky
  text-shapingu pro složitá písma.
- [calamine](https://github.com/tafia/calamine) a
  [IronCalc](https://github.com/ironcalc/IronCalc) — vrstvy pro čtení a výpočty
  v Rust xlsx sidecaru.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — dekodér
  MicroType Express pro vložená písma PowerPointu, přenesený do
  TypeScriptu.
- [React](https://react.dev/) (MIT) — vrstva uživatelského rozhraní každé
  aplikace.
- [Mermaid](https://mermaid.js.org/) (MIT) a [KaTeX](https://katex.org/)
  (MIT) — diagramy a matematika v Markdownu a Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — parsování písem pro
  metriky a vyhledávání glyfů.
- [JSZip](https://stuk.github.io/jszip/) (MIT) a
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — vrstvy kontejneru OOXML a XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — sada ikon použitá na pásech nástrojů.
- [electron-updater](https://www.electron.build/) (MIT) — aktualizace v
  rámci aplikace.
- Fonty Liberation, Carlito, Caladea a Noto CJK (OFL/Apache-2.0) — dodávané
  fonty dokumentů.

`npm run notices` znovu vygeneruje souhrn licencí dodávaných třetích stran
(`tools/gen-third-party-notices.mjs`); všechny runtime závislosti jsou
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Licence

Plot Docs je licencován pod [Apache License 2.0](../../LICENSE), s jednou
výjimkou: adresář `ee/` je vyhrazen pro budoucí podnikové moduly a je kryt
[Plot Docs Enterprise License](../../ee/LICENSE).

Názvy a loga Plot Docs a Soopus jsou ochranné známky společnosti Mainfunc,
Inc. Licence Apache-2.0 neuděluje oprávnění je používat (viz oddíl 6); forky
by měly používat vlastní branding.
