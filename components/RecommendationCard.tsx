'use client'

import type { Recommendation } from '@/lib/types'

interface RecommendationCardProps {
  recommendation: Recommendation
  rank: number
}

const DIFFICULTY_STYLES = {
  Easy: 'bg-green-900/40 text-green-400 border-green-800/60',
  Medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/60',
  Hard: 'bg-red-900/40 text-red-400 border-red-800/60',
}

export function RecommendationCard({ recommendation, rank }: RecommendationCardProps) {
  const { problem, reason, targetTopics, confidence } = recommendation
  const confidencePct = Math.round(confidence * 100)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 text-gray-400 text-xs font-bold flex items-center justify-center">
            {rank}
          </span>
          <h3 className="font-semibold text-white text-sm leading-tight truncate">
            #{problem.id} {problem.title}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            DIFFICULTY_STYLES[problem.difficulty]
          }`}
        >
          {problem.difficulty}
        </span>
      </div>

      {/* Target topics */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {targetTopics.map(t => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-300 border border-blue-800/60"
          >
            {t}
          </span>
        ))}
        {problem.topics
          .filter(t => !targetTopics.includes(t))
          .slice(0, 2)
          .map(t => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700"
            >
              {t}
            </span>
          ))}
      </div>

      {/* AI reason */}
      <p className="text-xs text-gray-400 leading-relaxed mb-4">{reason}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Match</span>
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{confidencePct}%</span>
        </div>
        <a
          href={problem.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Solve on LeetCode
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  )
}
