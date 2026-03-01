import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ParsedNotionProblem, WeakTopic, LeetCodeProblem, DifficultyProfile } from '@/lib/types'

// ── hoist mock fns so they're accessible inside the factory ──────────────────
const { mockCreate, mockStream } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockStream: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate, stream: mockStream }
  },
}))

import { generateRecommendations, analyzeWeaknesses, analyzeWeaknessesStreaming } from '@/lib/claude'

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
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('parses a clean JSON response from Claude', async () => {
    const payload = {
      recommendations: [
        { problemId: 198, reason: 'Good DP practice', targetTopics: ['Dynamic Programming'], confidence: 0.9 },
      ],
    }
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
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
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` }],
    })

    const result = await generateRecommendations('analysis text', weakTopics, candidates)
    expect(result).toHaveLength(1)
    expect(result[0].problemId).toBe(300)
  })

  it('returns empty array when response block is not text', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
    })

    const result = await generateRecommendations('analysis text', weakTopics, candidates)
    expect(result).toEqual([])
  })

  it('throws when JSON is malformed', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'this is not json' }],
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
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    })

    const result = await generateRecommendations('analysis text', weakTopics, candidates)
    expect(result).toHaveLength(2)
    expect(result[1].targetTopics).toContain('Binary Search')
  })
})

// ── analyzeWeaknesses ─────────────────────────────────────────────────────────
describe('analyzeWeaknesses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('returns the text from the first content block', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'You are weak at DP.' }],
    })

    const result = await analyzeWeaknesses(wrongProblems, weakTopics, profile)
    expect(result).toBe('You are weak at DP.')
  })

  it('returns empty string when first block is not text', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
    })

    const result = await analyzeWeaknesses(wrongProblems, weakTopics, profile)
    expect(result).toBe('')
  })

  it('calls Claude with the correct model', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'analysis' }],
    })
    process.env.AI_MODEL = 'claude-haiku-4-5-20251001'

    await analyzeWeaknesses(wrongProblems, weakTopics, profile)

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
    expect(callArgs.messages[0].role).toBe('user')
  })
})

// ── analyzeWeaknessesStreaming ────────────────────────────────────────────────
describe('analyzeWeaknessesStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('yields text_delta chunks', async () => {
    async function* fakeStream() {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' World' } }
      yield { type: 'message_delta', delta: {} } // non-text event, should be ignored
    }
    mockStream.mockReturnValueOnce(fakeStream())

    const chunks: string[] = []
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Hello', ' World'])
  })

  it('yields nothing when there are no text_delta events', async () => {
    async function* fakeStream() {
      yield { type: 'message_start', message: {} }
      yield { type: 'message_stop' }
    }
    mockStream.mockReturnValueOnce(fakeStream())

    const chunks: string[] = []
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([])
  })

  it('concatenates all chunks into a full text', async () => {
    const words = ['DP ', 'is ', 'your ', 'weakness.']
    async function* fakeStream() {
      for (const w of words) {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: w } }
      }
    }
    mockStream.mockReturnValueOnce(fakeStream())

    let full = ''
    for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, profile)) {
      full += chunk
    }

    expect(full).toBe('DP is your weakness.')
  })
})
