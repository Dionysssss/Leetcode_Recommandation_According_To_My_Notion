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
  return process.env.AI_MODEL ?? 'gemini-2.0-flash-lite'
}

function buildAnalysisPrompt(
  wrongProblems: ParsedNotionProblem[],
  weakTopics: WeakTopic[],
  profile: DifficultyProfile
): string {
  const problemLines = wrongProblems
    .slice(0, 30)
    .map(
      p =>
        `- ${p.name} (${p.difficulty ?? 'Unknown'}) | Topics: ${p.topics.join(', ') || 'N/A'}\n  Notes: "${p.notes || 'No notes'}"`
    )
    .join('\n')

  const topicLines = weakTopics
    .slice(0, 8)
    .map(
      t =>
        `- ${t.topic}: ${t.wrongCount} wrong / ${t.totalCount} total (${Math.round(t.errorRate * 100)}% error rate)`
    )
    .join('\n')

  return `Here is a student's LeetCode practice history. Analyze their weak areas.

## Problems They Got Wrong
${problemLines}

## Topic Error Rates
${topicLines}

## Difficulty Profile (solved problems)
- Easy: ${profile.easy}%, Medium: ${profile.medium}%, Hard: ${profile.hard}%

Write a 150-200 word coaching analysis that:
1. Names the 2-3 most critical weak areas with specific reasoning
2. Identifies the pattern of mistakes if visible from their notes
3. Gives one concrete mental model or technique to internalize
4. Ends with one sentence on what today's practice should focus on

Be direct and specific. No generic advice.`
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
