'use client'

import { useState, useCallback, useEffect } from 'react'
import { LandingPage } from '@/components/LandingPage'
import { TokenForm } from '@/components/TokenForm'
import { DatabasePicker } from '@/components/DatabasePicker'
import { FieldMapper } from '@/components/FieldMapper'
import { LoadingState } from '@/components/LoadingState'
import { AnalysisStream } from '@/components/AnalysisStream'
import { WeakTopicsPanel } from '@/components/WeakTopicsPanel'
import { RecommendationCard } from '@/components/RecommendationCard'
import type { Recommendation, NotionStats, NotionDatabase, DatabaseProperty, FieldMapping } from '@/lib/types'

type LoadingStep = 'notion' | 'analysis' | 'recommendations'

type AppState =
  | { phase: 'landing' }
  | { phase: 'token'; isConnecting: boolean }
  | { phase: 'database'; databases: NotionDatabase[] }
  | { phase: 'mapping'; db: NotionDatabase; properties: DatabaseProperty[]; isLoading: boolean }
  | { phase: 'loading'; step: LoadingStep }
  | {
      phase: 'results'
      stats: NotionStats
      weaknessAnalysis: string
      recommendations: Recommendation[]
    }
  | { phase: 'error'; message: string }

export default function Home() {
  const [state, setState] = useState<AppState>({ phase: 'landing' })
  const [streamText, setStreamText] = useState('')
  const [notionToken, setNotionToken] = useState('')
  // Stored for back-navigation after mapping
  const [databases, setDatabases] = useState<NotionDatabase[]>([])

  // Handle OAuth return (?connected=true) or error (?error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    window.history.replaceState({}, '', window.location.pathname)

    if (error) {
      const messages: Record<string, string> = {
        access_denied: 'Notion access was denied. Please try again.',
        server_config: 'Server misconfiguration. Please contact support.',
        token_exchange: 'Failed to complete Notion authentication. Please try again.',
        network: 'Network error during authentication. Please try again.',
      }
      setState({ phase: 'error', message: messages[error] ?? `Authentication error: ${error}` })
      return
    }

    if (connected === 'true') {
      handleFetchDatabasesFromCookie()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchDatabasesFromCookie = useCallback(async () => {
    setState({ phase: 'token', isConnecting: true })
    try {
      const res = await fetch('/api/notion/databases')
      const data = await res.json()
      if (!res.ok) {
        setState({ phase: 'error', message: data.error ?? 'Failed to load databases' })
        return
      }
      setDatabases(data.databases)
      setState({ phase: 'database', databases: data.databases })
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message ?? 'Failed to connect to Notion' })
    }
  }, [])

  const handleConnect = useCallback(async (token: string) => {
    setNotionToken(token)
    setState({ phase: 'token', isConnecting: true })
    try {
      const res = await fetch('/api/notion/databases', {
        headers: { 'notion-token': token },
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ phase: 'error', message: data.error ?? 'Failed to connect to Notion' })
        return
      }
      setDatabases(data.databases)
      setState({ phase: 'database', databases: data.databases })
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message ?? 'Failed to connect to Notion' })
    }
  }, [])

  // After database selection → fetch schema → show FieldMapper
  const handleDatabaseSelect = useCallback(async (db: NotionDatabase) => {
    setState(prev => ({ phase: 'mapping', db, properties: [], isLoading: true }))
    try {
      const headers: Record<string, string> = {}
      if (notionToken) headers['notion-token'] = notionToken
      const res = await fetch(`/api/notion/schema?databaseId=${encodeURIComponent(db.id)}`, { headers })
      const data = await res.json()
      if (!res.ok) {
        setState({ phase: 'error', message: data.error ?? 'Failed to read database schema' })
        return
      }
      setState({ phase: 'mapping', db, properties: data.properties, isLoading: false })
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message ?? 'Failed to read schema' })
    }
  }, [notionToken])

  // After FieldMapper confirms → run analysis
  const handleAnalyze = useCallback(async (db: NotionDatabase, fieldMapping: FieldMapping) => {
    setState({ phase: 'loading', step: 'notion' })
    setStreamText('')

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (notionToken) headers['notion-token'] = notionToken

      const notionRes = await fetch('/api/notion', {
        method: 'POST',
        headers,
        body: JSON.stringify({ databaseId: db.id, fieldMapping }),
      })
      if (!notionRes.ok) {
        const err = await notionRes.json()
        setState({ phase: 'error', message: err.error ?? 'Failed to fetch Notion data' })
        return
      }
      const { problems, stats } = await notionRes.json()

      const wrongProblems = problems.filter((p: any) =>
        fieldMapping.wrongValues.includes(p.status ?? '')
      )
      const solvedProblemIds = problems
        .filter((p: any) => fieldMapping.solvedValues.includes(p.status ?? '') && p.leetcodeNumber)
        .map((p: any) => p.leetcodeNumber as number)

      if (wrongProblems.length === 0) {
        setState({
          phase: 'error',
          message: `No problems found with status "${fieldMapping.wrongValues.join('" or "')}" in your database. Check your field mapping.`,
        })
        return
      }

      setState({ phase: 'loading', step: 'analysis' })

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
          try { event = JSON.parse(raw) } catch { continue }

          if (event.type === 'phase' && event.phase === 'recommendations') {
            setState({ phase: 'loading', step: 'recommendations' })
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

      setState({ phase: 'results', stats, weaknessAnalysis: finalAnalysis, recommendations: finalRecs })
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message ?? 'Unexpected error' })
    }
  }, [notionToken])

  // ── Render ─────────────────────────────────────────────────

  if (state.phase === 'landing') {
    return <LandingPage onEnter={() => setState({ phase: 'token', isConnecting: false })} />
  }

  if (state.phase === 'token') {
    return (
      <TokenForm
        onConnect={handleConnect}
        onBack={() => setState({ phase: 'landing' })}
        isConnecting={state.isConnecting}
      />
    )
  }

  if (state.phase === 'database') {
    return (
      <DatabasePicker
        databases={state.databases}
        onSelect={handleDatabaseSelect}
        onBack={() => setState({ phase: 'token', isConnecting: false })}
      />
    )
  }

  if (state.phase === 'mapping') {
    if (state.isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-400 text-sm">Reading database schema...</p>
          </div>
        </div>
      )
    }
    return (
      <FieldMapper
        db={state.db}
        properties={state.properties}
        onConfirm={(fieldMapping) => handleAnalyze(state.db, fieldMapping)}
        onBack={() => setState({ phase: 'database', databases })}
      />
    )
  }

  if (state.phase === 'loading') {
    return <LoadingState step={state.step} />
  }

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
            onClick={() => setState({ phase: 'landing' })}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  // Results
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Practice Recommendations</h1>
            <p className="text-sm text-gray-500 mt-1">Based on {state.stats.wrong} wrong answers in your Notion DB</p>
          </div>
          <button
            onClick={() => { setState({ phase: 'landing' }); setStreamText(''); setNotionToken('') }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Start Over
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WeakTopicsPanel stats={state.stats} />
          <AnalysisStream text={state.weaknessAnalysis} isStreaming={false} />
        </div>

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
