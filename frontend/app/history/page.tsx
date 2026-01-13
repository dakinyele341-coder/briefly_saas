'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, History, Mail, AlertCircle, CheckCircle, Eye, EyeOff, Filter, ExternalLink } from 'lucide-react'
import { getEmailHistory, markHistoryAsRead } from '@/utils/api'
import toast from 'react-hot-toast'
import { MenuBar } from '@/components/menu-bar'
import { Summary } from '@/types'

function HistoryContent() {
  const [user, setUser] = useState<any>(null)
  const [history, setHistory] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [laneFilter, setLaneFilter] = useState<'all' | 'opportunity' | 'operation'>('all')
  const router = useRouter()

  const loadHistory = useCallback(async () => {
    if (!user) return

    try {
      let lane: string | undefined
      if (laneFilter !== 'all') {
        lane = laneFilter
      }

      const historyData = await getEmailHistory(user.id, unreadOnly, 100, 0, lane)
      setHistory(historyData)
    } catch (error: any) {
      console.error('Error loading history:', error)
      toast.error('Failed to load email history')
    }
  }, [user, laneFilter, unreadOnly])

  useEffect(() => {
    async function loadUserAndHistory() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)

        // Check query parameters for initial filters
        const urlParams = new URLSearchParams(window.location.search)
        const filter = urlParams.get('filter')
        const unread = urlParams.get('unread')

        if (filter === 'opportunity') {
          setLaneFilter('opportunity')
        } else if (filter === 'operation') {
          setLaneFilter('operation')
        }

        if (unread === 'true') {
          setUnreadOnly(true)
        }

        await loadHistory()
      } catch (error: any) {
        console.error('Error loading history:', error)
        toast.error('Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    loadUserAndHistory()
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      loadHistory()
    }
  }, [user, unreadOnly, laneFilter, loadHistory])

  const handleMarkAsRead = async (summary: Summary) => {
    if (!user || !summary.id) return

    setMarkingRead(summary.id)
    try {
      await markHistoryAsRead(summary.id, user.id)

      // Update local state
      setHistory(prev =>
        prev.map(h => h.id === summary.id ? { ...h, is_read: true } : h)
      )

      toast.success('Marked as read')
    } catch (error: any) {
      console.error('Error marking as read:', error)
      toast.error('Failed to mark as read')
    } finally {
      setMarkingRead(null)
    }
  }

  const handleViewDetails = (summary: Summary) => {
    setSelectedSummary(summary)
    setShowDetailsDialog(true)
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <>
        <MenuBar />
        <div className="lg:ml-64 flex min-h-screen items-center justify-center">
          <div className="w-full max-w-6xl mx-auto p-8 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
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

  return (
    <>
      <MenuBar />
      <div className="lg:ml-64 min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <History className="h-8 w-8 text-blue-600" />
              Email Processing History
            </h1>
            <p className="text-gray-600 mt-2">
              View all your processed emails ordered by date
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Show unread only</span>
              <Switch
                checked={unreadOnly}
                onCheckedChange={setUnreadOnly}
              />
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {unreadOnly ? 'No unread processed emails' : 'No processed emails yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {unreadOnly
                    ? 'All your processed emails have been read. Try turning off the unread filter.'
                    : 'Your processed emails will appear here once you start scanning.'
                  }
                </p>
                {!unreadOnly && (
                  <Button onClick={() => router.push('/dashboard')}>
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Showing {history.length} {unreadOnly ? 'unread' : ''} processed email{history.length !== 1 ? 's' : ''}
            </div>

            {history.map((item, index) => (
              <Card key={item.id || index} className="hover:shadow-md transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getCategoryIcon(item.category)}
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.subject}</CardTitle>
                        <CardDescription className="mt-1">
                          From: {item.sender} • {formatDate(item.date)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(item.category)}
                      {item.is_read ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {item.thesis_match_score !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Match Score:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${item.thesis_match_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{item.thesis_match_score}%</span>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-gray-700 mb-4">{item.summary}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewDetails(item)}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                      {!item.is_read && (
                        <Button
                          onClick={() => handleMarkAsRead(item)}
                          disabled={markingRead === item.id}
                          variant="outline"
                          size="sm"
                        >
                          {markingRead === item.id ? 'Marking...' : 'Mark Read'}
                        </Button>
                      )}
                      {item.gmail_link && (
                        <Button
                          onClick={() => window.open(item.gmail_link, '_blank')}
                          variant="outline"
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Email
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedSummary && getCategoryIcon(selectedSummary.category)}
                {selectedSummary?.subject}
              </DialogTitle>
              <DialogDescription>
                Processed on {selectedSummary && formatDate(selectedSummary.date)}
                {selectedSummary && !selectedSummary.is_read && (
                  <span className="ml-2 text-orange-600 font-medium">• Unread</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">From</h4>
                <p className="text-gray-900">{selectedSummary?.sender}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Category</h4>
                <div className="flex items-center gap-2">
                  {selectedSummary && getCategoryIcon(selectedSummary.category)}
                  {selectedSummary && getCategoryBadge(selectedSummary.category)}
                </div>
              </div>
              {selectedSummary?.lane && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Lane</h4>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    selectedSummary.lane === 'opportunity'
                      ? 'text-green-700 bg-green-100'
                      : 'text-blue-700 bg-blue-100'
                  }`}>
                    {selectedSummary.lane === 'opportunity' ? 'Opportunity' : 'Operational'}
                  </span>
                </div>
              )}
              {selectedSummary?.thesis_match_score !== undefined && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Match Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${selectedSummary.thesis_match_score}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">{selectedSummary.thesis_match_score}%</span>
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-gray-800 leading-relaxed">{selectedSummary?.summary}</p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
              {selectedSummary && !selectedSummary.is_read && (
                <Button
                  onClick={() => {
                    if (selectedSummary) {
                      handleMarkAsRead(selectedSummary)
                      setShowDetailsDialog(false)
                    }
                  }}
                  disabled={markingRead === selectedSummary.id}
                >
                  {markingRead === selectedSummary.id ? 'Marking...' : 'Mark as Read'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </>
  )
}

export default function HistoryPage() {
  return <HistoryContent />
}