import { readFileSync, writeFileSync } from 'node:fs'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import JSZip from 'jszip'

/** Read one OOXML part without relying on the host having an `unzip` binary. */
export function unzipText(path: string, entry: string): string {
  const files = unzipSync(readFileSync(path))
  const file = files[entry]
  if (!file) throw new Error(`zip entry not found: ${entry} in ${path}`)
  return strFromU8(file)
}

/** Newline-separated entry listing, matching the shape tests used from `unzip -l`. */
export function unzipList(path: string): string {
  return Object.keys(unzipSync(readFileSync(path))).join('\n')
}

/** Add or replace one text entry in an existing zip without host `zip`/`mkdir`. */
export function addZipEntry(path: string, entry: string, content: string): void {
  const files = unzipSync(readFileSync(path))
  files[entry] = strToU8(content)
  writeFileSync(path, zipSync(files))
}

/** Recursively walk a directory and add every file to a JSZip, then write the zip to `outPath`. */
export async function createZipFromDirectory(srcDir: string, outPath: string): Promise<void> {
  const zip = new JSZip()
  const walk = (dir: string) => {
    const entries = require('node:fs').readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = require('node:path').join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath) // recurse into sub‑directory
      } else {
        const data = require('node:fs').readFileSync(fullPath)
        const relPath = require('node:path').relative(srcDir, fullPath)
        zip.file(relPath, data)
      }
    }
  }
  walk(srcDir)
  const content = await zip.generateAsync({ type: 'uint8array' })
  writeFileSync(outPath, content)
}

/** Convenience: create a zip from `srcDir` into `outPath` (overwrites `outPath`). */
export async function buildZipFromFolder(srcDir: string, outPath: string): Promise<void> {
  await createZipFromDirectory(srcDir, outPath)
}