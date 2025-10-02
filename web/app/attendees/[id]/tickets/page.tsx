import { api } from '@/lib/api/client'

export default async function ContactTickets({ params }: { params: { id: string } }) {
  const contactId = Number(params.id)
  if (!Number.isFinite(contactId)) return <div className="text-sm text-red-600">Invalid contact id.</div>
  let tickets: any[] = []
  try { tickets = await api.listHolderTickets(contactId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load tickets: {e?.message || 'Unknown error'}</div> }

  return (
    <div className="border rounded">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Event</th>
            <th className="p-2">Ticket Type</th>
            <th className="p-2">Event Date</th>
            <th className="p-2">Status</th>
            <th className="p-2">Payment</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t:any) => (
            <tr key={t.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className="p-2 whitespace-nowrap">{t.event_title || t.event_id}</td>
              <td className="p-2 whitespace-nowrap">{t.type_name || t.type_id || '—'}</td>
              <td className="p-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.event_starts_at ? new Date(t.event_starts_at).toLocaleDateString() : '—'}</td>
              <td className="p-2 capitalize whitespace-nowrap">{t.status?.replaceAll('_',' ') || '—'}</td>
              <td className="p-2 capitalize whitespace-nowrap">{t.payment_status || '—'}</td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td className="p-4 text-gray-500" colSpan={5}>No tickets</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

