export default function TermsOfUse() {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 1, 2026</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Acceptance</h2>
            <p>
              By using LeetCode Coach ("the App"), you agree to these Terms of Use. If you do not agree,
              do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Description of Service</h2>
            <p>
              LeetCode Coach is a free, personal productivity tool that analyzes your Notion-based
              LeetCode practice log and recommends problems to practice next using AI. It is provided
              as-is for personal, non-commercial use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Permitted Use</h2>
            <p>You may use the App to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2 mt-2">
              <li>Connect your personal Notion workspace to analyze your own practice data</li>
              <li>Receive AI-generated problem recommendations for personal study</li>
            </ul>
            <p className="mt-3">You may not use the App to process data belonging to others without their consent.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Third-Party Accounts</h2>
            <p>
              You are responsible for maintaining your own Notion and Anthropic accounts and complying
              with their respective terms of service. The App is not affiliated with, endorsed by, or
              sponsored by Notion Labs, Inc. or Anthropic, PBC.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Disclaimer of Warranties</h2>
            <p>
              The App is provided "as is" without warranty of any kind. Recommendations are generated
              by AI and may not always be accurate or appropriate. We make no guarantees regarding
              uptime, availability, or the quality of recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, the developer is not liable for any indirect,
              incidental, or consequential damages arising from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Changes</h2>
            <p>
              These terms may be updated at any time. Continued use of the App after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              Questions about these terms:{' '}
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
