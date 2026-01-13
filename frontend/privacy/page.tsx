import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-20 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert prose-zinc">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-8">Last Updated: January 4, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">1. Data We Collect</h2>
          <p>
            To provide our service, we collect your:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Email address and Name (via Google OAuth)</li>
            <li>Email headers and content (strictly for AI processing and summarization)</li>
            <li>Usage metadata to improve the application</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Data</h2>
          <p>
            We do <strong>NOT</strong> sell your data to third parties. Your email content is processed 
            by our AI models to generate summaries and is not stored permanently beyond what is 
            necessary for your dashboard.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">3. Google API Disclosure</h2>
          <p>
            Briefly AI&apos;s use and transfer to any other app of information received from Google APIs 
            will adhere to 
            <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" className="text-purple-400 hover:underline mx-1">
              Google API Services User Data Policy
            </a>, 
            including the Limited Use requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">4. Data Deletion</h2>
          <p>
            You can request full deletion of your account and associated data at any time by emailing 
            <a href="mailto:creatorfuelteam@gmail.com" className="text-purple-400 hover:text-purple-300 ml-1">
              creatorfuelteam@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}