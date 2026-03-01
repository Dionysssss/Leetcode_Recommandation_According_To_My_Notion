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
const NOTES_HINTS = ['text', 'note', 'reason', 'description', '错因', '原因', '笔记', 'content', 'detail', 'explanation']
const TOPICS_HINTS = ['topic', 'tag', 'category', '类型', '算法', 'type', 'label', 'skill']
const ALL_WRONG_DB_HINTS = ['错题', 'wrong', 'mistake', 'incorrect', 'weak', '错误', 'error', 'mistake', '失误']

export function autoDetect(properties: DatabaseProperty[], dbName = ''): FieldMapping {
  const selectCandidates = properties.filter(p => p.type === 'select' || p.type === 'status')
  const multiSelectCandidates = properties.filter(p => p.type === 'multi_select')
  const richTextCandidates = properties.filter(p => p.type === 'rich_text')

  const statusProp =
    selectCandidates.find(p => STATUS_PROP_HINTS.some(h => p.name.toLowerCase().includes(h))) ??
    selectCandidates[0]

  const wrongValues = (statusProp?.options ?? []).filter(opt =>
    WRONG_HINTS.some(h => opt.toLowerCase().includes(h))
  )
  const solvedValues = (statusProp?.options ?? []).filter(opt =>
    SOLVED_HINTS.some(h => opt.toLowerCase().includes(h))
  )

  // Auto-detect notes property (rich_text)
  const notesProp =
    richTextCandidates.find(p => NOTES_HINTS.some(h => p.name.toLowerCase().includes(h))) ??
    richTextCandidates[0]

  // Auto-detect topics property (multi_select, excluding the status-like one)
  const topicsProp =
    multiSelectCandidates.find(p => TOPICS_HINTS.some(h => p.name.toLowerCase().includes(h))) ??
    multiSelectCandidates.find(p => p.name !== statusProp?.name) ??
    multiSelectCandidates[0]

  // Default allWrong=true if the database name suggests it's a wrong-problems collection
  const allWrong = ALL_WRONG_DB_HINTS.some(h => dbName.toLowerCase().includes(h.toLowerCase()))

  return {
    statusProperty: statusProp?.name ?? '',
    wrongValues,
    solvedValues,
    allWrong,
    notesProperty: notesProp?.name ?? 'My Notes',
    topicsProperty: topicsProp?.name ?? 'Topics',
  }
}

export function FieldMapper({ db, properties, onConfirm, onBack }: FieldMapperProps) {
  const detected = useMemo(() => autoDetect(properties, db.name), [properties, db.name])

  const [allWrong, setAllWrong] = useState(detected.allWrong)
  const [statusProperty, setStatusProperty] = useState(detected.statusProperty)
  const [wrongValues, setWrongValues] = useState<string[]>(detected.wrongValues)
  const [solvedValues, setSolvedValues] = useState<string[]>(detected.solvedValues)
  const [notesProperty, setNotesProperty] = useState(detected.notesProperty)
  const [topicsProperty, setTopicsProperty] = useState(detected.topicsProperty)

  const selectCandidates = properties.filter(p => p.type === 'select' || p.type === 'status' || p.type === 'multi_select')
  const richTextCandidates = properties.filter(p => p.type === 'rich_text')
  const multiSelectCandidates = properties.filter(p => p.type === 'multi_select')
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

  const canConfirm = allWrong || wrongValues.length > 0

  const handleConfirm = () => {
    onConfirm({ statusProperty, wrongValues, solvedValues, allWrong, notesProperty, topicsProperty })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Map Your Fields</h2>
          <p className="text-gray-500 text-sm">
            Configure how to read <span className="text-gray-300">{db.name}</span>
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">

          {/* All-wrong toggle */}
          <button
            onClick={() => setAllWrong(v => !v)}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left ${
              allWrong
                ? 'bg-blue-600/15 border-blue-600 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
              allWrong ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
            }`}>
              {allWrong && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">This entire database is my wrong problems</p>
              <p className="text-xs text-gray-500 mt-0.5">Every row is a mistake — no status filtering needed</p>
            </div>
          </button>

          {/* Status-based filtering (only when allWrong=false) */}
          {!allWrong && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Status property</label>
                <div className="flex flex-wrap gap-2">
                  {selectCandidates.map(p => (
                    <button key={p.name} onClick={() => handleStatusPropChange(p.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        statusProperty === p.name ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {currentOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Values = <span className="text-red-400">wrong / needs practice</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentOptions.map(opt => (
                      <button key={opt} onClick={() => toggleWrong(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          wrongValues.includes(opt)
                            ? 'bg-red-900/40 border-red-700 text-red-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Values = <span className="text-green-400">solved</span>{' '}
                    <span className="text-gray-600 font-normal">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentOptions.map(opt => (
                      <button key={opt} onClick={() => toggleSolved(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          solvedValues.includes(opt)
                            ? 'bg-green-900/40 border-green-700 text-green-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-800 pt-4 space-y-4">
            {/* Notes property */}
            {richTextCandidates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Error notes column <span className="text-gray-600 font-normal">(your written explanation)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {richTextCandidates.map(p => (
                    <button key={p.name} onClick={() => setNotesProperty(p.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        notesProperty === p.name ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Topics property */}
            {multiSelectCandidates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Topics column <span className="text-gray-600 font-normal">(optional — auto-inferred from problem numbers if empty)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {multiSelectCandidates.map(p => (
                    <button key={p.name} onClick={() => setTopicsProperty(p.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        topicsProperty === p.name ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {!canConfirm
              ? 'Select at least one "wrong" value'
              : allWrong
                ? 'Analyze All Problems →'
                : `Analyze "${wrongValues.join('", "')}" problems →`}
          </button>
        </div>
      </div>
    </div>
  )
}
