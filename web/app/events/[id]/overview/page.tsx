import { api } from '@/lib/api/client'

export default async function EventOverview({ params }: { params: { id: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>

  let stats: any = null
  let types: any[] = []
  try {
    const [recon, ticketTypes] = await Promise.all([
      api.reconciliation(eventId),
      api.listTicketTypes(eventId).catch(() => []),
    ])
    stats = recon
    types = ticketTypes || []
  } catch (e: any) {
    return <div className="text-sm text-red-600">Failed to load overview: {e?.message || 'Unknown error'}</div>
  }

  const plannedTotal = (() => {
    try {
      const sum = (types || []).filter((t: any) => t.active && t.max_quantity != null).reduce((s: number, t: any) => s + (Number(t.max_quantity) || 0), 0)
      return Number.isFinite(sum) ? sum : null
    } catch { return null }
  })()

  const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
    <div className="border rounded p-3">
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-lg font-medium">{value}</div>
      {hint && <div className="text-[11px] text-gray-500 mt-1">{hint}</div>}
    </div>
  )

  return (
    <div className="space-y-3">
      {!stats ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Tickets Created" value={plannedTotal ?? '—'} hint="Sum of max quantities for active ticket types" />
          <Stat label="Available" value={stats.available ?? '—'} hint="Not assigned" />
          <Stat label="Assigned" value={stats.assigned ?? '—'} hint="Assigned, not checked in yet" />
          <Stat label="Checked in" value={stats.checked_in ?? '—'} hint="Admitted attendees" />
          <Stat label="Delivered" value={stats.delivered ?? '—'} hint="Emails sent" />
          <Stat label="Registered" value={stats.registered ?? '—'} hint="Assigned + Checked in" />
          <Stat label="Paid" value={stats.paid_count ?? '—'} hint="Tickets marked paid" />
          <Stat label="Unpaid" value={stats.unpaid_count ?? '—'} hint="Awaiting payment" />
          <Stat label="Waived" value={stats.waived_count ?? '—'} hint="Complimentary" />
          <Stat label="Revenue (THB)" value={stats.revenue_baht ?? '—'} hint="Sum of paid ticket prices" />
        </div>
      )}
    </div>
  )
}
