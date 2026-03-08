import { NextRequest } from 'next/server'
import {
  getCandidatesByTopics,
  getCandidatesByDifficulty,
  computeDifficultyFilter,
  getProblemById,
  inferTopicsFromProblemName,
} from '@/lib/leetcode'
import {
  analyzeWeaknessesStreaming,
  generateRecommendations,
} from '@/lib/claude'
import type { WeakTopic, ParsedNotionProblem, DifficultyProfile } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RecommendBody {
  weakTopics: WeakTopic[]
  wrongProblems: ParsedNotionProblem[]
  solvedProblemIds: number[]
  difficultyProfile: DifficultyProfile
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing GEMINI_API_KEY' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body: RecommendBody = await req.json()
  const { weakTopics, wrongProblems, solvedProblemIds, difficultyProfile } = body

  if (!wrongProblems?.length) {
    return new Response(
      JSON.stringify({ error: 'No problems found in this database.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const difficultyFilter = computeDifficultyFilter(difficultyProfile)
  const excludeIds = new Set<number>(solvedProblemIds)

  // If no topic tags exist in the DB, infer topics from problem names/numbers
  let effectiveTopics = weakTopics ?? []
  if (effectiveTopics.length === 0) {
    const inferredTopicCounts = new Map<string, number>()
    for (const p of wrongProblems) {
      for (const t of inferTopicsFromProblemName(p.name)) {
        inferredTopicCounts.set(t, (inferredTopicCounts.get(t) ?? 0) + 1)
      }
    }
    effectiveTopics = Array.from(inferredTopicCounts.entries())
      .map(([topic, count]) => ({ topic, wrongCount: count, totalCount: count, errorRate: 1 }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
  }

  // Get candidates: by topic if available, otherwise diverse spread by difficulty
  const candidates = effectiveTopics.length > 0
    ? getCandidatesByTopics(effectiveTopics.slice(0, 5), excludeIds, difficultyFilter, 50)
    : getCandidatesByDifficulty(excludeIds, difficultyFilter, 50)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Phase 1: Stream weakness analysis
        send({ type: 'phase', phase: 'analysis' })
        let analysisText = ''

        for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, effectiveTopics, difficultyProfile)) {
          analysisText += chunk
          send({ type: 'text', text: chunk })
        }

        // Phase 2: Structured recommendations
        send({ type: 'phase', phase: 'recommendations' })
        const claudeRecs = await generateRecommendations(analysisText, effectiveTopics, candidates)

        const fullRecs = claudeRecs
          .map(rec => ({
            problem: getProblemById(rec.problemId),
            reason: rec.reason,
            targetTopics: rec.targetTopics,
            confidence: rec.confidence,
          }))
          .filter(r => r.problem !== undefined)

        send({
          type: 'done',
          weaknessAnalysis: analysisText,
          recommendations: fullRecs,
        })
        controller.close()
      } catch (error: any) {
        send({ type: 'error', message: error?.message ?? 'Unknown error' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
