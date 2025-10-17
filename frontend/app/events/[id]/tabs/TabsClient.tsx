"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TabsNav({ eventId }: { eventId: number }) {
  const pathname = usePathname()
  const mk = (key: string, href: string, label: string) => {
    const active = pathname.endsWith('/' + key) || (key === 'details' && (pathname === `/events/${eventId}` || pathname.endsWith(`/events/${eventId}/details`)))
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
      {mk('details', `/events/${eventId}/details`, 'Details')}
      {mk('overview', `/events/${eventId}/overview`, 'Overview')}
      {mk('attendees', `/events/${eventId}/attendees`, 'Attendees')}
      {mk('purchases', `/events/${eventId}/purchases`, 'Purchases')}
      {mk('ticket-types', `/events/${eventId}/ticket-types`, 'Tickets')}
      {mk('promote', `/events/${eventId}/promote`, 'Promote')}
      {mk('invite', `/events/${eventId}/invite`, 'Invite')}
    </div>
  )
}
