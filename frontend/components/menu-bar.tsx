'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Home,
  Settings,
  History,
  CreditCard,
  MessageSquare,
  BarChart3,
  Menu,
  X,
  Mail
} from 'lucide-react'

interface MenuBarProps {
  unscannedCount?: number
  isAdmin?: boolean
}

const menuItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Your email dashboard'
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
    description: 'View processed emails'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configure your preferences'
  },
  {
    name: 'Subscription',
    href: '/subscription',
    icon: CreditCard,
    description: 'Manage your plan'
  },
  {
    name: 'Feedback',
    href: '/feedback',
    icon: MessageSquare,
    description: 'Send us feedback'
  }
]

const adminMenuItems = [
  {
    name: 'Admin',
    href: '/admin',
    icon: BarChart3,
    description: 'Admin dashboard'
  }
]

export function MenuBar({ unscannedCount = 0, isAdmin = false }: MenuBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const allMenuItems = [...menuItems, ...(isAdmin ? adminMenuItems : [])]

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* Menu bar */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">Briefly</h1>
                <p className="text-xs text-gray-500">AI Email Analyst</p>
              </div>
            </div>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 p-4 space-y-2">
            {allMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-12 px-4",
                    isActive && "bg-purple-100 text-purple-700 hover:bg-purple-200",
                    !isActive && "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => {
                    router.push(item.href)
                    setIsOpen(false) // Close mobile menu
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <span className="text-xs text-gray-500 truncate">{item.description}</span>
                  </div>
                  {item.name === 'Dashboard' && unscannedCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {unscannedCount}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>© 2025 Briefly</p>
              <p>AI-powered email analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  )
}
