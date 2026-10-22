import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  PAGE_MARK,
  TOTAL_PAGES_MARK,
  type HeaderFooter,
  type HfParagraph,
  type Run,
  type SectionSettings,
  type ThemeColors,
  type ThemeFonts,
} from '@plotdocs/docx-engine'
import type { HfAction } from './ribbon-hf-tab'

/**
 * Word-style gallery of page-number treatments and full header/footer layouts.
 *
 * Every preset is expressed as native rich header/footer paragraphs, so the
 * PAGE and NUMPAGES fields stay live when the document is saved as DOCX (no
 * flattened "page 12" text). The gallery is a portal to <body>, outside the
 * ribbon's overflow clipping.
 */

export type PageDesignerTab = 'numbers' | 'layouts'
type Target = 'header' | 'footer'
type DesignAlign = 'left' | 'center' | 'right'
type DesignAlignMode = DesignAlign | 'auto' | 'inside' | 'outside'
type AppliedScope = 'document' | 'section'
type DesignScale = 'compact' | 'standard' | 'large'
type Numeral = 'keep' | 'decimal' | 'upperRoman' | 'lowerRoman' | 'upperLetter' | 'lowerLetter' | 'numberInDash'

interface DesignOptions {
  accent: string
  font: string
  scale: DesignScale
  showTotal: boolean
  label: string
  target: Target
  align: DesignAlignMode
  numeral: Numeral
  scope: AppliedScope
  startAt: string
  hideOnCover: boolean
}

type DesignDefaults = Partial<
  Pick<DesignOptions, 'accent' | 'font' | 'numeral' | 'target' | 'align' | 'scale' | 'showTotal'>
>

interface DesignBase {
  id: string
  name: string
  description: string
  category: string
  defaults?: DesignDefaults
  samplePage?: string
  sampleTotal?: string
  custom?: boolean
  baseId?: string
}

interface PageNumberDesign extends DesignBase {
  build: (o: DesignOptions) => HeaderFooter
}

interface LayoutDesign extends DesignBase {
  build: (o: DesignOptions) => { header: HeaderFooter; footer: HeaderFooter }
}

interface CustomDesign {
  id: string
  name: string
  description: string
  type: PageDesignerTab
  baseId: string
  defaults: DesignDefaults
  createdAt: number
}

const FAVOURITES_KEY = 'plotdocs.pageDesigner.favourites.v1'
const RECENTS_KEY = 'plotdocs.pageDesigner.recents.v1'
const CUSTOM_KEY = 'plotdocs.pageDesigner.custom.v1'

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be disabled; the studio still works for this session */
  }
}

const SIZES: Record<DesignScale, number> = {
  compact: 16,
  standard: 18,
  large: 22,
}

const FONTS = [
  { value: 'Segoe UI', label: 'Modern sans' },
  { value: 'Georgia', label: 'Editorial serif' },
  { value: 'Consolas', label: 'Technical mono' },
  { value: 'Arial', label: 'Swiss sans' },
  { value: 'Times New Roman', label: 'Classic serif' },
  { value: 'Calibri', label: 'Humanist sans' },
]

const ACCENTS = [
  { value: '6D5EF5', label: 'Violet' },
  { value: '111827', label: 'Ink' },
  { value: 'B88746', label: 'Gold' },
  { value: '2563EB', label: 'Blue' },
  { value: '0F9D8A', label: 'Teal' },
  { value: 'DB2777', label: 'Rose' },
  { value: 'B91C1C', label: 'Crimson' },
  { value: '475569', label: 'Slate' },
]

const NUMERALS: Array<{ value: Numeral; label: string }> = [
  { value: 'keep', label: 'Keep current' },
  { value: 'decimal', label: '1, 2, 3' },
  { value: 'upperRoman', label: 'I, II, III' },
  { value: 'lowerRoman', label: 'i, ii, iii' },
  { value: 'upperLetter', label: 'A, B, C' },
  { value: 'lowerLetter', label: 'a, b, c' },
  { value: 'numberInDash', label: '– 1 –' },
]

const DEFAULT_SAMPLE_PAGE = '12'
const DEFAULT_SAMPLE_TOTAL = '24'
const PAGE_WIDTH_TWIPS = 9360

function sizeOf(o: DesignOptions): number {
  return SIZES[o.scale]
}

function run(text: string, o: DesignOptions, style: Partial<Run> = {}): Run {
  return {
    ...style,
    text,
    font: style.font ?? o.font,
    sizeHalfPoints: style.sizeHalfPoints ?? sizeOf(o),
  }
}

function page(o: DesignOptions, style: Partial<Run> = {}): Run {
  return run(PAGE_MARK, o, style)
}

function total(o: DesignOptions, style: Partial<Run> = {}): Run {
  return run(TOTAL_PAGES_MARK, o, style)
}

function ofTotal(o: DesignOptions, style: Partial<Run> = {}): Run[] {
  return o.showTotal ? [run(' / ', o, style), total(o, style)] : []
}

function withOfTotal(o: DesignOptions, style: Partial<Run> = {}): Run[] {
  return o.showTotal
    ? [run(' of ', o, style), total(o, style)]
    : []
}

function paragraph(
  align: DesignAlign,
  runs: Run[],
  extra: Partial<HfParagraph> = {},
): HfParagraph {
  return {
    align,
    runs,
    spaceBefore: 0,
    spaceAfter: 0,
    lineSpacing: 1,
    ...extra,
  }
}

/** dominant ink for a filled accent chip */
function inkFor(hex: string): string {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return 'FFFFFF'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.62 ? '111827' : 'FFFFFF'
}

function hfFrom(paras: HfParagraph[]): HeaderFooter {
  const text = paras.map((p) => p.runs.map((r) => r.text).join('')).join('')
  return {
    text,
    pageNumber: text.includes(PAGE_MARK),
    paras,
  }
}

function alignFor(o: DesignOptions, fallback: DesignAlign): DesignAlign {
  if (o.align === 'auto') return fallback
  if (o.align === 'inside') return 'left'
  if (o.align === 'outside') return 'right'
  return o.align
}

function mirroredOptions(o: DesignOptions): DesignOptions {
  return {
    ...o,
    align: o.align === 'inside' ? 'outside' : o.align === 'outside' ? 'inside' : o.align,
  }
}

/** numeric preview for Roman / alpha formats, so the sample matches the chosen scheme */
function formatSample(value: number, numeral: Numeral): string {
  switch (numeral) {
    case 'upperRoman':
    case 'lowerRoman': {
      const table: Array<[number, string]> = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
        [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
      ]
      let n = Math.max(1, value)
      let out = ''
      for (const [amount, glyph] of table) {
        while (n >= amount) {
          out += glyph
          n -= amount
        }
      }
      return numeral === 'lowerRoman' ? out.toLowerCase() : out
    }
    case 'upperLetter':
    case 'lowerLetter': {
      const n = Math.max(1, value)
      const letter = String.fromCharCode(64 + ((n - 1) % 26) + 1)
      const out = letter.repeat(Math.ceil(n / 26))
      return numeral === 'lowerLetter' ? out.toLowerCase() : out
    }
    case 'numberInDash':
      return `– ${value} –`
    default:
      return String(value)
  }
}

function labelText(o: DesignOptions, fallback = ''): string {
  return o.label.trim() || fallback
}

const BORDER = { color: 'CBD5E1', szPt: 0.5 } as const

/* ------------------------------------------------------------------ */
/* Page-number presets                                                 */
/* ------------------------------------------------------------------ */

const PAGE_NUMBER_DESIGNS: PageNumberDesign[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Quiet running label with an accent folio.',
    category: 'Minimal',
    build: (o) => {
      const c = o.accent
      const label = labelText(o)
      const runs: Run[] = []
      if (label) {
        runs.push(
          run(label, o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 28,
            sizeHalfPoints: Math.max(14, sizeOf(o) - 4),
          }),
          run('   ·   ', o, { color: 'CBD5E1' }),
        )
      }
      runs.push(page(o, { bold: true, color: c, sizeHalfPoints: sizeOf(o) + 2 }))
      runs.push(...ofTotal(o, { color: '94A3B8' }))
      return hfFrom([paragraph(alignFor(o, 'center'), runs)])
    },
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'Charcoal band with a luminous folio.',
    category: 'Bold',
    defaults: { accent: 'A78BFA' },
    build: (o) => {
      const ink = 'F8FAFC'
      const runs: Run[] = [
        run('PAGE', o, {
          color: '94A3B8',
          caps: 'all',
          charSpacingTwips: 50,
          sizeHalfPoints: Math.max(13, sizeOf(o) - 5),
        }),
        run('  ', o, { color: ink }),
        page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 10 }),
      ]
      if (o.showTotal) {
        runs.push(
          run('  /  ', o, { color: '64748B', sizeHalfPoints: sizeOf(o) }),
          total(o, { color: 'CBD5E1' }),
        )
      }
      return hfFrom([
        paragraph(alignFor(o, 'center'), runs, {
          shadingFill: '0F172A',
          spaceBefore: 70,
          spaceAfter: 70,
        }),
      ])
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-style rule with the folio set to the right.',
    category: 'Classic',
    build: (o) => {
      const label = labelText(o)
      const runs: Run[] = []
      if (label) {
        runs.push(
          run(label, o, {
            caps: 'all',
            bold: true,
            color: '334155',
            charSpacingTwips: 24,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
        )
      }
      runs.push(run('\t', o, { color: '000000' }))
      runs.push(page(o, { bold: true, color: o.accent }))
      runs.push(...ofTotal(o, { color: '64748B' }))
      return hfFrom([
        paragraph(alignFor(o, 'left'), runs, {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: o.accent, szPt: 0.75 } },
          spaceAfter: 20,
        }),
      ])
    },
  },
  {
    id: 'progress',
    name: 'Progress Bar',
    description: 'A bold rule doubles as a progress bar under the folio.',
    category: 'Modern',
    build: (o) => {
      const label = labelText(o, 'DOCUMENT')
      const runs: Run[] = [
        run(label, o, {
          caps: 'all',
          color: '64748B',
          charSpacingTwips: 20,
          sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
        }),
        run('\t', o, { color: '000000' }),
        page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
        ...(o.showTotal
          ? [run(' / ', o, { color: '94A3B8' }), total(o, { color: '64748B' })]
          : []),
      ]
      return hfFrom([
        paragraph(alignFor(o, 'left'), runs, {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'bt',
          borderLines: {
            t: { color: 'E2E8F0', szPt: 0.5 },
            b: { color: o.accent, szPt: 5 },
          },
          spaceBefore: 20,
          spaceAfter: 30,
        }),
      ])
    },
  },
  {
    id: 'circular',
    name: 'Circular',
    description: 'A ringed folio with a soft editorial cadence.',
    category: 'Creative',
    build: (o) => {
      const peak = { color: o.accent, sizeHalfPoints: sizeOf(o) + 12 }
      return hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('◯', o, peak),
          run('   ', o, { color: o.accent }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          run('   ', o, { color: o.accent }),
          run('◯', o, peak),
          ...ofTotal(o, { color: '94A3B8' }),
        ]),
      ])
    },
  },
  {
    id: 'double-line',
    name: 'Double Line',
    description: 'Parallel rules frame a restrained centered folio.',
    category: 'Classic',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          page(o, { bold: true, color: o.accent }),
          ...ofTotal(o, { color: '64748B' }),
        ], {
          borders: 'tb',
          borderLines: {
            t: { color: o.accent, szPt: 0.75 },
            b: { color: o.accent, szPt: 0.75 },
          },
          spaceBefore: 30,
          spaceAfter: 30,
        }),
      ]),
  },
  {
    id: 'pill',
    name: 'Pill',
    description: 'A filled capsule for the current page.',
    category: 'Modern',
    build: (o) => {
      const ink = inkFor(o.accent)
      const paras: HfParagraph[] = []
      const label = labelText(o)
      if (label) {
        paras.push(
          paragraph('center', [
            run(label, o, {
              caps: 'all',
              color: '64748B',
              charSpacingTwips: 30,
              sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
            }),
          ], { spaceAfter: 30 }),
        )
      }
      paras.push(
        paragraph(alignFor(o, 'center'), [
          page(o, { bold: true, color: ink, sizeHalfPoints: sizeOf(o) + 2 }),
          ...(o.showTotal
            ? [run('  of  ', o, { color: ink }), total(o, { color: ink })]
            : []),
        ], {
          shadingFill: o.accent,
          borders: 'tblr',
          borderLines: {
            t: { color: o.accent, szPt: 0.5 },
            b: { color: o.accent, szPt: 0.5 },
            l: { color: o.accent, szPt: 0.5 },
            r: { color: o.accent, szPt: 0.5 },
          },
          indentLeft: 3000,
          indentRight: 3000,
          spaceBefore: 30,
          spaceAfter: 30,
        }),
      )
      return hfFrom(paras)
    },
  },
  {
    id: 'roman',
    name: 'Roman',
    description: 'Serif folio with classical rules; number format I, II, III.',
    category: 'Classic',
    defaults: { accent: 'B88746', font: 'Georgia', numeral: 'upperRoman' },
    samplePage: 'XII',
    sampleTotal: 'XXIV',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('PAGE  ', o, {
            caps: 'all',
            bold: true,
            color: o.accent,
            charSpacingTwips: 70,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          page(o, { bold: true, color: '334155', sizeHalfPoints: sizeOf(o) + 8 }),
          ...withOfTotal(o, { color: '64748B' }),
        ], {
          borders: 'tb',
          borderLines: {
            t: { color: o.accent, szPt: 0.5 },
            b: { color: o.accent, szPt: 0.5 },
          },
          spaceBefore: 20,
          spaceAfter: 20,
        }),
      ]),
  },
  {
    id: 'bracket',
    name: 'Bracket',
    description: 'A crisp editorial bracket with a mono edge.',
    category: 'Technical',
    defaults: { font: 'Consolas' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('[  ', o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 4 }),
          page(o, { bold: true, color: '334155', sizeHalfPoints: sizeOf(o) + 2 }),
          ...ofTotal(o, { color: '64748B' }),
          run('  ]', o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 4 }),
        ]),
      ]),
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Drafting-sheet rules with a technical page stamp.',
    category: 'Technical',
    defaults: { accent: '0284C7', font: 'Consolas' },
    build: (o) => {
      const label = labelText(o, 'SHEET')
      return hfFrom([
        paragraph(alignFor(o, 'left'), [
          run(label, o, {
            caps: 'all',
            bold: true,
            color: '0369A1',
            charSpacingTwips: 60,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          run('\t', o, { color: '000000' }),
          run('PAGE ', o, {
            caps: 'all',
            color: '0369A1',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          page(o, { bold: true, color: '0C4A6E', sizeHalfPoints: sizeOf(o) + 2 }),
          ...ofTotal(o, { color: '0369A1' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'tb',
          borderLines: {
            t: { color: o.accent, szPt: 1.5 },
            b: { color: o.accent, szPt: 0.5 },
          },
          shadingFill: 'F0F9FF',
          spaceBefore: 20,
          spaceAfter: 20,
        }),
      ])
    },
  },
  {
    id: 'boxed',
    name: 'Boxed Number',
    description: 'A compact framed folio for formal documents.',
    category: 'Premium',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 4 }),
          ...ofTotal(o, { color: '64748B' }),
        ], {
          borders: 'tblr',
          borderLines: {
            t: { color: o.accent, szPt: 0.75 },
            b: { color: o.accent, szPt: 0.75 },
            l: { color: o.accent, szPt: 0.75 },
            r: { color: o.accent, szPt: 0.75 },
          },
          shadingFill: 'F8FAFC',
          indentLeft: 3400,
          indentRight: 3400,
          spaceBefore: 50,
          spaceAfter: 50,
        }),
      ]),
  },
  {
    id: 'premium-gold',
    name: 'Premium Gold',
    description: 'Quiet luxury: serif numerals and gilded rules.',
    category: 'Premium',
    defaults: { accent: 'B88746', font: 'Georgia' },
    build: (o) => {
      const paras: HfParagraph[] = []
      if (o.label.trim()) {
        paras.push(
          paragraph('center', [
            run(o.label.trim(), o, {
              caps: 'small',
              color: o.accent,
              charSpacingTwips: 50,
              sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
            }),
          ], { spaceAfter: 20 }),
        )
      }
      paras.push(
        paragraph(alignFor(o, 'center'), [
          run('—  ', o, { color: o.accent }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 8 }),
          run('  —', o, { color: o.accent }),
          ...withOfTotal(o, { color: '78716C' }),
        ], {
          borders: 'tb',
          borderLines: {
            t: { color: o.accent, szPt: 0.5 },
            b: { color: o.accent, szPt: 0.5 },
          },
          spaceBefore: 20,
          spaceAfter: 20,
        }),
      )
      return hfFrom(paras)
    },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'An airy serif caption with a hairline above.',
    category: 'Classic',
    defaults: { font: 'Georgia' },
    build: (o) => {
      const label = labelText(o)
      return hfFrom([
        paragraph(alignFor(o, 'left'), [
          ...(label
            ? [run(label, o, { italic: true, color: '475569', sizeHalfPoints: Math.max(13, sizeOf(o) - 3) })]
            : []),
          run('\t', o, { color: '000000' }),
          page(o, { italic: true, bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          ...ofTotal(o, { color: '94A3B8' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 't',
          borderLines: { t: { ...BORDER, color: 'E2E8F0' } },
          spaceBefore: 30,
        }),
      ])
    },
  },
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Night-console strip with neon cyan telemetry.',
    category: 'Bold',
    defaults: { accent: '22D3EE', font: 'Consolas' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'left'), [
          run('SYS::PAGE', o, {
            caps: 'all',
            color: '67E8F9',
            charSpacingTwips: 70,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          run('\t', o, { color: '000000' }),
          run('[ ', o, { color: o.accent, bold: true }),
          page(o, { bold: true, color: 'F8FAFC', sizeHalfPoints: sizeOf(o) + 2 }),
          ...ofTotal(o, { color: '94A3B8' }),
          run(' ]', o, { color: o.accent, bold: true }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          shadingFill: '020617',
          borders: 'b',
          borderLines: { b: { color: o.accent, szPt: 1 } },
          spaceBefore: 50,
          spaceAfter: 50,
        }),
      ]),
  },
  {
    id: 'vertical-bar',
    name: 'Vertical Bar',
    description: 'A confident accent bar anchors a left-aligned folio.',
    category: 'Modern',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'left'), [
          run(labelText(o, 'DOCUMENT'), o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 26,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          run('   ', o, { color: 'CBD5E1' }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 4 }),
          ...ofTotal(o, { color: '94A3B8' }),
        ], {
          borders: 'l',
          borderLines: { l: { color: o.accent, szPt: 3 } },
          indentLeft: 180,
          spaceBefore: 20,
        }),
      ]),
  },
  {
    id: 'dot-matrix',
    name: 'Dot Matrix',
    description: 'A rhythmic dot-set folio for technical reports.',
    category: 'Technical',
    defaults: { font: 'Consolas' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('·  ·  ', o, { color: o.accent, bold: true }),
          page(o, { bold: true, color: '334155', charSpacingTwips: 50 }),
          ...ofTotal(o, { color: '94A3B8' }),
          run('  ·  ·', o, { color: o.accent, bold: true }),
        ]),
      ]),
  },
  {
    id: 'slash',
    name: 'Slash',
    description: 'A large folio against a restrained page total.',
    category: 'Modern',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 10 }),
          run(' / ', o, { color: 'CBD5E1', sizeHalfPoints: sizeOf(o) + 4 }),
          ...(o.showTotal
            ? [total(o, { color: '64748B', sizeHalfPoints: sizeOf(o) + 2 })]
            : [run('—', o, { color: 'CBD5E1', sizeHalfPoints: sizeOf(o) + 2 })]),
        ]),
      ]),
  },
  {
    id: 'underline-tab',
    name: 'Underline Tab',
    description: 'A measured underline connects running head and folio.',
    category: 'Minimal',
    build: (o) => {
      const label = labelText(o, 'DOCUMENT')
      return hfFrom([
        paragraph(alignFor(o, 'left'), [
          run(label, o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 20,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: o.accent }),
          ...ofTotal(o, { color: '94A3B8' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { ...BORDER, color: 'E2E8F0' } },
          spaceAfter: 30,
        }),
      ])
    },
  },
  {
    id: 'chapter-page',
    name: 'Section · Page',
    description: 'A small section marker paired with the folio.',
    category: 'Editorial',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run(labelText(o, 'SECTION'), o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 50,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          run('   ·   ', o, { color: o.accent, bold: true }),
          run('PAGE ', o, {
            caps: 'small',
            color: '94A3B8',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          page(o, { bold: true, color: o.accent }),
          ...ofTotal(o, { color: '94A3B8' }),
        ]),
      ]),
  },
  {
    id: 'folio',
    name: 'Folio',
    description: 'The timeless centered folio between two em dashes.',
    category: 'Classic',
    defaults: { font: 'Georgia' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('—  ', o, { color: o.accent }),
          page(o, { bold: true, color: '334155', sizeHalfPoints: sizeOf(o) + 4 }),
          ...withOfTotal(o, { color: '94A3B8' }),
          run('  —', o, { color: o.accent }),
        ]),
      ]),
  },
  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    description: 'A rigorous baseline, heavy rule, and oversized folio.',
    category: 'Modern',
    defaults: { font: 'Arial' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'left'), [
          run(labelText(o, 'DOCUMENT'), o, {
            caps: 'all',
            bold: true,
            color: '111827',
            charSpacingTwips: 36,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 8 }),
          ...ofTotal(o, { color: '94A3B8' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 't',
          borderLines: { t: { color: '111827', szPt: 2.5 } },
          spaceBefore: 30,
        }),
      ]),
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    description: 'An electric folio on an indigo night strip.',
    category: 'Bold',
    defaults: { accent: 'E879F9', font: 'Consolas' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('PAGE', o, {
            caps: 'all',
            color: 'C4B5FD',
            charSpacingTwips: 80,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 5),
          }),
          run('   ', o, { color: 'C4B5FD' }),
          page(o, { bold: true, color: 'F8FAFC', sizeHalfPoints: sizeOf(o) + 8 }),
          ...ofTotal(o, { color: 'A5B4FC' }),
        ], {
          shadingFill: '1E1B4B',
          borders: 'b',
          borderLines: { b: { color: o.accent, szPt: 2 } },
          spaceBefore: 50,
          spaceAfter: 50,
        }),
      ]),
  },
  {
    id: 'wax-seal',
    name: 'Wax Seal',
    description: 'A ceremonial star-set folio with a crimson accent.',
    category: 'Premium',
    defaults: { accent: 'B91C1C', font: 'Georgia' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('✦  ', o, { color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          run('  ✦', o, { color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          ...withOfTotal(o, { color: '78716C' }),
        ], {
          borders: 'tb',
          borderLines: {
            t: { color: o.accent, szPt: 0.5 },
            b: { color: o.accent, szPt: 0.5 },
          },
          spaceBefore: 20,
          spaceAfter: 20,
        }),
      ]),
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'A monospaced command-line folio with an accent rail.',
    category: 'Bold',
    defaults: { accent: '22C55E', font: 'Consolas' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'left'), [
          run('> page_', o, { color: o.accent, bold: true }),
          page(o, { bold: true, color: '111827' }),
          ...ofTotal(o, { color: '64748B' }),
          run('_', o, { color: o.accent, bold: true }),
        ], {
          borders: 'l',
          borderLines: { l: { color: o.accent, szPt: 3 } },
          indentLeft: 180,
          spaceBefore: 20,
        }),
      ]),
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'A two-tone folio with a soft violet horizon.',
    category: 'Creative',
    defaults: { accent: '7C3AED' },
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('PAGE ', o, {
            caps: 'all',
            color: '7C3AED',
            charSpacingTwips: 60,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          page(o, { bold: true, color: '0D9488', sizeHalfPoints: sizeOf(o) + 6 }),
          ...(o.showTotal
            ? [run('  /  ', o, { color: 'A78BFA' }), total(o, { color: '0F766E' })]
            : []),
        ], {
          borders: 'b',
          borderLines: { b: { color: 'A78BFA', szPt: 1 } },
          spaceAfter: 30,
        }),
      ]),
  },
  {
    id: 'ribbon',
    name: 'Ribbon',
    description: 'A centered folio wrapped in an elegant double ribbon.',
    category: 'Premium',
    build: (o) =>
      hfFrom([
        paragraph(alignFor(o, 'center'), [
          run('━━  ', o, { color: o.accent, sizeHalfPoints: Math.max(12, sizeOf(o) - 5) }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          run('  ━━', o, { color: o.accent, sizeHalfPoints: Math.max(12, sizeOf(o) - 5) }),
        ]),
      ]),
  },
]

/* ------------------------------------------------------------------ */
/* Header + footer layouts                                             */
/* ------------------------------------------------------------------ */

function footerFrom(runs: Run[], align: DesignAlign = 'center', extra: Partial<HfParagraph> = {}) {
  return hfFrom([paragraph(align, runs, extra)])
}

function rule(extra: Partial<HfParagraph> = {}): HfParagraph {
  return paragraph('left', [], {
    borders: 'b',
    borderLines: { b: { color: 'CBD5E1', szPt: 0.75 } },
    spaceAfter: 20,
    ...extra,
  })
}

const LAYOUT_DESIGNS: LayoutDesign[] = [
  {
    id: 'minimal-folio',
    name: 'Minimal Folio',
    description: 'A whisper-quiet running head and centered folio.',
    category: 'Minimal',
    build: (o) => {
      const label = labelText(o)
      return {
        header: hfFrom([
          paragraph('left', [
            ...(label
              ? [run(label, o, {
                  caps: 'all',
                  color: '64748B',
                  charSpacingTwips: 34,
                  sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
                })]
              : []),
          ], {
            borders: 'b',
            borderLines: { b: { color: 'E2E8F0', szPt: 0.5 } },
            spaceAfter: 10,
          }),
        ]),
        footer: hfFrom([
          paragraph('center', [
            page(o, { bold: true, color: o.accent }),
            ...withOfTotal(o, { color: '94A3B8' }),
          ]),
        ]),
      }
    },
  },
  {
    id: 'editorial-masthead',
    name: 'Editorial Masthead',
    description: 'A confident serif masthead, rule, and folio footer.',
    category: 'Editorial',
    defaults: { font: 'Georgia' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'THE DOCUMENT'), o, {
            bold: true,
            color: '111827',
            sizeHalfPoints: sizeOf(o) + 10,
          }),
        ], { spaceAfter: 10 }),
        paragraph('left', [
          run('Plot Docs', o, {
            caps: 'all',
            color: o.accent,
            charSpacingTwips: 55,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
        ], {
          borders: 'b',
          borderLines: { b: { color: '111827', szPt: 1.5 } },
          spaceAfter: 40,
        }),
      ]),
      footer: hfFrom([
        paragraph('left', [
          run('EDITORIAL', o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 35,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: o.accent }),
          ...ofTotal(o, { color: '94A3B8' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 't',
          borderLines: { t: { color: 'E2E8F0', szPt: 0.5 } },
          spaceBefore: 30,
        }),
      ]),
    }),
  },
  {
    id: 'dark-console',
    name: 'Dark Tech Console',
    description: 'A night-mode masthead with cyan telemetry and footer rail.',
    category: 'Bold',
    defaults: { accent: '22D3EE', font: 'Consolas' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'DOCUMENT'), o, {
            caps: 'all',
            bold: true,
            color: 'F8FAFC',
            charSpacingTwips: 45,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 3),
          }),
          run('\t', o, { color: '000000' }),
          run('PAGE ', o, {
            caps: 'all',
            color: '67E8F9',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          shadingFill: '020617',
          borders: 'b',
          borderLines: { b: { color: o.accent, szPt: 1.5 } },
          spaceBefore: 50,
          spaceAfter: 50,
        }),
      ]),
      footer: hfFrom([
        paragraph('left', [
          run('PLOT // SECURE', o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 40,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          run('\t', o, { color: '000000' }),
          run('[ ', o, { color: o.accent }),
          page(o, { bold: true, color: o.accent }),
          ...ofTotal(o, { color: '94A3B8' }),
          run(' ]', o, { color: o.accent }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 't',
          borderLines: { t: { color: '22D3EE', szPt: 0.75 } },
          spaceBefore: 30,
        }),
      ]),
    }),
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Gilded rules and serif numerals for a premium report.',
    category: 'Premium',
    defaults: { accent: 'B88746', font: 'Georgia' },
    build: (o) => ({
      header: hfFrom([
        paragraph('center', [
          run('PRIVATE EDITION', o, {
            caps: 'all',
            color: o.accent,
            charSpacingTwips: 80,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
        ], { spaceAfter: 30 }),
        paragraph('center', [
          run(labelText(o, 'THE DOCUMENT'), o, {
            caps: 'small',
            bold: true,
            color: '292524',
            sizeHalfPoints: sizeOf(o) + 6,
          }),
        ], {
          borders: 'b',
          borderLines: { b: { color: o.accent, szPt: 0.75 } },
          spaceAfter: 50,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          run('✦   ', o, { color: o.accent }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          ...withOfTotal(o, { color: '78716C' }),
          run('   ✦', o, { color: o.accent }),
        ]),
      ]),
    }),
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'A small-caps running head and restrained folio.',
    category: 'Classic',
    defaults: { font: 'Times New Roman' },
    build: (o) => ({
      header: hfFrom([
        paragraph('center', [
          run(labelText(o, 'RESEARCH PAPER'), o, {
            caps: 'small',
            color: '475569',
            charSpacingTwips: 35,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
        ], {
          borders: 'b',
          borderLines: { b: { color: 'CBD5E1', szPt: 0.5 } },
          spaceAfter: 30,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          page(o, { color: '334155', sizeHalfPoints: sizeOf(o) + 2 }),
        ]),
      ]),
    }),
  },
  {
    id: 'studio-portfolio',
    name: 'Studio Portfolio',
    description: 'A bold studio lockup with a boxed folio.',
    category: 'Modern',
    defaults: { font: 'Arial' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'STUDIO'), o, {
            caps: 'all',
            bold: true,
            color: '111827',
            charSpacingTwips: 35,
            sizeHalfPoints: sizeOf(o) + 8,
          }),
          run('\t', o, { color: '000000' }),
          run('PORTFOLIO', o, {
            caps: 'all',
            color: o.accent,
            charSpacingTwips: 50,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: '111827', szPt: 2 } },
          spaceAfter: 40,
        }),
      ]),
      footer: hfFrom([
        paragraph('right', [
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 2 }),
          ...ofTotal(o, { color: '64748B' }),
        ], {
          borders: 'tblr',
          borderLines: {
            t: { color: o.accent, szPt: 0.75 },
            b: { color: o.accent, szPt: 0.75 },
            l: { color: o.accent, szPt: 0.75 },
            r: { color: o.accent, szPt: 0.75 },
          },
          indentLeft: 6800,
          indentRight: 120,
          spaceBefore: 30,
          spaceAfter: 30,
        }),
      ]),
    }),
  },
  {
    id: 'progress-report',
    name: 'Progress Report',
    description: 'An accent progress rail, status line, and page tracker.',
    category: 'Modern',
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'PROJECT'), o, {
            caps: 'all',
            bold: true,
            color: '111827',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(14, sizeOf(o) - 2),
          }),
          run('\t', o, { color: '000000' }),
          run('PROGRESS REPORT', o, {
            caps: 'all',
            color: o.accent,
            charSpacingTwips: 40,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'tb',
          borderLines: {
            t: { color: 'E2E8F0', szPt: 0.5 },
            b: { color: o.accent, szPt: 4.5 },
          },
          spaceBefore: 20,
          spaceAfter: 30,
        }),
      ]),
      footer: hfFrom([
        paragraph('left', [
          run('UPDATED 2026', o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 35,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: o.accent }),
          ...ofTotal(o, { color: '94A3B8' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
        }),
      ]),
    }),
  },
  {
    id: 'legal',
    name: 'Contract / Legal',
    description: 'A discreet confidentiality line and formal folio.',
    category: 'Classic',
    defaults: { font: 'Times New Roman' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run('CONFIDENTIAL', o, {
            caps: 'all',
            bold: true,
            color: '64748B',
            charSpacingTwips: 45,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
          run('\t', o, { color: '000000' }),
          run(labelText(o, 'AGREEMENT'), o, {
            caps: 'small',
            color: '475569',
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: 'CBD5E1', szPt: 0.5 } },
          spaceAfter: 20,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          run('PAGE ', o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          page(o, { bold: true, color: '334155' }),
          ...withOfTotal(o, { color: '64748B' }),
        ], {
          borders: 't',
          borderLines: { t: { color: 'CBD5E1', szPt: 0.5 } },
          spaceBefore: 20,
        }),
      ]),
    }),
  },
  {
    id: 'manuscript',
    name: 'Manuscript',
    description: 'An italic running head and classic em-dash folio.',
    category: 'Editorial',
    defaults: { font: 'Georgia' },
    build: (o) => ({
      header: hfFrom([
        paragraph('center', [
          run(labelText(o, 'MANUSCRIPT'), o, {
            italic: true,
            color: '475569',
            sizeHalfPoints: Math.max(13, sizeOf(o) - 3),
          }),
        ], {
          borders: 'b',
          borderLines: { b: { color: 'E2E8F0', szPt: 0.5 } },
          spaceAfter: 30,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          run('—  ', o, { color: o.accent }),
          page(o, { color: '334155', sizeHalfPoints: sizeOf(o) + 2 }),
          ...withOfTotal(o, { color: '94A3B8' }),
          run('  —', o, { color: o.accent }),
        ]),
      ]),
    }),
  },
  {
    id: 'blueprint-sheet',
    name: 'Blueprint Sheet',
    description: 'Drafting-sheet frame, project stamp, and sheet coordinates.',
    category: 'Technical',
    defaults: { accent: '0284C7', font: 'Consolas' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(`PROJECT: ${labelText(o, 'UNTITLED')}`, o, {
            caps: 'all',
            bold: true,
            color: '0369A1',
            charSpacingTwips: 35,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          run('\t', o, { color: '000000' }),
          run('SHEET ', o, {
            caps: 'all',
            color: '0369A1',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          page(o, { bold: true, color: '0C4A6E' }),
          ...ofTotal(o, { color: '0369A1' }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'tblr',
          borderLines: {
            t: { color: o.accent, szPt: 1 },
            b: { color: o.accent, szPt: 1 },
            l: { color: o.accent, szPt: 0.5 },
            r: { color: o.accent, szPt: 0.5 },
          },
          shadingFill: 'F0F9FF',
          spaceBefore: 40,
          spaceAfter: 40,
        }),
      ]),
      footer: hfFrom([
        paragraph('left', [
          run('SCALE 1:1  ·  PLOT DOCS', o, {
            caps: 'all',
            color: '0369A1',
            charSpacingTwips: 40,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
          run('\t', o, { color: '000000' }),
          run('REV. A', o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 30,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: o.accent, szPt: 0.5 } },
        }),
      ]),
    }),
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'A colorful capsule header and dotted folio.',
    category: 'Creative',
    build: (o) => ({
      header: hfFrom([
        paragraph('center', [
          run(`  ${labelText(o, 'DOCUMENT')}  `, o, {
            caps: 'all',
            bold: true,
            color: inkFor(o.accent),
            charSpacingTwips: 25,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 4),
          }),
        ], {
          shadingFill: o.accent,
          indentLeft: 2800,
          indentRight: 2800,
          spaceBefore: 50,
          spaceAfter: 50,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          run('•   ', o, { color: o.accent, bold: true }),
          page(o, { bold: true, color: '334155' }),
          ...withOfTotal(o, { color: '94A3B8' }),
          run('   •', o, { color: o.accent, bold: true }),
        ]),
      ]),
    }),
  },
  {
    id: 'aurora-layout',
    name: 'Aurora',
    description: 'A violet-teal horizon across the header and folio.',
    category: 'Creative',
    defaults: { accent: '7C3AED' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'DOCUMENT'), o, {
            caps: 'all',
            bold: true,
            color: '7C3AED',
            charSpacingTwips: 40,
            sizeHalfPoints: Math.max(13, sizeOf(o) - 3),
          }),
          run('\t', o, { color: '000000' }),
          run('AURORA', o, {
            caps: 'all',
            color: '0D9488',
            charSpacingTwips: 50,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: 'A78BFA', szPt: 1.5 } },
          spaceAfter: 40,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          run('PAGE ', o, {
            caps: 'all',
            color: '7C3AED',
            charSpacingTwips: 60,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
          page(o, { bold: true, color: '0D9488', sizeHalfPoints: sizeOf(o) + 3 }),
          ...(o.showTotal
            ? [run('  /  ', o, { color: 'A78BFA' }), total(o, { color: '0F766E' })]
            : []),
        ]),
      ]),
    }),
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'A fine double rule, discreet marker, and formal folio.',
    category: 'Premium',
    defaults: { font: 'Georgia' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'THE DOCUMENT'), o, {
            caps: 'small',
            bold: true,
            color: '1F2937',
            charSpacingTwips: 25,
            sizeHalfPoints: Math.max(14, sizeOf(o) - 2),
          }),
          run('\t', o, { color: '000000' }),
          run('PRIVATE', o, {
            caps: 'all',
            color: '94A3B8',
            charSpacingTwips: 40,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'tb',
          borderLines: {
            t: { color: '111827', szPt: 0.5 },
            b: { color: o.accent, szPt: 1.5 },
          },
          spaceBefore: 10,
          spaceAfter: 50,
        }),
      ]),
      footer: hfFrom([
        paragraph('center', [
          page(o, { color: '334155', sizeHalfPoints: sizeOf(o) + 2 }),
          ...withOfTotal(o, { color: '94A3B8' }),
        ]),
      ]),
    }),
  },
  {
    id: 'magazine',
    name: 'Magazine',
    description: 'A large serif cover line with an oversized page folio.',
    category: 'Editorial',
    defaults: { font: 'Georgia' },
    build: (o) => ({
      header: hfFrom([
        paragraph('left', [
          run(labelText(o, 'THE FEATURE'), o, {
            bold: true,
            color: '111827',
            sizeHalfPoints: sizeOf(o) + 14,
          }),
          run('\t', o, { color: '000000' }),
          run('ISSUE 01', o, {
            caps: 'all',
            color: o.accent,
            charSpacingTwips: 45,
            sizeHalfPoints: Math.max(12, sizeOf(o) - 5),
          }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: '111827', szPt: 1.5 } },
          spaceAfter: 40,
        }),
      ]),
      footer: hfFrom([
        paragraph('left', [
          run('Plot Docs', o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 40,
            sizeHalfPoints: Math.max(11, sizeOf(o) - 6),
          }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: o.accent, sizeHalfPoints: sizeOf(o) + 12 }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          spaceAfter: 10,
        }),
      ]),
    }),
  },
]

/* ------------------------------------------------------------------ */
/* Generated library: 20 categories x 4 coordinated treatments          */
/* ------------------------------------------------------------------ */

type GeneratedStyle = 'ledger' | 'band' | 'folio' | 'badge' | 'rail' | 'index' | 'capsule' | 'ornament'

const GENERATED_STYLE_NAMES: Record<GeneratedStyle, string> = {
  ledger: 'Ledger',
  band: 'Ink Band',
  folio: 'Folio',
  badge: 'Badge',
  rail: 'Side Rail',
  index: 'Index',
  capsule: 'Capsule',
  ornament: 'Ornament',
}

const GENERATED_STYLE_COPY: Record<GeneratedStyle, string> = {
  ledger: 'An editorial ledger with a fine baseline rule.',
  band: 'A solid ink band that anchors the page edge.',
  folio: 'A restrained centered folio with generous tracking.',
  badge: 'A compact framed page badge with a sharp label.',
  rail: 'A bold side rail for technical and report covers.',
  index: 'An oversized folio with catalog-style hierarchy.',
  capsule: 'A filled capsule folio with inverted type.',
  ornament: 'A decorative folio with a quiet typographic flourish.',
}

interface GeneratedSpec {
  name: string
  short: string
  note: string
  font: string
  altFont: string
  accents: [string, string, string, string]
  roman?: boolean
  headerAlt?: boolean
  glyph?: string
}

const GENERATED_SPECS: GeneratedSpec[] = [
  { name: 'Minimal Professional', short: 'Minimal', note: 'Quiet spacing and crisp typography.', font: 'Segoe UI', altFont: 'Calibri', accents: ['475569', '111827', '6D5EF5', '0F9D8A'] },
  { name: 'Corporate Business', short: 'Corporate', note: 'Boardroom-ready hierarchy.', font: 'Calibri', altFont: 'Arial', accents: ['1D4ED8', '0F2A4A', '0F766E', 'B45309'] },
  { name: 'Academic Research', short: 'Academic', note: 'Scholarly rhythm for long papers.', font: 'Georgia', altFont: 'Times New Roman', accents: ['7C2D12', '1E3A5F', '0F766E', '5B21B6'], roman: true },
  { name: 'Legal Documents', short: 'Legal', note: 'Formal folios for contracts and briefs.', font: 'Times New Roman', altFont: 'Georgia', accents: ['111827', '7F1D1D', '1E3A5F', '374151'], roman: true },
  { name: 'Cybersecurity Reports', short: 'Cyber', note: 'High-contrast operational reporting.', font: 'Consolas', altFont: 'Segoe UI', accents: ['22D3EE', '34D399', 'A78BFA', 'F472B6'], headerAlt: true },
  { name: 'Technical Documentation', short: 'Technical', note: 'Specification-grade clarity.', font: 'Consolas', altFont: 'Segoe UI', accents: ['0284C7', '0F766E', '334155', 'C2410C'] },
  { name: 'Modern Dark', short: 'Midnight', note: 'Dark editorial surfaces with luminous ink.', font: 'Segoe UI', altFont: 'Arial', accents: ['A78BFA', '22D3EE', 'F472B6', 'FBBF24'], headerAlt: true },
  { name: 'Futuristic Neon', short: 'Neon', note: 'Electric accents for future-facing decks.', font: 'Consolas', altFont: 'Segoe UI', accents: ['22D3EE', 'E879F9', 'A3E635', 'FB7185'], headerAlt: true },
  { name: 'Editorial Magazine', short: 'Editorial', note: 'Feature-led typography with air.', font: 'Georgia', altFont: 'Segoe UI', accents: ['BE123C', '111827', '7C3AED', 'B45309'] },
  { name: 'Swiss Minimalist', short: 'Swiss', note: 'Grid discipline and neutral ink.', font: 'Arial', altFont: 'Calibri', accents: ['111827', 'DC2626', '2563EB', '475569'] },
  { name: 'Luxury Gold', short: 'Luxury', note: 'Warm metallic restraint.', font: 'Georgia', altFont: 'Times New Roman', accents: ['B88746', '9A6B2F', '1C1917', '7C5A2E'], headerAlt: true },
  { name: 'Monochrome', short: 'Mono', note: 'Pure tonal contrast, no colour noise.', font: 'Arial', altFont: 'Segoe UI', accents: ['111827', '374151', '6B7280', '000000'] },
  { name: 'Geometric', short: 'Geometric', note: 'Strong shapes and modular folios.', font: 'Segoe UI', altFont: 'Arial', accents: ['7C3AED', '0EA5E9', 'F97316', '10B981'] },
  { name: 'Gradient', short: 'Gradient', note: 'Layered colour for modern reports.', font: 'Segoe UI', altFont: 'Calibri', accents: ['7C3AED', '2563EB', 'DB2777', '0D9488'], headerAlt: true },
  { name: 'Blueprint', short: 'Blueprint', note: 'Drafting-table precision.', font: 'Consolas', altFont: 'Arial', accents: ['0284C7', '0C4A6E', '0F766E', '1E40AF'] },
  { name: 'Creative Portfolio', short: 'Portfolio', note: 'Gallery-like folios with personality.', font: 'Georgia', altFont: 'Segoe UI', accents: ['DB2777', '7C3AED', 'F97316', '0891B2'] },
  { name: 'Executive Reports', short: 'Executive', note: 'Confident, compact board reporting.', font: 'Calibri', altFont: 'Georgia', accents: ['0B1F3A', '1D4ED8', 'B88746', '0F766E'] },
  { name: 'Formal Government', short: 'Government', note: 'Mandated-form clarity and gravitas.', font: 'Times New Roman', altFont: 'Arial', accents: ['1E3A5F', '111827', '7F1D1D', '374151'], roman: true },
  { name: 'Scientific Publications', short: 'Scientific', note: 'Journal-ready folios and running heads.', font: 'Times New Roman', altFont: 'Georgia', accents: ['0F766E', '1E40AF', '7C2D12', '111827'], roman: true },
  { name: 'Presentation Handouts', short: 'Handout', note: 'Large, legible folios for printed packs.', font: 'Arial', altFont: 'Calibri', accents: ['2563EB', '7C3AED', 'DB2777', '111827'] },
]

const GENERATED_STYLES: GeneratedStyle[] = [
  'ledger',
  'band',
  'folio',
  'badge',
  'rail',
  'index',
  'capsule',
  'ornament',
]

function generatedBandFill(spec: GeneratedSpec, style: GeneratedStyle): string {
  if (style === 'band' || style === 'capsule') {
    if (spec.short === 'Cyber' || spec.short === 'Midnight' || spec.short === 'Neon') return '0B1220'
    if (spec.short === 'Luxury' || spec.short === 'Mono' || spec.short === 'Executive') return '111827'
    if (spec.short === 'Corporate' || spec.short === 'Government') return '0F2A4A'
    return '1F2937'
  }
  return 'FFFFFF'
}

function generatedDesign(
  spec: GeneratedSpec,
  style: GeneratedStyle,
  variant: number,
  o: DesignOptions,
): HeaderFooter {
  const label = labelText(o, spec.short.toUpperCase())
  const accent = o.accent
  const ink = inkFor(accent)
  const fill = generatedBandFill(spec, style)
  const bandInk = fill === 'FFFFFF' ? '111827' : 'F8FAFC'
  const glyph = spec.glyph ?? '✦'
  const small = Math.max(12, sizeOf(o) - 5)

  switch (style) {
    case 'ledger':
      return hfFrom([
        paragraph('left', [
          run(label, o, { caps: 'all', color: '64748B', charSpacingTwips: 38, sizeHalfPoints: small }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: accent, sizeHalfPoints: sizeOf(o) + 2 }),
          ...ofTotal(o, { color: '94A3B8', sizeHalfPoints: small }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'b',
          borderLines: { b: { color: accent, szPt: variant === 0 ? 0.75 : 1.25 } },
          spaceAfter: 10,
        }),
      ])
    case 'band':
      return hfFrom([
        paragraph('left', [
          run(label, o, {
            caps: 'all',
            color: bandInk,
            charSpacingTwips: 45,
            sizeHalfPoints: small,
          }),
          run('\t', o, { color: bandInk }),
          page(o, { bold: true, color: accent, sizeHalfPoints: sizeOf(o) + 8 }),
          ...ofTotal(o, { color: bandInk, sizeHalfPoints: small }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          shadingFill: fill,
          indentLeft: 120,
          indentRight: 120,
          borders: 'b',
          borderLines: { b: { color: accent, szPt: 2.5 } },
          spaceBefore: 30,
          spaceAfter: 30,
        }),
      ])
    case 'folio':
      return hfFrom([
        paragraph(alignFor(o, 'center'), [
          run(label, o, {
            caps: 'all',
            color: '94A3B8',
            charSpacingTwips: 55,
            sizeHalfPoints: small,
          }),
        ], { borders: 'b', borderLines: { b: { color: 'E2E8F0', szPt: 0.5 } }, spaceAfter: 40 }),
        paragraph(alignFor(o, 'center'), [
          page(o, { bold: true, color: accent, sizeHalfPoints: sizeOf(o) + 3 }),
          ...withOfTotal(o, { color: '64748B', sizeHalfPoints: small }),
        ]),
      ])
    case 'badge':
      return hfFrom([
        paragraph(alignFor(o, 'center'), [
          run(label, o, {
            caps: 'all',
            color: '64748B',
            charSpacingTwips: 40,
            sizeHalfPoints: small,
          }),
        ], { spaceAfter: 20 }),
        paragraph(alignFor(o, 'center'), [
          page(o, {
            bold: true,
            color: accent,
            sizeHalfPoints: sizeOf(o) + 4,
            shading: 'F1F5F9',
          }),
          ...withOfTotal(o, { color: '64748B', sizeHalfPoints: small }),
        ]),
      ])
    case 'rail':
      return hfFrom([
        paragraph('left', [
          run(label, o, { caps: 'all', color: '334155', charSpacingTwips: 30, sizeHalfPoints: small }),
          run('\t', o, { color: '000000' }),
          page(o, { bold: true, color: accent, sizeHalfPoints: sizeOf(o) + 4 }),
          ...ofTotal(o, { color: '64748B', sizeHalfPoints: small }),
        ], {
          tabStops: [{ pos: PAGE_WIDTH_TWIPS, val: 'right' }],
          borders: 'l',
          borderLines: { l: { color: accent, szPt: 3 } },
          indentLeft: 180,
          spaceAfter: 10,
        }),
      ])
    case 'index':
      return hfFrom([
        paragraph(variant % 2 === 0 ? 'left' : 'right', [
          page(o, { bold: true, color: accent, sizeHalfPoints: sizeOf(o) + 18 }),
          run('  ', o, { color: '000000' }),
          run(label, o, { caps: 'all', color: '64748B', charSpacingTwips: 55, sizeHalfPoints: small }),
          ...(o.showTotal
            ? [run('  ·  ', o, { color: 'CBD5E1', sizeHalfPoints: small }), total(o, { color: '94A3B8', sizeHalfPoints: small })]
            : []),
        ], {
          borders: 't',
          borderLines: { t: { color: accent, szPt: 1.5 } },
          spaceBefore: 40,
        }),
      ])
    case 'capsule':
      return hfFrom([
        paragraph(alignFor(o, 'center'), [
          page(o, {
            bold: true,
            color: ink,
            shading: accent,
            sizeHalfPoints: sizeOf(o) + 2,
          }),
          ...withOfTotal(o, { color: '64748B', sizeHalfPoints: small }),
        ], { spaceAfter: 10 }),
        paragraph(alignFor(o, 'center'), [
          run(label, o, {
            caps: 'all',
            color: '94A3B8',
            charSpacingTwips: 60,
            sizeHalfPoints: Math.max(10, small - 2),
          }),
        ]),
      ])
    case 'ornament':
      return hfFrom([
        paragraph(alignFor(o, 'center'), [
          run(`${glyph}   `, o, { color: accent, sizeHalfPoints: small }),
          page(o, { bold: true, color: accent, sizeHalfPoints: sizeOf(o) + 4 }),
          run(`   ${glyph}`, o, { color: accent, sizeHalfPoints: small }),
          ...withOfTotal(o, { color: '64748B', sizeHalfPoints: small }),
        ], { borders: 'b', borderLines: { b: { color: 'E2E8F0', szPt: 0.5 } }, spaceAfter: 30 }),
        paragraph(alignFor(o, 'center'), [
          run(label, o, { caps: 'all', color: '94A3B8', charSpacingTwips: 55, sizeHalfPoints: Math.max(10, small - 2) }),
        ]),
      ])
  }
}

function generatedPageNumberDesigns(): PageNumberDesign[] {
  const out: PageNumberDesign[] = []
  GENERATED_SPECS.forEach((spec, specIndex) => {
    for (let variant = 0; variant < 4; variant += 1) {
      const style = GENERATED_STYLES[(specIndex + variant) % GENERATED_STYLES.length]!
      const accent = spec.accents[variant]!
      const font = variant % 2 === 0 ? spec.font : spec.altFont
      const numeral = spec.roman && variant === 3 ? 'upperRoman' : 'decimal'
      const target = spec.headerAlt && variant === 3 ? 'header' : 'footer'
      const name = `${spec.short} ${GENERATED_STYLE_NAMES[style]}`
      out.push({
        id: `generated-${specIndex}-${variant}`,
        name,
        description: `${spec.note} ${GENERATED_STYLE_COPY[style]}`,
        category: spec.name,
        defaults: {
          accent,
          font,
          numeral,
          target,
          showTotal: variant !== 1,
          scale: variant === 0 ? 'compact' : variant === 2 ? 'large' : 'standard',
          align: variant === 1 ? 'left' : variant === 2 ? 'right' : 'center',
        },
        samplePage: numeral === 'upperRoman' ? 'XII' : DEFAULT_SAMPLE_PAGE,
        build: (o) => generatedDesign(spec, style, variant, o),
      })
    }
  })
  return out
}

PAGE_NUMBER_DESIGNS.push(...generatedPageNumberDesigns())

/* ------------------------------------------------------------------ */
/* Coordinated document themes                                         */
/* ------------------------------------------------------------------ */

interface StudioTheme {
  id: string
  name: string
  description: string
  accent: string
  major: string
  minor: string
  layoutId: string
  colors: ThemeColors
}

function themeColors(
  name: string,
  accent1: string,
  accent2: string,
  dk2 = '1F2937',
  lt2 = 'F3F4F6',
): ThemeColors {
  return {
    name,
    dk1: '000000',
    lt1: 'FFFFFF',
    dk2,
    lt2,
    hlink: accent1,
    folHlink: accent2,
    accent1,
    accent2,
    accent3: '0F9D8A',
    accent4: 'B88746',
    accent5: 'DB2777',
    accent6: '64748B',
  }
}

const STUDIO_THEMES: StudioTheme[] = [
  {
    id: 'executive-blue',
    name: 'Executive Blue',
    description: 'Navy rules, Georgia display type, confident folios.',
    accent: '1D4ED8',
    major: 'Georgia',
    minor: 'Segoe UI',
    layoutId: 'executive',
    colors: themeColors('Executive Blue', '1D4ED8', '0F2A4A'),
  },
  {
    id: 'midnight-cyber',
    name: 'Midnight Cyber',
    description: 'Dark operational surfaces with cyan signal accents.',
    accent: '22D3EE',
    major: 'Consolas',
    minor: 'Segoe UI',
    layoutId: 'dark-console',
    colors: themeColors('Midnight Cyber', '22D3EE', 'A78BFA', '0B1220', '142033'),
  },
  {
    id: 'black-gold',
    name: 'Black & Gold',
    description: 'Warm metallic rules and editorial serif authority.',
    accent: 'B88746',
    major: 'Georgia',
    minor: 'Georgia',
    layoutId: 'luxury-gold',
    colors: themeColors('Black & Gold', 'B88746', '9A6B2F', '111827', 'F5F0E6'),
  },
  {
    id: 'academic-classic',
    name: 'Academic Classic',
    description: 'Scholarly Times setting for papers and theses.',
    accent: '7C2D12',
    major: 'Times New Roman',
    minor: 'Georgia',
    layoutId: 'academic',
    colors: themeColors('Academic Classic', '7C2D12', '1E3A5F', '1F2937', 'F8F5F0'),
  },
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    description: 'Neutral ink, generous air, unobtrusive running heads.',
    accent: '475569',
    major: 'Segoe UI',
    minor: 'Calibri',
    layoutId: 'minimal-folio',
    colors: themeColors('Clean Minimal', '475569', '111827', '1F2937', 'F8FAFC'),
  },
  {
    id: 'editorial-rose',
    name: 'Editorial Rose',
    description: 'Magazine energy with a rose feature accent.',
    accent: 'BE123C',
    major: 'Georgia',
    minor: 'Segoe UI',
    layoutId: 'magazine',
    colors: themeColors('Editorial Rose', 'BE123C', '7C3AED', '111827', 'FDF2F8'),
  },
  {
    id: 'technical-blueprint',
    name: 'Technical Blueprint',
    description: 'Drafting-table monospace with precise blue rules.',
    accent: '0284C7',
    major: 'Consolas',
    minor: 'Arial',
    layoutId: 'blueprint-sheet',
    colors: themeColors('Technical Blueprint', '0284C7', '0C4A6E', '0F172A', 'F0F9FF'),
  },
  {
    id: 'research-journal',
    name: 'Research Journal',
    description: 'Teal journal folios and a restrained manuscript head.',
    accent: '0F766E',
    major: 'Times New Roman',
    minor: 'Georgia',
    layoutId: 'manuscript',
    colors: themeColors('Research Journal', '0F766E', '1E40AF', '1F2937', 'F0FDFA'),
  },
  {
    id: 'corporate-mono',
    name: 'Corporate Monochrome',
    description: 'Boardroom black, crisp rules, zero colour noise.',
    accent: '111827',
    major: 'Arial',
    minor: 'Segoe UI',
    layoutId: 'legal',
    colors: themeColors('Corporate Monochrome', '111827', '374151', '111827', 'F3F4F6'),
  },
  {
    id: 'future-violet',
    name: 'Futuristic Violet',
    description: 'Aurora gradients and a luminous violet folio.',
    accent: '7C3AED',
    major: 'Segoe UI',
    minor: 'Consolas',
    layoutId: 'aurora-layout',
    colors: themeColors('Futuristic Violet', '7C3AED', '22D3EE', '140A2E', 'F5F3FF'),
  },
]

/* ------------------------------------------------------------------ */
/* Page setup presets                                                  */
/* ------------------------------------------------------------------ */

const PAPER_PRESETS: Array<{ id: string; name: string; width: number; height: number }> = [
  { id: 'a4', name: 'A4', width: 11906, height: 16838 },
  { id: 'a3', name: 'A3', width: 16838, height: 23811 },
  { id: 'letter', name: 'Letter', width: 12240, height: 15840 },
  { id: 'legal', name: 'Legal', width: 12240, height: 20160 },
]

interface PageDraft {
  paperId: string
  orientation: SectionSettings['orientation']
  width: number
  height: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  gutter: number
  headerDist: number
  footerDist: number
}

function draftFromSection(section: SectionSettings | null | undefined): PageDraft {
  const match = PAPER_PRESETS.find((p) => {
    if (!section) return p.id === 'a4'
    const short = Math.min(p.width, p.height)
    const long = Math.max(p.width, p.height)
    return (
      short === Math.min(section.pageWidth, section.pageHeight) &&
      long === Math.max(section.pageWidth, section.pageHeight)
    )
  })
  return {
    paperId: match?.id ?? 'custom',
    orientation: section?.orientation ?? 'portrait',
    width: section?.pageWidth ?? 11906,
    height: section?.pageHeight ?? 16838,
    marginTop: section?.marginTop ?? 1440,
    marginRight: section?.marginRight ?? 1440,
    marginBottom: section?.marginBottom ?? 1440,
    marginLeft: section?.marginLeft ?? 1440,
    gutter: section?.gutter ?? 0,
    headerDist: section?.headerDist ?? 720,
    footerDist: section?.footerDist ?? 720,
  }
}

function inchesOf(twips: number): string {
  return String(Math.round((twips / 1440) * 100) / 100)
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <label className="pdz-field">
      <span>{label}</span>
      <input
        className="pdz-text-input"
        type="number"
        step="0.05"
        min={0}
        value={inchesOf(value)}
        onChange={(e) => {
          const next = parseFloat(e.target.value)
          onChange(Number.isFinite(next) ? Math.max(0, Math.round(next * 1440)) : 0)
        }}
      />
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Preview rendering                                                   */
/* ------------------------------------------------------------------ */

function sampleText(text: string, pageText: string, totalText: string): string {
  return text
    .replaceAll(PAGE_MARK, pageText)
    .replaceAll(TOTAL_PAGES_MARK, totalText)
}

function splitTabs(runs: Run[]): Run[][] {
  const segments: Run[][] = [[]]
  for (const r of runs) {
    const pieces = r.text.split('\t')
    pieces.forEach((piece, i) => {
      if (i > 0) segments.push([])
      if (piece) segments[segments.length - 1].push({ ...r, text: piece })
    })
  }
  return segments
}

function runCss(r: Run, big: boolean): CSSProperties {
  const pt = (r.sizeHalfPoints ?? 18) / 2
  const style: CSSProperties = {
    fontFamily: r.font ? `"${r.font}", sans-serif` : undefined,
    fontSize: `${Math.max(big ? 6.5 : 4.4, pt * (big ? 0.95 : 0.53))}px`,
    fontWeight: r.bold ? 700 : undefined,
    fontStyle: r.italic ? 'italic' : undefined,
    textDecoration: r.underline ? 'underline' : r.strike ? 'line-through' : undefined,
    color: r.color ? `#${r.color}` : undefined,
    textTransform: r.caps === 'all' ? 'uppercase' : undefined,
    fontVariantCaps: r.caps === 'small' ? 'small-caps' : undefined,
    letterSpacing: r.charSpacingTwips
      ? `${Math.max(0.05, (r.charSpacingTwips / 20) * (big ? 0.95 : 0.53) * 0.4)}px`
      : undefined,
    whiteSpace: 'pre',
  }
  if (r.shading) {
    style.background = `#${r.shading}`
    style.padding = '0 2px'
    style.borderRadius = '2px'
  }
  if (r.bdr) {
    style.border = `1px solid #${r.bdr.color ?? '64748B'}`
    style.padding = `${Math.max(0.5, (r.bdr.space ?? 0) / 2)}px ${Math.max(0.5, (r.bdr.space ?? 0) / 2)}px`
  }
  return style
}

function renderRunSpans(
  runs: Run[],
  pageText: string,
  totalText: string,
  big: boolean,
): ReactNode[] {
  return runs.map((r, i) => (
    <span key={i} style={runCss(r, big)}>
      {sampleText(r.text, pageText, totalText)}
    </span>
  ))
}

function paraCss(p: HfParagraph, big: boolean): CSSProperties {
  const style: CSSProperties = {
    textAlign: (p.align === 'distribute' ? 'justify' : p.align) as CSSProperties['textAlign'],
    lineHeight: p.lineSpacing ?? 1,
    margin: 0,
    paddingTop: p.spaceBefore ? `${Math.min(big ? 7 : 4, p.spaceBefore / (big ? 50 : 90))}px` : undefined,
    paddingBottom: p.spaceAfter
      ? `${Math.min(big ? 7 : 4, p.spaceAfter / (big ? 50 : 90))}px`
      : undefined,
    background: p.shadingFill ? `#${p.shadingFill}` : undefined,
  }
  if (p.indentLeft) style.paddingLeft = `${(p.indentLeft / PAGE_WIDTH_TWIPS) * 100}%`
  if (p.indentRight) style.paddingRight = `${(p.indentRight / PAGE_WIDTH_TWIPS) * 100}%`
  if (p.borders) {
    const sides = p.borders
    const line = (side: 't' | 'b' | 'l' | 'r') => {
      if (!sides.includes(side)) return undefined
      const spec = p.borderLines?.[side]
      const width = Math.max(1, (spec?.szPt ?? 0.5) * (big ? 2 : 1.2))
      return `${width}px solid #${spec?.color ?? 'CBD5E1'}`
    }
    style.borderTop = line('t')
    style.borderBottom = line('b')
    style.borderLeft = line('l')
    style.borderRight = line('r')
    style.paddingLeft = style.paddingLeft
      ? `calc(${style.paddingLeft} + ${big ? 6 : 3}px)`
      : `${big ? 6 : 3}px`
    style.paddingRight = style.paddingRight
      ? `calc(${style.paddingRight} + ${big ? 6 : 3}px)`
      : `${big ? 6 : 3}px`
  }
  return style
}

function HfPreview({
  value,
  samplePage,
  sampleTotal,
  big,
}: {
  value: HeaderFooter
  samplePage: string
  sampleTotal: string
  big: boolean
}) {
  const paras = value.paras?.length
    ? value.paras
    : [{ align: 'center' as const, runs: value.text ? [{ text: value.text }] : [] }]
  return (
    <div className="pdz-hf">
      {paras.map((p, i) => {
        const segments = splitTabs(p.runs)
        return (
          <div key={i} className="pdz-hf-para" style={paraCss(p, big)}>
            {segments.length > 1 ? (
              <div className="pdz-hf-tabs">
                {segments.map((runs, j) => (
                  <span key={j} className="pdz-hf-seg">
                    {renderRunSpans(runs, samplePage, sampleTotal, big)}
                  </span>
                ))}
              </div>
            ) : (
              renderRunSpans(p.runs, samplePage, sampleTotal, big)
            )}
          </div>
        )
      })}
    </div>
  )
}

function PageMock({
  header,
  footer,
  samplePage,
  sampleTotal,
  big = false,
  label,
}: {
  header?: HeaderFooter
  footer?: HeaderFooter
  samplePage: string
  sampleTotal: string
  big?: boolean
  label?: string
}) {
  return (
    <div className={`pdz-page${big ? ' pdz-page--big' : ''}`} aria-hidden="true">
      <div className={`pdz-zone pdz-zone--head${header ? ' has-content' : ''}`}>
        {header && (
          <HfPreview
            value={header}
            samplePage={samplePage}
            sampleTotal={sampleTotal}
            big={big}
          />
        )}
      </div>
      <div className="pdz-page-body">
        {label && <div className="pdz-faux-eyebrow">{label}</div>}
        <div className="pdz-faux-title" />
        <div className="pdz-faux-line" style={{ width: '94%' }} />
        <div className="pdz-faux-line" style={{ width: '88%' }} />
        <div className="pdz-faux-line" style={{ width: '91%' }} />
        <div className="pdz-faux-line" style={{ width: '72%' }} />
        {big && (
          <>
            <div className="pdz-faux-gap" />
            <div className="pdz-faux-line" style={{ width: '90%' }} />
            <div className="pdz-faux-line" style={{ width: '84%' }} />
            <div className="pdz-faux-line" style={{ width: '93%' }} />
            <div className="pdz-faux-line" style={{ width: '67%' }} />
          </>
        )}
      </div>
      <div className={`pdz-zone pdz-zone--foot${footer ? ' has-content' : ''}`}>
        {footer && (
          <HfPreview
            value={footer}
            samplePage={samplePage}
            sampleTotal={sampleTotal}
            big={big}
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export interface PageDesignDialogProps {
  open: boolean
  initialTab?: PageDesignerTab
  hasDoc: boolean
  onClose: () => void
  onApplyHeader: (value: HeaderFooter) => void
  onApplyFooter: (value: HeaderFooter) => void
  onPageNumFormat?: () => void
  onSetPageNumeral?: (fmt: Exclude<Numeral, 'keep'>, scope?: AppliedScope) => void
  onSetPageStart?: (start: number, scope?: AppliedScope) => void
  onApplyHfVariant?: (
    kind: 'header' | 'footer',
    variant: 'default' | 'first' | 'even',
    value: HeaderFooter,
    scope: AppliedScope,
  ) => void
  onHfAction?: (action: HfAction) => void
  section?: SectionSettings | null
  onSection?: (next: SectionSettings) => void
  onSectionAll?: (next: SectionSettings) => void
  onThemeFonts?: (fonts: ThemeFonts) => void
  onThemeColors?: (colors: ThemeColors) => void
}

export function PageDesignDialog({
  open,
  initialTab = 'numbers',
  hasDoc,
  onClose,
  onApplyHeader,
  onApplyFooter,
  onPageNumFormat,
  onSetPageNumeral,
  onSetPageStart,
  onApplyHfVariant,
  onHfAction,
  section,
  onSection,
  onSectionAll,
  onThemeFonts,
  onThemeColors,
}: PageDesignDialogProps) {
  const [tab, setTab] = useState<PageDesignerTab>(initialTab)
  const [selectedNumberId, setSelectedNumberId] = useState(PAGE_NUMBER_DESIGNS[0]!.id)
  const [selectedLayoutId, setSelectedLayoutId] = useState(LAYOUT_DESIGNS[0]!.id)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [favourites, setFavourites] = useState<string[]>(() =>
    readStored<string[]>(FAVOURITES_KEY, []),
  )
  const [recents, setRecents] = useState<string[]>(() => readStored<string[]>(RECENTS_KEY, []))
  const [customDesigns, setCustomDesigns] = useState<CustomDesign[]>(() =>
    readStored<CustomDesign[]>(CUSTOM_KEY, []),
  )
  const [options, setOptions] = useState<DesignOptions>({
    accent: '6D5EF5',
    font: 'Segoe UI',
    scale: 'standard',
    showTotal: true,
    label: '',
    target: 'footer',
    align: 'auto',
    numeral: 'keep',
    scope: 'document',
    startAt: '',
    hideOnCover: false,
  })
  const [pageDraft, setPageDraft] = useState(() => draftFromSection(section))
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    setPageDraft(draftFromSection(section))
  }, [open, section])

  useEffect(() => writeStored(FAVOURITES_KEY, favourites), [favourites])
  useEffect(() => writeStored(RECENTS_KEY, recents), [recents])
  useEffect(() => writeStored(CUSTOM_KEY, customDesigns), [customDesigns])

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 20)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(focusTimer)
    }
  }, [open, onClose])

  const customNumbers = useMemo<PageNumberDesign[]>(
    () =>
      customDesigns
        .filter((c) => c.type === 'numbers')
        .flatMap((c) => {
          const base = PAGE_NUMBER_DESIGNS.find((d) => d.id === c.baseId)
          if (!base) return []
          return [{
            ...base,
            id: c.id,
            name: c.name,
            description: c.description,
            category: 'Custom',
            defaults: c.defaults,
            custom: true,
            baseId: c.baseId,
          }]
        }),
    [customDesigns],
  )
  const customLayouts = useMemo<LayoutDesign[]>(
    () =>
      customDesigns
        .filter((c) => c.type === 'layouts')
        .flatMap((c) => {
          const base = LAYOUT_DESIGNS.find((d) => d.id === c.baseId)
          if (!base) return []
          return [{
            ...base,
            id: c.id,
            name: c.name,
            description: c.description,
            category: 'Custom',
            defaults: c.defaults,
            custom: true,
            baseId: c.baseId,
          }]
        }),
    [customDesigns],
  )
  const allNumbers = useMemo(() => [...customNumbers, ...PAGE_NUMBER_DESIGNS], [customNumbers])
  const allLayouts = useMemo(() => [...customLayouts, ...LAYOUT_DESIGNS], [customLayouts])
  const numberDesign = allNumbers.find((d) => d.id === selectedNumberId) ?? allNumbers[0]!
  const layoutDesign = allLayouts.find((d) => d.id === selectedLayoutId) ?? allLayouts[0]!

  const sampleOptions = useMemo(
    () => ({ ...options, label: options.label.trim() || 'Annual Report' }),
    [options],
  )

  const selectedNumber = useMemo(
    () => numberDesign.build(sampleOptions),
    [numberDesign, sampleOptions],
  )
  const selectedLayout = useMemo(
    () => layoutDesign.build(sampleOptions),
    [layoutDesign, sampleOptions],
  )

  const matchesFilter = (d: DesignBase) => {
    const q = query.trim().toLowerCase()
    if (q && !`${d.name} ${d.description} ${d.category}`.toLowerCase().includes(q)) return false
    if (category === 'All') return true
    if (category === 'Favourites') return favourites.includes(d.id)
    if (category === 'Recent') return recents.includes(d.id)
    if (category === 'Custom') return !!d.custom
    return d.category === category
  }

  const numberDesigns = useMemo(
    () => allNumbers.filter(matchesFilter),
    [allNumbers, category, query, favourites, recents],
  )
  const layoutDesigns = useMemo(
    () => allLayouts.filter(matchesFilter),
    [allLayouts, category, query, favourites, recents],
  )
  const categories = useMemo(
    () => [
      'All',
      'Favourites',
      'Recent',
      'Custom',
      ...Array.from(
        new Set((tab === 'numbers' ? allNumbers : allLayouts).map((d) => d.category)),
      ),
    ],
    [tab, allNumbers, allLayouts],
  )

  if (!open) return null

  const pickNumber = (design: PageNumberDesign) => {
    setSelectedNumberId(design.id)
    if (design.defaults) setOptions((prev) => ({ ...prev, ...design.defaults }))
  }

  const pickLayout = (design: LayoutDesign) => {
    setSelectedLayoutId(design.id)
    if (design.defaults) setOptions((prev) => ({ ...prev, ...design.defaults }))
  }

  const currentDesign = tab === 'numbers' ? numberDesign : layoutDesign

  const applyOne = (
    kind: 'header' | 'footer',
    variant: 'default' | 'first' | 'even',
    value: HeaderFooter,
  ) => {
    if (onApplyHfVariant) {
      onApplyHfVariant(kind, variant, value, options.scope)
    } else if (variant === 'default') {
      if (kind === 'header') onApplyHeader(value)
      else onApplyFooter(value)
    }
  }

  const apply = () => {
    if (!hasDoc) return
    if (options.scope === 'document' && (tab === 'layouts' || options.hideOnCover)) {
      const message =
        tab === 'layouts'
          ? 'Apply this header and footer layout to the entire document?'
          : 'Hide the page number on the first page of the entire document?'
      if (!window.confirm(message)) return
    }
    if (options.numeral !== 'keep') onSetPageNumeral?.(options.numeral, options.scope)
    const start = options.startAt.trim() === '' ? NaN : Math.max(0, parseInt(options.startAt, 10))
    if (Number.isFinite(start)) onSetPageStart?.(start, options.scope)

    if (tab === 'numbers') {
      const value = numberDesign.build(options)
      applyOne(options.target, 'default', value)
      if (
        onApplyHfVariant &&
        (options.align === 'inside' || options.align === 'outside')
      ) {
        onHfAction?.({ type: 'evenOddHf', on: true })
        applyOne(options.target, 'even', numberDesign.build(mirroredOptions(options)))
      }
      if (options.hideOnCover && onApplyHfVariant) {
        onHfAction?.({ type: 'titlePg', on: true })
        applyOne(options.target, 'first', { text: '', paras: [] })
      }
    } else {
      const { header, footer } = layoutDesign.build(options)
      applyOne('header', 'default', header)
      applyOne('footer', 'default', footer)
      if (options.hideOnCover && onApplyHfVariant) {
        onHfAction?.({ type: 'titlePg', on: true })
        applyOne('header', 'first', { text: '', paras: [] })
        applyOne('footer', 'first', { text: '', paras: [] })
      }
    }
    setRecents((prev) => [currentDesign.id, ...prev.filter((id) => id !== currentDesign.id)].slice(0, 12))
    onClose()
  }

  /** A theme writes the document theme fonts/colors and a matching header/footer layout. */
  const applyTheme = (theme: StudioTheme) => {
    const themeLayout = allLayouts.find((d) => d.id === theme.layoutId) ?? layoutDesign
    const themeOptions: DesignOptions = {
      ...options,
      accent: theme.accent,
      font: theme.minor,
      scope: 'document',
    }
    const { header, footer } = themeLayout.build(themeOptions)
    if (onApplyHfVariant) {
      onApplyHfVariant('header', 'default', header, 'document')
      onApplyHfVariant('footer', 'default', footer, 'document')
    } else {
      onApplyHeader(header)
      onApplyFooter(footer)
    }
    onThemeFonts?.({ major: theme.major, minor: theme.minor })
    onThemeColors?.(theme.colors)
    setOptions((prev) => ({
      ...prev,
      accent: theme.accent,
      font: theme.minor,
      scope: 'document',
    }))
    setSelectedLayoutId(themeLayout.id)
    setRecents((prev) => [themeLayout.id, ...prev.filter((id) => id !== themeLayout.id)].slice(0, 12))
  }

  /** Page setup writes real sectPr geometry (paper, orientation, margins, header/footer distance). */
  const applyPageSetup = () => {
    if (!section) return
    const next: SectionSettings = {
      ...section,
      pageWidth: pageDraft.width,
      pageHeight: pageDraft.height,
      orientation: pageDraft.orientation,
      marginTop: pageDraft.marginTop,
      marginRight: pageDraft.marginRight,
      marginBottom: pageDraft.marginBottom,
      marginLeft: pageDraft.marginLeft,
      gutter: pageDraft.gutter,
      headerDist: pageDraft.headerDist,
      footerDist: pageDraft.footerDist,
    }
    if (options.scope === 'document' && onSectionAll) {
      if (!window.confirm('Apply this page setup to every section of the document?')) return
      onSectionAll(next)
    } else {
      onSection?.(next)
    }
  }

  const pickPaper = (preset: (typeof PAPER_PRESETS)[number]) => {
    setPageDraft((prev) => ({
      ...prev,
      paperId: preset.id,
      width: prev.orientation === 'landscape' ? preset.height : preset.width,
      height: prev.orientation === 'landscape' ? preset.width : preset.height,
    }))
  }

  const flipOrientation = () => {
    setPageDraft((prev) => ({
      ...prev,
      orientation: prev.orientation === 'portrait' ? 'landscape' : 'portrait',
      width: prev.height,
      height: prev.width,
    }))
  }

  const toggleFavourite = (id: string) => {
    setFavourites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const saveAsTemplate = () => {
    const design = currentDesign
    const name = window.prompt('Name this design template', `${design.name} custom`)?.trim()
    if (!name) return
    const baseId = design.custom ? design.baseId! : design.id
    const defaults: DesignDefaults = {
      accent: options.accent,
      font: options.font,
      scale: options.scale,
      showTotal: options.showTotal,
      numeral: options.numeral,
      align: options.align,
      ...(tab === 'numbers' ? { target: options.target } : {}),
    }
    const custom: CustomDesign = {
      id: `custom-${Date.now()}`,
      name,
      description: `Saved from ${design.name}.`,
      type: tab,
      baseId,
      defaults,
      createdAt: Date.now(),
    }
    setCustomDesigns((prev) => [custom, ...prev])
    setCategory('Custom')
    if (tab === 'numbers') setSelectedNumberId(custom.id)
    else setSelectedLayoutId(custom.id)
  }

  const renameCurrent = () => {
    if (!currentDesign.custom) return
    const name = window.prompt('Rename custom template', currentDesign.name)?.trim()
    if (!name) return
    setCustomDesigns((prev) =>
      prev.map((c) => (c.id === currentDesign.id ? { ...c, name } : c)),
    )
  }

  const deleteCurrent = () => {
    if (!currentDesign.custom) return
    if (!window.confirm(`Delete “${currentDesign.name}” from custom templates?`)) return
    setCustomDesigns((prev) => prev.filter((c) => c.id !== currentDesign.id))
    setFavourites((prev) => prev.filter((id) => id !== currentDesign.id))
    setRecents((prev) => prev.filter((id) => id !== currentDesign.id))
    if (tab === 'numbers') setSelectedNumberId(PAGE_NUMBER_DESIGNS[0]!.id)
    else setSelectedLayoutId(LAYOUT_DESIGNS[0]!.id)
  }

  const dialog = (
    <div
      className="pdz-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="pdz-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Page and section designer"
        tabIndex={-1}
        dir={document.documentElement.dir || undefined}
      >
        <header className="pdz-header">
          <div className="pdz-brand">
            <span className="pdz-brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <div>
              <div className="pdz-eyebrow">Plot Docs · PAGE DESIGNER</div>
              <h2>Page &amp; section designer</h2>
              <p>Live page fields, native Word output, zero flattening.</p>
            </div>
          </div>
          <button className="pdz-close" onClick={onClose} aria-label="Close designer">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="pdz-tabs" role="tablist" aria-label="Designer sections">
          <button
            role="tab"
            aria-selected={tab === 'numbers'}
            className={`pdz-tab${tab === 'numbers' ? ' is-active' : ''}`}
            onClick={() => {
              setTab('numbers')
              setCategory('All')
            }}
          >
            <span className="pdz-tab-icon">#</span>
            Page numbers
            <span className="pdz-tab-count">{PAGE_NUMBER_DESIGNS.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'layouts'}
            className={`pdz-tab${tab === 'layouts' ? ' is-active' : ''}`}
            onClick={() => {
              setTab('layouts')
              setCategory('All')
            }}
          >
            <span className="pdz-tab-icon">H</span>
            Header &amp; footer layouts
            <span className="pdz-tab-count">{LAYOUT_DESIGNS.length}</span>
          </button>
          <div className="pdz-tabs-note">
            <span className="pdz-live-dot" />
            PAGE / NUMPAGES stay live
          </div>
        </div>

        <div className="pdz-body">
          <section className="pdz-gallery" aria-label="Design gallery">
            <div className="pdz-gallery-toolbar">
              <div className="pdz-categories">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`pdz-chip${category === c ? ' is-active' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="pdz-search">
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search designs…"
                  aria-label="Search designs"
                />
              </label>
            </div>

            {tab === 'numbers' ? (
              <div className="pdz-grid pdz-grid--numbers">
                {numberDesigns.map((design) => {
                  const previewOptions = { ...sampleOptions, ...design.defaults, label: sampleOptions.label }
                  const sample = design.build(previewOptions)
                  const previewTarget = previewOptions.target
                  const active = design.id === numberDesign.id
                  return (
                    <button
                      key={design.id}
                      type="button"
                      className={`pdz-card${active ? ' is-selected' : ''}`}
                      onClick={() => pickNumber(design)}
                      aria-pressed={active}
                    >
                      <div className="pdz-card-preview">
                        <PageMock
                          header={previewTarget === 'header' ? sample : undefined}
                          footer={previewTarget === 'footer' ? sample : undefined}
                          samplePage={formatSample(12, previewOptions.numeral)}
                          sampleTotal={DEFAULT_SAMPLE_TOTAL}
                        />
                      </div>
                      <div className="pdz-card-copy">
                        <span className="pdz-card-name">{design.name}</span>
                        <span className="pdz-card-desc">{design.description}</span>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        className={`pdz-fav${favourites.includes(design.id) ? ' is-fav' : ''}`}
                        aria-label={
                          favourites.includes(design.id)
                            ? `Remove ${design.name} from favourites`
                            : `Add ${design.name} to favourites`
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavourite(design.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavourite(design.id)
                          }
                        }}
                      >
                        {favourites.includes(design.id) ? '★' : '☆'}
                      </span>
                      {design.custom && <span className="pdz-custom-pill">CUSTOM</span>}
                      {active && <span className="pdz-selected-check">✓</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="pdz-grid pdz-grid--layouts">
                {layoutDesigns.map((design) => {
                  const previewOptions = { ...sampleOptions, ...design.defaults, label: sampleOptions.label }
                  const sample = design.build(previewOptions)
                  const active = design.id === layoutDesign.id
                  return (
                    <button
                      key={design.id}
                      type="button"
                      className={`pdz-card pdz-card--layout${active ? ' is-selected' : ''}`}
                      onClick={() => pickLayout(design)}
                      aria-pressed={active}
                    >
                      <div className="pdz-card-preview pdz-card-preview--layout">
                        <PageMock
                          header={sample.header}
                          footer={sample.footer}
                          samplePage={formatSample(12, previewOptions.numeral)}
                          sampleTotal={DEFAULT_SAMPLE_TOTAL}
                          label={options.label.trim() || 'ANNUAL REPORT'}
                        />
                      </div>
                      <div className="pdz-card-copy">
                        <span className="pdz-card-name">{design.name}</span>
                        <span className="pdz-card-desc">{design.description}</span>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        className={`pdz-fav${favourites.includes(design.id) ? ' is-fav' : ''}`}
                        aria-label={
                          favourites.includes(design.id)
                            ? `Remove ${design.name} from favourites`
                            : `Add ${design.name} to favourites`
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavourite(design.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavourite(design.id)
                          }
                        }}
                      >
                        {favourites.includes(design.id) ? '★' : '☆'}
                      </span>
                      {design.custom && <span className="pdz-custom-pill">CUSTOM</span>}
                      {active && <span className="pdz-selected-check">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {((tab === 'numbers' && numberDesigns.length === 0) ||
              (tab === 'layouts' && layoutDesigns.length === 0)) && (
              <div className="pdz-empty">No designs match that search.</div>
            )}
          </section>

          <aside className="pdz-side" aria-label="Design options">
            <div className="pdz-preview-head">
              <div>
                <span className="pdz-section-label">Live preview</span>
                <div className="pdz-preview-title">
                  {tab === 'numbers' ? numberDesign.name : layoutDesign.name}
                </div>
              </div>
              <span className="pdz-preview-tag">PAGE 12 / 24</span>
            </div>

            <div className="pdz-preview-stage">
              <PageMock
                header={
                  tab === 'numbers'
                    ? options.target === 'header'
                      ? selectedNumber
                      : undefined
                    : selectedLayout.header
                }
                footer={
                  tab === 'numbers'
                    ? options.target === 'footer'
                      ? selectedNumber
                      : undefined
                    : selectedLayout.footer
                }
                samplePage={formatSample(12, options.numeral)}
                sampleTotal={DEFAULT_SAMPLE_TOTAL}
                big
                label={options.label.trim() || 'ANNUAL REPORT'}
              />
              <div className="pdz-preview-glow" aria-hidden="true" />
            </div>

            <div className="pdz-controls">
              <div className="pdz-control-row">
                <span className="pdz-control-label">Document label</span>
                <input
                  className="pdz-text-input"
                  value={options.label}
                  onChange={(e) => setOptions({ ...options, label: e.target.value })}
                  placeholder="Annual Report 2026"
                  maxLength={80}
                />
              </div>

              {tab === 'numbers' && (
                <>
                  <div className="pdz-control-row pdz-control-row--split">
                    <span className="pdz-control-label">Apply to</span>
                    <div className="pdz-seg" role="group" aria-label="Apply to">
                      {(['footer', 'header'] as Target[]).map((t) => (
                        <button
                          key={t}
                          className={options.target === t ? 'is-active' : ''}
                          onClick={() => setOptions({ ...options, target: t })}
                        >
                          {t === 'footer' ? 'Footer' : 'Header'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pdz-control-row pdz-control-row--split">
                    <span className="pdz-control-label">Alignment</span>
                    <select
                      className="pdz-select"
                      value={options.align}
                      onChange={(e) =>
                        setOptions({ ...options, align: e.target.value as DesignAlignMode })
                      }
                      aria-label="Alignment"
                    >
                      <option value="auto">Design default</option>
                      <option value="left">Left</option>
                      <option value="center">Centre</option>
                      <option value="right">Right</option>
                      <option value="inside">Inside (mirrors on even pages)</option>
                      <option value="outside">Outside (mirrors on even pages)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pdz-control-row pdz-control-row--split">
                <span className="pdz-control-label">Apply to</span>
                <div className="pdz-seg" role="group" aria-label="Apply scope">
                  {([
                    ['document', 'Whole document'],
                    ['section', 'This section'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      className={options.scope === value ? 'is-active' : ''}
                      onClick={() => setOptions({ ...options, scope: value })}
                      disabled={value === 'section' && !onApplyHfVariant}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {onApplyHfVariant && (
                <div className="pdz-control-row pdz-control-row--split">
                  <span className="pdz-control-label">Hide on cover</span>
                  <button
                    className={`pdz-switch${options.hideOnCover ? ' is-on' : ''}`}
                    role="switch"
                    aria-checked={options.hideOnCover}
                    onClick={() => setOptions({ ...options, hideOnCover: !options.hideOnCover })}
                    aria-label="Hide page number on the cover page"
                  >
                    <span />
                  </button>
                </div>
              )}

              <div className="pdz-control-row">
                <span className="pdz-control-label">Accent</span>
                <div className="pdz-swatches">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      className={`pdz-swatch${options.accent === a.value ? ' is-active' : ''}`}
                      style={{ background: `#${a.value}` }}
                      onClick={() => setOptions({ ...options, accent: a.value })}
                      title={a.label}
                      aria-label={`${a.label} accent`}
                    />
                  ))}
                  <label className="pdz-swatch pdz-swatch--custom" title="Custom accent">
                    <input
                      type="color"
                      value={`#${options.accent}`}
                      onChange={(e) =>
                        setOptions({ ...options, accent: e.target.value.replace('#', '').toUpperCase() })
                      }
                      aria-label="Custom accent color"
                    />
                  </label>
                </div>
              </div>

              <div className="pdz-control-row pdz-control-row--split">
                <span className="pdz-control-label">Typeface</span>
                <select
                  className="pdz-select"
                  value={options.font}
                  onChange={(e) => setOptions({ ...options, font: e.target.value })}
                  aria-label="Typeface"
                >
                  {FONTS.map((f) => (
                    <option value={f.value} key={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pdz-control-row pdz-control-row--split">
                <span className="pdz-control-label">Scale</span>
                <div className="pdz-seg" role="group" aria-label="Scale">
                  {([
                    ['compact', 'S'],
                    ['standard', 'M'],
                    ['large', 'L'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      className={options.scale === value ? 'is-active' : ''}
                      onClick={() => setOptions({ ...options, scale: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pdz-control-row pdz-control-row--split">
                <span className="pdz-control-label">Page numbering</span>
                <select
                  className="pdz-select"
                  value={options.numeral}
                  onChange={(e) =>
                    setOptions({ ...options, numeral: e.target.value as Numeral })
                  }
                  aria-label="Page numbering format"
                >
                  {NUMERALS.map((n) => (
                    <option value={n.value} key={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>

              {onSetPageStart && (
                <div className="pdz-control-row pdz-control-row--split">
                  <span className="pdz-control-label">Start at</span>
                  <input
                    className="pdz-text-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={options.startAt}
                    onChange={(e) => setOptions({ ...options, startAt: e.target.value })}
                    placeholder="Continue numbering"
                    aria-label="Start page numbering at"
                  />
                </div>
              )}

              <div className="pdz-control-row pdz-control-row--split">
                <span className="pdz-control-label">Include total pages</span>
                <button
                  className={`pdz-switch${options.showTotal ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={options.showTotal}
                  onClick={() => setOptions({ ...options, showTotal: !options.showTotal })}
                >
                  <span />
                </button>
              </div>

              {tab === 'layouts' && (
                <div className="pdz-info-note">
                  <span className="pdz-info-dot" />
                  Applies both a masthead and footer, with one live page field.
                </div>
              )}

              {(onThemeFonts || onThemeColors) && (
                <div className="pdz-block">
                  <div className="pdz-block-head">
                    <span className="pdz-control-label">Coordinated themes</span>
                    <span className="pdz-block-hint">fonts · colors · headers</span>
                  </div>
                  <div className="pdz-theme-grid">
                    {STUDIO_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        className="pdz-theme"
                        onClick={() => applyTheme(theme)}
                        title={theme.description}
                      >
                        <span className="pdz-theme-dots" aria-hidden="true">
                          <i style={{ background: `#${theme.colors.accent1}` }} />
                          <i style={{ background: `#${theme.colors.accent2}` }} />
                          <i style={{ background: `#${theme.colors.accent6}` }} />
                        </span>
                        <span className="pdz-theme-name">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {section && (onSection || onSectionAll) && (
                <div className="pdz-block">
                  <div className="pdz-block-head">
                    <span className="pdz-control-label">Page setup</span>
                    <span className="pdz-block-hint">
                      {inchesOf(pageDraft.width)} × {inchesOf(pageDraft.height)} in
                    </span>
                  </div>
                  <div className="pdz-paper-row">
                    {PAPER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className={`pdz-paper${pageDraft.paperId === preset.id ? ' is-active' : ''}`}
                        onClick={() => pickPaper(preset)}
                      >
                        {preset.name}
                      </button>
                    ))}
                    <button className="pdz-paper pdz-paper--wide" onClick={flipOrientation}>
                      {pageDraft.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    </button>
                  </div>
                  <div className="pdz-margin-grid">
                    <NumberField
                      label="Top"
                      value={pageDraft.marginTop}
                      onChange={(v) => setPageDraft((p) => ({ ...p, marginTop: v }))}
                    />
                    <NumberField
                      label="Right"
                      value={pageDraft.marginRight}
                      onChange={(v) => setPageDraft((p) => ({ ...p, marginRight: v }))}
                    />
                    <NumberField
                      label="Bottom"
                      value={pageDraft.marginBottom}
                      onChange={(v) => setPageDraft((p) => ({ ...p, marginBottom: v }))}
                    />
                    <NumberField
                      label="Left"
                      value={pageDraft.marginLeft}
                      onChange={(v) => setPageDraft((p) => ({ ...p, marginLeft: v }))}
                    />
                  </div>
                  <div className="pdz-margin-grid">
                    <NumberField
                      label="Gutter"
                      value={pageDraft.gutter}
                      onChange={(v) => setPageDraft((p) => ({ ...p, gutter: v }))}
                    />
                    <NumberField
                      label="Header"
                      value={pageDraft.headerDist}
                      onChange={(v) => setPageDraft((p) => ({ ...p, headerDist: v }))}
                    />
                    <NumberField
                      label="Footer"
                      value={pageDraft.footerDist}
                      onChange={(v) => setPageDraft((p) => ({ ...p, footerDist: v }))}
                    />
                  </div>
                  <button className="pdz-apply-setup" onClick={applyPageSetup}>
                    Apply page setup
                  </button>
                </div>
              )}

              <div className="pdz-actions">
                <button className="pdz-apply" disabled={!hasDoc} onClick={apply}>
                  {tab === 'numbers' ? 'Apply page numbers' : 'Apply layout'}
                  <span aria-hidden="true">→</span>
                </button>
                {onPageNumFormat && (
                  <button className="pdz-secondary" onClick={onPageNumFormat}>
                    Number format…
                  </button>
                )}
                <button className="pdz-secondary" onClick={saveAsTemplate}>
                  Save as template
                </button>
                {currentDesign.custom && (
                  <div className="pdz-custom-actions">
                    <button className="pdz-link-btn" onClick={renameCurrent}>
                      Rename
                    </button>
                    <button className="pdz-link-btn pdz-link-btn--danger" onClick={deleteCurrent}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {!hasDoc && <div className="pdz-warning">Open a document to apply a design.</div>}
              <p className="pdz-footnote">
                Presets write native Word header/footer content. PAGE and NUMPAGES update in the
                editor and in Word, Excel export, and PDF.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
