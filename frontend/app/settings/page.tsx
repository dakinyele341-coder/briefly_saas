'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/ui/tag-input'
import { Loader2, Save, ArrowLeft, Sparkles, Info, LogOut, UserPlus, Edit, User, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { UserRole } from '@/types'
import { MenuBar } from '@/components/menu-bar'
import { useGoogleLogin } from '@react-oauth/google'
import { checkCredentials, saveCredentials, disconnectGmail } from '@/utils/api'
import { GoogleOAuthProvider } from '@react-oauth/google'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Get Google Client ID from environment
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1088219665893-6o167j9df3uov60ckk1d054d7pfdt64e.apps.googleusercontent.com'

const ROLE_EXAMPLES: Record<UserRole, string> = {
  Investor: 'e.g., B2B SaaS, Pre-Seed, Fintech, Africa, Marketplace',
  Influencer: 'e.g., Skincare, Tech Review, Paid Collab, Ambassador, UGC',
  'Founder/Business Owner': 'e.g., B2B Lead, Wholesale, Bulk Order, Hiring, Acquisition',
}

const ROLE_INSTRUCTIONS: Record<UserRole, string> = {
  Investor: 'Enter investment focus areas, industries, stages, and geographies. The AI uses these to hunt for pitch decks and funding opportunities.',
  Influencer: 'Enter brand categories, collaboration types, and content niches. The AI uses these to find sponsorship and partnership opportunities.',
  'Founder/Business Owner': 'Enter business opportunities, lead types, and partnership categories. The AI uses these to identify deals, partnerships, and growth opportunities.',
}

function SettingsContent() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [userRole, setUserRole] = useState<UserRole>('Investor')
  const [thesis, setThesis] = useState<string>('')

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
          .select('keywords, role, thesis')
          .eq('id', currentUser.id)
          .single()

        if (profile) {
          // Parse keywords
          if (profile.keywords) {
            if (typeof profile.keywords === 'string') {
              setKeywords(profile.keywords.split(',').map(k => k.trim()).filter(k => k))
            } else if (Array.isArray(profile.keywords)) {
              setKeywords(profile.keywords)
            }
          }

          if (profile.role) {
            setUserRole(profile.role as UserRole)
          }

          if (profile.thesis) {
            setThesis(profile.thesis)
          }
        }

        // Check Gmail Status
        try {
          const status = await checkCredentials(currentUser.id)
          setGmailConnected(status.connected && status.valid)
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
    onSuccess: async (codeResponse) => {
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
          throw new Error('Failed to save credentials')
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

    if (keywords.length === 0) {
      toast.error('Please add at least one keyword')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      // Save to Supabase profiles table
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          keywords: keywords,
          role: userRole,
          thesis: thesis.trim(),
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
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-6 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Settings Card */}
            <Card className="shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-yellow-50 rounded-t-lg">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                  Thesis Setup
                </CardTitle>
                <CardDescription className="text-base">
                  Configure your professional keywords and role to help AI find the right opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Your Role
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Investor', 'Influencer', 'Founder/Business Owner'] as UserRole[]).map((role) => (
                      <Button
                        key={role}
                        variant={userRole === role ? 'default' : 'outline'}
                        onClick={() => setUserRole(role)}
                        className={`w-full h-12 transition-all ${userRole === role
                            ? 'bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600 shadow-md'
                            : 'hover:border-blue-300'
                          }`}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Keywords Input */}
                <div>
                  <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    Keywords / Tags
                  </label>
                  <TagInput
                    tags={keywords}
                    onChange={setKeywords}
                    placeholder="Add keywords (press Enter)"
                    className="min-h-[120px] border-2 border-gray-200 focus-within:border-blue-400 transition-colors"
                  />
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-1">💡 Examples:</p>
                    <p className="text-xs text-blue-700">
                      {ROLE_EXAMPLES[userRole]}
                    </p>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-900">
                      {ROLE_INSTRUCTIONS[userRole]}
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || keywords.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Additional Settings Cards */}
            <div className="space-y-6">

              {/* Gmail Connection Card - NEW */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Mail className="h-5 w-5 text-green-600" />
                    Gmail Connection
                  </CardTitle>
                  <CardDescription>
                    Manage your detailed connection to Gmail
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      {gmailConnected ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {gmailConnected ? 'Connected' : 'Not Connected'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {gmailConnected ? 'Briefly is scanning your emails' : 'Connect to start scanning'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {gmailConnected ? (
                    <Button
                      onClick={handleDisconnectGmail}
                      variant="destructive"
                      className="w-full"
                    >
                      Disconnect Gmail
                    </Button>
                  ) : (
                    <Button
                      onClick={() => login()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Connect Gmail
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Thesis Edit Card */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Edit className="h-5 w-5 text-purple-500" />
                    Thesis Statement
                  </CardTitle>
                  <CardDescription>
                    Your professional thesis helps AI understand your focus areas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe your professional thesis, investment focus, or business goals..."
                    value={thesis}
                    onChange={(e) => setThesis(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    This helps the AI provide more relevant email summaries and opportunities.
                  </p>
                </CardContent>
              </Card>

              {/* Account Actions Card */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="h-5 w-5 text-red-500" />
                    Account Actions
                  </CardTitle>
                  <CardDescription>
                    Manage your account and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button
                      onClick={handleSwitchAccount}
                      variant="outline"
                      className="w-full justify-start gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Sign in to Another Account
                    </Button>

                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full justify-start gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>

                  {user && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Currently signed in as:
                      </p>
                      <p className="text-sm font-medium text-gray-900">
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
