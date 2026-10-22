/**
 * Built-in starting points shipped under resources/templates.
 *
 * The catalog is shared by the Home gallery and the main-process copy handler;
 * adding a file here is enough to make it appear in the app. `file` is the name
 * inside apps/shell/resources/templates (and Resources/templates when packaged).
 */

export type TemplateFormat = 'docx' | 'xlsx' | 'pptx' | 'md' | 'html' | 'pdf'
export type TemplateCategory = 'docs' | 'sheets' | 'slides' | 'web' | 'pdf'
export type TemplateAccent = 'navy' | 'cyan' | 'violet' | 'plum' | 'teal' | 'slate'

export interface TemplateDef {
  id: string
  title: string
  description: string
  /** badge shown on the cover */
  tag: string
  file: string
  format: TemplateFormat
  category: TemplateCategory
  accent: TemplateAccent
}

export const TEMPLATE_CATALOG: readonly TemplateDef[] = [
  {
    id: 'project-proposal',
    title: 'Project Proposal',
    description: 'A persuasive proposal with scope, timeline and pricing.',
    tag: 'PROPOSAL',
    file: 'Project Proposal.docx',
    format: 'docx',
    category: 'docs',
    accent: 'navy',
  },
  {
    id: 'business-report',
    title: 'Business Report',
    description: 'A board-ready report with a branded cover and tables.',
    tag: 'REPORT',
    file: 'Business Report.docx',
    format: 'docx',
    category: 'docs',
    accent: 'cyan',
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Agenda, decisions, owners and next steps in one page.',
    tag: 'NOTES',
    file: 'Meeting Notes.docx',
    format: 'docx',
    category: 'docs',
    accent: 'slate',
  },
  {
    id: 'budget-planner',
    title: 'Budget Planner',
    description: 'Monthly budget with categories, totals and live formulas.',
    tag: 'BUDGET',
    file: 'Budget Planner.xlsx',
    format: 'xlsx',
    category: 'sheets',
    accent: 'teal',
  },
  {
    id: 'project-tracker',
    title: 'Project Tracker',
    description: 'Tasks, owners, status and due dates - ready to filter.',
    tag: 'TRACKER',
    file: 'Project Tracker.xlsx',
    format: 'xlsx',
    category: 'sheets',
    accent: 'cyan',
  },
  {
    id: 'sales-pipeline',
    title: 'Sales Pipeline',
    description: 'Deal stages, weighted forecast and a win-rate summary.',
    tag: 'PIPELINE',
    file: 'Sales Pipeline.xlsx',
    format: 'xlsx',
    category: 'sheets',
    accent: 'violet',
  },
  {
    id: 'startup-pitch',
    title: 'Startup Pitch',
    description: 'A twelve-slide narrative from problem to the ask.',
    tag: 'PITCH',
    file: 'Startup Pitch.pptx',
    format: 'pptx',
    category: 'slides',
    accent: 'navy',
  },
  {
    id: 'quarterly-review',
    title: 'Quarterly Review',
    description: 'The numbers, the wins and next quarter priorities.',
    tag: 'REVIEW',
    file: 'Quarterly Review.pptx',
    format: 'pptx',
    category: 'slides',
    accent: 'plum',
  },
  {
    id: 'product-launch',
    title: 'Product Launch',
    description: 'Launch narrative, audience, channels and timeline.',
    tag: 'LAUNCH',
    file: 'Product Launch.pptx',
    format: 'pptx',
    category: 'slides',
    accent: 'cyan',
  },
  {
    id: 'product-spec',
    title: 'Product Spec',
    description: 'Problem, scope, requirements and open questions.',
    tag: 'SPEC',
    file: 'Product Spec.md',
    format: 'md',
    category: 'web',
    accent: 'slate',
  },
  {
    id: 'knowledge-base-article',
    title: 'Knowledge Base Article',
    description: 'A structured help article with steps and answers.',
    tag: 'ARTICLE',
    file: 'Knowledge Base Article.md',
    format: 'md',
    category: 'web',
    accent: 'teal',
  },
  {
    id: 'landing-page',
    title: 'Landing Page',
    description: 'A responsive product page with a working demo block.',
    tag: 'HTML',
    file: 'Landing Page.html',
    format: 'html',
    category: 'web',
    accent: 'violet',
  },
  {
    id: 'project-one-pager',
    title: 'Project One-Pager',
    description: 'A designed one-page brief with goals and milestones.',
    tag: 'PDF',
    file: 'Project One-Pager.pdf',
    format: 'pdf',
    category: 'pdf',
    accent: 'navy',
  },
] as const

export const TEMPLATE_FILTERS: readonly {
  key: 'all' | TemplateCategory
  label: string
}[] = [
  { key: 'all', label: 'All' },
  { key: 'docs', label: 'Docs' },
  { key: 'sheets', label: 'Sheets' },
  { key: 'slides', label: 'Slides' },
  { key: 'web', label: 'Web' },
  { key: 'pdf', label: 'PDF' },
] as const

export function templateById(id: string): TemplateDef | undefined {
  return TEMPLATE_CATALOG.find((template) => template.id === id)
}
