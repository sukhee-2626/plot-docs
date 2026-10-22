import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// resolve sibling source packages by path (not via node_modules), so a git
// worktree whose node_modules is linked to another checkout still tests
// against this checkout's edits (same convention as packages/pdf2docx)
const local = (rel: string) => fileURLToPath(new URL(rel, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@plotdocs/docx-engine/lazy-media': local('../../packages/docx-engine/src/lazy-media.ts'),
      '@plotdocs/docx-engine': local('../../packages/docx-engine/src/index.ts'),
      '@plotdocs/font-metrics': local('../../packages/font-metrics/src/index.ts'),
      // subpath before the bare name: string aliases are prefix replacements
      '@plotdocs/electron-utils/headless-export': local(
        '../../packages/electron-utils/src/headless-export.ts',
      ),
      '@plotdocs/electron-utils/atomic-write': local(
        '../../packages/electron-utils/src/atomic-write.ts',
      ),
      '@plotdocs/electron-utils/safe-external-url': local(
        '../../packages/electron-utils/src/safe-external-url.ts',
      ),
      '@plotdocs/electron-utils/print-job': local(
        '../../packages/electron-utils/src/print-job.ts',
      ),
      '@plotdocs/electron-utils': local('../../packages/electron-utils/src/index.ts'),
      '@plotdocs/ai-provider/browser': local('../../packages/ai-provider/src/browser.ts'),
      '@plotdocs/ai-provider': local('../../packages/ai-provider/src/index.ts'),
      '@plotdocs/i18n': local('../../packages/i18n/src/index.ts'),
      '@plotdocs/ui': local('../../packages/ui/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
    testTimeout: 20000,
  },
})
