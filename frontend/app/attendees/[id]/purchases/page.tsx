import { api } from '@/lib/api/client'
import { formatAmount } from '@/lib/format'

function statusOf(p:any): 'paid'|'unpaid'|'waived'|'mixed' {
  const paid = p.paid_count || 0
  const unpaid = p.unpaid_count || 0
  const waived = p.waived_count || 0
  if (paid>0 && unpaid===0 && waived===0) return 'paid'
  if (paid===0 && unpaid>0 && waived===0) return 'unpaid'
  if (paid===0 && unpaid===0 && waived>0) return 'waived'
  return 'mixed'
}

export default async function ContactPurchases({ params }: { params: { id: string } }) {
  const contactId = Number(params.id)
  if (!Number.isFinite(contactId)) return <div className="text-sm text-red-600">Invalid contact id.</div>
  let rows: any[] = []
  try { rows = await api.listContactPurchases(contactId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load purchases: {e?.message || 'Unknown error'}</div> }

  return (
    <div className="border rounded">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Purchase ID</th>
            <th className="p-2">Tickets</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Payment Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p:any) => {
            const amountNumber = (p.total_amount != null ? p.total_amount : (p.sum_price != null ? p.sum_price : 0))
            const amount = formatAmount(amountNumber, p.currency || 'THB')
            return (
              <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="p-2">{p.id}</td>
                <td className="p-2">{p.tickets || 0}</td>
                <td className="p-2">{amount}</td>
                <td className="p-2 capitalize">{statusOf(p)}</td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td className="p-4 text-gray-500" colSpan={4}>No purchases</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

