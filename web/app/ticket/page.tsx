import { api } from '@/lib/api/client'

export default async function TicketView({ searchParams }: { searchParams: { ref?: string; token?: string; code?: string } }) {
  const token = (searchParams?.ref || searchParams?.token || '').trim()
  const code = (searchParams?.code || '').trim()

  let data: any = null
  try {
    if (token) data = await api.ticketByToken(token)
    else if (code) data = await api.ticketByCode(code)
  } catch (e: any) {
    return <div className="text-sm text-red-600">Failed to load ticket: {e?.message || 'Unknown error'}</div>
  }
  if (!data) return <div className="text-sm">No ticket specified.</div>

  const qrData = token || code || ''
  const qrSrc = api.qrUrl(qrData)

  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Ticket</h2>
      </div>
      <div className="border rounded p-4 sm:p-5">
        <div className="text-sm grid gap-2">
          <div className="flex justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Event</span>
            <span className="text-right font-medium truncate max-w-[70%]">{data.event_title || data.event_id}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Holder</span>
            <span className="text-right font-medium truncate max-w-[70%]">{[data.holder_first_name, data.holder_last_name].filter(Boolean).join(' ') || data.holder_email || '—'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Code</span>
            <span className="text-right font-medium">{data.short_code || '—'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-600 dark:text-gray-400">Status</span>
            <span className="text-right font-medium capitalize">{String(data.status || '—').replaceAll('_',' ')}</span>
          </div>
        </div>
        <div className="mt-5 flex justify-center">
          <img src={qrSrc} alt="QR" className="w-64 h-64 sm:w-72 sm:h-72" />
        </div>
      </div>
    </section>
  )
}
