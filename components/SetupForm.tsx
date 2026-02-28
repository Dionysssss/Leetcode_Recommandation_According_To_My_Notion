'use client'

interface SetupFormProps {
  onAnalyze: () => void
  isLoading: boolean
}

export function SetupForm({ onAnalyze, isLoading }: SetupFormProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">LeetCode Coach</h1>
          <p className="text-gray-400 text-sm">
            AI-powered recommendations based on your Notion practice log
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="space-y-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Required Notion database columns:</h3>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                <span><span className="text-blue-400 font-mono">Name</span> (Title)</span>
                <span><span className="text-blue-400 font-mono">Status</span> (Select)</span>
                <span><span className="text-blue-400 font-mono">Difficulty</span> (Select)</span>
                <span><span className="text-blue-400 font-mono">Topics</span> (Multi-select)</span>
                <span><span className="text-blue-400 font-mono">My Notes</span> (Text)</span>
                <span><span className="text-blue-400 font-mono">LeetCode Number</span> (Number)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Status values: <code className="text-green-400">Solved</code>, <code className="text-red-400">Wrong</code>, <code className="text-yellow-400">Attempted</code>
              </p>
            </div>
          </div>

          <button
            onClick={onAnalyze}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              'Analyze My Practice'
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Reads your Notion DB &rarr; Analyzes patterns &rarr; Recommends 5 problems
          </p>
        </div>

        {/* Setup links */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-gray-600">
            Need setup help? Check the{' '}
            <a href="https://github.com" className="text-blue-500 hover:underline">README</a>
            {' '}for Notion integration setup
          </p>
        </div>
      </div>
    </div>
  )
}
