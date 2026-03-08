import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  ParsedNotionProblem,
  WeakTopic,
  DifficultyProfile,
  LeetCodeProblem,
  ClaudeRecommendation,
} from './types'

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

function getModel(): string {
  return process.env.AI_MODEL ?? 'gemini-2.5-flash-lite'
}

function buildAnalysisPrompt(
  wrongProblems: ParsedNotionProblem[],
  weakTopics: WeakTopic[],
  profile: DifficultyProfile
): string {
  const problemLines = wrongProblems
    .slice(0, 30)
    .map(p => {
      const errorTags = (p.statusTags ?? [])
        .filter(t => !['reviewed', 'not reviewed', 'not_reviewed'].includes(t.toLowerCase()))
      const tagStr = errorTags.length > 0 ? ` | Error type: ${errorTags.join(', ')}` : ''
      return `- ${p.name} (${p.difficulty ?? 'Unknown'}) | Topics: ${p.topics.join(', ') || 'N/A'}${tagStr}\n  Notes: "${p.notes || 'No notes'}"`
    })
    .join('\n')

  const topicLines = weakTopics.length > 0
    ? weakTopics.slice(0, 8).map(t =>
        `- ${t.topic}: ${t.wrongCount} problems (${Math.round(t.errorRate * 100)}% error rate)`
      ).join('\n')
    : '(topics inferred from problem names)'

  const hasNotes = wrongProblems.some(p => p.notes?.trim())

  return `This is a student's complete wrong-problems log. Every entry is a problem they got wrong.

## Wrong Problems
${problemLines}

## Topic Distribution
${topicLines}

## Difficulty Profile
- Easy: ${profile.easy}%, Medium: ${profile.medium}%, Hard: ${profile.hard}%

Write a 150-200 word coaching analysis that:
1. Identifies the 2-3 most common ROOT CAUSES based on the error notes and error type tags
2. Names the algorithm topics that appear most frequently
${hasNotes ? '3. References specific patterns you see across multiple problem notes' : '3. Identifies the core algorithm concepts they need to strengthen'}
4. Ends with one concrete action for today's practice

Be direct. Reference actual problem names and notes. No generic advice.`
}

function buildRecommendPrompt(
  weaknessAnalysis: string,
  weakTopics: WeakTopic[],
  candidates: LeetCodeProblem[]
): string {
  const topicLine = weakTopics
    .slice(0, 5)
    .map(t => `${t.topic} (${Math.round(t.errorRate * 100)}% error rate)`)
    .join(', ')

  const candidateLines = candidates
    .map(p => `[${p.id}] ${p.title} | ${p.difficulty} | Topics: ${p.topics.join(', ')}`)
    .join('\n')

  return `## Student Weakness Summary
${weaknessAnalysis}

## Confirmed Weak Topics (priority order)
${topicLine}

## Candidate Problems (pre-filtered by topic relevance)
${candidateLines}

Select exactly 5 problems from the candidates above. Respond ONLY with valid JSON, no other text:
{
  "recommendations": [
    {
      "problemId": <number from the list>,
      "reason": "<2-3 sentences specific to this student's history and weak areas>",
      "targetTopics": ["<topic1>", "<topic2>"],
      "confidence": <0.0-1.0>
    }
  ]
}`
}

const ANALYSIS_SYSTEM =
  "You are a senior software engineer and LeetCode coach. Analyze students' practice history and identify specific patterns in their mistakes. Be specific, honest, and actionable."

const RECOMMEND_SYSTEM =
  'You are a LeetCode practice optimizer. Select the best problems from the candidate list to help a student improve their weaknesses. Only output valid JSON.'

export async function* analyzeWeaknessesStreaming(
  wrongProblems: ParsedNotionProblem[],
  weakTopics: WeakTopic[],
  profile: DifficultyProfile
): AsyncGenerator<string> {
  const model = getClient().getGenerativeModel({
    model: getModel(),
    systemInstruction: ANALYSIS_SYSTEM,
  })

  const result = await model.generateContentStream(
    buildAnalysisPrompt(wrongProblems, weakTopics, profile)
  )

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

export async function generateRecommendations(
  weaknessAnalysis: string,
  weakTopics: WeakTopic[],
  candidates: LeetCodeProblem[]
): Promise<ClaudeRecommendation[]> {
  const model = getClient().getGenerativeModel({
    model: getModel(),
    systemInstruction: RECOMMEND_SYSTEM,
  })

  const result = await model.generateContent(
    buildRecommendPrompt(weaknessAnalysis, weakTopics, candidates)
  )

  const text = result.response.text()
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return parsed.recommendations as ClaudeRecommendation[]
}
