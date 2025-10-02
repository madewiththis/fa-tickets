"use client"
import { useState } from 'react'
import { api } from '@/lib/api/client'

export default function PayTokenClient({ token, ticket }: { token: string; ticket: any }) {
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function onPay() {
    try {
      setBusy(true); setError('')
      await api.payByToken(token)
      setSuccess(true)
    } catch (e: any) {
      setError(e?.message || 'Payment failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {!success ? (
        <>
          <div className="text-sm">Ticket: {ticket?.type_name || ticket?.type_id || '—'}</div>
          <button onClick={onPay} disabled={busy} className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{busy ? 'Paying…' : 'Pay now'}</button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </>
      ) : (
        <div className="p-4 border rounded text-sm">Payment successful. Ticket will arrive by email shortly.</div>
      )}
    </div>
  )
}

