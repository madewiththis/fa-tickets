"use client"
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api/client'

type TypeItem = { id: number; name: string; price_baht?: number | null }

export default function InviteClient({ eventId, initialTypes }: { eventId: number; initialTypes: TypeItem[] }) {
  const search = useSearchParams()
  const [types, setTypes] = useState<TypeItem[]>(initialTypes || [])
  const [ticketTypeId, setTicketTypeId] = useState<number | ''>('' as any)
  const [paymentStatus, setPaymentStatus] = useState<'unpaid'|'paid'|'waived'>('unpaid')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [previewCode, setPreviewCode] = useState<string | null>(null)

  // Preselect ticket type from ?ticket_type_id
  useEffect(() => {
    const tid = search?.get('ticket_type_id')
    if (tid) setTicketTypeId(Number(tid))
  }, [search])

  async function onPreview() {
    setPreviewing(true)
    setPreviewCode(null)
    try {
      const p = await api.assignPreview(eventId)
      setPreviewCode(p?.short_code || null)
    } catch {
      setPreviewCode(null)
    } finally { setPreviewing(false) }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Invite</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ticket type</div>
          <select
            value={ticketTypeId ? String(ticketTypeId) : ''}
            onChange={(e)=> setTicketTypeId(e.target.value ? Number(e.target.value) : ('' as any))}
            className="w-full px-3 py-3 border rounded text-base bg-white dark:bg-gray-900"
          >
            <option value="">Optional</option>
            {types.map(t => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment status</div>
          <select
            value={paymentStatus}
            onChange={(e)=> setPaymentStatus(e.target.value as any)}
            className="w-full px-3 py-3 border rounded text-base bg-white dark:bg-gray-900"
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        </div>

        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">First name</div>
          <input value={firstName} onChange={(e)=> setFirstName(e.target.value)} className="w-full px-3 py-3 border rounded text-base bg-white dark:bg-gray-900" />
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last name</div>
          <input value={lastName} onChange={(e)=> setLastName(e.target.value)} className="w-full px-3 py-3 border rounded text-base bg-white dark:bg-gray-900" />
        </div>

        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</div>
          <input value={email} onChange={(e)=> setEmail(e.target.value)} className="w-full px-3 py-3 border rounded text-base bg-white dark:bg-gray-900" />
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</div>
          <input value={phone} onChange={(e)=> setPhone(e.target.value)} className="w-full px-3 py-3 border rounded text-base bg-white dark:bg-gray-900" />
        </div>
      </div>

      <div>
        <button onClick={onPreview} disabled={previewing} className="w-full px-3 py-3 border rounded text-base bg-indigo-500 text-white disabled:opacity-60">{previewing ? 'Generating…' : 'Preview Ticket'}</button>
      </div>

      {previewCode && (
        <div className="border rounded p-3 text-sm">
          Preview code: <code>{previewCode}</code> — use Check-in to test.
        </div>
      )}
    </section>
  )
}

