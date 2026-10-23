<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>全球首款功能完整的開源 AI 辦公套件。</b><br>
Word、Excel、PowerPoint 與 PDF 檔案，由你與你的 AI 共同編輯，並以原生格式存回。</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="License: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Latest release"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <b>繁體中文</b> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>下載</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>官網</b></a> ·
  <a href="https://plotxyz.ai"><b>社群</b></a> ·
  <a href="../../PRIVACY.md"><b>隱私權</b></a>
</p>

Plot Docs 是一套免費、開源的 Microsoft Office 替代方案，支援 macOS、
Windows 與 Linux。它能開啟並儲存原生的 `.docx`、`.xlsx` 與 `.pptx`
檔案，也能編輯 PDF、Markdown 與 HTML，並在每份文件旁放上一個 AI
代理——不是硬塞在旁邊的聊天視窗，而是真正讀懂檔案、動手修改，
並清楚告訴你它改了哪裡的編輯器。

- **原生格式，位元級保留。** 只有你編輯的部分會被重寫，檔案裡其他
  內容都會原樣保留，文件在 Word、Excel 與 PowerPoint 中依然能正常運作。
- **AI 的每一步都能檢視。** 編輯以追蹤修訂與差異呈現，一鍵即可回復。
  試算表拿到的是即時公式，不是貼上的數字。投影片與頁面會直接生成在
  畫面上，且完全可再編輯。
- **本機優先的設計。** 檔案的開啟、編輯、儲存與轉換都在你的裝置上完成。
  PDF → Word / Excel / PowerPoint、Markdown → Word、HTML → Word 全部
  在本機執行。只有 AI 呼叫會離開這台裝置，且僅送往你選擇的服務商。
- **用你自己的金鑰，或完全不用。** 用 Soopus 登入即可省去金鑰設定，
  或自行帶入 Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、
  Doubao、MiniMax、Grok、Mistral、OpenRouter、Requesty，或任何相容 OpenAI 介面
  的服務端點，也支援本機伺服器。
- **可寫成腳本，也隨時能交給代理。** 應用程式內建 `plotdocs` 命令列，
  並附上一份給 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、
  OpenCode 與 Windsurf 使用的 agent skill，讓程式開發代理不必開啟任何
  視窗，就能在你的裝置上建立、轉換、讀取與編輯真正的 Office 檔案。

**立即取得：** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest)（Apple Silicon 與 Intel）·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest)（x64 與 Arm）·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest)（deb、rpm、AppImage）——
詳細內容與系統需求請見[下載](#download)。

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

## 為什麼選 Plot Docs

- **開源**，採用 Apache-2.0 授權，在 GitHub 上公開開發。
- **由你掌控。** macOS、Windows 與 Linux 原生應用程式；檔案留在本機硬碟，每一次
  編輯、儲存與轉換都在你的裝置上完成。
- **真正的 Office 檔案。** 原生 `.docx`、`.xlsx` 與 `.pptx`，位元級保留：未變更
  的部分會原樣複製。
- **AI 直接編輯文件本身。** Docs 中的追蹤修訂、Sheets 中即時運算的公式與圖表、
  直接在畫布上生成的投影片，每一次 AI 操作都會留下可回復的快照。
- **自帶模型，自帶金鑰。** 使用 Soopus 登入，或帶上 Claude、OpenAI、Gemini、
  DeepSeek 等服務的金鑰，同時支援本機伺服器與任何相容 OpenAI 的服務端點。
- **認真做好 PDF。** 直接在頁面內編輯文字，並在本機將 PDF 轉換為 Word、Excel 或
  PowerPoint，掃描檔案支援系統 OCR。
- **同樣支援 Markdown 與 HTML**，共用同一套 AI 面板，並可在本機匯出為 Word。
- **可寫成腳本。** `plotdocs` 命令列、agent skill 與 MCP 伺服器讓每一個引擎
  都能供 Claude Code、Claude Desktop、Codex、Cursor 及其他代理使用，而且依然
  在本機執行。
- **免費**，個人與團隊皆可使用。

## AI 後端

**用 Soopus 登入**就完全不用設定：模型呼叫會透過 Soopus 代理路由
（涵蓋 Claude、GPT 與 Gemini 家族），代理也能使用網頁與圖片搜尋、
圖片生成，以及圖片／音訊／影片分析。

**或自帶金鑰。**「設定 → AI」列出了 Claude、OpenAI、Gemini、DeepSeek、
Kimi、GLM、Qwen、Doubao、MiniMax、Grok、Mistral、OpenRouter、Requesty 與
OpenCode Zen/Go，另外還有一個自訂欄位可填入任何相容 OpenAI 的服務端點
（base URL + 金鑰），也包括本機模型伺服器。搜尋與媒體功能則各自在
**AI 媒體與搜尋**下設定獨立的服務商：網頁搜尋可選 Serper 或 Tavily，
圖片生成與圖片／影片分析可選 OpenAI、Gemini、Doubao/Seedream、GLM、
Grok、Qwen、MiniMax，或任何相容 OpenAI 的圖片服務端點。

整套軟體支援亮色、深色與跟隨系統三種主題。主題只會改變畫面顯示：
匯出、列印與儲存的檔案永遠保留文件本身的原始色彩。

<a id="command-line-and-agent-skill"></a>

## 命令列與 agent skill

應用程式能對檔案做的每一件事，`plotdocs` 命令列都能在終端機裡完成：
檢視、轉換、建立、讀取與編輯 Word、Excel、PowerPoint、PDF、Markdown 與
HTML，用的是同一套引擎，且無需介面。它隨 Plot Docs 一起安裝，不需要
自己的執行環境，也絕不會把文件送到任何地方。搭配內建的 **agent skill**，
它能把程式開發代理變成一位文件工作者，產出真正的 Office 檔案，而不是
用 Markdown 勉強充數。

**支援：** Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode
與 Windsurf 開箱即用，任何其他能讀取 skill 的代理，以及透過
[MCP 伺服器](#mcp-server) 支援的 Claude Desktop 與所有 MCP 用戶端。

### 安裝 skill

| 方式                                   | 效果                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 應用程式內的 **設定 → 整合**           | 列出在這台電腦上找到的代理；按一下就把 skill 寫入你選擇的每一個。當 Plot Docs 新版本附帶更新的 skill 時，會出現**更新**按鈕。 |
| 同一頁面上的 **下載為 zip**            | claude.ai、Claude 桌面版應用程式與其他助理可作為上傳 skill 接受的目錄結構。                                                   |
| `npx skills add plotxyz-ai/plot-docs` | 從本儲存庫安裝到任何相容 skills 的代理。                                                                                      |

接著開一個新的對話，請它幫你做一份文件。這份 skill 會教代理何時該使用
`plotdocs`、編輯前如何先讀取檔案，以及如何檢查自己的成果。

### 從終端機快速上手

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

每個命令都會印出一行摘要，加上 `--json` 則輸出單一 JSON 物件。編輯是
原子性的：被拒絕的操作不會動到檔案，並會回傳附有指引的錯誤訊息。
`plotdocs help` 列出目前的命令集合；完整參考請見
[packages/cli/README.md](../../packages/cli/README.md)。

### 代理實際執行了什麼

上方 Demo 中的太陽系簡報，在 Claude Code 裡只用了一句提示詞。在它背後，
代理依照 skill 的分階段工作流程逐步進行，而 CLI 會在每個階段開始下一步
之前先做檢查：

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

`plotdocs` 內部不會發出任何模型呼叫：思考由代理負責，建置與檢查由 CLI
負責，成品則以一份普通的 `.pptx` 在 Plot Docs 或 PowerPoint 中開啟。

<a id="mcp-server"></a>

### MCP 伺服器

同樣這些命令也以 [Model Context Protocol](https://modelcontextprotocol.io) 工具
的形式提供，供那些無法執行終端機、或你不想給它終端機權限的助理使用。接入
方式有兩種，**設定 → 整合 → MCP** 中都提供了可直接複製的程式碼片段：

| 方式                                | 內容                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`**（建議使用） | 一個由助理自行啟動的 stdio 伺服器，Plot Docs 不需要處於開啟狀態。每個命令對應一個工具（`info`、`convert`、`create_docx`、`create_xlsx`、`create_pptx`、`create_pdf`、`docs_read` / `docs_apply` / `docs_check`、`sheet_*`、`slides_*`、`render`、`guide`、`search`、`image`、`media`、`open`），再加上分階段的簡報建立流程 `deck_start` → `deck_page` → `deck_build` → `deck_replace`。Ops、spec 與 Markdown 都以內嵌方式傳入，因此沒有檔案系統的用戶端也能正常運作。 |
| **B · 本機 HTTP 伺服器**            | 執行於 Plot Docs 應用程式內部，位址為 `http://127.0.0.1:3093/mcp`（Streamable HTTP，並相容舊版 SSE）。它的工具會驅動一個可見的 Word 編輯器分頁：`create_session`、`insert_content`、`replace_blocks`、`apply_ops`、`read_document`、`save_session`，你可以即時看著文件成形。預設為關閉；在同一個設定面板中開啟。                                                                                                                                                      |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor、Claude Desktop 或任何其他 MCP 用戶端
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

這裡的 `plotdocs` 就是應用程式內建的那個命令列（在 macOS 上位於
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`；設定面板
會印出你本機安裝的確切路徑）。這個伺服器自帶工作流程說明，並把操作參考
文件以 `plotdocs://guide/*` 資源的形式公開，因此不需要額外的 skill；
skill 與 MCP 伺服器可以共存，由助理自行選擇要用哪一個。雲端功能
（`search`、`image`、`media`）仍會透過 Plot Docs 中設定的服務商完成；
其餘一切都在本機執行，`PLOTDOCS_ALLOWED_ROOTS` 會把每個工具都限制在
你列出的資料夾之內。

上方 Demo 中的再生能源簡報，就是僅接上 `plotdocs` MCP 伺服器時，
Claude Code 裡一句提示詞從協定層面呈現出的樣子：

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

三十八次呼叫，大約十三分鐘，助理全程沒有碰過終端機：圖表、照片、指南、檢查與渲染結果都是以 MCP 工具結果的形式傳遞。只有 `search` 與 `media` 離開過本機，傳送至 Plot Docs 中設定的服務供應商。

<a id="download"></a>

## 下載

| 平台                                 | 系統需求                                               | 下載                                                                                     |
| ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon（arm64）   | macOS 11 以上                                          | [最新版 `.dmg`（arm64）](https://github.com/plotxyz-ai/plot-docs/releases/latest)       |
| **macOS** — Intel（x64）             | macOS 11 以上                                          | [最新版 `.dmg`（x64）](https://github.com/plotxyz-ai/plot-docs/releases/latest)         |
| **Windows**（x64，一般 PC）          | Windows 10 以上，Intel/AMD                             | [最新版 `-x64.exe` 安裝程式](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** on Arm（ARM64）          | Windows 11 on Arm（Snapdragon X 及同類機型）           | [最新版 `-arm64.exe` 安裝程式](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64，glibc 2.34+（Ubuntu 22.04 或以上）             | [最新版 `.deb`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                |
| **Linux** — Fedora / RHEL / openSUSE | x86_64，glibc 2.34+（Fedora 35+、RHEL 9+、Leap 15.6+） | [最新版 `.rpm`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                |
| **Linux** — 其他發行版               | x86_64，glibc 2.34+，FUSE 2                            | [最新版 `.AppImage`](https://github.com/plotxyz-ai/plot-docs/releases/latest)           |

所有版本皆由 `main` 分支建置，macOS 與 Windows 安裝程式皆有簽署。
較舊版本可在[發行頁面](https://github.com/plotxyz-ai/plot-docs/releases)找到。

<details>
<summary><b>在 Linux 上安裝</b></summary>

deb 套件可用 apt 安裝——會自動處理相依套件，並將 Plot Docs 加入
應用程式選單：

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

在 Fedora / RHEL 家族 / openSUSE 上，改安裝 rpm 套件：

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL 家族
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage 可直接就地執行：先安裝 FUSE 2 執行環境
（`sudo apt install libfuse2`；Ubuntu 24.04 上的套件名稱是
`libfuse2t64`），再將檔案設為可執行，然後執行它：

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## 運作原理

七個 Electron 應用程式——Docs、Sheets、Slides、PDF、Markdown、HTML
與分頁式外殼——共用一層純 TypeScript 套件所構成的引擎，再加上一個
處理 `.xlsx` 的 Rust sidecar。原始檔案永遠是唯一的真相來源：編輯以
局部差異的方式套用，編輯器沒動過的內容在往返過程中完全不受影響。

```
open docx ─► 依雜湊封存原始檔案（永遠不動它）
          ─► 解析 word/document.xml 成區塊樹，每個區塊都對應到原始 XML
          ─► Tiptap 編輯器（手動編輯 + AI 編輯，並追蹤已變更內容）
save      ─► 已變更的區塊 → OOXML 片段（只參照既有樣式）
          ─► 拼接回原始 document.xml；未變更的區塊保留原有位元組
          ─► 重新打包 zip；其他每個項目皆逐位元組複製
```

各套件（docx/pptx 引擎、`pdf2docx`、`html2docx`、代理核心與各服務商）
的逐一介紹，收錄在 [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages)。

## 開發

```bash
npm install
npm run fixtures     # 產生測試用的 .docx fixture
npm test             # 引擎 + 應用程式單元測試（docs/sheets/slides 不需要顯示器）
npm run typecheck    # 對整個 workspace 執行 tsc --noEmit
npm run dev          # 六個編輯器 + 外殼，皆跑在 Vite 開發伺服器上
npm run dev:docs     # 只跑單一應用程式（其他 workspace 也是同樣模式）
npm run dist:mac     # 打包 macOS dmg（會重新產生第三方授權聲明）
npm run dist:win     # 打包 Windows nsis 安裝程式
npm run dist:linux   # 打包 Linux AppImage + deb + rpm
```

sheets 應用程式還需要 Rust 工具鏈來編譯其 xlsx sidecar
（`cargo` 需在 PATH 中）；執行 `npm run build -w @plotdocs/sheets`
會自動完成編譯。每次變更需要通過哪些檢查、PR 如何合併，詳見
[CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 社群

Plot Docs 正在積極開發中，你的意見回饋會影響它的方向。

- 在 [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues)
  **回報問題或提出功能需求**。
- 到 [PlotCommunity](https://plotxyz.ai) **加入 Plot Docs 群組聊天**，
  和團隊及其他使用者交流。
- 如果 Plot Docs 對你有幫助，**幫這個專案按個星星**——這是支持這個
  專案最簡單的方式。

## 常見問題

<details>
<summary><b>Plot Docs 是免費的嗎？</b></summary>

是的。Plot Docs 以 Apache-2.0 授權免費開源——應用程式本身沒有試用期，
也沒有付費方案。

</details>

<details>
<summary><b>Plot Docs 能開啟 Microsoft Word、Excel 與 PowerPoint 檔案嗎？</b></summary>

可以。Plot Docs 能開啟並儲存原生的 `.docx`、`.xlsx` 與 `.pptx` 檔案。
儲存時採位元級保留：你沒動過的部分會原樣寫回，文件在 Microsoft
Office 中依然能正常使用。

</details>

<details>
<summary><b>Plot Docs 能離線使用嗎？</b></summary>

文件編輯完全在本機執行——檔案在開啟、編輯、儲存或轉換的過程中
都不會離開你的裝置。AI 功能（代理、搜尋、圖片工具）需要網路連線，
可透過 Soopus 登入或使用你自己的模型 API 金鑰。

</details>

<details>
<summary><b>Plot Docs 能編輯 PDF 檔案嗎？</b></summary>

可以——這是真正的 PDF 文字與圖片編輯，會重寫頁面內容串流並保留
原始字體，而不是用覆蓋式的注解來遮蓋。

</details>

<details>
<summary><b>Plot Docs 能把 PDF 轉換成 Word、Excel 或 PowerPoint 嗎？</b></summary>

可以——完全在本機完成：透過 PDFium 進行字元層級擷取，再搭配以幾何
資訊為基礎的版面分析，不經雲端服務，也不需要上傳檔案。掃描頁面
同樣支援：在 macOS 與 Windows 上會由系統 OCR 讀取內容，因此轉出的
是可編輯文字，而不是頁面圖片。

</details>

<details>
<summary><b>我可以使用自己的 AI 模型或 API 金鑰嗎？</b></summary>

可以。除了免金鑰的 Soopus 登入之外，Plot Docs 也支援自帶金鑰，
涵蓋 Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、Doubao、
MiniMax、Grok、Mistral、OpenRouter、Requesty 與 OpenCode Zen/Go，以及任何相容
OpenAI 的服務端點——包括本機模型伺服器。搜尋、圖片生成與圖片／影片
分析則在「設定 → AI 媒體與搜尋」下使用各自獨立的金鑰。

</details>

<details>
<summary><b>Plot Docs 能把 HTML 轉換成 Word 嗎？</b></summary>

可以——HTML 應用程式中的「匯出為 Word」會完全在本機產生原生、
可編輯的 `.docx`。頁面會在內建的 Chromium 中渲染，再轉換成真正的
Word 結構：標題、段落、清單、表格、卡片、KPI 列、表單欄位與頁面
背景；只有沒有對應 Word 結構的視覺元素（圖表、圖示、裝飾方塊）
才會以圖片形式嵌入。

</details>

<details>
<summary><b>我可以從 Claude Code、Codex、Cursor 或指令碼驅動 Plot Docs 嗎？</b></summary>

可以。Plot Docs 會安裝一個 `plotdocs` 命令列，以無介面的方式執行同一套
引擎：在終端機或指令碼中檢視、轉換、建立、讀取與編輯文件，並提供
`--json` 輸出供程式使用。內建的 agent skill 會教 Claude Code、Codex、Cursor、
Gemini CLI、GitHub Copilot、OpenCode 與 Windsurf 使用它；請在 **設定 → 整合**
中安裝。詳見[命令列與 agent skill](#command-line-and-agent-skill)。

</details>

<details>
<summary><b>Plot Docs 會收集任何資料嗎？</b></summary>

官方打包版本預設會傳送有限的使用分析資料，你隨時可以在「設定 → 一般」
中關閉這項回報。分析資料絕不會包含文件內容、檔案名稱、檔案路徑、
帳號身分或電子郵件地址。完整的事件與資料揭露內容請見
[Plot Docs 隱私權政策](../../PRIVACY.md)。

</details>

## 安全性

行程層級的安全防護措施（渲染器沙箱化、IPC 驗證、外部連結攔截）
以及針對 AI 生成內容的威脅模型，詳見 [SECURITY.md](../../SECURITY.md)。

## 致謝

沒有以下這些開源專案，就不會有 Plot Docs：

- [Electron](https://www.electronjs.org/) — 每個應用程式所使用的桌面
  執行環境。
- [Univer](https://github.com/dream-num/univer)（Apache-2.0）— Sheets
  延伸使用的試算表 UI 核心。
- [PDFium](https://pdfium.googlesource.com/pdfium/)（BSD-3-Clause，
  透過 [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)
  引入）— 支撐真正的 PDF 文字與圖片編輯的內容串流引擎。
- [pdf.js](https://github.com/mozilla/pdf.js)（Apache-2.0）與
  [pdf-lib](https://github.com/Hopding/pdf-lib)（MIT）— PDF 渲染與
  文件組裝。
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/)
  — Docs 與 Markdown 所使用的區塊編輯器。
- [CodeMirror](https://codemirror.net/)（MIT）— HTML 應用程式中的
  原始碼編輯器。
- [Konva](https://konvajs.org/) — Slides 與 Sheets 圖表所使用的畫布
  渲染引擎。
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz)（wasm）— 複雜文字
  系統的文字排版度量。
- [calamine](https://github.com/tafia/calamine) 與
  [IronCalc](https://github.com/ironcalc/IronCalc) — Rust xlsx sidecar
  的讀取與計算層。
- [libeot](https://github.com/umanwizard/libeot)（MPL-2.0）— 用於內嵌
  PowerPoint 字型的 MicroType Express 解碼器，已移植為 TypeScript。
- [React](https://react.dev/)（MIT）— 每個應用程式的 UI 層。
- [Mermaid](https://mermaid.js.org/)（MIT）與 [KaTeX](https://katex.org/)
  （MIT）— Markdown 與 Docs 中的圖表與數學公式。
- [opentype.js](https://opentype.js.org/)（MIT）— 用於度量資訊解析與字形
  查詢的字型解析程式庫。
- [JSZip](https://stuk.github.io/jszip/)（MIT）與
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  （MIT）— OOXML 容器與 XML 層。
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  （MIT）— 各功能區所使用的圖示集。
- [electron-updater](https://www.electron.build/)（MIT）— 應用程式內更新。
- Liberation、Carlito、Caladea 與 Noto CJK 字型（OFL/Apache-2.0）—
  隨附的文件字型。

執行 `npm run notices` 會重新產生內建的第三方授權摘要
（`tools/gen-third-party-notices.mjs`）；所有執行期相依套件皆採用
MIT/Apache-2.0/BSD-3-Clause/OFL 授權。

## 授權

Plot Docs 採用 [Apache License 2.0](../../LICENSE) 授權，唯一例外是
`ee/` 目錄，該目錄保留給未來的企業模組，適用
[Plot Docs 企業授權](../../ee/LICENSE)。

Plot Docs 與 Soopus 的名稱與標誌皆為 Mainfunc, Inc. 的商標。
Apache-2.0 授權並未授予使用這些商標的權利（詳見第 6 節）；
基於本專案的分支請使用自己的品牌識別。
