import { redirect } from 'next/navigation'

export default function ContactIdRedirect({ params }: { params: { id: string } }) {
  redirect(`/attendees/${params.id}/overview`)
}

