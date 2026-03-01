import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Handles Notion OAuth callback — exchanges code for access token
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const base = new URL('/', req.url)

  if (error || !code) {
    base.searchParams.set('error', error ?? 'access_denied')
    return NextResponse.redirect(base)
  }

  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET
  const redirectUri = process.env.NOTION_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    base.searchParams.set('error', 'server_config')
    return NextResponse.redirect(base)
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      base.searchParams.set('error', 'token_exchange')
      return NextResponse.redirect(base)
    }

    base.searchParams.set('connected', 'true')
    const response = NextResponse.redirect(base)
    response.cookies.set('notion_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  } catch {
    base.searchParams.set('error', 'network')
    return NextResponse.redirect(base)
  }
}
