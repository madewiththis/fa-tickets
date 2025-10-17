"use client"
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatAmount, formatDateDDMMYY } from '@/lib/format'

type Row = {
  id: number
  title: string
  starts_at?: string | null
  ends_at?: string | null
  location?: string | null
  stats: {
    tickets_total?: number | null
    paid_count?: number | null
    revenue_baht?: number | null
  }
}

function countdown(startIso?: string | null, endIso?: string | null) {
  if (!startIso) return ''
  const now = new Date()
  const start = new Date(startIso)
  const end = endIso ? new Date(endIso) : undefined
  if (end && now > end) {
    const diff = Math.max(0, Math.floor((now.getTime() - end.getTime()) / 1000))
    const d = Math.floor(diff / 86400)
    const h = Math.floor((diff % 86400) / 3600)
    return `Ended ${d > 0 ? d + 'd ' : ''}${h}h ago`
  }
  if (now >= start && (!end || now <= end)) return 'Live now'
  const diff = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000))
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  const m = Math.floor((diff % 3600) / 60)
  return `Starts in ${d > 0 ? d + 'd ' : ''}${h}h ${m}m`
}

export default function EventsClient({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [includePast, setIncludePast] = useState(false)

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    const now = new Date()
    return rows.filter((r) => {
      if (!includePast) {
        const end = r.ends_at ? new Date(r.ends_at) : undefined
        const start = r.starts_at ? new Date(r.starts_at) : undefined
        const future = (end ? end >= now : false) || (start ? start >= now : false)
        if (!future) return false
      }
      if (!text) return true
      return (
        r.title.toLowerCase().includes(text) ||
        (r.location || '').toLowerCase().includes(text)
      )
    })
  }, [rows, q, includePast])

  return (
    <section className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Search</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Event name, location…"
            className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900"
          />
        </div>
        <button
          className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setIncludePast((v) => !v)}
        >
          {includePast ? 'Hide past events' : 'Show past events'}
        </button>
        <Link href="/events/new" className="ml-auto px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">New Event</Link>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Event Name</th>
              <th className="p-2">Starting In</th>
              <th className="p-2">Dates</th>
              <th className="p-2">Tickets</th>
              <th className="p-2">Paid</th>
              <th className="p-2">Location</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                onClick={() => router.push(`/events/${r.id}/overview`)}
              >
                <td className="p-2">{r.title}</td>
                <td className="p-2 text-gray-600 text-xs">{countdown(r.starts_at, r.ends_at)}</td>
                <td className="p-2 text-gray-600 text-xs">
                  {formatDateDDMMYY(r.starts_at || undefined)}
                  {r.ends_at ? ` • ${formatDateDDMMYY(r.ends_at)}` : ''}
                </td>
                <td className="p-2 text-gray-600 text-xs">{r.stats.tickets_total ?? '—'}</td>
                <td className="p-2 text-gray-600 text-xs">
                  {r.stats.paid_count ?? '—'}
                  {r.stats.revenue_baht ? ` (${formatAmount(r.stats.revenue_baht, 'THB')})` : ''}
                </td>
                <td className="p-2 text-gray-600 text-xs">{r.location || '—'}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2" onClick={(e)=> e.stopPropagation()}>
                    <Link href={`/events/${r.id}/promote`} className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">Promote</Link>
                    <Link href={`/events/${r.id}/invite`} className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">Invite</Link>
                    <Link href={`/events/${r.id}/attendees`} className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">Attendees</Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>No events found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
