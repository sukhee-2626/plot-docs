import { useCallback, useEffect, useState } from 'react'
import type { UpdatesCenterTab } from '../../shared/updates-center-api'
import { AnalyticsWorkspace } from './analytics/AnalyticsWorkspace'
import { Home } from './Home'
import { NotificationsCenterPanel, NotificationToast, UpdateToast } from './NotificationsCenter'
import { Onboarding } from './Onboarding'
import { SplashScreen } from './SplashScreen'
import { StarPromptCard } from './StarPromptCard'
import { TabBar } from './TabBar'
import { useUpdatesCenter } from './updates-center-client'

interface AppFrameProps {
  /** resolved before first paint (main.tsx) so home never flashes under the overlay */
  initialOnboardingSeen: boolean
}

export function AppFrame({ initialOnboardingSeen }: AppFrameProps) {
  const [homeActive, setHomeActive] = useState(true)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!initialOnboardingSeen)
  const [starPromptDocOpens, setStarPromptDocOpens] = useState<number | null>(null)
  const [launchComplete, setLaunchComplete] = useState(false)
  const updates = useUpdatesCenter()
  const [centerOpen, setCenterOpen] = useState(false)
  const [centerTab, setCenterTab] = useState<UpdatesCenterTab>('notifications')

  const openUpdatesCenter = useCallback((tab: UpdatesCenterTab) => {
    // A document tab's WebContentsView paints above the shell DOM. Bring Home
    // back first so the notification panel is actually visible.
    void window.aiOfficeTabs.activate('home').catch(() => undefined)
    setCenterTab(tab)
    setCenterOpen(true)
  }, [])

  const restartForUpdate = useCallback(() => {
    const api = updates.api
    if (!api) {
      openUpdatesCenter('updates')
      return
    }
    void api
      .restartApp()
      .then((result) => {
        if (!result.ok) openUpdatesCenter('updates')
      })
      .catch(() => openUpdatesCenter('updates'))
  }, [updates.api, openUpdatesCenter])

  useEffect(() => {
    if (!homeActive) setCenterOpen(false)
  }, [homeActive])

  useEffect(() => {
    if (analyticsOpen) setCenterOpen(false)
  }, [analyticsOpen])

  useEffect(() => {
    const api = updates.api
    if (!api) return
    return api.onOpenRequested(() =>
      openUpdatesCenter(updates.state?.updateAvailable ? 'updates' : 'notifications'),
    )
  }, [updates.api, updates.state?.updateAvailable, openUpdatesCenter])

  useEffect(() => {
    const applyTabs = (tabs: Awaited<ReturnType<typeof window.aiOfficeTabs.list>>) => {
      const active = tabs.find((tab) => tab.active)
      const nextHomeActive = !active || active.kind === 'home'
      setHomeActive(nextHomeActive)
      if (!nextHomeActive) setAnalyticsOpen(false)
    }
    void window.aiOfficeTabs.list().then(applyTabs)
    return window.aiOfficeTabs.onChanged(applyTabs)
  }, [])

  // The "star us" invitation is decided (and counted as shown) by the main
  // process; ask once per session, and never while onboarding is up — a
  // first-run user can't have met the value threshold anyway.
  useEffect(() => {
    if (showOnboarding) return
    let alive = true
    void window.aiOffice.starPromptShouldShow?.().then((result) => {
      if (alive && result.show) setStarPromptDocOpens(result.docOpens)
    })
    return () => {
      alive = false
    }
  }, [showOnboarding])

  const finishOnboarding = async (): Promise<boolean> => {
    try {
      const persisted = await window.aiOffice.setOnboardingSeen()
      if (!persisted) return false
      setShowOnboarding(false)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className={`app-frame${homeActive ? ' home-active' : ''}${launchComplete ? ' is-launched' : ''}`}>
      <TabBar
        notificationBadge={{
          unread: updates.state?.unreadCount ?? 0,
          updateAvailable: updates.state?.updateAvailable ?? false,
        }}
        onOpenNotifications={openUpdatesCenter}
      />
      {/* docs/sheets tabs render as WebContentsView children of this window, positioned
       * by the main process to cover this area — only Home paints its own content here. */}
      <div className="app-frame-content" style={{ visibility: homeActive && !analyticsOpen ? 'visible' : 'hidden' }}>
        <Home onOpenAnalytics={() => setAnalyticsOpen(true)} />
      </div>
      {analyticsOpen && homeActive && (
        <AnalyticsWorkspace
          onClose={() => setAnalyticsOpen(false)}
          onOpenModelSettings={() => {
            setAnalyticsOpen(false)
            void window.aiOffice.openAiModelSettings()
          }}
        />
      )}
      {/* editor WebContentsViews paint above ALL shell DOM, so the overlay only
       * renders while the home tab is active — it comes back when home does */}
      {showOnboarding && homeActive && <Onboarding onDone={finishOnboarding} />}
      {starPromptDocOpens !== null && !showOnboarding && homeActive && !analyticsOpen && (
        <StarPromptCard docOpens={starPromptDocOpens} onClose={() => setStarPromptDocOpens(null)} />
      )}
      {!showOnboarding && homeActive && (
        <>
          <NotificationsCenterPanel
            open={centerOpen}
            tab={centerTab}
            onTab={setCenterTab}
            onClose={() => setCenterOpen(false)}
            state={updates.state}
            loading={updates.loading}
            error={updates.error}
            api={updates.api}
            onState={updates.applyState}
          />
          <NotificationToast
            notifications={updates.state?.notifications ?? []}
            onOpen={() => openUpdatesCenter('notifications')}
          />
          <UpdateToast
            state={updates.state}
            hidden={centerOpen}
            onOpen={() => openUpdatesCenter('updates')}
            onRestart={restartForUpdate}
          />
        </>
      )}
      <SplashScreen onDone={() => setLaunchComplete(true)} />
    </div>
  )
}
