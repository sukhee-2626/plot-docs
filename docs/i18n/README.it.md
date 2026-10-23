<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>La prima suite office AI open source e completa al mondo.</b><br>
File Word, Excel, PowerPoint e PDF, modificati da te e dalla tua AI, salvati negli stessi formati reali.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="License: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Latest release"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <b>Italiano</b> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>Sito web</b></a> ·
  <a href="https://plotxyz.ai"><b>Community</b></a> ·
  <a href="../../PRIVACY.md"><b>Privacy</b></a>
</p>

Plot Docs è un'alternativa gratuita e open source a Microsoft Office per
macOS, Windows e Linux. Apre e salva file nativi `.docx`, `.xlsx` e `.pptx`,
permette di modificare PDF, Markdown e HTML, e affianca un agente AI a ogni
documento — non una chat incollata a fianco, ma un editor che legge il file,
applica la modifica e ti mostra esattamente cosa ha toccato.

- **Formati reali, preservati byte per byte.** Viene riscritto solo ciò che
  modifichi. Tutto il resto del file resta identico byte per byte, così i
  documenti continuano a funzionare in Word, Excel e PowerPoint.
- **AI che puoi controllare.** Le modifiche arrivano come revisioni tracciate
  e diff con ripristino a un clic. I fogli di calcolo ottengono formule live,
  non numeri incollati. Le presentazioni e le pagine vengono generate
  direttamente sulla canvas e restano completamente modificabili.
- **Locale per progettazione.** I file si aprono, si modificano, si salvano e
  si convertono sul tuo computer. Le conversioni PDF → Word / Excel /
  PowerPoint, Markdown → Word e HTML → Word avvengono tutte in locale. Solo
  le chiamate AI lasciano la macchina, verso il provider che scegli.
- **Le tue chiavi, o nessuna.** Accedi con Soopus e non dovrai configurare
  nulla, oppure usa la tua chiave per Claude, OpenAI, Gemini, DeepSeek, Kimi,
  GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty o qualsiasi endpoint
  compatibile con OpenAI, inclusi i server locali.
- **Scriptabile e pronto per gli agenti.** L'app include una riga di comando
  `plotdocs` e uno skill per Claude Code, Codex, Cursor, Gemini CLI, GitHub
  Copilot, OpenCode e Windsurf, così un agente di coding può creare,
  convertire, leggere e modificare file Office reali sul tuo computer senza
  aprire una finestra.

**Scaricalo:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon e Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 e Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
dettagli e requisiti nella sezione [Download](#download).

## Demo

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

## Perché Plot Docs

- **Open source**, Apache-2.0, sviluppato in modo aperto su GitHub.
- **Tuo da eseguire.** App native per macOS, Windows e Linux; i file restano
  sul tuo disco e ogni modifica, salvataggio e conversione avviene sul tuo
  computer.
- **File Office reali.** `.docx`, `.xlsx` e `.pptx` nativi, con preservazione
  byte per byte: le parti del file che non hai toccato vengono copiate
  esattamente come erano.
- **Un'AI che modifica direttamente il documento.** Revisioni tracciate in
  Docs, formule e grafici live in Sheets, slide disegnate sulla canvas, ogni
  intervento dell'AI genera uno snapshot da cui puoi tornare indietro.
- **Il tuo modello, la tua chiave.** Accedi con Soopus, oppure usa una
  chiave per Claude, OpenAI, Gemini, DeepSeek e altri, con server locali e
  qualsiasi endpoint compatibile con OpenAI incluso.
- **PDF fatto bene.** Modifica il testo direttamente nella pagina e converti
  PDF in Word, Excel o PowerPoint in locale, con OCR di sistema per le
  scansioni.
- **Anche Markdown e HTML**, con lo stesso pannello AI e l'esportazione locale
  in Word.
- **Scriptabile.** Una riga di comando `plotdocs`, uno skill per agenti e
  un server MCP mettono ogni motore al servizio di Claude Code, Claude
  Desktop, Codex, Cursor e altri agenti, sempre in locale.
- **Gratuito**, per singoli utenti e team.

## Backend AI

**Accedi con Soopus** e non c'è nulla da configurare: le chiamate ai
modelli passano attraverso il proxy Soopus (famiglie Claude, GPT e Gemini)
e gli agenti hanno accesso a ricerca web e per immagini, generazione di
immagini e analisi di immagini/audio/video.

**Oppure usa la tua chiave.** In Settings → AI trovi Claude, OpenAI, Gemini,
DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty e
OpenCode Zen/Go, più uno slot personalizzato per qualsiasi endpoint
compatibile con OpenAI (base URL + chiave), inclusi i server con modelli
locali. Ricerca e media hanno i propri provider per singola funzionalità
sotto **AI Media & Search**: Serper o Tavily per la ricerca web, e OpenAI,
Gemini, Doubao/Seedream, GLM, Grok, Qwen, MiniMax o qualsiasi endpoint di
immagini compatibile con OpenAI per la generazione di immagini e l'analisi
di immagini/video.

L'intera suite include i temi chiaro, scuro e di sistema. I temi cambiano
solo ciò che vedi a schermo: esportazioni, stampe e file salvati mantengono
sempre i colori originali del documento.

<a id="command-line-and-agent-skill"></a>

## Riga di comando e skill per agenti

Tutto ciò che le app possono fare a un file, la riga di comando `plotdocs`
può farlo da un terminale: ispezionare, convertire, creare, leggere e
modificare Word, Excel, PowerPoint, PDF, Markdown e HTML con gli stessi
motori, senza interfaccia grafica. Si installa insieme a Plot Docs, non ha
bisogno di un runtime proprio e non invia mai un documento da nessuna parte.
Abbinata allo **skill per agenti** incluso, trasforma un agente di coding in
un operaio dei documenti che produce file Office reali invece di
approssimazioni in Markdown.

**Funziona con:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode e Windsurf senza configurazione, con qualsiasi altro agente che
legga gli skill e, tramite il [server MCP](#mcp-server), Claude Desktop e
qualsiasi client MCP.

### Installare lo skill

| Come                                     | Cosa succede                                                                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Impostazioni → Integrazioni** nell'app | Elenca gli agenti trovati su questo computer; un clic scrive lo skill in ognuno di quelli che scegli. Un pulsante **Aggiorna** compare quando una release di Plot Docs porta uno skill più recente. |
| **Scarica come zip** nella stessa pagina | Il formato che claude.ai, le app desktop di Claude e altri assistenti accettano come skill caricato.                                                                                                |
| `npx skills add plotxyz-ai/plot-docs`   | Installa da questo repository in qualsiasi agente compatibile con gli skill.                                                                                                                        |

Poi apri una nuova chat e chiedi un documento. Lo skill insegna all'agente
quando ricorrere a `plotdocs`, come leggere un file prima di modificarlo e
come controllare il proprio lavoro.

### Avvio rapido dal terminale

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

Ogni comando stampa un riepilogo di una riga, oppure un singolo oggetto JSON
con `--json`. Le modifiche sono atomiche: un'operazione respinta lascia il
file intatto e restituisce un errore guidato. `plotdocs help` elenca i
comandi attualmente disponibili; il riferimento completo è in
[packages/cli/README.md](../../packages/cli/README.md).

### Cosa esegue davvero l'agente

La presentazione sul Sistema Solare della demo qui sopra ha richiesto un
solo prompt in Claude Code. Dietro le quinte, l'agente ha seguito il flusso
di lavoro a fasi dello skill e la CLI ha controllato ogni fase prima di
avviare la successiva:

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

Nessuna chiamata a un modello avviene dentro `plotdocs`: l'agente pensa, la
CLI costruisce e controlla, e il risultato si apre in Plot Docs o PowerPoint
come un normale `.pptx`.

<a id="mcp-server"></a>

### Server MCP

Gli stessi comandi sono disponibili come strumenti
[Model Context Protocol](https://modelcontextprotocol.io), per gli
assistenti che non possono eseguire un terminale o a cui preferisci non
darne uno. Ci sono due modi per collegarsi, entrambi mostrati con frammenti
pronti da copiare in **Impostazioni → Integrazioni → MCP**:

| Modo                                  | Cos'è                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`** (consigliato) | Un server stdio che l'assistente avvia da sé; Plot Docs non deve essere aperto. Uno strumento per comando (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) più il flusso di presentazione a fasi `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Operazioni, specifiche e Markdown vengono passati inline, quindi funziona anche un client senza file system. |
| **B · Server HTTP locale**            | Gira dentro l'app Plot Docs su `http://127.0.0.1:3093/mcp` (Streamable HTTP, con SSE legacy). I suoi strumenti guidano una scheda dell'editor Word visibile: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, e osservi il documento prendere forma. Disattivato di default; attivalo nello stesso pannello delle impostazioni.                                                                                                                                               |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop o qualsiasi altro client MCP
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

Qui `plotdocs` è la CLI inclusa nell'app (su macOS
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; il pannello
delle impostazioni mostra il percorso esatto della tua installazione). Il
server porta con sé le proprie istruzioni di workflow ed espone i
riferimenti delle operazioni come risorse `plotdocs://guide/*`, quindi non
serve alcuno skill; lo skill e il server MCP possono coesistere e
l'assistente ne sceglie uno. Le funzionalità cloud (`search`, `image`,
`media`) passano comunque dal provider configurato in Plot Docs; tutto il
resto gira in locale, e `PLOTDOCS_ALLOWED_ROOTS` limita ogni strumento
alle cartelle che indichi.

La presentazione sulle energie rinnovabili della demo qui sopra è come
appare, dal lato del protocollo, un solo prompt in Claude Code con
collegato solo il server MCP di `plotdocs`:

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

Trentotto chiamate, circa tredici minuti, e l'assistente non ha mai
toccato un terminale: le figure, le foto, le guide, i controlli e i render
sono arrivati tutti come risultati di strumenti MCP. Solo `search` e
`media` hanno lasciato la macchina, verso il provider configurato in
Plot Docs.

<a id="download"></a>

## Download

| Piattaforma                                | Requisiti                                             | Download                                                                                   |
| ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **macOS** — Apple Silicon (arm64)          | macOS 11+                                             | [Ultima versione `.dmg` (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **macOS** — Intel (x64)                    | macOS 11+                                             | [Ultima versione `.dmg` (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** (x64, la maggior parte dei PC) | Windows 10+, Intel/AMD                                | [Ultimo installer `-x64.exe`](https://github.com/plotxyz-ai/plot-docs/releases/latest)    |
| **Windows** su Arm (ARM64)                 | Windows 11 su Arm (Snapdragon X e simili)             | [Ultimo installer `-arm64.exe`](https://github.com/plotxyz-ai/plot-docs/releases/latest)  |
| **Linux** — Debian / Ubuntu                | x86_64, glibc 2.34+ (Ubuntu 22.04 o successivo)       | [Ultimo `.deb`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — Fedora / RHEL / openSUSE       | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Ultimo `.rpm`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — altre distribuzioni            | x86_64, glibc 2.34+, FUSE 2                           | [Ultimo `.AppImage`](https://github.com/plotxyz-ai/plot-docs/releases/latest)             |

Tutte le build provengono da `main`; gli installer per macOS e Windows sono
firmati. Le versioni precedenti sono disponibili nella pagina
[Releases](https://github.com/plotxyz-ai/plot-docs/releases).

<details>
<summary><b>Installazione su Linux</b></summary>

Il deb si installa con apt — scarica le dipendenze e aggiunge Plot Docs al
menu delle applicazioni:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

Su Fedora / famiglia RHEL / openSUSE, installa invece l'rpm:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

L'AppImage viene eseguito così com'è: installa il runtime FUSE 2
(`sudo apt install libfuse2`; su Ubuntu 24.04 il pacchetto è `libfuse2t64`),
rendi il file eseguibile, poi eseguilo:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## Come funziona

Sette app Electron — Docs, Sheets, Slides, PDF, Markdown, HTML e la shell a
schede — condividono un unico livello motore fatto di package TypeScript
puri più un sidecar Rust per `.xlsx`. Il file originale è sempre la fonte di
verità: le modifiche vengono applicate come patch mirate, e tutto ciò che
l'editor non ha toccato sopravvive intatto al ciclo di apertura e
salvataggio.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

Il tour package per package (motori docx/pptx, `pdf2docx`, `html2docx`, il
core dell'agente e i provider) si trova in
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Sviluppo

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

L'app sheets richiede inoltre una toolchain Rust per il suo sidecar xlsx
(`cargo` nel PATH); `npm run build -w @plotdocs/sheets` la compila
automaticamente. Consulta [CONTRIBUTING.md](../../CONTRIBUTING.md) per i
controlli che ogni modifica deve superare e per come vengono accettate le
pull request.

## Community

Plot Docs è in sviluppo attivo e il tuo feedback lo plasma.

- **Segnala un bug o richiedi una funzionalità** su
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues).
- **Unisciti alla chat di gruppo di Plot Docs** su
  [PlotCommunity](https://plotxyz.ai) per parlare con il team e con altri
  utenti.
- **Metti una stella al repo** se Plot Docs ti è utile — è il modo migliore
  per supportare il progetto.

## FAQ

<details>
<summary><b>Plot Docs è gratuito?</b></summary>

Sì. Plot Docs è gratuito e open source sotto licenza Apache-2.0 — nessuna
prova, nessun piano a pagamento per le app in sé.

</details>

<details>
<summary><b>Plot Docs può aprire file Microsoft Word, Excel e PowerPoint?</b></summary>

Sì. Plot Docs apre e salva file nativi `.docx`, `.xlsx` e `.pptx`. Il
salvataggio preserva i byte: le parti del file che non hai toccato vengono
riscritte byte per byte, così i documenti continuano a funzionare in
Microsoft Office.

</details>

<details>
<summary><b>Plot Docs funziona offline?</b></summary>

La modifica dei documenti è completamente locale — i file non lasciano mai
il tuo computer per essere aperti, modificati, salvati o convertiti. Le
funzionalità AI (agenti, ricerca, strumenti per le immagini) richiedono una
connessione di rete, con l'accesso Soopus oppure con una tua chiave API
per il modello.

</details>

<details>
<summary><b>Plot Docs può modificare file PDF?</b></summary>

Sì — una vera modifica di testo e immagini nel PDF, che riscrive il content
stream della pagina preservando i font originali, non con annotazioni che
coprono il testo.

</details>

<details>
<summary><b>Plot Docs può convertire PDF in Word, Excel o PowerPoint?</b></summary>

Sì — completamente in locale: estrazione a livello di carattere con PDFium
più un'analisi del layout basata sulla geometria, nessun servizio cloud,
nessun upload. Sono coperte anche le pagine scansionate: su macOS e Windows
l'OCR di sistema le legge, così vengono convertite in testo modificabile
invece che in un'immagine di pagina.

</details>

<details>
<summary><b>Posso usare un mio modello AI o una mia chiave API?</b></summary>

Sì. Oltre all'accesso Soopus senza chiavi, Plot Docs supporta l'uso della
tua chiave per Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao,
MiniMax, Grok, Mistral, OpenRouter, Requesty e OpenCode Zen/Go, più qualsiasi endpoint
compatibile con OpenAI — inclusi i server con modelli locali. Ricerca,
generazione di immagini e analisi di immagini/video richiedono le proprie
chiavi in Settings → AI Media & Search.

</details>

<details>
<summary><b>Plot Docs può convertire HTML in Word?</b></summary>

Sì — Export as Word nell'app HTML produce un `.docx` nativo e modificabile,
interamente in locale. La pagina viene renderizzata nel Chromium integrato e
ridotta a vere strutture Word: titoli, paragrafi, elenchi, tabelle, card,
righe KPI, campi modulo e sfondi di pagina; solo gli elementi visivi senza
un equivalente in Word (grafici, icone, box decorati) vengono incorporati
come immagini.

</details>

<details>
<summary><b>Posso guidare Plot Docs da Claude Code, Codex, Cursor o da uno script?</b></summary>

Sì. Plot Docs installa una riga di comando `plotdocs` che esegue gli stessi
motori senza interfaccia grafica: ispeziona, converti, crea, leggi e modifica
documenti da un terminale o da uno script, con output `--json` per i
programmi. Lo skill per agenti incluso insegna a Claude Code, Codex, Cursor,
Gemini CLI, GitHub Copilot, OpenCode e Windsurf a usarla; installalo da
**Impostazioni → Integrazioni**. Vedi
[Riga di comando e skill per agenti](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Plot Docs raccoglie dati?</b></summary>

Le build ufficiali inviano per impostazione predefinita analytics d'uso
limitate, e puoi disattivare l'invio in qualsiasi momento in Settings →
General. Le analytics non inviano mai il contenuto dei documenti, i nomi dei
file, i percorsi dei file, l'identità dell'account o gli indirizzi email.
Consulta [Plot Docs Privacy](../../PRIVACY.md) per l'elenco completo di
eventi e dati raccolti.

</details>

## Sicurezza

Consulta [SECURITY.md](../../SECURITY.md) per la postura di sicurezza dei
processi (sandboxing del renderer, validazione IPC, filtro dei link esterni)
e i modelli di minaccia per i contenuti generati dall'AI.

## Ringraziamenti

Plot Docs non sarebbe possibile senza questi progetti open source:

- [Electron](https://www.electronjs.org/) — il runtime desktop per ogni app.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — il core
  dell'interfaccia per fogli di calcolo che Sheets estende.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, incluso
  tramite [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer))
  — il motore del content stream dietro la vera modifica di testo e immagini
  nei PDF.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) e
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — rendering PDF e
  assemblaggio dei documenti.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  i block editor di Docs e Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — l'editor sorgente nell'app
  HTML.
- [Konva](https://konvajs.org/) — rendering su canvas per Slides e per i
  grafici di Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — metriche di
  text-shaping per le scritture complesse.
- [calamine](https://github.com/tafia/calamine) e
  [IronCalc](https://github.com/ironcalc/IronCalc) — i livelli di lettura e
  calcolo del sidecar Rust per xlsx.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — il decoder
  MicroType Express per i font PowerPoint incorporati, portato in
  TypeScript.
- [React](https://react.dev/) (MIT) — il livello dell'interfaccia utente di
  ogni app.
- [Mermaid](https://mermaid.js.org/) (MIT) e [KaTeX](https://katex.org/)
  (MIT) — diagrammi e formule matematiche in Markdown e Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — l'analisi dei font per le
  metriche e la ricerca dei glifi.
- [JSZip](https://stuk.github.io/jszip/) (MIT) e
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — i livelli del contenitore OOXML e XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — il set di icone usato nelle barre multifunzione.
- [electron-updater](https://www.electron.build/) (MIT) — gli aggiornamenti
  all'interno dell'app.
- I font Liberation, Carlito, Caladea e Noto CJK (OFL/Apache-2.0) — font per
  documenti incluse nel bundle.

`npm run notices` rigenera il riepilogo delle licenze di terze parti incluse
(`tools/gen-third-party-notices.mjs`); tutte le dipendenze a runtime sono
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Licenza

Plot Docs è distribuito con licenza [Apache License 2.0](../../LICENSE), con
un'unica eccezione: la directory `ee/` è riservata a futuri moduli
enterprise ed è coperta dalla
[Plot Docs Enterprise License](../../ee/LICENSE).

I nomi e i loghi Plot Docs e Soopus sono marchi di Mainfunc, Inc. La
licenza Apache-2.0 non concede il permesso di utilizzarli (vedi la sezione
6); i fork dovrebbero usare un proprio branding.
