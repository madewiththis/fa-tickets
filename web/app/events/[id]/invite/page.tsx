import { api } from '@/lib/api/client'
import InviteClient from './InviteClient'

export default async function InvitePage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>
  let types: any[] = []
  try { types = await api.listTicketTypes(eventId) } catch {}
  return <InviteClient eventId={eventId} initialTypes={types} />
}
