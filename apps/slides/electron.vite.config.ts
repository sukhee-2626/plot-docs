import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const here = dirname(fileURLToPath(import.meta.url))

// Pin resolution to this repo's workspace sources (matches tsconfig paths;
// avoids bundling stale implementations when node_modules links point elsewhere)
const workspaceAlias = {
  // Subpath before the bare name: string aliases are prefix replacements
  '@plotdocs/pptx-engine/table-grid': resolve(
    here,
    '../../packages/pptx-engine/src/table-grid.ts',
  ),
  '@plotdocs/pptx-engine/identity': resolve(here, '../../packages/pptx-engine/src/identity.ts'),
  '@plotdocs/pptx-engine/named-action': resolve(
    here,
    '../../packages/pptx-engine/src/named-action.ts',
  ),
  '@plotdocs/pptx-engine/custgeom': resolve(here, '../../packages/pptx-engine/src/custgeom.ts'),
  '@plotdocs/pptx-engine/background-promote': resolve(
    here,
    '../../packages/pptx-engine/src/background-promote.ts',
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
  // Metafile (EMF/WMF) rasterizer shared with the docs engine (renderer-only: needs canvas)
  '@plotdocs/docx-engine/metafile': resolve(here, '../../packages/docx-engine/src/metafile.ts'),
  '@plotdocs/docx-engine/math': resolve(here, '../../packages/docx-engine/src/math.ts'),
}

export default defineConfig({
  // Main process/preload must bundle @plotdocs/* sources (they are pulled in as TS
  // source with extensionless relative imports; externalizing them under Node
  // yields ERR_MODULE_NOT_FOUND).
  main: {
    resolve: { alias: workspaceAlias },
    // Bundle opentype.js too (the packaged app ships only out/**, so external deps are unresolvable at runtime)
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@plotdocs/pptx-engine',
          '@plotdocs/pptx-ops',
          '@plotdocs/pptx-render',
          '@plotdocs/pipelines',
          '@plotdocs/ai-search',
          '@plotdocs/file-parse',
          '@plotdocs/electron-utils',
          'opentype.js',
        ],
      }),
    ],
  },
  preload: {
    // electron-utils ships raw TS source — must be bundled, not left external
    plugins: [externalizeDepsPlugin({ exclude: ['@plotdocs/electron-utils'] })],
  },
  renderer: {
    resolve: { alias: workspaceAlias },
    plugins: [react()],
    server: {
      port: Number(process.env.SLIDES_DEV_PORT) || 5175,
      strictPort: Boolean(process.env.SLIDES_DEV_PORT),
    },
  },
})
