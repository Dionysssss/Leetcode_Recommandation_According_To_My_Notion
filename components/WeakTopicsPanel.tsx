'use client'

import type { WeakTopic, NotionStats } from '@/lib/types'

interface WeakTopicsPanelProps {
  stats: NotionStats
}

function TopicBar({ topic }: { topic: WeakTopic }) {
  const pct = Math.round(topic.errorRate * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium truncate max-w-[70%]">{topic.topic}</span>
        <span className="text-gray-500 ml-2 flex-shrink-0">
          {topic.wrongCount}/{topic.totalCount} wrong
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-500">{pct}% error rate</div>
    </div>
  )
}

export function WeakTopicsPanel({ stats }: WeakTopicsPanelProps) {
  const topTopics = stats.weakTopics.slice(0, 6)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      {/* Summary row */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">Weak Topics</h2>
        <div className="flex gap-3 text-xs">
          <span className="text-gray-500">{stats.total} total</span>
          <span className="text-red-400 font-medium">{stats.wrong} wrong</span>
          <span className="text-green-400 font-medium">{stats.solved} solved</span>
        </div>
      </div>

      {topTopics.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No wrong problems found. Mark some as <code className="text-red-400">Wrong</code> in Notion.
        </p>
      ) : (
        <div className="space-y-4">
          {topTopics.map(t => (
            <TopicBar key={t.topic} topic={t} />
          ))}
        </div>
      )}

      {/* Difficulty profile */}
      <div className="mt-5 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">Your solved problems by difficulty</p>
        <div className="flex gap-2">
          {stats.difficultyProfile.easy > 0 && (
            <div className="flex-1 text-center bg-green-900/30 border border-green-800/50 rounded-lg py-2">
              <div className="text-lg font-bold text-green-400">{stats.difficultyProfile.easy}%</div>
              <div className="text-xs text-green-600">Easy</div>
            </div>
          )}
          {stats.difficultyProfile.medium > 0 && (
            <div className="flex-1 text-center bg-yellow-900/30 border border-yellow-800/50 rounded-lg py-2">
              <div className="text-lg font-bold text-yellow-400">{stats.difficultyProfile.medium}%</div>
              <div className="text-xs text-yellow-600">Medium</div>
            </div>
          )}
          {stats.difficultyProfile.hard > 0 && (
            <div className="flex-1 text-center bg-red-900/30 border border-red-800/50 rounded-lg py-2">
              <div className="text-lg font-bold text-red-400">{stats.difficultyProfile.hard}%</div>
              <div className="text-xs text-red-600">Hard</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
