import { redirect } from 'next/navigation'

export default function EventIdRedirect({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}/details`)
}
