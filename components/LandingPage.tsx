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

        {/* Primary: OAuth */}
        <a
          href="/api/auth/notion"
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-8 rounded-2xl text-base transition-colors duration-150 mb-3"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.327-.979.748-1.025z"/>
          </svg>
          Connect with Notion
        </a>

        {/* Secondary: manual token */}
        <button
          onClick={onEnter}
          className="w-full text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors"
        >
          Use integration token manually
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
