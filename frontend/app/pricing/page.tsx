'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, TrendingUp, Zap, Award, Brain, Target, Rocket } from 'lucide-react'
import toast from 'react-hot-toast'
import { isAdminEmail } from '@/utils/api'

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (currentUser) {
          setUser(currentUser)
          // Check if admin
          if (currentUser.email && isAdminEmail(currentUser.email)) {
            setIsAdmin(true)
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleSubscribe = (plan: 'standard' | 'pro') => {
    // Redirect to login if not authenticated
    if (!user) {
      toast.error('Please log in to subscribe', {
        icon: '🔐',
      })
      router.push('/login')
      return
    }

    // Admin users get redirected to subscription page
    if (isAdmin) {
      toast.success('Redirecting to subscription page (Admin)', {
        icon: '👑',
      })
      router.push('/subscription')
      return
    }

    // Build dynamic Flutterwave payment link with user_id and plan
    const baseUrl = plan === 'standard'
      ? process.env.NEXT_PUBLIC_PAYMENT_LINK_STANDARD
      : process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO

    if (!baseUrl) {
      toast.error(`Payment link not configured for ${plan} plan. Please contact support.`)
      return
    }

    // Build URL with metadata parameters
    const paymentUrl = new URL(baseUrl)
    paymentUrl.searchParams.set('meta[user_id]', user.id)
    paymentUrl.searchParams.set('meta[plan]', plan)

    toast.success('Redirecting to payment...', {
      icon: '💳',
    })

    // Redirect to Flutterwave payment link with metadata
    window.location.href = paymentUrl.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Choose Your Superpower
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your inbox is hiding money. We&apos;ll find it for you.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ✨ Cancel anytime • No long-term commitments
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Standard Plan - "Growth" */}
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 hover:border-blue-500 transition-all duration-300 shadow-2xl">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                  <CardTitle className="text-3xl text-white">Growth Plan</CardTitle>
                </div>
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </div>
              <CardDescription className="text-gray-300 text-lg">
                For Influencers, Founders/Business Owners, & Agency Owners
              </CardDescription>
              <div className="pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$29</span>
                  <span className="text-gray-400 text-lg">/month</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-blue-400 mb-3">
                  &ldquo;Never Miss a Deal.&rdquo;
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Your Inbox is your bank account. Get AI summaries of every email. Stop letting sponsorships and leads get buried in spam.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    Auto-detects <span className="font-semibold text-white">&apos;Collab&apos;</span>, <span className="font-semibold text-white">&apos;Sponsorship&apos;</span>, and <span className="font-semibold text-white">&apos;Lead&apos;</span> emails
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    Drafts replies to brands instantly (<span className="italic text-blue-300">Vibe-match</span>)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    Separates <span className="font-semibold text-green-400">&apos;Money&apos;</span> from <span className="text-gray-400">&apos;Newsletters&apos;</span>
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    Weekly <span className="font-semibold text-yellow-400">&apos;Missed Revenue&apos;</span> Report
                  </span>
                </div>
              </div>

              <Button
                onClick={() => !isAdmin && handleSubscribe('standard')}
                className={`w-full font-semibold py-6 text-lg shadow-lg transition-all duration-300 ${isAdmin
                  ? 'bg-blue-600/50 cursor-default opacity-80'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-blue-500/50'
                  }`}
                size="lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                {isAdmin ? 'Growth Access Granted' : 'Subscribe to Growth'}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan - "Deal Flow" */}
          <Card className="bg-gradient-to-br from-purple-900/40 via-gray-900 to-pink-900/40 border-2 border-purple-500 hover:border-purple-400 transition-all duration-300 shadow-2xl shadow-purple-500/20 relative overflow-hidden lg:scale-105">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 animate-pulse" />

            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              MOST POPULAR
            </div>

            <CardHeader className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-8 w-8 text-purple-400" />
                  <CardTitle className="text-3xl text-white">Deal Flow Plan</CardTitle>
                </div>
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
              <CardDescription className="text-gray-200 text-lg font-medium">
                For VCs, Angel Investors, & Scouts
              </CardDescription>
              <div className="pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$99</span>
                  <span className="text-gray-300 text-lg">/month</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-purple-400 mb-3">
                  &ldquo;Your AI Associate.&rdquo;
                </h3>
                <p className="text-gray-200 leading-relaxed">
                  Filter noise, find unicorns with professional <span className="text-white font-bold">pitch deck and document analysis</span>. We read every document so you don&apos;t have to.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
                  <span className="text-white font-semibold">
                    Everything in Growth, plus:
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    <span className="font-semibold text-white">Document / Pitch Deck Analysis</span> (PDF Analysis)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    <span className="font-semibold text-white">Thesis-Match Scoring</span> (Finds <span className="italic text-yellow-300">&apos;Hidden Gems&apos;</span>)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    Deep-Dive <span className="font-semibold text-white">Due Diligence Summaries</span>
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-200">
                    Priority <span className="font-semibold text-purple-400">&apos;Deal Flow&apos;</span> Lane
                  </span>
                </div>
              </div>

              <Button
                onClick={() => !isAdmin && handleSubscribe('pro')}
                className={`w-full font-semibold py-6 text-lg shadow-lg transition-all duration-300 ${isAdmin
                  ? 'bg-purple-600/50 cursor-default opacity-80'
                  : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white hover:shadow-purple-500/50'
                  }`}
                size="lg"
              >
                <Rocket className="h-5 w-5 mr-2" />
                {isAdmin ? 'Deal Flow Access Granted' : 'Subscribe to Deal Flow'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-gray-400 text-sm">Trusted by investors, founders, and influencers worldwide</p>
          <div className="flex items-center justify-center gap-8 text-gray-500 text-xs">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        {user && (
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              ← Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
