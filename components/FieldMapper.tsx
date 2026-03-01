'use client'

import { useState, useMemo } from 'react'
import type { DatabaseProperty, FieldMapping, NotionDatabase } from '@/lib/types'

interface FieldMapperProps {
  db: NotionDatabase
  properties: DatabaseProperty[]
  onConfirm: (mapping: FieldMapping) => void
  onBack: () => void
}

const WRONG_HINTS = ['wrong', 'incorrect', 'fail', 'error', '错', '不', '需要', 'retry', 'redo', 'review', 'again', 'miss', 'rethink']
const SOLVED_HINTS = ['solved', 'correct', 'done', 'pass', 'ac', '对', '完', 'finish', 'right', 'clear', 'success']
const STATUS_PROP_HINTS = ['status', 'state', 'result', '状态', '结果', 'progress', 'review']

function autoDetect(properties: DatabaseProperty[]): FieldMapping {
  const candidates = properties.filter(p => p.type === 'select' || p.type === 'status')
  const statusProp =
    candidates.find(p => STATUS_PROP_HINTS.some(h => p.name.toLowerCase().includes(h))) ??
    candidates[0]

  const wrongValues = (statusProp?.options ?? []).filter(opt =>
    WRONG_HINTS.some(h => opt.toLowerCase().includes(h))
  )
  const solvedValues = (statusProp?.options ?? []).filter(opt =>
    SOLVED_HINTS.some(h => opt.toLowerCase().includes(h))
  )

  return {
    statusProperty: statusProp?.name ?? '',
    wrongValues,
    solvedValues,
  }
}

export function FieldMapper({ db, properties, onConfirm, onBack }: FieldMapperProps) {
  const detected = useMemo(() => autoDetect(properties), [properties])

  const [statusProperty, setStatusProperty] = useState(detected.statusProperty)
  const [wrongValues, setWrongValues] = useState<string[]>(detected.wrongValues)
  const [solvedValues, setSolvedValues] = useState<string[]>(detected.solvedValues)

  const selectCandidates = properties.filter(p => p.type === 'select' || p.type === 'status')
  const currentOptions = properties.find(p => p.name === statusProperty)?.options ?? []

  const handleStatusPropChange = (name: string) => {
    setStatusProperty(name)
    const opts = properties.find(p => p.name === name)?.options ?? []
    setWrongValues(opts.filter(o => WRONG_HINTS.some(h => o.toLowerCase().includes(h))))
    setSolvedValues(opts.filter(o => SOLVED_HINTS.some(h => o.toLowerCase().includes(h))))
  }

  const toggleWrong = (val: string) =>
    setWrongValues(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])

  const toggleSolved = (val: string) =>
    setSolvedValues(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])

  const canConfirm = statusProperty && wrongValues.length > 0

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
          <h2 className="text-2xl font-bold text-white mb-1">Map Your Fields</h2>
          <p className="text-gray-500 text-sm">
            Which values in <span className="text-gray-300">{db.name}</span> represent wrong answers?
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
          {/* Status property selector */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Status property
            </label>
            {selectCandidates.length === 0 ? (
              <p className="text-xs text-red-400">No select or status properties found in this database.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectCandidates.map(p => (
                  <button
                    key={p.name}
                    onClick={() => handleStatusPropChange(p.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusProperty === p.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {p.name}
                    {p.name === detected.statusProperty && (
                      <span className="ml-1 opacity-60">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wrong values */}
          {currentOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Which values = <span className="text-red-400">wrong / needs practice</span>
              </label>
              <p className="text-xs text-gray-600 mb-2">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {currentOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleWrong(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      wrongValues.includes(opt)
                        ? 'bg-red-900/40 border-red-700 text-red-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Solved values */}
          {currentOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Which values = <span className="text-green-400">solved / correct</span>{' '}
                <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {currentOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleSolved(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      solvedValues.includes(opt)
                        ? 'bg-green-900/40 border-green-700 text-green-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => canConfirm && onConfirm({ statusProperty, wrongValues, solvedValues })}
            disabled={!canConfirm}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {wrongValues.length === 0
              ? 'Select at least one "wrong" value'
              : `Analyze ${wrongValues.join(', ')} problems`}
          </button>
        </div>
      </div>
    </div>
  )
}
