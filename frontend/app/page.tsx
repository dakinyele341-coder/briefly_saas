'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  TrendingUp,
  Mail,
  ArrowRight,
  ShieldCheck,
  Zap,
  Leaf,
  Lightbulb,
  Hourglass,
  CalendarCheck,
  Puzzle,
  FileText,
  Lock,
  Headphones,
  X,
  Check,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/hooks/useUser'
import { toast } from 'sonner'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [isDiscounted, setIsDiscounted] = useState(false)
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsAuthenticated(true)
        // Auto-redirect authenticated users to dashboard
        setTimeout(() => router.push('/dashboard'), 1000)
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // Check coupon code for founding member discount
  useEffect(() => {
    const code = couponCode.toUpperCase()
    setIsDiscounted(code === 'FOUNDINGMEMBER')
  }, [couponCode])

  const handleSubscribeClick = (plan: 'standard' | 'pro') => {
    if (!user) {
      router.push('/login')
      return
    }

    // Use promo links if discounted, regular links otherwise
    let baseUrl: string | undefined
    if (isDiscounted) {
      baseUrl = plan === 'standard'
        ? process.env.NEXT_PUBLIC_PAYMENT_LINK_STANDARD_PROMO
        : process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO_PROMO
    } else {
      baseUrl = plan === 'standard'
        ? process.env.NEXT_PUBLIC_PAYMENT_LINK_STANDARD
        : process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO
    }

    if (!baseUrl) {
      toast.error(`Payment link not configured for ${plan} plan. Please contact support.`)
      return
    }

    const paymentUrl = new URL(baseUrl)
    paymentUrl.searchParams.set('meta[user_id]', user.id)
    paymentUrl.searchParams.set('meta[plan]', plan)

    // Add discount info if applicable
    if (isDiscounted) {
      paymentUrl.searchParams.set('meta[discount]', 'foundingmember')
    }

    window.location.href = paymentUrl.toString()
  }

  if (loading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300 font-medium">
            {isAuthenticated ? 'Redirecting to dashboard...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Hero Section */}
      <section className="relative text-center space-y-8 max-w-5xl mx-auto py-24 px-4 overflow-hidden">
        <Sparkles className="absolute top-1/4 left-1/4 h-24 w-24 text-purple-500 opacity-20 animate-pulse" />
        <Zap className="absolute bottom-1/4 right-1/4 h-20 w-20 text-blue-500 opacity-20 animate-pulse-slow" />

        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight tracking-tighter">
          Turn Inbox Chaos into Clarity.
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          AI-powered email analysis for Investors, Agency Owners, and Founders. Never miss a
          sponsorship, deal, or lead again.
        </p>

        <Button
          onClick={() => router.push('/signup')}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-10 py-7 text-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:-translate-y-1"
          size="lg"
        >
          Start now <ArrowRight className="h-6 w-6 ml-3" />
        </Button>



        {/* Visual Placeholder */}
        <div className="mt-20 flex justify-center">
          <div className="w-full max-w-4xl h-72 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 shadow-xl">
            <p className="text-gray-400 text-lg">Dashboard Mockup Placeholder</p>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-4 bg-zinc-900">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
            Your Inbox is a To-Do List created by Strangers.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-zinc-800 border-zinc-700 text-white">
              <CardHeader>
                <Lightbulb className="h-10 w-10 text-yellow-400 mb-4" />
                <CardTitle>The Newsletter Trap</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-zinc-300 text-lg">
                  Important emails get buried under generic updates and promotional newsletters,
                  making you miss critical communications.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 text-white">
              <CardHeader>
                <Hourglass className="h-10 w-10 text-blue-400 mb-4" />
                <CardTitle>Missed Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-zinc-300 text-lg">
                  Sponsorships, pitch decks, and valuable leads are easily lost in the noise,
                  costing you revenue and growth.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 text-white">
              <CardHeader>
                <CalendarCheck className="h-10 w-10 text-green-400 mb-4" />
                <CardTitle>Decision Fatigue</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-zinc-300 text-lg">
                  Wasting hours every day just sorting through emails instead of focusing on what
                  truly matters for your business.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-24 px-4 bg-black">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            Your AI Chief of Staff.
          </h2>
          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            <div className="text-center space-y-4">
              <div className="p-5 rounded-full bg-zinc-800 inline-flex justify-center items-center border border-zinc-700 shadow-lg">
                <Puzzle className="h-12 w-12 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white">Step 1: Connect Gmail</h3>
              <p className="text-zinc-300 text-lg">Secure OAuth integration to safely access your inbox.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="p-5 rounded-full bg-zinc-800 inline-flex justify-center items-center border border-zinc-700 shadow-lg">
                <FileText className="h-12 w-12 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white">Step 2: Define Your Thesis</h3>
              <p className="text-zinc-300 text-lg">Tell our AI what matters to you (e.g., &ldquo;AI startups,&rdquo; &ldquo;beauty brands&rdquo;).</p>
            </div>
            <div className="text-center space-y-4">
              <div className="p-5 rounded-full bg-zinc-800 inline-flex justify-center items-center border border-zinc-700 shadow-lg">
                <Lock className="h-12 w-12 text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white">Step 3: Briefly Filters the Noise</h3>
              <p className="text-zinc-300 text-lg">Automatically sorts emails: Deals, Operations, Spam. Zero effort.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Persona Section */}
      <section className="py-24 px-4 bg-zinc-900">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            Who is Briefly For?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-zinc-800 border-zinc-700 text-white text-center p-6">
              <CardHeader>
                <h3 className="text-2xl font-semibold mb-2">Founders</h3>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300">&ldquo;Never miss a lead or partnership offer that could scale your business.&rdquo;</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 text-white text-center p-6">
              <CardHeader>
                <h3 className="text-2xl font-semibold mb-2">Agency Owners</h3>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300">&ldquo;Spot high-value service leads and brand partnerships instantly among the noise.&rdquo;</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 text-white text-center p-6">
              <CardHeader>
                <h3 className="text-2xl font-semibold mb-2">Investors</h3>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300">&ldquo;Auto-rank pitch decks by thesis match, finding hidden gems faster.&rdquo;</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-24 px-4 bg-zinc-950">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
            Loved by the Best
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800 text-white p-6">
              <CardContent className="pt-6">
                <div className="flex text-yellow-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="text-zinc-300 italic mb-6">
                  &quot;I used to spend 2 hours a day on emails. Briefly cut that to 15 minutes. It found a $5k sponsorship deal I completely missed.&quot;
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
                    JD
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">Jason D.</p>
                    <p className="text-sm text-zinc-500">Agency Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white p-6">
              <CardContent className="pt-6">
                <div className="flex text-yellow-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="text-zinc-300 italic mb-6">
                  &quot;The thesis matching for pitch decks is insane. It filters out 90% of the noise so I only see relevant deal flow.&quot;
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center font-bold">
                    AS
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">Sarah A.</p>
                    <p className="text-sm text-zinc-500">Angel Investor</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white p-6">
              <CardContent className="pt-6">
                <div className="flex text-yellow-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Sparkles key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="text-zinc-300 italic mb-6">
                  &quot;Finally, an inbox tool that actually understands context. The auto-replies sound exactly like me.&quot;
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">
                    MK
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">Michael K.</p>
                    <p className="text-sm text-zinc-500">SaaS Founder</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-black">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h2>

          {/* Founding Member Discount Input */}
          <div className="max-w-md mx-auto mb-12">
            <div className="text-center mb-6">
              <label className="text-lg text-gray-300 font-medium">
                Have a launch code?
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter code..."
                className="w-full px-6 py-4 bg-zinc-900 border-2 border-zinc-700 rounded-lg text-white placeholder-gray-500 text-center text-lg font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />

              {isDiscounted && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 font-medium animate-pulse">✓</span>
                </div>
              )}
            </div>

            {isDiscounted && (
              <div className="mt-4 text-center">
                <p className="text-green-400 text-xl font-bold animate-pulse">
                  🎉 50% OFF Unlocked!
                </p>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-zinc-800 border-zinc-700 text-white p-6 flex flex-col justify-between">
              <div>
                <CardHeader className="items-center">
                  <h3 className="text-3xl font-bold mb-2">Standard Plan</h3>
                  <div className="mb-4">
                    {isDiscounted ? (
                      <>
                        <p className="text-2xl text-zinc-500 line-through">$29</p>
                        <p className="text-5xl font-extrabold text-green-400">$14.50<span className="text-xl text-zinc-400">/month</span></p>
                      </>
                    ) : (
                      <p className="text-5xl font-extrabold text-white">$29<span className="text-xl text-zinc-400">/month</span></p>
                    )}
                  </div>
                  <CardDescription className="text-zinc-300 text-center">For Founders & Creators</CardDescription>
                </CardHeader>
                <CardContent className="text-lg text-zinc-200 space-y-3 mt-6">
                  <p className="flex items-center">
                    <ShieldCheck className="h-5 w-5 mr-3 text-green-400" /> Noise Filtering
                  </p>
                  <p className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-3 text-green-400" /> Auto-Replies
                  </p>
                </CardContent>
              </div>
              <Button
                onClick={() => handleSubscribeClick('standard')}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg"
              >
                Choose Standard
              </Button>
            </Card>

            <Card className="bg-zinc-900 border-2 border-purple-500 text-white p-6 flex flex-col justify-between relative overflow-hidden shadow-purple-500/30 shadow-xl">
              <div className="absolute inset-0 bg-purple-500 opacity-10 blur-3xl -z-10"></div>
              <div>
                <CardHeader className="items-center">
                  <h3 className="text-3xl font-bold mb-2">Pro Plan</h3>
                  <div className="mb-4">
                    {isDiscounted ? (
                      <>
                        <p className="text-2xl text-zinc-500 line-through">$99</p>
                        <p className="text-5xl font-extrabold text-green-400">$49.50<span className="text-xl text-zinc-400">/month</span></p>
                      </>
                    ) : (
                      <p className="text-5xl font-extrabold text-white">$99<span className="text-xl text-zinc-400">/month</span></p>
                    )}
                  </div>
                  <CardDescription className="text-purple-300 text-center">For Investors</CardDescription>
                </CardHeader>
                <CardContent className="text-lg text-zinc-200 space-y-3 mt-6">
                  <p className="flex items-center">
                    <ShieldCheck className="h-5 w-5 mr-3 text-green-400" /> Everything in Standard, plus:
                  </p>
                  <p className="flex items-center">
                    <FileText className="h-5 w-5 mr-3 text-purple-400" /> Pitch Deck / Document Analysis
                  </p>
                  <p className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-3 text-purple-400" /> Thesis-Match Scoring
                  </p>
                </CardContent>
              </div>
              <Button
                onClick={() => handleSubscribeClick('pro')}
                className="mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 text-lg"
              >
                Go Pro
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 bg-zinc-900">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-zinc-700">
              <AccordionTrigger className="text-xl hover:no-underline text-white hover:text-purple-300">
                Is my data safe?
              </AccordionTrigger>
              <AccordionContent className="text-lg text-zinc-300">
                Yes. We use Google&apos;s Official API and AES-256 encryption. We do not sell your data to
                third parties. Your privacy is our top priority.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-zinc-700">
              <AccordionTrigger className="text-xl hover:no-underline text-white hover:text-purple-300">
                Does it work with Outlook?
              </AccordionTrigger>
              <AccordionContent className="text-lg text-zinc-300">
                Not yet. Briefly AI is currently optimized for Gmail accounts only. We are exploring
                support for other email providers in the future.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-zinc-700">
              <AccordionTrigger className="text-xl hover:no-underline text-white hover:text-purple-300">
                Can I cancel anytime?
              </AccordionTrigger>
              <AccordionContent className="text-lg text-zinc-300">
                Yes, you can cancel your subscription with a single click from your dashboard at any
                time. No long-term commitments.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-4 bg-black text-center">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-5xl md:text-6xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Ready to reclaim your time?
          </h2>
          <Button
            onClick={() => router.push('/signup')}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold px-12 py-7 text-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1"
            size="lg"
          >
            Start now <ArrowRight className="h-6 w-6 ml-3" />
          </Button>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-10 px-4">
        <div className="container mx-auto text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Briefly AI. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <a href="/terms" className="hover:text-white transition-colors">
              Terms & Conditions
            </a>
            <span className="text-zinc-600">|</span>
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <span className="text-zinc-600">|</span>
            <a href="mailto:creatorfuelteam@gmail.com" className="hover:text-white transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}