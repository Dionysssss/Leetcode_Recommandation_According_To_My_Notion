'use client'

interface LandingPageProps {
  onEnter: () => void
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3">LeetCode Coach</h1>
        <p className="text-gray-400 text-base mb-2">
          AI-powered recommendations from your Notion practice log
        </p>
        <p className="text-gray-600 text-sm mb-10">
          Connects to your Notion database &rarr; spots weak topics &rarr; picks the right next problems
        </p>

        <button
          onClick={onEnter}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-8 rounded-2xl text-base transition-colors duration-150 mb-3"
        >
          Get Started
        </button>

        <p className="text-xs text-gray-700 mt-6">
          By connecting, you agree to our{' '}
          <a href="/privacy" className="text-gray-500 hover:text-gray-400 underline">Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms" className="text-gray-500 hover:text-gray-400 underline">Terms of Use</a>
        </p>
      </div>
    </div>
  )
}
