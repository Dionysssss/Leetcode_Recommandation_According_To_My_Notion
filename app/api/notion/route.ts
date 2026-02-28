import { NextResponse } from 'next/server'
import {
  fetchAllNotionProblems,
  computeWeakTopics,
  computeDifficultyProfile,
} from '@/lib/notion'

export const runtime = 'nodejs'

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID

  if (!apiKey || !databaseId) {
    return NextResponse.json(
      {
        error:
          'Missing NOTION_API_KEY or NOTION_DATABASE_ID. Check your .env.local file.',
      },
      { status: 400 }
    )
  }

  try {
    const problems = await fetchAllNotionProblems(databaseId)
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
        { error: 'Invalid Notion API key. Check your NOTION_API_KEY.' },
        { status: 401 }
      )
    }
    if (error?.code === 'object_not_found') {
      return NextResponse.json(
        {
          error:
            'Notion database not found. Check your NOTION_DATABASE_ID and ensure the integration has access to the database.',
        },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 })
  }
}
