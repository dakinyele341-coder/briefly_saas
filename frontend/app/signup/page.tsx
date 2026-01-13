'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, Sparkles, User, Chrome } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGoogleSignup = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message || 'Error connecting with Google')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      toast.error('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Sign up user - Profile is automatically created by database trigger
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            full_name: email.split('@')[0], // Basic placeholder for name
          }
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        toast.error(signUpError.message)
      } else if (authData.user) {
        // Success!
        toast.success('Check your email to verify your account!', {
          icon: '📧',
          duration: 6000,
        })

        // Clear form
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      const errorMsg = 'An unexpected error occurred'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden p-4">
      {/* Dynamic background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-400/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 transition-all duration-700 ease-in-out">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-[0_0_40px_rgba(37,99,235,0.3)] group hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-10 w-10 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
            Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-300">Briefly</span>
          </h1>
          <p className="text-slate-400 text-lg">Your Personal AI Deal Flow Engine</p>
        </div>

        <Card className="bg-slate-900/50 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-yellow-500" />
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-2xl text-white font-bold">Create account</CardTitle>
            <CardDescription className="text-slate-400">
              Get started with Briefly and supercharge your deal flow analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {/* Analysis Notice */}
            <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
              <Mail className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <p className="font-semibold text-white mb-1">Briefly Note:</p>
                The email you use for signup will be the <span className="text-blue-400 font-bold underline decoration-blue-500/30">primary inbox</span> our AI analyzes for your deal flow.
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <Button
                onClick={handleGoogleSignup}
                variant="outline"
                className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 group"
              >
                <Chrome className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Continue with Google</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#020617] px-4 text-slate-500 font-medium">Or continue with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-blue-400" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-800/50 border-white/10 text-white h-12 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-blue-400" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-800/50 border-white/10 text-white h-12 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-blue-400" />
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-800/50 border-white/10 text-white h-12 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-start animate-in fade-in slide-in-from-top-2">
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-300 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Initializing Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 mt-8 font-medium">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline decoration-blue-400/30">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}


