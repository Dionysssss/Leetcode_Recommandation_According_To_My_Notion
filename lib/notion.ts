import { Client } from '@notionhq/client'
import type {
  ParsedNotionProblem,
  WeakTopic,
  DifficultyProfile,
  ProblemStatus,
  Difficulty,
} from './types'

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

function parseNotionPage(page: any): ParsedNotionProblem {
  const props = page.properties
  return {
    notionId: page.id,
    name: extractTitle(props['Name']),
    leetcodeNumber: extractNumber(props['LeetCode Number']),
    difficulty: extractSelect(props['Difficulty']) as Difficulty | null,
    topics: extractMultiSelect(props['Topics']),
    status: extractSelect(props['Status']) as ProblemStatus | null,
    notes: extractRichText(props['My Notes']),
    attemptedDate: extractDate(props['Attempted Date']),
    url: extractUrl(props['URL']),
  }
}

export async function fetchAllNotionProblems(databaseId: string): Promise<ParsedNotionProblem[]> {
  const notion = new Client({ auth: process.env.NOTION_API_KEY })
  const problems: ParsedNotionProblem[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const page of response.results) {
      problems.push(parseNotionPage(page))
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return problems
}

export function computeWeakTopics(problems: ParsedNotionProblem[]): WeakTopic[] {
  const topicMap = new Map<string, { wrong: number; total: number }>()

  for (const p of problems) {
    for (const topic of p.topics) {
      if (!topicMap.has(topic)) topicMap.set(topic, { wrong: 0, total: 0 })
      const entry = topicMap.get(topic)!
      entry.total++
      if (p.status === 'Wrong') entry.wrong++
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

export function computeDifficultyProfile(solvedProblems: ParsedNotionProblem[]): DifficultyProfile {
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
