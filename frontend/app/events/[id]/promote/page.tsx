import { api } from '@/lib/api/client'
import PromoteClient from './PromoteClient'

export default async function PromotePage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>
  let types: any[] = []
  try { types = await api.listTicketTypes(eventId) } catch {}
  return <PromoteClient eventId={eventId} initialTypes={types} />
}
