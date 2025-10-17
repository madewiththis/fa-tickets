import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', isDark)
}

export function ThemeProvider({ children, defaultTheme = 'system' }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') as Theme | null) || defaultTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onMedia = () => {
      const current = (localStorage.getItem('theme') as Theme | null) || defaultTheme
      applyTheme(current)
    }
    media.addEventListener?.('change', onMedia)
    return () => media.removeEventListener?.('change', onMedia)
  }, [defaultTheme])

  const value = useMemo<ThemeContextValue>((): ThemeContextValue => ({ theme, setTheme: (t) => setThemeState(t) }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
