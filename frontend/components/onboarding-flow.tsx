'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Sparkles, User, Target, AlertTriangle, MessageSquare } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'

interface OnboardingData {
  role: string
  currentFocus: string[]
  criticalCategories: string[]
  communicationStyle: string
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void
  initialData?: Partial<OnboardingData>
}

const ROLE_OPTIONS = [
  { value: 'Founder', label: 'Founder', description: 'Building and growing a business' },
  { value: 'Agency Owner', label: 'Agency Owner', description: 'Running a specialized service business' },
  { value: 'Investor', label: 'Investor', description: 'Investing in companies or assets' },
  { value: 'Operator / Executive', label: 'Operator / Executive', description: 'Leading operations or teams' },
  { value: 'Other', label: 'Other', description: 'Not listed above' }
]

const FOCUS_OPTIONS = [
  'Fundraising', 'Client delivery', 'Sales & partnerships', 'Hiring', 'Deal sourcing', 'Operations / finance'
]

const CRITICAL_OPTIONS = [
  'Investor or partner intros', 'Client issues or renewals', 'Legal / finance', 'Deadlines & decisions', 'Internal team issues'
]

const STYLE_OPTIONS = [
  { value: 'Short & direct', label: 'Short & direct' },
  { value: 'Polite & professional', label: 'Polite & professional' },
  { value: 'Warm & conversational', label: 'Warm & conversational' },
  { value: 'Formal', label: 'Formal' }
]

export function OnboardingFlow({ onComplete, initialData = {} }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    role: initialData.role || '',
    currentFocus: initialData.currentFocus || [],
    criticalCategories: initialData.criticalCategories || [],
    communicationStyle: initialData.communicationStyle || ''
  })
  const [saving, setSaving] = useState(false)

  const steps = [
    { id: 'role', title: 'Your Role', description: 'What best describes you?', icon: User },
    { id: 'focus', title: 'Current Focus', description: 'What matters most to you right now?', icon: Target },
    { id: 'critical', title: 'Must Not Miss', description: 'What emails can\'t you afford to miss?', icon: AlertTriangle },
    { id: 'style', title: 'Communication Style', description: 'How do you prefer to reply?', icon: MessageSquare }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('User not found')
        return
      }

      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          role: data.role,
          current_focus: data.currentFocus,
          critical_categories: data.criticalCategories,
          communication_style: data.communicationStyle,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })

      toast.success('Onboarding completed!')
      onComplete(data)
    } catch (error: any) {
      console.error('Error saving onboarding:', error)
      toast.error('Failed to save onboarding data')
    } finally {
      setSaving(false)
    }
  }

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.role !== ''
      case 1: return data.currentFocus.length > 0
      case 2: return data.criticalCategories.length > 0
      case 3: return data.communicationStyle !== ''
      default: return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Role
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-center">Select the option that best describes your role</p>
            <div className="grid grid-cols-1 gap-3">
              {ROLE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={data.role === option.value ? 'default' : 'outline'}
                  onClick={() => updateData('role', option.value)}
                  className="h-auto p-4 text-left justify-start"
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )

      case 1: // Current Focus
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-center">Select all that apply to your current priorities</p>
            <div className="grid grid-cols-1 gap-3">
              {FOCUS_OPTIONS.map((option) => {
                const isSelected = data.currentFocus.includes(option)
                return (
                  <Button
                    key={option}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => {
                      const newFocus = isSelected
                        ? data.currentFocus.filter(f => f !== option)
                        : [...data.currentFocus, option]
                      updateData('currentFocus', newFocus)
                    }}
                    className="h-auto p-4 text-left justify-start"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      {option}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )

      case 2: // Critical Categories
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-center">Select email types you absolutely cannot miss</p>
            <div className="grid grid-cols-1 gap-3">
              {CRITICAL_OPTIONS.map((option) => {
                const isSelected = data.criticalCategories.includes(option)
                return (
                  <Button
                    key={option}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => {
                      const newCategories = isSelected
                        ? data.criticalCategories.filter(c => c !== option)
                        : [...data.criticalCategories, option]
                      updateData('criticalCategories', newCategories)
                    }}
                    className="h-auto p-4 text-left justify-start"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      {option}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )

      case 3: // Communication Style
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-center">How do you prefer AI-generated replies to sound?</p>
            <div className="grid grid-cols-1 gap-3">
              {STYLE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={data.communicationStyle === option.value ? 'default' : 'outline'}
                  onClick={() => updateData('communicationStyle', option.value)}
                  className="h-auto p-4 text-left justify-start"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="max-w-2xl mx-auto border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-yellow-500" />
          Welcome to Briefly AI
        </CardTitle>
        <CardDescription className="text-lg">
          Let's set up your email intelligence system
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${index <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                  <Icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${index < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] flex flex-col">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-center mb-2">
              {steps[currentStep].title}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {steps[currentStep].description}
            </p>
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || saving}
                className="bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600"
              >
                {saving ? 'Saving...' : 'Complete Setup'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
