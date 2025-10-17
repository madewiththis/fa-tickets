import './globals.css'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/providers/theme'
import { LayoutFrame } from '@/components/layout/LayoutFrame'

export const metadata = {
  title: 'FlowEvents',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LayoutFrame>
            {children}
          </LayoutFrame>
        </ThemeProvider>
      </body>
    </html>
  )}
