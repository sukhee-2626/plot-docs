<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>Первый в мире полнофункциональный офисный пакет с открытым исходным кодом и ИИ.</b><br>
Файлы Word, Excel, PowerPoint и PDF, редактируемые вами и вашим ИИ, сохраняются обратно в реальных форматах.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="Лицензия: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Последний релиз"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Загрузки"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="Звёзды на GitHub"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <b>Русский</b> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>Скачать</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>Сайт</b></a> ·
  <a href="https://plotxyz.ai"><b>Сообщество</b></a> ·
  <a href="../../PRIVACY.md"><b>Конфиденциальность</b></a>
</p>

Plot Docs — бесплатная альтернатива Microsoft Office с открытым исходным
кодом для macOS, Windows и Linux. Она открывает и сохраняет нативные файлы
`.docx`, `.xlsx` и `.pptx`, редактирует PDF, Markdown и HTML и размещает
ИИ-агента рядом с каждым документом — не чат-бокс, прикрученный сбоку, а
редактор, который читает файл, вносит изменение и точно показывает вам, что
именно он затронул.

- **Настоящие форматы, побайтовое сохранение.** Переписывается только то, что
  вы редактируете. Всё остальное в файле сохраняется байт в байт, поэтому
  документы продолжают открываться в Word, Excel и PowerPoint.
- **ИИ, чью работу можно проверить.** Изменения оформляются как отслеживаемые
  правки и diff-ы с откатом одним щелчком. В таблицах появляются живые
  формулы, а не вставленные числа. Презентации и страницы создаются прямо на
  холсте и остаются полностью редактируемыми.
- **Всё работает локально.** Файлы открываются, редактируются,
  сохраняются и конвертируются на вашем компьютере. Преобразования PDF →
  Word / Excel / PowerPoint, Markdown → Word и HTML → Word выполняются прямо
  на устройстве. За пределы вашего компьютера уходят только запросы к ИИ — к
  выбранному вами провайдеру.
- **Со своим ключом или без ключей.** Войдите через Soopus и обойдитесь без ключей
  вообще, либо используйте собственный ключ для Claude, OpenAI, Gemini,
  DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty или
  любого совместимого с OpenAI эндпоинта, включая локальные серверы.
- **Скриптуемость и готовность к агентам.** В комплекте с приложением идёт
  командная строка `plotdocs` и скилл для Claude Code, Codex, Cursor,
  Gemini CLI, GitHub Copilot, OpenCode и Windsurf, так что кодинг-агент может
  создавать, конвертировать, читать и редактировать настоящие файлы Office на
  вашем компьютере, не открывая ни одного окна.

**Скачать:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon и Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 и Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
подробности и системные требования в разделе [Скачать](#download).

## Демонстрация

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

## Почему Plot Docs

- **Открытый исходный код**, Apache-2.0, разрабатывается открыто на GitHub.
- **Всё под вашим контролем.** Нативные приложения для macOS, Windows и Linux; файлы
  остаются на вашем диске, а каждое редактирование, сохранение и конвертация
  происходят на вашем устройстве.
- **Настоящие файлы Office.** Нативные `.docx`, `.xlsx` и `.pptx` с побайтовым
  сохранением: нетронутые части файла копируются в точности как были.
- **ИИ, редактирующий сам документ.** Отслеживаемые изменения в Docs, живые
  формулы и диаграммы в Sheets, слайды рисуются прямо на холсте, каждый шаг ИИ
  создаёт снимок, к которому можно вернуться.
- **Своя модель, свой ключ.** Войдите через Soopus или используйте свой
  ключ для Claude, OpenAI, Gemini, DeepSeek и других, включая локальные
  серверы и любой совместимый с OpenAI эндпоинт.
- **PDF как надо.** Редактируйте текст прямо на странице и
  конвертируйте PDF в Word, Excel или PowerPoint на устройстве, со встроенным
  в систему OCR для сканов.
- **А также Markdown и HTML**, с той же панелью ИИ и локальным экспортом в
  Word.
- **Скриптуемость.** Командная строка `plotdocs`, агентный скилл и
  MCP-сервер отдают каждый движок в распоряжение Claude Code, Claude
  Desktop, Codex, Cursor и других агентов — по-прежнему на устройстве.
- **Бесплатно**, как для отдельных пользователей, так и для команд.

## ИИ-провайдеры

**Войдите через Soopus** — и настраивать ничего не нужно: вызовы моделей
идут через проксирующий сервис Soopus (семейства Claude, GPT и Gemini), а
агенты получают веб- и графический поиск, генерацию изображений и анализ
изображений, аудио и видео.

**Либо используйте собственный ключ.** В разделе «Настройки → Модель ИИ» перечислены
Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok,
Mistral, OpenRouter, Requesty и OpenCode Zen/Go, а также отдельный слот для любого
совместимого с OpenAI эндпоинта (базовый URL + ключ), включая локальные
серверы моделей. Поиск и работа с медиа настраиваются через отдельных
провайдеров по каждой возможности в разделе **Медиа и поиск ИИ**: Serper
или Tavily для веб-поиска и OpenAI, Gemini, Doubao/Seedream, GLM, Grok, Qwen,
MiniMax или любой совместимый с OpenAI эндпоинт для генерации изображений и
анализа изображений/видео.

Весь пакет поддерживает светлую, тёмную и системную темы. Темы меняют только
то, что видно на экране: экспорт, печать и сохранённые файлы всегда сохраняют
собственные цвета документа.

<a id="command-line-and-agent-skill"></a>

## Командная строка и агентный скилл

Всё, что приложения умеют делать с файлом, командная строка `plotdocs` умеет
делать из терминала: инспектировать, конвертировать, создавать, читать и
редактировать Word, Excel, PowerPoint, PDF, Markdown и HTML на тех же движках,
без графического интерфейса. Она устанавливается вместе с Plot Docs, не
требует собственной среды выполнения и никогда никуда не отправляет документы.
В паре со встроенным **агентным скиллом** она превращает кодинг-агента в
работника с документами, который выдаёт настоящие файлы Office вместо
Markdown-приближений.

**Работает с:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode и Windsurf сразу из коробки, с любым другим агентом, который читает
скиллы, а также, через [MCP-сервер](#mcp-server), с Claude Desktop и любым
MCP-клиентом.

### Установка скилла

| Как                                     | Что происходит                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Настройки → Интеграции** в приложении | Показывает агентов, найденных на этом компьютере; один клик записывает скилл в каждый выбранный. Когда релиз Plot Docs приносит более новый скилл, появляется кнопка **Update**. |
| **Скачать как zip** на той же странице  | Формат, который claude.ai, десктопные приложения Claude и другие ассистенты принимают как загружаемый скилл.                                                                     |
| `npx skills add plotxyz-ai/plot-docs`  | Устанавливает скилл из этого репозитория в любой агент, поддерживающий скиллы.                                                                                                   |

Затем начните новый чат и попросите документ. Скилл учит агента, когда
обращаться к `plotdocs`, как прочитать файл перед редактированием и как
проверять собственную работу.

### Быстрый старт из терминала

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

Каждая команда выводит однострочную сводку или один JSON-объект с `--json`.
Правки атомарны: отклонённая операция оставляет файл нетронутым и возвращается
с подсказкой об ошибке. `plotdocs help` показывает актуальный набор команд;
полный справочник — в [packages/cli/README.md](../../packages/cli/README.md).

### Что на самом деле запускает агент

Презентация о Солнечной системе из демо выше потребовала одного промпта в
Claude Code. За кулисами агент следовал поэтапному процессу из скилла, а CLI
проверял каждый этап, прежде чем начинался следующий:

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

Внутри `plotdocs` не происходит ни одного вызова модели: агент думает, CLI
собирает и проверяет, а результат открывается в Plot Docs или PowerPoint как
обычный `.pptx`.

<a id="mcp-server"></a>

### MCP-сервер

Те же команды доступны как инструменты [Model Context Protocol](https://modelcontextprotocol.io)
— для ассистентов, которые не могут запустить терминал, или которым вы не
хотите его давать. Есть два способа подключения, оба показаны готовыми к
копированию фрагментами в **Настройки → Интеграции → MCP**:

| Способ                                  | Что это                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`** (рекомендуется) | stdio-сервер, который ассистент запускает сам; Plot Docs не обязательно держать открытым. По одному инструменту на команду (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`), а также поэтапный сценарий сборки презентации `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Операции, спецификации и Markdown передаются прямо в аргументах, так что клиент без файловой системы тоже работает. |
| **B · Локальный HTTP-сервер**           | Работает внутри приложения Plot Docs по адресу `http://127.0.0.1:3093/mcp` (Streamable HTTP, с поддержкой устаревшего SSE). Его инструменты управляют видимой вкладкой редактора Word: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session` — и вы видите, как документ обретает форму. По умолчанию выключен; включается на той же панели настроек.                                                                                                                                                                |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop или любой другой MCP-клиент
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

Здесь `plotdocs` — это CLI, встроенный в приложение (на macOS —
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; панель
настроек показывает точный путь для вашей установки). Сервер несёт
собственные инструкции по рабочему процессу и предоставляет справочники по
операциям как ресурсы `plotdocs://guide/*`, так что скилл не нужен; скилл
и MCP-сервер могут сосуществовать, и ассистент выбирает один из них.
Облачные возможности (`search`, `image`, `media`) по-прежнему идут через
провайдера, настроенного в Plot Docs; всё остальное выполняется локально, а
`PLOTDOCS_ALLOWED_ROOTS` ограничивает каждый инструмент папками из вашего
списка.

Презентация о возобновляемой энергетике из демо выше — вот как выглядит со
стороны протокола единственный промпт в Claude Code, к которому подключён
только MCP-сервер `plotdocs`:

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

Тридцать восемь вызовов, около тринадцати минут, и ассистент ни разу не
прикоснулся к терминалу: иллюстрации, фотографии, все гайды, проверки и
рендеры прошли как результаты вызовов MCP-инструментов. Только `search` и
`media` покидали машину — к провайдеру, настроенному в Plot Docs.

<a id="download"></a>

## Скачать

| Платформа                            | Требования                                            | Скачать                                                                                       |
| ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [Последний `.dmg` (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)          |
| **macOS** — Intel (x64)              | macOS 11+                                             | [Последний `.dmg` (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)            |
| **Windows** (x64, большинство ПК)    | Windows 10+, Intel/AMD                                | [Последний установщик `-x64.exe`](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** на Arm (ARM64)           | Windows 11 на Arm (Snapdragon X и аналогичные)        | [Последний установщик `-arm64.exe`](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 или новее)          | [Последний `.deb`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Последний `.rpm`](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — другие дистрибутивы      | x86_64, glibc 2.34+, FUSE 2                           | [Последний `.AppImage`](https://github.com/plotxyz-ai/plot-docs/releases/latest)             |

Все сборки собираются из ветки `main`; установщики для macOS и Windows
подписаны. Более старые версии доступны на странице
[Releases](https://github.com/plotxyz-ai/plot-docs/releases).

<details>
<summary><b>Установка на Linux</b></summary>

Deb-пакет устанавливается через apt — он подтягивает зависимости и
добавляет Plot Docs в меню приложений:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

На Fedora / в семействе RHEL / openSUSE вместо этого установите rpm-пакет:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

AppImage запускается прямо на месте: установите runtime FUSE 2
(`sudo apt install libfuse2`; на Ubuntu 24.04 пакет называется
`libfuse2t64`), сделайте файл исполняемым и запустите его:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## Как это работает

Семь Electron-приложений — Docs, Sheets, Slides, PDF, Markdown, HTML и
общая оболочка с вкладками — используют один слой чистых TypeScript-пакетов
плюс Rust-компонент (sidecar) для `.xlsx`. Исходный файл всегда остаётся
источником истины: изменения применяются как узкие патчи, а всё, что
редактор не трогал, переживает цикл сохранения без изменений.

```
open docx ─► архивируем оригинал по хэшу (никогда не трогаем)
          ─► разбираем word/document.xml в дерево блоков, каждый блок привязан к исходному XML
          ─► редактор Tiptap (ручное и ИИ-редактирование, отслеживание изменённого)
save      ─► изменённые блоки → фрагменты OOXML (со ссылками только на существующие стили)
          ─► вклеиваем их в исходный document.xml; нетронутые блоки сохраняют свои байты
          ─► пересобираем zip-архив; все остальные записи копируются побайтово
```

Обзор пакетов по отдельности (движки docx/pptx, `pdf2docx`, `html2docx`,
ядро агента и провайдеры) находится в
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Разработка

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

Приложению Sheets также нужен инструментарий Rust для его xlsx sidecar
(`cargo` в PATH); команда `npm run build -w @plotdocs/sheets` собирает его
автоматически. Список проверок, которые должно проходить каждое изменение, и
порядок принятия pull request-ов — в [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Сообщество

Plot Docs активно развивается, и ваши отзывы влияют на его развитие.

- **Сообщите об ошибке или предложите функцию** в
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues).
- **Присоединяйтесь к групповому чату Plot Docs** в
  [PlotCommunity](https://plotxyz.ai), чтобы общаться с командой и другими
  пользователями.
- **Поставьте звезду репозиторию**, если Plot Docs вам полезен — это лучший
  способ поддержать проект.

## Часто задаваемые вопросы

<details>
<summary><b>Plot Docs бесплатен?</b></summary>

Да. Plot Docs бесплатен и распространяется с открытым исходным кодом по
лицензии Apache-2.0 — ни пробного периода, ни платного тарифа для самих
приложений.

</details>

<details>
<summary><b>Может ли Plot Docs открывать файлы Microsoft Word, Excel и PowerPoint?</b></summary>

Да. Plot Docs открывает и сохраняет нативные файлы `.docx`, `.xlsx` и
`.pptx`. Сохранение выполняется побайтово: части файла, которые вы не
трогали, записываются обратно байт в байт, поэтому документы продолжают
работать в Microsoft Office.

</details>

<details>
<summary><b>Работает ли Plot Docs офлайн?</b></summary>

Редактирование документов полностью локально — файлы никогда не покидают
ваш компьютер при открытии, редактировании, сохранении или конвертации.
Функции ИИ (агенты, поиск, инструменты для изображений) требуют подключения
к сети — либо через вход в Soopus, либо через ваш собственный ключ API
модели.

</details>

<details>
<summary><b>Может ли Plot Docs редактировать файлы PDF?</b></summary>

Да — это настоящее редактирование текста и изображений PDF, которое
переписывает поток содержимого страницы с сохранением исходных шрифтов, а не
накладывает маскирующие аннотации.

</details>

<details>
<summary><b>Может ли Plot Docs конвертировать PDF в Word, Excel или PowerPoint?</b></summary>

Да — полностью на устройстве: посимвольное извлечение через PDFium плюс
анализ вёрстки на основе геометрии, без облачных сервисов и без загрузки
файлов куда-либо. Отсканированные страницы тоже поддерживаются: на macOS и
Windows их читает системный OCR, поэтому они конвертируются в редактируемый
текст, а не в изображение страницы.

</details>

<details>
<summary><b>Могу ли я использовать свою ИИ-модель или API-ключ?</b></summary>

Да. Помимо входа через Soopus без ключей, Plot Docs поддерживает
собственный ключ для Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen,
Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty и OpenCode Zen/Go, а также любой
совместимый с OpenAI эндпоинт — включая локальные серверы моделей. Поиск,
генерация изображений и анализ изображений/видео используют собственные
ключи в разделе «Настройки → Медиа и поиск ИИ».

</details>

<details>
<summary><b>Может ли Plot Docs конвертировать HTML в Word?</b></summary>

Да — функция Export as Word в приложении HTML создаёт нативный редактируемый
файл `.docx` полностью на устройстве. Страница отрисовывается во встроенном
Chromium и сводится к настоящим структурам Word: заголовкам, абзацам,
спискам, таблицам, карточкам, строкам KPI, полям форм и фонам страниц; в виде
изображений встраивается только то, что не имеет аналога в Word (диаграммы,
иконки, декорированные блоки).

</details>

<details>
<summary><b>Могу ли я управлять Plot Docs из Claude Code, Codex, Cursor или скрипта?</b></summary>

Да. Plot Docs устанавливает командную строку `plotdocs`, которая запускает те
же движки без графического интерфейса: инспектируйте, конвертируйте,
создавайте, читайте и редактируйте документы из терминала или скрипта, с
выводом `--json` для программ. Встроенный агентный скилл учит Claude Code,
Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode и Windsurf пользоваться
ею; установите его в разделе **Настройки → Интеграции**. См.
[Командная строка и агентный скилл](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Собирает ли Plot Docs какие-либо данные?</b></summary>

Официальные сборки по умолчанию отправляют ограниченную
аналитику использования, и вы можете отключить её в любой момент в разделе
«Настройки → Общие». Аналитика никогда не передаёт содержимое документов,
имена и пути файлов, идентификатор учётной записи или адреса электронной
почты. Полный перечень событий и раскрытие данных — в
[Plot Docs Privacy](../../PRIVACY.md).

</details>

## Безопасность

Описание модели безопасности процессов (изоляция renderer-процесса,
проверка IPC, ограничение внешних ссылок) и модели угроз для контента,
созданного ИИ, — в [SECURITY.md](../../SECURITY.md).

## Благодарности

Plot Docs был бы невозможен без этих проектов с открытым исходным кодом:

- [Electron](https://www.electronjs.org/) — среда выполнения для каждого
  приложения.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — основа
  интерфейса таблиц, на которой строится Sheets.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause,
  поставляется через [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer))
  — движок потока содержимого, стоящий за настоящим редактированием текста и
  изображений в PDF.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) и
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — рендеринг PDF и
  сборка документов.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  блочные редакторы в Docs и Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — редактор исходного кода в
  HTML.
- [Konva](https://konvajs.org/) — рендеринг на канвасе для Slides и диаграмм
  Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — метрики
  шейпинга текста для сложных систем письма.
- [calamine](https://github.com/tafia/calamine) и
  [IronCalc](https://github.com/ironcalc/IronCalc) — слои чтения и расчёта в
  Rust-компоненте xlsx.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — декодер
  MicroType Express для встроенных шрифтов PowerPoint, портированный на
  TypeScript.
- [React](https://react.dev/) (MIT) — слой пользовательского интерфейса
  каждого приложения.
- [Mermaid](https://mermaid.js.org/) (MIT) и [KaTeX](https://katex.org/)
  (MIT) — диаграммы и математические формулы в Markdown и Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — разбор шрифтов для
  метрик и поиска глифов.
- [JSZip](https://stuk.github.io/jszip/) (MIT) и
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — слои контейнера OOXML и XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — набор значков в лентах команд.
- [electron-updater](https://www.electron.build/) (MIT) — обновления
  внутри приложения.
- Шрифты Liberation, Carlito, Caladea и Noto CJK (OFL/Apache-2.0) —
  встроенные шрифты документов.

Команда `npm run notices` пересобирает сводку сторонних лицензий,
поставляемых с приложением (`tools/gen-third-party-notices.mjs`); все
рантайм-зависимости распространяются по лицензиям
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Лицензия

Plot Docs распространяется по лицензии [Apache License 2.0](../../LICENSE),
с одним исключением: каталог `ee/` зарезервирован для будущих корпоративных
модулей и покрывается [Plot Docs Enterprise License](../../ee/LICENSE).

Названия и логотипы Plot Docs и Soopus являются товарными знаками Mainfunc,
Inc. Лицензия Apache-2.0 не даёт права использовать их (см. раздел 6);
форки должны использовать собственный брендинг.
