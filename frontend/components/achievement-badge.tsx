'use client'

import { Trophy, Star, Zap, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Achievement {
  id: string
  title: string
  description: string
  icon: 'trophy' | 'star' | 'zap' | 'target'
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

const iconMap = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
}

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Icon = iconMap[achievement.icon]

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 ${
      achievement.unlocked 
        ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white shadow-md' 
        : 'opacity-60'
    }`}>
      {achievement.unlocked && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-200 rounded-bl-full opacity-20" />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            achievement.unlocked ? 'bg-yellow-100' : 'bg-gray-100'
          }`}>
            <Icon className={`h-5 w-5 ${
              achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'
            }`} />
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${
              achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {achievement.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
            {achievement.progress !== undefined && achievement.maxProgress && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((achievement.progress / achievement.maxProgress) * 100, 100)}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {achievement.progress} / {achievement.maxProgress}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function calculateAchievements(stats: any): Achievement[] {
  if (!stats) return []

  return [
    {
      id: 'first_scan',
      title: 'First Scan',
      description: 'Processed your first email',
      icon: 'star',
      unlocked: stats.total_processed > 0,
    },
    {
      id: 'opportunity_hunter',
      title: 'Opportunity Hunter',
      description: 'Found 10 opportunities',
      icon: 'target',
      unlocked: stats.opportunities >= 10,
      progress: stats.opportunities,
      maxProgress: 10,
    },
    {
      id: 'power_user',
      title: 'Power User',
      description: 'Processed 100 emails',
      icon: 'zap',
      unlocked: stats.total_processed >= 100,
      progress: stats.total_processed,
      maxProgress: 100,
    },
    {
      id: 'perfect_match',
      title: 'Perfect Match',
      description: 'Average match score above 80%',
      icon: 'trophy',
      unlocked: stats.avg_match_score >= 80,
    },
  ]
}

