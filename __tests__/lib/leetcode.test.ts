import { describe, it, expect } from 'vitest'
import {
  normalizeTopicName,
  computeDifficultyFilter,
  getCandidatesByTopics,
  getProblemById,
  getAllProblems,
} from '@/lib/leetcode'
import type { WeakTopic } from '@/lib/types'

// Uses the real dataset (212 problems, all non-premium).

// ── normalizeTopicName ────────────────────────────────────────────────────────
describe('normalizeTopicName', () => {
  it('maps known aliases', () => {
    expect(normalizeTopicName('DP')).toBe('Dynamic Programming')
    expect(normalizeTopicName('BFS')).toBe('Breadth-First Search')
    expect(normalizeTopicName('DFS')).toBe('Depth-First Search')
    expect(normalizeTopicName('Two Pointer')).toBe('Two Pointers')
    expect(normalizeTopicName('Hash Map')).toBe('Hash Table')
    expect(normalizeTopicName('HashMap')).toBe('Hash Table')
    expect(normalizeTopicName('Heap')).toBe('Heap (Priority Queue)')
    expect(normalizeTopicName('Priority Queue')).toBe('Heap (Priority Queue)')
  })

  it('returns the original string for unknown topics', () => {
    expect(normalizeTopicName('Unknown Topic')).toBe('Unknown Topic')
    expect(normalizeTopicName('Array')).toBe('Array')
  })

  it('is case-sensitive — lowercase aliases are not mapped', () => {
    expect(normalizeTopicName('dp')).toBe('dp')
    expect(normalizeTopicName('bfs')).toBe('bfs')
  })
})

// ── computeDifficultyFilter ───────────────────────────────────────────────────
describe('computeDifficultyFilter', () => {
  it('returns all difficulties when profile has no history (all 0)', () => {
    expect(computeDifficultyFilter({ easy: 0, medium: 0, hard: 0 })).toEqual(
      expect.arrayContaining(['Easy', 'Medium', 'Hard'])
    )
  })

  it('returns Medium + Hard when hard >= 30%', () => {
    const result = computeDifficultyFilter({ easy: 30, medium: 40, hard: 30 })
    expect(result).toContain('Medium')
    expect(result).toContain('Hard')
    expect(result).not.toContain('Easy')
  })

  it('returns all difficulties when medium >= 50% (and hard < 30%)', () => {
    const result = computeDifficultyFilter({ easy: 30, medium: 50, hard: 20 })
    expect(result).toContain('Easy')
    expect(result).toContain('Medium')
    expect(result).toContain('Hard')
  })

  it('returns Easy + Medium as default when medium < 50% and hard < 30%', () => {
    const result = computeDifficultyFilter({ easy: 70, medium: 20, hard: 10 })
    expect(result).toContain('Easy')
    expect(result).toContain('Medium')
    expect(result).not.toContain('Hard')
  })

  it('hard check takes precedence over medium check (hard >= 30 wins)', () => {
    // hard=30 AND medium=50 → hard branch fires first → no Easy
    const result = computeDifficultyFilter({ easy: 20, medium: 50, hard: 30 })
    expect(result).not.toContain('Easy')
    expect(result).toContain('Medium')
    expect(result).toContain('Hard')
  })
})

// ── helpers ───────────────────────────────────────────────────────────────────
function makeWeakTopic(topic: string, wrongCount = 1, totalCount = 1): WeakTopic {
  return { topic, wrongCount, totalCount, errorRate: wrongCount / totalCount }
}

// ── getCandidatesByTopics ─────────────────────────────────────────────────────
describe('getCandidatesByTopics', () => {
  it('returns an empty array when weakTopics is empty', () => {
    const result = getCandidatesByTopics([], new Set(), ['Easy', 'Medium', 'Hard'], 50)
    expect(result).toEqual([])
  })

  it('returns an empty array when no problems match the topic', () => {
    // "Unknown Topic XYZ" is not in the dataset
    const result = getCandidatesByTopics(
      [makeWeakTopic('Unknown Topic XYZ')],
      new Set(),
      ['Easy', 'Medium', 'Hard'],
      50
    )
    expect(result).toEqual([])
  })

  it('excludes problem IDs in the excludeIds set', () => {
    // Two Sum (id=1) has topic Array
    const result = getCandidatesByTopics(
      [makeWeakTopic('Array')],
      new Set([1]),
      ['Easy', 'Medium', 'Hard'],
      50
    )
    expect(result.map(p => p.id)).not.toContain(1)
  })

  it('only returns problems matching the difficulty filter', () => {
    const result = getCandidatesByTopics(
      [makeWeakTopic('Array')],
      new Set(),
      ['Easy'],
      50
    )
    expect(result.length).toBeGreaterThan(0)
    for (const p of result) {
      expect(p.difficulty).toBe('Easy')
    }
  })

  it('respects maxCount limit', () => {
    const result = getCandidatesByTopics(
      [makeWeakTopic('Array'), makeWeakTopic('Hash Table')],
      new Set(),
      ['Easy', 'Medium', 'Hard'],
      3
    )
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('boosts score for problems covering multiple weak topics — multi-topic problems ranked first', () => {
    // Two Sum (id=1) covers BOTH Array AND Hash Table → should score higher
    // than a problem covering only one of these topics
    const weakTopics = [makeWeakTopic('Array', 3, 5), makeWeakTopic('Hash Table', 2, 3)]
    const result = getCandidatesByTopics(weakTopics, new Set(), ['Easy', 'Medium', 'Hard'], 50)
    const twoSum = result.find(p => p.id === 1) // Two Sum: Array + Hash Table
    expect(twoSum).toBeDefined()
    // Two Sum should outrank any problem that has only Array (not Hash Table)
    const onlyArray = result.find(p => p.topics.includes('Array') && !p.topics.includes('Hash Table'))
    if (onlyArray) {
      const twoSumIdx = result.indexOf(twoSum!)
      const onlyArrayIdx = result.indexOf(onlyArray)
      expect(twoSumIdx).toBeLessThan(onlyArrayIdx)
    }
  })

  it('normalizes topic aliases before lookup — "DP" finds Dynamic Programming problems', () => {
    const result = getCandidatesByTopics(
      [makeWeakTopic('DP')],
      new Set(),
      ['Easy', 'Medium', 'Hard'],
      50
    )
    expect(result.length).toBeGreaterThan(0)
    // Every returned problem should include Dynamic Programming as a topic
    for (const p of result) {
      expect(p.topics).toContain('Dynamic Programming')
    }
  })

  it('normalizes "Hash Map" alias to find Hash Table problems', () => {
    const result = getCandidatesByTopics(
      [makeWeakTopic('Hash Map')],
      new Set(),
      ['Easy', 'Medium', 'Hard'],
      50
    )
    expect(result.length).toBeGreaterThan(0)
    for (const p of result) {
      expect(p.topics).toContain('Hash Table')
    }
  })
})

// ── getProblemById ────────────────────────────────────────────────────────────
describe('getProblemById', () => {
  it('returns the correct problem for a known id', () => {
    const p = getProblemById(1)
    expect(p).toBeDefined()
    expect(p?.title).toBe('Two Sum')
    expect(p?.difficulty).toBe('Easy')
  })

  it('returns undefined for an id not in the dataset', () => {
    expect(getProblemById(99999)).toBeUndefined()
  })
})

// ── getAllProblems ────────────────────────────────────────────────────────────
describe('getAllProblems', () => {
  it('returns the full problem list (212 problems)', () => {
    const problems = getAllProblems()
    expect(problems.length).toBe(212)
  })

  it('all problems have required fields', () => {
    const problems = getAllProblems()
    for (const p of problems) {
      expect(typeof p.id).toBe('number')
      expect(typeof p.title).toBe('string')
      expect(['Easy', 'Medium', 'Hard']).toContain(p.difficulty)
      expect(Array.isArray(p.topics)).toBe(true)
      expect(typeof p.isPremium).toBe('boolean')
    }
  })
})
