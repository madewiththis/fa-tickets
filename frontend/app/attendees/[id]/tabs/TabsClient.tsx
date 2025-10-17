"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TabsNav({ contactId }: { contactId: number }) {
  const pathname = usePathname()
  const mk = (key: string, href: string, label: string) => {
    const active = pathname.endsWith('/' + key) || (key === 'overview' && pathname === `/attendees/${contactId}`)
    return (
      <Link
        key={key}
        href={href}
        className={`text-left block px-3 py-2 rounded border ${active ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
      >{label}</Link>
    )
  }
  return (
    <div className="grid gap-1">
      {mk('overview', `/attendees/${contactId}/overview`, 'Overview')}
      {mk('tickets', `/attendees/${contactId}/tickets`, 'Tickets')}
      {mk('purchases', `/attendees/${contactId}/purchases`, 'Purchases')}
    </div>
  )
}

