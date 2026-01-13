'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Users, Mail, DollarSign, TrendingUp, Activity, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAdminStats, getAdminUsers, isAdminEmail } from '@/utils/api'
import { MenuBar } from '@/components/menu-bar'

interface AdminStats {
  total_users: number
  active_users: number
  total_emails_processed: number
  total_opportunities: number
  mrr: number
  recent_activity_24h: number
  timestamp: string
}

interface AdminUser {
  id: string
  role: string | null
  keywords: string[] | null
  created_at: string
  updated_at: string
  email_count: number
  has_credentials: boolean
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)
        const email = currentUser.email || ''
        setUserEmail(email)

        // Check if user is admin
        if (isAdminEmail(email)) {
          setIsAdmin(true)
          loadStats(email)
          loadUsers(email)
        } else {
          toast.error('Access denied. Admin privileges required.')
          router.push('/dashboard')
        }
      } catch (error: any) {
        console.error('Error checking admin:', error)
        toast.error('Failed to verify admin access')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  const loadStats = async (email: string) => {
    setLoadingStats(true)
    try {
      const data = await getAdminStats(email)
      setStats(data)
    } catch (error: any) {
      console.error('Error loading admin stats:', error)
      toast.error('Failed to load admin statistics')
    } finally {
      setLoadingStats(false)
    }
  }

  const loadUsers = async (email: string) => {
    setLoadingUsers(true)
    try {
      const data = await getAdminUsers(email, 50, 0)
      setUsers(data.users)
    } catch (error: any) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleRefresh = async () => {
    if (userEmail) {
      await Promise.all([
        loadStats(userEmail),
        loadUsers(userEmail)
      ])
      toast.success('Data refreshed')
    }
  }

  if (loading) {
    return (
      <>
        <MenuBar isAdmin={true} />
        <div className="lg:ml-64 flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <MenuBar isAdmin={true} />
      <div className="lg:ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
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
                <Shield className="h-8 w-8 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Platform-wide statistics and user management</p>
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={loadingStats || loadingUsers}>
            {loadingStats || loadingUsers ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{stats.total_users}</div>
                <p className="text-xs text-blue-700 mt-1">
                  {stats.active_users} active
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Emails Processed</CardTitle>
                <Mail className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{stats.total_emails_processed.toLocaleString()}</div>
                <p className="text-xs text-green-700 mt-1">
                  {stats.recent_activity_24h} in last 24h
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-900">Opportunities Found</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-900">{stats.total_opportunities.toLocaleString()}</div>
                <p className="text-xs text-yellow-700 mt-1">
                  Across all users
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">${stats.mrr.toLocaleString()}</div>
                <p className="text-xs text-purple-700 mt-1">
                  MRR
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Users Table */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              All Users
            </CardTitle>
            <CardDescription>
              {users.length} users found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">User ID</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Keywords</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Emails</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-sm font-mono text-gray-600">{user.id.substring(0, 8)}...</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {user.role || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {user.keywords && Array.isArray(user.keywords) ? (
                            <div className="flex flex-wrap gap-1">
                              {user.keywords.slice(0, 3).map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                  {kw}
                                </span>
                              ))}
                              {user.keywords.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                  +{user.keywords.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No keywords</span>
                          )}
                        </td>
                        <td className="p-3 text-sm font-medium text-gray-700">{user.email_count}</td>
                        <td className="p-3">
                          {user.has_credentials ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  )
}

