/**
 * Regenerates the Plot Docs app icons from build/icon-source.svg.
 *
 * The landing page and the shell both ship the same mark; keeping one SVG as
 * the source of truth means a logo change cannot leave a stale Explorer icon
 * behind. Rasterization uses Playwright's Chrome so the repo needs no native
 * image toolchain on Windows.
 *
 *   node tools/gen-app-icon.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'apps/shell/build/icon-source.svg')
const build = join(root, 'apps/shell/build')
const linuxDir = join(build, 'icons')
const svg = readFileSync(source)
const dataUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`

const WIN_SIZES = [16, 24, 32, 48, 64, 128, 256]
const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]
const ICNS = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
]

function ico(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = header.length + dir.length
  entries.forEach(({ size, png }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2)
    dir.writeUInt8(0, o + 3)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(png.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += png.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)])
}

/** ICNS is a simple chunk container; PNG entries are supported by macOS 10.7+. */
function icns(entries) {
  const chunks = entries.map(({ type, png }) => {
    const head = Buffer.alloc(8)
    head.write(type, 0, 4, 'ascii')
    head.writeUInt32BE(png.length + 8, 4)
    return Buffer.concat([head, png])
  })
  const head = Buffer.alloc(8)
  head.write('icns', 0, 4, 'ascii')
  head.writeUInt32BE(8 + chunks.reduce((n, c) => n + c.length, 0), 4)
  return Buffer.concat([head, ...chunks])
}

async function render(browser, canvas, content = canvas) {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: canvas, height: canvas },
  })
  await page.setContent(
    `<body style="margin:0;background:transparent"><div style="width:${canvas}px;height:${canvas}px;display:flex;align-items:center;justify-content:center">` +
      `<img src="${dataUrl}" style="width:${content}px;height:${content}px" /></div></body>`,
  )
  try {
    return await page.screenshot({ omitBackground: true })
  } finally {
    await page.close()
  }
}

mkdirSync(linuxDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const windows = []
  for (const size of WIN_SIZES) windows.push({ size, png: await render(browser, size) })
  writeFileSync(join(build, 'icon.ico'), ico(windows))

  for (const size of LINUX_SIZES) {
    writeFileSync(join(linuxDir, `${size}x${size}.png`), await render(browser, size))
  }

  writeFileSync(join(build, 'icon.png'), await render(browser, 512))
  // macOS grid: 824/1024 content inside a 1024 canvas.
  writeFileSync(join(build, 'icon-mac.png'), await render(browser, 1024, 824))

  const macEntries = []
  for (const [type, size] of ICNS) {
    macEntries.push({ type, png: await render(browser, size) })
  }
  writeFileSync(join(build, 'icon.icns'), icns(macEntries))
  console.log('generated icon.ico, icon.icns, icon.png, icon-mac.png and build/icons/*.png')
} finally {
  await browser.close()
}
