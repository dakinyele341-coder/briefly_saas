'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare, Heart, Bug, Lightbulb } from 'lucide-react'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { MenuBar } from '@/components/menu-bar'

export default function FeedbackPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
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
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  if (loading) {
    return (
      <>
        <MenuBar />
        <div className="lg:ml-64 flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <MenuBar />
      <div className="lg:ml-64 min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
              <MessageSquare className="h-10 w-10 text-blue-500" />
              Feedback & Support
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Help us make Briefly better! Your feedback drives our improvements.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow duration-200 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="text-center">
              <Heart className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-green-700">Love It</CardTitle>
              <CardDescription>Share what you enjoy about Briefly</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setDialogOpen(true)}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                Send Praise
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
            <CardHeader className="text-center">
              <Lightbulb className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <CardTitle className="text-yellow-700">Suggestions</CardTitle>
              <CardDescription>Ideas to improve your experience</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setDialogOpen(true)}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                Share Ideas
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200 border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardHeader className="text-center">
              <Bug className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-red-700">Report Issues</CardTitle>
              <CardDescription>Found a bug? Let us know</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setDialogOpen(true)}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Report Bug
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-blue-800">
              Why Your Feedback Matters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Your input helps us prioritize features that matter most to users like you</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Bug reports help us fix issues and improve reliability</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Suggestions drive our product roadmap and future updates</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">All feedback goes directly to our development team</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">We typically respond to detailed feedback within 24 hours</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Your privacy is protected - we never share personal information</p>
                </div>
              </div>
            </div>

            <div className="text-center pt-6">
              <Button
                onClick={() => setDialogOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Feedback Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
      </div>
    </>
  )
}