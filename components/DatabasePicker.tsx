'use client'

import { useState } from 'react'
import type { NotionDatabase } from '@/lib/types'

interface DatabasePickerProps {
  databases: NotionDatabase[]
  onSelect: (db: NotionDatabase) => void
  onBack: () => void
}

export function DatabasePicker({ databases, onSelect, onBack }: DatabasePickerProps) {
  const [selected, setSelected] = useState<NotionDatabase | null>(null)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Select Database</h2>
          <p className="text-gray-400 text-sm">Choose your LeetCode practice database</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2 mb-4">
          {databases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No databases found.</p>
              <p className="text-gray-600 text-xs mt-1">
                Make sure your integration is shared with at least one database in Notion.
              </p>
            </div>
          ) : (
            databases.map(db => (
              <button
                key={db.id}
                onClick={() => setSelected(db)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selected?.id === db.id
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selected?.id === db.id ? 'bg-blue-400' : 'bg-gray-600'}`} />
                  <span className="text-sm font-medium truncate">{db.name}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150"
        >
          Analyze My Practice
        </button>
      </div>
    </div>
  )
}
