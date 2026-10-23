<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>Suite Office AI open-source pertama di dunia yang paling lengkap.</b><br>
File Word, Excel, PowerPoint, dan PDF, diedit oleh Anda dan AI Anda, disimpan kembali dalam format aslinya.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="License: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Latest release"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <b>Bahasa Indonesia</b> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>Unduh</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>Situs Web</b></a> ·
  <a href="https://plotxyz.ai"><b>Komunitas</b></a> ·
  <a href="../../PRIVACY.md"><b>Privasi</b></a>
</p>

Plot Docs adalah alternatif Microsoft Office yang gratis dan open-source
untuk macOS, Windows, dan Linux. Aplikasi ini membuka dan menyimpan file
`.docx`, `.xlsx`, dan `.pptx` asli, mengedit PDF, Markdown, dan HTML, serta
menghadirkan agen AI di samping setiap dokumen — bukan sekadar kotak obrolan
yang ditempelkan di sisi layar, melainkan editor yang membaca file, membuat
perubahan, dan menunjukkan dengan tepat bagian mana yang diubah.

- **Format asli, byte-preserving.** Hanya bagian yang Anda edit yang ditulis
  ulang. Bagian lain dari file tetap sama persis, byte demi byte, sehingga
  dokumen tetap berfungsi normal di Word, Excel, dan PowerPoint.
- **AI yang bisa Anda tinjau.** Perubahan tercatat sebagai tracked changes dan
  diff dengan opsi rollback satu klik. Spreadsheet mendapatkan rumus hidup,
  bukan angka yang ditempel. Deck dan halaman dibuat langsung di kanvas dan
  tetap bisa diedit secara penuh.
- **Lokal secara desain.** File dibuka, diedit, disimpan, dan dikonversi di
  perangkat Anda sendiri. Konversi PDF → Word / Excel / PowerPoint, Markdown →
  Word, dan HTML → Word semuanya berjalan on-device. Hanya panggilan AI yang
  meninggalkan perangkat, menuju penyedia yang Anda pilih.
- **Kunci API Anda sendiri, atau tanpa kunci sama sekali.** Masuk dengan
  Soopus dan lewati urusan kunci API, atau gunakan kunci Anda sendiri untuk
  Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok,
  Mistral, OpenRouter, Requesty, atau endpoint apa pun yang kompatibel dengan OpenAI,
  termasuk server lokal.
- **Dapat dijalankan lewat skrip dan siap untuk agen.** Aplikasi ini
  menyertakan baris perintah `plotdocs` dan sebuah skill untuk Claude Code,
  Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, dan Windsurf, sehingga
  coding agent bisa membuat, mengonversi, membaca, dan mengedit file Office
  asli di mesin Anda tanpa membuka satu jendela pun.

**Unduh di sini:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon dan Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 dan Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
detail dan persyaratan ada di bagian [Download](#download).

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

- **Open source**, Apache-2.0, dikembangkan secara terbuka di GitHub.
- **Milik Anda untuk dijalankan.** Aplikasi native untuk macOS, Windows, dan
  Linux; file tetap di disk Anda dan setiap pengeditan, penyimpanan, dan
  konversi terjadi di perangkat Anda sendiri.
- **File Office asli.** `.docx`, `.xlsx`, dan `.pptx` native, byte-preserving:
  bagian file yang tidak Anda sentuh disalin apa adanya.
- **AI yang mengedit dokumen itu sendiri.** Tracked changes di Docs, rumus dan
  grafik langsung di Sheets, slide yang digambar langsung di kanvas, setiap
  giliran AI adalah snapshot yang bisa Anda kembalikan.
- **Model Anda, kunci Anda.** Masuk dengan Soopus, atau bawa kunci untuk
  Claude, OpenAI, Gemini, DeepSeek dan lainnya, termasuk server lokal dan
  endpoint apa pun yang kompatibel dengan OpenAI.
- **PDF yang ditangani dengan benar.** Edit teks langsung di halaman, dan
  konversi PDF ke Word, Excel, atau PowerPoint secara on-device, dengan OCR
  sistem untuk hasil pindaian.
- **Markdown dan HTML juga**, dengan panel AI yang sama dan ekspor lokal ke
  Word.
- **Dapat dijalankan lewat skrip.** Baris perintah `plotdocs`, skill agen,
  dan server MCP menempatkan setiap engine untuk melayani Claude Code,
  Claude Desktop, Codex, Cursor, dan agen lainnya, tetap on-device.
- **Gratis**, untuk individu maupun tim.

## Backend AI

**Masuk dengan Soopus** dan tidak ada yang perlu dikonfigurasi: panggilan
model diarahkan lewat proxy Soopus (keluarga Claude, GPT, dan Gemini) dan
agen mendapatkan akses pencarian web dan gambar, generasi gambar, serta
analisis gambar/audio/video.

**Atau bawa kunci Anda sendiri.** Settings → AI menampilkan Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty,
dan OpenCode Zen/Go, plus slot khusus untuk endpoint apa pun yang kompatibel
dengan OpenAI (base URL + kunci), termasuk server model lokal. Pencarian dan
media memiliki penyedia tersendiri per kemampuan di bawah **AI Media &
Search**: Serper atau Tavily untuk pencarian web, dan OpenAI, Gemini,
Doubao/Seedream, GLM, Grok, Qwen, MiniMax, atau endpoint apa pun yang
kompatibel dengan OpenAI untuk generasi gambar serta analisis gambar/video.

Seluruh suite mendukung tema terang, gelap, dan sistem. Tema hanya mengubah
tampilan di layar: ekspor, cetakan, dan file yang disimpan selalu
mempertahankan warna asli dokumen.

<a id="command-line-and-agent-skill"></a>

## Baris perintah dan skill agen

Semua yang bisa dilakukan aplikasi terhadap sebuah file, bisa dilakukan baris
perintah `plotdocs` dari terminal: memeriksa, mengonversi, membuat, membaca,
dan mengedit Word, Excel, PowerPoint, PDF, Markdown, dan HTML dengan engine
yang sama, secara headless. Ia terpasang bersama Plot Docs, tidak memerlukan
runtime sendiri, dan tidak pernah mengirim dokumen ke mana pun. Dipadukan
dengan **skill agen** yang disertakan, ia mengubah coding agent menjadi
pekerja dokumen yang menghasilkan file Office asli, bukan tiruan dalam
Markdown.

**Bekerja dengan:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode, dan Windsurf langsung tanpa konfigurasi, agen lain mana pun yang
membaca skill, dan, lewat [server MCP](#mcp-server), Claude Desktop serta
semua MCP client.

### Memasang skill

| Cara                                       | Yang terjadi                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pengaturan → Integrasi** di aplikasi     | Menampilkan agen yang ditemukan di komputer ini; satu klik menulis skill ke setiap agen yang Anda pilih. Tombol **Update** muncul saat rilis Plot Docs membawa skill yang lebih baru. |
| **Unduh sebagai zip** di halaman yang sama | Tata letak yang diterima claude.ai, aplikasi desktop Claude, dan asisten lain sebagai skill yang diunggah.                                                                            |
| `npx skills add plotxyz-ai/plot-docs`     | Memasang dari repositori ini ke agen mana pun yang kompatibel dengan skill.                                                                                                           |

Lalu mulai chat baru dan minta sebuah dokumen. Skill ini mengajari agen kapan
harus menggunakan `plotdocs`, bagaimana membaca file sebelum mengeditnya,
dan bagaimana memeriksa hasil kerjanya sendiri.

### Mulai cepat dari terminal

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

Setiap perintah mencetak ringkasan satu baris, atau satu objek JSON dengan
`--json`. Pengeditan bersifat atomik: op yang ditolak membiarkan file tak
tersentuh dan mengembalikan pesan kesalahan berpanduan. `plotdocs help`
mencantumkan daftar perintah saat ini; referensi lengkapnya ada di
[packages/cli/README.md](../../packages/cli/README.md).

### Apa yang sebenarnya dijalankan agen

Deck Tata Surya di demo di atas hanya butuh satu prompt di Claude Code. Di
baliknya, agen mengikuti alur kerja bertahap dari skill dan CLI memeriksa
setiap tahap sebelum tahap berikutnya dimulai:

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

Tidak ada panggilan model yang terjadi di dalam `plotdocs`: agen yang
berpikir, CLI yang membangun dan memeriksa, dan hasilnya terbuka di Plot Docs
atau PowerPoint sebagai `.pptx` biasa.

<a id="mcp-server"></a>

### Server MCP

Perintah yang sama tersedia sebagai alat [Model Context Protocol](https://modelcontextprotocol.io)
untuk asisten yang tidak bisa menjalankan terminal, atau yang tidak ingin
Anda beri akses terminal. Ada dua cara masuk, keduanya ditampilkan dengan
cuplikan siap salin di **Pengaturan → Integrasi → MCP**:

| Cara                                 | Apa itu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`** (disarankan) | Server stdio yang dijalankan sendiri oleh asisten; Plot Docs tidak perlu terbuka. Satu alat per perintah (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) plus alur deck bertahap `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Ops, spesifikasi, dan Markdown dikirim inline, jadi client tanpa sistem file pun tetap bisa jalan. |
| **B · Server HTTP lokal**            | Berjalan di dalam aplikasi Plot Docs pada `http://127.0.0.1:3093/mcp` (Streamable HTTP, dengan SSE lama). Alatnya menjalankan tab editor Word yang terlihat: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, dan Anda menyaksikan dokumen terbentuk. Mati secara default; nyalakan di panel pengaturan yang sama.                                                                                                                                   |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop, atau MCP client lain mana pun
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

`plotdocs` di sini adalah CLI yang disertakan di dalam aplikasi (di macOS
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; panel
pengaturan menampilkan path persis untuk instalasi Anda). Server ini
membawa instruksi alur kerjanya sendiri dan mengekspos referensi op sebagai
resource `plotdocs://guide/*`, jadi skill tidak diperlukan; skill dan
server MCP bisa berdampingan dan asisten memilih salah satunya. Fitur cloud
(`search`, `image`, `media`) tetap lewat provider yang dikonfigurasi di
Plot Docs; sisanya berjalan lokal, dan `PLOTDOCS_ALLOWED_ROOTS` membatasi
setiap alat hanya ke folder yang Anda daftarkan.

Deck energi terbarukan dalam demo di atas adalah gambaran, dari sisi
protokol, satu prompt di Claude Code yang hanya menyambungkan server MCP
`plotdocs`:

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

Tiga puluh delapan panggilan, sekitar tiga belas menit, dan asisten sama
sekali tidak menyentuh shell: figur, foto, semua panduan, pemeriksaan, dan
render berjalan sebagai hasil panggilan alat MCP. Hanya `search` dan `media`
yang keluar dari mesin, ke penyedia yang dikonfigurasi di Plot Docs.

<a id="download"></a>

## Download

| Platform                             | Persyaratan                                           | Unduh                                                                                      |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [`.dmg` terbaru (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)         |
| **macOS** — Intel (x64)              | macOS 11+                                             | [`.dmg` terbaru (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)           |
| **Windows** (x64, kebanyakan PC)     | Windows 10+, Intel/AMD                                | [Installer `-x64.exe` terbaru](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** di Arm (ARM64)           | Windows 11 on Arm (Snapdragon X dan sejenisnya)       | [Installer `-arm64.exe` terbaru](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 atau lebih baru)    | [`.deb` terbaru](https://github.com/plotxyz-ai/plot-docs/releases/latest)                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [`.rpm` terbaru](https://github.com/plotxyz-ai/plot-docs/releases/latest)                 |
| **Linux** — distribusi lainnya       | x86_64, glibc 2.34+, FUSE 2                           | [`.AppImage` terbaru](https://github.com/plotxyz-ai/plot-docs/releases/latest)            |

Semua build berasal dari `main`; installer macOS dan Windows sudah
ditandatangani (signed). Versi lama ada di halaman
[Releases](https://github.com/plotxyz-ai/plot-docs/releases).

<details>
<summary><b>Instalasi di Linux</b></summary>

File deb dipasang dengan apt — perintah ini menarik semua dependensi dan
menambahkan Plot Docs ke menu aplikasi:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

Di Fedora / keluarga RHEL / openSUSE, pasang rpm sebagai gantinya:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage berjalan langsung di tempat: pasang runtime FUSE 2
(`sudo apt install libfuse2`; di Ubuntu 24.04 paketnya bernama
`libfuse2t64`), jadikan file tersebut executable, lalu jalankan:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## Cara kerjanya

Tujuh aplikasi Electron — Docs, Sheets, Slides, PDF, Markdown, HTML, dan
shell bertab — berbagi satu lapisan engine berupa paket TypeScript murni,
ditambah sidecar Rust untuk `.xlsx`. File asli selalu menjadi sumber
kebenaran (source of truth): perubahan diterapkan sebagai patch yang sempit,
dan semua bagian yang tidak disentuh editor tetap utuh saat file dibuka
kembali.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

Tur paket demi paket (engine docx/pptx, `pdf2docx`, `html2docx`, agent core,
dan provider) ada di [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Pengembangan

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

Aplikasi sheets juga membutuhkan toolchain Rust untuk sidecar xlsx-nya
(`cargo` di PATH); `npm run build -w @plotdocs/sheets` mengompilasinya
secara otomatis. Lihat [CONTRIBUTING.md](../../CONTRIBUTING.md) untuk
pemeriksaan yang harus dilalui setiap perubahan dan cara pull request
diterima.

## Komunitas

Plot Docs terus dikembangkan secara aktif dan masukan Anda membentuk arahnya.

- **Laporkan bug atau ajukan permintaan fitur** di
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues).
- **Gabung ke grup chat Plot Docs** di
  [PlotCommunity](https://plotxyz.ai) untuk mengobrol dengan tim dan
  pengguna lain.
- **Beri bintang (star) pada repo ini** jika Plot Docs bermanfaat bagi Anda —
  ini cara terbaik untuk mendukung proyek ini.

## FAQ

<details>
<summary><b>Apakah Plot Docs gratis?</b></summary>

Ya. Plot Docs gratis dan open-source di bawah lisensi Apache-2.0 — tidak ada
masa coba, tidak ada tingkatan berbayar untuk aplikasinya sendiri.

</details>

<details>
<summary><b>Apakah Plot Docs bisa membuka file Microsoft Word, Excel, dan PowerPoint?</b></summary>

Ya. Plot Docs membuka dan menyimpan file `.docx`, `.xlsx`, dan `.pptx` asli.
Penyimpanan bersifat byte-preserving: bagian file yang tidak Anda sentuh
ditulis kembali byte demi byte, sehingga dokumen tetap berfungsi normal di
Microsoft Office.

</details>

<details>
<summary><b>Apakah Plot Docs bisa digunakan secara offline?</b></summary>

Pengeditan dokumen sepenuhnya lokal — file tidak pernah meninggalkan
perangkat Anda untuk dibuka, diedit, disimpan, atau dikonversi. Fitur AI
(agen, pencarian, alat gambar) membutuhkan koneksi jaringan, baik dengan
masuk lewat Soopus atau dengan kunci API model Anda sendiri.

</details>

<details>
<summary><b>Apakah Plot Docs bisa mengedit file PDF?</b></summary>

Ya — pengeditan teks dan gambar PDF yang sesungguhnya, yang menulis ulang
content stream halaman dengan font aslinya tetap dipertahankan, bukan
anotasi penutup.

</details>

<details>
<summary><b>Apakah Plot Docs bisa mengonversi PDF ke Word, Excel, atau PowerPoint?</b></summary>

Ya — seluruhnya di perangkat Anda sendiri: ekstraksi karakter level PDFium
ditambah analisis layout berbasis geometri, tanpa layanan cloud, tanpa
unggah. Halaman hasil pindai (scan) juga didukung: di macOS dan Windows, OCR
sistem membacanya, sehingga hasilnya berupa teks yang bisa diedit, bukan
gambar halaman.

</details>

<details>
<summary><b>Bisakah saya menggunakan model AI atau kunci API saya sendiri?</b></summary>

Ya. Selain masuk lewat Soopus tanpa kunci API, Plot Docs mendukung
penggunaan kunci Anda sendiri untuk Claude, OpenAI, Gemini, DeepSeek, Kimi,
GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty, dan OpenCode Zen/Go,
plus endpoint apa pun yang kompatibel dengan OpenAI — termasuk server model
lokal. Pencarian, generasi gambar, dan analisis gambar/video menggunakan
kunci tersendiri di Settings → AI Media & Search.

</details>

<details>
<summary><b>Apakah Plot Docs bisa mengonversi HTML ke Word?</b></summary>

Ya — Export as Word di aplikasi HTML menghasilkan `.docx` asli yang bisa
diedit, seluruhnya di perangkat Anda sendiri. Halaman dirender di Chromium
bawaan dan diubah menjadi struktur Word yang sesungguhnya: heading,
paragraf, daftar, tabel, kartu, baris KPI, form field, dan latar halaman;
hanya elemen visual yang tidak punya kesetaraan di Word (chart, ikon, kotak
bergaya dekoratif) yang disematkan sebagai gambar.

</details>

<details>
<summary><b>Bisakah saya menjalankan Plot Docs dari Claude Code, Codex, Cursor, atau skrip?</b></summary>

Ya. Plot Docs memasang baris perintah `plotdocs` yang menjalankan engine yang
sama secara headless: memeriksa, mengonversi, membuat, membaca, dan mengedit
dokumen dari terminal atau skrip, dengan output `--json` untuk program. Skill
agen yang disertakan mengajari Claude Code, Codex, Cursor, Gemini CLI, GitHub
Copilot, OpenCode, dan Windsurf untuk menggunakannya; pasang dari
**Pengaturan → Integrasi**. Lihat
[Baris perintah dan skill agen](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Apakah Plot Docs mengumpulkan data?</b></summary>

Build resmi yang dipaketkan mengirim data analitik penggunaan terbatas
secara default, dan Anda bisa menonaktifkan pelaporan ini kapan saja lewat
Settings → General. Analitik ini tidak pernah mengirim isi dokumen, nama
file, path file, identitas akun, atau alamat email. Lihat
[Plot Docs Privacy](../../PRIVACY.md) untuk daftar lengkap event dan
pengungkapan data.

</details>

## Keamanan

Lihat [SECURITY.md](../../SECURITY.md) untuk postur keamanan proses
(sandboxing renderer, validasi IPC, gating tautan eksternal) dan model
ancaman untuk konten yang dihasilkan AI.

## Ucapan terima kasih

Plot Docs tidak akan mungkin ada tanpa proyek-proyek open-source berikut:

- [Electron](https://www.electronjs.org/) — runtime desktop untuk setiap
  aplikasi.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — inti UI
  spreadsheet yang diperluas oleh Sheets.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, disertakan
  lewat [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) —
  engine content-stream di balik pengeditan teks dan gambar PDF yang
  sesungguhnya.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) dan
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — rendering PDF dan
  penyusunan dokumen.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  block editor di Docs dan Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — editor sumber di HTML.
- [Konva](https://konvajs.org/) — rendering kanvas untuk Slides dan chart
  Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — metrik
  text-shaping untuk skrip kompleks.
- [calamine](https://github.com/tafia/calamine) dan
  [IronCalc](https://github.com/ironcalc/IronCalc) — lapisan baca dan
  kalkulasi dari sidecar xlsx Rust.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — decoder
  MicroType Express untuk font PowerPoint yang disematkan, diporting ke
  TypeScript.
- [React](https://react.dev/) (MIT) — lapisan UI setiap aplikasi.
- [Mermaid](https://mermaid.js.org/) (MIT) dan [KaTeX](https://katex.org/)
  (MIT) — diagram dan matematika di Markdown dan Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — parsing font untuk metrik
  dan pencarian glyph.
- [JSZip](https://stuk.github.io/jszip/) (MIT) dan
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — lapisan container OOXML dan XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — set ikon di seluruh ribbon.
- [electron-updater](https://www.electron.build/) (MIT) — update dalam
  aplikasi.
- Font Liberation, Carlito, Caladea, dan Noto CJK (OFL/Apache-2.0) — font
  dokumen yang disertakan.

`npm run notices` meregenerasi ringkasan lisensi pihak ketiga yang disertakan
(`tools/gen-third-party-notices.mjs`); semua dependensi runtime berlisensi
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Lisensi

Plot Docs dilisensikan di bawah [Apache License 2.0](../../LICENSE), dengan
satu pengecualian: direktori `ee/` dicadangkan untuk modul enterprise di masa
depan dan tercakup oleh [Plot Docs Enterprise License](../../ee/LICENSE).

Nama dan logo Plot Docs serta Soopus adalah merek dagang milik Mainfunc,
Inc. Lisensi Apache-2.0 tidak memberikan izin untuk menggunakannya (lihat
bagian 6); fork sebaiknya menggunakan branding sendiri.
