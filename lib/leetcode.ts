import type { LeetCodeProblem, Difficulty, WeakTopic } from './types'

// Topic alias map — normalizes user's Notion tags to dataset topic names
const TOPIC_ALIASES: Record<string, string> = {
  'DP': 'Dynamic Programming',
  'BFS': 'Breadth-First Search',
  'DFS': 'Depth-First Search',
  'Two Pointer': 'Two Pointers',
  'Two pointer': 'Two Pointers',
  'Sliding window': 'Sliding Window',
  'sliding window': 'Sliding Window',
  'Binary search': 'Binary Search',
  'binary search': 'Binary Search',
  'Linked List': 'Linked List',
  'linked list': 'Linked List',
  'Hash Map': 'Hash Table',
  'HashMap': 'Hash Table',
  'Hashmap': 'Hash Table',
  'Tree': 'Tree',
  'Graph': 'Graph',
  'Stack': 'Stack',
  'Queue': 'Queue',
  'Heap': 'Heap (Priority Queue)',
  'Priority Queue': 'Heap (Priority Queue)',
  'Trie': 'Trie',
  'Backtracking': 'Backtracking',
  'Greedy': 'Greedy',
  'Bit Manipulation': 'Bit Manipulation',
  'Math': 'Math',
  'String': 'String',
  'Array': 'Array',
  'Matrix': 'Matrix',
  'Recursion': 'Recursion',
  'Divide and Conquer': 'Divide and Conquer',
  'Monotonic Stack': 'Monotonic Stack',
}

export function normalizeTopicName(topic: string): string {
  return TOPIC_ALIASES[topic] ?? topic
}

let _problems: LeetCodeProblem[] | null = null
let _topicIndex: Map<string, LeetCodeProblem[]> | null = null
let _idIndex: Map<number, LeetCodeProblem> | null = null

function loadProblems(): LeetCodeProblem[] {
  if (_problems) return _problems
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _problems = require('@/data/leetcode-problems.json') as LeetCodeProblem[]
  } catch {
    _problems = []
  }
  return _problems
}

function getTopicIndex(): Map<string, LeetCodeProblem[]> {
  if (_topicIndex) return _topicIndex
  const problems = loadProblems()
  _topicIndex = new Map()
  for (const p of problems) {
    for (const topic of p.topics) {
      if (!_topicIndex.has(topic)) _topicIndex.set(topic, [])
      _topicIndex.get(topic)!.push(p)
    }
  }
  return _topicIndex
}

function getIdIndex(): Map<number, LeetCodeProblem> {
  if (_idIndex) return _idIndex
  const problems = loadProblems()
  _idIndex = new Map(problems.map(p => [p.id, p]))
  return _idIndex
}

export function getProblemById(id: number): LeetCodeProblem | undefined {
  return getIdIndex().get(id)
}

export function computeDifficultyFilter(profile: { easy: number; medium: number; hard: number }): Difficulty[] {
  // If mostly Easy solved → offer Easy + Medium
  // If mostly Medium → offer Medium + Hard
  // If no history → offer all
  if (profile.easy + profile.medium + profile.hard === 0) return ['Easy', 'Medium', 'Hard']
  if (profile.hard >= 30) return ['Medium', 'Hard']
  if (profile.medium >= 50) return ['Easy', 'Medium', 'Hard']
  return ['Easy', 'Medium']
}

export function getCandidatesByTopics(
  weakTopics: WeakTopic[],
  excludeIds: Set<number>,
  difficultyFilter: Difficulty[],
  maxCount: number
): LeetCodeProblem[] {
  const topicIndex = getTopicIndex()
  const seen = new Set<number>()
  const candidates: Array<{ problem: LeetCodeProblem; score: number }> = []

  // Score each problem by how many weak topics it covers
  for (let i = 0; i < weakTopics.length; i++) {
    const normalizedTopic = normalizeTopicName(weakTopics[i].topic)
    const topicProblems = topicIndex.get(normalizedTopic) ?? []

    for (const problem of topicProblems) {
      if (problem.isPremium) continue
      if (excludeIds.has(problem.id)) continue
      if (!difficultyFilter.includes(problem.difficulty)) continue
      if (seen.has(problem.id)) {
        // Already scored — boost score
        const existing = candidates.find(c => c.problem.id === problem.id)
        if (existing) existing.score += (weakTopics.length - i)
        continue
      }
      seen.add(problem.id)
      candidates.push({ problem, score: weakTopics.length - i })
    }
  }

  // Sort by score descending, take top maxCount
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, maxCount).map(c => c.problem)
}

export function getAllProblems(): LeetCodeProblem[] {
  return loadProblems()
}
