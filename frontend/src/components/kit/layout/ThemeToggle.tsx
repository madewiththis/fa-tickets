import React from 'react'
import { useTheme, Theme } from '@/components/providers/theme'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: Theme = theme === 'light' ? 'dark' : 'light'
  const title = theme === 'dark' ? 'Switch to light' : 'Switch to dark'
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" title={title} aria-label={title} onClick={() => setTheme(next)}>
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  )
}

