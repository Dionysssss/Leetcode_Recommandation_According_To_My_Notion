import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Initiates the Notion OAuth flow
export async function GET(req: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID
  const redirectUri = process.env.NOTION_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL('/?error=server_config', req.url))
  }

  const url = new URL('https://api.notion.com/v1/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('owner', 'user')
  url.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(url)
}
