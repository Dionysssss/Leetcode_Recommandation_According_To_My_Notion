/**
 * User flow: Select database → fetch problems + stats
 * Route: POST /api/notion
 *
 * Current design: ALL problems in the DB are treated as "wrong" —
 * no status filtering, stats.wrong always equals stats.total.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { ParsedNotionProblem } from '@/lib/types'

const mockFetchAll = vi.hoisted(() => vi.fn())
vi.mock('@/lib/notion', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/notion')>()
  return { ...real, fetchAllNotionProblems: mockFetchAll }
})

import { POST } from '@/app/api/notion/route'

function makeReq(body: object, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/notion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const SAMPLE_PROBLEMS: ParsedNotionProblem[] = [
  { notionId: 'p1', name: 'Two Sum',        leetcodeNumber: 1,  difficulty: 'Easy',
    topics: ['Array', 'Hash Table'], status: 'Solved', notes: '', attemptedDate: null, url: null },
  { notionId: 'p2', name: 'Climbing Stairs', leetcodeNumber: 70, difficulty: 'Easy',
    topics: ['Dynamic Programming'], status: 'Wrong',  notes: '', attemptedDate: null, url: null },
  { notionId: 'p3', name: 'House Robber',    leetcodeNumber: 198, difficulty: 'Medium',
    topics: ['Dynamic Programming', 'Array'], status: 'Wrong', notes: '', attemptedDate: null, url: null },
  { notionId: 'p4', name: 'Coin Change',     leetcodeNumber: 322, difficulty: 'Medium',
    topics: ['Dynamic Programming'], status: 'Wrong', notes: '', attemptedDate: null, url: null },
]

describe('POST /api/notion — user flow: load problems from selected database', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when no credentials are provided', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/credentials/i)
  })

  it('returns problems + stats on success', async () => {
    mockFetchAll.mockResolvedValueOnce(SAMPLE_PROBLEMS)

    const res = await POST(makeReq({ databaseId: 'db-123' }, { 'notion-token': 'secret_test' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.problems).toHaveLength(4)
    expect(body.stats.total).toBe(4)
  })

  it('all problems count as wrong (no status filtering)', async () => {
    mockFetchAll.mockResolvedValueOnce(SAMPLE_PROBLEMS)

    const res = await POST(makeReq({ databaseId: 'db-123' }, { 'notion-token': 'secret_test' }))
    const body = await res.json()
    // wrong = total, solved = 0
    expect(body.stats.wrong).toBe(body.stats.total)
    expect(body.stats.solved).toBe(0)
  })

  it('weakTopics reflects topic frequency across all problems', async () => {
    mockFetchAll.mockResolvedValueOnce(SAMPLE_PROBLEMS)

    const res = await POST(makeReq({ databaseId: 'db-123' }, { 'notion-token': 'secret_test' }))
    const body = await res.json()
    const topics: string[] = body.stats.weakTopics.map((t: any) => t.topic)
    // DP appears in 2 problems → should be top weak topic
    expect(topics[0]).toBe('Dynamic Programming')
  })

  it('returns 401 when Notion rejects the token', async () => {
    const err: any = new Error('unauthorized')
    err.code = 'unauthorized'
    mockFetchAll.mockRejectedValueOnce(err)

    const res = await POST(makeReq({ databaseId: 'db-123' }, { 'notion-token': 'bad_token' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when the database is not found', async () => {
    const err: any = new Error('not found')
    err.code = 'object_not_found'
    mockFetchAll.mockRejectedValueOnce(err)

    const res = await POST(makeReq({ databaseId: 'nonexistent' }, { 'notion-token': 'secret_test' }))
    expect(res.status).toBe(404)
  })
})
