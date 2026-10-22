import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isPlotdocsLauncher, mcpSnippet, readMcpEntry, writeMcpEntry } from '../src/agent-mcp'
import { mcpLaunch, mcpLaunchFromLauncher, type McpLaunch } from '../src/mcp-launch'
import { tempDir } from './helpers'

const WIN_DIR = 'C:\\Users\\Jane Doe\\AppData\\Local\\Programs\\Plot Docs\\resources\\cli'
const WIN_APP: McpLaunch = {
  command: `${WIN_DIR}\\..\\..\\Plot Docs.exe`,
  args: [`${WIN_DIR}\\plotdocs.cjs`, 'mcp'],
  env: { ELECTRON_RUN_AS_NODE: '1' },
}

describe('mcp launch entry', () => {
  it('is the absolute launcher on macOS and Linux', () => {
    expect(
      mcpLaunchFromLauncher('/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs'),
    ).toEqual({
      command: '/Applications/Plot Docs.app/Contents/Resources/cli/plotdocs',
      args: ['mcp'],
    })
  })

  it('uses the absolute launcher while the linked dir is still off the PATH (plotdocs#1019)', () => {
    const launcherDir = '/Applications/Plot Docs.app/Contents/Resources/cli'
    expect(mcpLaunch({ status: 'present', launcherDir })).toEqual({
      command: 'plotdocs',
      args: ['mcp'],
    })
    expect(
      mcpLaunch({
        status: 'present',
        launcherDir,
        pathHint: 'export PATH="$HOME/.local/bin:$PATH"',
      }),
    ).toEqual({ command: `${launcherDir}/plotdocs`, args: ['mcp'] })
  })

  it('runs the packaged Windows app as Node on the bundle, exactly as the app snippet does', () => {
    const exists = (p: string) => p === `${WIN_DIR}\\..\\..\\Plot Docs.exe`
    const fromCli = mcpLaunchFromLauncher(`${WIN_DIR}\\plotdocs.cmd`, { exists })
    expect(fromCli).toEqual(WIN_APP)
    expect(fromCli).toEqual(mcpLaunch({ status: 'missing', launcherDir: WIN_DIR }))
    expect(fromCli).toEqual(mcpLaunch({ status: 'present', launcherDir: WIN_DIR }))
  })

  it('runs a Windows checkout on the system node with the built bundle', () => {
    const dir = 'D:\\src\\plotdocs\\packages\\cli\\bin'
    expect(mcpLaunchFromLauncher(`${dir}\\plotdocs`, { exists: () => false })).toEqual({
      command: 'node',
      args: [`${dir}\\..\\dist\\plotdocs.cjs`, 'mcp'],
    })
    expect(
      mcpLaunchFromLauncher('/mnt/src/packages/cli/bin/plotdocs', {
        platform: 'win32',
        exists: (p) => p.endsWith('/bin/plotdocs.cjs'),
      }),
    ).toEqual({ command: 'node', args: ['/mnt/src/packages/cli/bin/plotdocs.cjs', 'mcp'] })
  })

  it('recognises every launcher shape as ours', () => {
    expect(isPlotdocsLauncher('/opt/Plot Docs/resources/cli/plotdocs')).toBe(true)
    expect(isPlotdocsLauncher('C:\\Plot Docs\\resources\\cli\\plotdocs.cmd')).toBe(true)
    expect(isPlotdocsLauncher('C:\\Program Files\\Plot Docs\\Plot Docs.exe')).toBe(true)
    expect(isPlotdocsLauncher(WIN_APP.command, WIN_APP.args)).toBe(true)
    expect(
      isPlotdocsLauncher('node', ['C:\\src\\packages\\cli\\dist\\plotdocs.cjs', 'mcp']),
    ).toBe(true)
    expect(isPlotdocsLauncher('npx', ['-y', 'other-mcp'])).toBe(false)
    expect(isPlotdocsLauncher(null)).toBe(false)
  })

  it('carries env in every config format', () => {
    const home = tempDir()
    for (const d of ['.cursor', '.gemini', '.copilot', '.codex', 'opencode'])
      mkdirSync(join(home, d))
    const cursor = join(home, '.cursor', 'mcp.json')
    writeMcpEntry('cursor', cursor, WIN_APP)
    expect(JSON.parse(readFileSync(cursor, 'utf-8')).mcpServers.plotdocs).toEqual({
      type: 'stdio',
      ...WIN_APP,
    })
    const gemini = join(home, '.gemini', 'settings.json')
    writeMcpEntry('gemini', gemini, WIN_APP)
    expect(JSON.parse(readFileSync(gemini, 'utf-8')).mcpServers.plotdocs).toEqual(WIN_APP)
    const copilot = join(home, '.copilot', 'mcp-config.json')
    writeMcpEntry('copilot', copilot, WIN_APP)
    expect(JSON.parse(readFileSync(copilot, 'utf-8')).mcpServers.plotdocs).toEqual({
      type: 'local',
      ...WIN_APP,
      tools: ['*'],
    })
    const opencode = join(home, 'opencode', 'opencode.json')
    writeMcpEntry('opencode', opencode, WIN_APP)
    expect(JSON.parse(readFileSync(opencode, 'utf-8')).mcp.plotdocs).toEqual({
      type: 'local',
      command: [WIN_APP.command, ...WIN_APP.args],
      enabled: true,
      environment: WIN_APP.env,
    })
    const codex = join(home, '.codex', 'config.toml')
    writeFileSync(codex, '[mcp_servers.other]\ncommand = "npx"\n')
    writeMcpEntry('codex', codex, WIN_APP)
    expect(readFileSync(codex, 'utf-8')).toBe(
      '[mcp_servers.other]\ncommand = "npx"\n\n' +
        `[mcp_servers.plotdocs]\ncommand = ${JSON.stringify(WIN_APP.command)}\nargs = ${JSON.stringify(WIN_APP.args)}\n\n` +
        '[mcp_servers.plotdocs.env]\nELECTRON_RUN_AS_NODE = "1"\n',
    )
    for (const [id, file] of [
      ['cursor', cursor],
      ['gemini', gemini],
      ['copilot', copilot],
      ['opencode', opencode],
      ['codex', codex],
    ] as const) {
      expect(readMcpEntry(id, file, WIN_APP).status, id).toBe('registered')
      expect(
        readMcpEntry(id, file, { command: '/elsewhere/cli/plotdocs', args: ['mcp'] }).status,
        id,
      ).toBe('stale')
    }
    expect(mcpSnippet('codex', WIN_APP)).toContain('[mcp_servers.plotdocs.env]')
  })

  it('treats the app snippet entry (Plot Docs.exe on plotdocs.cjs) as ours, not occupied', () => {
    const home = tempDir()
    const file = join(home, 'mcp.json')
    writeFileSync(file, JSON.stringify({ mcpServers: { plotdocs: WIN_APP } }))
    const posix = { command: '/opt/Plot Docs/resources/cli/plotdocs', args: ['mcp'] }
    expect(readMcpEntry('cursor', file, posix)).toEqual({
      status: 'stale',
      command: WIN_APP.command,
    })
    writeFileSync(
      file,
      JSON.stringify({
        mcpServers: { plotdocs: { command: 'node', args: ['/src/dist/plotdocs.cjs', 'mcp'] } },
      }),
    )
    expect(readMcpEntry('cursor', file, posix).status).toBe('stale')
    const toml = join(home, 'config.toml')
    writeFileSync(
      toml,
      `[mcp_servers.plotdocs]\ncommand = ${JSON.stringify(WIN_APP.command)}\nargs = ${JSON.stringify(WIN_APP.args)}\n[mcp_servers.plotdocs.env]\nELECTRON_RUN_AS_NODE = "1"\n`,
    )
    expect(readMcpEntry('codex', toml, posix).status).toBe('stale')
    expect(readMcpEntry('codex', toml, WIN_APP).status).toBe('registered')
  })
})
