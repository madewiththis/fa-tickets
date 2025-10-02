"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/kit/layout/ThemeToggle'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function TopNav() {
  const pathname = usePathname()
  const is = (p: string) => pathname === p || pathname.startsWith(p + '/')

  const linkClass = (active: boolean) => cx(
    'px-3 py-1 rounded border inline-flex items-center gap-1',
    active ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
  )

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">FlowEvents</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
      <nav className="mb-8 hidden sm:flex flex-wrap gap-2">
        <Link href="/events" className={linkClass(is('/events'))}>Events</Link>
        <Link href="/attendees" className={linkClass(is('/attendees'))}>Tickets</Link>
        <Link href="/content" className={linkClass(is('/content'))}>Content</Link>
        <Link href="/checkin" className={linkClass(is('/checkin'))}>Check in</Link>
        <Link href="/reports" className={linkClass(is('/reports'))}>Reports</Link>
        <Link href="/admin/email-logs" className={linkClass(is('/admin'))}>App Admin</Link>
      </nav>
    </div>
  )
}
