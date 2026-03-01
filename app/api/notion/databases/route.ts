import { NextRequest, NextResponse } from 'next/server'
import { fetchNotionDatabases } from '@/lib/notion'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.headers.get('notion-token')
  if (!token) {
    return NextResponse.json({ error: 'Missing notion-token header' }, { status: 400 })
  }

  try {
    const databases = await fetchNotionDatabases(token)
    return NextResponse.json({ databases })
  } catch (error: any) {
    if (error?.code === 'unauthorized') {
      return NextResponse.json({ error: 'Invalid Notion API key.' }, { status: 401 })
    }
    return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status: 500 })
  }
}
