import { NextRequest, NextResponse } from 'next/server'
import {
  fetchAllNotionProblems,
  computeWeakTopics,
  computeDifficultyProfile,
} from '@/lib/notion'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const notionToken =
    req.headers.get('notion-token') ??
    req.cookies.get('notion_token')?.value ??
    process.env.NOTION_API_KEY

  const body = await req.json().catch(() => ({}))
  const databaseId: string | undefined = body.databaseId ?? process.env.NOTION_DATABASE_ID

  if (!notionToken || !databaseId) {
    return NextResponse.json(
      { error: 'Missing Notion credentials.' },
      { status: 400 }
    )
  }

  try {
    const problems = await fetchAllNotionProblems(databaseId, notionToken)
    const weakTopics = computeWeakTopics(problems)
    const difficultyProfile = computeDifficultyProfile(problems)

    return NextResponse.json(
      {
        problems,
        stats: {
          total: problems.length,
          wrong: problems.length,
          solved: 0,
          attempted: 0,
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
