import { NextRequest } from 'next/server'
import {
  getCandidatesByTopics,
  computeDifficultyFilter,
  getProblemById,
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

  if (!weakTopics?.length || !wrongProblems?.length) {
    return new Response(
      JSON.stringify({ error: 'No wrong problems found. Add problems with Status=Wrong to your Notion database.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Pre-filter candidates before calling Claude
  const difficultyFilter = computeDifficultyFilter(difficultyProfile)
  const excludeIds = new Set<number>(solvedProblemIds)
  const candidates = getCandidatesByTopics(weakTopics.slice(0, 5), excludeIds, difficultyFilter, 50)

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

        for await (const chunk of analyzeWeaknessesStreaming(wrongProblems, weakTopics, difficultyProfile)) {
          analysisText += chunk
          send({ type: 'text', text: chunk })
        }

        // Phase 2: Structured recommendations
        send({ type: 'phase', phase: 'recommendations' })
        const claudeRecs = await generateRecommendations(analysisText, weakTopics, candidates)

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
