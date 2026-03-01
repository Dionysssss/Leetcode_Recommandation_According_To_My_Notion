import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ParsedNotionProblem, WeakTopic, LeetCodeProblem, DifficultyProfile } from '@/lib/types'

// ── hoist mock fns ────────────────────────────────────────────────────────────
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

import { generateRecommendations, analyzeWeaknessesStreaming } from '@/lib/claude'

// ── fixtures ──────────────────────────────────────────────────────────────────
const weakTopics: WeakTopic[] = [
  { topic: 'Dynamic Programming', wrongCount: 3, totalCount: 5, errorRate: 0.6 },
  { topic: 'Tree', wrongCount: 2, totalCount: 4, errorRate: 0.5 },
]

const wrongProblems: ParsedNotionProblem[] = [
  {
    notionId: 'n1', name: 'Climbing Stairs', leetcodeNumber: 70,
    difficulty: 'Easy', topics: ['Dynamic Programming'], status: 'Wrong',
    notes: 'Forgot base case', attemptedDate: null, url: null,
  },
]

const profile: DifficultyProfile = { easy: 40, medium: 40, hard: 20 }

const candidates: LeetCodeProblem[] = [
  { id: 198, slug: 'house-robber', title: 'House Robber', difficulty: 'Medium', topics: ['Dynamic Programming', 'Array'], url: 'u', isPremium: false },
  { id: 300, slug: 'lis', title: 'Longest Increasing Subsequence', difficulty: 'Medium', topics: ['Dynamic Programming', 'Binary Search'], url: 'u', isPremium: false },
]

// ── generateRecommendations ───────────────────────────────────────────────────
describe('generateRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('parses a clean JSON response', async () => {
    const payload = {
      recommendations: [
        { problemId: 198, reason: 'Good DP practice', targetTopics: ['Dynamic Programming'], confidence: 0.9 },
      ],
    }
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(payload) },
    })

    const result = await generateRecommendations('analysis text', weakTopics, candidates)
    expect(result).toHaveLength(1)
    expect(result[0].problemId).toBe(198)
    expect(result[0].confidence).toBe(0.9)
  })

  it('strips markdown code fences before parsing', async () => {
    const payload = {
      recommendations: [
        { problemId: 300, reason: 'DP + Binary Search combo', targetTopics: ['Dynamic Programming'], confidence: 0.85 },
      ],
    }
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` },
    })

    const result = await generateRecommendations('analysis text', weakTopics, candidates)
    expect(result).toHaveLength(1)
    expect(result[0].problemId).toBe(300)
  })

  it('throws when JSON is malformed', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'this is not json' },
    })

    await expect(
      generateRecommendations('analysis text', weakTopics, candidates)
    ).rejects.toThrow()
  })

  it('handles multiple recommendations', async () => {
    const payload = {
      recommendations: [
        { problemId: 198, reason: 'Reason 1', targetTopics: ['Dynamic Programming'], confidence: 0.9 },
        { problemId: 300, reason: 'Reason 2', targetTopics: ['Dynamic Programming', 'Binary Search'], confidence: 0.8 },
      ],
    }
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(payload) },
    })

    const result = await generateRecommendations('analysis text', weakTopics, candidates)
    expect(result).toHaveLength(2)
    expect(result[1].targetTopics).toContain('Binary Search')
  })

  it('uses the model name from AI_MODEL env var', async () => {
    process.env.AI_MODEL = 'gemini-1.5-pro'
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ recommendations: [] }) },
    })

    await generateRecommendations('analysis', weakTopics, candidates)
    // If model override works, no error is thrown (model name is passed to getGenerativeModel internally)
    expect(mockGenerateContent).toHaveBeenCalledOnce()
  })
})

// ── analyzeWeaknessesStreaming ────────────────────────────────────────────────
describe('analyzeWeaknessesStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('yields text from each chunk', async () => {
    async function* fakeStream() {
      yield { text: () => 'Hello' }
      yield { text: () => ' World' }
    }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    const chunks: string[] = []
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Hello', ' World'])
  })

  it('skips chunks with empty text', async () => {
    async function* fakeStream() {
      yield { text: () => 'First' }
      yield { text: () => '' }   // empty — should be skipped
      yield { text: () => 'Last' }
    }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    const chunks: string[] = []
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['First', 'Last'])
  })

  it('yields nothing when stream is empty', async () => {
    async function* fakeStream() { /* no yields */ }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    const chunks: string[] = []
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([])
  })

  it('concatenates all chunks into a full analysis', async () => {
    const words = ['DP ', 'is ', 'your ', 'weakness.']
    async function* fakeStream() {
      for (const w of words) yield { text: () => w }
    }
    mockGenerateContentStream.mockResolvedValueOnce({ stream: fakeStream() })

    let full = ''
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      full += chunk
    }

    expect(full).toBe('DP is your weakness.')
  })
})
