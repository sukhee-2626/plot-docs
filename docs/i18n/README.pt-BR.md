<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>A primeira suíte de escritório open source com IA completa do mundo.</b><br>
Arquivos do Word, Excel, PowerPoint e PDF, editados por você e sua IA, salvos de volta nos formatos reais.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="Licença: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Versão mais recente"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="Estrelas no GitHub"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português (Brasil)</b> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>Site</b></a> ·
  <a href="https://plotxyz.ai"><b>Comunidade</b></a> ·
  <a href="../../PRIVACY.md"><b>Privacidade</b></a>
</p>

O Plot Docs é uma alternativa gratuita e de código aberto ao Microsoft Office
para macOS, Windows e Linux. Ele abre e salva arquivos nativos `.docx`,
`.xlsx` e `.pptx`, edita PDF, Markdown e HTML, e coloca um agente de IA ao
lado de cada documento — não um chat encaixado na lateral, mas um editor que
lê o arquivo, faz a alteração e mostra exatamente o que foi tocado.

- **Formatos reais, preservando cada byte.** Só o que você edita é reescrito.
  Todo o restante do arquivo permanece intacto byte a byte, então os
  documentos continuam funcionando no Word, no Excel e no PowerPoint.
- **IA que você pode revisar.** As edições chegam como alterações rastreadas e
  diffs, com reversão em um clique. As planilhas recebem fórmulas ao vivo, não
  números colados. Apresentações e páginas são geradas diretamente no canvas e
  permanecem totalmente editáveis.
- **Local por design.** Os arquivos são abertos, editados, salvos e
  convertidos na sua máquina. PDF → Word / Excel / PowerPoint, Markdown →
  Word e HTML → Word rodam localmente. Somente as chamadas de IA saem da
  máquina, para o provedor que você escolher.
- **Suas chaves, ou nenhuma.** Faça login com o Soopus e pule as chaves, ou
  use sua própria chave para Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM,
  Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty, ou qualquer endpoint
  compatível com OpenAI, incluindo servidores locais.
- **Automatizável e pronto para agentes.** O app inclui uma linha de comando
  `plotdocs` e um skill para Claude Code, Codex, Cursor, Gemini CLI, GitHub
  Copilot, OpenCode e Windsurf, para que um agente de programação possa criar,
  converter, ler e editar arquivos reais do Office na sua máquina sem abrir
  uma janela.

**Baixe:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon e Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 e Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
detalhes e requisitos em [Download](#download).

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

## Por que o Plot Docs

- **Código aberto**, Apache-2.0, desenvolvido abertamente no GitHub.
- **Seu para executar.** Apps nativos para macOS, Windows e Linux; os arquivos
  ficam no seu disco e cada edição, salvamento e conversão acontece na sua
  máquina.
- **Arquivos reais do Office.** `.docx`, `.xlsx` e `.pptx` nativos, preservando
  cada byte: as partes de um arquivo que você não tocou são copiadas
  exatamente como estavam.
- **Uma IA que edita o próprio documento.** Alterações rastreadas no Docs,
  fórmulas e gráficos ao vivo no Sheets, slides desenhados diretamente no
  canvas, cada interação da IA gera um snapshot que você pode desfazer.
- **Seu modelo, sua chave.** Entre com o Soopus ou traga uma chave para
  Claude, OpenAI, Gemini, DeepSeek e outros, com servidores locais e qualquer
  endpoint compatível com OpenAI incluídos.
- **PDF feito como deve ser.** Edite o texto dentro da página e converta PDF
  para Word, Excel ou PowerPoint no dispositivo, com OCR do sistema para
  digitalizações.
- **Markdown e HTML também**, com o mesmo painel de IA e exportação local para
  Word.
- **Automatizável.** Uma linha de comando `plotdocs`, um skill de agente e
  um servidor MCP colocam todos os mecanismos a serviço do Claude Code, Claude
  Desktop, Codex, Cursor e outros agentes, ainda no dispositivo.
- **Gratuito**, para indivíduos e equipes.

## Backends de IA

**Faça login com o Soopus** e não há nada para configurar: as chamadas de
modelo passam pelo proxy do Soopus (famílias Claude, GPT e Gemini) e os
agentes ganham busca na web e de imagens, geração de imagens e análise de
imagem/áudio/vídeo.

**Ou traga sua própria chave.** Configurações → IA lista Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty
e OpenCode Zen/Go, além de um slot personalizado para qualquer endpoint
compatível com OpenAI (URL base + chave), incluindo servidores de modelo
locais. Busca e mídia têm seus próprios provedores por capacidade em **IA de
Mídia e Busca**: Serper ou Tavily para busca na web, e OpenAI, Gemini,
Doubao/Seedream, GLM, Grok, Qwen, MiniMax ou qualquer endpoint de imagens
compatível com OpenAI para geração de imagens e análise de imagem/vídeo.

A suíte completa vem com temas claro, escuro e do sistema. Os temas só
mudam o que aparece na tela: exportações, impressões e arquivos salvos
sempre mantêm as cores originais do documento.

<a id="command-line-and-agent-skill"></a>

## Linha de comando e skill de agente

Tudo o que os aplicativos fazem com um arquivo, a linha de comando `plotdocs`
faz a partir de um terminal: inspecionar, converter, criar, ler e editar
Word, Excel, PowerPoint, PDF, Markdown e HTML com os mesmos mecanismos, sem
interface gráfica. Ela é instalada junto com o Plot Docs, não precisa de
runtime próprio e nunca envia um documento para lugar nenhum. Combinada com
o **skill de agente** incluído, ela transforma um agente de programação em um
operário de documentos que produz arquivos reais do Office em vez de
aproximações em Markdown.

**Funciona com:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode e Windsurf sem configuração, com qualquer outro agente que leia
skills e, através do [servidor MCP](#mcp-server), o Claude Desktop e todo
cliente MCP.

### Instalar o skill

| Como                                   | O que acontece                                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Configurações → Integrações** no app | Lista os agentes encontrados neste computador; um clique grava o skill em cada um que você escolher. Um botão **Atualizar** aparece quando uma versão do Plot Docs traz um skill mais novo. |
| **Baixar como zip** na mesma página    | O formato que o claude.ai, os aplicativos desktop do Claude e outros assistentes aceitam como skill enviado.                                                                                |
| `npx skills add plotxyz-ai/plot-docs` | Instala a partir deste repositório em qualquer agente compatível com skills.                                                                                                                |

Depois, abra um novo chat e peça um documento. O skill ensina ao agente
quando recorrer ao `plotdocs`, como ler um arquivo antes de editá-lo e como
verificar o próprio trabalho.

### Início rápido no terminal

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

Cada comando imprime um resumo de uma linha, ou um único objeto JSON com
`--json`. As edições são atômicas: uma operação rejeitada deixa o arquivo
intocado e volta com um erro orientado. `plotdocs help` lista a superfície
de comandos atual; a referência completa está em
[packages/cli/README.md](../../packages/cli/README.md).

### O que o agente realmente executa

A apresentação do Sistema Solar da demo acima levou um único prompt no
Claude Code. Por trás, o agente seguiu o fluxo de trabalho em etapas do skill
e a CLI verificou cada etapa antes de começar a seguinte:

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

Nenhuma chamada a um modelo acontece dentro do `plotdocs`: o agente pensa, a
CLI constrói e verifica, e o resultado abre no Plot Docs ou no PowerPoint
como um `.pptx` comum.

<a id="mcp-server"></a>

### Servidor MCP

Os mesmos comandos estão disponíveis como ferramentas de
[Model Context Protocol](https://modelcontextprotocol.io) para assistentes
que não conseguem rodar um terminal ou aos quais você prefere não dar um.
Há duas formas de entrada, ambas mostradas com trechos prontos para copiar
em **Configurações → Integrações → MCP**:

| Forma                                 | O que é                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`** (recomendado) | Um servidor stdio que o próprio assistente inicia; o Plot Docs não precisa estar aberto. Uma ferramenta por comando (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) mais o fluxo de apresentação em etapas `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Operações, especificações e Markdown são passados inline, então um cliente sem sistema de arquivos também funciona. |
| **B · Servidor HTTP local**           | Roda dentro do aplicativo Plot Docs em `http://127.0.0.1:3093/mcp` (Streamable HTTP, com SSE legado). Suas ferramentas comandam uma aba de editor de Word visível: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, e você observa o documento tomar forma. Desativado por padrão; ative-o no mesmo painel de configurações.                                                                                                                                                                    |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop ou qualquer outro cliente MCP
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

Aqui, `plotdocs` é a CLI que vem dentro do aplicativo (no macOS
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; o painel de
configurações mostra o caminho exato da sua instalação). O servidor traz
suas próprias instruções de fluxo de trabalho e expõe as referências de
operações como recursos `plotdocs://guide/*`, então nenhum skill é
necessário; o skill e o servidor MCP podem coexistir, e o assistente
escolhe um. Os recursos de nuvem (`search`, `image`, `media`) ainda passam
pelo provedor configurado no Plot Docs; todo o resto roda localmente, e o
`PLOTDOCS_ALLOWED_ROOTS` limita cada ferramenta às pastas que você listar.

A apresentação sobre energia renovável da demo acima é como fica, do lado
do protocolo, um único prompt no Claude Code com apenas o servidor MCP do
`plotdocs` conectado:

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

Trinta e oito chamadas, cerca de treze minutos, e o assistente nunca tocou
em um terminal: as figuras, as fotos, os guias, as verificações e as
renderizações viajaram todos como resultados de ferramentas MCP. Só
`search` e `media` saíram da máquina, para o provedor configurado no
Plot Docs.

<a id="download"></a>

## Download

| Plataforma                           | Requisitos                                            | Download                                                                                         |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [`.dmg` mais recente (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)          |
| **macOS** — Intel (x64)              | macOS 11+                                             | [`.dmg` mais recente (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)            |
| **Windows** (x64, maioria dos PCs)   | Windows 10+, Intel/AMD                                | [Instalador `-x64.exe` mais recente](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** no Arm (ARM64)           | Windows 11 no Arm (Snapdragon X e similares)          | [Instalador `-arm64.exe` mais recente](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 ou mais recente)    | [`.deb` mais recente](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [`.rpm` mais recente](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — outras distribuições     | x86_64, glibc 2.34+, FUSE 2                           | [`.AppImage` mais recente](https://github.com/plotxyz-ai/plot-docs/releases/latest)             |

Todas as builds vêm da `main`; os instaladores de macOS e Windows são
assinados. Versões mais antigas estão na página de
[Releases](https://github.com/plotxyz-ai/plot-docs/releases).

<details>
<summary><b>Instalando no Linux</b></summary>

O deb instala com o apt — ele traz as dependências e adiciona o Plot Docs
ao menu de aplicativos:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

No Fedora / família RHEL / openSUSE, instale o rpm em vez disso:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

O AppImage roda no lugar: instale o runtime FUSE 2
(`sudo apt install libfuse2`; no Ubuntu 24.04 o pacote é `libfuse2t64`),
torne o arquivo executável e então execute-o:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## Como funciona

Sete aplicativos Electron — Docs, Sheets, Slides, PDF, Markdown, HTML e o
shell com abas — compartilham uma camada de mecanismo de pacotes TypeScript
puro, além de um sidecar em Rust para `.xlsx`. O arquivo original é sempre a
fonte da verdade: as edições são aplicadas como patches estreitos, e tudo o
que o editor não tocou sobrevive intacto à ida e volta.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

O tour pacote a pacote (mecanismos de docx/pptx, `pdf2docx`, `html2docx`, o
núcleo do agente e os provedores) está em
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Desenvolvimento

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

O aplicativo sheets também precisa de um toolchain Rust para seu sidecar
xlsx (`cargo` no PATH); `npm run build -w @plotdocs/sheets` compila isso
automaticamente. Veja [CONTRIBUTING.md](../../CONTRIBUTING.md) para as
verificações que toda alteração precisa passar e como os pull requests são
integrados.

## Comunidade

O Plot Docs está em desenvolvimento ativo e o seu feedback ajuda a moldá-lo.

- **Relate um bug ou peça um recurso** em
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues).
- **Participe do grupo de chat do Plot Docs** no
  [PlotCommunity](https://plotxyz.ai) para falar com a equipe e outros usuários.
- **Dê uma estrela no repositório** se o Plot Docs for útil para você — é a
  melhor forma de apoiar o projeto.

## Perguntas frequentes

<details>
<summary><b>O Plot Docs é gratuito?</b></summary>

Sim. O Plot Docs é gratuito e de código aberto sob a licença Apache-2.0 —
sem teste gratuito, sem nível pago para os próprios aplicativos.

</details>

<details>
<summary><b>O Plot Docs pode abrir arquivos do Microsoft Word, Excel e PowerPoint?</b></summary>

Sim. O Plot Docs abre e salva arquivos nativos `.docx`, `.xlsx` e `.pptx`.
O salvamento preserva cada byte: as partes do arquivo que você não tocou são
gravadas de volta byte a byte, então os documentos continuam funcionando no
Microsoft Office.

</details>

<details>
<summary><b>O Plot Docs funciona offline?</b></summary>

A edição de documentos é totalmente local — os arquivos nunca saem da sua
máquina para serem abertos, editados, salvos ou convertidos. Os recursos de
IA (agentes, busca, ferramentas de imagem) precisam de conexão de rede, com
login no Soopus ou sua própria chave de API de modelo.

</details>

<details>
<summary><b>O Plot Docs pode editar arquivos PDF?</b></summary>

Sim — edição real de texto e imagem em PDF, que reescreve o content stream
da página preservando as fontes originais, em vez de anotações de
encobrimento.

</details>

<details>
<summary><b>O Plot Docs pode converter PDF para Word, Excel ou PowerPoint?</b></summary>

Sim — totalmente no dispositivo: extração de caracteres via PDFium mais
análise de layout baseada em geometria, sem serviço na nuvem, sem upload.
Páginas escaneadas também são cobertas: no macOS e no Windows o OCR do
sistema as lê, então elas são convertidas em texto editável em vez de uma
imagem da página.

</details>

<details>
<summary><b>Posso usar meu próprio modelo de IA ou chave de API?</b></summary>

Sim. Além do login sem chave pelo Soopus, o Plot Docs permite trazer sua
própria chave para Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen,
Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty e OpenCode Zen/Go, além de
qualquer endpoint compatível com OpenAI — incluindo servidores de modelo
locais. Busca, geração de imagens e análise de imagem/vídeo usam suas
próprias chaves em Configurações → IA de Mídia e Busca.

</details>

<details>
<summary><b>O Plot Docs pode converter HTML para Word?</b></summary>

Sim — Exportar como Word no aplicativo HTML produz um `.docx` nativo e
editável, totalmente no dispositivo. A página é renderizada no Chromium
integrado e reduzida a estruturas reais do Word: títulos, parágrafos,
listas, tabelas, cartões, linhas de KPIs, campos de formulário e fundos de
página; apenas elementos visuais sem equivalente no Word (gráficos, ícones,
caixas decoradas) são incorporados como imagens.

</details>

<details>
<summary><b>Posso comandar o Plot Docs a partir do Claude Code, Codex, Cursor ou de um script?</b></summary>

Sim. O Plot Docs instala uma linha de comando `plotdocs` que executa os
mesmos mecanismos sem interface gráfica: inspecione, converta, crie, leia e
edite documentos a partir de um terminal ou de um script, com saída `--json`
para programas. O skill de agente incluído ensina o Claude Code, Codex,
Cursor, Gemini CLI, GitHub Copilot, OpenCode e Windsurf a usá-la; instale-o
em **Configurações → Integrações**. Veja
[Linha de comando e skill de agente](#command-line-and-agent-skill).

</details>

<details>
<summary><b>O Plot Docs coleta algum dado?</b></summary>

As builds empacotadas oficiais enviam análises de uso limitadas por padrão,
e você pode desativar esse envio a qualquer momento em Configurações →
Geral. As análises nunca enviam conteúdo de documentos, nomes de arquivos,
caminhos de arquivos, identidade da conta ou endereços de e-mail. Veja
[Plot Docs Privacy](../../PRIVACY.md) para a lista completa de eventos e
divulgações de dados.

</details>

## Segurança

Veja [SECURITY.md](../../SECURITY.md) para a postura de segurança do
processo (sandboxing do renderer, validação de IPC, controle de links
externos) e os modelos de ameaça para conteúdo gerado por IA.

## Agradecimentos

O Plot Docs não seria possível sem estes projetos de código aberto:

- [Electron](https://www.electronjs.org/) — o runtime de desktop de todos os aplicativos.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — o núcleo de
  interface de planilhas que o Sheets estende.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause,
  empacotado via [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer))
  — o mecanismo de content stream por trás da edição real de texto e imagem
  em PDF.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) e
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — renderização de PDF
  e montagem de documentos.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  os editores em blocos do Docs e do Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — o editor de código-fonte do HTML.
- [Konva](https://konvajs.org/) — renderização em canvas para os gráficos do
  Slides e do Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — métricas de
  text-shaping para escritas complexas.
- [calamine](https://github.com/tafia/calamine) e
  [IronCalc](https://github.com/ironcalc/IronCalc) — as camadas de leitura e
  cálculo do sidecar xlsx em Rust.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — o decodificador
  MicroType Express para fontes do PowerPoint incorporadas, portado para
  TypeScript.
- [React](https://react.dev/) (MIT) — a camada de interface de todos os
  aplicativos.
- [Mermaid](https://mermaid.js.org/) (MIT) e [KaTeX](https://katex.org/)
  (MIT) — diagramas e fórmulas matemáticas no Markdown e no Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — análise de fontes para
  métricas e busca de glifos.
- [JSZip](https://stuk.github.io/jszip/) (MIT) e
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — as camadas de contêiner OOXML e XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — o conjunto de ícones usado nas faixas de opções.
- [electron-updater](https://www.electron.build/) (MIT) — atualizações
  dentro do próprio aplicativo.
- Fontes Liberation, Carlito, Caladea e Noto CJK (OFL/Apache-2.0) — fontes
  de documento incluídas.

`npm run notices` regenera o resumo de licenças de terceiros incluído
(`tools/gen-third-party-notices.mjs`); todas as dependências de runtime são
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Licença

O Plot Docs é licenciado sob a [Apache License 2.0](../../LICENSE), com uma
exceção: o diretório `ee/` é reservado para futuros módulos empresariais e
é coberto pela [Plot Docs Enterprise License](../../ee/LICENSE).

Os nomes e logotipos Plot Docs e Soopus são marcas registradas da
Mainfunc, Inc. A licença Apache-2.0 não concede permissão para usá-los (veja
a seção 6); forks devem usar sua própria marca.
