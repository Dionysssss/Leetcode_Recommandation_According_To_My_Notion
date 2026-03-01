import { NextRequest, NextResponse } from 'next/server'
import {
  fetchAllNotionProblems,
  computeWeakTopics,
  computeDifficultyProfile,
} from '@/lib/notion'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const notionToken =
    req.headers.get('notion-token') ??
    req.cookies.get('notion_token')?.value ??
    process.env.NOTION_API_KEY
  const databaseId = req.headers.get('notion-database-id') ?? process.env.NOTION_DATABASE_ID

  if (!notionToken || !databaseId) {
    return NextResponse.json(
      { error: 'Missing Notion credentials. Please provide your API token and select a database.' },
      { status: 400 }
    )
  }

  try {
    const problems = await fetchAllNotionProblems(databaseId, notionToken)
    const wrongProblems = problems.filter(p => p.status === 'Wrong')
    const solvedProblems = problems.filter(p => p.status === 'Solved')
    const weakTopics = computeWeakTopics(problems)
    const difficultyProfile = computeDifficultyProfile(solvedProblems)

    return NextResponse.json(
      {
        problems,
        stats: {
          total: problems.length,
          wrong: wrongProblems.length,
          solved: solvedProblems.length,
          attempted: problems.filter(p => p.status === 'Attempted').length,
          weakTopics,
          difficultyProfile,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    if (error?.code === 'unauthorized') {
      return NextResponse.json(
        { error: 'Invalid Notion API key.' },
        { status: 401 }
      )
    }
    if (error?.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Notion database not found. Ensure the integration has access to the selected database.' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 })
  }
}
