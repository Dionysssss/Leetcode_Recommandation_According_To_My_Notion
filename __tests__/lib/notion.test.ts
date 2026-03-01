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

  it('returns empty array when no problems are Wrong', () => {
    const problems = [
      makeProblem({ topics: ['Array'], status: 'Solved' }),
      makeProblem({ topics: ['Array'], status: 'Attempted' }),
    ]
    expect(computeWeakTopics(problems)).toEqual([])
  })

  it('includes only topics that have at least one Wrong problem', () => {
    const problems = [
      makeProblem({ topics: ['Array', 'Hash Table'], status: 'Wrong' }),
      makeProblem({ topics: ['Tree'], status: 'Solved' }),
    ]
    const result = computeWeakTopics(problems)
    const topics = result.map(t => t.topic)
    expect(topics).toContain('Array')
    expect(topics).toContain('Hash Table')
    expect(topics).not.toContain('Tree')
  })

  it('calculates errorRate correctly', () => {
    const problems = [
      makeProblem({ topics: ['Array'], status: 'Wrong' }),
      makeProblem({ topics: ['Array'], status: 'Solved' }),
      makeProblem({ topics: ['Array'], status: 'Wrong' }),
      makeProblem({ topics: ['Array'], status: 'Solved' }),
    ]
    const result = computeWeakTopics(problems)
    expect(result).toHaveLength(1)
    expect(result[0].topic).toBe('Array')
    expect(result[0].wrongCount).toBe(2)
    expect(result[0].totalCount).toBe(4)
    expect(result[0].errorRate).toBeCloseTo(0.5)
  })

  it('sorts by wrongCount descending, then errorRate descending', () => {
    const problems = [
      // "DP": 1 wrong / 4 total → errorRate 0.25
      makeProblem({ topics: ['DP'], status: 'Wrong' }),
      makeProblem({ topics: ['DP'], status: 'Solved' }),
      makeProblem({ topics: ['DP'], status: 'Solved' }),
      makeProblem({ topics: ['DP'], status: 'Solved' }),

      // "Tree": 2 wrong / 3 total → errorRate 0.67
      makeProblem({ topics: ['Tree'], status: 'Wrong' }),
      makeProblem({ topics: ['Tree'], status: 'Wrong' }),
      makeProblem({ topics: ['Tree'], status: 'Solved' }),

      // "String": 3 wrong / 5 total → errorRate 0.60
      makeProblem({ topics: ['String'], status: 'Wrong' }),
      makeProblem({ topics: ['String'], status: 'Wrong' }),
      makeProblem({ topics: ['String'], status: 'Wrong' }),
      makeProblem({ topics: ['String'], status: 'Solved' }),
      makeProblem({ topics: ['String'], status: 'Solved' }),
    ]
    const result = computeWeakTopics(problems)
    // Primary sort: wrongCount desc → String(3) > Tree(2) > DP(1)
    expect(result[0].topic).toBe('String')
    expect(result[1].topic).toBe('Tree')
    expect(result[2].topic).toBe('DP')
  })

  it('uses errorRate as tiebreaker when wrongCount is equal', () => {
    const problems = [
      // "Array": 2 wrong / 4 total → errorRate 0.50
      makeProblem({ topics: ['Array'], status: 'Wrong' }),
      makeProblem({ topics: ['Array'], status: 'Wrong' }),
      makeProblem({ topics: ['Array'], status: 'Solved' }),
      makeProblem({ topics: ['Array'], status: 'Solved' }),

      // "Graph": 2 wrong / 2 total → errorRate 1.00
      makeProblem({ topics: ['Graph'], status: 'Wrong' }),
      makeProblem({ topics: ['Graph'], status: 'Wrong' }),
    ]
    const result = computeWeakTopics(problems)
    // Same wrongCount=2, Graph has higher errorRate → Graph first
    expect(result[0].topic).toBe('Graph')
    expect(result[1].topic).toBe('Array')
  })

  it('a problem with multiple topics contributes to each', () => {
    const problems = [
      makeProblem({ topics: ['BFS', 'Graph'], status: 'Wrong' }),
    ]
    const result = computeWeakTopics(problems)
    expect(result.find(t => t.topic === 'BFS')).toBeDefined()
    expect(result.find(t => t.topic === 'Graph')).toBeDefined()
  })

  it('ignores problems with no topics', () => {
    const problems = [
      makeProblem({ topics: [], status: 'Wrong' }),
    ]
    expect(computeWeakTopics(problems)).toEqual([])
  })
})

// ── computeDifficultyProfile ──────────────────────────────────────────────────
describe('computeDifficultyProfile', () => {
  it('returns all zeros when there are no solved problems', () => {
    expect(computeDifficultyProfile([])).toEqual({ easy: 0, medium: 0, hard: 0 })
  })

  it('returns 100/0/0 when all solved are Easy', () => {
    const problems = [
      makeProblem({ difficulty: 'Easy', status: 'Solved' }),
      makeProblem({ difficulty: 'Easy', status: 'Solved' }),
    ]
    expect(computeDifficultyProfile(problems)).toEqual({ easy: 100, medium: 0, hard: 0 })
  })

  it('rounds percentages', () => {
    // 1 Easy out of 3 → 33.33... → rounded to 33
    const problems = [
      makeProblem({ difficulty: 'Easy', status: 'Solved' }),
      makeProblem({ difficulty: 'Medium', status: 'Solved' }),
      makeProblem({ difficulty: 'Hard', status: 'Solved' }),
    ]
    const result = computeDifficultyProfile(problems)
    expect(result.easy).toBe(33)
    expect(result.medium).toBe(33)
    expect(result.hard).toBe(33)
  })

  it('handles mixed difficulties correctly', () => {
    const problems = [
      makeProblem({ difficulty: 'Easy', status: 'Solved' }),
      makeProblem({ difficulty: 'Easy', status: 'Solved' }),
      makeProblem({ difficulty: 'Medium', status: 'Solved' }),
      makeProblem({ difficulty: 'Hard', status: 'Solved' }),
    ]
    const result = computeDifficultyProfile(problems)
    expect(result.easy).toBe(50)
    expect(result.medium).toBe(25)
    expect(result.hard).toBe(25)
  })

  it('does not crash when difficulty is null', () => {
    const problems = [
      makeProblem({ difficulty: null, status: 'Solved' }),
      makeProblem({ difficulty: 'Easy', status: 'Solved' }),
    ]
    // null difficulty doesn't match any filter → easy: 1/2 = 50%, medium: 0, hard: 0
    const result = computeDifficultyProfile(problems)
    expect(result.easy).toBe(50)
    expect(result.medium).toBe(0)
    expect(result.hard).toBe(0)
  })
})
