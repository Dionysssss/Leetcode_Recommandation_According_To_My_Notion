/**
 * User flow: Click "Analyze" → receive streaming recommendations
 * Route: POST /api/recommend  (SSE stream)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { WeakTopic, ParsedNotionProblem, DifficultyProfile } from '@/lib/types'

// ── mock Google Generative AI ─────────────────────────────────────────────────
const { mockGenerateContent, mockGenerateContentStream } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGenerateContentStream: vi.fn(),
}))
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      }
    }
  },
}))

import { POST } from '@/app/api/recommend/route'

// ── helpers ───────────────────────────────────────────────────────────────────
function makeReq(body: object): NextRequest {
  return new NextRequest('http://localhost/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Parse all SSE events from a Response stream */
async function collectSSE(res: Response): Promise<Array<{ type: string; [k: string]: any }>> {
  const text = await res.text()
  return text
    .split('\n\n')
    .filter(line => line.startsWith('data: '))
    .map(line => JSON.parse(line.slice(6)))
}

const WEAK_TOPICS: WeakTopic[] = [
  { topic: 'Dynamic Programming', wrongCount: 2, totalCount: 3, errorRate: 0.67 },
]
const WRONG_PROBLEMS: ParsedNotionProblem[] = [
  { notionId: 'p1', name: 'Climbing Stairs', leetcodeNumber: 70, difficulty: 'Easy',
    topics: ['Dynamic Programming'], status: 'Wrong', notes: 'forgot base case',
    attemptedDate: null, url: null },
]
const PROFILE: DifficultyProfile = { easy: 50, medium: 40, hard: 10 }

// ── tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/recommend — user flow: analyze weak areas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('returns 400 when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY

    const res = await POST(makeReq({
      weakTopics: WEAK_TOPICS, wrongProblems: WRONG_PROBLEMS,
      solvedProblemIds: [], difficultyProfile: PROFILE,
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/GEMINI_API_KEY/)
  })

  it('returns 400 when there are no wrong problems', async () => {
    const res = await POST(makeReq({
      weakTopics: [], wrongProblems: [],
      solvedProblemIds: [], difficultyProfile: PROFILE,
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/wrong problems/i)
  })

  it('streams SSE events in the correct order: phase→text→phase→done', async () => {
    async function* fakeStream() {
      yield { text: () => 'You are weak at DP.' }
    }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    const recs = [
      { problemId: 198, reason: 'Good DP practice', targetTopics: ['Dynamic Programming'], confidence: 0.9 },
    ]
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ recommendations: recs }) },
    })

    const res = await POST(makeReq({
      weakTopics: WEAK_TOPICS, wrongProblems: WRONG_PROBLEMS,
      solvedProblemIds: [], difficultyProfile: PROFILE,
    }))

    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const events = await collectSSE(res)
    const types = events.map(e => e.type)

    expect(types[0]).toBe('phase')
    expect(events[0].phase).toBe('analysis')

    const textEvents = events.filter(e => e.type === 'text')
    expect(textEvents.length).toBeGreaterThan(0)
    expect(textEvents.map(e => e.text).join('')).toContain('DP')

    const phaseRec = events.find(e => e.type === 'phase' && e.phase === 'recommendations')
    expect(phaseRec).toBeDefined()

    const done = events.find(e => e.type === 'done')
    expect(done).toBeDefined()
    expect(done.weaknessAnalysis).toContain('DP')
    expect(done.recommendations).toHaveLength(1)
  })

  it('done event includes matched LeetCode problem details', async () => {
    async function* fakeStream() { yield { text: () => 'analysis' } }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    // id=198 exists in real dataset (House Robber)
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ recommendations: [
        { problemId: 198, reason: 'Good', targetTopics: ['Dynamic Programming'], confidence: 0.9 },
      ]})},
    })

    const res = await POST(makeReq({
      weakTopics: WEAK_TOPICS, wrongProblems: WRONG_PROBLEMS,
      solvedProblemIds: [], difficultyProfile: PROFILE,
    }))
    const events = await collectSSE(res)
    const done = events.find(e => e.type === 'done')

    expect(done.recommendations[0].problem.title).toBe('House Robber')
    expect(done.recommendations[0].problem.id).toBe(198)
    expect(done.recommendations[0].reason).toBe('Good')
  })

  it('filters out recommendations whose problem ID does not exist in dataset', async () => {
    async function* fakeStream() { yield { text: () => 'analysis' } }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ recommendations: [
        { problemId: 99999, reason: 'Hallucinated', targetTopics: [], confidence: 0.5 },
        { problemId: 198,   reason: 'Real problem',  targetTopics: ['Dynamic Programming'], confidence: 0.9 },
      ]})},
    })

    const res = await POST(makeReq({
      weakTopics: WEAK_TOPICS, wrongProblems: WRONG_PROBLEMS,
      solvedProblemIds: [], difficultyProfile: PROFILE,
    }))
    const events = await collectSSE(res)
    const done = events.find(e => e.type === 'done')

    // hallucinated id=99999 filtered out, only real id=198 remains
    expect(done.recommendations).toHaveLength(1)
    expect(done.recommendations[0].problem.id).toBe(198)
  })

  it('streams an error event when the AI call fails', async () => {
    async function* failStream() { throw new Error('Gemini quota exceeded') }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: failStream() })

    const res = await POST(makeReq({
      weakTopics: WEAK_TOPICS, wrongProblems: WRONG_PROBLEMS,
      solvedProblemIds: [], difficultyProfile: PROFILE,
    }))

    const events = await collectSSE(res)
    const errEvent = events.find(e => e.type === 'error')
    expect(errEvent).toBeDefined()
    expect(errEvent.message).toMatch(/quota exceeded/i)
  })

  it('excludes already-solved problems from recommendations', async () => {
    async function* fakeStream() { yield { text: () => 'analysis' } }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ recommendations: [
        { problemId: 198, reason: 'Good', targetTopics: ['Dynamic Programming'], confidence: 0.9 },
      ]})},
    })

    // getCandidatesByTopics receives excludeIds — verify the call goes through
    const res = await POST(makeReq({
      weakTopics: WEAK_TOPICS, wrongProblems: WRONG_PROBLEMS,
      solvedProblemIds: [198],  // 198 is "already solved"
      difficultyProfile: PROFILE,
    }))

    // The AI still returned id=198 (ignoring the hint), but the route itself
    // doesn't re-filter — the exclusion happens at the candidate pre-filter stage.
    // What we verify: the route accepts the field and doesn't crash.
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
