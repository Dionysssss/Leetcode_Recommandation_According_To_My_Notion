/**
 * User flow: Enter Notion token → fetch list of databases
 * Route: GET /api/notion/databases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── mock lib/notion ───────────────────────────────────────────────────────────
const mockFetchNotionDatabases = vi.hoisted(() => vi.fn())
vi.mock('@/lib/notion', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/notion')>()
  return { ...real, fetchNotionDatabases: mockFetchNotionDatabases }
})

import { GET } from '@/app/api/notion/databases/route'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/notion/databases', { headers })
}

describe('GET /api/notion/databases — user flow: connect Notion account', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when no notion-token header is provided', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/token/i)
  })

  it('returns the database list on success', async () => {
    const dbs = [
      { id: 'db1', name: 'LeetCode Problems', url: 'https://notion.so/db1' },
      { id: 'db2', name: 'Study Notes',       url: 'https://notion.so/db2' },
    ]
    mockFetchNotionDatabases.mockResolvedValueOnce(dbs)

    const res = await GET(makeReq({ 'notion-token': 'secret_test' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.databases).toHaveLength(2)
    expect(body.databases[0].name).toBe('LeetCode Problems')
  })

  it('returns 401 when Notion rejects the token', async () => {
    const err: any = new Error('unauthorized')
    err.code = 'unauthorized'
    mockFetchNotionDatabases.mockRejectedValueOnce(err)

    const res = await GET(makeReq({ 'notion-token': 'bad_token' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/invalid/i)
  })

  it('returns 500 on unexpected errors', async () => {
    mockFetchNotionDatabases.mockRejectedValueOnce(new Error('network timeout'))

    const res = await GET(makeReq({ 'notion-token': 'secret_test' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('network timeout')
  })
})
