import { api } from '@/lib/api/client'
import EventDetailsClient from './EventDetailsClient'

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>
  let event: any = null
  try { event = await api.getEvent(eventId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load event: {e?.message || 'Unknown error'}</div> }
  return <EventDetailsClient event={event} />
}

