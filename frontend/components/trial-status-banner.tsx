'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Crown, Clock, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSubscriptionInfo } from '@/utils/api'
import { isAdminEmail } from '@/utils/api'

interface TrialStatusBannerProps {
  userId: string
  userEmail?: string
}

export function TrialStatusBanner({ userId, userEmail }: TrialStatusBannerProps) {
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadSubscriptionInfo() {
      try {
        const info = await getSubscriptionInfo(userId)
        setSubscriptionInfo(info)
      } catch (error) {
        console.error('Error loading subscription info:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscriptionInfo()
  }, [userId])

  if (loading || dismissed || !subscriptionInfo) {
    return null
  }

  // Don't show banner for admin users
  if (userEmail && isAdminEmail(userEmail)) {
    return null
  }

  const { subscription_status, days_remaining, trial_expires_at } = subscriptionInfo

  // Only show banner for trial users
  if (subscription_status !== 'trial' && subscription_status !== 'trial_expired') {
    return null
  }

  const isExpired = subscription_status === 'trial_expired'
  const isExpiringSoon = days_remaining !== null && days_remaining <= 2 && !isExpired

  // Don't show banner if trial is still long (more than 2 days)
  if (!isExpired && (!isExpiringSoon || days_remaining === null)) {
    return null
  }

  return (
    <Card className={`mb-6 border-l-4 shadow-lg ${
      isExpired
        ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50'
        : 'border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50'
    }`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isExpired ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {isExpired ? (
                <AlertTriangle className={`h-5 w-5 ${
                  isExpired ? 'text-red-600' : 'text-yellow-600'
                }`} />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div>
              <h3 className={`font-semibold ${
                isExpired ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {isExpired ? 'Trial Expired' : 'Trial Ending Soon'}
              </h3>
              <p className={`text-sm ${
                isExpired ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {isExpired
                  ? 'Your 2-day free trial has expired. Upgrade to continue using Briefly.'
                  : `${days_remaining} day${days_remaining === 1 ? '' : 's'} remaining in your trial.`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push('/subscription')}
              size="sm"
              className={`${
                isExpired
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isExpired ? 'Upgrade Now' : 'View Plans'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}