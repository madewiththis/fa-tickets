import { api } from '@/lib/api/client'

export default async function ContactOverview({ params }: { params: { id: string } }) {
  const contactId = Number(params.id)
  if (!Number.isFinite(contactId)) return <div className="text-sm text-red-600">Invalid contact id.</div>

  let contact: any = null
  try { contact = await api.getContact(contactId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load contact: {e?.message || 'Unknown error'}</div> }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <a href={`/attendees/${contactId}/purchases`} className="block">
        <div className="border rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <div className="text-sm font-medium mb-2">Purchases</div>
          <ul className="text-sm space-y-1">
            {(contact.buyer?.events || []).map((ev:any) => (
              <li key={ev.event_id} className="flex items-center justify-between">
                <span>{ev.title || `Event #${ev.event_id}`} ({ev.tickets} tickets)</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">View purchases →</span>
              </li>
            ))}
            {(!contact.buyer?.events || contact.buyer.events.length === 0) && <li className="text-gray-500">No purchases</li>}
          </ul>
        </div>
      </a>
      <a href={`/attendees/${contactId}/tickets`} className="block">
        <div className="border rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          <div className="text-sm font-medium mb-2">Tickets (as attendee)</div>
          <div className="text-sm">Tickets held: {contact.holder?.tickets_count || 0}</div>
        </div>
      </a>
    </div>
  )
}

