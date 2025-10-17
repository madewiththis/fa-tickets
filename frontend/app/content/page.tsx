import { api } from '@/lib/api/client'
import ContentClient from './ContentClient'

export default async function ContentPage() {
  let events: any[] = []
  try { events = await api.listEvents(100, 0) } catch {}
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Content Management</h2>
      <ContentClient events={events} />
    </section>
  )
}

