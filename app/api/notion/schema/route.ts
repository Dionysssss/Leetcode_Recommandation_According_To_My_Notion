import { NextRequest, NextResponse } from 'next/server'
import { fetchDatabaseSchema } from '@/lib/notion'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.headers.get('notion-token') ?? req.cookies.get('notion_token')?.value
  const databaseId = req.nextUrl.searchParams.get('databaseId')

  if (!token) return NextResponse.json({ error: 'Missing Notion token' }, { status: 400 })
  if (!databaseId) return NextResponse.json({ error: 'Missing databaseId' }, { status: 400 })

  try {
    const properties = await fetchDatabaseSchema(databaseId, token)
    return NextResponse.json({ properties })
  } catch (error: any) {
    if (error?.code === 'unauthorized') {
      return NextResponse.json({ error: 'Invalid Notion token.' }, { status: 401 })
    }
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 })
  }
}
