<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>世界初のフル機能を備えたオープンソース AI オフィススイート。</b><br>
Word、Excel、PowerPoint、PDF ファイルを、あなたとあなたの AI が編集し、実際のファイル形式のまま保存します。</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="License: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Latest release"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <b>日本語</b> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>ダウンロード</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>ウェブサイト</b></a> ·
  <a href="https://plotxyz.ai"><b>コミュニティ</b></a> ·
  <a href="../../PRIVACY.md"><b>プライバシー</b></a>
</p>

Plot Docs は、macOS・Windows・Linux で動作する、Microsoft Office に代わる無料のオープンソース製品です。ネイティブの `.docx`・`.xlsx`・`.pptx` ファイルを開いて保存できるほか、PDF・Markdown・HTML の編集にも対応し、あらゆるドキュメントの隣に AI エージェントを配置します。取って付けたようなチャットボックスではなく、ファイルを読み込み、変更を加え、何をどう変更したかを正確に示してくれるエディタです。

- **実際のファイル形式、バイト単位で保持。** 編集した部分だけが書き換えられます。それ以外の部分はファイル内でバイト単位そのまま保持されるため、ドキュメントは Word・Excel・PowerPoint でも問題なく動作し続けます。
- **レビューできる AI。** 編集内容は変更履歴と差分として反映され、ワンクリックで元に戻せます。スプレッドシートには貼り付けの数値ではなく、実際に機能する数式が入ります。デッキやページはキャンバス上に生成され、そのまま自由に編集できます。
- **設計からローカル動作。** ファイルの開く・編集・保存・変換はすべてお使いのマシン上で行われます。PDF → Word / Excel / PowerPoint、Markdown → Word、HTML → Word の変換もすべてオンデバイスで実行されます。マシンの外に出るのは、選択した AI プロバイダーへの呼び出しだけです。
- **キーを使うか使わないかはあなた次第。** Soopus でサインインすればキーの用意は不要です。あるいは、Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、Doubao、MiniMax、Grok、Mistral、OpenRouter、Requesty、または任意の OpenAI 互換エンドポイント（ローカルサーバーを含む）向けに、自分の API キーを持ち込むこともできます。
- **スクリプト化でき、エージェントからも使える。** アプリには `plotdocs` コマンドラインと、Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode、Windsurf 向けのスキルが同梱されているため、コーディングエージェントはウィンドウを一つも開かずに、お使いのマシン上で本物の Office ファイルを作成・変換・読み取り・編集できます。

**入手方法：** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest)（Apple Silicon および Intel）·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest)（x64 および Arm）·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest)（deb、rpm、AppImage）—
詳細と要件は[ダウンロード](#download)を参照してください。

## デモ

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

## Plot Docs を選ぶ理由

- **オープンソース**。Apache-2.0 ライセンスで、GitHub 上で公開開発。
- **自分のマシンで動く。** macOS・Windows・Linux 向けのネイティブアプリ。ファイル
  はディスク上に残り、編集・保存・変換もすべて自分のマシンで行われる。
- **本物の Office ファイル。** ネイティブの `.docx`・`.xlsx`・`.pptx`、バイト単位
  で保持：触れていない部分はそのままコピーされる。
- **ドキュメント自体を編集する AI。** Docs では変更履歴、Sheets では実際に機能す
  る数式とグラフ、スライドはキャンバス上に描画され、AI の操作ごとに巻き戻せるス
  ナップショットが残る。
- **自分のモデル、自分のキー。** Soopus でログイン、または Claude・OpenAI・
  Gemini・DeepSeek などのキーを持ち込める。ローカルサーバーや任意の OpenAI 互換
  エンドポイントにも対応。
- **PDF もしっかり対応。** ページ内でテキストをその場で編集し、オンデバイスで
  PDF を Word・Excel・PowerPoint に変換。スキャンにはシステム OCR を使用。
- **Markdown と HTML にも対応**。同じ AI パネルを使い、ローカルで Word に書き出せ
  る。
- **スクリプト化できる。** `plotdocs` コマンドライン、エージェントスキル、MCP
  サーバーにより、すべてのエンジンを Claude Code・Claude Desktop・Codex・Cursor
  などのエージェントから使える。もちろんオンデバイスのまま。
- **無料**。個人でもチームでも利用できる。

## AI バックエンド

**Soopus でサインイン**すれば、設定は一切不要です。モデル呼び出しは Soopus のプロキシ
（Claude、GPT、Gemini 系列）を経由し、エージェントは Web・画像検索、画像生成、画像／音声／
動画の解析機能も利用できます。

**あるいは自分のキーを持ち込む。** 設定 → AI には Claude、OpenAI、Gemini、DeepSeek、Kimi、
GLM、Qwen、Doubao、MiniMax、Grok、Mistral、OpenRouter、Requesty、OpenCode Zen/Go が並び、さらに任意
の OpenAI 互換エンドポイント（ベース URL + キー、ローカルモデルサーバーを含む）を登録できる
カスタム枠も用意されています。検索とメディア関連は **AI メディア＆検索** の下で機能ごとに個
別のプロバイダーを設定できます：Web 検索には Serper か Tavily、画像生成と画像／動画解析には
OpenAI、Gemini、Doubao/Seedream、GLM、Grok、Qwen、MiniMax、または任意の OpenAI 互換の画像
エンドポイントが使えます。

スイート全体でライト・ダーク・システムのテーマに対応しています。テーマが変わるのは画面表示
だけで、書き出し・印刷・保存されたファイルは常にドキュメント本来の色を保持します。

<a id="command-line-and-agent-skill"></a>

## コマンドラインとエージェントスキル

アプリがファイルに対してできることはすべて、`plotdocs` コマンドラインからターミナルで行えます。
Word、Excel、PowerPoint、PDF、Markdown、HTML の検査・変換・作成・読み取り・編集を、同じエンジンで
ヘッドレスに実行します。Plot Docs と一緒にインストールされ、独自のランタイムは不要で、ドキュメント
をどこかへ送信することもありません。同梱の**エージェントスキル**と組み合わせれば、コーディング
エージェントは Markdown による代用品ではなく、本物の Office ファイルを生み出すドキュメント作業者に
なります。

**対応エージェント：** Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode、Windsurf
はそのまま使え、スキルを読めるその他のエージェント、さらに [MCP サーバー](#mcp-server) を通じて
Claude Desktop とあらゆる MCP クライアントでも動作します。

### スキルをインストールする

| 方法                                    | 動作                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| アプリの **設定 → 連携**                | このコンピューター上で見つかったエージェントを一覧し、ワンクリックで選んだそれぞれにスキルを書き込みます。Plot Docs のリリースに新しいスキルが含まれていると**更新**ボタンが表示されます。 |
| 同じページの **zip としてダウンロード** | claude.ai、Claude デスクトップアプリ、その他のアシスタントがアップロード用スキルとして受け付ける構成です。                                                                                 |
| `npx skills add plotxyz-ai/plot-docs`  | このリポジトリから、スキルに対応する任意のエージェントにインストールします。                                                                                                               |

その後、新しいチャットを始めてドキュメントを依頼してください。スキルは、いつ `plotdocs` を使うべきか、
編集前にファイルをどう読むか、自分の成果物をどう確認するかをエージェントに教えます。

### ターミナルからのクイックスタート

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

各コマンドは 1 行の要約を出力し、`--json` を付けると単一の JSON オブジェクトを返します。編集はアト
ミックです。拒否された操作はファイルに一切触れず、対処方法を示したエラーとして返ってきます。
`plotdocs help` で現在のコマンド一覧を確認でき、完全なリファレンスは
[packages/cli/README.md](../../packages/cli/README.md) にあります。

### エージェントが実際に実行しているもの

上のデモの太陽系デッキは、Claude Code へのプロンプト 1 つで作られました。その裏では、エージェントが
スキルの段階的なワークフローに従い、CLI が各段階を次に進む前に検査していました。

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

`plotdocs` の内部でモデル呼び出しは一切行われません。考えるのはエージェント、組み立てと検査は CLI
が担い、結果は通常の `.pptx` として Plot Docs や PowerPoint で開けます。

<a id="mcp-server"></a>

### MCP サーバー

同じコマンド群は [Model Context Protocol](https://modelcontextprotocol.io) の
ツールとしても利用できます。ターミナルを実行できない、あるいはターミナルを
渡したくないアシスタント向けの方法です。接続方法は 2 つあり、どちらも
**設定 → 連携 → MCP** にすぐコピーできるスニペット付きで用意されています：

| 方法                            | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`**（推奨） | アシスタント自身が起動する stdio サーバーで、Plot Docs を起動しておく必要はありません。コマンドごとに 1 つのツール（`info`、`convert`、`create_docx`、`create_xlsx`、`create_pptx`、`create_pdf`、`docs_read` / `docs_apply` / `docs_check`、`sheet_*`、`slides_*`、`render`、`guide`、`search`、`image`、`media`、`open`）に加えて、段階的なデッキフロー `deck_start` → `deck_page` → `deck_build` → `deck_replace` があります。Ops、スペック、Markdown はすべてインラインで渡されるため、ファイルシステムを持たないクライアントでも動作します。 |
| **B · ローカル HTTP サーバー**  | Plot Docs アプリ内部で `http://127.0.0.1:3093/mcp`（Streamable HTTP、レガシー SSE 対応）として動作します。そのツールは目に見える Word エディタータブを操作します：`create_session`、`insert_content`、`replace_blocks`、`apply_ops`、`read_document`、`save_session`。ドキュメントが形になっていく様子をその場で見られます。デフォルトはオフで、同じ設定パネルで有効にできます。                                                                                                                                                                  |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor、Claude Desktop、その他任意の MCP クライアント
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

ここでの `plotdocs` は、アプリに同梱されているあの CLI そのものです
（macOS では `/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`。
設定パネルに、実際のインストール先の正確なパスが表示されます）。このサーバー
は独自のワークフロー手順を備えており、操作リファレンスを `plotdocs://guide/*`
リソースとして公開するため、スキルは不要です。スキルと MCP サーバーは共存
でき、どちらを使うかはアシスタントが選びます。クラウド機能（`search`、
`image`、`media`）は引き続き Plot Docs で設定したプロバイダーを経由し、それ
以外はすべてローカルで動作し、`PLOTDOCS_ALLOWED_ROOTS` によりすべてのツール
が指定したフォルダに限定されます。

上のデモの再生可能エネルギーデッキは、`plotdocs` MCP サーバーだけを接続した
Claude Code へのプロンプト 1 つが、プロトコルの側からはどう見えるかを示した
ものです：

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

38 回の呼び出し、約 13 分間、そしてアシスタントは一度もターミナルに触れませんでした。図版、写真、ガイド、検査、レンダリングの結果はすべて MCP ツールの結果としてやり取りされました。マシンの外に出たのは `search` と `media` だけで、Plot Docs に設定されたプロバイダーへ送られました。

<a id="download"></a>

## ダウンロード

| プラットフォーム                           | 要件                                                                   | ダウンロード                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon（arm64）         | macOS 11 以降                                                          | [最新の `.dmg`（arm64）](https://github.com/plotxyz-ai/plot-docs/releases/latest)             |
| **macOS** — Intel（x64）                   | macOS 11 以降                                                          | [最新の `.dmg`（x64）](https://github.com/plotxyz-ai/plot-docs/releases/latest)               |
| **Windows**（x64、大半の PC）              | Windows 10 以降、Intel/AMD                                             | [最新の `-x64.exe` インストーラー](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** on Arm（ARM64）                | Windows 11 on Arm（Snapdragon X など）                                 | [最新の `-arm64.exe` インストーラー](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu                | x86_64、glibc 2.34 以降（Ubuntu 22.04 以降）                           | [最新の `.deb`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                      |
| **Linux** — Fedora / RHEL / openSUSE       | x86_64、glibc 2.34 以降（Fedora 35 以降、RHEL 9 以降、Leap 15.6 以降） | [最新の `.rpm`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                      |
| **Linux** — その他のディストリビューション | x86_64、glibc 2.34 以降、FUSE 2                                        | [最新の `.AppImage`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                 |

すべてのビルドは `main` ブランチから生成され、macOS・Windows のインストーラーには署名が付いて
います。以前のバージョンは [Releases](https://github.com/plotxyz-ai/plot-docs/releases) ページにあります。

<details>
<summary><b>Linux へのインストール</b></summary>

deb は apt でインストールできます — 依存関係も自動的に取得され、Plot Docs がアプリケーション
メニューに追加されます。

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

Fedora / RHEL 系 / openSUSE では、代わりに rpm をインストールしてください。

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage はそのまま実行できます：FUSE 2 ランタイムをインストールし
（`sudo apt install libfuse2`。Ubuntu 24.04 ではパッケージ名が `libfuse2t64` です）、ファイル
に実行権限を付けてから実行してください。

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## 内部の仕組み

Docs、Sheets、Slides、PDF、Markdown、HTML、そしてタブ管理を行うシェルという 7 つの Electron
アプリが、純粋な TypeScript パッケージによる 1 つのエンジン層と、`.xlsx` 用の Rust サイド
カーを共有しています。常に元ファイルが正となり、編集は最小限のパッチとして適用されるため、
エディタが触れなかった部分は往復の間もそのまま保持されます。

```
docx を開く ─► 元ファイルをハッシュ付きでアーカイブ（一切変更しない）
          ─► word/document.xml をブロックツリーへ解析、各ブロックは元の XML に紐づく
          ─► Tiptap エディタ（手動編集 + AI 編集、dirty 追跡）
保存      ─► dirty なブロック → OOXML フラグメント（既存スタイルのみ参照）
          ─► 元の document.xml へ差し込み、触れていないブロックはバイトのまま
          ─► zip を再パック；他のすべてのエントリはバイト単位でそのままコピー
```

パッケージ単位の詳しい解説（docx/pptx エンジン、`pdf2docx`、`html2docx`、エージェントコアと
プロバイダー）は [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages) にあります。

## 開発

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

sheets アプリでは、xlsx サイドカー用に Rust ツールチェーン（PATH 上に `cargo`）も別途必要
です。`npm run build -w @plotdocs/sheets` を実行すれば自動的にビルドされます。すべての変更
が満たすべきチェック内容や、プルリクエストの取り込み方については
[CONTRIBUTING.md](../../CONTRIBUTING.md) を参照してください。

## コミュニティ

Plot Docs は活発に開発が続いており、みなさんのフィードバックがその方向性を形づくっています。

- **バグの報告や機能のリクエスト**は
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues) で受け付けています。
- **Plot Docs のグループチャット**に
  [PlotCommunity](https://plotxyz.ai) から参加すると、開発チームや他のユーザーと直接話せます。
- Plot Docs が役に立ったら**リポジトリにスターを付けてください** — プロジェクトを支援する
  一番簡単な方法です。

## よくある質問

<details>
<summary><b>Plot Docs は無料ですか？</b></summary>

はい。Plot Docs は Apache-2.0 ライセンスのもとで無料かつオープンソースで提供されています —
試用期間もアプリ自体の有料プランもありません。

</details>

<details>
<summary><b>Plot Docs で Microsoft の Word、Excel、PowerPoint ファイルを開けますか？</b></summary>

はい。Plot Docs はネイティブの `.docx`、`.xlsx`、`.pptx` ファイルを開いて保存できます。保存
はバイト単位で保持されるため、触れなかった部分はそのまま書き戻され、ドキュメントは Microsoft
Office でも問題なく動作し続けます。

</details>

<details>
<summary><b>Plot Docs はオフラインで使えますか？</b></summary>

ドキュメントの編集は完全にローカルで行われます — ファイルは開く・編集・保存・変換のどの場面
でもマシンの外に出ることはありません。AI 機能（エージェント、検索、画像ツール）を使うには
ネットワーク接続が必要で、Soopus でのサインインか、自分のモデル API キーのいずれかが必要
です。

</details>

<details>
<summary><b>Plot Docs で PDF ファイルを編集できますか？</b></summary>

はい — 上から隠す注釈ではなく、ページのコンテンツストリーム自体を元のフォントを保ったまま
書き換える、本物の PDF テキスト・画像編集に対応しています。

</details>

<details>
<summary><b>Plot Docs で PDF を Word、Excel、PowerPoint に変換できますか？</b></summary>

はい — すべてオンデバイスで行われます：PDFium による文字レベルの抽出と、形状に基づくレイア
ウト解析を使い、クラウドサービスやアップロードは一切発生しません。スキャンされたページにも
対応しており、macOS と Windows ではシステムの OCR が読み取るため、ページ画像ではなく編集可能
なテキストに変換されます。

</details>

<details>
<summary><b>自分の AI モデルや API キーを使えますか？</b></summary>

はい。キー不要の Soopus サインインに加えて、Plot Docs は Claude、OpenAI、Gemini、
DeepSeek、Kimi、GLM、Qwen、Doubao、MiniMax、Grok、Mistral、OpenRouter、Requesty、OpenCode Zen/Go 向け
に自分のキーを持ち込むことができ、任意の OpenAI 互換エンドポイント（ローカルモデルサーバー
を含む）にも対応しています。検索、画像生成、画像／動画解析は、設定 → AI メディア＆検索でそ
れぞれ別のキーを設定します。

</details>

<details>
<summary><b>Plot Docs で HTML を Word に変換できますか？</b></summary>

はい — HTML アプリの「Word として書き出す」を使うと、完全にオンデバイスでネイティブかつ編
集可能な `.docx` が生成されます。ページは内蔵の Chromium でレンダリングされたうえで、見出
し、段落、リスト、表、カード、KPI 行、フォームフィールド、ページ背景といった本物の Word 構
造に落とし込まれます。Word に対応する表現がないビジュアル（チャート、アイコン、装飾ボックス
など）だけが画像として埋め込まれます。

</details>

<details>
<summary><b>Claude Code、Codex、Cursor、またはスクリプトから Plot Docs を操作できますか？</b></summary>

はい。Plot Docs は、同じエンジンをヘッドレスで実行する `plotdocs` コマンドラインをインストール
します。ターミナルやスクリプトからドキュメントの検査・変換・作成・読み取り・編集ができ、プログラ
ム向けに `--json` 出力も用意されています。同梱のエージェントスキルは Claude Code、Codex、Cursor、
Gemini CLI、GitHub Copilot、OpenCode、Windsurf にその使い方を教えます。インストールは
**設定 → 連携** から行えます。詳しくは
[コマンドラインとエージェントスキル](#command-line-and-agent-skill) を参照してください。

</details>

<details>
<summary><b>Plot Docs はデータを収集しますか？</b></summary>

公式のパッケージ版ビルドは、デフォルトで限定的な利用状況の分析データを送信しますが、設定 →
一般からいつでも送信を無効にできます。分析データにドキュメントの内容、ファイル名、ファイル
パス、アカウント情報、メールアドレスが含まれることはありません。収集されるイベントとデータ
の詳細は [Plot Docs のプライバシー](../../PRIVACY.md)を参照してください。

</details>

## セキュリティ

プロセスのセキュリティ方針（レンダラーのサンドボックス化、IPC バリデーション、外部リンクの
ゲーティング）と、AI が生成したコンテンツに対する脅威モデルについては
[SECURITY.md](../../SECURITY.md) を参照してください。

## クレジット

Plot Docs は、以下のオープンソースプロジェクトなしには実現できませんでした。

- [Electron](https://www.electronjs.org/) — すべてのアプリのデスクトップランタイム。
- [Univer](https://github.com/dream-num/univer)（Apache-2.0）— Sheets が拡張しているスプレッ
  ドシート UI のコア。
- [PDFium](https://pdfium.googlesource.com/pdfium/)（BSD-3-Clause、
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer) 経由でバンドル）— 本物の
  PDF テキスト・画像編集を支えるコンテンツストリームエンジン。
- [pdf.js](https://github.com/mozilla/pdf.js)（Apache-2.0）と
  [pdf-lib](https://github.com/Hopding/pdf-lib)（MIT）— PDF のレンダリングとドキュメント組み
  立て。
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) — Docs と Markdown
  のブロックエディタ。
- [CodeMirror](https://codemirror.net/)（MIT）— HTML アプリのソースエディタ。
- [Konva](https://konvajs.org/) — Slides と Sheets のグラフのキャンバスレンダリング。
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz)（wasm）— 複雑な文字体系のテキストシェイピ
  ング計測。
- [calamine](https://github.com/tafia/calamine) と
  [IronCalc](https://github.com/ironcalc/IronCalc) — Rust 製 xlsx サイドカーの読み取り層と計
  算層。
- [libeot](https://github.com/umanwizard/libeot)（MPL-2.0）— 埋め込み
  PowerPoint フォント用の MicroType Express デコーダーを TypeScript に
  移植したもの。
- [React](https://react.dev/)（MIT）— すべてのアプリの UI レイヤー。
- [Mermaid](https://mermaid.js.org/)（MIT）と [KaTeX](https://katex.org/)
  （MIT）— Markdown と Docs における図と数式。
- [opentype.js](https://opentype.js.org/)（MIT）— メトリクス取得とグリフ
  検索のためのフォント解析。
- [JSZip](https://stuk.github.io/jszip/)（MIT）と
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  （MIT）— OOXML コンテナと XML レイヤー。
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  （MIT）— 各リボンで使われているアイコンセット。
- [electron-updater](https://www.electron.build/)（MIT）— アプリ内
  アップデート。
- Liberation、Carlito、Caladea、Noto CJK フォント（OFL/Apache-2.0）— バンドルされているドキュ
  メント用フォント。

`npm run notices` を実行すると、バンドルされているサードパーティライセンスの概要
（`tools/gen-third-party-notices.mjs`）が再生成されます。すべてのランタイム依存関係は
MIT/Apache-2.0/BSD-3-Clause/OFL のいずれかです。

## ライセンス

Plot Docs は [Apache License 2.0](../../LICENSE) のもとでライセンスされていますが、1 つ例外
があります：`ee/` ディレクトリは将来のエンタープライズモジュール用に予約されており、
[Plot Docs Enterprise License](../../ee/LICENSE) が適用されます。

Plot Docs および Soopus の名称とロゴは Mainfunc, Inc. の商標です。Apache-2.0 ライセンスは
これらの使用を許諾するものではありません（セクション 6 を参照）。フォークする場合は、独自の
ブランディングを使用してください。
