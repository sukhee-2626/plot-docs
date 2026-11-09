import { readFileSync, writeFileSync } from 'node:fs'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

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
