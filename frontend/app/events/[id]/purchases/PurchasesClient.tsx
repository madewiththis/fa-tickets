"use client"
import { useEffect, useMemo, useState } from 'react'
import { formatAmount } from '@/lib/format'
import { api } from '@/lib/api/client'

type Row = any

function derivePaymentStatus(p: any): 'paid' | 'unpaid' | 'waived' | 'mixed' {
  const paid = p.paid_count || 0
  const unpaid = p.unpaid_count || 0
  const waived = p.waived_count || 0
  if (paid > 0 && unpaid === 0 && waived === 0) return 'paid'
  if (paid === 0 && unpaid > 0 && waived === 0) return 'unpaid'
  if (paid === 0 && unpaid === 0 && waived > 0) return 'waived'
  return 'mixed'
}

export default function PurchasesClient({ rows, eventId, initialQ = '', initialId }: { rows: Row[]; eventId: number; initialQ?: string; initialId?: number }) {
  const [q, setQ] = useState(initialQ)
  const [payment, setPayment] = useState<'all'|'paid'|'unpaid'|'waived'|'mixed'>('all')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [done, setDone] = useState<Record<number, boolean>>({})
  const [detail, setDetail] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    return rows.filter((r:any) => {
      if (payment !== 'all') {
        if (derivePaymentStatus(r) !== payment) return false
      }
      if (!text) return true
      const buyer = r.buyer || {}
      const fields = [r.id, r.external_payment_ref, r.currency, buyer.email, buyer.first_name, buyer.last_name]
      return fields.some((v:any) => String(v||'').toLowerCase().includes(text))
    })
  }, [rows, q, payment])

  async function onResendPayment(purchaseId: number) {
    try {
      setBusyId(purchaseId)
      await api.resendPurchasePayment(purchaseId)
      setDone(d => ({ ...d, [purchaseId]: true }))
    } catch (e: any) {
      alert(e?.message || 'Failed to resend payment link')
    } finally {
      setBusyId(null)
    }
  }

  async function openDetail(p: any) {
    setDetail(p)
    try {
      setLoadingDetail(true)
      const full = await api.getPurchase(p.id)
      setDetail(full)
    } catch (e: any) {
      // keep the partial purchase in view
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() {
    setDetail(null)
  }

  useEffect(() => {
    if (initialId && !detail) {
      const found = rows.find((r:any) => r.id === initialId) || { id: initialId }
      openDetail(found)
    }
    // only on mount or when initialId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId])

  function totalOf(p: any) {
    if (typeof p.total_amount === 'number') return p.total_amount
    if (typeof p.sum_price === 'number') return p.sum_price
    const tix = p.tickets || []
    return tix.reduce((s: number, t: any) => s + (t.price_baht || 0), 0)
  }

  if (detail) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={closeDetail} className="px-2 py-1 border rounded text-sm">Back</button>
          <div className="text-base font-semibold">Purchases</div>
        </div>
        <PurchaseDetail
          purchase={detail}
          loading={loadingDetail}
          onClose={closeDetail}
          onResend={()=> onResendPayment(detail.id)}
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Search</div>
          <input
            value={q}
            onChange={(e)=> setQ(e.target.value)}
            placeholder="Purchase id, ref, buyer…"
            className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900"
          />
        </div>
        <div className="w-48">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment status</div>
          <select value={payment} onChange={(e)=> setPayment(e.target.value as any)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900">
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Tickets</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p:any) => {
              const buyer = p.buyer || {}
              const buyerName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || '—'
              const buyerEmail = buyer.email || '—'
              const status = derivePaymentStatus(p)
              const amountNumber = (p.total_amount != null ? p.total_amount : (p.sum_price != null ? p.sum_price : 0))
              const amount = formatAmount(amountNumber, p.currency || 'THB')
              const ticketsCount = (p.paid_count || 0) + (p.unpaid_count || 0) + (p.waived_count || 0)
              return (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer" onClick={()=> openDetail(p)}>
                  <td className="p-2">{buyerName}</td>
                  <td className="p-2">{buyerEmail}</td>
                  <td className="p-2">{ticketsCount}</td>
                  <td className="p-2">{amount}</td>
                  <td className="p-2 capitalize">{status}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={5}>No purchases found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PurchaseDetail({ purchase, loading, onClose, onResend }: { purchase: any; loading?: boolean; onClose: ()=>void; onResend: ()=>void }) {
  const buyer = purchase?.buyer || {}
  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || '—'
  const email = buyer.email || '—'
  const phone = buyer.phone || buyer.phone_number || '—'
  const ref = purchase?.external_payment_ref || '—'
  const created = purchase?.created_at ? new Date(purchase.created_at).toLocaleString() : '—'
  const currency = purchase?.currency || 'THB'
  const total = formatAmount((purchase ? (typeof purchase.total_amount === 'number' ? purchase.total_amount : (typeof purchase.sum_price === 'number' ? purchase.sum_price : 0)) : 0), currency)
  const tickets: any[] = Array.isArray(purchase?.tickets) ? purchase.tickets : []

  return (
    <div className="border rounded p-3 sm:p-4 bg-white dark:bg-black">
      <div className="flex items-start">
        <div className="text-base font-semibold">Purchase #{purchase?.id ?? ''}</div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
        <div className="grid gap-1">
          <div><span className="text-gray-600 dark:text-gray-400">Payment Ref:</span> {ref}</div>
          <div><span className="text-gray-600 dark:text-gray-400">Buyer:</span> {name}</div>
        </div>
        <div className="grid gap-1">
          <div><span className="text-gray-600 dark:text-gray-400">Amount:</span> {total}</div>
          <div><span className="text-gray-600 dark:text-gray-400">Email:</span> {email}</div>
        </div>
        <div className="grid gap-1">
          <div><span className="text-gray-600 dark:text-gray-400">Created:</span> {created}</div>
          <div><span className="text-gray-600 dark:text-gray-400">Phone:</span> {phone}</div>
        </div>
      </div>

      <div className="border rounded mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Code</th>
              <th className="p-2">Date</th>
              <th className="p-2">Ticket Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Payment</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t:any) => (
              <tr key={t.id} className="border-b last:border-b-0">
                <td className="p-2">{t.short_code || t.code || '—'}</td>
                <td className="p-2 text-xs text-gray-600 dark:text-gray-400">{t.event_starts_at ? new Date(t.event_starts_at).toLocaleString() : '—'}</td>
                <td className="p-2">{t.type_name || t.type_id || '—'}</td>
                <td className="p-2 capitalize">{String(t.status || '—').replaceAll('_', ' ')}</td>
                <td className="p-2 capitalize">{t.payment_status || '—'}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={5}>{loading ? 'Loading…' : 'No tickets'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={onResend} className="px-3 py-2 border rounded text-sm">Resend Payment Link</button>
      </div>
    </div>
  )
}
