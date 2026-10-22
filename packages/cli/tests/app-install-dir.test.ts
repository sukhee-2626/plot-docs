import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { appBinaryForResources } from '../src/resources'

describe('appBinaryForResources', () => {
  it('finds the app in a custom Windows install directory', () => {
    expect(appBinaryForResources(join('D:\\Apps\\Plot Docs', 'resources'), 'win32')).toBe(
      join('D:\\Apps\\Plot Docs', 'Plot Docs.exe'),
    )
  })

  it('resolves the same binary for the default Windows install directory', () => {
    const localAppData = 'C:\\Users\\test\\AppData\\Local'
    const resources = join(localAppData, 'Programs', 'Plot Docs', 'resources')
    expect(appBinaryForResources(resources, 'win32')).toBe(
      join(localAppData, 'Programs', 'Plot Docs', 'Plot Docs.exe'),
    )
  })

  it('finds the app in a custom macOS bundle location', () => {
    expect(
      appBinaryForResources(join('/Volumes/Work/Plot Docs.app/Contents/Resources'), 'darwin'),
    ).toBe(join('/Volumes/Work/Plot Docs.app/Contents/MacOS/Plot Docs'))
  })

  it('finds the app in a custom Linux prefix', () => {
    expect(appBinaryForResources(join('/opt/plotdocs-custom/resources'), 'linux')).toBe(
      join('/opt/plotdocs-custom/plotdocs'),
    )
  })
})
