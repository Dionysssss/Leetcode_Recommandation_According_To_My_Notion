import { describe, it, expect } from 'vitest'
import { computeWeakTopics, computeDifficultyProfile } from '@/lib/notion'
import type { ParsedNotionProblem } from '@/lib/types'

function makeProblem(overrides: Partial<ParsedNotionProblem> = {}): ParsedNotionProblem {
  return {
    notionId: 'id-1', name: 'Test Problem', leetcodeNumber: 1, difficulty: 'Easy',
    topics: [], status: null, notes: '', attemptedDate: null, url: null,
    ...overrides,
  }
}

// ── computeWeakTopics ─────────────────────────────────────────────────────────
// All problems in DB are treated as "wrong"; errorRate is always 1.
describe('computeWeakTopics', () => {
  it('returns empty array when there are no problems', () => {
    expect(computeWeakTopics([])).toEqual([])
  })

  it('returns empty array when problems have no topics', () => {
    expect(computeWeakTopics([makeProblem({ topics: [] })])).toEqual([])
  })

  it('counts every problem that has the topic', () => {
    const problems = [
      makeProblem({ topics: ['Array'] }),
      makeProblem({ topics: ['Array'] }),
      makeProblem({ topics: ['Tree'] }),
    ]
    const result = computeWeakTopics(problems)
    expect(result.find(t => t.topic === 'Array')?.wrongCount).toBe(2)
    expect(result.find(t => t.topic === 'Tree')?.wrongCount).toBe(1)
  })

  it('errorRate is always 1.0', () => {
    const [entry] = computeWeakTopics([makeProblem({ topics: ['DP'] })])
    expect(entry.errorRate).toBe(1)
    expect(entry.wrongCount).toBe(entry.totalCount)
  })

  it('sorts by wrongCount descending', () => {
    const problems = [
      makeProblem({ topics: ['Tree'] }),
      makeProblem({ topics: ['DP'] }),
      makeProblem({ topics: ['DP'] }),
      makeProblem({ topics: ['DP'] }),
      makeProblem({ topics: ['Tree'] }),
    ]
    const result = computeWeakTopics(problems)
    expect(result[0].topic).toBe('DP')   // 3
    expect(result[1].topic).toBe('Tree') // 2
  })

  it('a problem with multiple topics contributes to each', () => {
    const topics = computeWeakTopics([makeProblem({ topics: ['BFS', 'Graph'] })]).map(t => t.topic)
    expect(topics).toContain('BFS')
    expect(topics).toContain('Graph')
  })

  it('counts all problems regardless of status', () => {
    const problems = [
      makeProblem({ topics: ['Array'], status: 'Solved' }),
      makeProblem({ topics: ['Array'], status: 'Wrong' }),
      makeProblem({ topics: ['Array'], status: null }),
    ]
    expect(computeWeakTopics(problems)[0].wrongCount).toBe(3)
  })
})

// ── computeDifficultyProfile ──────────────────────────────────────────────────
// Uses ALL problems (no solved-only filtering).
describe('computeDifficultyProfile', () => {
  it('returns all zeros when there are no problems', () => {
    expect(computeDifficultyProfile([])).toEqual({ easy: 0, medium: 0, hard: 0 })
  })

  it('returns 100/0/0 when all problems are Easy', () => {
    const problems = [makeProblem({ difficulty: 'Easy' }), makeProblem({ difficulty: 'Easy' })]
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
    const result = computeDifficultyProfile([
      makeProblem({ difficulty: null }),
      makeProblem({ difficulty: 'Easy' }),
    ])
    expect(result.easy).toBe(50)
    expect(result.medium).toBe(0)
    expect(result.hard).toBe(0)
  })

  it('counts all problems regardless of status', () => {
    const result = computeDifficultyProfile([
      makeProblem({ difficulty: 'Easy',   status: 'Solved' }),
      makeProblem({ difficulty: 'Medium', status: 'Wrong' }),
    ])
    expect(result.easy).toBe(50)
    expect(result.medium).toBe(50)
  })
})
