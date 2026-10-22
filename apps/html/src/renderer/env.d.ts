/// <reference types="vite/client" />

import type { ProjectApi } from '@plotdocs/project-store'
import type { HtmlApi } from '../shared/ipc'

declare global {
  interface Window {
    htmlApi: HtmlApi
    projectApi?: Pick<ProjectApi, 'resolveChat' | 'appendChat' | 'loadChat' | 'rebindChat'>
  }
}

export {}
