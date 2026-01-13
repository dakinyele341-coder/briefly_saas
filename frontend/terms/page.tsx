import React from 'react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-20 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert prose-zinc">
        <h1 className="text-4xl font-bold text-white mb-8">Terms & Conditions</h1>
        <p className="text-sm text-zinc-500 mb-8">Last Updated: January 4, 2026</p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Briefly AI, you agree to be bound by these Terms & Conditions. 
            Briefly AI is provided "as is" and "as available" without any warranties of any kind.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">2. Service Description</h2>
          <p>
            Briefly AI is an AI-powered email productivity tool. While we strive for 100% accuracy in 
            summarization and filtering, we are not responsible for missed emails, miscategorized 
            content, or any actions taken based on AI-generated summaries.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">3. User Conduct</h2>
          <p>
            User accounts can be terminated at our discretion for any abuse of the system, 
            attempting to reverse-engineer the service, or using the service for illegal purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">4. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of <strong>Nigeria</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">5. Contact</h2>
          <p>
            For any questions regarding these terms, please contact us at: 
            <a href="mailto:creatorfuelteam@gmail.com" className="text-purple-400 hover:text-purple-300 ml-1">
              creatorfuelteam@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}