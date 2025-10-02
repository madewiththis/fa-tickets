"use client"
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'

export function LayoutFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const bare = pathname === '/ticket' || pathname.startsWith('/ticket?') || pathname.startsWith('/ticket/')

  if (bare) {
    return (
      <div className="mx-auto p-4 sm:p-6 max-w-md">
        <div className="min-h-[60vh]">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <TopNav />
      <div className="min-h-[60vh]">
        {children}
      </div>
    </div>
  )
}

