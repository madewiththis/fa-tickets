import { api } from '@/lib/api/client'
import TicketTypesClient from './types/TicketTypesClient'

export default async function TicketTypesPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>
  let types: any[] = []
  try { types = await api.listTicketTypes(eventId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load ticket types: {e?.message || 'Unknown error'}</div> }
  return <TicketTypesClient eventId={eventId} initialTypes={types} />
}
