import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    // @plotdocs/* workspace packages ship TS source (no build step, no
    // compiled entry point) — externalizing them makes Node's ESM loader try
    // to resolve their relative imports at runtime and fail. Bundle those;
    // externalize everything else (Electron, zod, node builtins).
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@plotdocs/ai-provider',
          '@plotdocs/agent-core',
          '@plotdocs/ai-search',
          '@plotdocs/docx-engine',
          '@plotdocs/file-parse',
          '@plotdocs/electron-utils',
          '@plotdocs/i18n',
          '@plotdocs/pptx-render',
          '@plotdocs/xlsx-gateway',
        ],
      }),
    ],
  },
  preload: {
    // Sandboxed preload scripts cannot require arbitrary npm packages at
    // runtime, so the drop-open bridge must be bundled, not externalized.
    plugins: [externalizeDepsPlugin({ exclude: ['@plotdocs/electron-utils'] })],
  },
  renderer: {
    plugins: [react()],
  },
})
