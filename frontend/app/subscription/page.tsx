'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Check, Crown, Sparkles, Briefcase, CreditCard, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getSubscriptionInfo,
  createSubscription,
  getSubscriptionPricing,
  renewSubscription,
  cancelSubscription,
  isAdminEmail,
} from '@/utils/api'
import { MenuBar } from '@/components/menu-bar'

interface SubscriptionInfo {
  subscription_status: string
  subscription_plan: string
  subscription_expires_at: string | null
  subscription_started_at: string | null
  trial_expires_at: string | null
  is_active: boolean
  days_remaining: number | null
}

interface PricingPlan {
  name: string
  price: number
  currency: string
  interval: string
  payment_link?: string
  features: string[]
}

export default function SubscriptionPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [pricing, setPricing] = useState<{
    standard: PricingPlan
    pro: PricingPlan
  } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)

        // Check if admin
        if (currentUser.email && isAdminEmail(currentUser.email)) {
          setIsAdmin(true)
        }

        // Load subscription info and pricing
        const [info, pricingData] = await Promise.all([
          getSubscriptionInfo(currentUser.id),
          getSubscriptionPricing(),
        ])

        setSubscriptionInfo(info)
        setPricing(pricingData.plans)
      } catch (error: any) {
        console.error('Error loading subscription data:', error)
        toast.error('Failed to load subscription information')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleSubscribe = async (plan: 'standard' | 'pro') => {
    if (!user) return

    // Admin users get free access
    if (isAdmin) {
      setProcessing(plan)
      try {
        const result = await createSubscription(user.id, plan, user.email || undefined)
        toast.success('✨ Admin subscription activated (free forever!)', {
          icon: '👑',
        })
        // Reload subscription info
        const info = await getSubscriptionInfo(user.id)
        setSubscriptionInfo(info)
      } catch (error: any) {
        console.error('Error creating subscription:', error)
        toast.error(error.message || 'Failed to create subscription')
      } finally {
        setProcessing(null)
      }
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

    // Build URL with metadata parameters for Flutterwave
    // Format: ?meta[user_id]=${user_id}&meta[plan]=${plan}
    const paymentUrl = new URL(baseUrl)
    paymentUrl.searchParams.set('meta[user_id]', user.id)
    paymentUrl.searchParams.set('meta[plan]', plan)

    setProcessing(plan)
    try {
      toast.success('Redirecting to payment...', {
        icon: '💳',
      })
      // Redirect to Flutterwave payment link with metadata
      window.location.href = paymentUrl.toString()
    } catch (error: any) {
      console.error('Error redirecting to payment:', error)
      toast.error('Failed to redirect to payment page')
      setProcessing(null)
    }
  }

  const handleRenew = async () => {
    if (!user) return

    setProcessing('renew')
    try {
      await renewSubscription(user.id, user.email || undefined)

      if (isAdmin) {
        toast.success('✨ Subscription renewed (admin - free forever!)', {
          icon: '👑',
        })
      } else {
        toast.success('✨ Subscription renewed for another month!', {
          icon: '🎉',
        })
      }

      // Reload subscription info
      const info = await getSubscriptionInfo(user.id)
      setSubscriptionInfo(info)
    } catch (error: any) {
      console.error('Error renewing subscription:', error)
      toast.error(error.message || 'Failed to renew subscription')
    } finally {
      setProcessing(null)
    }
  }

  const handleCancel = async () => {
    if (!user) return

    if (!confirm('Are you sure you want to cancel your subscription? You will lose access when it expires.')) {
      return
    }

    setProcessing('cancel')
    try {
      await cancelSubscription(user.id)
      toast.success('Subscription cancelled successfully. You will retain access until your current billing period ends.')

      // Reload subscription info
      const info = await getSubscriptionInfo(user.id)
      setSubscriptionInfo(info)
    } catch (error: any) {
      console.error('Error cancelling subscription:', error)
      toast.error(error.message || 'Failed to cancel subscription')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <>
        <MenuBar />
        <div className="lg:ml-64 flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    )
  }

  const currentPlan = subscriptionInfo?.subscription_plan || 'free'
  const isActive = subscriptionInfo?.is_active || false
  const status = subscriptionInfo?.subscription_status || 'inactive'

  return (
    <>
      <MenuBar />
      <div className="lg:ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  Subscription
                </h1>
                <p className="text-gray-600 mt-1">Manage your monthly subscription plan</p>
              </div>
            </div>
          </div>

          {/* Current Subscription Status */}
          {subscriptionInfo && (
            <Card className="mb-8 shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Plan</p>
                    <p className="text-lg font-semibold capitalize flex items-center gap-2">
                      {currentPlan}
                      {isAdmin && (
                        <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
                          <Crown className="h-3 w-3" />
                          ADMIN ACCESS
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="text-lg font-semibold">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${isActive
                            ? 'bg-green-100 text-green-800'
                            : status === 'trial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {status === 'active' ? 'Active' : status === 'trial' ? 'Trial' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
                    <p className="text-lg font-semibold">
                      {isAdmin ? (
                        <span className="text-blue-600 font-bold">Lifetime (Free)</span>
                      ) : (
                        subscriptionInfo.days_remaining !== null
                          ? `${subscriptionInfo.days_remaining} days`
                          : 'N/A'
                      )}
                    </p>
                  </div>
                </div>

                {isActive && status === 'active' && (
                  <div className="mt-6 flex gap-2">
                    <Button onClick={handleRenew} disabled={processing === 'renew'}>
                      {processing === 'renew' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Renewing...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Renew for Another Month
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={processing === 'cancel'}
                    >
                      {processing === 'cancel' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Subscription'
                      )}
                    </Button>
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <strong>Admin Account:</strong> You have lifetime free access to all features!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pricing Plans */}
          {pricing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Standard Plan */}
              <Card
                className={`shadow-xl border-2 transition-all ${currentPlan === 'standard' && isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                  }`}
              >
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    {pricing.standard.name}
                  </CardTitle>
                  <CardDescription>Perfect for getting started</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${pricing.standard.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pricing.standard.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={currentPlan === 'standard' && isActive ? 'outline' : 'default'}
                    onClick={() => handleSubscribe('standard')}
                    disabled={
                      processing !== null ||
                      (currentPlan === 'standard' && isActive) ||
                      isAdmin
                    }
                  >
                    {processing === 'standard' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : currentPlan === 'standard' && isActive ? (
                      'Current Plan'
                    ) : isAdmin ? (
                      'Free (Admin)'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card
                className={`shadow-xl border-2 transition-all ${currentPlan === 'pro' && isActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                  }`}
              >
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                    {pricing.pro.name}
                  </CardTitle>
                  <CardDescription>For power users</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${pricing.pro.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pricing.pro.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={currentPlan === 'pro' && isActive ? 'outline' : 'default'}
                    onClick={() => handleSubscribe('pro')}
                    disabled={
                      processing !== null ||
                      (currentPlan === 'pro' && isActive) ||
                      isAdmin
                    }
                  >
                    {processing === 'pro' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : currentPlan === 'pro' && isActive ? (
                      'Current Plan'
                    ) : isAdmin ? (
                      'Free (Admin)'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

