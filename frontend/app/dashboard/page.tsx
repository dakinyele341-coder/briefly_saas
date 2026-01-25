'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getBriefs,
  getStats,
  draftReply,
  saveCredentials,
  markBriefAsRead,
  scanEmails,
  checkBackendHealth,
  checkCredentials,
  isAdminEmail,
  getUnscannedEmails,
  getUnscannedEmailsCount,
  sendFeedback,
  getDashboardStats,
  getSubscriptionInfo
} from '@/utils/api'
import { StatsDashboard } from '@/components/stats-dashboard'
import { AchievementBadge, calculateAchievements } from '@/components/achievement-badge'
import { ErrorBoundary } from '@/components/error-boundary'
import { MenuBar } from '@/components/menu-bar'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { TrialStatusBanner } from '@/components/trial-status-banner'
import { OnboardingFlow } from '@/components/onboarding-flow'

// Import shared types
import { Summary, UserRole } from '@/types'
import {
  Loader2, Mail, AlertCircle, CheckCircle, Reply, RefreshCw, MailCheck,
  Settings, Sparkles, Briefcase, Trophy, Zap, Shield, CreditCard,
  MessageSquare, ExternalLink, Flame, TrendingUp, Minus, Circle, Star, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { User } from '@supabase/supabase-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''


const LANE_A_TITLES: Record<UserRole, string> = {
  Investor: 'Opportunities',
  'Agency Owner': 'Opportunities',
  'Founder/Business Owner': 'Opportunities',
  'Operator / Executive': 'Opportunities',
  'Other': 'Opportunities',
}



const getImportanceBadge = (importanceLevel?: string, score?: number) => {
  // First try to use the new Briefly AI importance level
  if (importanceLevel) {
    switch (importanceLevel) {
      case '🔴 Critical — act now':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-pulse">
            🔴 Critical
          </div>
        )
      case '🟠 Important — review today':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
            🟠 Important
          </div>
        )
      case '🟡 Useful — review later':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">
            🟡 Useful
          </div>
        )
      case '⚪ Low priority — optional':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
            ⚪ Low priority
          </div>
        )
    }
  }

  // Fallback to old scoring system if importance_level not available
  switch (score) {
    case 9:
    case 10:
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-pulse">
          🔴 Critical
        </div>
      )
    case 7:
    case 8:
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
          🟠 Important
        </div>
      )
    case 5:
    case 6:
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">
          🟡 Useful
        </div>
      )
    case 2:
    case 3:
    case 4:
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
          ⚪ Low priority
        </div>
      )
    case 1:
    case 0:
    default:
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-400 text-xs font-medium border border-gray-100">
          ⚪ Low priority
        </div>
      )
  }
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('Investor')
  const [opportunities, setOpportunities] = useState<Summary[]>([])
  const [operations, setOperations] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)
  const [draftLoading, setDraftLoading] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'opportunities' | 'operations'>('opportunities')
  const [draftDialogOpen, setDraftDialogOpen] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<string>('')
  const [currentDraftSubject, setCurrentDraftSubject] = useState<string>('')
  const [backendOnline, setBackendOnline] = useState<boolean>(true)
  const [stats, setStats] = useState<any>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [scanTimeRange, setScanTimeRange] = useState<string>('auto')
  const [scanOptionsOpen, setScanOptionsOpen] = useState<boolean>(false)
  const [showUnscanned, setShowUnscanned] = useState<boolean>(false)
  const [unscannedCount, setUnscannedCount] = useState<number>(0)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState<boolean>(false)
  const [viewFilter, setViewFilter] = useState<'latest' | 'all'>('all')
  const [canScanPastEmails, setCanScanPastEmails] = useState<boolean>(false)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(500)
  const [totalOpportunities, setTotalOpportunities] = useState(0)
  const [totalOperations, setTotalOperations] = useState(0)

  // Grouping helper - sorts emails by importance (critical to low)
  const groupSummariesByTime = useCallback((summaries: Summary[]) => {
    if (viewFilter === 'latest' && summaries.length > 0) {
      // Find the most recent created_at
      const mostRecent = Math.max(...summaries.map(s => s.created_at ? new Date(s.created_at).getTime() : 0))
      // Filter to items within 1 minute of the most recent one (batch)
      const buffer = 60 * 1000
      const latestItems = summaries.filter(s => {
        const time = s.created_at ? new Date(s.created_at).getTime() : 0
        return mostRecent - time < buffer
      })

      // Sort by importance score (critical to low)
      latestItems.sort((a, b) => ((b.importance_score ?? 0) - (a.importance_score ?? 0)))

      const groups: Record<string, Summary[]> = { 'Latest Analysis': latestItems }
      return groups
    }

    const groups: Record<string, Summary[]> = {}

    // Sort by importance score first (critical to low), then by created_at descending
    const sorted = [...summaries].sort((a, b) => {
      const scoreA = a.importance_score ?? 0
      const scoreB = b.importance_score ?? 0
      if (scoreB !== scoreA) {
        return scoreB - scoreA // Higher score first
      }
      // If scores are equal, sort by created_at descending
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    sorted.forEach(item => {
      const date = item.created_at ? new Date(item.created_at) : new Date()
      const timeKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const dateKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      const key = `${dateKey}, ${timeKey}`

      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    return groups
  }, [viewFilter])

  // Helper functions
  const loadBriefs = useCallback(async (forcedUserId?: string) => {
    const targetUserId = forcedUserId || user?.id
    if (!targetUserId) return

    try {
      // Fetch opportunities and operations in parallel
      const [oppsData, opsData] = await Promise.all([
        getBriefs(targetUserId, pageSize, (page - 1) * pageSize, undefined, 'opportunity'),
        getBriefs(targetUserId, pageSize, (page - 1) * pageSize, undefined, 'operation')
      ])

      setOpportunities(oppsData.summaries)
      setTotalOpportunities(oppsData.total)

      setOperations(opsData.summaries)
      setTotalOperations(opsData.total)

    } catch (error: any) {
      console.error('Error loading briefs:', error)
      if (error.message.includes('offline')) {
        toast.error('Briefly is offline')
      } else {
        toast.error(error.message || 'Failed to load briefs')
      }
    }
  }, [user, page, pageSize])

  const loadStats = useCallback(async (forcedUserId?: string) => {
    const targetUserId = forcedUserId || user?.id
    if (!targetUserId) return

    try {
      const statsData = await getStats(targetUserId)
      setStats(statsData)
    } catch (error: any) {
      console.error('Error loading stats:', error)
      // Don't show error for stats, it's not critical
    }
  }, [user])



  // Google OAuth login
  const login = useGoogleLogin({
    flow: 'auth-code',
    prompt: 'consent', // Force consent to ensure refresh token is returned
    onSuccess: async (codeResponse: any) => {
      if (!user) {
        toast.error('User not authenticated')
        return
      }

      try {
        // Send auth code to backend to exchange for tokens (including refresh_token)
        const credentialsResponse = await fetch(`${API_URL}/api/oauth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            code: codeResponse.code,
            // refresh_token is generated by backend exchange
          }),
        })

        if (!credentialsResponse.ok) {
          const errorData = await credentialsResponse.json().catch(() => ({}))
          throw new Error(errorData.detail || 'Failed to save credentials')
        }

        const { credentials_json } = await credentialsResponse.json()
        await saveCredentials(user.id, credentials_json)
        setGmailConnected(true)
        toast.success('Gmail connected successfully!')
        await loadBriefs()
        await loadStats()
      } catch (error: any) {
        console.error('OAuth error:', error)
        toast.error(error.message || 'Failed to connect Gmail')
      }
    },
    onError: () => {
      toast.error('Gmail OAuth failed. Please try again.')
    },
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
  } as any)


  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!autoRefreshEnabled || !gmailConnected || !user) return

    const interval = setInterval(async () => {
      try {
        await loadBriefs()
        await loadStats()
        setLastRefreshTime(new Date())
      } catch (error) {
        console.error('Auto-refresh error:', error)
      }
    }, 120000) // 2 minutes

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, gmailConnected, user, loadBriefs, loadStats])







  const handleRefresh = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      await loadBriefs()
      await loadStats()
      setLastRefreshTime(new Date())
      toast.success('Briefs refreshed!', {
        icon: '✨',
        duration: 2000,
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh briefs')
    } finally {
      setRefreshing(false)
    }
  }, [user, loadBriefs, loadStats])

  const checkUnscannedCount = useCallback(async () => {
    if (!user || !gmailConnected || !canScanPastEmails) return

    try {
      const result = await getUnscannedEmailsCount(user.id)
      setUnscannedCount(result.count)
    } catch (error) {
      console.error('Error checking unscanned count:', error)
    }
  }, [user, gmailConnected, canScanPastEmails])

  const handleScan = useCallback(async (resetHistory: boolean = false) => {
    if (!user) return

    // SUBSCRIPTION & FREE SCAN GUARD:
    // 1. Admin always has access
    // 2. New users get one free 72h scan
    // 3. Others must be active
    const isUserAdmin = user?.email ? isAdminEmail(user.email) : false;
    const hasCompletedFreeScan = (subscriptionInfo as any)?.has_completed_free_scan || false;
    const isActiveSubscription = subscriptionInfo?.subscription_status === 'active' || subscriptionInfo?.subscription_status === 'trial';

    if (!isUserAdmin && hasCompletedFreeScan && !isActiveSubscription) {
      toast.error('Scan limit reached. Please upgrade to continue scanning.', {
        icon: '🔒',
        duration: 5000
      });
      router.push('/subscription');
      return;
    }

    try {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('keywords, role')
        .eq('id', user.id)
        .single()

      if (!profile?.keywords) {
        toast.error('Please set up your keywords in settings first')
        router.push('/settings')
        return
      }

      const keywords = Array.isArray(profile.keywords)
        ? profile.keywords
        : profile.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k)

      const role = (profile.role || 'Investor') as UserRole

      setRefreshing(true)

      // Clear current dashboard emails for fresh display - As requested: Latest results only
      setOpportunities([])
      setOperations([])

      const result = await scanEmails(user.id, keywords, role, 500, 'auto', true)

      // Refresh subscription info locally after scan to pick up status changes
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          const sub = await getSubscriptionInfo(currentUser.id)
          setSubscriptionInfo(sub)
        }
      } catch (subErr) {
        console.error("Error refreshing subscription after scan:", subErr)
      }

      setViewFilter('latest')

      // Show detailed message from backend
      if (result.message) {
        toast.success(result.message, {
          duration: 4000,
          icon: result.processed > 0 ? '✨' : '🎯',
        })
      }

      await loadBriefs()
      await loadStats()
      // Update unscanned count for new users after scan
      if (canScanPastEmails) {
        await checkUnscannedCount()
      }
      setLastRefreshTime(new Date())
    } catch (error: any) {
      toast.error(error.message || 'Failed to scan emails')
    } finally {
      setRefreshing(false)
    }
  }, [user, loadBriefs, loadStats, subscriptionInfo, router, canScanPastEmails, checkUnscannedCount])

  const handleToggleUnscanned = useCallback(() => {
    setShowUnscanned(!showUnscanned)
  }, [showUnscanned])

  // Check for unscanned emails periodically for new users
  useEffect(() => {
    if (!canScanPastEmails) return

    const checkUnscannedEmails = async () => {
      if (!user || !gmailConnected) return

      try {
        const unscannedData = await getUnscannedEmails(user.id)
        const count = unscannedData.count || 0
        setUnscannedCount(count)
      } catch (error) {
        console.error('Error checking unscanned emails:', error)
      }
    }

    // Check immediately and then every 5 minutes
    checkUnscannedEmails()
    const interval = setInterval(checkUnscannedEmails, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [user, gmailConnected, canScanPastEmails])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + R to refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        if (!refreshing) handleRefresh()
      }
      // Cmd/Ctrl + K to scan
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (gmailConnected && !refreshing) handleScan()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [refreshing, gmailConnected, handleRefresh, handleScan])

  const handleConnectGmail = () => {
    if (!user) return
    login()
  }



  const handleDraftReply = async (brief: Summary, emailBody: string) => {
    if (!user) return

    setDraftLoading(brief.subject)
    try {
      const { draft_reply } = await draftReply(
        user.id,
        brief.subject,
        emailBody,
        brief.sender
      )

      setCurrentDraft(draft_reply)
      setCurrentDraftSubject(brief.subject)
      setDraftDialogOpen(true)
      toast.success('Draft reply generated!')
    } catch (error: any) {
      console.error('Error generating draft reply:', error)
      if (error.message.includes('offline')) {
        toast.error('Briefly is offline')
      } else {
        toast.error(error.message || 'Failed to generate draft reply')
      }
    } finally {
      setDraftLoading(null)
    }
  }

  const copyDraftToClipboard = () => {
    navigator.clipboard.writeText(currentDraft)
    toast.success('Draft copied to clipboard!')
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CRITICAL':
      case 'OPPORTUNITY':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'HIGH':
        return <CheckCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Mail className="h-5 w-5 text-gray-500" />
    }
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'OPPORTUNITY':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
            OPPORTUNITY
          </span>
        )
      case 'CRITICAL':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
            CRITICAL
          </span>
        )
      case 'HIGH':
        return (
          <span className="px-2 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded">
            HIGH
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">
            LOW
          </span>
        )
    }
  }

  // Load user and data on component mount
  useEffect(() => {
    async function loadUserAndBriefs() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)

        // Check if user is admin
        if (currentUser.email && isAdminEmail(currentUser.email)) {
          setIsAdmin(true)
          setCanScanPastEmails(true) // Admin can always scan past emails
        }

        // Parallelize initial check: profile, credentials, subscription
        const [profileRes, credentialsRes, subInfo] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single(),
          (async () => {
            try {
              return await checkCredentials(currentUser.id)
            } catch {
              return { connected: false }
            }
          })(),
          (async () => {
            try {
              return await getSubscriptionInfo(currentUser.id)
            } catch (err) {
              console.error('Error loading subscription info:', err)
              return null
            }
          })()
        ])

        const profile = profileRes.data
        console.log('Dashboard loaded profile:', profile)
        console.log('Onboarding completed:', profile?.onboarding_completed)

        if (profile?.role) {
          setUserRole(profile.role as UserRole)
        }

        setCheckingConnection(false)
        setGmailConnected(credentialsRes.connected)
        if (subInfo) setSubscriptionInfo(subInfo)
        setBackendOnline(true)

        // Check if user has completed onboarding
        if (!profile?.onboarding_completed) {
          setShowOnboarding(true)
          setLoading(false)
          return
        }

        // Parallelize data fetching and one-time checks
        const dataPromises: Promise<any>[] = [
          loadBriefs(currentUser.id),
          loadStats(currentUser.id)
        ]

        // Check if user can scan past emails (new users or admin) if not already determined
        if (!isAdmin) {
          dataPromises.push((async () => {
            try {
              const { data: summaries } = await supabase
                .from('summaries')
                .select('id')
                .eq('user_id', currentUser.id)
                .limit(1)
              setCanScanPastEmails(!summaries || summaries.length === 0)
            } catch (error: any) {
              console.error('Error checking user summaries:', error)
              setCanScanPastEmails(false)
            }
          })())
        }

        await Promise.all(dataPromises)
        setLastRefreshTime(new Date())
      } catch (error: any) {
        console.error('Error loading dashboard:', error)
        if (error.message?.includes('offline') || error.message?.includes('Failed to fetch')) {
          setBackendOnline(false)
          toast.error('Briefly is offline. Please check if the backend server is running.')
        } else {
          toast.error(error.message || 'Failed to load dashboard')
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserAndBriefs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || checkingConnection) {
    return (
      <>
        <MenuBar isAdmin={isAdmin} />
        <div className="lg:ml-64 flex min-h-screen items-center justify-center">
          <div className="w-full max-w-7xl mx-auto p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  const handleOnboardingComplete = (data: any) => {
    setShowOnboarding(false)
    // Reload the dashboard data
    window.location.reload()
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  return (
    <>
      <MenuBar isAdmin={isAdmin} />
      <div className="lg:ml-64 min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Your Deal Flow Engine
                {lastRefreshTime && (
                  <span className="text-xs text-gray-400 ml-2">
                    • Last updated: {lastRefreshTime.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!gmailConnected ? (
                <Button onClick={handleConnectGmail} variant="default" size="lg" className="shadow-lg hover:shadow-xl transition-all">
                  <MailCheck className="h-4 w-4 mr-2" />
                  Connect Gmail
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={handleRefresh} variant="outline" disabled={refreshing} className="transition-all">
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>

                  {/* SCAN BUTTON - Header only. Always performs a fresh scan. */}
                  {(isAdmin || (subscriptionInfo?.subscription_status === 'active' || subscriptionInfo?.subscription_status === 'trial') || !((subscriptionInfo as any)?.has_completed_free_scan)) ? (
                    <>
                      <Button
                        onClick={() => handleScan(true)}
                        variant="default"
                        disabled={refreshing}
                        className={`transition-all shadow-md hover:shadow-lg ${!refreshing ? 'animate-pulse hover:animate-none' : ''}`}
                      >
                        <Mail className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Scan Emails
                      </Button>

                      {/* Unscanned Emails Toggle - Only for new users */}
                      {canScanPastEmails && (
                        <Button
                          onClick={handleToggleUnscanned}
                          variant={showUnscanned ? "default" : "outline"}
                          size="sm"
                          className="gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          Unscanned
                          {unscannedCount > 0 && (
                            <Badge variant={unscannedCount >= 15 ? "destructive" : "secondary"}>
                              {unscannedCount}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    /* Free tier user post-free-scan -> Upgrade Required */
                    <Button
                      onClick={() => router.push('/subscription')}
                      variant="default"
                      className="transition-all shadow-md bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Upgrade Required
                    </Button>
                  )}
                </div>

              )}
            </div>
          </div>
        </div>

        {/* Scanning Overlay */}
        {refreshing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping" />
                <div className="relative bg-white rounded-full p-4 shadow-inner">
                  <RefreshCw className="h-10 w-10 text-yellow-500 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">Scanning Your Inbox</h3>
                <p className="text-gray-500 mt-1">Briefly is analyzing your latest emails...</p>
              </div>
            </div>
          </div>
        )}

        {!backendOnline ? (
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Briefly is Offline</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  The dashboard cannot connect to the backend server.
                  This is often due to a local network resolution issue or the server being stopped.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <Button onClick={handleRefresh} variant="default" className="w-full max-w-xs shadow-md">
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Retry Connection
                  </Button>
                  <p className="text-xs text-gray-400">
                    Endpoint: <code className="bg-gray-100 px-1 rounded">{API_URL}</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !gmailConnected ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <MailCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connect Your Gmail Account</h3>
                <p className="text-gray-500 mb-4">
                  Connect your Gmail account to start receiving email briefs and analysis.
                </p>
                <Button onClick={handleConnectGmail} size="lg">
                  <MailCheck className="h-4 w-4 mr-2" />
                  Connect Gmail
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Trial Status Banner */}
            {user && (
              <TrialStatusBanner userId={user.id} userEmail={user.email} />
            )}

            {/* Stats Dashboard */}
            <StatsDashboard
              stats={stats}
              onViewOpportunities={() => setActiveTab('opportunities')}
              onViewOperations={() => setActiveTab('operations')}
              activeTab={activeTab}
            />

            {/* Achievements */}
            {stats && calculateAchievements(stats).length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {calculateAchievements(stats).map((achievement) => (
                      <AchievementBadge key={achievement.id} achievement={achievement} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="w-full">
              {/* View Filter Toggle */}
              <div className="flex justify-end mb-4">
                <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
                  <Button
                    variant={viewFilter === 'latest' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewFilter('latest')}
                    className={cn(
                      "h-8 text-[10px] font-bold uppercase tracking-wider px-4 transition-all duration-200",
                      viewFilter === 'latest'
                        ? "bg-white text-gray-900 shadow-sm hover:bg-white"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Latest Scan
                  </Button>
                  <Button
                    variant={viewFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewFilter('all')}
                    className={cn(
                      "h-8 text-[10px] font-bold uppercase tracking-wider px-4 transition-all duration-200",
                      viewFilter === 'all'
                        ? "bg-white text-gray-900 shadow-sm hover:bg-white"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Full History (24h)
                  </Button>
                </div>
              </div>

              {/* Tabs Navigation slice */}
              <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className={cn(
                    "flex-1 py-4 px-6 text-sm font-bold transition-all flex items-center justify-center gap-2",
                    activeTab === 'opportunities'
                      ? "bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500"
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Sparkles className={cn("h-4 w-4", activeTab === 'opportunities' ? "text-yellow-500" : "text-gray-400")} />
                  {LANE_A_TITLES[userRole]}
                  <Badge variant="outline" className={cn("ml-2", activeTab === 'opportunities' ? "bg-yellow-100 text-yellow-700" : "")}>
                    {totalOpportunities}
                  </Badge>
                </button>
                <button
                  onClick={() => setActiveTab('operations')}
                  className={cn(
                    "flex-1 py-4 px-6 text-sm font-bold transition-all flex items-center justify-center gap-2",
                    activeTab === 'operations'
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Briefcase className={cn("h-4 w-4", activeTab === 'operations' ? "text-blue-500" : "text-gray-400")} />
                  Operations
                  <Badge variant="outline" className={cn("ml-2", activeTab === 'operations' ? "bg-blue-100 text-blue-700" : "")}>
                    {totalOperations}
                  </Badge>
                </button>

              </div>

              {/* Lane Content */}
              {activeTab === 'opportunities' ? (
                /* The Gold Mine (Lane A) */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      {LANE_A_TITLES[userRole]}
                    </h2>
                    <span className="text-sm text-gray-500">{totalOpportunities} opportunities</span>
                  </div>

                  {opportunities.length === 0 ? (
                    <Card className="border-dashed border-2 bg-gray-50/50">
                      <CardContent className="pt-16 pb-16">
                        <div className="text-center max-w-sm mx-auto">
                          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="h-10 w-10 text-yellow-500" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">The Gold Mine is Empty</h3>
                          <p className="text-gray-500">
                            We haven't found any opportunities matching your professional thesis yet. Try scanning your inbox using the button at the top!
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupSummariesByTime(opportunities)).map(([groupKey, groupItems]) => (
                        <div key={groupKey} className="mb-10 last:mb-0">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 bg-white px-3 py-1 border border-gray-100 rounded-full shadow-sm">
                              {groupKey}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                          </div>
                          <div className="space-y-4">
                            {groupItems.map((brief, index) => (
                              <Card
                                key={brief.id || `${groupKey}-${index}`}
                                className="relative hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-yellow-400"
                              >
                                {(brief.importance_score ?? 0) >= 7 && (
                                  <div className="absolute top-2 right-2 h-3 w-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                                )}
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      {getCategoryIcon(brief.category)}
                                      <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center justify-between gap-2">
                                          {brief.subject}
                                          {getImportanceBadge(brief.importance_level, brief.importance_score)}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                          From: {brief.sender} • {brief.date}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    {getCategoryBadge(brief.category)}
                                  </div>
                                  {brief.thesis_match_score !== undefined && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Match Score:</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${brief.thesis_match_score}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-semibold">{brief.thesis_match_score}%</span>
                                      </div>
                                    </div>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  <p className="text-gray-700 mb-4">{brief.summary}</p>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleDraftReply(brief, brief.summary)}
                                      disabled={draftLoading === brief.subject}
                                      variant="outline"
                                      size="sm"
                                      className="font-bold border-2"
                                    >
                                      {draftLoading === brief.subject ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <Reply className="h-4 w-4 mr-2" />
                                          Draft Reply
                                        </>
                                      )}
                                    </Button>
                                    {brief.gmail_link && (
                                      <Button
                                        onClick={() => window.open(brief.gmail_link, '_blank')}
                                        variant="outline"
                                        size="sm"
                                        className="font-bold border-2"
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Email
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                      {/* Pagination Controls */}
                      {opportunities.length > 0 && (
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalOpportunities)} of {totalOpportunities}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => p + 1)}
                              disabled={page * pageSize >= totalOpportunities}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeTab === 'operations' ? (
                /* The Work (Lane B) */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                      Operations
                    </h2>
                    <span className="text-sm text-gray-500">{totalOperations} items</span>
                  </div>

                  {operations.length === 0 ? (
                    <Card className="border-dashed border-2 bg-gray-50/50">
                      <CardContent className="pt-16 pb-16">
                        <div className="text-center max-w-sm mx-auto">
                          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Briefcase className="h-10 w-10 text-blue-500" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Clear Inbox!</h3>
                          <p className="text-gray-500">
                            Your operational inbox is empty. All low-priority or administrative emails will appear here once found.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupSummariesByTime(operations)).map(([groupKey, groupItems]) => (
                        <div key={groupKey} className="mb-10 last:mb-0">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 bg-white px-3 py-1 border border-gray-100 rounded-full shadow-sm">
                              {groupKey}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                          </div>
                          <div className="space-y-4">
                            {groupItems.map((brief, index) => (
                              <Card
                                key={brief.id || `${groupKey}-${index}`}
                                className="hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-400"
                              >
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      {getCategoryIcon(brief.category)}
                                      <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center justify-between gap-2">
                                          {brief.subject}
                                          {getImportanceBadge(brief.importance_level, brief.importance_score)}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                          From: {brief.sender} • {brief.date}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    {getCategoryBadge(brief.category)}
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-gray-700 mb-4">{brief.summary}</p>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleDraftReply(brief, brief.summary)}
                                      disabled={draftLoading === brief.subject}
                                      variant="outline"
                                      size="sm"
                                      className="font-bold border-2"
                                    >
                                      {draftLoading === brief.subject ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <Reply className="h-4 w-4 mr-2" />
                                          Draft Reply
                                        </>
                                      )}
                                    </Button>
                                    {brief.gmail_link && (
                                      <Button
                                        onClick={() => window.open(brief.gmail_link, '_blank')}
                                        variant="outline"
                                        size="sm"
                                        className="font-bold border-2"
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Email
                                      </Button>
                                    )}
                                  </div>

                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Draft Reply Dialog */}
        <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>✨ Draft Reply</DialogTitle>
              <DialogDescription>
                AI-generated reply for: {currentDraftSubject}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-yellow-50 rounded-lg border-2 border-blue-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                {currentDraft}
              </pre>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDraftDialogOpen(false)}
                className="hover:bg-gray-100"
              >
                Close
              </Button>
              <Button
                onClick={copyDraftToClipboard}
                className="bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600"
              >
                📋 Copy to Clipboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <FeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
        />
      </div>

    </>
  )
}

const getCategoryIcon = (category: string) => {
  switch (category.toUpperCase()) {
    case 'OPPORTUNITY':
      return <Sparkles className="h-5 w-5 text-yellow-500" />
    case 'CRITICAL':
      return <Flame className="h-5 w-5 text-red-500" />
    case 'HIGH':
      return <Zap className="h-5 w-5 text-orange-500" />
    case 'LOW':
      return <Info className="h-5 w-5 text-gray-400" />
    default:
      return <Circle className="h-5 w-5 text-blue-500" />
  }
}

const getCategoryBadge = (category: string) => {
  const isOpp = category.toUpperCase() === 'OPPORTUNITY'
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${isOpp
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-blue-100 text-blue-800'
      }`}>
      {category}
    </span>
  )
}

export default function DashboardPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  if (!googleClientId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configuration Error</h3>
                <p className="text-gray-500">
                  NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Please configure Google OAuth in your environment variables.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <DashboardContent />
    </GoogleOAuthProvider>
  )
}
