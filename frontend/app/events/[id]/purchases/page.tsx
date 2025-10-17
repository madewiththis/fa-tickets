import PurchasesClient from './PurchasesClient'
import { api } from '@/lib/api/client'

export default async function EventPurchases({ params, searchParams }: { params: { id: string }; searchParams?: { q?: string; id?: string } }) {
  const eventId = Number(params.id)
  if (!Number.isFinite(eventId)) return <div className="text-sm text-red-600">Invalid event id.</div>
  let rows: any[] = []
  try { rows = await api.listEventPurchases(eventId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load purchases: {e?.message || 'Unknown error'}</div> }
  const initialQ = (searchParams?.q || '').trim()
  const initialId = searchParams?.id ? Number(searchParams.id) : undefined
  return <PurchasesClient rows={rows} eventId={eventId} initialQ={initialQ} initialId={initialId} />
}
