'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Mail, Sparkles, Briefcase, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsProps {
  total_processed: number
  opportunities: number
  operations: number
  unread_opportunities: number
  unread_operations: number
  avg_match_score: number
}

interface StatsDashboardProps {
  stats: StatsProps | null
  onViewOpportunities?: () => void
  onViewOperations?: () => void
  onViewUnreadOpportunities?: () => void
  onViewUnreadOperations?: () => void
  activeTab?: 'opportunities' | 'operations' | 'recent-scans'
}

export function StatsDashboard({
  stats,
  onViewOpportunities,
  onViewOperations,
  onViewUnreadOpportunities,
  onViewUnreadOperations,
  activeTab
}: StatsDashboardProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Emails Processed
          </CardTitle>
          <Mail className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_processed}</div>
          <p className="text-xs text-gray-500 mt-1">Total analyzed</p>
        </CardContent>
      </Card>

      <Card
        onClick={onViewOpportunities}
        className={cn(
          "cursor-pointer hover:shadow-lg transition-all duration-200 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white hover:scale-[1.02]",
          activeTab === 'opportunities' && "ring-2 ring-yellow-400 shadow-md"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Opportunities
          </CardTitle>
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-700">{stats.opportunities}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.unread_opportunities > 0 && (
              <span className="text-yellow-600 font-semibold">
                {stats.unread_opportunities} new
              </span>
            )}
            {stats.unread_opportunities === 0 && 'All caught up'}
          </p>
        </CardContent>
      </Card>

      <Card
        onClick={onViewOperations}
        className={cn(
          "cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]",
          activeTab === 'operations' && "ring-2 ring-blue-400 shadow-md"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Operations
          </CardTitle>
          <Briefcase className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.operations}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.unread_operations > 0 && (
              <span className="text-blue-600 font-semibold">
                {stats.unread_operations} new
              </span>
            )}
            {stats.unread_operations === 0 && 'All caught up'}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200 border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Match Score
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">{stats.avg_match_score}%</div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.avg_match_score}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
