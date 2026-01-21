'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Scan, Settings, Zap, History, Clock, Mail, MessageSquare } from 'lucide-react'

interface QuickActionsProps {
  onRefresh: () => void
  onScan: () => void
  onSettings: () => void
  onHistory: () => void
  onFeedback: () => void
  refreshing: boolean
  scanning: boolean
  gmailConnected: boolean
  scanTimeRange: string
  onScanTimeRangeChange: (range: string) => void
  isAdmin: boolean
  canScanPastEmails: boolean
}

export function QuickActions({
  onRefresh,
  onScan,
  onSettings,
  onHistory,
  onFeedback,
  refreshing,
  scanning,
  gmailConnected,
  scanTimeRange,
  onScanTimeRangeChange,
  isAdmin,
  canScanPastEmails,
}: QuickActionsProps) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {gmailConnected && (
        <>
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <Select value={scanTimeRange} onValueChange={onScanTimeRangeChange}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                {/* New users get limited time ranges (24 hours - 7 days) */}
                {canScanPastEmails && !isAdmin && (
                  <>
                    <SelectItem value="1day">24 Hours</SelectItem>
                    <SelectItem value="3days">3 Days</SelectItem>
                    <SelectItem value="7days">7 Days</SelectItem>
                  </>
                )}
                {/* Admin gets all time ranges */}
                {isAdmin && (
                  <>
                    <SelectItem value="2hours">2 Hours</SelectItem>
                    <SelectItem value="1day">1 Day</SelectItem>
                    <SelectItem value="3days">3 Days</SelectItem>
                    <SelectItem value="7days">7 Days</SelectItem>
                    <SelectItem value="30days">30 Days</SelectItem>
                  </>
                )}
                {/* Existing users only get auto (unread emails) */}
                {!canScanPastEmails && !isAdmin && (
                  <div className="px-2 py-1 text-xs text-gray-500">
                    Only auto mode available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Scan Button */}
          <Button
            onClick={onScan}
            disabled={scanning || refreshing}
            variant="default"
            size="sm"
            className="gap-2"
          >
            {scanning ? (
              <>
                <Zap className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Scan Emails
              </>
            )}
          </Button>

          <Button
            onClick={onRefresh}
            disabled={refreshing || scanning}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </>
      )}
      <Button
        onClick={onHistory}
        variant="ghost"
        size="sm"
        className="gap-2"
      >
        <History className="h-4 w-4" />
        History
      </Button>
      <Button
        onClick={onFeedback}
        variant="ghost"
        size="sm"
        className="gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </Button>
      <Button
        onClick={onSettings}
        variant="ghost"
        size="sm"
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Button>
    </div>
  )
}
