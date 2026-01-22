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
  Target,
  Briefcase,
  FileText,
  Users,
  Building,
  DollarSign,
  CheckCircle,
  Star,
  ArrowDown,
  Play,
  Lightbulb,
  Hourglass,
  CalendarCheck,
  Puzzle,
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
    <div className="min-h-screen bg-white">
      {/* Section 1: Hero Section (Top Fold) */}
      <section className="relative text-center py-32 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your inbox decides your business. Briefly AI tells you what actually matters.
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Briefly AI ranks your emails by business importance, summarizes emails and pitch decks, and drafts strategic replies — so founders and operators never miss what moves the needle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/signup')}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-semibold rounded-lg"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-lg"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Section 2: The "Problem vs. Solution" Grid */}
      <section className="py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left Column (Problem) */}
            <div className="bg-gray-900 text-white p-12 rounded-2xl">
              <h2 className="text-3xl font-bold mb-8">Your inbox is lying to you.</h2>
              <ul className="space-y-6 text-lg">
                <li className="flex items-start gap-4">
                  <ArrowDown className="h-6 w-6 text-red-400 mt-1 flex-shrink-0" />
                  <span>Urgent emails aren't always important.</span>
                </li>
                <li className="flex items-start gap-4">
                  <ArrowDown className="h-6 w-6 text-red-400 mt-1 flex-shrink-0" />
                  <span>Important emails don't always look urgent.</span>
                </li>
                <li className="flex items-start gap-4">
                  <ArrowDown className="h-6 w-6 text-red-400 mt-1 flex-shrink-0" />
                  <span>Pitch decks, intros, and client risks get buried.</span>
                </li>
                <li className="flex items-start gap-4">
                  <ArrowDown className="h-6 w-6 text-red-400 mt-1 flex-shrink-0" />
                  <span>Inbox zero doesn't mean opportunity zero.</span>
                </li>
              </ul>
            </div>

            {/* Right Column (Solution) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-12 rounded-2xl border border-blue-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Briefly AI is your Chief of Staff.</h2>
              <ul className="space-y-6 text-lg text-gray-700">
                <li className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <span>Ranks emails by business importance.</span>
                </li>
                <li className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <span>Explains *why* something matters.</span>
                </li>
                <li className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <span>Summarizes long threads & attachments.</span>
                </li>
                <li className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <span>Prepares replies aligned with your goals.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: "How It Works" (Steps) */}
      <section className="py-32 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-20">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Define your priorities</h3>
              <p className="text-gray-600">Tell Briefly AI what matters right now (fundraising, clients, hiring, deals).</p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Inbox gets ranked</h3>
              <p className="text-gray-600">Emails are scored and ordered by importance — not time.</p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Instant summaries</h3>
              <p className="text-gray-600">Emails, threads, pitch decks, PDFs — summarized into actions.</p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowRight className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Strategic replies</h3>
              <p className="text-gray-600">Draft replies that move things forward, not just "thanks".</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: The "Trust Engine" (How it Decides) */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How Briefly AI decides what's important</h2>

          {/* Glassmorphism card */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                <Star className="h-4 w-4" />
                Priority: 92/100
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">User-defined thesis</h3>
                <p className="text-gray-600 text-sm">('I'm raising capital')</p>
              </div>
              <div className="text-center">
                <Building className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Sender context</h3>
                <p className="text-gray-600 text-sm">Relationship strength</p>
              </div>
              <div className="text-center">
                <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Deadlines required</h3>
                <p className="text-gray-600 text-sm">Decisions needed</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <p className="text-gray-700 mb-3">
                <strong>Priority: 92/100.</strong> Reason: Warm investor intro related to your current fundraising focus.
                Recommended: Reply within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Target Audience & Final CTA */}
      <section className="py-32 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          {/* Target Audience */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <Briefcase className="h-16 w-16 text-blue-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">Founders</h3>
              <p className="text-gray-300">Managing fundraising, hiring, partnerships, and client relationships.</p>
            </div>
            <div className="text-center">
              <Users className="h-16 w-16 text-green-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">Agency Owners</h3>
              <p className="text-gray-300">Juggling clients, renewals, service leads, and team management.</p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-16 w-16 text-purple-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">Investors</h3>
              <p className="text-gray-300">Filtering deal flow, pitch decks, intros, and partnership opportunities.</p>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Stop letting your inbox run your business.</h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Let Briefly AI run your inbox.
            </p>
            <Button
              onClick={() => router.push('/signup')}
              className="bg-white text-black hover:bg-gray-100 px-12 py-6 text-xl font-semibold rounded-lg"
            >
              Start for Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
