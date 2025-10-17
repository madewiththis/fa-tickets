import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { ThemeProvider } from '@/components/providers/theme'
import { Toaster } from '@/components/ui/toaster'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
