export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 1, 2026</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Overview</h2>
            <p>
              LeetCode Coach ("the App") is a personal productivity tool that connects to your Notion
              workspace and uses AI to recommend LeetCode problems based on your practice history. This
              policy explains what data is accessed and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data We Access</h2>
            <p className="mb-2">When you connect your Notion account, the App reads the following from your Notion workspace:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
              <li>Database names (to let you select which database to analyze)</li>
              <li>Problem entries within your selected database (name, status, difficulty, topics, notes)</li>
            </ul>
            <p className="mt-3">This data is accessed read-only and solely for the purpose of generating recommendations during your session.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data Storage</h2>
            <p>
              The App does not store, log, or retain any of your Notion data. Your Notion access token
              is stored in a short-lived session cookie (valid for 7 days) on your browser and is never
              written to any database or third-party service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Third-Party Services</h2>
            <p className="mb-2">The App uses the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
              <li><span className="text-gray-300">Notion API</span> — to read your practice database. Governed by Notion's Privacy Policy.</li>
              <li><span className="text-gray-300">Anthropic Claude API</span> — to analyze patterns and generate recommendations. Your problem data is sent to Claude for processing. Governed by Anthropic's Privacy Policy.</li>
              <li><span className="text-gray-300">Vercel</span> — for hosting. Governed by Vercel's Privacy Policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
            <p>
              The App sets one cookie (<code className="text-blue-400 text-xs">notion_token</code>) to maintain your Notion session. This cookie
              is HttpOnly, Secure, and expires after 7 days. No tracking or analytics cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Revoking Access</h2>
            <p>
              You can revoke the App's access to your Notion workspace at any time by going to{' '}
              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                notion.so/my-integrations
              </a>{' '}
              and removing the integration. Clearing your browser cookies also removes the session token.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              For questions about this privacy policy, contact:{' '}
              <a href="mailto:jingzhenwang.s@gmail.com" className="text-blue-400 hover:underline">
                jingzhenwang.s@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            &larr; Back to LeetCode Coach
          </a>
        </div>
      </div>
    </div>
  )
}
