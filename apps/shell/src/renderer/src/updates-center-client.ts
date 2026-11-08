import { useEffect, useState } from 'react'
import type { UpdatesCenterApi, UpdatesCenterState } from '../../shared/updates-center-api'

declare global {
  interface Window {
    plotdocsUpdates?: UpdatesCenterApi
  }
}

let cachedState: UpdatesCenterState | null = null
let cachedError: string | null = null
let loading = false
let started = false
let unsubscribe: (() => void) | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function setState(next: UpdatesCenterState): void {
  cachedState = next
  cachedError = null
  loading = false
  emit()
}

function setError(error: unknown): void {
  cachedError = error instanceof Error ? error.message : String(error)
  loading = false
  emit()
}

function start(): void {
  if (started) return
  started = true
  const api = window.plotdocsUpdates
  if (!api) {
    cachedError = 'Updates and notifications are not available in this build.'
    emit()
    return
  }
  unsubscribe = api.onChanged(setState)
  if (!cachedState) {
    loading = true
    emit()
    void api
      .getState()
      .then((state) => {
        // A push event may have arrived first; never overwrite fresher state.
        if (!cachedState) setState(state)
      })
      .catch(setError)
  }
}

export interface UpdatesCenterClient {
  state: UpdatesCenterState | null
  loading: boolean
  error: string | null
  api: UpdatesCenterApi | null
  refresh(): Promise<void>
  checkGithub(): Promise<void>
  applyState(state: UpdatesCenterState): void
}

export function useUpdatesCenter(): UpdatesCenterClient {
  const [, rerender] = useState(0)
  useEffect(() => {
    start()
    const listener = (): void => rerender((value) => value + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      // The module-level subscription is intentionally kept for the life of the
      // shell window: it is one IPC listener, not one per React mount.
      void unsubscribe
    }
  }, [])

  const api = window.plotdocsUpdates ?? null
  return {
    state: cachedState,
    loading,
    error: cachedError,
    api,
    async refresh() {
      if (!api) return
      try {
        setState(await api.refresh())
      } catch (error) {
        setError(error)
      }
    },
    async checkGithub() {
      if (!api) return
      try {
        setState(await api.checkGithub())
      } catch (error) {
        setError(error)
      }
    },
    applyState(state) {
      setState(state)
    },
  }
}
