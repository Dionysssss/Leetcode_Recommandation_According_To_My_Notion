'use client'

import { useState, useCallback } from 'react'
import { SetupForm } from '@/components/SetupForm'
import { LoadingState } from '@/components/LoadingState'
import { AnalysisStream } from '@/components/AnalysisStream'
import { WeakTopicsPanel } from '@/components/WeakTopicsPanel'
import { RecommendationCard } from '@/components/RecommendationCard'
import type { Recommendation, NotionStats } from '@/lib/types'

type LoadingStep = 'notion' | 'analysis' | 'recommendations'

type AppState =
  | { phase: 'setup' }
  | { phase: 'loading'; step: LoadingStep }
  | {
      phase: 'results'
      stats: NotionStats
      weaknessAnalysis: string
      recommendations: Recommendation[]
    }
  | { phase: 'error'; message: string }

export default function Home() {
  const [state, setState] = useState<AppState>({ phase: 'setup' })
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const handleAnalyze = useCallback(async () => {
    setState({ phase: 'loading', step: 'notion' })
    setStreamText('')

    try {
      // Step 1: Fetch Notion data
      const notionRes = await fetch('/api/notion')
      if (!notionRes.ok) {
        const err = await notionRes.json()
        setState({ phase: 'error', message: err.error ?? 'Failed to fetch Notion data' })
        return
      }
      const notionData = await notionRes.json()
      const { problems, stats } = notionData

      const wrongProblems = problems.filter((p: any) => p.status === 'Wrong')
      const solvedProblemIds = problems
        .filter((p: any) => p.status === 'Solved' && p.leetcodeNumber)
        .map((p: any) => p.leetcodeNumber as number)

      if (wrongProblems.length === 0) {
        setState({
          phase: 'error',
          message: 'No problems marked as "Wrong" in your Notion database. Add some problems with Status=Wrong to get recommendations.',
        })
        return
      }

      // Step 2: Start SSE stream for analysis + recommendations
      setState({ phase: 'loading', step: 'analysis' })
      setIsStreaming(true)

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakTopics: stats.weakTopics,
          wrongProblems,
          solvedProblemIds,
          difficultyProfile: stats.difficultyProfile,
        }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setState({ phase: 'error', message: err.error ?? 'Recommendation failed' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalAnalysis = ''
      let finalRecs: Recommendation[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: any
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event.type === 'phase' && event.phase === 'recommendations') {
            setState({ phase: 'loading', step: 'recommendations' })
            setIsStreaming(false)
          } else if (event.type === 'text') {
            finalAnalysis += event.text
            setStreamText(prev => prev + event.text)
          } else if (event.type === 'done') {
            finalAnalysis = event.weaknessAnalysis
            finalRecs = event.recommendations
          } else if (event.type === 'error') {
            setState({ phase: 'error', message: event.message })
            return
          }
        }
      }

      setIsStreaming(false)
      setState({
        phase: 'results',
        stats,
        weaknessAnalysis: finalAnalysis,
        recommendations: finalRecs,
      })
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message ?? 'Unexpected error' })
    }
  }, [])

  // Loading phase — show step progress
  if (state.phase === 'loading') {
    return <LoadingState step={state.step} />
  }

  // Error state
  if (state.phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md bg-gray-900 border border-red-900 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-6">{state.message}</p>
          <button
            onClick={() => setState({ phase: 'setup' })}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  // Results page
  if (state.phase === 'results') {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Practice Recommendations</h1>
              <p className="text-sm text-gray-500 mt-1">Based on {state.stats.wrong} wrong answers in your Notion DB</p>
            </div>
            <button
              onClick={() => {
                setState({ phase: 'setup' })
                setStreamText('')
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Top panel: stats + analysis side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <WeakTopicsPanel stats={state.stats} />
            <AnalysisStream text={state.weaknessAnalysis} isStreaming={false} />
          </div>

          {/* Recommendations grid */}
          <h2 className="text-lg font-semibold text-white mb-4">Recommended Problems</h2>
          {state.recommendations.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-gray-400">No recommendations generated. Try adding more topic tags to your Notion problems.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {state.recommendations.map((rec, i) => (
                <RecommendationCard key={rec.problem.id} recommendation={rec} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Setup screen (default)
  return <SetupForm onAnalyze={handleAnalyze} isLoading={false} />
}
