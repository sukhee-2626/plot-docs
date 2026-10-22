/**
 * ai:web-search / ai:image-search for the editors' main processes: reads
 * ai-settings.json live and turns the search provider choice into
 * SearchOptions — Soopus keeps the historic chain (soopus when signed in and
 * cloud tools are on, then env keys, then free Parallel MCP, then DuckDuckGo); a
 * selected custom provider runs first and skips soopus.
 */

import {
  activeSearchProvider,
  cloudToolsEnabled,
  type AiSearchProviderId,
  type AiSettings,
} from '@plotdocs/ai-provider'
import { imageSearch, webSearch, type SearchOptions } from './index'
import { readAiSettingsFile } from './media-tools'

export function searchOptionsFromSettings(settings: AiSettings): SearchOptions {
  const provider = activeSearchProvider(settings)
  if (provider === 'soopus') return { useSoopus: cloudToolsEnabled(settings) }
  const key = settings.search!.providers?.[provider]?.apiKey?.trim() ?? ''
  if (provider === 'parallel') return { useSoopus: false, parallelKey: key, prefer: 'parallel' }
  if (provider === 'serply') return { useSoopus: false, serplyKey: key, prefer: 'serply' }
  if (provider === 'exa') return { useSoopus: false, exaKey: key, prefer: 'exa' }
  if (provider === 'firecrawl') return { useSoopus: false, firecrawlKey: key, prefer: 'firecrawl' }
  return provider === 'tavily'
    ? { useSoopus: false, tavilyKey: key, prefer: 'tavily' }
    : { useSoopus: false, serperKey: key }
}

export function webSearchTool(settingsPath: string, query: string, maxResults = 6) {
  return webSearch(query, maxResults, searchOptionsFromSettings(readAiSettingsFile(settingsPath)))
}

export function imageSearchTool(settingsPath: string, query: string, maxResults = 8) {
  return imageSearch(query, maxResults, searchOptionsFromSettings(readAiSettingsFile(settingsPath)))
}

/** settings-UI test: the selected backend (keyed or free) must answer one minimal query. */
export async function testSearchProvider(
  provider: AiSearchProviderId,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'soopus') return { ok: true }
  apiKey = apiKey.trim()
  if (!apiKey && provider !== 'parallel') return { ok: false, error: 'API key is empty' }
  const options: SearchOptions = {
    useSoopus: false,
    serperKey: provider === 'serper' ? apiKey : '',
    serplyKey: provider === 'serply' ? apiKey : '',
    tavilyKey: provider === 'tavily' ? apiKey : '',
    parallelKey: provider === 'parallel' ? apiKey : '',
    exaKey: provider === 'exa' ? apiKey : '',
    firecrawlKey: provider === 'firecrawl' ? apiKey : '',
    prefer: provider,
  }
  const r = await webSearch('Plot Docs', 1, options)
  if (r.method === provider) return { ok: true }
  return {
    ok: false,
    error:
      r.method === 'error'
        ? (r.error ?? 'search failed')
        : `${provider} did not answer (service unavailable, key rejected or quota exhausted); fell back to ${r.method}`,
  }
}
