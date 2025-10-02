import Link from 'next/link'
import { api } from '@/lib/api/client'
import { formatDateDDMMYY } from '@/lib/format'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  let events: any[] = []
  try {
    events = await api.listEvents(200, 0)
  } catch (e: any) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Events</h2>
        <p className="text-sm text-red-600">Failed to load events: {e?.message || 'Unknown error'}</p>
      </section>
    )
  }

  // Fetch reconciliation + ticket type info in parallel to compute stats
  const reconAll = await Promise.allSettled(events.map((ev: any) => api.reconciliation(ev.id)))
  const typesAll = await Promise.allSettled(events.map((ev: any) => api.listTicketTypes(ev.id)))

  const statsById = new Map<number, any>()
  events.forEach((ev: any, idx: number) => {
    const r = reconAll[idx]
    if (r.status === 'fulfilled') statsById.set(ev.id, r.value)
  })
  const rows = events.map((ev: any) => {
    const s = statsById.get(ev.id) || {}
    return {
      id: ev.id,
      title: ev.title,
      starts_at: ev.starts_at || null,
      ends_at: ev.ends_at || null,
      location: ev.location || null,
      stats: {
        tickets_total: s.tickets_total ?? null,
        paid_count: s.paid_count ?? null,
        revenue_baht: s.revenue_baht ?? null,
      },
    }
  })

  return <EventsClient rows={rows} />
}
