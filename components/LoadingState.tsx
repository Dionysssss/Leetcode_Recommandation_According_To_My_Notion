'use client'

type LoadingStep = 'notion' | 'analysis' | 'recommendations'

interface LoadingStateProps {
  step: LoadingStep
}

const steps: Array<{ id: LoadingStep; label: string; description: string }> = [
  { id: 'notion', label: 'Fetching Notion data', description: 'Reading your practice database...' },
  { id: 'analysis', label: 'Analyzing patterns', description: 'Claude is identifying your weak areas...' },
  { id: 'recommendations', label: 'Generating recommendations', description: 'Selecting the best problems for you...' },
]

export function LoadingState({ step }: LoadingStateProps) {
  const currentIdx = steps.findIndex(s => s.id === step)
  const current = steps[currentIdx]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-gray-700" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            </div>
          </div>

          <h2 className="text-center text-lg font-semibold text-white mb-1">{current?.label}</h2>
          <p className="text-center text-sm text-gray-400 mb-8">{current?.description}</p>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((s, idx) => {
              const isDone = idx < currentIdx
              const isCurrent = idx === currentIdx

              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {isDone ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`text-sm ${
                    isDone ? 'text-green-400' : isCurrent ? 'text-white font-medium' : 'text-gray-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
