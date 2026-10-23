<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>Rangkaian Office AI sumber terbuka pertama di dunia yang paling lengkap ciri.</b><br>
Fail Word, Excel, PowerPoint dan PDF, disunting oleh anda dan AI anda, disimpan semula dalam format sebenar.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="License: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Latest release"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <b>Bahasa Melayu</b> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>Muat Turun</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>Laman Web</b></a> ·
  <a href="https://plotxyz.ai"><b>Komuniti</b></a> ·
  <a href="../../PRIVACY.md"><b>Privasi</b></a>
</p>

Plot Docs ialah alternatif percuma dan sumber terbuka kepada Microsoft Office
untuk macOS, Windows dan Linux. Ia membuka dan menyimpan fail asli `.docx`,
`.xlsx` dan `.pptx`, menyunting PDF, Markdown dan HTML, serta meletakkan agen
AI di sebelah setiap dokumen — bukan sekadar kotak sembang yang ditampal di
tepi, tetapi editor yang membaca fail, membuat perubahan itu, dan menunjukkan
kepada anda dengan tepat apa yang disentuhnya.

- **Format sebenar, terpelihara bit demi bit.** Hanya bahagian yang anda
  sunting akan ditulis semula. Selebihnya dalam fail terus terpelihara
  bit demi bit, jadi dokumen anda kekal berfungsi dalam Word, Excel dan
  PowerPoint.
- **AI yang boleh anda semak.** Suntingan tiba sebagai perubahan yang dijejak
  (tracked changes) dan diff dengan rollback satu klik. Hamparan mendapat
  formula langsung, bukan nombor yang ditampal. Deck dan halaman dijana terus
  pada kanvas dan kekal boleh disunting sepenuhnya.
- **Setempat mengikut reka bentuk.** Fail dibuka, disunting, disimpan dan
  ditukar terus pada mesin anda. PDF → Word / Excel / PowerPoint, Markdown →
  Word dan HTML → Word semuanya berjalan di peranti sendiri. Hanya panggilan
  AI yang keluar dari mesin, kepada pembekal pilihan anda.
- **Kunci anda sendiri atau tiada langsung.** Log masuk dengan Soopus dan
  anda tidak perlu sebarang kunci, atau bawa kunci anda sendiri untuk Claude,
  OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral,
  OpenRouter, Requesty, atau mana-mana titik akhir yang serasi dengan OpenAI, termasuk
  pelayan setempat.
- **Boleh dijalankan melalui skrip dan sedia untuk agen.** Aplikasi ini
  disertakan dengan baris arahan `plotdocs` dan skill untuk Claude Code,
  Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode dan Windsurf, jadi agen
  pengekodan boleh mencipta, menukar, membaca dan menyunting fail Office
  sebenar pada mesin anda tanpa membuka sebarang tetingkap.

**Dapatkan:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon dan Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 dan Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
butiran dan keperluan dalam [Muat Turun](#download).

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

## Mengapa Plot Docs

- **Sumber terbuka**, Apache-2.0, dibangunkan secara terbuka di GitHub.
- **Milik anda untuk dijalankan.** Aplikasi native untuk macOS, Windows dan
  Linux; fail kekal di cakera anda dan setiap suntingan, penyimpanan serta
  penukaran berlaku pada mesin anda sendiri.
- **Fail Office sebenar.** `.docx`, `.xlsx` dan `.pptx` native, terpelihara
  bit demi bit: bahagian fail yang tidak disentuh disalin seadanya.
- **AI yang menyunting dokumen itu sendiri.** Perubahan dijejak dalam Docs,
  formula dan carta langsung dalam Sheets, slaid dilukis terus pada kanvas,
  setiap pusingan AI adalah snapshot yang boleh anda kembalikan.
- **Model anda, kunci anda.** Log masuk dengan Soopus, atau bawa kunci
  untuk Claude, OpenAI, Gemini, DeepSeek dan lain-lain, termasuk pelayan
  setempat dan mana-mana endpoint serasi OpenAI.
- **PDF yang diuruskan dengan betul.** Sunting teks terus dalam halaman, dan
  tukar PDF kepada Word, Excel atau PowerPoint di peranti sendiri, dengan OCR
  sistem untuk hasil imbasan.
- **Markdown dan HTML juga**, dengan panel AI yang sama dan eksport setempat
  ke Word.
- **Boleh dijalankan melalui skrip.** Baris arahan `plotdocs`, skill agen
  dan pelayan MCP meletakkan setiap enjin di bawah khidmat Claude Code,
  Claude Desktop, Codex, Cursor dan agen lain, masih di peranti sendiri.
- **Percuma**, untuk individu dan pasukan.

## Bahagian belakang AI

**Log masuk dengan Soopus** dan tidak ada apa-apa yang perlu ditetapkan:
panggilan model disalurkan melalui proksi Soopus (keluarga Claude, GPT dan
Gemini) dan agen mendapat carian web serta imej, penjanaan imej, dan analisis
imej/audio/video.

**Atau bawa kunci anda sendiri.** Settings → AI menyenaraikan Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty
dan OpenCode Zen/Go, ditambah slot tersuai untuk mana-mana titik akhir yang
serasi dengan OpenAI (URL asas + kunci), termasuk pelayan model setempat.
Carian dan media mempunyai pembekal tersendiri mengikut keupayaan di bawah
**AI Media & Search**: Serper atau Tavily untuk carian web, dan OpenAI,
Gemini, Doubao/Seedream, GLM, Grok, Qwen, MiniMax atau mana-mana titik akhir
imej serasi OpenAI untuk penjanaan imej dan analisis imej/video.

Keseluruhan rangkaian ini disertakan dengan tema terang, gelap dan sistem.
Tema hanya mengubah apa yang dipaparkan pada skrin: eksport, cetakan dan fail
yang disimpan sentiasa mengekalkan warna sebenar dokumen itu.

<a id="command-line-and-agent-skill"></a>

## Baris arahan dan skill agen

Segala yang boleh dilakukan aplikasi pada sesuatu fail boleh dilakukan oleh
baris arahan `plotdocs` dari terminal: memeriksa, menukar, mencipta, membaca
dan menyunting Word, Excel, PowerPoint, PDF, Markdown dan HTML pada enjin yang
sama, tanpa antara muka (headless). Ia dipasang bersama Plot Docs, tidak
memerlukan runtime sendiri, dan tidak pernah menghantar dokumen ke mana-mana.
Digandingkan dengan **skill agen** yang disertakan, ia menjadikan agen
pengekodan sebagai pekerja dokumen yang menghasilkan fail Office sebenar dan
bukan anggaran dalam Markdown.

**Berfungsi dengan:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode dan Windsurf terus tanpa tetapan tambahan, mana-mana agen lain yang
membaca skill, dan, melalui [pelayan MCP](#mcp-server), Claude Desktop serta
setiap klien MCP.

### Memasang skill

| Cara                                              | Apa yang berlaku                                                                                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tetapan → Integrasi** dalam aplikasi            | Menyenaraikan agen yang ditemui pada komputer ini; satu klik menulis skill ke dalam setiap satu yang anda pilih. Butang **Update** muncul apabila keluaran Plot Docs membawa skill yang lebih baharu. |
| **Muat turun sebagai zip** pada halaman yang sama | Susun atur yang diterima oleh claude.ai, aplikasi desktop Claude dan pembantu lain sebagai skill yang dimuat naik.                                                                                    |
| `npx skills add plotxyz-ai/plot-docs`            | Memasang daripada repositori ini ke dalam mana-mana agen yang serasi dengan skill.                                                                                                                    |

Kemudian mulakan sembang baharu dan minta sesuatu dokumen. Skill itu mengajar
agen bila perlu menggunakan `plotdocs`, cara membaca fail sebelum
menyuntingnya, dan cara menyemak hasil kerjanya sendiri.

### Mula pantas dari terminal

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

Setiap arahan mencetak ringkasan satu baris, atau satu objek JSON dengan
`--json`. Suntingan bersifat atomik: op yang ditolak membiarkan fail tidak
tersentuh dan memulangkan ralat berpandu. `plotdocs help` menyenaraikan set
arahan semasa; rujukan penuh ada dalam
[packages/cli/README.md](../../packages/cli/README.md).

### Apa yang sebenarnya dijalankan oleh agen

Deck Sistem Suria dalam demo di atas hanya memerlukan satu gesaan dalam Claude
Code. Di sebaliknya, agen mengikuti aliran kerja berperingkat skill itu dan
CLI menyemak setiap peringkat sebelum peringkat seterusnya bermula:

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

Tiada panggilan model berlaku di dalam `plotdocs`: agen yang berfikir, CLI
yang membina dan menyemak, dan hasilnya dibuka dalam Plot Docs atau PowerPoint
sebagai `.pptx` biasa.

<a id="mcp-server"></a>

### Pelayan MCP

Arahan yang sama tersedia sebagai alat [Model Context Protocol](https://modelcontextprotocol.io)
untuk pembantu yang tidak boleh menjalankan terminal, atau yang anda lebih
suka tidak diberi satu. Terdapat dua cara untuk masuk, kedua-duanya
ditunjukkan dengan cebisan sedia salin dalam **Tetapan → Integrasi → MCP**:

| Cara                                | Apa dia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`** (disyorkan) | Pelayan stdio yang pembantu mulakan sendiri; Plot Docs tidak perlu dibuka. Satu alat bagi setiap arahan (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) ditambah aliran deck berperingkat `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Ops, spesifikasi dan Markdown dihantar terus dalam argumen, jadi klien tanpa sistem fail tetap berfungsi. |
| **B · Pelayan HTTP tempatan**       | Berjalan di dalam aplikasi Plot Docs pada `http://127.0.0.1:3093/mcp` (Streamable HTTP, dengan SSE lama). Alatnya memandu tab editor Word yang kelihatan: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, dan anda melihat dokumen itu terbentuk. Dimatikan secara lalai; hidupkan pada panel tetapan yang sama.                                                                                                                                                    |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop atau mana-mana klien MCP lain
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

`plotdocs` di sini ialah CLI yang disertakan di dalam aplikasi (pada macOS
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; panel
tetapan memaparkan laluan tepat untuk pemasangan anda). Pelayan ini membawa
arahan aliran kerjanya sendiri dan mendedahkan rujukan operasi sebagai
sumber `plotdocs://guide/*`, jadi tiada skill diperlukan; skill dan
pelayan MCP boleh wujud bersama dan pembantu memilih salah satu. Ciri awan
(`search`, `image`, `media`) masih melalui pembekal yang ditetapkan dalam
Plot Docs; selebihnya berjalan secara tempatan, dan
`PLOTDOCS_ALLOWED_ROOTS` mengehadkan setiap alat kepada folder yang anda
senaraikan.

Deck tenaga boleh diperbaharui dalam demo di atas ialah gambaran, dari sudut
protokol, satu gesaan dalam Claude Code yang hanya menyambungkan pelayan
MCP `plotdocs`:

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

Tiga puluh lapan panggilan, kira-kira tiga belas minit, dan pembantu itu
langsung tidak menyentuh shell: rajah, foto, semua panduan, semakan dan
render bergerak sebagai hasil panggilan alat MCP. Hanya `search` dan `media`
meninggalkan mesin, kepada pembekal yang dikonfigurasikan dalam Plot Docs.

<a id="download"></a>

## Muat Turun

| Platform                             | Keperluan                                             | Muat Turun                                                                                |
| ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [`.dmg` terkini (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)        |
| **macOS** — Intel (x64)              | macOS 11+                                             | [`.dmg` terkini (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)          |
| **Windows** (x64, kebanyakan PC)     | Windows 10+, Intel/AMD                                | [Pemasang `-x64.exe` terkini](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** pada Arm (ARM64)         | Windows 11 on Arm (Snapdragon X dan seumpamanya)      | [Pemasang `-arm64.exe` terkini](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 atau lebih baharu)  | [`.deb` terkini](https://github.com/plotxyz-ai/plot-docs/releases/latest)                |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [`.rpm` terkini](https://github.com/plotxyz-ai/plot-docs/releases/latest)                |
| **Linux** — pengedaran lain          | x86_64, glibc 2.34+, FUSE 2                           | [`.AppImage` terkini](https://github.com/plotxyz-ai/plot-docs/releases/latest)           |

Semua binaan berasal daripada `main`; pemasang macOS dan Windows telah
ditandatangani. Versi lama boleh didapati di halaman
[Releases](https://github.com/plotxyz-ai/plot-docs/releases).

<details>
<summary><b>Memasang pada Linux</b></summary>

Fail deb dipasang menggunakan apt — ia menarik kebergantungan dan menambah
Plot Docs ke menu aplikasi:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

Pada Fedora / keluarga RHEL / openSUSE, pasang fail rpm sebaliknya:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage berjalan di tempatnya: pasang runtime FUSE 2
(`sudo apt install libfuse2`; pada Ubuntu 24.04 paketnya bernama
`libfuse2t64`), jadikan fail itu boleh dilaksanakan, kemudian jalankannya:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## Cara ia berfungsi

Tujuh aplikasi Electron — Docs, Sheets, Slides, PDF, Markdown, HTML dan shell
bertab — berkongsi satu lapisan enjin pakej TypeScript tulen ditambah sidecar
Rust untuk `.xlsx`. Fail asal sentiasa menjadi sumber kebenaran: suntingan
digunakan sebagai tampung (patch) yang sempit, dan segala yang tidak
disentuh oleh editor itu kekal utuh selepas pergi-balik.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

Lawatan pakej demi pakej (enjin docx/pptx, `pdf2docx`, `html2docx`, teras
agen dan pembekal) terdapat dalam
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Pembangunan

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

Aplikasi sheets juga memerlukan toolchain Rust untuk sidecar xlsx-nya
(`cargo` pada PATH); `npm run build -w @plotdocs/sheets` mengkompilnya
secara automatik. Lihat [CONTRIBUTING.md](../../CONTRIBUTING.md) untuk semakan
yang perlu dilalui setiap perubahan dan cara pull request diterima masuk.

## Komuniti

Plot Docs sedang dibangunkan secara aktif dan maklum balas anda membentuknya.

- **Laporkan pepijat atau minta ciri** di
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues).
- **Sertai sembang kumpulan Plot Docs** di
  [PlotCommunity](https://plotxyz.ai) untuk berbual dengan pasukan dan
  pengguna lain.
- **Berikan bintang pada repo ini** jika Plot Docs bermanfaat untuk anda —
  ini cara terbaik untuk menyokong projek ini.

## Soalan Lazim

<details>
<summary><b>Adakah Plot Docs percuma?</b></summary>

Ya. Plot Docs percuma dan sumber terbuka di bawah lesen Apache-2.0 — tiada
percubaan, tiada peringkat berbayar untuk aplikasi itu sendiri.

</details>

<details>
<summary><b>Bolehkah Plot Docs membuka fail Microsoft Word, Excel dan PowerPoint?</b></summary>

Ya. Plot Docs membuka dan menyimpan fail asli `.docx`, `.xlsx` dan `.pptx`.
Penyimpanan terpelihara bit demi bit: bahagian fail yang tidak anda sentuh
ditulis semula seadanya, jadi dokumen kekal berfungsi dalam Microsoft Office.

</details>

<details>
<summary><b>Adakah Plot Docs berfungsi luar talian?</b></summary>

Penyuntingan dokumen sepenuhnya setempat — fail tidak pernah keluar daripada
mesin anda untuk dibuka, disunting, disimpan atau ditukar. Ciri-ciri AI
(agen, carian, alat imej) memerlukan sambungan rangkaian, sama ada dengan log
masuk Soopus atau kunci API model anda sendiri.

</details>

<details>
<summary><b>Bolehkah Plot Docs menyunting fail PDF?</b></summary>

Ya — penyuntingan teks dan imej PDF sebenar yang menulis semula strim
kandungan halaman dengan fon asal terpelihara, bukan anotasi yang sekadar
menutup.

</details>

<details>
<summary><b>Bolehkah Plot Docs menukar PDF kepada Word, Excel atau PowerPoint?</b></summary>

Ya — sepenuhnya di peranti sendiri: pengekstrakan aksara PDFium ditambah
analisis susun atur berasaskan geometri, tanpa perkhidmatan awan, tanpa muat
naik. Halaman yang diimbas turut disokong: pada macOS dan Windows, OCR sistem
membacanya, jadi ia ditukar kepada teks yang boleh disunting bukan imej
halaman.

</details>

<details>
<summary><b>Bolehkah saya menggunakan model AI atau kunci API saya sendiri?</b></summary>

Ya. Selain log masuk Soopus tanpa kunci, Plot Docs menyokong bawa kunci
anda sendiri untuk Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao,
MiniMax, Grok, Mistral, OpenRouter, Requesty dan OpenCode Zen/Go, ditambah mana-mana
titik akhir serasi OpenAI — termasuk pelayan model setempat. Carian,
penjanaan imej dan analisis imej/video memerlukan kunci tersendiri di bawah
Settings → AI Media & Search.

</details>

<details>
<summary><b>Bolehkah Plot Docs menukar HTML kepada Word?</b></summary>

Ya — Export as Word dalam aplikasi HTML menghasilkan `.docx` asli yang boleh
disunting, sepenuhnya di peranti sendiri. Halaman itu dipaparkan dalam
Chromium terbina dalam dan dikurangkan kepada struktur Word sebenar: tajuk,
perenggan, senarai, jadual, kad, baris KPI, medan borang dan latar belakang
halaman; hanya visual yang tidak mempunyai persamaan dalam Word (carta, ikon,
kotak berhias) dibenamkan sebagai gambar.

</details>

<details>
<summary><b>Bolehkah saya memandu Plot Docs daripada Claude Code, Codex, Cursor atau skrip?</b></summary>

Ya. Plot Docs memasang baris arahan `plotdocs` yang menjalankan enjin yang
sama tanpa antara muka: memeriksa, menukar, mencipta, membaca dan menyunting
dokumen dari terminal atau skrip, dengan output `--json` untuk program. Skill
agen yang disertakan mengajar Claude Code, Codex, Cursor, Gemini CLI, GitHub
Copilot, OpenCode dan Windsurf menggunakannya; pasang daripada
**Tetapan → Integrasi**. Lihat
[Baris arahan dan skill agen](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Adakah Plot Docs mengumpul sebarang data?</b></summary>

Binaan pakej rasmi menghantar analitik penggunaan yang terhad secara lalai,
dan anda boleh melumpuhkan pelaporan itu pada bila-bila masa di bawah
Settings → General. Analitik tidak pernah menghantar kandungan dokumen, nama
fail, laluan fail, identiti akaun atau alamat e-mel. Lihat
[Plot Docs Privacy](../../PRIVACY.md) untuk pendedahan penuh peristiwa dan
data.

</details>

## Keselamatan

Lihat [SECURITY.md](../../SECURITY.md) untuk kedudukan keselamatan proses
(kotak pasir renderer, pengesahan IPC, kawalan pautan luar) dan model
ancaman untuk kandungan yang dijana AI.

## Penghargaan

Plot Docs tidak akan wujud tanpa projek-projek sumber terbuka ini:

- [Electron](https://www.electronjs.org/) — runtime desktop untuk setiap
  aplikasi.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — teras UI
  hamparan yang dilanjutkan oleh Sheets.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, disertakan
  melalui [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) —
  enjin strim kandungan di sebalik penyuntingan teks dan imej PDF sebenar.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) dan
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — pemaparan PDF dan
  penyusunan dokumen.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  editor blok dalam Docs dan Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — editor sumber dalam HTML.
- [Konva](https://konvajs.org/) — pemaparan kanvas untuk Slides dan carta
  Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — metrik pembentukan
  teks untuk skrip kompleks.
- [calamine](https://github.com/tafia/calamine) dan
  [IronCalc](https://github.com/ironcalc/IronCalc) — lapisan baca dan kira
  bagi sidecar xlsx Rust.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — penyahkod
  MicroType Express untuk fon PowerPoint terbenam, yang diport ke TypeScript.
- [React](https://react.dev/) (MIT) — lapisan UI setiap aplikasi.
- [Mermaid](https://mermaid.js.org/) (MIT) dan [KaTeX](https://katex.org/)
  (MIT) — rajah dan matematik dalam Markdown dan Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — penghuraian fon untuk
  metrik dan carian glif.
- [JSZip](https://stuk.github.io/jszip/) (MIT) dan
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — lapisan bekas OOXML dan XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — set ikon merentasi semua ribbon.
- [electron-updater](https://www.electron.build/) (MIT) — kemas kini dalam
  aplikasi.
- Fon Liberation, Carlito, Caladea, dan Noto CJK (OFL/Apache-2.0) — fon
  dokumen yang disertakan.

`npm run notices` menjana semula ringkasan lesen pihak ketiga yang disertakan
(`tools/gen-third-party-notices.mjs`); semua kebergantungan masa jalan adalah
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Lesen

Plot Docs dilesenkan di bawah [Apache License 2.0](../../LICENSE), dengan
satu kekecualian: direktori `ee/` dikhususkan untuk modul perusahaan pada
masa hadapan dan dilindungi oleh
[Lesen Perusahaan Plot Docs](../../ee/LICENSE).

Nama dan logo Plot Docs serta Soopus adalah tanda dagangan Mainfunc, Inc.
Lesen Apache-2.0 tidak memberikan kebenaran untuk menggunakannya (lihat
seksyen 6); fork perlulah menggunakan penjenamaan mereka sendiri.
