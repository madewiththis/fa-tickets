// Next-compatible API client. Uses NEXT_PUBLIC_* envs and same-origin '/api' proxy.

const API_BASE_CLIENT = process.env.NEXT_PUBLIC_API_BASE || '/api'
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN
const API_BASE_SSR = process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

function getBase() {
  if (typeof window === 'undefined') return API_BASE_SSR
  return API_BASE_CLIENT
}

export async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as any || {}),
  }
  if (API_TOKEN) headers['X-Auth-Token'] = API_TOKEN

  const base = getBase()
  const res = await fetch(`${base}${path}`, {
    headers,
    ...options,
    // Revalidate per request as needed later; default no cache for now
    cache: 'no-store',
  })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.detail) msg = Array.isArray(data.detail) ? data.detail.map((d:any)=>d.msg||d).join(', ') : data.detail
    } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export const api = {
  listEvents: (limit = 50, offset = 0) => request(`/events?limit=${limit}&offset=${offset}`),
  resolveEvent: (public_id: string) => request(`/events/public/${encodeURIComponent(public_id)}`),
  getEvent: (id: number) => request(`/events/${id}`),
  createEvent: (body: any) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (id: number, body: any) => request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listTickets: (event_id: number, status?: string) => request(`/events/${event_id}/tickets${status ? `?status=${status}` : ''}`),
  listTicketTypes: (id: number) => request(`/events/${id}/ticket_types`),
  createTicketType: (id: number, body: any) => request(`/events/${id}/ticket_types`, { method: 'POST', body: JSON.stringify(body) }),
  updateTicketType: (ticket_type_id: number, body: any) => request(`/events/ticket_types/${ticket_type_id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  reconciliation: (event_id: number) => request(`/reports/reconciliation?event_id=${event_id}`),
  listEventPurchases: (event_id: number) => request(`/events/${event_id}/purchases`),
  listAttendees: (event_id: number) => request(`/events/${event_id}/attendees`),
  getPurchase: (purchase_id: number) => request(`/purchases/${purchase_id}`),
  getPurchaseByGuid: (guid: string) => request(`/purchases/by-guid/${encodeURIComponent(guid)}`),
  payPurchase: (purchase_id: number) => request(`/purchases/${purchase_id}/pay`, { method: 'POST' }),
  resendPurchasePayment: (purchase_id: number) => request(`/purchases/${purchase_id}/resend_payment`, { method: 'POST' }),
  assignPreview: (event_id: number) => request('/assign/preview', { method: 'POST', body: JSON.stringify({ event_id }) }),
  listContacts: (opts?: { search?: string; roles?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams()
    if (opts?.search) p.set('search', opts.search)
    if (opts?.roles) p.set('roles', opts.roles)
    if (opts?.limit != null) p.set('limit', String(opts.limit))
    if (opts?.offset != null) p.set('offset', String(opts.offset))
    const qs = p.toString() ? `?${p.toString()}` : ''
    return request(`/contacts${qs}`)
  },
  getContact: (id: number) => request(`/contacts/${id}`),
  listContactPurchases: (id: number, event_id?: number) => request(`/contacts/${id}/purchases${event_id ? `?event_id=${event_id}` : ''}`),
  listHolderTickets: (id: number) => request(`/contacts/${id}/holder_tickets`),
  ticketByCode: (code: string) => request(`/tickets/by-code/${encodeURIComponent(code)}`),
  ticketByToken: (token: string) => request(`/tickets/by-token/${encodeURIComponent(token)}`),
  payByToken: (token: string) => request('/tickets/pay', { method: 'POST', body: JSON.stringify({ token }) }),
  lookupTicket: (code: string, event_id?: number) => request(`/tickets/lookup?code=${encodeURIComponent(code)}${event_id ? `&event_id=${event_id}` : ''}`),
  checkin: (event_id: number, code: string) => request('/checkin', { method: 'POST', body: JSON.stringify({ event_id, code }) }),
  listEmailLogs: (limit = 50, offset = 0) => request(`/admin/email_logs?limit=${limit}&offset=${offset}`),
  sendTestEmail: (to: string) => request(`/test_email?to=${encodeURIComponent(to)}`, { method: 'POST' }),
  qrUrl: (data: string, scale = 5) => `${(typeof window === 'undefined' ? API_BASE_SSR : API_BASE_CLIENT)}/qr?data=${encodeURIComponent(data)}&scale=${scale}`,
  getEventPromotion: (id: number) => request(`/events/${id}/promotion`),
  saveEventPromotion: (id: number, body: any) => request(`/events/${id}/promotion`, { method: 'PUT', body: JSON.stringify(body) }),
}
