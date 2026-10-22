import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@plotdocs/i18n'
import App from './App'
import { PresentView } from './PresentView'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import { applyAiPanelPrefs, installScreenTips } from '@plotdocs/ui'
import '@plotdocs/ui/tokens.css'
import '@plotdocs/ui/screentip.css'
import '@plotdocs/ui/ai-model-picker.css'
import '@plotdocs/ui/ai-queue-strip.css'
import '@plotdocs/ui/ai-usage.css'
import '@plotdocs/ui/dropdown.css'
import '@plotdocs/ui/find-panel.css'
import '@plotdocs/ui/color-picker.css'
import '@plotdocs/ui/ribbon-collapse.css'
import '@plotdocs/ui/ai-panel-prefs.css'
import '@plotdocs/ui/ai-scope-quote.css'
import '@plotdocs/ui/image-dialogs.css'
import './styles.css'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  const [lang, theme] = await Promise.all([
    window.htmlApi.getLanguage().catch(() => 'zh' as const),
    window.htmlApi.getTheme().catch(() => 'system' as const),
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  window.htmlApi.onThemeChanged(applyTheme)
  await window.htmlApi
    ?.getAiPanelPrefs?.()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.htmlApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  // a present tab/window (opened by Present → New tab) renders only its owner's preview
  const params = new URLSearchParams(location.search)
  const present = params.has('present')
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      {present ? <PresentView title={params.get('title') ?? ''} /> : <App />}
    </LocaleProvider>,
  )
})()
