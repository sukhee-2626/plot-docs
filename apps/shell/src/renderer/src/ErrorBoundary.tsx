import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  componentStack: string
}

/**
 * Last-resort renderer boundary. A render error must never leave the window
 * blank: show the error, offer a reload, and keep the details copyable for a
 * local diagnostics report. The report is best effort and never blocks the UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: '' }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const componentStack = info.componentStack ?? ''
    this.setState({ componentStack })
    console.error('[renderer] Unhandled render error:', error, componentStack)
    void window.aiOffice
      ?.reportRendererError?.({
        message: `${error.name}: ${error.message}`,
        stack: error.stack ?? '',
        componentStack,
        url: window.location.href,
      })
      .catch(() => {
        /* diagnostics are best effort */
      })
  }

  private copyDetails = (): void => {
    const { error, componentStack } = this.state
    const details = [
      error ? `${error.name}: ${error.message}` : 'Unknown renderer error',
      error?.stack ?? '',
      componentStack,
      window.location.href,
    ]
      .filter(Boolean)
      .join('\n\n')
    void navigator.clipboard
      ?.writeText(details)
      .catch(() => {
        /* clipboard may be blocked; the details are still on screen */
      })
  }

  render(): React.ReactNode {
    const { error, componentStack } = this.state
    if (!error) return this.props.children
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#f6f6f4',
          color: '#1c1c1a',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: 'min(720px, 100%)',
            border: '1px solid #d9d7d0',
            borderRadius: 14,
            background: '#fff',
            padding: 24,
            boxShadow: '0 18px 50px rgba(28, 28, 26, 0.08)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#8a857a',
            }}
          >
            Plot Docs · local recovery
          </p>
          <h1 style={{ margin: '8px 0 8px', fontSize: 24, lineHeight: 1.2 }}>
            This window hit an unexpected error
          </h1>
          <p style={{ margin: '0 0 16px', color: '#5f5b52', lineHeight: 1.55 }}>
            Your files are local and were not changed by this screen. Reload the window to
            recover. If it happens again, copy the details below so the failure can be fixed.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                border: 0,
                borderRadius: 8,
                background: '#1c1c1a',
                color: '#fff',
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              Reload window
            </button>
            <button
              onClick={this.copyDetails}
              style={{
                border: '1px solid #d9d7d0',
                borderRadius: 8,
                background: '#fff',
                color: '#1c1c1a',
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Copy error details
            </button>
          </div>
          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Technical details
            </summary>
            <pre
              style={{
                margin: '10px 0 0',
                maxHeight: 260,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                borderRadius: 8,
                background: '#f6f6f4',
                border: '1px solid #e6e3db',
                padding: 12,
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              {`${error.name}: ${error.message}\n\n${error.stack ?? ''}\n\n${componentStack}`}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
