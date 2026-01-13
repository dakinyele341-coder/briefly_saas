'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, ArrowRight } from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
}

interface OnboardingFlowProps {
  steps: OnboardingStep[]
  currentStep: number
  onStepComplete: (stepId: string) => void
}

export function OnboardingFlow({ steps, currentStep, onStepComplete }: OnboardingFlowProps) {
  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          Getting Started
        </CardTitle>
        <CardDescription>
          Complete these steps to unlock the full power of Briefly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                step.completed
                  ? 'bg-green-50 border border-green-200'
                  : index === currentStep
                  ? 'bg-blue-50 border-2 border-blue-300'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              {step.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${
                  step.completed ? 'text-green-900' : index === currentStep ? 'text-blue-900' : 'text-gray-700'
                }`}>
                  {step.title}
                </h4>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
              {index === currentStep && !step.completed && (
                <ArrowRight className="h-4 w-4 text-blue-600" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

