import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Pin resolution to this repo's workspace sources (matches tsconfig paths)
  resolve: {
    alias: {
      // Subpath before the bare name: string aliases are prefix replacements
      '@plotdocs/pptx-engine/table-grid': resolve(
        here,
        '../../packages/pptx-engine/src/table-grid.ts',
      ),
      '@plotdocs/pptx-engine/identity': resolve(
        here,
        '../../packages/pptx-engine/src/identity.ts',
      ),
      '@plotdocs/pptx-engine/named-action': resolve(
        here,
        '../../packages/pptx-engine/src/named-action.ts',
      ),
      '@plotdocs/pptx-engine/background-promote': resolve(
        here,
        '../../packages/pptx-engine/src/background-promote.ts',
      ),
      '@plotdocs/pptx-engine/custgeom': resolve(
        here,
        '../../packages/pptx-engine/src/custgeom.ts',
      ),
      '@plotdocs/pptx-engine/model3d': resolve(here, '../../packages/pptx-engine/src/model3d.ts'),
      '@plotdocs/pptx-engine/chart-workbook': resolve(
        here,
        '../../packages/pptx-engine/src/chart-workbook.ts',
      ),
      '@plotdocs/pptx-engine': resolve(here, '../../packages/pptx-engine/src/index.ts'),
      '@plotdocs/pptx-ops/op-docs': resolve(here, '../../packages/pptx-ops/src/op-docs.ts'),
      '@plotdocs/pptx-ops/font-size': resolve(here, '../../packages/pptx-ops/src/font-size.ts'),
      '@plotdocs/pptx-ops': resolve(here, '../../packages/pptx-ops/src/index.ts'),
      '@plotdocs/pptx-render/preset-geometry': resolve(
        here,
        '../../packages/pptx-render/src/preset-geometry.ts',
      ),
      '@plotdocs/pptx-render': resolve(here, '../../packages/pptx-render/src/index.ts'),
      '@plotdocs/pipelines/slides/layout-audit': resolve(
        here,
        '../../packages/pipelines/src/slides/layout-audit.ts',
      ),
      '@plotdocs/pipelines/slides': resolve(here, '../../packages/pipelines/src/slides/index.ts'),
      '@plotdocs/docx-engine/metafile': resolve(
        here,
        '../../packages/docx-engine/src/metafile.ts',
      ),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
    testTimeout: 20000,
  },
})
