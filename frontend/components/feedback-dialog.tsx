'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { sendFeedback } from '@/utils/api'
import toast from 'react-hot-toast'
import { MessageSquare, Send } from 'lucide-react'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'feedback' | 'complaint'>('feedback')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          category: type === 'feedback' ? 'General' : 'Bug', // Mapping type to category
          email: user?.email || '',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send feedback')
      }

      toast.success('Thank you for your feedback!')
      setSubject('')
      setMessage('')
      setType('feedback')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Feedback Error:', error)
      toast.error(error.message || 'Failed to send feedback')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setSubject('')
      setMessage('')
      setType('feedback')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Briefly! Send feedback, suggestions, or report issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value: 'feedback' | 'complaint') => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">Feedback / Suggestion</SelectItem>
                <SelectItem value="complaint">Bug Report / Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">
              {message.length}/1000 characters
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {type === 'feedback' ? 'Feedback' : 'Report'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}