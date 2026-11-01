import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  userData: '',
  handlers: new Map<string, (...args: unknown[]) => void>(),
}))

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => (name === 'userData' ? state.userData : tmpdir()),
    on: (event: string, handler: (...args: unknown[]) => void) => {
      state.handlers.set(event, handler)
    },
  },
}))

import { installCrashDiagnostics, recordDiagnostic } from '../src/main/crash-log'

function lines(): Array<Record<string, unknown>> {
  return readFileSync(join(state.userData, 'diagnostics.log'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

describe('crash diagnostics', () => {
  beforeEach(() => {
    state.userData = mkdtempSync(join(tmpdir(), 'plotdocs-crash-log-'))
    state.handlers.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes renderer errors as bounded local JSON lines', () => {
    recordDiagnostic('renderer-error', {
      message: 'TypeError: boom',
      stack: 'at render',
      componentStack: 'at App',
      url: 'file:///renderer/index.html',
    })
    const [entry] = lines()
    expect(entry.kind).toBe('renderer-error')
    expect(entry.message).toBe('TypeError: boom')
    expect(entry.componentStack).toBe('at App')
    expect(typeof entry.at).toBe('string')
  })

  it('rotates the log at the size cap instead of growing forever', () => {
    const path = join(state.userData, 'diagnostics.log')
    writeFileSync(path, 'x'.repeat(2 * 1024 * 1024 + 1))
    recordDiagnostic('renderer-error', { message: 'after rotation' })
    expect(existsSync(`${path}.1`)).toBe(true)
    expect(readFileSync(path, 'utf8')).toContain('after rotation')
  })

  it('registers process-level observers without changing normal flow', () => {
    const on = vi.spyOn(process, 'on').mockImplementation(() => process)
    installCrashDiagnostics()
    expect(state.handlers.has('render-process-gone')).toBe(true)
    expect(state.handlers.has('child-process-gone')).toBe(true)
    expect(on).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    expect(on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
  })
})
