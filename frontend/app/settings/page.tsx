'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/ui/tag-input'
import { Loader2, Save, ArrowLeft, Sparkles, Info, LogOut, UserPlus, Edit, User, Mail, CheckCircle2, AlertCircle, Target, AlertTriangle, MessageSquare, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { UserRole } from '@/types'
import { MenuBar } from '@/components/menu-bar'
import { useGoogleLogin } from '@react-oauth/google'
import { checkCredentials, saveCredentials, disconnectGmail } from '@/utils/api'
import { GoogleOAuthProvider } from '@react-oauth/google'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Get Google Client ID from environment
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1088219665893-6o167j9df3uov60ckk1d054d7pfdt64e.apps.googleusercontent.com'

const ROLE_OPTIONS = [
  'Founder',
  'Agency Owner',
  'Investor',
  'Operator / Executive',
  'Other'
]

const FOCUS_OPTIONS = [
  'Fundraising', 'Client delivery', 'Sales & partnerships', 'Hiring', 'Deal sourcing', 'Operations / finance'
]

const CRITICAL_OPTIONS = [
  'Investor or partner introductions', 'Client issues or renewals', 'Legal / finance', 'Deadlines & decisions', 'Internal team issues'
]

const STYLE_OPTIONS = [
  'Short & direct', 'Polite & professional', 'Warm & conversational', 'Formal'
]

const ROLE_EXAMPLES: Record<string, string> = {
  Founder: 'e.g., Venture growth, Product-market fit, Hiring, Scaling',
  'Agency Owner': 'e.g., Lead gen, Client retention, Upselling, Service delivery',
  Investor: 'e.g., Deal flow, Due diligence, Portfolio support',
  'Operator / Executive': 'e.g., Team efficiency, Strategy execution, P&L management',
  Other: 'e.g., Personal productivity, Custom focus areas',
}

function SettingsContent() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('Investor')

  // Persona-based fields
  const [currentFocus, setCurrentFocus] = useState<string[]>([])
  const [criticalCategories, setCriticalCategories] = useState<string[]>([])
  const [communicationStyle, setCommunicationStyle] = useState<string>('')
  const [businessContext, setBusinessContext] = useState<string>('')

  // New Gmail State
  const [gmailConnected, setGmailConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(false)

  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)

        // Load user profile from Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, current_focus, critical_categories, communication_style, business_context')
          .eq('id', currentUser.id)
          .single()

        if (profile) {
          if (profile.role) {
            setUserRole(profile.role as UserRole)
          }

          // Load persona fields
          if (profile.current_focus) {
            setCurrentFocus(Array.isArray(profile.current_focus) ? profile.current_focus : [])
          }

          if (profile.critical_categories) {
            setCriticalCategories(Array.isArray(profile.critical_categories) ? profile.critical_categories : [])
          }

          if (profile.communication_style) {
            setCommunicationStyle(profile.communication_style)
          }

          if (profile.business_context) {
            setBusinessContext(profile.business_context)
          }
        }

        // Check Gmail Status
        try {
          const status = await checkCredentials(currentUser.id)
          setGmailConnected(status.connected && (status.valid ?? false))
        } catch (error) {
          console.error('Error checking Gmail status:', error)
        }

      } catch (error: any) {
        console.error('Error loading settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  // Google OAuth login
  const login = useGoogleLogin({
    flow: 'auth-code',
    prompt: 'consent',
    onSuccess: async (codeResponse: any) => {
      if (!user) return
      try {
        const credentialsResponse = await fetch(`${API_URL}/api/oauth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            code: codeResponse.code,
          }),
        })

        if (!credentialsResponse.ok) {
          const errorData = await credentialsResponse.json().catch(() => ({}))
          console.error('Frontend OAuth Callback Error:', errorData) // Log strictly for diagnosis
          throw new Error(errorData.detail || 'Failed to save credentials')
        }

        const { credentials_json } = await credentialsResponse.json()
        await saveCredentials(user.id, credentials_json)
        setGmailConnected(true)
        toast.success('Gmail connected successfully!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to connect Gmail')
      }
    },
    onError: () => toast.error('Gmail connection failed'),
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
  } as any)

  const handleDisconnectGmail = async () => {
    if (!user) return
    if (!confirm('Are you sure you want to disconnect Gmail? You will stop receiving summaries.')) return

    try {
      await disconnectGmail(user.id)
      setGmailConnected(false)
      toast.success('Gmail disconnected')
    } catch (error) {
      toast.error('Failed to disconnect')
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/login')
    } catch (error: any) {
      toast.error('Failed to sign out')
    }
  }

  const handleSwitchAccount = async () => {
    // Sign out and redirect to login
    await handleSignOut()
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Save to Supabase profiles table
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          role: userRole,
          current_focus: currentFocus,
          critical_categories: criticalCategories,
          communication_style: communicationStyle,
          business_context: businessContext,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || 'Database error occurred')
      }

      toast.success('✨ Settings saved successfully!', {
        icon: '🎉',
        duration: 2000,
      })

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error: any) {
      console.error('Error saving settings:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', error ? Object.keys(error) : 'No error object')

      const errorMessage = error?.message || error?.details || 'Failed to save settings'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <MenuBar />
      <div className="lg:ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-8 w-8 text-blue-600" />
              Settings
            </h1>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-8">
              {/* User Role Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    What best describes you?
                  </CardTitle>
                  <CardDescription>
                    This role affects how importance, urgency, and relevance are interpreted.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {ROLE_OPTIONS.map((role) => (
                      <Button
                        key={role}
                        variant={userRole === role ? 'default' : 'outline'}
                        onClick={() => setUserRole(role as UserRole)}
                        className={cn(
                          "h-12 justify-center font-medium transition-all",
                          userRole === role ? "bg-blue-600 border-blue-600" : "hover:border-blue-200 hover:bg-blue-50"
                        )}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      {ROLE_EXAMPLES[userRole] || 'Select a role to see examples.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Current Focus Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    What matters most to you right now?
                  </CardTitle>
                  <CardDescription>
                    Treat selected focuses as priority amplifiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FOCUS_OPTIONS.map((focus) => (
                      <Button
                        key={focus}
                        variant={currentFocus.includes(focus) ? 'default' : 'outline'}
                        onClick={() => {
                          const newFocus = currentFocus.includes(focus)
                            ? currentFocus.filter(f => f !== focus)
                            : [...currentFocus, focus]
                          setCurrentFocus(newFocus)
                        }}
                        className={cn(
                          "h-12 justify-center font-medium transition-all",
                          currentFocus.includes(focus) ? "bg-orange-600 border-orange-600" : "hover:border-orange-200 hover:bg-orange-50"
                        )}
                      >
                        {focus}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Non-Missable Email Types Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    What emails can’t you afford to miss?
                  </CardTitle>
                  <CardDescription>
                    These will be elevated immediately, regardless of sender size or tone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CRITICAL_OPTIONS.map((option) => (
                      <Button
                        key={option}
                        variant={criticalCategories.includes(option) ? 'default' : 'outline'}
                        onClick={() => {
                          const newCategories = criticalCategories.includes(option)
                            ? criticalCategories.filter(c => c !== option)
                            : [...criticalCategories, option]
                          setCriticalCategories(newCategories)
                        }}
                        className={cn(
                          "h-12 justify-center font-medium transition-all text-center whitespace-normal",
                          criticalCategories.includes(option) ? "bg-red-600 border-red-600" : "hover:border-red-200 hover:bg-red-50"
                        )}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Communication Style Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    How do you prefer to reply?
                  </CardTitle>
                  <CardDescription>
                    All drafted replies will strictly follow this selected style.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {STYLE_OPTIONS.map((style) => (
                      <Button
                        key={style}
                        variant={communicationStyle === style ? 'default' : 'outline'}
                        onClick={() => setCommunicationStyle(style)}
                        className={cn(
                          "h-12 justify-center font-medium transition-all",
                          communicationStyle === style ? "bg-indigo-600 border-indigo-600" : "hover:border-indigo-200 hover:bg-indigo-50"
                        )}
                      >
                        {style}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Business Context Card */}
                <Card className="shadow-xl border-0 h-full">
                  <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      Business Context
                    </CardTitle>
                    <CardDescription>
                      Share details about your business goals and current challenges.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Textarea
                      placeholder="Describe your current business goals, challenges, or what you're working towards..."
                      value={businessContext}
                      onChange={(e) => setBusinessContext(e.target.value)}
                      rows={6}
                      className="resize-none focus-visible:ring-teal-500"
                    />
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  {/* Gmail Connection Card */}
                  <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Mail className="h-5 w-5 text-green-600" />
                        Gmail Connection
                      </CardTitle>
                      <CardDescription>
                        Manage your connection to start scanning emails.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm mb-4">
                        <div className="flex items-center gap-3">
                          {gmailConnected ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {gmailConnected ? 'Connected' : 'Not Connected'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {gmailConnected ? 'Successfully linked to your inbox' : 'Connect to enable email analysis'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {gmailConnected ? (
                        <Button
                          onClick={handleDisconnectGmail}
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 font-medium"
                        >
                          Disconnect Gmail
                        </Button>
                      ) : (
                        <Button
                          onClick={() => login()}
                          className="w-full bg-blue-600 hover:bg-blue-700 shadow-md font-medium"
                        >
                          Connect Gmail Account
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Account Actions Card */}
                  <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5 text-orange-600" />
                        Account
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={handleSwitchAccount}
                          variant="outline"
                          className="w-full justify-start gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Switch Account
                        </Button>

                        <Button
                          onClick={handleSignOut}
                          variant="outline"
                          className="w-full justify-start gap-2 border-red-100 text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </Button>
                      </div>

                      {user && (
                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Signed in as</p>
                          <p className="text-sm font-medium text-gray-900 border-l-4 border-blue-500 pl-3 py-1 bg-blue-50/50 rounded-r-lg">
                            {user.email}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SettingsPage() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <SettingsContent />
    </GoogleOAuthProvider>
  )
}
