import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/soopus', () => ({
  soopusGenerateImage: vi.fn(),
  soopusAnalyzeMedia: vi.fn(),
  hasSoopusAuth: vi.fn(() => true),
}))

import { generateImageTool, analyzeMediaTool, SOOPUS_RMBG_MODEL } from '../src/media-tools'
import { soopusGenerateImage, soopusAnalyzeMedia } from '../src/soopus'

const soopusGen = vi.mocked(soopusGenerateImage)
const soopusAnalyze = vi.mocked(soopusAnalyzeMedia)
// nonexistent settings file → defaults: no BYOK media provider, cloud tools on → Soopus route
const SETTINGS = '/nonexistent/ai-settings.json'

beforeEach(() => {
  soopusGen.mockReset()
  soopusAnalyze.mockReset()
})

describe('generateImageTool transparentBackground (Soopus route)', () => {
  it('chains a fal-bria-rmbg pass over the generated image and returns the stripped URL', async () => {
    soopusGen
      .mockResolvedValueOnce({ url: 'https://cdn/x/opaque.png', taskId: '1' })
      .mockResolvedValueOnce({ url: 'https://cdn/x/cutout.png', taskId: '2' })
    const r = await generateImageTool(SETTINGS, {
      prompt: 'red podcast icon',
      transparentBackground: true,
    })
    expect(r).toEqual({ url: 'https://cdn/x/cutout.png' })
    expect(soopusGen).toHaveBeenCalledTimes(2)
    expect(soopusGen.mock.calls[1]![0]).toMatchObject({
      model: SOOPUS_RMBG_MODEL,
      referenceImageUrls: ['https://cdn/x/opaque.png'],
    })
  })

  it('without the flag generation stays a single pass', async () => {
    soopusGen.mockResolvedValueOnce({ url: 'https://cdn/x/opaque.png', taskId: '1' })
    const r = await generateImageTool(SETTINGS, { prompt: 'red podcast icon' })
    expect(r).toEqual({ url: 'https://cdn/x/opaque.png' })
    expect(soopusGen).toHaveBeenCalledTimes(1)
  })

  it('does not chain when the caller already runs the background-removal model', async () => {
    soopusGen.mockResolvedValueOnce({ url: 'https://cdn/x/cutout.png', taskId: '1' })
    const r = await generateImageTool(SETTINGS, {
      prompt: 'remove background',
      model: SOOPUS_RMBG_MODEL,
      referenceImageUrls: ['https://cdn/x/src.png'],
      transparentBackground: true,
    })
    expect(r).toEqual({ url: 'https://cdn/x/cutout.png' })
    expect(soopusGen).toHaveBeenCalledTimes(1)
  })

  it('falls back to the opaque image when the strip pass fails', async () => {
    soopusGen
      .mockResolvedValueOnce({ url: 'https://cdn/x/opaque.png', taskId: '1' })
      .mockRejectedValueOnce(new Error('rmbg down'))
    const r = await generateImageTool(SETTINGS, {
      prompt: 'red podcast icon',
      transparentBackground: true,
    })
    expect(r).toEqual({ url: 'https://cdn/x/opaque.png' })
  })

  it('a generation failure still surfaces as an error (no half-run chain)', async () => {
    soopusGen.mockRejectedValueOnce(new Error('quota exceeded'))
    const r = await generateImageTool(SETTINGS, {
      prompt: 'red podcast icon',
      transparentBackground: true,
    })
    expect(r).toEqual({ error: 'quota exceeded' })
    expect(soopusGen).toHaveBeenCalledTimes(1)
  })
})

describe('generateImageTool reference budget (Soopus route)', () => {
  it('rejects too many reference images with the BYOK wording, before calling the CLI', async () => {
    soopusGen.mockResolvedValue({ url: 'https://cdn/x/out.png', taskId: '1' })
    const referenceImageUrls = Array.from({ length: 13 }, (_, i) => `https://cdn/x/${i}.png`)
    const r = await generateImageTool(SETTINGS, { prompt: 'red podcast icon', referenceImageUrls })
    expect(r).toEqual({
      error: 'Too many media items in one request (13, limit 12); analyze them in smaller batches',
    })
    expect(soopusGen).not.toHaveBeenCalled()
  })

  it('still passes a reference count within the budget to the CLI', async () => {
    soopusGen.mockResolvedValueOnce({ url: 'https://cdn/x/out.png', taskId: '1' })
    const referenceImageUrls = Array.from({ length: 12 }, (_, i) => `https://cdn/x/${i}.png`)
    const r = await generateImageTool(SETTINGS, { prompt: 'red podcast icon', referenceImageUrls })
    expect(r).toEqual({ url: 'https://cdn/x/out.png' })
    expect(soopusGen).toHaveBeenCalledTimes(1)
  })
})

describe('analyzeMediaTool media budget (Soopus route)', () => {
  it('rejects too many media URLs with the BYOK wording, before calling the CLI', async () => {
    soopusAnalyze.mockResolvedValueOnce('done')
    const mediaUrls = Array.from({ length: 13 }, (_, i) => `https://cdn/x/${i}.png`)
    const r = await analyzeMediaTool(SETTINGS, { mediaUrls, requirements: 'describe these' })
    expect(r).toEqual({
      error: 'Too many media items in one request (13, limit 12); analyze them in smaller batches',
    })
    expect(soopusAnalyze).not.toHaveBeenCalled()
  })
})
