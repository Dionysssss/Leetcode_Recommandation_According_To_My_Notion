export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface ParsedNotionProblem {
  notionId: string
  name: string
  leetcodeNumber: number | null
  difficulty: Difficulty | null
  topics: string[]
  status: string | null   // raw value from Notion — compared against FieldMapping
  notes: string
  attemptedDate: string | null
  url: string | null
}

export interface DatabaseProperty {
  name: string
  type: 'select' | 'status' | 'multi_select'
  options: string[]
}

export interface FieldMapping {
  statusProperty: string   // which Notion property holds the status
  wrongValues: string[]    // values that mean "wrong / needs practice"
  solvedValues: string[]   // values that mean "solved / correct"
}

export interface WeakTopic {
  topic: string
  wrongCount: number
  totalCount: number
  errorRate: number
}

export interface DifficultyProfile {
  easy: number
  medium: number
  hard: number
}

export interface NotionStats {
  total: number
  wrong: number
  solved: number
  attempted: number
  weakTopics: WeakTopic[]
  difficultyProfile: DifficultyProfile
}

export interface LeetCodeProblem {
  id: number
  slug: string
  title: string
  difficulty: Difficulty
  topics: string[]
  url: string
  isPremium: boolean
}

export interface ClaudeRecommendation {
  problemId: number
  reason: string
  targetTopics: string[]
  confidence: number
}

export interface Recommendation {
  problem: LeetCodeProblem
  reason: string
  targetTopics: string[]
  confidence: number
}

export interface RecommendResponse {
  weaknessAnalysis: string
  recommendations: Recommendation[]
}

export interface NotionDatabase {
  id: string
  name: string
  url: string
}

export interface Credentials {
  notionToken: string
  anthropicKey: string
  databaseId: string
  databaseName: string
}
