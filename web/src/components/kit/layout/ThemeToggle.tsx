"use client"
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const title = 'Toggle theme'
  function onClick() {
    const current = resolvedTheme === 'dark' ? 'dark' : 'light'
    setTheme(current === 'dark' ? 'light' : 'dark')
  }
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className="px-2 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      Theme
    </button>
  )
}
