import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@plotdocs/pptx-engine/table-grid': resolve(here, '../pptx-engine/src/table-grid.ts'),
      '@plotdocs/pptx-engine/identity': resolve(here, '../pptx-engine/src/identity.ts'),
      '@plotdocs/pptx-engine/background-promote': resolve(
        here,
        '../pptx-engine/src/background-promote.ts',
      ),
      '@plotdocs/pptx-engine/custgeom': resolve(here, '../pptx-engine/src/custgeom.ts'),
      '@plotdocs/pptx-engine': resolve(here, '../pptx-engine/src/index.ts'),
      '@plotdocs/pptx-render/preset-geometry': resolve(
        here,
        '../pptx-render/src/preset-geometry.ts',
      ),
      '@plotdocs/pptx-render': resolve(here, '../pptx-render/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
