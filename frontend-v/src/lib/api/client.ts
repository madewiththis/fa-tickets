// Prefer proxy-based same-origin requests via Vite dev server.
// If VITE_API_BASE is set, use it; otherwise use '/api' which Vite proxies to backend.
const API_BASE = (import.meta as any).env.DEV ? '/api' : (import.meta as any).env.VITE_API_BASE || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN as string | undefined;

// Debug logging for environment variables
console.log('🔍 Environment Debug:', {
  DEV: (import.meta as any).env.DEV,
  VITE_API_BASE: (import.meta as any).env.VITE_API_BASE,
  VITE_API_TOKEN: import.meta.env.VITE_API_TOKEN,
  API_BASE,
  API_TOKEN: API_TOKEN ? '***TOKEN_PRESENT***' : 'NO_TOKEN'
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers as any || {}) };
  if (API_TOKEN) headers['X-Auth-Token'] = API_TOKEN;
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) msg = Array.isArray(data.detail) ? data.detail.map((d:any)=>d.msg||d).join(', ') : data.detail;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  listEvents: (limit = 50, offset = 0) => request(`/events?limit=${limit}&offset=${offset}`),
  resolveEvent: (public_id: string) => request(`/events/public/${encodeURIComponent(public_id)}`),
  createEvent: (body: any) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (id: number, body: any) => request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getEvent: (id: number) => request(`/events/${id}`),
  seedEvent: (id: number) => request(`/events/${id}/seed`, { method: 'POST' }),
  listTickets: (id: number, status?: string) => request(`/events/${id}/tickets${status ? `?status=${status}` : ''}`),
  listTicketTypes: (id: number) => request(`/events/${id}/ticket_types`),
  createTicketType: (id: number, body: any) => request(`/events/${id}/ticket_types`, { method: 'POST', body: JSON.stringify(body) }),
  updateTicketType: (ticket_type_id: number, body: any) => request(`/events/ticket_types/${ticket_type_id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listAttendees: (id: number) => request(`/events/${id}/attendees`),
  getEventPromotion: (id: number) => request(`/events/${id}/promotion`),
  saveEventPromotion: (id: number, body: any) => request(`/events/${id}/promotion`, { method: 'PUT', body: JSON.stringify(body) }),
  assign: (body: any) => request('/assign', { method: 'POST', body: JSON.stringify(body) }),
  assignPreview: (event_id: number) => request('/assign/preview', { method: 'POST', body: JSON.stringify({ event_id }) }),
  resend: (ticket_id: number) => request('/resend', { method: 'POST', body: JSON.stringify({ ticket_id }) }),
  resendPayment: (ticket_id: number) => request('/tickets/resend_payment', { method: 'POST', body: JSON.stringify({ ticket_id }) }),
  resendTicket: (ticket_id: number) => request('/tickets/resend_ticket', { method: 'POST', body: JSON.stringify({ ticket_id }) }),
  reassignTicket: (ticket_id: number, payload: { email: string; first_name?: string; last_name?: string; phone?: string }) => request('/tickets/reassign', { method: 'POST', body: JSON.stringify({ ticket_id, ...payload }) }),
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
  listEventPurchases: (event_id: number) => request(`/events/${event_id}/purchases`),
  getPurchase: (purchase_id: number) => request(`/purchases/${purchase_id}`),
  getPurchaseByGuid: (guid: string) => request(`/purchases/by-guid/${encodeURIComponent(guid)}`),
  payPurchase: (purchase_id: number) => request(`/purchases/${purchase_id}/pay`, { method: 'POST' }),
  resendPurchasePayment: (purchase_id: number) => request(`/purchases/${purchase_id}/resend_payment`, { method: 'POST' }),
  unassignTicket: (ticket_id: number) => request('/tickets/unassign', { method: 'POST', body: JSON.stringify({ ticket_id }) }),
  refundTicket: (ticket_id: number) => request('/tickets/refund', { method: 'POST', body: JSON.stringify({ ticket_id }) }),
  checkin: (event_id: number, code: string) => request('/checkin', { method: 'POST', body: JSON.stringify({ event_id, code }) }),
  reconciliation: (event_id: number) => request(`/reports/reconciliation?event_id=${event_id}`),
  reconciliationCsvUrl: (event_id: number) => `${API_BASE}/reports/reconciliation.csv?event_id=${event_id}`,
  qrUrl: (data: string, scale = 5) => `${API_BASE}/qr?data=${encodeURIComponent(data)}&scale=${scale}`,
  async qrSvgText(data: string, scale = 5): Promise<string> {
    const headers: Record<string, string> = {}
    if (API_TOKEN) headers['X-Auth-Token'] = API_TOKEN
    const res = await fetch(`${API_BASE}/qr?data=${encodeURIComponent(data)}&scale=${scale}`, { headers })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.text()
  },
  lookupTicket: (code: string, event_id?: number) => request(`/tickets/lookup?code=${encodeURIComponent(code)}${event_id ? `&event_id=${event_id}` : ''}`),
  lookupByToken: (token: string) => request(`/tickets/lookup?token=${encodeURIComponent(token)}`),
  ticketByCode: (code: string) => request(`/tickets/by-code/${encodeURIComponent(code)}`),
  ticketByToken: (token: string) => request(`/tickets/by-token/${encodeURIComponent(token)}`),
  payTicket: (event_id: number, code: string) => request('/tickets/pay', { method: 'POST', body: JSON.stringify({ event_id, code }) }),
  payByToken: (token: string) => request('/tickets/pay', { method: 'POST', body: JSON.stringify({ token }) }),
  contentCheckout: (body: any) => request('/content/checkout', { method: 'POST', body: JSON.stringify(body) }),
  reserveConfirm: (body: { event_id: number; email: string; hold_hours?: number; items?: Array<{ ticket_type_id: number; qty: number }> }) => request('/content/reserve_confirm', { method: 'POST', body: JSON.stringify(body) }),
  listEmailLogs: (limit = 50, offset = 0) => request(`/admin/email_logs?limit=${limit}&offset=${offset}`),
  sendTestEmail: (to: string) => request(`/test_email?to=${encodeURIComponent(to)}`, { method: 'POST' }),
};
