import { api } from '@/lib/api/client'
import AttendeesClient from './AttendeesClient'

export default async function EventAttendees({ params }: { params: { id: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>
  let rows: any[] = []
  try { rows = await api.listAttendees(eventId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load attendees: {e?.message || 'Unknown error'}</div> }

  return <AttendeesClient rows={rows} eventId={eventId} />
}
