'use client'

interface AnalysisStreamProps {
  text: string
  isStreaming: boolean
}

export function AnalysisStream({ text, isStreaming }: AnalysisStreamProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <h2 className="text-base font-semibold text-white">AI Coaching Analysis</h2>
        {isStreaming && (
          <span className="text-xs text-blue-400 animate-pulse">Thinking...</span>
        )}
      </div>
      <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {text}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}
