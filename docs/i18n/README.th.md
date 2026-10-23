<p align="center">
  <a href="https://plotxyz.ai/">
    <img src="../../site/assets/plotdocs-logo.svg" alt="Plot Docs" width="760">
  </a>
</p>

<h1 align="center">Plot Docs</h1>

<p align="center"><b>ชุดโปรแกรม Office AI แบบโอเพนซอร์สที่ครบฟีเจอร์รายแรกของโลก</b><br>
ไฟล์ Word, Excel, PowerPoint และ PDF แก้ไขโดยคุณและ AI ของคุณ บันทึกกลับเป็นฟอร์แมตจริง</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/plotxyz-ai/plot-docs" alt="License: Apache-2.0"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases/latest"><img src="https://img.shields.io/github/v/release/plotxyz-ai/plot-docs" alt="Latest release"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/releases"><img src="https://img.shields.io/github/downloads/plotxyz-ai/plot-docs/total" alt="Downloads"></a>
  <a href="https://github.com/plotxyz-ai/plot-docs/stargazers"><img src="https://img.shields.io/github/stars/plotxyz-ai/plot-docs?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <b>ไทย</b> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a></p>

<p align="center">
  <a href="#download"><b>ดาวน์โหลด</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://plotxyz.ai/"><b>เว็บไซต์</b></a> ·
  <a href="https://plotxyz.ai"><b>คอมมูนิตี้</b></a> ·
  <a href="../../PRIVACY.md"><b>ความเป็นส่วนตัว</b></a>
</p>

Plot Docs คือทางเลือกฟรีและโอเพนซอร์สของ Microsoft Office สำหรับ macOS,
Windows และ Linux เปิดและบันทึกไฟล์ `.docx`, `.xlsx` และ `.pptx` แบบดั้งเดิม
แก้ไข PDF, Markdown และ HTML ได้ และวางเอเจนต์ AI ไว้ข้างเอกสารทุกฉบับ —
ไม่ใช่กล่องแชทที่แปะไว้ข้างๆ แต่เป็นเอดิเตอร์ที่อ่านไฟล์ ทำการแก้ไข
และแสดงให้เห็นชัดเจนว่าแก้ไขส่วนใดไปบ้าง

- **ฟอร์แมตจริง คงบิตต่อบิต** เฉพาะส่วนที่คุณแก้ไขเท่านั้นที่จะถูกเขียนใหม่
  ส่วนอื่นๆ ของไฟล์จะยังคงเดิมทุกไบต์ เอกสารจึงใช้งานได้ต่อใน Word,
  Excel และ PowerPoint
- **AI ที่ตรวจสอบได้** การแก้ไขจะมาในรูปแบบ tracked changes และ diff
  พร้อมปุ่มย้อนกลับคลิกเดียว สเปรดชีตได้สูตรที่คำนวณสด ไม่ใช่ตัวเลขที่วางทับ
  สไลด์และหน้าเอกสารถูกสร้างขึ้นบนแคนวาสและยังแก้ไขได้เต็มรูปแบบ
- **ทำงานในเครื่องโดยออกแบบมาแบบนั้น** ไฟล์เปิด แก้ไข บันทึก
  และแปลงบนเครื่องของคุณเอง PDF → Word / Excel / PowerPoint, Markdown → Word
  และ HTML → Word ทั้งหมดทำงานในเครื่อง มีเพียงการเรียก AI เท่านั้นที่ออกจาก
  เครื่องไปยังผู้ให้บริการที่คุณเลือก
- **ใช้คีย์ของคุณเองหรือไม่ต้องใช้เลยก็ได้** ลงชื่อเข้าใช้ด้วย Soopus
  แล้วข้ามการตั้งค่าคีย์ไปได้เลย หรือใช้คีย์ของคุณเองกับ Claude, OpenAI,
  Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral,
  OpenRouter, Requesty หรือ endpoint ที่รองรับ OpenAI-compatible ใดๆ
  รวมถึงเซิร์ฟเวอร์โมเดลภายในเครื่องด้วย
- **เขียนสคริปต์ได้และพร้อมสำหรับเอเจนต์** แอปมาพร้อมบรรทัดคำสั่ง `plotdocs`
  และสกิลสำหรับ Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
  OpenCode และ Windsurf ทำให้เอเจนต์เขียนโค้ดสามารถสร้าง แปลง อ่าน
  และแก้ไขไฟล์ Office จริงบนเครื่องของคุณได้โดยไม่ต้องเปิดหน้าต่างใดๆ

**ดาวน์โหลด:** [macOS](https://github.com/plotxyz-ai/plot-docs/releases/latest) (Apple Silicon และ Intel) ·
[Windows](https://github.com/plotxyz-ai/plot-docs/releases/latest) (x64 และ Arm) ·
[Linux](https://github.com/plotxyz-ai/plot-docs/releases/latest) (deb, rpm, AppImage) —
รายละเอียดและความต้องการของระบบดูได้ในหัวข้อ [ดาวน์โหลด](#download)

## เดโม

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

## ทำไมต้อง Plot Docs

- **โอเพนซอร์ส** Apache-2.0 พัฒนาแบบเปิดบน GitHub
- **เป็นของคุณให้รันเอง** แอปเนทิฟสำหรับ macOS, Windows และ Linux ไฟล์อยู่บนดิสก์
  ของคุณ และการแก้ไข บันทึก และแปลงไฟล์ทุกครั้งเกิดขึ้นบนเครื่องของคุณเอง
- **ไฟล์ Office ตัวจริง** `.docx`, `.xlsx` และ `.pptx` แบบเนทิฟ คงบิตต่อบิต:
  ส่วนของไฟล์ที่คุณไม่ได้แก้ไขจะถูกคัดลอกไว้เหมือนเดิม
- **AI ที่แก้ไขเอกสารได้เอง** tracked changes ใน Docs สูตรและกราฟที่คำนวณสดใน
  Sheets สไลด์ที่วาดตรงบนแคนวาส ทุกรอบของ AI คือสแนปช็อตที่คุณย้อนกลับได้
- **โมเดลของคุณ คีย์ของคุณ** ลงชื่อเข้าใช้ด้วย Soopus หรือใส่คีย์ของคุณเองสำหรับ
  Claude, OpenAI, Gemini, DeepSeek และอื่นๆ รวมถึงเซิร์ฟเวอร์ในเครื่องและ
  endpoint ที่รองรับ OpenAI-compatible ใดๆ
- **PDF ที่ทำได้อย่างถูกต้อง** แก้ไขข้อความในตำแหน่งเดิมบนหน้า และแปลง PDF เป็น
  Word, Excel หรือ PowerPoint ในเครื่อง พร้อม OCR ของระบบสำหรับไฟล์สแกน
- **Markdown และ HTML ด้วย** ใช้แผง AI ตัวเดียวกันและส่งออกไปยัง Word ในเครื่อง
- **เขียนสคริปต์ได้** บรรทัดคำสั่ง `plotdocs`, สกิลสำหรับเอเจนต์ และเซิร์ฟเวอร์
  MCP นำทุกเอนจินมารับใช้ Claude Code, Claude Desktop, Codex, Cursor และ
  เอเจนต์อื่นๆ โดยยังคงทำงานในเครื่อง
- **ฟรี** สำหรับบุคคลทั่วไปและทีมเช่นเดียวกัน

## แบ็กเอนด์ AI

**ลงชื่อเข้าใช้ด้วย Soopus** แล้วไม่ต้องตั้งค่าอะไรเลย: การเรียกโมเดล
จะส่งผ่านพร็อกซีของ Soopus (ตระกูล Claude, GPT และ Gemini) และเอเจนต์
จะได้รับความสามารถค้นหาเว็บและภาพ สร้างภาพ และวิเคราะห์ภาพ/เสียง/วิดีโอ

**หรือใช้คีย์ของคุณเอง** เมนู Settings → AI มีให้เลือก Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral,
OpenRouter, Requesty และ OpenCode Zen/Go พร้อมช่องสำหรับ endpoint ที่รองรับ
OpenAI-compatible แบบกำหนดเอง (base URL + คีย์) รวมถึงเซิร์ฟเวอร์โมเดล
ในเครื่องด้วย การค้นหาและมีเดียมีผู้ให้บริการแยกตามความสามารถของตัวเอง
ภายใต้ **AI Media & Search**: Serper หรือ Tavily สำหรับการค้นหาเว็บ
และ OpenAI, Gemini, Doubao/Seedream, GLM, Grok, Qwen, MiniMax หรือ
endpoint ที่รองรับ OpenAI-compatible ใดๆ สำหรับการสร้างภาพและการวิเคราะห์
ภาพ/วิดีโอ

สวีททั้งชุดมาพร้อมธีมสว่าง มืด และตามระบบ ธีมจะเปลี่ยนแค่สิ่งที่แสดง
บนหน้าจอเท่านั้น: การส่งออก การพิมพ์ และไฟล์ที่บันทึกจะคงสีของเอกสาร
เดิมไว้เสมอ

<a id="command-line-and-agent-skill"></a>

## บรรทัดคำสั่งและสกิลสำหรับเอเจนต์

ทุกอย่างที่แอปทำกับไฟล์ได้ บรรทัดคำสั่ง `plotdocs` ก็ทำได้จากเทอร์มินัล:
ตรวจสอบ แปลง สร้าง อ่าน และแก้ไข Word, Excel, PowerPoint, PDF, Markdown
และ HTML บนเอนจินเดียวกันแบบ headless มันติดตั้งมาพร้อม Plot Docs
ไม่ต้องการรันไทม์ของตัวเอง และไม่เคยส่งเอกสารไปที่ใดเลย เมื่อจับคู่กับ
**สกิลสำหรับเอเจนต์** ที่รวมมาให้ มันเปลี่ยนเอเจนต์เขียนโค้ดให้เป็นผู้ทำงาน
เอกสารที่ผลิตไฟล์ Office จริง ไม่ใช่ของเทียบเคียงในรูป Markdown

**ใช้งานได้กับ:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode และ Windsurf ได้ทันทีโดยไม่ต้องตั้งค่าเพิ่ม รวมถึงเอเจนต์อื่นใดที่อ่านสกิลได้
และผ่าน [เซิร์ฟเวอร์ MCP](#mcp-server) ยังรองรับ Claude Desktop และไคลเอนต์ MCP ทุกตัว

### ติดตั้งสกิล

| วิธี                                   | สิ่งที่เกิดขึ้น                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **การตั้งค่า → การเชื่อมต่อ** ในแอป    | แสดงรายการเอเจนต์ที่พบในคอมพิวเตอร์เครื่องนี้ คลิกเดียวเขียนสกิลลงในแต่ละตัวที่คุณเลือก ปุ่ม **Update** จะปรากฏเมื่อรีลีสของ Plot Docs มาพร้อมสกิลเวอร์ชันใหม่กว่า |
| **ดาวน์โหลดเป็น zip** ในหน้าเดียวกัน   | โครงสร้างที่ claude.ai แอปเดสก์ท็อป Claude และผู้ช่วยอื่นๆ ยอมรับเป็นสกิลที่อัปโหลด                                                                                |
| `npx skills add plotxyz-ai/plot-docs` | ติดตั้งจาก repository นี้ลงในเอเจนต์ใดก็ได้ที่รองรับสกิล                                                                                                           |

จากนั้นเริ่มแชทใหม่แล้วขอเอกสารสักฉบับ สกิลจะสอนเอเจนต์ว่าเมื่อใดควรใช้
`plotdocs` วิธีอ่านไฟล์ก่อนแก้ไข และวิธีตรวจสอบงานของตัวเอง

### เริ่มต้นอย่างรวดเร็วจากเทอร์มินัล

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

ทุกคำสั่งพิมพ์สรุปหนึ่งบรรทัด หรือออบเจ็กต์ JSON เดียวเมื่อใช้ `--json`
การแก้ไขเป็นแบบอะตอมิก: op ที่ถูกปฏิเสธจะไม่แตะไฟล์เลยและส่งกลับพร้อม
ข้อความแนะนำวิธีแก้ `plotdocs help` แสดงรายการคำสั่งทั้งหมดในปัจจุบัน
เอกสารอ้างอิงฉบับเต็มอยู่ที่ [packages/cli/README.md](../../packages/cli/README.md)

### สิ่งที่เอเจนต์รันจริงๆ

เดคระบบสุริยะในเดโมด้านบนใช้พรอมป์เพียงครั้งเดียวใน Claude Code เบื้องหลังนั้น
เอเจนต์ทำตามเวิร์กโฟลว์เป็นขั้นตอนของสกิล และ CLI ตรวจสอบทุกขั้นตอน
ก่อนที่ขั้นตอนถัดไปจะเริ่ม:

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

ไม่มีการเรียกโมเดลเกิดขึ้นภายใน `plotdocs`: เอเจนต์เป็นฝ่ายคิด CLI
เป็นฝ่ายสร้างและตรวจสอบ และผลลัพธ์เปิดใน Plot Docs หรือ PowerPoint
เป็นไฟล์ `.pptx` ธรรมดา

<a id="mcp-server"></a>

### เซิร์ฟเวอร์ MCP

คำสั่งชุดเดียวกันนี้ใช้งานได้เป็นเครื่องมือ
[Model Context Protocol](https://modelcontextprotocol.io) เช่นกัน สำหรับ
ผู้ช่วยที่รันเทอร์มินัลไม่ได้ หรือที่คุณไม่อยากให้สิทธิ์เทอร์มินัล มีสองวิธี
ในการเชื่อมต่อ ทั้งสองแบบมาพร้อมโค้ดตัวอย่างที่คัดลอกใช้ได้ทันทีใน
**การตั้งค่า → การเชื่อมต่อ → MCP**:

| วิธี                               | รายละเอียด                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `plotdocs mcp`** (แนะนำ)    | เซิร์ฟเวอร์ stdio ที่ผู้ช่วยสั่งรันเอง โดยไม่ต้องเปิด Plot Docs ค้างไว้ มีเครื่องมือหนึ่งตัวต่อหนึ่งคำสั่ง (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) รวมถึงขั้นตอนสร้างเดคแบบเป็นขั้น `deck_start` → `deck_page` → `deck_build` → `deck_replace` ops, spec และ Markdown ส่งแบบ inline ทั้งหมด ไคลเอนต์ที่ไม่มีระบบไฟล์ก็ยังใช้งานได้ |
| **B · เซิร์ฟเวอร์ HTTP ในเครื่อง** | ทำงานอยู่ภายในแอป Plot Docs ที่ `http://127.0.0.1:3093/mcp` (Streamable HTTP รองรับ SSE แบบเก่าด้วย) เครื่องมือของมันขับเคลื่อนแท็บเอดิเตอร์ Word ที่มองเห็นได้: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session` คุณเฝ้าดูเอกสารค่อยๆ เป็นรูปเป็นร่างได้ ปิดอยู่โดยค่าเริ่มต้น เปิดใช้ได้ในแผงตั้งค่าเดียวกัน                                                                                                                                   |

```bash
# Claude Code
claude mcp add --transport stdio plotdocs -- plotdocs mcp
```

```jsonc
// Cursor, Claude Desktop หรือไคลเอนต์ MCP อื่นใด
{ "mcpServers": { "plotdocs": { "command": "plotdocs", "args": ["mcp"] } } }
```

`plotdocs` ที่นี่คือ CLI ตัวเดียวกับที่มาพร้อมแอป (บน macOS อยู่ที่
`/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs`; แผงตั้งค่า
จะแสดง path ที่แน่นอนของเครื่องคุณ) เซิร์ฟเวอร์นี้มีคำแนะนำเวิร์กโฟลว์ของ
ตัวเองและเปิดให้ใช้เอกสารอ้างอิงการทำงานเป็น resource `plotdocs://guide/*`
จึงไม่จำเป็นต้องใช้สกิลเลย สกิลกับเซิร์ฟเวอร์ MCP อยู่ร่วมกันได้ โดยผู้ช่วย
เป็นฝ่ายเลือกใช้ตัวใดตัวหนึ่ง ความสามารถบนคลาวด์ (`search`, `image`,
`media`) ยังคงผ่านผู้ให้บริการที่ตั้งค่าไว้ใน Plot Docs ส่วนที่เหลือทั้งหมด
ทำงานในเครื่อง และ `PLOTDOCS_ALLOWED_ROOTS` จำกัดทุกเครื่องมือให้อยู่ใน
โฟลเดอร์ที่คุณระบุเท่านั้น

เดคพลังงานหมุนเวียนในเดโมด้านบนคือสิ่งที่พรอมป์เดียวใน Claude Code ซึ่ง
เชื่อมต่อกับเซิร์ฟเวอร์ plotdocs MCP เพียงตัวเดียว มีหน้าตาเป็นอย่างไรใน
ระดับโปรโตคอล:

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

สามสิบแปดครั้งของการเรียก ประมาณสิบสามนาที และผู้ช่วยไม่แตะเทอร์มินัลเลยสักครั้ง: ข้อมูล ภาพถ่าย คู่มือ การตรวจสอบ และผลเรนเดอร์ทั้งหมดเดินทางมาในรูปผลลัพธ์ของเครื่องมือ MCP มีเพียง `search` และ `media` เท่านั้นที่ออกจากเครื่อง ไปยังผู้ให้บริการที่ตั้งค่าไว้ใน Plot Docs

<a id="download"></a>

## ดาวน์โหลด

| แพลตฟอร์ม                            | ความต้องการของระบบ                                    | ดาวน์โหลด                                                                                  |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [`.dmg` ล่าสุด (arm64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)          |
| **macOS** — Intel (x64)              | macOS 11+                                             | [`.dmg` ล่าสุด (x64)](https://github.com/plotxyz-ai/plot-docs/releases/latest)            |
| **Windows** (x64, พีซีทั่วไป)        | Windows 10+, Intel/AMD                                | [ตัวติดตั้ง `-x64.exe` ล่าสุด](https://github.com/plotxyz-ai/plot-docs/releases/latest)   |
| **Windows** บน Arm (ARM64)           | Windows 11 on Arm (Snapdragon X และรุ่นใกล้เคียง)     | [ตัวติดตั้ง `-arm64.exe` ล่าสุด](https://github.com/plotxyz-ai/plot-docs/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 ขึ้นไป)             | [`.deb` ล่าสุด](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [`.rpm` ล่าสุด](https://github.com/plotxyz-ai/plot-docs/releases/latest)                  |
| **Linux** — ดิสโทรอื่นๆ              | x86_64, glibc 2.34+, FUSE 2                           | [`.AppImage` ล่าสุด](https://github.com/plotxyz-ai/plot-docs/releases/latest)             |

บิลด์ทั้งหมดมาจาก `main` ตัวติดตั้ง macOS และ Windows ผ่านการลงนามแล้ว
เวอร์ชันเก่ากว่านี้ดูได้ที่หน้า [Releases](https://github.com/plotxyz-ai/plot-docs/releases)

<details>
<summary><b>การติดตั้งบน Linux</b></summary>

ไฟล์ deb ติดตั้งด้วย apt — จะดึงดีเพนเดนซีที่ต้องใช้และเพิ่ม Plot Docs
ลงในเมนูแอปพลิเคชันให้อัตโนมัติ:

```bash
sudo apt install ./plotdocs_<version>_amd64.deb
```

บน Fedora / ตระกูล RHEL / openSUSE ให้ติดตั้งไฟล์ rpm แทน:

```bash
sudo dnf install ./plotdocs-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./plotdocs-<version>.x86_64.rpm  # openSUSE
```

ไฟล์ AppImage รันได้ทันทีในตำแหน่งที่อยู่: ติดตั้งรันไทม์ FUSE 2
(`sudo apt install libfuse2`; บน Ubuntu 24.04 แพ็กเกจคือ `libfuse2t64`)
กำหนดสิทธิ์ให้ไฟล์รันได้ แล้วรัน:

```bash
chmod +x Plot Docs-<version>.AppImage
./Plot Docs-<version>.AppImage
```

</details>

## หลักการทำงาน

แอป Electron เจ็ดตัว — Docs, Sheets, Slides, PDF, Markdown, HTML และเชลล์
แบบแท็บ — ใช้เอนจินร่วมกันเป็นชุดแพ็กเกจ TypeScript แท้ๆ บวก sidecar Rust
สำหรับ `.xlsx` ไฟล์ต้นฉบับคือแหล่งข้อมูลจริงเสมอ: การแก้ไขจะถูกใช้เป็นแพตช์
เฉพาะจุด และทุกอย่างที่เอดิเตอร์ไม่ได้แตะจะคงเดิมทุกรอบการเปิด-บันทึก

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

ทัวร์แพ็กเกจแต่ละตัว (เอนจิน docx/pptx, `pdf2docx`, `html2docx`, แกนหลัก
ของเอเจนต์ และผู้ให้บริการ) อยู่ใน [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages)

## การพัฒนา

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

แอป sheets ยังต้องการ Rust toolchain สำหรับ xlsx sidecar เพิ่มเติม
(`cargo` ต้องอยู่ใน PATH); `npm run build -w @plotdocs/sheets` จะคอมไพล์
ให้อัตโนมัติ ดู [CONTRIBUTING.md](../../CONTRIBUTING.md) สำหรับการตรวจสอบ
ที่การเปลี่ยนแปลงทุกครั้งต้องผ่าน และวิธีที่ pull request จะถูกรวมเข้าโปรเจกต์

## คอมมูนิตี้

Plot Docs อยู่ในระหว่างการพัฒนาอย่างต่อเนื่อง และความคิดเห็นของคุณ
มีส่วนกำหนดทิศทางของมัน

- **รายงานบั๊กหรือขอฟีเจอร์ใหม่** ได้ที่
  [GitHub Issues](https://github.com/plotxyz-ai/plot-docs/issues)
- **เข้าร่วมกลุ่มแชทของ Plot Docs** ได้ที่
  [PlotCommunity](https://plotxyz.ai) เพื่อพูดคุยกับทีมงานและผู้ใช้คนอื่นๆ
- **ให้ดาว repo นี้** หาก Plot Docs มีประโยชน์กับคุณ — เป็นวิธีที่ดีที่สุด
  ในการสนับสนุนโปรเจกต์นี้

## คำถามที่พบบ่อย

<details>
<summary><b>Plot Docs ฟรีหรือไม่</b></summary>

ใช่ Plot Docs ฟรีและโอเพนซอร์สภายใต้สัญญาอนุญาต Apache-2.0 — ไม่มีช่วง
ทดลองใช้ ไม่มีระดับที่ต้องเสียเงินสำหรับตัวแอปเอง

</details>

<details>
<summary><b>Plot Docs เปิดไฟล์ Microsoft Word, Excel และ PowerPoint ได้หรือไม่</b></summary>

ได้ Plot Docs เปิดและบันทึกไฟล์ `.docx`, `.xlsx` และ `.pptx` แบบดั้งเดิม
การบันทึกคงบิตต่อบิต: ส่วนของไฟล์ที่คุณไม่ได้แตะจะถูกเขียนกลับเหมือนเดิม
ทุกไบต์ เอกสารจึงยังใช้งานได้ต่อใน Microsoft Office

</details>

<details>
<summary><b>Plot Docs ใช้งานแบบออฟไลน์ได้หรือไม่</b></summary>

การแก้ไขเอกสารทำงานในเครื่องทั้งหมด — ไฟล์ไม่ออกจากเครื่องของคุณเลย
เมื่อเปิด แก้ไข บันทึก หรือแปลง ฟีเจอร์ AI (เอเจนต์ การค้นหา เครื่องมือภาพ)
ต้องมีการเชื่อมต่อเครือข่าย โดยลงชื่อเข้าใช้ด้วย Soopus หรือใช้คีย์ API
โมเดลของคุณเอง

</details>

<details>
<summary><b>Plot Docs แก้ไขไฟล์ PDF ได้หรือไม่</b></summary>

ได้ — การแก้ไขข้อความและภาพใน PDF จริง ที่เขียน content stream ของหน้า
ใหม่โดยคงฟอนต์เดิมไว้ ไม่ใช่การแปะ annotation ทับ

</details>

<details>
<summary><b>Plot Docs แปลง PDF เป็น Word, Excel หรือ PowerPoint ได้หรือไม่</b></summary>

ได้ — ทำงานในเครื่องทั้งหมด: การดึงข้อมูลระดับตัวอักษรด้วย PDFium
ร่วมกับการวิเคราะห์เลย์เอาต์แบบตามเรขาคณิต ไม่ต้องใช้บริการคลาวด์
ไม่ต้องอัปโหลด หน้าที่สแกนมาก็รองรับด้วย: บน macOS และ Windows ระบบ OCR
จะอ่านให้ จึงแปลงเป็นข้อความที่แก้ไขได้ ไม่ใช่ภาพของหน้ากระดาษ

</details>

<details>
<summary><b>ใช้โมเดล AI หรือคีย์ API ของตัวเองได้หรือไม่</b></summary>

ได้ นอกจากการลงชื่อเข้าใช้ด้วย Soopus ที่ไม่ต้องใช้คีย์แล้ว Plot Docs
ยังรองรับการใช้คีย์ของคุณเองกับ Claude, OpenAI, Gemini, DeepSeek, Kimi,
GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty และ OpenCode Zen/Go
พร้อม endpoint ที่รองรับ OpenAI-compatible ใดๆ — รวมถึงเซิร์ฟเวอร์โมเดล
ในเครื่องด้วย การค้นหา การสร้างภาพ และการวิเคราะห์ภาพ/วิดีโอ ใช้คีย์
แยกของตัวเองภายใต้ Settings → AI Media & Search

</details>

<details>
<summary><b>Plot Docs แปลง HTML เป็น Word ได้หรือไม่</b></summary>

ได้ — Export as Word ในแอป HTML สร้าง `.docx` ที่แก้ไขได้แบบเนทิฟทั้งหมด
ในเครื่อง หน้าเว็บถูกเรนเดอร์ใน Chromium ที่มีในตัวและลดรูปลงเป็นโครงสร้าง
Word จริง: หัวเรื่อง พารากราฟ รายการ ตาราง การ์ด แถวข้อมูล KPI ฟิลด์ฟอร์ม
และพื้นหลังของหน้า มีเพียงองค์ประกอบภาพที่ไม่มีสิ่งเทียบเท่าใน Word
(กราฟ ไอคอน กล่องที่ตกแต่ง) เท่านั้นที่จะถูกฝังเป็นภาพ

</details>

<details>
<summary><b>สั่งงาน Plot Docs จาก Claude Code, Codex, Cursor หรือสคริปต์ได้หรือไม่</b></summary>

ได้ Plot Docs ติดตั้งบรรทัดคำสั่ง `plotdocs` ที่รันเอนจินเดียวกันแบบ headless:
ตรวจสอบ แปลง สร้าง อ่าน และแก้ไขเอกสารจากเทอร์มินัลหรือสคริปต์ พร้อมเอาต์พุต
`--json` สำหรับโปรแกรม สกิลสำหรับเอเจนต์ที่รวมมาให้สอน Claude Code, Codex,
Cursor, Gemini CLI, GitHub Copilot, OpenCode และ Windsurf ให้ใช้งานมัน
ติดตั้งได้จาก **การตั้งค่า → การเชื่อมต่อ** ดู
[บรรทัดคำสั่งและสกิลสำหรับเอเจนต์](#command-line-and-agent-skill)

</details>

<details>
<summary><b>Plot Docs เก็บข้อมูลอะไรบ้างหรือไม่</b></summary>

บิลด์ที่แพ็กเกจอย่างเป็นทางการส่งข้อมูลวิเคราะห์การใช้งานแบบจำกัดเป็นค่า
เริ่มต้น และคุณสามารถปิดการรายงานได้ทุกเมื่อที่ Settings → General ข้อมูล
วิเคราะห์จะไม่ส่งเนื้อหาเอกสาร ชื่อไฟล์ พาธไฟล์ ข้อมูลบัญชี หรือที่อยู่อีเมล
ดู [Plot Docs Privacy](../../PRIVACY.md) สำหรับรายละเอียดเหตุการณ์และข้อมูล
ทั้งหมดที่เปิดเผย

</details>

## ความปลอดภัย

ดู [SECURITY.md](../../SECURITY.md) สำหรับสถานะความปลอดภัยของโปรเซส
(การแซนด์บ็อกซ์ renderer, การตรวจสอบ IPC, การกั้นลิงก์ภายนอก) และโมเดล
ภัยคุกคามสำหรับเนื้อหาที่สร้างโดย AI

## คำขอบคุณ

Plot Docs จะไม่สามารถเกิดขึ้นได้หากไม่มีโครงการโอเพนซอร์สเหล่านี้:

- [Electron](https://www.electronjs.org/) — รันไทม์เดสก์ท็อปสำหรับทุกแอป
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — คอร์ของ UI
  สเปรดชีตที่ Sheets ต่อยอดมา
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, ฝังผ่าน
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) — เอนจิน
  content-stream ที่อยู่เบื้องหลังการแก้ไขข้อความและภาพ PDF ของจริง
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) และ
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — การเรนเดอร์ PDF
  และการประกอบเอกสาร
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  บล็อกเอดิเตอร์ใน Docs และ Markdown
- [CodeMirror](https://codemirror.net/) (MIT) — ซอร์สเอดิเตอร์ใน HTML
- [Konva](https://konvajs.org/) — การเรนเดอร์บนแคนวาสสำหรับ Slides และกราฟ
  ใน Sheets
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — มาตรวัดการ
  shaping ข้อความสำหรับสคริปต์ที่ซับซ้อน
- [calamine](https://github.com/tafia/calamine) และ
  [IronCalc](https://github.com/ironcalc/IronCalc) — เลเยอร์การอ่านและ
  การคำนวณของ xlsx sidecar ที่เขียนด้วย Rust
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — ตัวถอดรหัส
  MicroType Express สำหรับฟอนต์ PowerPoint ที่ฝังมา ซึ่งพอร์ตมาเป็น
  TypeScript
- [React](https://react.dev/) (MIT) — เลเยอร์ UI ของทุกแอป
- [Mermaid](https://mermaid.js.org/) (MIT) และ [KaTeX](https://katex.org/)
  (MIT) — แผนภาพและสมการคณิตศาสตร์ใน Markdown และ Docs
- [opentype.js](https://opentype.js.org/) (MIT) — การแยกวิเคราะห์ฟอนต์สำหรับ
  มาตรวัดและการค้นหา glyph
- [JSZip](https://stuk.github.io/jszip/) (MIT) และ
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — เลเยอร์คอนเทนเนอร์ OOXML และ XML
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — ชุดไอคอนทั่วทั้งริบบอน
- [electron-updater](https://www.electron.build/) (MIT) — การอัปเดตในแอป
- ฟอนต์ Liberation, Carlito, Caladea และ Noto CJK (OFL/Apache-2.0) —
  ฟอนต์เอกสารที่รวมมาให้

`npm run notices` จะสร้างสรุปสัญญาอนุญาตของบุคคลที่สามที่รวมมาให้ใหม่
(`tools/gen-third-party-notices.mjs`); ดีเพนเดนซีรันไทม์ทั้งหมดอยู่ภายใต้
MIT/Apache-2.0/BSD-3-Clause/OFL

## สัญญาอนุญาต

Plot Docs อยู่ภายใต้สัญญาอนุญาต [Apache License 2.0](../../LICENSE)
โดยมีข้อยกเว้นหนึ่งข้อ: ไดเรกทอรี `ee/` สงวนไว้สำหรับโมดูลระดับองค์กร
ในอนาคต และอยู่ภายใต้ [Plot Docs Enterprise License](../../ee/LICENSE)

ชื่อและโลโก้ของ Plot Docs และ Soopus เป็นเครื่องหมายการค้าของ
Mainfunc, Inc. สัญญาอนุญาต Apache-2.0 ไม่ได้ให้สิทธิ์ในการใช้เครื่องหมาย
เหล่านี้ (ดูข้อ 6) โปรเจกต์ที่ fork ไปควรใช้แบรนด์ของตัวเอง
