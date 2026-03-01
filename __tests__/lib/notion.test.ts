import { describe, it, expect } from 'vitest'
import { computeWeakTopics, computeDifficultyProfile } from '@/lib/notion'
import type { ParsedNotionProblem } from '@/lib/types'

// ── helpers ──────────────────────────────────────────────────────────────────
function makeProblem(
  overrides: Partial<ParsedNotionProblem> = {}
): ParsedNotionProblem {
  return {
    notionId: 'id-1',
    name: 'Test Problem',
    leetcodeNumber: 1,
    difficulty: 'Easy',
    topics: [],
    status: null,
    notes: '',
    attemptedDate: null,
    url: null,
    ...overrides,
  }
}

// ── computeWeakTopics ─────────────────────────────────────────────────────────
describe('computeWeakTopics', () => {
  it('returns empty array when there are no problems', () => {
    expect(computeWeakTopics([])).toEqual([])
  })

  it('returns empty array when problems have no topics', () => {
    const problems = [
      makeProblem({ topics: [] }),
      makeProblem({ topics: [] }),
    ]
    expect(computeWeakTopics(problems)).toEqual([])
  })

  it('includes all topics from all problems regardless of status', () => {
    const problems = [
      makeProblem({ topics: ['Array', 'Hash Table'], status: null }),
      makeProblem({ topics: ['Tree'], status: null }),
    ]
    const result = computeWeakTopics(problems)
    const topics = result.map(t => t.topic)
    expect(topics).toContain('Array')
    expect(topics).toContain('Hash Table')
    expect(topics).toContain('Tree')
  })

  it('counts all problems for each topic and sets errorRate to 1', () => {
    const problems = [
      makeProblem({ topics: ['Array'] }),
      makeProblem({ topics: ['Array'] }),
      makeProblem({ topics: ['Array'] }),
      makeProblem({ topics: ['Array'] }),
    ]
    const result = computeWeakTopics(problems)
    expect(result).toHaveLength(1)
    expect(result[0].topic).toBe('Array')
    expect(result[0].wrongCount).toBe(4)
    expect(result[0].totalCount).toBe(4)
    expect(result[0].errorRate).toBe(1)
  })

  it('sorts by wrongCount descending', () => {
    const problems = [
      makeProblem({ topics: ['DP'] }),
      makeProblem({ topics: ['Tree'] }),
      makeProblem({ topics: ['Tree'] }),
      makeProblem({ topics: ['String'] }),
      makeProblem({ topics: ['String'] }),
      makeProblem({ topics: ['String'] }),
    ]
    const result = computeWeakTopics(problems)
    expect(result[0].topic).toBe('String')
    expect(result[1].topic).toBe('Tree')
    expect(result[2].topic).toBe('DP')
  })

  it('a problem with multiple topics contributes to each', () => {
    const problems = [
      makeProblem({ topics: ['BFS', 'Graph'] }),
    ]
    const result = computeWeakTopics(problems)
    expect(result.find(t => t.topic === 'BFS')).toBeDefined()
    expect(result.find(t => t.topic === 'Graph')).toBeDefined()
  })

  it('ignores problems with no topics', () => {
    const problems = [
      makeProblem({ topics: [] }),
    ]
    expect(computeWeakTopics(problems)).toEqual([])
  })
})

// ── computeDifficultyProfile ──────────────────────────────────────────────────
describe('computeDifficultyProfile', () => {
  it('returns all zeros when there are no problems', () => {
    expect(computeDifficultyProfile([])).toEqual({ easy: 0, medium: 0, hard: 0 })
  })

  it('returns 100/0/0 when all problems are Easy', () => {
    const problems = [
      makeProblem({ difficulty: 'Easy' }),
      makeProblem({ difficulty: 'Easy' }),
    ]
    expect(computeDifficultyProfile(problems)).toEqual({ easy: 100, medium: 0, hard: 0 })
  })

  it('rounds percentages', () => {
    const problems = [
      makeProblem({ difficulty: 'Easy' }),
      makeProblem({ difficulty: 'Medium' }),
      makeProblem({ difficulty: 'Hard' }),
    ]
    const result = computeDifficultyProfile(problems)
    expect(result.easy).toBe(33)
    expect(result.medium).toBe(33)
    expect(result.hard).toBe(33)
  })

  it('handles mixed difficulties correctly', () => {
    const problems = [
      makeProblem({ difficulty: 'Easy' }),
      makeProblem({ difficulty: 'Easy' }),
      makeProblem({ difficulty: 'Medium' }),
      makeProblem({ difficulty: 'Hard' }),
    ]
    const result = computeDifficultyProfile(problems)
    expect(result.easy).toBe(50)
    expect(result.medium).toBe(25)
    expect(result.hard).toBe(25)
  })

  it('does not crash when difficulty is null', () => {
    const problems = [
      makeProblem({ difficulty: null }),
      makeProblem({ difficulty: 'Easy' }),
    ]
    // null difficulty doesn't match any filter → easy: 1/2 = 50%, medium: 0, hard: 0
    const result = computeDifficultyProfile(problems)
    expect(result.easy).toBe(50)
    expect(result.medium).toBe(0)
    expect(result.hard).toBe(0)
  })
})
