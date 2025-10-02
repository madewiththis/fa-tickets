import { api } from '@/lib/api/client'
import AttendeesClient from './AttendeesClient'

export default async function AttendeesPage() {
  let rows: any[] = []
  try { rows = await api.listContacts({ limit: 50, offset: 0 }) } catch {}
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Ticket Holders</h2>
      <AttendeesClient initialRows={rows} />
    </section>
  )
}
