import PayPurchaseClient from './PayPurchaseClient'
import PayTokenClient from './PayTokenClient'
import { api } from '@/lib/api/client'

export default async function PayPage({ searchParams }: { searchParams: { purchase?: string; token?: string } }) {
  const guid = (searchParams?.purchase || '').trim()
  const token = (searchParams?.token || '').trim()

  if (guid) {
    let purchase: any = null
    try { purchase = await api.getPurchaseByGuid(guid) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load purchase: {e?.message || 'Unknown error'}</div> }
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Purchase Payment</h2>
        <PayPurchaseClient purchase={purchase} />
      </section>
    )
  }

  if (token) {
    let ticket: any = null
    try { ticket = await api.ticketByToken(token) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load ticket: {e?.message || 'Unknown error'}</div> }
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Ticket Payment</h2>
        <PayTokenClient token={token} ticket={ticket} />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Payment</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400">Provide a purchase GUID (?purchase=GUID) or ticket token (?token=TOKEN).</div>
    </section>
  )
}

