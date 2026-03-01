'use client'

import { useState } from 'react'

interface TokenFormProps {
  onConnect: (token: string) => void
  onBack: () => void
  isConnecting: boolean
}

export function TokenForm({ onConnect, onBack, isConnecting }: TokenFormProps) {
  const [token, setToken] = useState('')

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
          <h2 className="text-2xl font-bold text-white mb-2">Connect Notion</h2>
          <p className="text-gray-400 text-sm">Enter your Notion integration token to get started</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          {/* Step hint */}
          <div className="bg-gray-800 rounded-xl p-4 text-xs text-gray-400 space-y-1">
            <p className="text-gray-300 font-medium mb-2">How to get your token:</p>
            <p>1. Go to{' '}
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                notion.so/my-integrations
              </a>
            </p>
            <p>2. Click <span className="text-gray-300">+ New integration</span></p>
            <p>3. Copy the <span className="text-gray-300">Internal Integration Secret</span></p>
            <p>4. Share your database with the integration</p>
          </div>

          {/* Token input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Integration Token</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && token.trim() && onConnect(token.trim())}
              placeholder="secret_..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <button
            onClick={() => onConnect(token.trim())}
            disabled={!token.trim() || isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </>
            ) : (
              'Connect & Browse Databases'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
