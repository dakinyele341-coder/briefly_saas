'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-white text-gray-900 selection:bg-blue-100">
            {/* Simple Header */}
            <header className="border-b border-gray-100 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-black hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <span className="text-xl font-bold tracking-tight text-blue-600">Briefly AI</span>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Privacy Policy</h1>
                <p className="text-gray-500 mb-12">Last Updated: January 20, 2026</p>

                <div className="prose prose-blue max-w-none space-y-12">
                    {/* CRITICAL CONTENT: Google User Data Compliance */}
                    <section className="bg-blue-50 border-l-4 border-blue-500 p-8 rounded-r-lg">
                        <h2 className="text-2xl font-bold text-blue-900 mb-4">Google User Data Compliance</h2>
                        <p className="text-blue-800 leading-relaxed text-lg">
                            Briefly uses Google user data only to summarize emails. We do not sell your data to third parties or use it for advertising. Our use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
                        <div className="space-y-4 text-gray-700 leading-relaxed">
                            <p>
                                We only collect information that is strictly necessary to provide the Briefly service. This includes:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Account Information:</strong> Your name and email address provided during signup.</li>
                                <li><strong>Email Data:</strong> When you connect your Gmail account, we access your email threads specifically to generate summaries for your private dashboard.</li>
                                <li><strong>Usage Data:</strong> Basic technical information like browser type and interaction with our features to help us improve the experience.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. How We Use Your Data</h2>
                        <div className="space-y-4 text-gray-700 leading-relaxed">
                            <p>Your data is used exclusively to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Generate AI-powered summaries of your inbox activity.</li>
                                <li>Filter "Noise" (like newsletters) from "Opportunities" based on your custom thesis.</li>
                                <li>Provide you with a centralized view of your professional communications.</li>
                            </ul>
                            <p className="font-semibold text-gray-900">
                                We NEVER sell your data to third parties, and your email content is never used to train global AI models without your explicit consent.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Data Security & Retention</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We implement industry-standard AES-256 encryption for any sensitive data stored in our databases. We use Google's official OAuth 2.0 flow, which means we never see or store your Google password. You can revoke access and delete your data at any time via your dashboard.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Sharing Your Information</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We do not share your personal information with third parties except as required by law or to provide the essential functions of our service (e.g., using secure cloud hosting providers).
                        </p>
                    </section>

                    <section className="pt-8 border-t border-gray-100">
                        <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions about this Privacy Policy or our data practices, please reach out to us at:
                        </p>
                        <p className="mt-4 font-medium text-blue-600">
                            <a href="mailto:akinyeleoluwayanmife@gmail.com">akinyeleoluwayanmife@gmail.com</a>
                        </p>
                    </section>
                </div>
            </main>

            <footer className="border-t border-gray-100 py-12 mt-12 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl text-center text-gray-500 text-sm">
                    <p>© 2026 Briefly AI. Built for clarity.</p>
                </div>
            </footer>
        </div>
    )
}
