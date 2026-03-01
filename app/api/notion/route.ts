import { NextRequest, NextResponse } from 'next/server'
import {
  fetchAllNotionProblems,
  computeWeakTopics,
  computeDifficultyProfile,
  DEFAULT_FIELD_MAPPING,
} from '@/lib/notion'
import type { FieldMapping } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const notionToken =
    req.headers.get('notion-token') ??
    req.cookies.get('notion_token')?.value ??
    process.env.NOTION_API_KEY

  const body = await req.json().catch(() => ({}))
  const databaseId: string | undefined = body.databaseId ?? process.env.NOTION_DATABASE_ID
  const fieldMapping: FieldMapping = body.fieldMapping ?? DEFAULT_FIELD_MAPPING

  if (!notionToken || !databaseId) {
    return NextResponse.json(
      { error: 'Missing Notion credentials.' },
      { status: 400 }
    )
  }

  try {
    const problems = await fetchAllNotionProblems(databaseId, notionToken, fieldMapping)
    const wrongProblems = problems.filter(p => fieldMapping.wrongValues.includes(p.status ?? ''))
    const weakTopics = computeWeakTopics(problems, fieldMapping.wrongValues)
    const difficultyProfile = computeDifficultyProfile(problems, fieldMapping.solvedValues)

    return NextResponse.json(
      {
        problems,
        stats: {
          total: problems.length,
          wrong: wrongProblems.length,
          solved: problems.filter(p => fieldMapping.solvedValues.includes(p.status ?? '')).length,
          attempted: problems.length - wrongProblems.length,
          weakTopics,
          difficultyProfile,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    if (error?.code === 'unauthorized') {
      return NextResponse.json({ error: 'Invalid Notion API key.' }, { status: 401 })
    }
    if (error?.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Notion database not found. Ensure the integration has access to this database.' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 })
  }
}
