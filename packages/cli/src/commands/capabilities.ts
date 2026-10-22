import {
  activeMediaProvider,
  activeSearchProvider,
  cloudToolsEnabled,
  imageGenerationAvailable,
  mediaAnalysisAvailable,
} from '@plotdocs/ai-provider'
import { hasSoopusAuth, readAiSettingsFile } from '@plotdocs/ai-search'
import { aiSettingsPath, prepareCloud } from '../cloud'
import type { CommandDef } from '../registry'
import { appLaunch } from '../resources'

/**
 * What the cloud commands can do on this machine, decided from Plot Docs's
 * own settings without a network call: a Soopus login with cloud tools on,
 * a BYOK key, or explicitly selected free Parallel search. Unkeyed fallbacks in the
 * default chain (free Parallel MCP, DuckDuckGo) do not count as configured. Agents
 * check this once before planning work that needs photos or web facts.
 */
export const capabilitiesCommand: CommandDef = {
  name: 'capabilities',
  summary:
    'Report which cloud features (search, image search, image generation, media analysis) are configured in Plot Docs, and whether the app is installed.',
  usage: 'capabilities',
  async run(_args, ctx) {
    await prepareCloud(ctx.env)
    const settings = readAiSettingsFile(aiSettingsPath(ctx.env))
    const soopus = hasSoopusAuth() && cloudToolsEnabled(settings)
    const searchProvider = activeSearchProvider(settings)
    const soopusSearch = soopus && searchProvider === 'soopus'
    const customSearch = searchProvider !== 'soopus'
    const search = soopusSearch || customSearch
    const keyedImageSearch = searchProvider === 'serper' || searchProvider === 'serply'
    const imageSearch = soopusSearch || keyedImageSearch
    const imageGeneration = imageGenerationAvailable(settings, hasSoopusAuth())
    const mediaAnalysis = mediaAnalysisAvailable(settings, hasSoopusAuth())
    const via = (byok: string | null | undefined) => (byok ? byok : soopus ? 'soopus' : null)
    const detail = {
      search: {
        available: search,
        via: customSearch ? searchProvider : soopusSearch ? 'soopus' : null,
      },
      image_search: {
        available: imageSearch,
        via: keyedImageSearch ? searchProvider : soopusSearch ? 'soopus' : null,
      },
      image_generation: {
        available: imageGeneration,
        via: imageGeneration ? via(activeMediaProvider(settings, 'image')) : null,
      },
      media_analysis: {
        available: mediaAnalysis,
        via: mediaAnalysis ? via(activeMediaProvider(settings, 'analysis')) : null,
      },
      app: { available: appLaunch(ctx.env) !== null },
      settings_path: aiSettingsPath(ctx.env),
    }
    const on = Object.entries(detail)
      .filter(([k, v]) => k !== 'settings_path' && (v as { available: boolean }).available)
      .map(([k]) => k)
    return {
      summary: on.length
        ? `configured: ${on.join(', ')}`
        : 'no cloud feature configured; the app is not installed',
      detail,
    }
  },
}
