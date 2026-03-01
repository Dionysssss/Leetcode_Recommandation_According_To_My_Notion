import { Client } from '@notionhq/client'
import type {
  ParsedNotionProblem,
  WeakTopic,
  DifficultyProfile,
  Difficulty,
  NotionDatabase,
  DatabaseProperty,
  FieldMapping,
} from './types'

// ── Extractors ────────────────────────────────────────────────

function extractTitle(property: any): string {
  return property?.title?.map((t: any) => t.plain_text).join('') ?? ''
}

function extractSelect(property: any): string | null {
  return property?.select?.name ?? null
}

function extractMultiSelect(property: any): string[] {
  return property?.multi_select?.map((opt: any) => opt.name) ?? []
}

function extractRichText(property: any): string {
  return property?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
}

function extractNumber(property: any): number | null {
  return property?.number ?? null
}

function extractDate(property: any): string | null {
  return property?.date?.start ?? null
}

function extractUrl(property: any): string | null {
  return property?.url ?? null
}

// Handles both Notion's `select` type and built-in `status` type
function extractStatusValue(property: any): string | null {
  if (!property) return null
  if (property.select?.name) return property.select.name
  if (property.status?.name) return property.status.name
  return null
}

// Finds the title property regardless of what it's called
function extractTitleFromProps(props: Record<string, any>): string {
  if (props['Name']?.title) return extractTitle(props['Name'])
  const entry = Object.values(props).find((p: any) => p.type === 'title')
  return entry ? extractTitle(entry) : ''
}

// ── Page parser ────────────────────────────────────────────────

function parseNotionPage(page: any, statusProperty: string): ParsedNotionProblem {
  const props = page.properties
  return {
    notionId: page.id,
    name: extractTitleFromProps(props),
    leetcodeNumber: extractNumber(props['LeetCode Number']),
    difficulty: extractSelect(props['Difficulty']) as Difficulty | null,
    topics: extractMultiSelect(props['Topics']),
    status: extractStatusValue(props[statusProperty]),
    notes: extractRichText(props['My Notes']),
    attemptedDate: extractDate(props['Attempted Date']),
    url: extractUrl(props['URL']),
  }
}

// ── Default field mapping (backwards compat) ──────────────────

export const DEFAULT_FIELD_MAPPING: FieldMapping = {
  statusProperty: 'Status',
  wrongValues: ['Wrong'],
  solvedValues: ['Solved'],
}

// ── Public API ─────────────────────────────────────────────────

export async function fetchNotionDatabases(authToken: string): Promise<NotionDatabase[]> {
  const notion = new Client({ auth: authToken })
  const databases: NotionDatabase[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.search({
      filter: { property: 'object', value: 'database' },
      start_cursor: cursor,
      page_size: 100,
    })

    for (const result of response.results) {
      if (result.object === 'database') {
        const db = result as any
        const name = db.title?.map((t: any) => t.plain_text).join('') || 'Untitled'
        databases.push({ id: db.id, name, url: db.url ?? '' })
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return databases
}

export async function fetchDatabaseSchema(
  databaseId: string,
  authToken?: string
): Promise<DatabaseProperty[]> {
  const notion = new Client({ auth: authToken ?? process.env.NOTION_API_KEY })
  const db = await notion.databases.retrieve({ database_id: databaseId }) as any
  const properties: DatabaseProperty[] = []

  for (const [name, prop] of Object.entries(db.properties as Record<string, any>)) {
    if (prop.type === 'select') {
      properties.push({ name, type: 'select', options: prop.select.options.map((o: any) => o.name) })
    } else if (prop.type === 'status') {
      // Notion's built-in status type: options are grouped
      const options: string[] = (prop.status?.options ?? []).map((o: any) => o.name)
      properties.push({ name, type: 'status', options })
    } else if (prop.type === 'multi_select') {
      properties.push({ name, type: 'multi_select', options: prop.multi_select.options.map((o: any) => o.name) })
    }
  }

  return properties
}

export async function fetchAllNotionProblems(
  databaseId: string,
  authToken?: string,
  fieldMapping: FieldMapping = DEFAULT_FIELD_MAPPING
): Promise<ParsedNotionProblem[]> {
  const notion = new Client({ auth: authToken ?? process.env.NOTION_API_KEY })
  const problems: ParsedNotionProblem[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const page of response.results) {
      problems.push(parseNotionPage(page, fieldMapping.statusProperty))
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return problems
}

export function computeWeakTopics(
  problems: ParsedNotionProblem[],
  wrongValues: string[] = DEFAULT_FIELD_MAPPING.wrongValues
): WeakTopic[] {
  const topicMap = new Map<string, { wrong: number; total: number }>()

  for (const p of problems) {
    for (const topic of p.topics) {
      if (!topicMap.has(topic)) topicMap.set(topic, { wrong: 0, total: 0 })
      const entry = topicMap.get(topic)!
      entry.total++
      if (wrongValues.includes(p.status ?? '')) entry.wrong++
    }
  }

  return Array.from(topicMap.entries())
    .map(([topic, { wrong, total }]) => ({
      topic,
      wrongCount: wrong,
      totalCount: total,
      errorRate: total > 0 ? wrong / total : 0,
    }))
    .filter(t => t.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || b.errorRate - a.errorRate)
}

export function computeDifficultyProfile(
  problems: ParsedNotionProblem[],
  solvedValues: string[] = DEFAULT_FIELD_MAPPING.solvedValues
): DifficultyProfile {
  const solvedProblems = problems.filter(p => solvedValues.includes(p.status ?? ''))
  const total = solvedProblems.length
  if (total === 0) return { easy: 0, medium: 0, hard: 0 }

  const easy = solvedProblems.filter(p => p.difficulty === 'Easy').length
  const medium = solvedProblems.filter(p => p.difficulty === 'Medium').length
  const hard = solvedProblems.filter(p => p.difficulty === 'Hard').length

  return {
    easy: Math.round((easy / total) * 100),
    medium: Math.round((medium / total) * 100),
    hard: Math.round((hard / total) * 100),
  }
}
