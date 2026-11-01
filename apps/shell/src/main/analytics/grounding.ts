/**
 * Shared guards for model-written explanations.
 *
 * The model may describe evidence, but it may not introduce data-scale
 * numbers that were not present in the evidence it was given.
 */

interface NumberToken {
  value: number
  percent: boolean
  decimals: number
}

function parseNumberToken(token: string): NumberToken | null {
  const percent = token.trim().endsWith('%')
  const raw = token.replace(/[%,]/g, '').replace(/^\+/, '')
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const decimals = raw.includes('.') ? (raw.split('.')[1] ?? '').length : 0
  return { value, percent, decimals }
}

function numberTokens(value: string): NumberToken[] {
  const matches = value.match(/(?<![\w.])-?\d[\d,]*(?:\.\d+)?%?/g) ?? []
  return matches
    .map(parseNumberToken)
    .filter((token): token is NumberToken => token !== null)
}

function grounded(token: NumberToken, allowed: NumberToken[]): boolean {
  // Small whole numbers are usually structural ("3 insights", "top 10") and
  // are not treated as data claims. Percentages, decimals and values >= 100
  // must exist in the evidence.
  if (!token.percent && token.decimals === 0 && Math.abs(token.value) < 100) return true
  const candidates = allowed.filter((entry) => entry.percent === token.percent)
  if (candidates.some((entry) => entry.value === token.value)) return true
  if (token.decimals > 0) {
    // Allow harmless rounding such as 0.84 for an R² of 0.843.
    const tolerance = 0.5 * 10 ** -token.decimals + 1e-9
    return candidates.some((entry) => Math.abs(entry.value - token.value) <= tolerance)
  }
  return false
}

/** Return data-scale numbers in `values` that do not appear in `evidence`. */
export function ungroundedNumbers(values: string[], evidence: string): string[] {
  const allowed = numberTokens(evidence)
  const ungrounded: string[] = []
  for (const value of values) {
    for (const token of numberTokens(value)) {
      if (!grounded(token, allowed)) {
        const rendered = `${token.value}${token.percent ? '%' : ''}`
        if (!ungrounded.includes(rendered)) ungrounded.push(rendered)
      }
    }
  }
  return ungrounded
}

export async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`The AI reading timed out after ${Math.round(milliseconds / 1000)} seconds.`),
            ),
          milliseconds,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
