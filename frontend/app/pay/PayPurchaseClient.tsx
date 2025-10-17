"use client"
import { useMemo, useState, useEffect } from 'react'
import { api } from '@/lib/api/client'
import { formatAmount } from '@/lib/format'

export default function PayPurchaseClient({ purchase }: { purchase: any }) {
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const items = useMemo(() => {
    const map = new Map<string, { name: string; price: number; qty: number; subtotal: number }>()
    for (const t of purchase.tickets || []) {
      const key = `${t.type_name || t.type_id}-${t.price_baht || 0}`
      const cur = map.get(key) || { name: t.type_name || `Type #${t.type_id}`, price: t.price_baht || 0, qty: 0, subtotal: 0 }
      cur.qty += 1
      cur.subtotal += cur.price
      map.set(key, cur)
    }
    return Array.from(map.values())
  }, [purchase])

  const total = useMemo(() => {
    if (typeof purchase.total_amount === 'number') return purchase.total_amount
    if (typeof purchase.sum_price === 'number') return purchase.sum_price
    return items.reduce((s, it) => s + it.subtotal, 0)
  }, [purchase, items])

  const currency = purchase.currency || 'THB'

  const expiresIn = useMemo(() => {
    const created = purchase.created_at ? new Date(purchase.created_at).getTime() : 0
    const end = created ? created + 24 * 3600 * 1000 : 0
    const diff = Math.max(0, Math.floor((end - now) / 1000))
    const d = Math.floor(diff / 86400)
    const h = Math.floor((diff % 86400) / 3600)
    const m = Math.floor((diff % 3600) / 60)
    return end ? `${d > 0 ? d + 'd ' : ''}${h}h ${m}m` : ''
  }, [purchase, now])

  async function onPay() {
    try {
      setBusy(true); setError('')
      await api.payPurchase(purchase.id)
      setSuccess(true)
    } catch (e: any) {
      setError(e?.message || 'Payment failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {!success ? (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400">Reservation expires in {expiresIn}</div>
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Item</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="p-2">{it.name}</td>
                    <td className="p-2">{it.qty}</td>
                    <td className="p-2">{formatAmount(it.price, currency)}</td>
                    <td className="p-2">{formatAmount(it.subtotal, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">Total: {formatAmount(total, currency)}</div>
            <button onClick={onPay} disabled={busy} className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{busy ? 'Paying…' : 'Pay now'}</button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </>
      ) : (
        <div className="p-4 border rounded text-sm">Payment successful. Tickets will arrive by email shortly.</div>
      )}
    </div>
  )
}

