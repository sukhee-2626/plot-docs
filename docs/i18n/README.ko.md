<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>세계 최초의 완전한 기능을 갖춘 오픈소스 AI 오피스 스위트.</b><br>
Word, Excel, PowerPoint, PDF 파일을 당신과 당신의 AI가 함께 편집하고, 실제 포맷 그대로 저장합니다.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="라이선스: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="최신 릴리스"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="다운로드 수"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub 스타 수"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <b>한국어</b> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>다운로드</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>웹사이트</b></a> ·
  <a href="https://plotxyz.ai"><b>커뮤니티</b></a> ·
  <a href="../../PRIVACY.md"><b>개인정보</b></a>
</p>

Plot Docs는 macOS, Windows, Linux에서 사용할 수 있는 무료 오픈소스
마이크로소프트 오피스 대체 프로그램입니다. 네이티브 `.docx`, `.xlsx`,
`.pptx` 파일을 열고 저장하며, PDF, Markdown, HTML을 편집하고, 모든 문서
옆에 AI 에이전트를 배치합니다 — 옆에 덧붙인 챗봇이 아니라, 파일을 읽고
변경을 수행한 뒤 정확히 무엇을 수정했는지 보여주는 편집기입니다.

- **실제 포맷을 그대로, 바이트 단위로 보존합니다.** 편집한 부분만 다시
  작성되고, 파일의 나머지는 바이트 단위로 그대로 유지되어 문서가 Word,
  Excel, PowerPoint에서도 계속 정상적으로 열립니다.
- **검토할 수 있는 AI입니다.** 편집 내용은 변경 내용 추적과 diff로
  반영되며 원클릭 롤백이 가능합니다. 스프레드시트에는 붙여넣은 값이
  아니라 실시간으로 동작하는 수식이 들어갑니다. 슬라이드와 페이지는
  캔버스에 직접 생성되어 계속 자유롭게 편집할 수 있습니다.
- **로컬 우선으로 설계되었습니다.** 파일은 사용자의 기기에서 열리고,
  편집되고, 저장되고, 변환됩니다. PDF → Word / Excel / PowerPoint,
  Markdown → Word, HTML → Word 변환 모두 기기 내에서 실행됩니다. 오직
  AI 호출만 사용자가 선택한 공급자로 전송됩니다.
- **API 키가 있어도, 없어도 됩니다.** Soopus로 로그인하면 키 없이 바로
  사용할 수 있고, 원한다면 Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM,
  Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty는 물론 OpenAI
  호환 엔드포인트(로컬 서버 포함)까지 직접 가져올 수 있습니다.
- **스크립트로 다룰 수 있고, 에이전트가 바로 쓸 수 있습니다.** 앱에는
  `plotdocs` 명령줄과 Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
  OpenCode, Windsurf용 스킬이 함께 제공되어, 코딩 에이전트가 창 하나 열지
  않고도 내 컴퓨터에서 실제 Office 파일을 만들고, 변환하고, 읽고, 편집할 수
  있습니다.

**다운로드:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon 및 Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 및 Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
자세한 내용과 요구 사항은 [다운로드](#download) 섹션을 참고하세요.

## 데모

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

## Plot Docs를 선택하는 이유

- **오픈소스**, Apache-2.0 라이선스로 GitHub에서 공개 개발됩니다.
- **내 기기에서 직접 실행.** macOS, Windows, Linux용 네이티브 앱; 파일은 디스크
  에 그대로 남고 모든 편집, 저장, 변환이 내 기기에서 이루어집니다.
- **진짜 Office 파일.** 네이티브 `.docx`, `.xlsx`, `.pptx`, 바이트 단위 보존:
  손대지 않은 부분은 그대로 복사됩니다.
- **문서를 직접 편집하는 AI.** Docs에서는 변경 내용 추적, Sheets에서는 실시간으로
  동작하는 수식과 차트, 슬라이드는 캔버스 위에 그려지며, AI가 한 번 작업할 때마다
  되돌릴 수 있는 스냅샷이 남습니다.
- **내 모델, 내 키.** Soopus로 로그인하거나 Claude, OpenAI, Gemini, DeepSeek
  등의 키를 사용할 수 있으며, 로컬 서버와 모든 OpenAI 호환 엔드포인트도 지원합니
  다.
- **PDF도 제대로.** 페이지 안에서 텍스트를 직접 편집하고, 기기 내에서 PDF를
  Word, Excel, PowerPoint로 변환하며, 스캔 문서는 시스템 OCR을 사용합니다.
- **Markdown과 HTML도 지원**하며, 동일한 AI 패널과 로컬 Word 내보내기를 사용합
  니다.
- **스크립트로 다룰 수 있습니다.** `plotdocs` 명령줄, 에이전트 스킬, MCP
  서버가 모든 엔진을 Claude Code, Claude Desktop, Codex, Cursor 및 다른
  에이전트가 쓸 수 있게 하며, 이 역시 기기 내에서 동작합니다.
- **무료**로 개인과 팀 모두 사용할 수 있습니다.

## AI 백엔드

**Soopus로 로그인**하면 별도 설정이 전혀 필요 없습니다. 모델 호출은
Soopus 프록시(Claude, GPT, Gemini 계열)를 거치고, 에이전트는 웹 및
이미지 검색, 이미지 생성, 이미지/오디오/비디오 분석 기능까지 사용할 수
있습니다.

**직접 키를 가져올 수도 있습니다.** 설정 → AI에는 Claude, OpenAI, Gemini,
DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty,
OpenCode Zen/Go가 있으며, 로컬 모델 서버를 포함한 모든 OpenAI 호환
엔드포인트(기본 URL + 키)를 위한 사용자 지정 슬롯도 제공됩니다. 검색과
미디어는 **AI 미디어 및 검색**에서 기능별로 별도 공급자를 설정할 수
있습니다: 웹 검색은 Serper 또는 Tavily, 이미지 생성과 이미지/비디오
분석은 OpenAI, Gemini, Doubao/Seedream, GLM, Grok, Qwen, MiniMax 또는
OpenAI 호환 이미지 엔드포인트 중에서 선택합니다.

전체 제품군은 라이트, 다크, 시스템 테마를 지원합니다. 테마는 화면에
보이는 모습만 바꿀 뿐입니다: 내보내기, 인쇄, 저장된 파일은 항상 문서
고유의 색상을 그대로 유지합니다.

<a id="command-line-and-agent-skill"></a>

## 명령줄과 에이전트 스킬

앱이 파일에 할 수 있는 모든 일을 `plotdocs` 명령줄은 터미널에서 할 수
있습니다: Word, Excel, PowerPoint, PDF, Markdown, HTML을 동일한 엔진으로,
화면 없이 검사하고, 변환하고, 만들고, 읽고, 편집합니다. Plot Docs와 함께
설치되며, 별도의 런타임이 필요 없고, 문서를 어디로도 전송하지 않습니다.
함께 제공되는 **에이전트 스킬**과 결합하면 코딩 에이전트는 Markdown으로
흉내 낸 결과물 대신 실제 Office 파일을 만들어내는 문서 작업자가 됩니다.

**지원 대상:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode, Windsurf는 바로 사용할 수 있고, 스킬을 읽을 수 있는 다른 모든
에이전트, 그리고 [MCP 서버](#mcp-server)를 통해 Claude Desktop과 모든 MCP
클라이언트에서도 동작합니다.

### 스킬 설치

| 방법                                   | 동작                                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 앱의 **설정 → 연동**                   | 이 컴퓨터에서 찾은 에이전트를 나열하고, 클릭 한 번으로 선택한 각 에이전트에 스킬을 기록합니다. Plot Docs 릴리스에 새 스킬이 포함되면 **업데이트** 버튼이 나타납니다. |
| 같은 페이지의 **zip으로 다운로드**     | claude.ai, Claude 데스크톱 앱, 그 밖의 어시스턴트가 업로드 스킬로 받아들이는 구조입니다.                                                                             |
| `npx skills add plotxyz-ai/plot-docs` | 이 저장소에서 스킬을 지원하는 모든 에이전트에 설치합니다.                                                                                                            |

그런 다음 새 대화를 시작해 문서를 요청하세요. 스킬은 언제 `plotdocs`를
꺼내야 하는지, 편집 전에 파일을 어떻게 읽어야 하는지, 자신의 작업을
어떻게 검증해야 하는지를 에이전트에게 알려줍니다.

### 터미널에서 빠르게 시작하기

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

모든 명령은 한 줄 요약을 출력하며, `--json`을 붙이면 단일 JSON 객체를
반환합니다. 편집은 원자적입니다: 거부된 작업은 파일을 건드리지 않고,
안내가 담긴 오류로 돌아옵니다. `plotdocs help`는 현재 명령 목록을
보여주며, 전체 레퍼런스는 [packages/cli/README.md](../../packages/cli/README.md)에 있습니다.

### 에이전트가 실제로 실행하는 것

위의 데모에 나온 태양계 덱은 Claude Code에서 프롬프트 하나로 만들어졌습니다.
그 뒤에서 에이전트는 스킬의 단계별 워크플로를 따랐고, CLI는 다음 단계로
넘어가기 전에 매 단계를 검사했습니다:

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

`plotdocs` 내부에서는 어떤 모델 호출도 일어나지 않습니다: 생각은
에이전트가 하고, 만들고 검사하는 일은 CLI가 하며, 결과는 평범한 `.pptx`로
Plot Docs나 PowerPoint에서 열립니다.

<a id="mcp-server"></a>

### MCP 서버

동일한 명령을 [Model Context Protocol](https://modelcontextprotocol.io) 도구로도
사용할 수 있습니다. 터미널을 실행할 수 없거나, 터미널 권한을 주고 싶지 않은
어시스턴트를 위한 방법입니다. 연결 방법은 두 가지이며, 둘 다 **설정 → 연동 →
MCP**에 바로 복사할 수 있는 코드 조각으로 안내되어 있습니다:

| 방법                          | 설명                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`**(권장) | 어시스턴트가 직접 실행하는 stdio 서버로, Plot Docs가 열려 있을 필요가 없습니다. 명령마다 도구가 하나씩 있습니다(`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`). 여기에 단계별 덱 흐름 `deck_start` → `deck_page` → `deck_build` → `deck_replace`가 더해집니다. Ops, 스펙, Markdown이 모두 인라인으로 전달되므로 파일 시스템이 없는 클라이언트도 문제없이 동작합니다. |
| **B · 로컬 HTTP 서버**        | Plot Docs 앱 내부에서 `http://127.0.0.1:3093/mcp`(Streamable HTTP, 레거시 SSE 지원)로 실행됩니다. 이 도구들은 눈에 보이는 Word 편집기 탭을 움직입니다: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`이며, 문서가 만들어지는 과정을 직접 지켜볼 수 있습니다. 기본값은 꺼짐이며, 같은 설정 화면에서 켤 수 있습니다.                                                                                                                                                       |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop 또는 다른 모든 MCP 클라이언트
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

여기서 `plotdocs`는 앱 내부에 포함된 바로 그 CLI입니다(macOS에서는
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`이며, 설정
화면에서 실제 설치 경로를 확인할 수 있습니다). 이 서버는 자체 워크플로
안내를 담고 있고, 작업 레퍼런스를 `plotdocs://guide/*` 리소스로 노출하므로
별도의 스킬이 필요 없습니다. 스킬과 MCP 서버는 함께 존재할 수 있으며,
어시스턴트가 둘 중 하나를 선택해 사용합니다. 클라우드 기능(`search`,
`image`, `media`)은 여전히 Plot Docs에 설정된 공급자를 거치며, 그 밖의
모든 기능은 로컬에서 동작하고, `PLOTDOCS_ALLOWED_ROOTS`가 모든 도구를
지정한 폴더로 제한합니다.

위의 데모에 나온 재생에너지 덱은, `plotdocs` MCP 서버만 연결한 Claude
Code에서 프롬프트 하나가 프로토콜 수준에서 어떻게 보이는지를 보여줍니다:

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

서른여덟 번의 호출, 약 13분, 그리고 어시스턴트는 터미널을 한 번도 건드리지 않았습니다: 도표, 사진, 가이드, 검사, 렌더링 결과가 모두 MCP 도구 결과로 오갔습니다. 기기를 벗어난 것은 `search`와 `media`뿐이며, Plot Docs에 설정된 제공업체로 전달되었습니다.

<a id="download"></a>

## 다운로드

| 플랫폼                               | 요구 사항                                             | 다운로드                                                                                |
| ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [최신 `.dmg` (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)         |
| **macOS** — Intel (x64)              | macOS 11+                                             | [최신 `.dmg` (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)           |
| **Windows** (x64, 대부분의 PC)       | Windows 10+, Intel/AMD                                | [최신 `-x64.exe` 설치 파일](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** on Arm (ARM64)           | Windows 11 on Arm (Snapdragon X 및 유사 기종)         | [최신 `-arm64.exe` 설치 파일](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 이상)               | [최신 `.deb`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [최신 `.rpm`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                 |
| **Linux** — 기타 배포판              | x86_64, glibc 2.34+, FUSE 2                           | [최신 `.AppImage`](https://github.com/plotxyz-ai/plot-docs/releases/latest)            |

모든 빌드는 `main` 브랜치에서 만들어지며, macOS와 Windows 설치 파일에는
서명이 되어 있습니다. 이전 버전은 [릴리스](https://github.com/plotxyz-ai/plot-docs/releases) 페이지에서 확인할 수 있습니다.

<details>
<summary><b>Linux에 설치하기</b></summary>

deb 패키지는 apt로 설치합니다 — 필요한 의존성을 함께 설치하고 Plot Docs를
애플리케이션 메뉴에 추가합니다:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

Fedora / RHEL 계열 / openSUSE에서는 대신 rpm을 설치합니다:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage는 별도 설치 없이 그 자리에서 실행됩니다: FUSE 2 런타임을
설치하고(`sudo apt install libfuse2`; Ubuntu 24.04에서는 패키지 이름이
`libfuse2t64`), 파일에 실행 권한을 부여한 뒤 실행하세요:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## 동작 방식

Docs, Sheets, Slides, PDF, Markdown, HTML, 그리고 탭 기반 셸까지 일곱
개의 Electron 앱은 순수 TypeScript 패키지로 이루어진 하나의 엔진
레이어와 `.xlsx`용 Rust 사이드카를 함께 사용합니다. 원본 파일은 언제나
신뢰할 수 있는 원본(source of truth)이며, 편집은 좁은 범위의 패치로만
적용되어 편집기가 손대지 않은 부분은 왕복 과정에서도 그대로 유지됩니다.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

패키지별 상세 설명(docx/pptx 엔진, `pdf2docx`, `html2docx`, 에이전트
코어와 프로바이더)은 [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages)에 있습니다.

## 개발

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

sheets 앱은 xlsx 사이드카를 위해 Rust 툴체인이 추가로 필요합니다
(`cargo`가 PATH에 있어야 함). `npm run build -w @plotdocs/sheets`를
실행하면 자동으로 컴파일됩니다. 모든 변경 사항이 통과해야 하는 검사와
풀 리퀘스트가 병합되는 과정은 [CONTRIBUTING.md](../../CONTRIBUTING.md)를 참고하세요.

## 커뮤니티

Plot Docs는 활발히 개발되고 있으며, 여러분의 피드백이 그 방향을
만들어갑니다.

- **버그를 신고하거나 기능을 요청**하려면
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues)를 이용하세요.
- **Plot Docs 그룹 채팅에 참여**하려면
  [PlotCommunity](https://plotxyz.ai)에서 팀 및 다른 사용자들과 대화할 수 있습니다.
- Plot Docs가 유용하다고 느끼셨다면 **저장소에 스타를 눌러주세요** —
  프로젝트를 지원하는 가장 좋은 방법입니다.

## 자주 묻는 질문

<details>
<summary><b>Plot Docs는 무료인가요?</b></summary>

네. Plot Docs는 Apache-2.0 라이선스 아래 무료로 제공되는 오픈소스
소프트웨어입니다 — 체험판도 없고, 앱 자체에 유료 등급도 없습니다.

</details>

<details>
<summary><b>Plot Docs에서 마이크로소프트 Word, Excel, PowerPoint 파일을 열 수 있나요?</b></summary>

네. Plot Docs는 네이티브 `.docx`, `.xlsx`, `.pptx` 파일을 열고 저장할 수
있습니다. 저장은 바이트 단위로 보존되므로, 손대지 않은 부분은 그대로
다시 기록되어 문서가 마이크로소프트 오피스에서도 계속 정상적으로
열립니다.

</details>

<details>
<summary><b>Plot Docs는 오프라인에서도 동작하나요?</b></summary>

문서 편집은 완전히 로컬에서 이루어집니다 — 파일을 열고, 편집하고,
저장하고, 변환하는 과정에서 파일이 기기를 벗어나지 않습니다. AI
기능(에이전트, 검색, 이미지 도구)은 네트워크 연결이 필요하며, Soopus
로그인 또는 직접 발급받은 모델 API 키가 있어야 합니다.

</details>

<details>
<summary><b>Plot Docs에서 PDF 파일을 편집할 수 있나요?</b></summary>

네 — 위에 덮어씌우는 주석이 아니라, 원본 폰트를 유지한 채 페이지
콘텐츠 스트림 자체를 다시 작성하는 실제 PDF 텍스트/이미지 편집 기능을
제공합니다.

</details>

<details>
<summary><b>Plot Docs에서 PDF를 Word, Excel, PowerPoint로 변환할 수 있나요?</b></summary>

네 — 전적으로 기기 내에서 처리됩니다: PDFium을 이용한 문자 단위 추출과
기하학 기반 레이아웃 분석만 사용하며, 클라우드 서비스나 업로드가 필요
없습니다. 스캔된 페이지도 지원합니다: macOS와 Windows에서는 시스템 OCR이
텍스트를 인식해 페이지 이미지가 아니라 편집 가능한 텍스트로 변환됩니다.

</details>

<details>
<summary><b>제 AI 모델이나 API 키를 직접 사용할 수 있나요?</b></summary>

네. 키가 필요 없는 Soopus 로그인 외에도, Plot Docs는 Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral,
OpenRouter, Requesty, OpenCode Zen/Go를 위한 직접 키 사용을 지원하며, 로컬 모델
서버를 포함한 모든 OpenAI 호환 엔드포인트도 사용할 수 있습니다. 검색,
이미지 생성, 이미지/비디오 분석은 설정 → AI 미디어 및 검색에서 별도의
키를 설정합니다.

</details>

<details>
<summary><b>Plot Docs에서 HTML을 Word로 변환할 수 있나요?</b></summary>

네 — HTML 앱의 Word로 내보내기 기능은 전적으로 기기 내에서 네이티브
편집 가능한 `.docx`를 생성합니다. 페이지는 내장 Chromium에서 렌더링된
뒤 실제 Word 구조로 변환됩니다: 제목, 문단, 목록, 표, 카드, KPI 행,
양식 필드, 페이지 배경까지 포함됩니다. Word에 대응 요소가 없는 시각
요소(차트, 아이콘, 장식된 박스)만 이미지로 삽입됩니다.

</details>

<details>
<summary><b>Claude Code, Codex, Cursor 또는 스크립트에서 Plot Docs를 제어할 수 있나요?</b></summary>

네. Plot Docs는 동일한 엔진을 화면 없이 실행하는 `plotdocs` 명령줄을
설치합니다: 터미널이나 스크립트에서 문서를 검사하고, 변환하고, 만들고,
읽고, 편집할 수 있으며, 프로그램용 `--json` 출력도 제공합니다. 함께
제공되는 에이전트 스킬은 Claude Code, Codex, Cursor, Gemini CLI, GitHub
Copilot, OpenCode, Windsurf에 사용법을 알려주며, **설정 → 연동**에서
설치할 수 있습니다. [명령줄과 에이전트 스킬](#command-line-and-agent-skill)을
참고하세요.

</details>

<details>
<summary><b>Plot Docs가 데이터를 수집하나요?</b></summary>

공식 패키지 빌드는 기본적으로 제한된 사용 통계를 전송하며, 설정 →
일반에서 언제든지 이 보고를 끌 수 있습니다. 통계에는 문서 내용, 파일
이름, 파일 경로, 계정 신원, 이메일 주소가 절대 포함되지 않습니다.
전체 이벤트와 데이터 공개 내용은 [Plot Docs Privacy](../../PRIVACY.md)에서 확인할 수 있습니다.

</details>

## 보안

프로세스 보안 방침(렌더러 샌드박싱, IPC 검증, 외부 링크 차단)과 AI
생성 콘텐츠에 대한 위협 모델은 [SECURITY.md](../../SECURITY.md)를 참고하세요.

## 감사의 말

Plot Docs는 다음의 오픈소스 프로젝트가 없었다면 만들어질 수 없었습니다:

- [Electron](https://www.electronjs.org/) — 모든 앱의 데스크톱 런타임입니다.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — Sheets가
  확장해서 사용하는 스프레드시트 UI 코어입니다.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause,
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)을 통해
  포함됨) — 실제 PDF 텍스트 및 이미지 편집을 지원하는 콘텐츠 스트림
  엔진입니다.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0)와
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — PDF 렌더링과
  문서 조합을 담당합니다.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  Docs와 Markdown의 블록 에디터입니다.
- [CodeMirror](https://codemirror.net/) (MIT) — HTML 앱의 소스
  에디터입니다.
- [Konva](https://konvajs.org/) — Slides와 Sheets 차트의 캔버스
  렌더링을 담당합니다.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — 복잡한
  문자 체계를 위한 텍스트 셰이핑 계량을 제공합니다.
- [calamine](https://github.com/tafia/calamine)과
  [IronCalc](https://github.com/ironcalc/IronCalc) — Rust xlsx
  사이드카의 읽기 및 계산 레이어입니다.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — 임베디드
  PowerPoint 폰트를 위한 MicroType Express 디코더를 TypeScript로 포팅한
  것입니다.
- [React](https://react.dev/) (MIT) — 모든 앱의 UI 레이어입니다.
- [Mermaid](https://mermaid.js.org/) (MIT)와 [KaTeX](https://katex.org/)
  (MIT) — Markdown과 Docs의 다이어그램과 수식을 담당합니다.
- [opentype.js](https://opentype.js.org/) (MIT) — 메트릭 확인과 글리프
  조회를 위한 폰트 파싱을 담당합니다.
- [JSZip](https://stuk.github.io/jszip/) (MIT)와
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — OOXML 컨테이너와 XML 레이어입니다.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — 각 리본에서 사용하는 아이콘 세트입니다.
- [electron-updater](https://www.electron.build/) (MIT) — 앱 내 업데이트를
  담당합니다.
- Liberation, Carlito, Caladea, Noto CJK 폰트(OFL/Apache-2.0) — 함께
  제공되는 문서용 폰트입니다.

`npm run notices`는 함께 제공되는 서드파티 라이선스 요약
(`tools/gen-third-party-notices.mjs`)을 다시 생성합니다. 모든 런타임
의존성은 MIT/Apache-2.0/BSD-3-Clause/OFL 라이선스를 따릅니다.

## 라이선스

Plot Docs는 [Apache License 2.0](../../LICENSE)에 따라 라이선스가
부여됩니다. 단, `ee/` 디렉터리는 향후 엔터프라이즈 모듈을 위해
예약되어 있으며 [Plot Docs Enterprise License](../../ee/LICENSE)가
적용됩니다.

Plot Docs와 Soopus의 이름과 로고는 Mainfunc, Inc.의 상표입니다.
Apache-2.0 라이선스는 이를 사용할 권리를 부여하지 않으며(6항 참고),
포크는 자체 브랜딩을 사용해야 합니다.
