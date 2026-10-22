import { describe, it, expect, afterEach } from 'vitest'
import {
  soopusChildEnv,
  setSoopusProxyUrl,
  parseSoopusOutput,
  parseSoopusWebSearch,
  parseSoopusImageSearch,
  parseSoopusGeneratedImage,
  parseSoopusPastProjects,
  extractSoopusText,
  summarizeSoopusFailure,
} from '../src/soopus'

describe('parseSoopusOutput', () => {
  it('parses clean JSON', () => {
    expect(parseSoopusOutput('{"status":"ok"}')).toEqual({ status: 'ok' })
  })

  it('skips [INFO] noise lines before JSON', () => {
    const out = '[INFO] Calling /tools...\n[INFO] cache hit\n{"status":"ok","data":[1,2]}'
    expect(parseSoopusOutput(out)).toEqual({ status: 'ok', data: [1, 2] })
  })

  it('parses multi-line JSON after noise', () => {
    const out = '[INFO] x\n{\n "a": 1\n}'
    expect(parseSoopusOutput(out)).toEqual({ a: 1 })
  })

  it('skips trailing log lines after JSON', () => {
    const out = '{"status":"ok","data":[1,2]}\n[INFO] done in 120ms'
    expect(parseSoopusOutput(out)).toEqual({ status: 'ok', data: [1, 2] })
  })

  it('parses multi-line JSON surrounded by leading and trailing noise', () => {
    const out =
      '[INFO] Calling /tools...\n{\n "a": 1,\n "b": [1, 2]\n}\n[INFO] cache hit\n[INFO] done'
    expect(parseSoopusOutput(out)).toEqual({ a: 1, b: [1, 2] })
  })

  it('returns the root of a pretty-printed array followed by logs', () => {
    const out = '{\n  "items": [\n    { "id": 1 },\n    { "id": 2 }\n  ]\n}\n[INFO] done'
    expect(parseSoopusOutput(out)).toEqual({ items: [{ id: 1 }, { id: 2 }] })
  })

  it('throws when no JSON present', () => {
    expect(() => parseSoopusOutput('[INFO] nothing here')).toThrow()
  })

  it('recovers past a log line that only looks like an array opener', () => {
    expect(parseSoopusOutput('[INFO] progress {50%}\n{"status":"ok"}')).toEqual({ status: 'ok' })
  })

  it('takes the outer block, not the first inner one, of a large pretty payload', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => `    { "id": ${i}, "t": "row ${i}" },`)
    const out = [
      '[INFO] Calling /tools...',
      '[INFO] cache hit',
      '{',
      '  "status": "ok",',
      '  "data": [',
      ...rows.slice(0, -1),
      rows.at(-1)!.replace(/,$/, ''),
      '  ]',
      '}',
      '[INFO] done in 900ms',
    ].join('\n')
    const parsed = parseSoopusOutput(out) as { status: string; data: unknown[] }
    expect(parsed.status).toBe('ok')
    expect(parsed.data).toHaveLength(2000)
    expect(parsed.data[0]).toEqual({ id: 0, t: 'row 0' })
  })

  it('locates a large payload in linear time', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) => `  { "id": ${i} },`)
    const out = [
      '[INFO] starting',
      '{',
      '  "data": [',
      ...rows.slice(0, -1),
      rows.at(-1)!.replace(/,$/, ''),
      '  ]',
      '}',
      '[INFO] done',
    ].join('\n')
    const started = performance.now()
    const parsed = parseSoopusOutput(out) as { data: unknown[] }
    const elapsed = performance.now() - started
    expect(parsed.data).toHaveLength(20_000)
    // the previous nested slice-and-reparse scan needed minutes at this size
    expect(elapsed).toBeLessThan(5_000)
  })

  it('gives up on a hostile response in bounded time', () => {
    // Every line opens a block that never closes, so each candidate re-scans the
    // rest of the output: N lines of length L cost N x L. soopus output is
    // model-controlled and capped only by MAX_BUFFER, so the recovery scan has
    // to be bounded rather than quadratic.
    const out = Array.from(
      { length: 16_000 },
      (_, i) => `{"step":${i},"msg":"still rendering`,
    ).join('\n')
    const started = performance.now()
    expect(() => parseSoopusOutput(out)).toThrow(/No JSON found/)
    const elapsed = performance.now() - started
    // the unbounded scan needed ~25s at this size
    expect(elapsed).toBeLessThan(1_000)
  })

  it('still finds a payload buried behind unclosed log lines', () => {
    const out = [
      '{"msg":"still rendering',
      '{"msg":"still rendering',
      '{"status":"ok","data":{"n":7}}',
      '[INFO] done',
    ].join('\n')
    expect(parseSoopusOutput(out)).toEqual({ status: 'ok', data: { n: 7 } })
  })
})

describe('soopusChildEnv', () => {
  afterEach(() => setSoopusProxyUrl(''))

  it('sets ELECTRON_RUN_AS_NODE and no proxy vars when no proxy is known', () => {
    const env = soopusChildEnv({ PATH: '/bin' })
    expect(env.ELECTRON_RUN_AS_NODE).toBe('1')
    expect(env.NODE_USE_ENV_PROXY).toBeUndefined()
    expect(env.HTTPS_PROXY).toBeUndefined()
  })

  it('forwards the proxy registered by the main-process bootstrap', () => {
    setSoopusProxyUrl('http://127.0.0.1:7890')
    const env = soopusChildEnv({ PATH: '/bin' })
    expect(env.NODE_USE_ENV_PROXY).toBe('1')
    expect(env.HTTPS_PROXY).toBe('http://127.0.0.1:7890')
    expect(env.HTTP_PROXY).toBe('http://127.0.0.1:7890')
  })

  it('falls back to inherited proxy env vars (terminal launch)', () => {
    const env = soopusChildEnv({ https_proxy: 'http://10.0.0.1:8080' })
    expect(env.NODE_USE_ENV_PROXY).toBe('1')
    expect(env.HTTPS_PROXY).toBe('http://10.0.0.1:8080')
  })

  it('prefers the registered proxy over env vars', () => {
    setSoopusProxyUrl('http://127.0.0.1:7890')
    const env = soopusChildEnv({ HTTPS_PROXY: 'http://10.0.0.1:8080' })
    expect(env.HTTPS_PROXY).toBe('http://127.0.0.1:7890')
  })

  it('scrubs lowercase/ALL_PROXY variants so they cannot override the selection', () => {
    setSoopusProxyUrl('http://127.0.0.1:7890')
    const env = soopusChildEnv({
      https_proxy: 'socks5://127.0.0.1:1080',
      http_proxy: 'http://10.0.0.1:8080',
      all_proxy: 'socks5://127.0.0.1:1080',
    })
    expect(env.HTTPS_PROXY).toBe('http://127.0.0.1:7890')
    expect(env.https_proxy).toBeUndefined()
    expect(env.http_proxy).toBeUndefined()
    expect(env.all_proxy).toBeUndefined()
  })

  it('ignores SOCKS proxies (undici env proxy is http(s)-only)', () => {
    setSoopusProxyUrl('socks5://127.0.0.1:1080')
    const env = soopusChildEnv({ ALL_PROXY: 'socks5://127.0.0.1:1080' })
    expect(env.NODE_USE_ENV_PROXY).toBeUndefined()
    expect(env.HTTPS_PROXY).toBeUndefined()
  })
})

describe('parseSoopusWebSearch', () => {
  it('maps organic_results and respects maxResults', () => {
    const raw = {
      status: 'ok',
      data: {
        organic_results: [
          { title: 'A', link: 'https://a.com', snippet: 'sa' },
          { title: 'B', link: 'https://b.com', snippet: 'sb' },
          { title: 'C', link: 'https://c.com', snippet: 'sc' },
        ],
      },
    }
    const r = parseSoopusWebSearch(raw, 2)
    expect(r.results).toEqual([
      { title: 'A', url: 'https://a.com', snippet: 'sa' },
      { title: 'B', url: 'https://b.com', snippet: 'sb' },
    ])
    expect(r.answer).toBeUndefined()
  })

  it('tolerates missing data', () => {
    expect(parseSoopusWebSearch({ status: 'ok' }, 5).results).toEqual([])
  })

  it('preserves full urls instead of clipping them to the snippet cap', () => {
    const long = `https://a.com/${'x'.repeat(3000)}`
    const raw = { data: { organic_results: [{ title: 'A', link: long, snippet: 's' }] } }
    const r = parseSoopusWebSearch(raw, 5)
    expect(r.results[0]!.url).toBe(long)
    const huge = `https://a.com/${'x'.repeat(20_000)}`
    const r2 = parseSoopusWebSearch({ data: { organic_results: [{ link: huge }] } }, 5)
    expect(r2.results[0]!.url).toHaveLength(8_192)
  })

  it('clamps maxResults and truncates long fields', () => {
    const big = 'x'.repeat(5000)
    const raw = {
      data: { organic_results: [{ title: big, link: 'https://a.com', snippet: big }] },
    }
    const r = parseSoopusWebSearch(raw, 1e9)
    expect(r.results).toHaveLength(1)
    expect(r.results[0]!.snippet.length).toBeLessThanOrEqual(2000)
    expect(parseSoopusWebSearch(raw, NaN).results).toHaveLength(1)
  })
})

describe('parseSoopusImageSearch', () => {
  it('maps image entries with numeric size coercion', () => {
    const raw = {
      status: 'ok',
      data: [
        {
          image_url: 'https://sspark.plotxyz.ai/img1',
          title: 'T1',
          source: 'Site',
          link: 'https://site.com/page',
          width: '1000',
          height: '688',
        },
      ],
    }
    const images = parseSoopusImageSearch(raw, 8)
    expect(images).toEqual([
      {
        title: 'T1',
        imageUrl: 'https://sspark.plotxyz.ai/img1',
        sourceUrl: 'https://site.com/page',
        source: 'Site',
        width: 1000,
        height: 688,
      },
    ])
  })

  it('filters copyright hosts and entries without url', () => {
    const raw = {
      data: [
        { image_url: 'https://media.gettyimages.com/x.jpg', title: 'g' },
        { title: 'no-url' },
        { image_url: 'https://ok.com/a.jpg', title: 'ok' },
      ],
    }
    const images = parseSoopusImageSearch(raw, 8)
    expect(images.map((i) => i.title)).toEqual(['ok'])
  })

  it('clamps maxResults like the web parser', () => {
    const entries = Array.from({ length: 25 }, (_, i) => ({
      image_url: `https://ok.com/${i}.jpg`,
      title: `t${i}`,
    }))
    const raw = { data: entries }
    expect(parseSoopusImageSearch(raw, NaN)).toHaveLength(6)
    expect(parseSoopusImageSearch(raw, 1e9)).toHaveLength(20)
    expect(parseSoopusImageSearch(raw, 0)).toHaveLength(1)
    expect(parseSoopusImageSearch(raw, -3)).toHaveLength(1)
  })

  it('keeps benign images whose path or query merely mentions a stock host', () => {
    const raw = {
      data: [
        { image_url: 'https://cdn.example.com/shutterstock-review.png', title: 'review' },
        { image_url: 'https://img.example.com/a.jpg?ref=shutterstock', title: 'query' },
        { image_url: 'https://media.gettyimages.com/x.jpg', title: 'blocked' },
      ],
    }
    const images = parseSoopusImageSearch(raw, 8)
    expect(images.map((i) => i.title)).toEqual(['review', 'query'])
  })
})

describe('parseSoopusPastProjects', () => {
  // real `soopus projects --artifact_types slides` shape (trimmed)
  const raw = {
    version: 1,
    status: 'ok',
    message: 'success',
    data: {
      projects: [
        {
          project_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          type: 'slides_agent_git',
          title: 'Product launch trailer presentation',
          ctime: '2026-07-29T07:09:43.706212',
        },
        {
          project_id: '12345678-90ab-4cde-8f01-234567890abc',
          type: 'slides_agent_git',
          title: 'Team collaboration deck request',
          ctime: '2026-07-23T08:39:04.464484',
        },
      ],
      total: 222,
      offset: 0,
      has_more: true,
      returned: 2,
    },
    session_state: {
      past_projects: {
        projects: [
          {
            project_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            project_url: '/agents?id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            artifacts: [],
          },
        ],
      },
    },
  }

  it('maps projects, preferring session_state project_url and deriving the rest', () => {
    const page = parseSoopusPastProjects(raw)
    expect(page.total).toBe(222)
    expect(page.hasMore).toBe(true)
    expect(page.projects).toEqual([
      {
        projectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        type: 'slides_agent_git',
        title: 'Product launch trailer presentation',
        ctime: '2026-07-29T07:09:43.706212',
        projectUrl: '/agents?id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      },
      {
        projectId: '12345678-90ab-4cde-8f01-234567890abc',
        type: 'slides_agent_git',
        title: 'Team collaboration deck request',
        ctime: '2026-07-23T08:39:04.464484',
        projectUrl: '/agents?id=12345678-90ab-4cde-8f01-234567890abc',
      },
    ])
  })

  it('skips entries without project_id and tolerates missing data', () => {
    const page = parseSoopusPastProjects({
      status: 'ok',
      data: { projects: [{ title: 'no id' }], has_more: false },
    })
    expect(page.projects).toEqual([])
    expect(page.total).toBe(0)
    expect(page.hasMore).toBe(false)
  })

  it('tolerates a completely empty response', () => {
    expect(parseSoopusPastProjects({ status: 'ok' })).toEqual({
      projects: [],
      total: 0,
      hasMore: false,
    })
  })
})

describe('parseSoopusGeneratedImage', () => {
  it('prefers no-watermark url', () => {
    const raw = {
      data: {
        generated_images: [
          {
            image_urls: ['https://cdn/wm.png'],
            image_urls_nowatermark: ['https://cdn/clean.png'],
            task_id: 't1',
          },
        ],
      },
    }
    expect(parseSoopusGeneratedImage(raw)).toEqual({ url: 'https://cdn/clean.png', taskId: 't1' })
  })

  it('falls back to image_urls, throws on empty', () => {
    expect(
      parseSoopusGeneratedImage({
        data: { generated_images: [{ image_urls: ['https://cdn/a.png'] }] },
      }).url,
    ).toBe('https://cdn/a.png')
    expect(() => parseSoopusGeneratedImage({ data: { generated_images: [] } })).toThrow()
  })
})

describe('extractSoopusText', () => {
  it('returns string data directly', () => {
    expect(extractSoopusText({ data: 'hello' })).toBe('hello')
  })

  it('picks known text fields', () => {
    expect(extractSoopusText({ data: { analysis: 'deep' } })).toBe('deep')
    expect(extractSoopusText({ data: { transcript: 'words' } })).toBe('words')
  })

  it('stringifies unknown shapes', () => {
    expect(extractSoopusText({ data: { foo: 1 } })).toBe('{"foo":1}')
  })
})

describe('summarizeSoopusFailure', () => {
  // trimmed version of the gateway page Soopus serves for refused calls
  const HTML_403 = `<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Soopus</title>
  </head>
  <body>
    <div class="tt">Service unavailable. Please check your internet connection.</div>
    <form id="codeForm">
      <input type="text" id="codeInput" maxlength="8" />
      <button type="submit" class="submit-button">Submit</button>
    </form>
  </body>
  <script>function setCookie(event) { location.reload() }</script>
</html>`

  it('distills an HTML error page to its status and visible text', () => {
    const s = summarizeSoopusFailure(`HTTP 403: ${HTML_403}`)
    expect(s).toBe(
      'HTTP 403 (HTML error page): Service unavailable. Please check your internet connection.',
    )
    expect(s).not.toContain('<')
  })

  it('labels an HTML page that carries no status', () => {
    expect(summarizeSoopusFailure(HTML_403)).toBe(
      'an HTML error page: Service unavailable. Please check your internet connection.',
    )
  })

  it('keeps a short plain message as it is', () => {
    expect(summarizeSoopusFailure('HTTP 500: internal error')).toBe('HTTP 500: internal error')
    expect(summarizeSoopusFailure('deck_context must be an object')).toBe(
      'deck_context must be an object',
    )
  })

  it('keeps the [ERROR] lines, drops [INFO] chatter and crash noise', () => {
    const s = summarizeSoopusFailure(
      '[INFO] Uploading a.png...\n[INFO] Calling /file/upload_url...\n[ERROR] Failed to get upload URL: HTTP 403: Forbidden\nAssertion failed: !(handle->flags)',
    )
    expect(s).toBe('[ERROR] Failed to get upload URL: HTTP 403: Forbidden')
  })

  it('collapses multi-line plain text to one line', () => {
    expect(summarizeSoopusFailure('first line\nsecond line')).toBe('first line second line')
  })

  it('clips a long plain message', () => {
    const s = summarizeSoopusFailure('x'.repeat(400))
    expect(s.length).toBe(301)
    expect(s.endsWith('…')).toBe(true)
  })

  it('falls back on empty input and stringifies non-strings', () => {
    expect(summarizeSoopusFailure(undefined)).toBe('unknown error')
    expect(summarizeSoopusFailure(null, '')).toBe('')
    expect(summarizeSoopusFailure(404)).toBe('404')
  })

  it('never returns an empty string when the page has no readable text', () => {
    expect(summarizeSoopusFailure('HTTP 502: <html><body><script>x()</script></body></html>')).toBe(
      'HTTP 502 (HTML error page)',
    )
  })
})
