import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@plotdocs/i18n'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import '@plotdocs/ui/tokens.css'
import '@plotdocs/ui/screentip.css'
import '@plotdocs/ui/ai-model-picker.css'
import '@plotdocs/ui/ai-queue-strip.css'
import '@plotdocs/ui/ai-usage.css'
import '@plotdocs/ui/color-picker.css'
import '@plotdocs/ui/dropdown.css'
import '@plotdocs/ui/ribbon-collapse.css'
import '@plotdocs/ui/markdown.css'
import '@plotdocs/ui/ai-panel-prefs.css'
import '@plotdocs/ui/ai-scope-quote.css'
import './styles.css'
import { applyAiPanelPrefs, installScreenTips } from '@plotdocs/ui'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  const [lang, theme] = await Promise.all([
    window.pdfApi.getLanguage().catch(() => 'zh' as const),
    window.pdfApi.getTheme().catch(() => 'system' as const),
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  window.pdfApi.onThemeChanged(applyTheme)
  await window.pdfApi
    ?.getAiPanelPrefs?.()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.pdfApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
