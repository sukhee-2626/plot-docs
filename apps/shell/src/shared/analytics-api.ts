/**
 * Shared contract for the additive AI Data Analytics workspace.
 *
 * The workspace is deliberately separate from the document editors: it owns
 * its own SQLite files under userData/analytics and never mutates editor data.
 */

export const ANALYTICS_CHANNELS = {
  importFile: 'analytics:import-file',
  importPath: 'analytics:import-path',
  listDatasets: 'analytics:list-datasets',
  getDataset: 'analytics:get-dataset',
  deleteDataset: 'analytics:delete-dataset',
  runQuery: 'analytics:run-query',
  joinDatasets: 'analytics:join-datasets',
  appendDatasets: 'analytics:append-datasets',
  clean: 'analytics:clean',
  undoClean: 'analytics:undo-clean',
  saveView: 'analytics:save-view',
  listViews: 'analytics:list-views',
  deleteView: 'analytics:delete-view',
  ask: 'analytics:ask',
  forecast: 'analytics:forecast',
  python: 'analytics:python',
  exportCsv: 'analytics:export-csv',
  listAudit: 'analytics:list-audit',
  importUrl: 'analytics:import-url',
  inspectUrl: 'analytics:inspect-url',
  databaseTables: 'analytics:database-tables',
  importDatabaseTable: 'analytics:import-database-table',
  pickDatabaseFile: 'analytics:pick-database-file',
  assistant: 'analytics:assistant',
  assistantEvent: 'analytics:assistant-event',
  assistantStatus: 'analytics:assistant-status',
  autoAnalyze: 'analytics:auto-analyze',
  understandDataset: 'analytics:understand-dataset',
  listWorkflows: 'analytics:list-workflows',
  saveWorkflow: 'analytics:save-workflow',
  deleteWorkflow: 'analytics:delete-workflow',
  runWorkflow: 'analytics:run-workflow',
  listWorkflowRuns: 'analytics:list-workflow-runs',
  listWorkflowVersions: 'analytics:list-workflow-versions',
} as const

export type AnalyticsCell = string | number | null

export type AnalyticsColumnType = 'integer' | 'real' | 'boolean' | 'date' | 'text'

export interface AnalyticsColumnProfile {
  name: string
  type: AnalyticsColumnType
  nullCount: number
  distinctCount: number
  min: string | number | null
  max: string | number | null
  mean: number | null
  topValues: { value: string; count: number }[]
}

export interface AnalyticsPreview {
  columns: string[]
  rows: AnalyticsCell[][]
  truncated: boolean
}

export interface AnalyticsDataset {
  id: string
  name: string
  sourceName: string
  sourceType: string
  rowCount: number
  columnCount: number
  qualityScore: number
  duplicateRows: number
  missingCells: number
  createdAt: number
  updatedAt: number
  warning?: string
  canUndo: boolean
}

export interface AnalyticsDatasetDetail extends AnalyticsDataset {
  columns: AnalyticsColumnProfile[]
  preview: AnalyticsPreview
}

export interface AnalyticsQueryResult {
  columns: string[]
  rows: AnalyticsCell[][]
  rowCount: number
  truncated: boolean
  elapsedMs: number
}

export interface AnalyticsChartSpec {
  type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter'
  x: string
  y: string
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
}

export interface AnalyticsSavedView {
  id: string
  datasetId: string
  name: string
  sql: string
  chart: AnalyticsChartSpec | null
  /** Present on cards created by full automation. */
  insightKind?: AnalyticsAutoInsightKind
  /** Base column that chart marks can use to filter the dashboard. */
  filterColumn?: string
  /** One-line conclusion shown on the dashboard card. */
  takeaway?: string
  /** Plain-language explanation of what the card's evidence means. */
  meaning?: string
  /** The calculation or statistical method behind the card. */
  method?: string
  /** The exact calculation detail, including period and filters. */
  detail?: string
  confidence?: 'high' | 'medium' | 'low'
  createdAt: number
  updatedAt: number
}

export type AnalyticsCleanOperation =
  | { kind: 'drop_duplicates' }
  | { kind: 'drop_nulls'; column: string }
  | { kind: 'trim'; column: string }
  | { kind: 'fill_mean'; column: string }
  | { kind: 'fill_value'; column: string; value: string }

export interface AnalyticsCleanResult {
  ok: boolean
  error?: string
  message?: string
  dataset?: AnalyticsDatasetDetail
}

export type AnalyticsJoinType = 'inner' | 'left'

/**
 * A deterministic, local join that materializes a new dataset. Source
 * datasets are never modified; the caller can delete the derived dataset.
 */
export interface AnalyticsJoinRequest {
  leftDatasetId: string
  rightDatasetId: string
  leftKey: string
  rightKey: string
  joinType: AnalyticsJoinType
  name?: string
}

export interface AnalyticsJoinResult {
  ok: boolean
  error?: string
  dataset?: AnalyticsDataset
  /** The logical join query, retained as evidence. */
  sql?: string
  /** Null-key, type, empty-result and collision notes. */
  warning?: string
  elapsedMs?: number
}

export type AnalyticsAppendMode = 'all' | 'distinct'

/**
 * Append two datasets with the same column names into a new dataset.
 * `all` keeps every row (UNION ALL); `distinct` removes exact duplicate rows
 * (UNION). Source datasets are never modified.
 */
export interface AnalyticsAppendRequest {
  leftDatasetId: string
  rightDatasetId: string
  mode: AnalyticsAppendMode
  name?: string
}

export interface AnalyticsAppendResult {
  ok: boolean
  error?: string
  dataset?: AnalyticsDataset
  /** The mode that produced this result, retained for the evidence card. */
  mode?: AnalyticsAppendMode
  /** The logical union query, retained as evidence. */
  sql?: string
  /** Type-coercion, duplicate-removal and empty-result notes. */
  warning?: string
  elapsedMs?: number
}

export interface AnalyticsAskResult {
  ok: boolean
  question: string
  error?: string
  /** How the query was calculated. */
  explanation?: string
  /** What the returned evidence means, in plain language. */
  meaning?: string
  meaningSource?: 'ai' | 'local'
  meaningModel?: string
  sql?: string
  chart?: AnalyticsChartSpec | null
  caveats: string[]
  result?: AnalyticsQueryResult
  model?: string
}

export type AnalyticsAutoInsightKind =
  | 'quality'
  | 'trend'
  | 'ranking'
  | 'distribution'
  | 'correlation'
  | 'outlier'
  | 'forecast'

export interface AnalyticsAutoInsight {
  id: string
  kind: AnalyticsAutoInsightKind
  title: string
  /** The exact calculation or observation. */
  detail: string
  /** The algorithm or statistical method behind the result. */
  method?: string
  /** A short, plain-language takeaway derived from the same evidence. */
  takeaway?: string
  /** What the evidence means and how it should be read. */
  meaning?: string
  confidence: 'high' | 'medium' | 'low'
  sql?: string
  result?: AnalyticsQueryResult
  chart?: AnalyticsChartSpec | null
  /** Base column represented by the chart's category labels. */
  filterColumn?: string
}

export interface AnalyticsInterpretationFinding {
  insightId: string
  meaning: string
}

/**
 * A plain-language reading of evidence that was already calculated locally.
 *
 * `local` readings are deterministic syntheses of the insight details. `ai`
 * readings are model-generated from the same evidence and are rejected unless
 * every data-scale number they contain appears in that evidence.
 */
export interface AnalyticsInterpretation {
  headline: string
  meaning: string
  findings: AnalyticsInterpretationFinding[]
  actions: string[]
  caveats: string[]
  source: 'ai' | 'local'
  model?: string
  /** Insight ids the reading is based on. */
  basis: string[]
  generatedAt: number
  /** True for local readings and for AI readings that passed grounding checks. */
  verified: boolean
  /** Honest explanation of how this reading was produced. */
  note?: string
}

export type AnalyticsAiColumnRole =
  | 'metric'
  | 'dimension'
  | 'time'
  | 'identifier'
  | 'text'
  | 'ignore'

export interface AnalyticsAiColumnUnderstanding {
  name: string
  role: AnalyticsAiColumnRole
  description: string
}

export interface AnalyticsAiPreparation {
  kind: 'drop_duplicates' | 'drop_nulls' | 'trim' | 'fill_mean'
  column?: string
  reason: string
}

/**
 * The AI's reading of what a dataset is before any analysis runs.
 *
 * Every column choice is validated against the real schema before it is used.
 * A local heuristic plan is returned when no model is available, so the UI can
 * always show an honest understanding.
 */
export interface AnalyticsAiPlan {
  summary: string
  grain: string
  columnRoles: AnalyticsAiColumnUnderstanding[]
  metric: string | null
  dimension: string | null
  timeColumn: string | null
  questions: string[]
  analyses: AnalyticsAutoInsightKind[]
  preparation: AnalyticsAiPreparation[]
  caveats: string[]
  source: 'ai' | 'local'
  model?: string
  verified: boolean
  note?: string
}

export interface AnalyticsAiPlanResult {
  ok: boolean
  plan?: AnalyticsAiPlan
  error?: string
}

export interface AnalyticsAutoSummary {
  rowCount: number
  columnCount: number
  qualityScore: number
  missingCells: number
  duplicateRows: number
  primaryMetric: string | null
  primaryDimension: string | null
  timeColumn: string | null
}

export interface AnalyticsAutoAnalysis {
  ok: boolean
  error?: string
  datasetId: string
  datasetName?: string
  summary?: AnalyticsAutoSummary
  insights: AnalyticsAutoInsight[]
  /** AI (or local heuristic) understanding of the dataset used for this run. */
  plan?: AnalyticsAiPlan
  /** Plain-language meaning for the whole run; local by default, AI when configured. */
  interpretation?: AnalyticsInterpretation
  views: AnalyticsSavedView[]
  prepared: string[]
  methods: string[]
  elapsedMs: number
}

export interface AnalyticsAutoRequest {
  datasetId: string
  /** Remove exact duplicate rows before analysis. Defaults to true. */
  prepare?: boolean
}

export type AnalyticsWorkflowFrequency = 'manual' | 'hourly' | 'daily' | 'weekly'

/** Local-time schedule for a saved automation workflow. */
export interface AnalyticsWorkflowSchedule {
  frequency: AnalyticsWorkflowFrequency
  /** 0–23, used by daily and weekly schedules. */
  hour: number
  /** 0 (Sunday) – 6 (Saturday), used by weekly schedules. */
  weekday: number
}

/**
 * A saved, repeatable automation. It runs the same deterministic local
 * pipeline as “Run full auto”, never arbitrary SQL or model-generated code.
 */
export interface AnalyticsWorkflow {
  id: string
  datasetId: string
  name: string
  schedule: AnalyticsWorkflowSchedule
  enabled: boolean
  /** Remove exact duplicates before each run. */
  prepare: boolean
  /** Number of automatic retries after a failed run. */
  maxRetries: number
  /** Incremented on every saved configuration change. */
  version: number
  createdAt: number
  updatedAt: number
  nextRunAt?: number
  lastRunAt?: number
  lastRunStatus?: 'running' | 'ok' | 'error'
  lastRunMessage?: string
  runCount: number
}

export interface AnalyticsWorkflowRun {
  id: string
  workflowId: string
  datasetId: string
  status: 'ok' | 'error'
  startedAt: number
  finishedAt: number
  message: string
  error?: string
  insights: number
  views: number
  rowsBefore?: number
  rowsAfter?: number
  elapsedMs: number
  attempts: number
}

export interface AnalyticsWorkflowVersion {
  id: string
  workflowId: string
  version: number
  name: string
  schedule: AnalyticsWorkflowSchedule
  enabled: boolean
  prepare: boolean
  maxRetries: number
  createdAt: number
}

export interface AnalyticsWorkflowInput {
  id?: string
  datasetId: string
  name: string
  schedule: AnalyticsWorkflowSchedule
  enabled: boolean
  prepare?: boolean
  maxRetries?: number
}

export interface AnalyticsWorkflowRunResult {
  ok: boolean
  error?: string
  workflow?: AnalyticsWorkflow
  run?: AnalyticsWorkflowRun
  dataset?: AnalyticsDatasetDetail
}

export interface AnalyticsForecastResult {
  ok: boolean
  error?: string
  xColumn?: string
  yColumn?: string
  points?: { x: number; y: number }[]
  forecast?: { x: number; y: number; lower?: number; upper?: number }[]
  slope?: number
  intercept?: number
  r2?: number
  n?: number
  residualStdError?: number
  slopeStdError?: number
  slopeCi95?: [number, number]
  tCritical?: number
  method?: string
}

export interface AnalyticsPythonRequest {
  datasetId: string
  groupBy: string
  metric: string
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  limit?: number
}

export interface AnalyticsPythonResult {
  ok: boolean
  error?: string
  code?: string
  result?: AnalyticsQueryResult
  elapsedMs?: number
}

export interface AnalyticsAuditEvent {
  id: string
  action: string
  detail: string
  createdAt: number
}

export type AnalyticsDatabaseKind = 'sqlite' | 'postgres' | 'mysql'

export interface AnalyticsDatabaseSource {
  kind: AnalyticsDatabaseKind
  connection: string
}

export interface AnalyticsDatabaseTable {
  name: string
  schema?: string
  type: 'table' | 'view'
  rowEstimate?: number
}

export interface AnalyticsAssistantSourceInput {
  /** Stable id chosen by the renderer so later turns can reuse the source. */
  id: string
  kind: 'url' | 'database'
  label: string
  url?: string
  database?: AnalyticsDatabaseSource
}

/** One usable HTML table discovered while inspecting a public page. */
export interface AnalyticsUrlTableSummary {
  /** Zero-based position of the table in the page, used by import_url.tableIndex. */
  index: number
  caption: string
  headers: string[]
  rowCount: number
  columnCount: number
  score: number
  sampleRows: string[][]
}

/**
 * A bounded, model-readable inspection of a public data link. The AI uses it
 * to understand the page and choose the right table or direct data file
 * before importing; raw page content never enters the analytics store.
 */
export interface AnalyticsUrlInspection {
  url: string
  host: string
  pageTitle: string
  contentType: string
  tables: AnalyticsUrlTableSummary[]
  dataLinks: string[]
  textPreview: string
  note: string
}

/** Source metadata safe to show in the transcript; credentials never leave the main process. */
export interface AnalyticsAssistantSource {
  id: string
  kind: 'url' | 'database'
  label: string
  detail: string
  databaseKind?: AnalyticsDatabaseKind
}

export type AnalyticsAssistantTool =
  | 'inspect_url'
  | 'import_url'
  | 'import_file'
  | 'list_database_tables'
  | 'import_database_table'
  | 'list_datasets'
  | 'describe_dataset'
  | 'categorize_columns'
  | 'prepare_dataset'
  | 'run_sql'
  | 'join_datasets'
  | 'append_datasets'
  | 'rank_groups'
  | 'pivot_table'
  | 'funnel'
  | 'cohort'
  | 'save_dashboard'
  | 'build_dashboard'
  | 'list_dashboards'
  | 'data_quality'
  | 'forecast'
  | 'predict_trend'
  | 'correlate'
  | 'find_anomalies'
  | 'auto_analyze'

export interface AnalyticsAssistantAction {
  id: string
  tool: AnalyticsAssistantTool
  title: string
  status: 'running' | 'ok' | 'error'
  summary?: string
  detail?: string
  datasetId?: string
  sql?: string
  result?: AnalyticsQueryResult
  chart?: AnalyticsChartSpec
  /** Structured page/table evidence returned by inspect_url. */
  inspection?: AnalyticsUrlInspection
  error?: string
  elapsedMs?: number
}

export interface AnalyticsAssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AnalyticsAssistantRequest {
  text: string
  history?: AnalyticsAssistantChatMessage[]
  activeDatasetId?: string | null
  sources?: AnalyticsAssistantSourceInput[]
  /**
   * `auto` runs the deterministic local pipeline (import → prepare → profile →
   * analyse → dashboard) without waiting for a model. `chat` keeps the
   * agentic model loop and falls back to the local pipeline when needed.
   */
  mode?: 'chat' | 'auto'
}

export interface AnalyticsAssistantReply {
  ok: boolean
  text: string
  /** A structured, evidence-grounded reading shown under the reply. */
  interpretation?: AnalyticsInterpretation
  actions: AnalyticsAssistantAction[]
  sources: AnalyticsAssistantSource[]
  datasets: AnalyticsDataset[]
  model?: string
  error?: string
}

export type AnalyticsAssistantEvent =
  | { type: 'status'; text: string }
  | { type: 'action'; action: AnalyticsAssistantAction }
  | { type: 'reply'; reply: AnalyticsAssistantReply }

export interface AnalyticsAssistantStatus {
  configured: boolean
  provider?: string
  model?: string
  message?: string
  /** Deterministic local analysis is always available, even without a model. */
  localAutomation: boolean
  /** Agent-harness version and capability counts, shown in the UI. */
  harness?: string
  tools?: number
  trainingExamples?: number
}

export interface AnalyticsApi {
  /** pick a CSV/TSV/JSON/XLSX file and import it */
  importFile(): Promise<AnalyticsDataset | null>
  /** import a path the renderer already owns (OS drop); same validations */
  importPath(path: string): Promise<AnalyticsDataset>
  listDatasets(): Promise<AnalyticsDataset[]>
  getDataset(id: string): Promise<AnalyticsDatasetDetail | null>
  deleteDataset(id: string): Promise<boolean>
  runQuery(id: string, sql: string, limit?: number): Promise<AnalyticsQueryResult>
  /** materialize an inner or left join as a new local dataset */
  joinDatasets(input: AnalyticsJoinRequest): Promise<AnalyticsJoinResult>
  /** append or union two same-schema datasets as a new local dataset */
  appendDatasets(input: AnalyticsAppendRequest): Promise<AnalyticsAppendResult>
  clean(id: string, operation: AnalyticsCleanOperation): Promise<AnalyticsCleanResult>
  undoClean(id: string): Promise<AnalyticsCleanResult>
  saveView(input: {
    id?: string
    datasetId: string
    name: string
    sql: string
    chart?: AnalyticsChartSpec | null
    filterColumn?: string
  }): Promise<AnalyticsSavedView>
  listViews(datasetId?: string): Promise<AnalyticsSavedView[]>
  deleteView(id: string): Promise<boolean>
  ask(id: string, question: string): Promise<AnalyticsAskResult>
  /** run the local, evidence-backed analysis pipeline and refresh Auto cards */
  autoAnalyze(input: AnalyticsAutoRequest): Promise<AnalyticsAutoAnalysis>
  /** ask the AI to explain the dataset and choose the best columns for analysis */
  understandDataset(id: string): Promise<AnalyticsAiPlanResult>
  forecast(id: string, xColumn: string, yColumn: string): Promise<AnalyticsForecastResult>
  python(input: AnalyticsPythonRequest): Promise<AnalyticsPythonResult>
  exportCsv(id: string, sql: string, suggestedName: string): Promise<string | null>
  listAudit(): Promise<AnalyticsAuditEvent[]>
  /** saved automations for one dataset, or every dataset when omitted */
  listWorkflows(datasetId?: string): Promise<AnalyticsWorkflow[]>
  saveWorkflow(input: AnalyticsWorkflowInput): Promise<AnalyticsWorkflow>
  deleteWorkflow(id: string): Promise<boolean>
  /** execute a workflow immediately; schedules keep running in the main process */
  runWorkflow(id: string): Promise<AnalyticsWorkflowRunResult>
  listWorkflowRuns(workflowId: string, limit?: number): Promise<AnalyticsWorkflowRun[]>
  listWorkflowVersions(workflowId: string): Promise<AnalyticsWorkflowVersion[]>
  /** inspect a public page and return its usable tables and direct data links */
  inspectUrl(input: { url: string }): Promise<AnalyticsUrlInspection>
  /** download a CSV/TSV/JSON/XLSX link or one selected HTML table and import it into local SQLite */
  importUrl(input: { url: string; label?: string; tableIndex?: number }): Promise<AnalyticsDataset>
  listDatabaseTables(source: AnalyticsDatabaseSource): Promise<AnalyticsDatabaseTable[]>
  pickDatabaseFile(): Promise<string | null>
  importDatabaseTable(input: {
    source: AnalyticsDatabaseSource
    table: string
    schema?: string
  }): Promise<AnalyticsDataset>
  assistant(input: AnalyticsAssistantRequest): Promise<AnalyticsAssistantReply>
  onAssistantEvent(handler: (event: AnalyticsAssistantEvent) => void): () => void
  assistantStatus(): Promise<AnalyticsAssistantStatus>
}
