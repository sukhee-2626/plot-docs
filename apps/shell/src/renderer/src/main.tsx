import React from 'react'
import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang } from '@plotdocs/i18n'
import { AppFrame } from './AppFrame'
import { LocaleProvider } from './locale'
import '@plotdocs/ui/tokens.css'
import '@plotdocs/ui/screentip.css'
import '@plotdocs/ui/dropdown.css'
import '@plotdocs/ui/ai-model-picker.css'
import '@plotdocs/ui/ai-usage.css'
import './home.css'
import './tabbar.css'
import { installScreenTips } from '@plotdocs/ui'

installScreenTips()

// macOS shell window is created with vibrancy; a transparent body lets the
// editor views' translucent regions (e.g. slides thumbnail pane) show it
const IS_MAC = navigator.platform.toLowerCase().includes('mac')
if (IS_MAC) document.body.classList.add('vib')
// non-mac: the tab strip doubles as the title bar (caption buttons overlay it)
document.body.classList.add(IS_MAC ? 'mac' : 'overlay-title-bar')

// resolve the persisted language, first-run flag, and theme before first paint
// so the UI never flashes (home showing briefly before the onboarding overlay)
void Promise.all([
  window.aiOffice.getLanguage(),
  // if the flag is unreadable, skip onboarding rather than block the home screen
  window.aiOffice.onboardingSeen().catch(() => true),
  window.aiOffice.getTheme().catch(() => 'system' as const),
]).then(([lang, onboardingSeen, theme]) => {
  document.documentElement.lang = htmlLang(lang)
  document.documentElement.dir = htmlDir(lang)
  // Apply the theme before first paint to avoid a flash. `data-theme` keeps
  // the user's explicit choice (system removes it); `data-color-mode` is the
  // resolved light/dark value every stylesheet can rely on, including Home's
  // premium surface and system-mode follow.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  let currentTheme = theme
  const applyTheme = (next: typeof theme): void => {
    currentTheme = next
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
    const dark = next === 'dark' || (next === 'system' && media.matches)
    document.documentElement.setAttribute('data-color-mode', dark ? 'dark' : 'light')
  }
  applyTheme(theme)
  window.aiOffice.onThemeChanged(applyTheme)
  media.addEventListener('change', () => {
    if (currentTheme === 'system') applyTheme('system')
  })
  // The manual tab is the same bundle branched on ?mode=help: no onboarding,
  // no home state, just the searchable topic browser (issue #1520).
  //
  // Split, though: this entry chunk is parsed on every launch whatever the tab
  // is, and the screen plus its stylesheet are only ever wanted on the other
  // one. A static import meant Home's first paint paid for a manual nobody had
  // opened.
  const isHelp = new URLSearchParams(location.search).get('mode') === 'help'
  const HelpScreen = React.lazy(() =>
    import('./i18n/help/HelpScreen').then((m) => ({ default: m.HelpScreen })),
  )
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <LocaleProvider initial={lang}>
        {isHelp ? (
          <React.Suspense fallback={<div className="boot" />}>
            <HelpScreen />
          </React.Suspense>
        ) : (
          <AppFrame initialOnboardingSeen={onboardingSeen} />
        )}
      </LocaleProvider>
    </React.StrictMode>,
  )
})
