/// <reference types="vite/client" />

import type { ProjectApi } from '@plotdocs/project-store'
import type { MarkdownApi } from '../shared/ipc'

declare global {
  interface Window {
    markdownApi: MarkdownApi
    projectApi?: Pick<ProjectApi, 'resolveChat' | 'appendChat' | 'loadChat' | 'rebindChat'>
  }
}

export {}
