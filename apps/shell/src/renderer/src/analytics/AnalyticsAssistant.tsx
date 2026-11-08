import { useEffect, useMemo, useRef, useState } from 'react'
import { AiModelPicker, type AiModelPickerBridge } from '@plotdocs/ui'
import type {
  AnalyticsApi,
  AnalyticsAssistantAction,
  AnalyticsAssistantReply,
  AnalyticsAssistantSource,
  AnalyticsAssistantSourceInput,
  AnalyticsAssistantStatus,
  AnalyticsChartSpec,
  AnalyticsDatabaseKind,
  AnalyticsInterpretation,
  AnalyticsQueryResult,
  AnalyticsUrlInspection,
} from '../../../shared/analytics-api'
import { AnalyticsChart } from './AnalyticsChart'
import { useI18n } from '../locale'
import './assistant.css'

interface AnalyticsAssistantProps {
  api: AnalyticsApi
  activeDatasetId: string | null
  datasets: { id: string; name: string; rowCount: number; columnCount: number }[]
  onClose: () => void
  onDataChanged: (preferredDatasetId?: string) => void
  onOpenSql: (
    datasetId: string,
    sql: string,
    result?: AnalyticsQueryResult,
    chart?: AnalyticsChartSpec | null,
  ) => void
  onOpenDashboard: () => void
  onOpenDataset: (datasetId: string) => void
  onOpenModelSettings: () => void
  /** A prompt queued by the workspace (for example, "Build with Plot AI"). */
  promptRequest?: { id: string; text: string } | null
}

interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: AnalyticsAssistantAction[]
  sources?: string[]
  error?: string
  model?: string
  interpretation?: AnalyticsInterpretation
}

type SourceDialog = 'link' | 'database' | null

const STARTERS: { label: string; hint: string; kind: 'link' | 'database' | 'text' | 'auto'; text?: string }[] = [
  {
    label: 'Run everything automatically',
    hint: 'Import, clean, analyse, dashboard',
    kind: 'auto',
  },
  {
    label: 'Load a CSV, web table or link',
    hint: 'Paste a public URL',
    kind: 'link',
  },
  {
    label: 'Connect a database',
    hint: 'SQLite, PostgreSQL or MySQL',
    kind: 'database',
  },
  {
    label: 'Profile and clean my data',
    hint: 'Find gaps and duplicates',
    kind: 'text',
    text: 'Inspect my active dataset, clean the most important data-quality issue, and show me the result with evidence.',
  },
  {
    label: 'Sort and rank the groups',
    hint: 'Top 10 with exact SQL',
    kind: 'text',
    text: 'Understand the active dataset, then rank its main groups by the most meaningful metric. Show the top 10, the share of the total, and the exact SQL.',
  },
  {
    label: 'Find outliers and relationships',
    hint: 'IQR fences + correlation',
    kind: 'text',
    text: 'Check the active dataset for unusual values and relationships. Use IQR fences for anomalies and Pearson/Spearman for two numeric columns. Show the exact rows and SQL, and explain what is not causation.',
  },
  {
    label: 'Understand what this data is',
    hint: 'Grain, roles and questions',
    kind: 'text',
    text: 'Read the active dataset before analysing it. Explain what one row represents, what each column appears to mean, which column is the best measure, dimension and time axis, and the questions worth answering.',
  },
  {
    label: 'Build a revenue dashboard',
    hint: 'Chart by region and month',
    kind: 'text',
    text: 'Analyse the active dataset, find the strongest revenue view, and save a dashboard with a chart and the exact SQL.',
  },
  {
    label: 'Find the right table on a web page',
    hint: 'Inspect and choose with AI',
    kind: 'text',
    text: 'Inspect the attached web link, identify the table whose headers and sample rows best match the data I need, import that exact table with its tableIndex, then profile it and explain what it contains. If the page has several tables, compare them before choosing. If it only links to a direct CSV, JSON or XLSX file, import that link.',
  },
  {
    label: 'Forecast next quarter',
    hint: 'Trend, R² and uncertainty',
    kind: 'text',
    text: 'Forecast the main numeric trend in the active dataset and explain the fit and its uncertainty.',
  },
]

function newId(prefix: string): string {
  const cryptoApi = globalThis.crypto
  const random =
    cryptoApi && 'randomUUID' in cryptoApi
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}_${random}`
}

function hostLabel(raw: string): string {
  try {
    const url = new URL(raw)
    return `${url.hostname}${url.pathname !== '/' ? `/${url.pathname.split('/').filter(Boolean).slice(-1)[0] ?? ''}` : ''}`
  } catch {
    return 'Linked data'
  }
}

function databaseLabel(kind: AnalyticsDatabaseKind, connection: string): string {
  if (kind === 'sqlite') {
    const name = connection.split(/[\\/]/).filter(Boolean).slice(-1)[0]
    return name ? `SQLite · ${name}` : 'SQLite database'
  }
  try {
    const url = new URL(connection)
    return `${kind} · ${url.hostname}${url.pathname}`
  } catch {
    return `${kind} database`
  }
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : String(value)
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function SparkIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.8c.5 4.9 2.6 7 7.5 7.5-4.9.5-7 2.6-7.5 7.5-.5-4.9-2.6-7-7.5-7.5 4.9-.5 7-2.6 7.5-7.5Z"
        fill="currentColor"
      />
      <path
        d="M19 15.4c.2 1.8 1 2.6 2.8 2.8-1.8.2-2.6 1-2.8 2.8-.2-1.8-1-2.6-2.8-2.8 1.8-.2 2.6-1 2.8-2.8Z"
        fill="currentColor"
        opacity=".62"
      />
    </svg>
  )
}

function ToolGlyph({ tool }: { tool: AnalyticsAssistantAction['tool'] }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (tool === 'inspect_url') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4.5 4.5" />
        <path d="M7.5 10.5h6M10.5 7.5v6" opacity="0.7" />
      </svg>
    )
  }
  if (tool === 'import_url') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    )
  }
  if (tool === 'list_database_tables' || tool === 'import_database_table') {
    return (
      <svg {...common} aria-hidden="true">
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
      </svg>
    )
  }
  if (tool === 'run_sql') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-12-4 16" />
      </svg>
    )
  }
  if (tool === 'save_dashboard' || tool === 'build_dashboard') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="3" width="7" height="8" rx="1.4" />
        <rect x="14" y="3" width="7" height="5" rx="1.4" />
        <rect x="3" y="15" width="7" height="6" rx="1.4" />
        <rect x="14" y="12" width="7" height="9" rx="1.4" />
      </svg>
    )
  }
  if (tool === 'import_file') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
        <path d="M4 17v3h16v-3" />
      </svg>
    )
  }
  if (tool === 'categorize_columns' || tool === 'data_quality') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 6h16M4 12h10M4 18h7" />
        <circle cx="18" cy="12" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    )
  }
  if (tool === 'pivot_table') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M3 9h18M9 4v16M15 4v16" />
      </svg>
    )
  }
  if (tool === 'forecast' || tool === 'predict_trend') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 19V5m0 14h16" />
        <path d="m7 15 4-5 3 2 5-6" />
      </svg>
    )
  }
  if (tool === 'correlate') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="6" cy="17" r="1.4" />
        <circle cx="9" cy="12" r="1.4" />
        <circle cx="13" cy="14" r="1.4" />
        <circle cx="16" cy="8" r="1.4" />
        <circle cx="19" cy="6" r="1.4" />
        <path d="m4 19 16-14" opacity="0.55" />
      </svg>
    )
  }
  if (tool === 'find_anomalies') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 18h16M6 18V9m4 9V5m4 13v-7m4 7v-4" />
        <circle cx="10" cy="4" r="1.7" />
      </svg>
    )
  }
  if (tool === 'prepare_dataset') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    )
  }
  if (tool === 'describe_dataset') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    )
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M3 6h7l2 2h9v11H3z" />
    </svg>
  )
}

function ActionState({ action }: { action: AnalyticsAssistantAction }) {
  if (action.status === 'running') return <span className="an-action-spinner" aria-label="Running" />
  if (action.status === 'error') {
    return (
      <span className="an-action-state-icon bad" aria-label="Failed">
        !
      </span>
    )
  }
  return (
    <span className="an-action-state-icon good" aria-label="Done">
      ✓
    </span>
  )
}

function InspectionPreview({ inspection }: { inspection: AnalyticsUrlInspection }) {
  return (
    <div className="an-assistant-inspection">
      <div className="an-assistant-inspection-head">
        <span>
          <strong>{inspection.pageTitle || inspection.host}</strong>
          <small>{inspection.host}</small>
        </span>
        <span className="an-assistant-inspection-count">
          {inspection.tables.length
            ? `${inspection.tables.length} table${inspection.tables.length === 1 ? '' : 's'}`
            : `${inspection.dataLinks.length} data link${inspection.dataLinks.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {inspection.tables.length > 0 ? (
        <ul className="an-assistant-inspection-list">
          {inspection.tables.slice(0, 8).map((table) => (
            <li key={table.index}>
              <span className="an-assistant-inspection-index">{table.index + 1}</span>
              <span className="an-assistant-inspection-copy">
                <strong>{table.caption || `Table ${table.index + 1}`}</strong>
                <small>
                  {table.rowCount.toLocaleString()} rows · {table.columnCount} columns
                </small>
                <small className="an-assistant-inspection-columns">
                  {table.headers.slice(0, 6).join(' · ')}
                  {table.headers.length > 6 ? ' …' : ''}
                </small>
              </span>
            </li>
          ))}
        </ul>
      ) : inspection.dataLinks.length > 0 ? (
        <ul className="an-assistant-inspection-list links">
          {inspection.dataLinks.slice(0, 5).map((link) => (
            <li key={link}>
              <span className="an-assistant-inspection-copy">
                <strong>{hostLabel(link)}</strong>
                <small>{link}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="an-assistant-inspection-empty">No usable table or direct data link was found.</p>
      )}
    </div>
  )
}

function MiniTable({ result }: { result: AnalyticsQueryResult }) {
  const columns = result.columns.slice(0, 7)
  const rows = result.rows.slice(0, 8)
  return (
    <div className="an-assistant-table-wrap">
      <table className="an-assistant-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, columnIndex) => (
                <td key={column} title={formatCell(row[columnIndex])}>
                  {formatCell(row[columnIndex])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="an-assistant-table-foot">
        Showing {rows.length} of {result.rowCount.toLocaleString()} row
        {result.rowCount === 1 ? '' : 's'}
        {result.truncated ? ' · result capped' : ''}
      </div>
    </div>
  )
}

function ActionCard({
  action,
  onOpenSql,
  onOpenDashboard,
  onOpenDataset,
}: {
  action: AnalyticsAssistantAction
  onOpenSql: AnalyticsAssistantProps['onOpenSql']
  onOpenDashboard: () => void
  onOpenDataset: (datasetId: string) => void
}) {
  const [expanded, setExpanded] = useState(
    action.status === 'error' ||
      action.tool === 'run_sql' ||
      action.tool === 'save_dashboard' ||
      action.tool === 'build_dashboard',
  )
  const canOpenSql = Boolean(action.datasetId && action.sql)
  const summary =
    action.status === 'running'
      ? 'Running locally…'
      : action.status === 'error'
        ? action.error ?? 'That step failed.'
        : action.summary ?? 'Done.'
  return (
    <article className={`an-assistant-action ${action.status}`}>
      <button
        type="button"
        className="an-assistant-action-head"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="an-assistant-action-glyph">
          <ToolGlyph tool={action.tool} />
        </span>
        <span className="an-assistant-action-copy">
          <strong>{action.title}</strong>
          <span>{summary}</span>
        </span>
        <span className="an-assistant-action-state">
          <ActionState action={action} />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={expanded ? 'open' : ''}
          >
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className="an-assistant-action-body">
          {action.detail && <p className="an-assistant-action-detail">{action.detail}</p>}
          {action.inspection && <InspectionPreview inspection={action.inspection} />}
          {action.sql && (
            <pre className="an-assistant-sql" aria-label="Executed SQL">
              {action.sql}
            </pre>
          )}
          {action.chart && action.result && (
            <div className="an-assistant-chart">
              <AnalyticsChart result={action.result} spec={action.chart} height={190} compact />
            </div>
          )}
          {action.result && <MiniTable result={action.result} />}
          <div className="an-assistant-action-foot">
            {action.elapsedMs !== undefined && (
              <span className="an-assistant-elapsed">{Math.max(1, action.elapsedMs)} ms</span>
            )}
            <span className="an-assistant-action-buttons">
              {canOpenSql && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenSql(action.datasetId!, action.sql!, action.result, action.chart)
                  }
                >
                  Open SQL &amp; evidence
                </button>
              )}
              {action.tool === 'save_dashboard' || action.tool === 'build_dashboard' ? (
                <button type="button" onClick={onOpenDashboard}>
                  View dashboards
                </button>
              ) : null}
              {action.datasetId &&
                (action.tool === 'import_url' ||
                  action.tool === 'import_file' ||
                  action.tool === 'import_database_table') && (
                  <button type="button" onClick={() => onOpenDataset(action.datasetId!)}>
                    Open dataset
                  </button>
                )}
            </span>
          </div>
        </div>
      )}
    </article>
  )
}

function WorkingBlock({
  status,
  actions,
  onOpenSql,
  onOpenDashboard,
  onOpenDataset,
}: {
  status: string
  actions: AnalyticsAssistantAction[]
  onOpenSql: AnalyticsAssistantProps['onOpenSql']
  onOpenDashboard: () => void
  onOpenDataset: (datasetId: string) => void
}) {
  return (
    <div className="an-assistant-turn assistant working">
      <div className="an-assistant-avatar">
        <SparkIcon size={16} />
      </div>
      <div className="an-assistant-bubble assistant working">
        <div className="an-assistant-working" role="status" aria-live="polite">
          <span className="an-assistant-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{status || 'Plot AI is working…'}</span>
        </div>
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onOpenSql={onOpenSql}
            onOpenDashboard={onOpenDashboard}
            onOpenDataset={onOpenDataset}
          />
        ))}
      </div>
    </div>
  )
}

function SourceDialog({
  mode,
  api,
  busy,
  onClose,
  onAttachLink,
  onAttachDatabase,
}: {
  mode: Exclude<SourceDialog, null>
  api: AnalyticsApi
  busy: boolean
  onClose: () => void
  onAttachLink: (url: string, label: string) => void
  onAttachDatabase: (kind: AnalyticsDatabaseKind, connection: string, label: string) => void
}) {
  const [tab, setTab] = useState<Exclude<SourceDialog, null>>(mode)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [dbKind, setDbKind] = useState<AnalyticsDatabaseKind>('sqlite')
  const [connection, setConnection] = useState('')
  const [error, setError] = useState('')
  const [browsing, setBrowsing] = useState(false)

  async function browseSqlite() {
    if (browsing) return
    setBrowsing(true)
    try {
      const path = await api.pickDatabaseFile()
      if (path) setConnection(path)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBrowsing(false)
    }
  }

  function submit() {
    setError('')
    if (tab === 'link') {
      let parsed: URL
      try {
        parsed = new URL(url.trim())
      } catch {
        setError('Enter a full http or https data link.')
        return
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Only http and https links are supported.')
        return
      }
      onAttachLink(parsed.toString(), label.trim())
      return
    }
    const trimmed = connection.trim()
    if (!trimmed) {
      setError(dbKind === 'sqlite' ? 'Choose a SQLite database file.' : 'Paste a database URL.')
      return
    }
    if (dbKind !== 'sqlite') {
      try {
        const parsed = new URL(trimmed)
        if (!['postgres:', 'postgresql:', 'mysql:'].includes(parsed.protocol)) {
          setError('Use a postgres:// or mysql:// connection URL.')
          return
        }
      } catch {
        setError('Paste a full database URL, including the host and database name.')
        return
      }
    }
    onAttachDatabase(dbKind, trimmed, label.trim())
  }

  return (
    <div
      className="an-assistant-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        className="an-assistant-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add a data source"
      >
        <header className="an-assistant-modal-head">
          <div>
            <span className="an-assistant-eyebrow">PLOT AI DATA SOURCE</span>
            <h3>Connect your data</h3>
          </div>
          <button type="button" className="an-assistant-icon-btn" onClick={onClose} aria-label="Close data source dialog">
            ×
          </button>
        </header>
        <div className="an-assistant-modal-tabs" role="tablist" aria-label="Data source type">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'link'}
            className={tab === 'link' ? 'active' : ''}
            onClick={() => {
              setTab('link')
              setError('')
            }}
          >
            Data link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'database'}
            className={tab === 'database' ? 'active' : ''}
            onClick={() => {
              setTab('database')
              setError('')
            }}
          >
            Database
          </button>
        </div>
        <div className="an-assistant-modal-body">
          {tab === 'link' ? (
            <>
              <label className="an-assistant-field">
                <span>Public data link</span>
                <input
                  autoFocus
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/sales.csv or a page with a table"
                  spellCheck={false}
                />
              </label>
              <label className="an-assistant-field">
                <span>Name <em>optional</em></span>
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Q3 sales"
                  maxLength={120}
                />
              </label>
              <p className="an-assistant-modal-note">
                CSV, TSV, JSON, XLSX, XLSM, HTML tables and pages that link to a data file are
                supported. Plot AI picks the largest table on a page. Public http/https links only;
                private addresses and embedded credentials are blocked.
              </p>
            </>
          ) : (
            <>
              <label className="an-assistant-field">
                <span>Database type</span>
                <select
                  value={dbKind}
                  onChange={(event) => {
                    setDbKind(event.target.value as AnalyticsDatabaseKind)
                    setConnection('')
                    setError('')
                  }}
                >
                  <option value="sqlite">SQLite file</option>
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                </select>
              </label>
              {dbKind === 'sqlite' ? (
                <label className="an-assistant-field">
                  <span>Database file</span>
                  <span className="an-assistant-file-row">
                    <input
                      autoFocus
                      type="text"
                      value={connection}
                      onChange={(event) => setConnection(event.target.value)}
                      placeholder="C:\data\analytics.db"
                      spellCheck={false}
                    />
                    <button type="button" onClick={() => void browseSqlite()} disabled={browsing}>
                      {browsing ? 'Opening…' : 'Browse'}
                    </button>
                  </span>
                </label>
              ) : (
                <label className="an-assistant-field">
                  <span>Connection URL</span>
                  <input
                    autoFocus
                    type="password"
                    value={connection}
                    onChange={(event) => setConnection(event.target.value)}
                    placeholder={
                      dbKind === 'postgres'
                        ? 'postgres://user:password@host:5432/database'
                        : 'mysql://user:password@host:3306/database'
                    }
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
              )}
              <label className="an-assistant-field">
                <span>Name <em>optional</em></span>
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={dbKind === 'sqlite' ? 'Local warehouse' : 'Production read replica'}
                  maxLength={120}
                />
              </label>
              <p className="an-assistant-modal-note">
                Credentials stay in the local process and are redacted in chat and audit. Plot AI
                receives the schema, profile and bounded samples; obvious identifiers are
                redacted and the password never leaves the app.
              </p>
            </>
          )}
          {error && <div className="an-assistant-modal-error">{error}</div>}
        </div>
        <footer className="an-assistant-modal-foot">
          <button type="button" className="an-assistant-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="an-assistant-primary" onClick={submit} disabled={busy}>
            {busy ? 'Working…' : 'Attach & run Plot AI'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function AssistantReading({ interpretation }: { interpretation: AnalyticsInterpretation }) {
  return (
    <section className={`an-assistant-reading ${interpretation.source}`}>
      <header>
        <span className="an-assistant-reading-source">
          {interpretation.source === 'ai' ? 'AI reading' : 'Local reading'}
          {interpretation.source === 'ai' && interpretation.model ? ` · ${interpretation.model}` : ''}
        </span>
        <span className="an-assistant-reading-verified">
          {interpretation.verified ? 'numbers checked' : 'unverified'}
        </span>
      </header>
      <strong>{interpretation.headline}</strong>
      <p>{interpretation.meaning}</p>
      {interpretation.actions.length > 0 && (
        <div className="an-assistant-reading-actions">
          <span>Next checks</span>
          <ul>
            {interpretation.actions.slice(0, 4).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      {interpretation.caveats.length > 0 && (
        <ul className="an-assistant-reading-caveats">
          {interpretation.caveats.slice(0, 4).map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
      {interpretation.note && <small>{interpretation.note}</small>}
    </section>
  )
}

function statusLabel(status: AnalyticsAssistantStatus | null): string {
  if (!status) return 'Checking model…'
  if (!status.configured) return 'Local engine'
  const provider = status.provider ? status.provider[0]?.toUpperCase() + status.provider.slice(1) : 'AI'
  return status.model && status.model !== 'default' ? `${provider} · ${status.model}` : provider
}

export function AnalyticsAssistant({
  api,
  activeDatasetId,
  datasets,
  onClose,
  onDataChanged,
  onOpenSql,
  onOpenDashboard,
  onOpenDataset,
  onOpenModelSettings,
  promptRequest,
}: AnalyticsAssistantProps) {
  const { lang } = useI18n()
  const modelBridge = useMemo<AiModelPickerBridge>(
    () => ({
      getSettings: () => window.aiOffice.getAiSettings(),
      setSettings: (settings) => window.aiOffice.setAiSettings(settings),
      onSettingsChanged: (handler) => window.aiOffice.onAiSettingsChanged(handler),
      soopusLoggedIn: () => window.aiOffice.aiSoopusStatus().then((state) => !!state.loggedIn),
      openModelSettings: onOpenModelSettings,
    }),
    [onOpenModelSettings],
  )
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [draft, setDraft] = useState('')
  const [running, setRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [liveActions, setLiveActions] = useState<AnalyticsAssistantAction[]>([])
  const [sources, setSources] = useState<AnalyticsAssistantSourceInput[]>([])
  const [status, setStatus] = useState<AnalyticsAssistantStatus | null>(null)
  const [sourceDialog, setSourceDialog] = useState<SourceDialog>(null)
  const [dialogBusy, setDialogBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const handledPromptRef = useRef<string | null>(null)
  const sendRef = useRef<(text: string) => void>(() => undefined)
  const activeDataset = datasets.find((dataset) => dataset.id === activeDatasetId) ?? null

  useEffect(() => {
    let alive = true
    api
      .assistantStatus()
      .then((next) => {
        if (alive) setStatus(next)
      })
      .catch(() => {
        if (alive)
          setStatus({ configured: false, message: 'AI status could not be read.', localAutomation: true })
      })
    return () => {
      alive = false
    }
  }, [api])

  useEffect(() => {
    const off = window.aiOffice?.onAiSettingsChanged?.(() => {
      void refreshStatus()
    })
    return () => off?.()
  }, [api])

  useEffect(() => {
    return api.onAssistantEvent((event) => {
      if (event.type === 'status') {
        setStatusText(event.text)
        return
      }
      if (event.type === 'action') {
        setLiveActions((previous) => {
          const index = previous.findIndex((action) => action.id === event.action.id)
          if (index < 0) return [...previous, event.action]
          const next = previous.slice()
          next[index] = event.action
          return next
        })
      }
    })
  }, [api])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    // The empty state is taller than the panel at small window sizes. Pinning
    // it to the bottom would hide its heading and first paragraph, so only
    // follow the conversation once there is a conversation to follow.
    node.scrollTop = messages.length === 0 ? 0 : node.scrollHeight
  }, [messages, liveActions, statusText, running])

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(138, Math.max(46, node.scrollHeight))}px`
  }, [draft])

  async function refreshStatus() {
    try {
      setStatus(await api.assistantStatus())
    } catch {
      setStatus({
        configured: false,
        message: 'AI status could not be read.',
        localAutomation: true,
      })
    }
  }

  function historyForRequest(): { role: 'user' | 'assistant'; content: string }[] {
    return messages
      .filter((message) => !message.error)
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.interpretation
          ? `${message.text}\n\nEvidence reading: ${message.interpretation.headline}. ${message.interpretation.meaning}`
          : message.text,
      }))
  }

  async function send(
    apiText: string,
    displayText = apiText,
    sourceOverride?: AnalyticsAssistantSourceInput[],
    sourceLabels?: string[],
    mode: 'chat' | 'auto' = 'chat',
  ) {
    if (running || !apiText.trim()) return
    const requestSources = sourceOverride ?? sources
    const labels =
      sourceLabels ?? requestSources.map((source) => source.label).filter(Boolean)
    const history = historyForRequest()
    const userEntry: ChatEntry = {
      id: newId('user'),
      role: 'user',
      text: displayText.trim(),
      sources: labels.length ? labels : undefined,
    }
    setMessages((previous) => [...previous, userEntry])
    setDraft('')
    setRunning(true)
    setStatusText(
      mode === 'auto'
        ? 'Running the local automation pipeline…'
        : 'Plot AI is planning the analysis…',
    )
    setLiveActions([])
    try {
      const reply: AnalyticsAssistantReply = await api.assistant({
        text: apiText,
        history,
        activeDatasetId: activeDatasetId ?? null,
        sources: requestSources,
        mode,
      })
      const assistantEntry: ChatEntry = {
        id: newId('assistant'),
        role: 'assistant',
        text: reply.text || (reply.ok ? 'Done.' : reply.error ?? 'That request failed.'),
        actions: reply.actions,
        error: reply.ok ? undefined : reply.error ?? reply.text,
        model: reply.model,
        interpretation: reply.interpretation,
      }
      setMessages((previous) => [...previous, assistantEntry])
      const lastDataset = [...reply.actions]
        .reverse()
        .find((action) => action.datasetId)?.datasetId
      if (reply.actions.length > 0) onDataChanged(lastDataset)
      void refreshStatus()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason)
      setMessages((previous) => [
        ...previous,
        {
          id: newId('assistant'),
          role: 'assistant',
          text: message,
          error: message,
        },
      ])
    } finally {
      setRunning(false)
      setStatusText('')
      setLiveActions([])
    }
  }

  sendRef.current = (text) => {
    void send(text)
  }

  useEffect(() => {
    const request = promptRequest
    if (!request || handledPromptRef.current === request.id || running) return
    handledPromptRef.current = request.id
    sendRef.current(request.text)
  }, [promptRequest, running])

  function resetChat() {
    if (running) return
    setMessages([])
    setDraft('')
    setLiveActions([])
    setStatusText('')
  }

  function addSource(source: AnalyticsAssistantSourceInput, prompt: string, display: string) {
    const nextSources = [...sources.filter((entry) => entry.id !== source.id), source]
    setSources(nextSources)
    setSourceDialog(null)
    void send(prompt, display, nextSources, [source.label])
  }

  function attachLink(url: string, label: string) {
    const id = newId('url')
    const source: AnalyticsAssistantSourceInput = {
      id,
      kind: 'url',
      label: label || hostLabel(url),
      url,
    }
    addSource(
      source,
      `Import [source:${id}], profile it, and recommend the most useful analysis.`,
      label ? `Load ${label}, profile it, and recommend the most useful analysis.` : 'Load this linked data, profile it, and recommend the most useful analysis.',
    )
  }

  function attachDatabase(kind: AnalyticsDatabaseKind, connection: string, label: string) {
    const id = newId('db')
    const source: AnalyticsAssistantSourceInput = {
      id,
      kind: 'database',
      label: label || databaseLabel(kind, connection),
      database: { kind, connection },
    }
    addSource(
      source,
      `Inspect [source:${id}], list its tables, import the most relevant table, profile it, and recommend the most useful analysis.`,
      'Connect this database, import the most relevant table, and recommend the most useful analysis.',
    )
  }

  function runAuto() {
    if (running) return
    if (!activeDatasetId && sources.length === 0) return
    void send(
      'Run the full automated analysis: prepare the data, profile it, build evidence-backed charts, save the dashboard and explain the strongest findings.',
      'Run everything automatically.',
      undefined,
      undefined,
      'auto',
    )
  }

  function onStarter(starter: (typeof STARTERS)[number]) {
    if (running) return
    if (starter.kind === 'auto') {
      runAuto()
      return
    }
    if (starter.kind === 'link' || starter.kind === 'database') {
      setSourceDialog(starter.kind)
      return
    }
    if (starter.text) void send(starter.text)
  }

  function submitDraft() {
    if (draft.trim() && !running) void send(draft)
  }

  return (
    <aside id="analytics-assistant-panel" className="analytics-assistant" aria-label="Plot AI data analyst">
      <header className="an-assistant-head">
        <div className="an-assistant-title">
          <span className="an-assistant-logo">
            <SparkIcon size={21} />
          </span>
          <span>
            <strong>Plot AI</strong>
            <small>{running ? 'Working locally…' : 'Data analyst'}</small>
          </span>
        </div>
        <div className="an-assistant-head-actions">
          <span
            className={`an-assistant-model ${status?.configured ? 'ready' : 'local'}`}
            title={
              status?.configured
                ? status?.model ?? 'AI model'
                : status?.message ?? 'Local automation engine'
            }
          >
            <span className="an-assistant-status-dot" aria-hidden="true" />
            {statusLabel(status)}
          </span>
          <button
            type="button"
            className="an-assistant-icon-btn"
            onClick={resetChat}
            aria-label="New Plot AI chat"
            title="New chat"
            disabled={running}
          >
            +
          </button>
          <button
            type="button"
            className="an-assistant-icon-btn"
            onClick={onClose}
            aria-label="Close Plot AI panel"
            title="Close panel"
          >
            ×
          </button>
        </div>
      </header>

      <div className="an-assistant-thread" ref={scrollRef} aria-live="polite">
        {messages.length === 0 && !running ? (
          <div className="an-assistant-empty">
            <span className="an-assistant-empty-mark">
              <SparkIcon size={34} />
            </span>
            <h2>Let Plot AI run this analysis for you</h2>
            <p>
              Paste a data link, ask for a dashboard, or let Plot AI prepare what is already here.
              It inspects a public page, chooses the right table, then runs the analysis locally
              with its evidence shown.
            </p>
            {activeDataset && (
              <p className="an-assistant-context">
                Working on <strong>{activeDataset.name}</strong> ·{' '}
                {activeDataset.rowCount.toLocaleString()} rows · {activeDataset.columnCount} columns
              </p>
            )}
            {status?.tools ? (
              <p className="an-assistant-harness">
                <span className="an-assistant-harness-dot" aria-hidden="true" />
                {status.harness ?? 'analytics-agent-v3'} · {status.tools} tools ·{' '}
                {status.trainingExamples ?? 0} I/O · evidence-first
              </p>
            ) : null}
            <div className="an-assistant-starters">
              {STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  className="an-assistant-starter"
                  onClick={() => onStarter(starter)}
                  disabled={running}
                >
                  <span className="an-assistant-starter-icon">
                    {starter.kind === 'link' ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.1-2.1a4.5 4.5 0 0 0-6.4-6.4L11 6.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-2.1 2.1a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ) : starter.kind === 'database' ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <ellipse cx="12" cy="5" rx="7" ry="3" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    ) : (
                      <SparkIcon size={16} />
                    )}
                  </span>
                  <span className="an-assistant-starter-copy">
                    <strong>{starter.label}</strong>
                    <small>{starter.hint}</small>
                  </span>
                  <span className="an-assistant-starter-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`an-assistant-turn ${message.role}`}>
                {message.role === 'assistant' && (
                  <div className="an-assistant-avatar">
                    <SparkIcon size={16} />
                  </div>
                )}
                <div className={`an-assistant-bubble ${message.role} ${message.error ? 'error' : ''}`}>
                  {message.role === 'user' && message.sources?.length ? (
                    <div className="an-assistant-message-sources">
                      {message.sources.map((source) => (
                        <span key={source}>{source}</span>
                      ))}
                    </div>
                  ) : null}
                  <p>{message.text}</p>
                  {message.role === 'assistant' && message.interpretation ? (
                    <AssistantReading interpretation={message.interpretation} />
                  ) : null}
                  {message.role === 'assistant' && message.actions?.length ? (
                    <div className="an-assistant-actions">
                      {message.actions.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          onOpenSql={onOpenSql}
                          onOpenDashboard={onOpenDashboard}
                          onOpenDataset={onOpenDataset}
                        />
                      ))}
                    </div>
                  ) : null}
                  {message.error && <div className="an-assistant-error-note">{message.error}</div>}
                  {message.role === 'assistant' && message.model && (
                    <span className="an-assistant-model-note">{message.model}</span>
                  )}
                </div>
              </div>
            ))}
            {running && (
              <WorkingBlock
                status={statusText}
                actions={liveActions}
                onOpenSql={onOpenSql}
                onOpenDashboard={onOpenDashboard}
                onOpenDataset={onOpenDataset}
              />
            )}
          </>
        )}
      </div>

      <div className="an-assistant-composer-wrap">
        {sources.length > 0 && !running && (
          <div className="an-assistant-attached">
            {sources.map((source) => (
              <span key={source.id} className="an-assistant-source-chip">
                <span>{source.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${source.label}`}
                  onClick={() => setSources((previous) => previous.filter((entry) => entry.id !== source.id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {status && !status.configured && (
          <div className="an-assistant-setup local">
            <strong>Local automation is ready</strong>
            <span>{status.message ?? 'No AI model is connected. Choose a model in Settings → AI Model.'}</span>
            <button
              type="button"
              className="an-assistant-setup-run"
              onClick={runAuto}
              disabled={running || (!activeDatasetId && sources.length === 0)}
            >
              Run full auto
            </button>
            <button type="button" onClick={() => void refreshStatus()}>
              Check again
            </button>
          </div>
        )}
        <form
          className="an-assistant-composer"
          onSubmit={(event) => {
            event.preventDefault()
            submitDraft()
          }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submitDraft()
              }
            }}
            placeholder="Ask Plot AI to load, clean, analyse, chart or forecast your data…"
            aria-label="Message Plot AI"
            rows={1}
            disabled={running}
          />
          <div className="an-assistant-composer-foot">
            <div className="an-assistant-foot-left">
              <AiModelPicker bridge={modelBridge} lang={lang} />
              <div className="an-assistant-attach-actions">
                <button type="button" onClick={() => setSourceDialog('link')} disabled={running}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.1-2.1a4.5 4.5 0 0 0-6.4-6.4L11 6.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-2.1 2.1a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Link
              </button>
              <button type="button" onClick={() => setSourceDialog('database')} disabled={running}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <ellipse cx="12" cy="5" rx="7" ry="3" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                Database
              </button>
              <button
                type="button"
                className="an-assistant-auto-action"
                onClick={runAuto}
                disabled={running || (!activeDatasetId && sources.length === 0)}
                title={
                  activeDatasetId || sources.length
                    ? 'Run the full local analysis pipeline'
                    : 'Attach data or open a dataset to run automation'
                }
              >
                <SparkIcon size={14} />
                Auto
              </button>
              </div>
            </div>
            <div className="an-assistant-send-wrap">
              <span className="an-assistant-keyhint">Enter to send</span>
              <button
                type="submit"
                className="an-assistant-send"
                disabled={!draft.trim() || running}
                aria-label="Send to Plot AI"
              >
                {running ? (
                  <span className="an-assistant-send-spinner" aria-hidden="true" />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
        <p className="an-assistant-privacy">
          Tools run locally. Plot AI receives the schema, profile, bounded sample/query rows and
          any page content you ask it to inspect. Obvious contact and payment values are redacted;
          credentials and full datasets stay on this device.
        </p>
      </div>

      {sourceDialog && (
        <SourceDialog
          mode={sourceDialog}
          api={api}
          busy={dialogBusy || running}
          onClose={() => {
            setDialogBusy(false)
            setSourceDialog(null)
          }}
          onAttachLink={attachLink}
          onAttachDatabase={attachDatabase}
        />
      )}
    </aside>
  )
}
