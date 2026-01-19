'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function TermsOfService() {
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
                <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Terms of Service</h1>
                <p className="text-gray-500 mb-12">Last Updated: January 20, 2026</p>

                <div className="prose prose-blue max-w-none space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            By accessing or using the Briefly AI website and services, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Briefly AI provides an AI-powered email summarization tool. We help users filter noise and identify opportunities by analyzing their inbox based on a custom "thesis." Our services are provided primarily via a web dashboard and secure Gmail integration.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. User Conduct</h2>
                        <p className="text-gray-700 leading-relaxed">
                            You agree to use Honestly AI only for lawful purposes. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You must not:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-700">
                            <li>Use the service for any illegal or unauthorized purpose.</li>
                            <li>Attempt to disrupt or interfere with the service's security or performance.</li>
                            <li>Use the service to transmit spam or other unsolicited communications.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>
                        <p className="text-gray-700 leading-relaxed">
                            All content and technology associated with Briefly AI, excluding user-provided data, are the intellectual property of Briefly AI. You may not reproduce or distribute any part of the service without our permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Termination</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to suspend or terminate your access to Honestly AI at our discretion, without notice, if we believe you have violated these Terms of Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Disclaimer of Warranties</h2>
                        <p className="text-gray-700 leading-relaxed italic p-4 bg-gray-50 rounded-lg border border-gray-100">
                            Briefly AI is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted or error-free.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Briefly AI shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the service.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-gray-100">
                        <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed">
                            For any questions regarding these Terms, please contact:
                        </p>
                        <p className="mt-4 font-medium text-blue-600 underline">
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
