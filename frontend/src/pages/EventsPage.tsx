import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api/client'

export default function EventsPage() {
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [startsDateLocal, setStartsDateLocal] = useState('') // yyyy-MM-dd
  const [endsDateLocal, setEndsDateLocal] = useState('') // yyyy-MM-dd
  const [location, setLocation] = useState('')
  // Thai address structured fields
  const [addrHouseNo, setAddrHouseNo] = useState('')
  const [addrBuilding, setAddrBuilding] = useState('')
  const [addrRoom, setAddrRoom] = useState('')
  const [addrFloor, setAddrFloor] = useState('')
  const [addrMoo, setAddrMoo] = useState('')
  const [addrSoi, setAddrSoi] = useState('')
  const [addrRoad, setAddrRoad] = useState('')
  const [addrSubdistrict, setAddrSubdistrict] = useState('') // Tambon/Khwaeng
  const [addrDistrict, setAddrDistrict] = useState('') // Amphoe/Khet
  const [addrProvince, setAddrProvince] = useState('')
  const [addrPostcode, setAddrPostcode] = useState('') // 5-digit
  const [addrCountry, setAddrCountry] = useState('Thailand')
  const [mapsLink, setMapsLink] = useState('')
  const [gettingThere, setGettingThere] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactUrl, setContactUrl] = useState('')
  const [capacity, setCapacity] = useState(50)
  const [codeSuffix, setCodeSuffix] = useState<number>(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [mode, setMode] = useState<'list' | 'edit' | 'attendees'>('list')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'info'|'success'|'error'>('info')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [reconMap, setReconMap] = useState<Record<number, any>>({})
  const [authWarning, setAuthWarning] = useState(false)
  const [recon, setRecon] = useState<any | null>(null)
  const [attendees, setAttendees] = useState<any[] | null>(null)
  const [selectedAttendee, setSelectedAttendee] = useState<any | null>(null)
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [ticketTypes, setTicketTypes] = useState<any[] | null>(null)
  const [ttName, setTtName] = useState('')
  const [ttMax, setTtMax] = useState<number | ''>('' as any)
  const [ttPrice, setTtPrice] = useState<number | ''>('' as any)
  const [savingTt, setSavingTt] = useState(false)
  const [resendInfo, setResendInfo] = useState<{type:'payment'|'ticket', message:string, ok:boolean} | null>(null)
  const [resending, setResending] = useState<{payment:boolean; ticket:boolean}>({ payment:false, ticket:false })

  // Compute yyyymmdd_## based on startsAt
  const eventCode = useMemo(() => {
    if (!startsDateLocal) return ''
    const d = new Date(startsDateLocal)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const suffix = String(Math.max(1, Math.min(99, Number(codeSuffix) || 1))).padStart(2, '0')
    return `${yyyy}${mm}${dd}_${suffix}`
  }, [startsDateLocal, codeSuffix])

  // Auto-set title from code unless user edited title
  if (!titleTouched && !editingId && title !== eventCode) {
    // Keep title synced with auto code
    if (eventCode) setTitle(eventCode)
  }

  function toIsoDate(dateLocal: string): string | null {
    if (!dateLocal) return null
    return new Date(dateLocal).toISOString()
  }

  async function loadEvents() {
    try {
      const list = await api.listEvents()
      setEvents(list)
    } catch (e:any) {
      console.error('[Events] List fetch failed:', e)
      setMessageType('error');
      const msg = (e.message || '').includes('Failed to fetch')
        ? 'Failed to load events. Is the backend running on :8000 and migrations applied?'
        : e.message || 'Failed to load events';
      setMessage(msg)
      if ((e.message || '').includes('401')) setAuthWarning(true)
    }
  }

  useEffect(() => { loadEvents() }, [])

  // Load reconciliation summary for each event to show sold/revenue
  useEffect(() => {
    (async () => {
      if (!events || events.length === 0) return
      const entries: [number, any][] = []
      await Promise.all(events.map(async (ev:any) => {
        try {
          const r = await api.reconciliation(ev.id)
          entries.push([ev.id, r])
        } catch (e) {
          // ignore per-event errors
        }
      }))
      const map: Record<number, any> = {}
      for (const [id, r] of entries) map[id] = r
      setReconMap(map)
    })()
  }, [events])

  async function submitEvent() {
    setMessage('')
    setMessageType('info')
    try {
      const starts_at = toIsoDate(startsDateLocal)
      if (!starts_at) throw new Error('Please select a start date')
      const ends_at = endsDateLocal ? toIsoDate(endsDateLocal) : null
      // Build Thai address JSON object from form fields
      let location_address: any = {}
      if (addrHouseNo) location_address.house_no = addrHouseNo
      if (addrBuilding) location_address.building = addrBuilding
      if (addrRoom) location_address.room = addrRoom
      if (addrFloor) location_address.floor = addrFloor
      if (addrMoo) location_address.moo = addrMoo
      if (addrSoi) location_address.soi = addrSoi
      if (addrRoad) location_address.road = addrRoad
      if (addrSubdistrict) location_address.subdistrict = addrSubdistrict
      if (addrDistrict) location_address.district = addrDistrict
      if (addrProvince) location_address.province = addrProvince
      if (addrPostcode) location_address.postcode = addrPostcode
      if (addrCountry) location_address.country = addrCountry
      if (Object.keys(location_address).length === 0) location_address = null
      const payload: any = {
        title: title || eventCode,
        starts_at,
        ends_at,
        location_name: location || null,
        location_address,
        address_maps_link: mapsLink || null,
        location_getting_there: gettingThere || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        contact_url: contactUrl || null,
        capacity,
      }
      console.log('[Events] Submitting event with payload:', payload)
      setCreating(true)
      let ev
      if (editingId) {
        ev = await api.updateEvent(editingId, payload)
        setMessageType('success')
        setMessage(`Updated event #${ev.id} (${ev.title})`)
      } else {
        ev = await api.createEvent(payload)
        setMessageType('success')
        setMessage(`Created event #${ev.id} (${ev.title})`)
      }
      // Refresh list and collapse form
      await loadEvents()
      clearForm()
    } catch (e:any) {
      console.error('[Events] Create event failed:', e)
      setMessageType('error')
      setMessage(e.message || 'Failed to create event')
      if ((e.message || '').includes('401')) setAuthWarning(true)
    } finally {
      setCreating(false)
    }
  }

  // Helpers
  function clearForm() {
    setEditingId(null)
    setMode('list')
    setShowForm(false)
    setTitle('')
    setTitleTouched(false)
    setStartsDateLocal('')
    setEndsDateLocal('')
    setLocation('')
    setAddrHouseNo('')
    setAddrBuilding('')
    setAddrRoom('')
    setAddrFloor('')
    setAddrMoo('')
    setAddrSoi('')
    setAddrRoad('')
    setAddrSubdistrict('')
    setAddrDistrict('')
    setAddrProvince('')
    setAddrPostcode('')
    setAddrCountry('Thailand')
    setMapsLink('')
    setGettingThere('')
    setContactPhone('')
    setContactEmail('')
    setContactUrl('')
    setCapacity(50)
    setCodeSuffix(1)
    setRecon(null)
    setAttendees(null)
    setTicketTypes(null)
    setShowTicketTypes(false)
    setTtName('')
    setTtMax('' as any)
    setTtPrice('' as any)
  }

  function toLocalDateValue(iso: string): string {
    const d = new Date(iso)
    const pad = (n:number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth()+1)
    const dd = pad(d.getDate())
    return `${yyyy}-${mm}-${dd}`
  }

  async function startEdit(ev:any) {
    setEditingId(ev.id)
    setMode('edit')
    setShowForm(true)
    setTitle(ev.title || '')
    setTitleTouched(true)
    if (ev.starts_at) setStartsDateLocal(toLocalDateValue(ev.starts_at))
    if (ev.ends_at) setEndsDateLocal(toLocalDateValue(ev.ends_at))
    setLocation(ev.location || '')
    const a = ev.location_address || {}
    setAddrHouseNo(a.house_no || '')
    setAddrBuilding(a.building || '')
    setAddrRoom(a.room || '')
    setAddrFloor(a.floor || '')
    setAddrMoo(a.moo || '')
    setAddrSoi(a.soi || '')
    setAddrRoad(a.road || '')
    setAddrSubdistrict(a.subdistrict || '')
    setAddrDistrict(a.district || '')
    setAddrProvince(a.province || '')
    setAddrPostcode(a.postcode || '')
    setAddrCountry(a.country || 'Thailand')
    setMapsLink(ev.address_maps_link || '')
    setGettingThere(ev.location_getting_there || '')
    setContactPhone(ev.contact_phone || '')
    setContactEmail(ev.contact_email || '')
    setContactUrl(ev.contact_url || '')
    setCapacity(ev.capacity ?? 50)
    try {
      const r = await api.reconciliation(ev.id)
      setRecon(r)
    } catch (e:any) {
      console.warn('[Events] Failed to load reconciliation', e)
      setRecon(null)
    }

    try {
      const types = await api.listTicketTypes(ev.id)
      setTicketTypes(types)
    } catch (e:any) {
      console.warn('[Events] Failed to load ticket types', e)
      setTicketTypes([])
    }
  }

  async function viewAttendees() {
    if (!editingId) return
    setMode('attendees')
    setShowForm(false)
    setLoadingAttendees(true)
    setSelectedAttendee(null)
    try {
      const list = await api.listAttendees(editingId)
      setAttendees(list)
    } catch (e:any) {
      setMessageType('error')
      setMessage(e.message || 'Failed to load attendees')
    } finally {
      setLoadingAttendees(false)
    }
  }

  async function openTicketTypes() {
    if (!editingId) return
    setMode('ticket_types')
    setShowForm(false)
    if (ticketTypes === null) {
      try {
        const types = await api.listTicketTypes(editingId)
        setTicketTypes(types)
      } catch (e:any) {
        setMessageType('error')
        setMessage(e.message || 'Failed to load ticket types')
        setTicketTypes([])
      }
    }
  }

  return (
    <section>
      {authWarning && (
        <div style={{ background:'#fff3cd', color:'#664d03', padding: '8px 12px', border: '1px solid #ffecb5', borderRadius: 6, marginBottom: 12 }}>
          API requests unauthorized. Set VITE_API_TOKEN in your frontend env to match backend AUTH_TOKEN, then restart the frontend dev server.
        </div>
      )}
      <h2 style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>Events</span>
        <button onClick={()=>{
          // Always switch to edit mode for a fresh event and open the form
          setEditingId(null)
          setMode('edit')
          setShowForm(true)
          // Reset form fields for new event
          setTitle('')
          setTitleTouched(false)
          setStartsDateLocal('')
          setEndsDateLocal('')
          setLocation('')
          setAddrHouseNo('')
          setAddrBuilding('')
          setAddrRoom('')
          setAddrFloor('')
          setAddrMoo('')
          setAddrSoi('')
          setAddrRoad('')
          setAddrSubdistrict('')
          setAddrDistrict('')
          setAddrProvince('')
          setAddrPostcode('')
          setAddrCountry('Thailand')
          setCapacity(50)
          setCodeSuffix(1)
          setRecon(null)
          setAttendees(null)
          setTicketTypes(null)
          setShowTicketTypes(false)
        }}>{showForm && !editingId ? 'Close' : 'New Event'}</button>
      </h2>

      {editingId && (
        <div style={{ display:'flex', gap:8, marginBottom: 12 }}>
          <button onClick={()=> { setMode('edit'); setShowForm(true) }} style={{ fontWeight: mode==='edit' ? 700 : 400 }}>Edit</button>
          <button onClick={viewAttendees} style={{ fontWeight: mode==='attendees' ? 700 : 400 }}>Attendees</button>
          <button onClick={openTicketTypes} style={{ fontWeight: mode==='ticket_types' ? 700 : 400 }}>Ticket types</button>
        </div>
      )}

      {editingId && recon && (
        <div style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 12 }}>
          <div style={{ fontWeight:600, marginBottom:8 }}>Ticket Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(140px,1fr))', gap: 8 }}>
            <div>Assigned: {recon.assigned}</div>
            <div>Delivered: {recon.delivered}</div>
            <div>Checked-in: {recon.checked_in}</div>
            <div>Paid: {recon.paid_count ?? 0}</div>
            <div>Unpaid: {recon.unpaid_count ?? 0}</div>
            <div>Revenue: {recon.revenue_baht?.toLocaleString?.('en-US') ?? recon.revenue_baht} THB</div>
          </div>
          <div style={{ marginTop: 6, color:'#555' }}>
            Total non-available: {(recon.assigned||0) + (recon.checked_in||0)} of capacity {recon.event?.capacity}
          </div>
        </div>
      )}

      {mode === 'list' && !showForm && (
        <div style={{ overflowX:'auto', marginBottom: 16 }}>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>ID</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Title</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Starts</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Ends</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Location</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Sold</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Revenue (THB)</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Capacity</th>
                <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td style={{ padding:8 }}>{ev.id}</td>
                  <td style={{ padding:8 }}>{ev.title}</td>
                  <td style={{ padding:8 }}>
                    {(() => {
                      const d = new Date(ev.starts_at)
                      const dd = String(d.getDate()).padStart(2, '0')
                      const mm = String(d.getMonth() + 1).padStart(2, '0')
                      const yy = String(d.getFullYear()).slice(-2)
                      return `${dd}/${mm}/${yy}`
                    })()}
                  </td>
                  <td style={{ padding:8 }}>
                    {ev.ends_at ? (() => {
                      const d = new Date(ev.ends_at)
                      const dd = String(d.getDate()).padStart(2, '0')
                      const mm = String(d.getMonth() + 1).padStart(2, '0')
                      const yy = String(d.getFullYear()).slice(-2)
                      return `${dd}/${mm}/${yy}`
                    })() : '—'}
                  </td>
                  <td style={{ padding:8 }}>{ev.location ?? ''}</td>
                  <td style={{ padding:8 }}>{(reconMap[ev.id]?.paid_count ?? 0)}</td>
                  <td style={{ padding:8 }}>{(reconMap[ev.id]?.revenue_baht ?? 0).toLocaleString?.('en-US') ?? (reconMap[ev.id]?.revenue_baht ?? 0)}</td>
                  <td style={{ padding:8 }}>{ev.capacity}</td>
                  <td style={{ padding:8 }}>
                    <button onClick={()=> startEdit(ev)}>Edit</button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={7} style={{ padding:8, color:'#666' }}>No events found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {mode !== 'attendees' && showForm && (
      <div style={{ display:'grid', gap:10, maxWidth: 840, gridTemplateColumns:'220px 1fr', alignItems:'center' }}>
        <div style={{ color:'#555' }}>{editingId ? 'Edit dates' : 'Start date'}</div>
        <input type='date' value={startsDateLocal} onChange={e=>setStartsDateLocal(e.target.value)} />

        <div style={{ color:'#555' }}>End date (optional)</div>
        <input type='date' value={endsDateLocal} onChange={e=>setEndsDateLocal(e.target.value)} />

        <div style={{ color:'#555' }}>Event code (auto, editable suffix)</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input readOnly value={eventCode} style={{ flex:1 }} />
          <span>suffix</span>
          <input type='number' min={1} max={99} value={codeSuffix}
            onChange={e=>setCodeSuffix(parseInt(e.target.value||'1'))}
            style={{ width: 80 }}/>
        </div>

        <div style={{ color:'#555' }}>Title</div>
        <input placeholder='Title' value={title} onChange={e=>{ setTitle(e.target.value); setTitleTouched(true) }} />

        <div style={{ color:'#555' }}>Location name</div>
        <input placeholder='e.g. Main Hall' value={location} onChange={e=>setLocation(e.target.value)} />

        <div style={{ color:'#555', marginTop:4 }}>Address (Thailand)</div>
        <div style={{ display:'grid', gap:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
            <input placeholder='House no.' value={addrHouseNo} onChange={e=>setAddrHouseNo(e.target.value)} />
            <input placeholder='Building' value={addrBuilding} onChange={e=>setAddrBuilding(e.target.value)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
            <input placeholder='Room' value={addrRoom} onChange={e=>setAddrRoom(e.target.value)} />
            <input placeholder='Floor' value={addrFloor} onChange={e=>setAddrFloor(e.target.value)} />
            <input placeholder='Moo (หมู่)' value={addrMoo} onChange={e=>setAddrMoo(e.target.value)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
            <input placeholder='Soi (ซอย)' value={addrSoi} onChange={e=>setAddrSoi(e.target.value)} />
            <input placeholder='Road (ถนน)' value={addrRoad} onChange={e=>setAddrRoad(e.target.value)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
            <input placeholder='Subdistrict (ตำบล/แขวง)' value={addrSubdistrict} onChange={e=>setAddrSubdistrict(e.target.value)} />
            <input placeholder='District (อำเภอ/เขต)' value={addrDistrict} onChange={e=>setAddrDistrict(e.target.value)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
            <input placeholder='Province (จังหวัด)' value={addrProvince} onChange={e=>setAddrProvince(e.target.value)} />
            <input placeholder='Postcode (รหัสไปรษณีย์ 5 หลัก)' value={addrPostcode} onChange={e=>{
              const v = e.target.value.replace(/[^0-9]/g, '').slice(0,5)
              setAddrPostcode(v)
            }} />
            <input placeholder='Country' value={addrCountry} onChange={e=>setAddrCountry(e.target.value)} />
          </div>
          <div style={{ color:'#777', fontSize:12 }}>
            Note: Thai postcode is 5 digits (e.g., 10110).
          </div>
        </div>

        <div style={{ color:'#555' }}>Google Maps link</div>
        <input placeholder='https://maps.google.com/?q=...' value={mapsLink} onChange={e=>setMapsLink(e.target.value)} />

        <div style={{ color:'#555' }}>Getting there</div>
        <textarea placeholder='Parking, BTS/MRT, entrance instructions…' rows={3} value={gettingThere} onChange={e=>setGettingThere(e.target.value)} />

        <div style={{ color:'#555' }}>Contact phone</div>
        <input placeholder='+66 2 123 4567' value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />

        <div style={{ color:'#555' }}>Contact email</div>
        <input placeholder='events@example.com' value={contactEmail} onChange={e=>setContactEmail(e.target.value)} />

        <div style={{ color:'#555' }}>Contact URL</div>
        <input placeholder='https://example.com/event' value={contactUrl} onChange={e=>setContactUrl(e.target.value)} />

        <div style={{ color:'#555' }}>Capacity</div>
        <input type='number' placeholder='Capacity' value={capacity} onChange={e=>setCapacity(parseInt(e.target.value||'0'))} />

        <div style={{ color:'#555' }}>Actions</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={submitEvent} disabled={creating}>
            {creating ? (editingId ? 'Saving…' : 'Creating…') : (editingId ? 'Save Changes' : 'Create Event')}
          </button>
          {editingId && (
            <button type='button' onClick={clearForm}>Cancel</button>
          )}
          {/* navigation handled by menu above */}
        </div>

        {/* Ticket summary moved to top */}

        {/* attendees now shown on dedicated view */}

        {editingId && mode === 'ticket_types' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ color:'#555' }}>Ticket Types</div>
              <button type='button' onClick={()=> { setMode('edit'); setShowForm(true) }}>← Back to Event</button>
            </div>
            <div>
              <div style={{ marginBottom: 8, overflowX:'auto' }}>
                <table style={{ borderCollapse:'collapse', width:'100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Name</th>
                      <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Max</th>
                      <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Price (THB)</th>
                      <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Active</th>
                      <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ticketTypes || []).map((t:any) => (
                      <TicketTypeRow key={t.id} t={t} onSaved={async (updated:any)=>{
                        setTicketTypes((prev:any)=> (prev||[]).map((x:any)=> x.id===updated.id? updated : x))
                      }} />
                    ))}
                    {ticketTypes && ticketTypes.length === 0 && (
                      <tr><td colSpan={4} style={{ padding:8, color:'#666' }}>No ticket types yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display:'grid', gap:10, gridTemplateColumns:'220px 1fr', alignItems:'center' }}>
                <div style={{ color:'#555' }}>Ticket name</div>
                <input placeholder='e.g. General Admission' value={ttName} onChange={e=>setTtName(e.target.value)} />
                <div style={{ color:'#555' }}>Max tickets</div>
                <input type='number' min={0} placeholder='e.g. 100' value={ttMax} onChange={e=>setTtMax((e.target.value===''?'':parseInt(e.target.value)) as any)} />
                <div style={{ color:'#555' }}>Price (baht)</div>
                <input type='number' min={0} placeholder='e.g. 500' value={ttPrice} onChange={e=>setTtPrice((e.target.value===''?'':parseInt(e.target.value)) as any)} />
                <div />
                <div>
                  <button disabled={!ttName || savingTt} onClick={async ()=>{
                    if (!editingId) return
                    setSavingTt(true)
                    try {
                      const body:any = { name: ttName }
                      if (ttMax !== '' && !Number.isNaN(ttMax)) body.max_quantity = Number(ttMax)
                      if (ttPrice !== '' && !Number.isNaN(ttPrice)) body.price_baht = Number(ttPrice)
                      const created = await api.createTicketType(editingId, body)
                      setTicketTypes([...(ticketTypes||[]), created])
                      setTtName(''); setTtMax('' as any); setTtPrice('' as any)
                    } catch (e:any) {
                      setMessageType('error'); setMessage(e.message || 'Failed to add ticket type')
                    } finally {
                      setSavingTt(false)
                    }
                  }}>Add ticket type</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {mode === 'attendees' && editingId && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <button type='button' onClick={()=> { setMode('edit'); setShowForm(true) }}>← Back to Event</button>
            <span style={{ fontWeight: 600 }}>Attendees for event #{editingId}</span>
            <span />
          </div>
          {selectedAttendee && (
            <div style={{ border:'1px solid #ddd', borderRadius:6, padding:12, marginBottom: 12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <strong>Attendee Details</strong>
                <button onClick={()=> setSelectedAttendee(null)}>Close</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', rowGap:6, columnGap:12, marginTop:8 }}>
                <div style={{ color:'#555' }}>Ticket</div>
                <div>#{selectedAttendee.ticket_id}</div>
                <div style={{ color:'#555' }}>Code</div>
                <div>{selectedAttendee.short_code || '—'}</div>
                <div style={{ color:'#555' }}>Name</div>
                <div>{[selectedAttendee.first_name, selectedAttendee.last_name].filter(Boolean).join(' ') || '—'}</div>
                <div style={{ color:'#555' }}>Email</div>
                <div>{selectedAttendee.email || '—'}</div>
                <div style={{ color:'#555' }}>Phone</div>
                <div>{selectedAttendee.phone || '—'}</div>
                <div style={{ color:'#555' }}>Status</div>
                <div>{selectedAttendee.status}</div>
                <div style={{ color:'#555' }}>Payment</div>
                <div>{selectedAttendee.payment_status || '—'}</div>
                <div style={{ color:'#555' }}>Checked in</div>
                <div>{selectedAttendee.checked_in_at ? new Date(selectedAttendee.checked_in_at).toLocaleString() : '—'}</div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button disabled={resending.payment}
                  onClick={async ()=>{
                    if (!selectedAttendee) return
                    setResendInfo(null)
                    setResending(s=>({ ...s, payment:true }))
                    try {
                      await api.resendPayment(selectedAttendee.ticket_id)
                      setResendInfo({ type:'payment', message:'Payment email sent.', ok:true })
                    } catch (e:any) {
                      setResendInfo({ type:'payment', message: e.message || 'Failed to send payment email', ok:false })
                    } finally {
                      setResending(s=>({ ...s, payment:false }))
                    }
                  }}>Resend payment email</button>
                <button disabled={resending.ticket || (selectedAttendee && selectedAttendee.payment_status !== 'paid')}
                  onClick={async ()=>{
                    if (!selectedAttendee) return
                    setResendInfo(null)
                    setResending(s=>({ ...s, ticket:true }))
                    try {
                      await api.resendTicket(selectedAttendee.ticket_id)
                      setResendInfo({ type:'ticket', message:'Ticket email sent.', ok:true })
                    } catch (e:any) {
                      setResendInfo({ type:'ticket', message: e.message || 'Failed to send ticket email', ok:false })
                    } finally {
                      setResending(s=>({ ...s, ticket:false }))
                    }
                  }}>Resend ticket email</button>
              </div>
              {resendInfo && (
                <div style={{
                  marginTop:8,
                  padding:'8px 12px',
                  border:'1px solid',
                  borderRadius:6,
                  background: resendInfo.ok ? '#e6f4ea' : '#fdecea',
                  borderColor: resendInfo.ok ? '#b7e1c7' : '#f5c6cb',
                  color: resendInfo.ok ? '#1e4620' : '#5f2120',
                }}>
                  {resendInfo.message}
                </div>
              )}
            </div>
          )}
          <div style={{ overflowX:'auto' }}>
            {loadingAttendees ? (
              <div>Loading attendees…</div>
            ) : (
              <table style={{ borderCollapse:'collapse', width:'100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Ticket</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Name</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Email</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Code</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Status</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Payment</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(attendees || []).map((a:any) => (
                    <tr key={a.ticket_id}>
                      <td style={{ padding:8 }}>#{a.ticket_id}</td>
                      <td style={{ padding:8 }}>{[a.first_name, a.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td style={{ padding:8 }}>{a.email || '—'}</td>
                      <td style={{ padding:8 }}>{a.short_code || '—'}</td>
                      <td style={{ padding:8 }}>{a.status}</td>
                      <td style={{ padding:8 }}>{a.payment_status || '—'}</td>
                      <td style={{ padding:8 }}>
                        <button onClick={()=> setSelectedAttendee(a)}>View</button>
                      </td>
                    </tr>
                  ))}
                  {attendees && attendees.length === 0 && (
                    <tr><td colSpan={7} style={{ padding:8, color:'#666' }}>No attendees yet.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {mode === 'ticket_types' && editingId && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <button type='button' onClick={()=> { setMode('edit'); setShowForm(true) }}>← Back to Event</button>
            <span style={{ fontWeight: 600 }}>Ticket types for event #{editingId}</span>
            <span />
          </div>
          <div>
            <div style={{ marginBottom: 8, overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', width:'100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Name</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Max</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Price (THB)</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Active</th>
                    <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(ticketTypes || []).map((t:any) => (
                    <TicketTypeRow key={t.id} t={t} onSaved={async (updated:any)=>{
                      setTicketTypes((prev:any)=> (prev||[]).map((x:any)=> x.id===updated.id? updated : x))
                    }} />
                  ))}
                  {ticketTypes && ticketTypes.length === 0 && (
                    <tr><td colSpan={4} style={{ padding:8, color:'#666' }}>No ticket types yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display:'grid', gap:10, gridTemplateColumns:'220px 1fr', alignItems:'center' }}>
              <div style={{ color:'#555' }}>Ticket name</div>
              <input placeholder='e.g. General Admission' value={ttName} onChange={e=>setTtName(e.target.value)} />
              <div style={{ color:'#555' }}>Max tickets</div>
              <input type='number' min={0} placeholder='e.g. 100' value={ttMax} onChange={e=>setTtMax((e.target.value===''?'':parseInt(e.target.value)) as any)} />
              <div style={{ color:'#555' }}>Price (baht)</div>
              <input type='number' min={0} placeholder='e.g. 500' value={ttPrice} onChange={e=>setTtPrice((e.target.value===''?'':parseInt(e.target.value)) as any)} />
              <div />
              <div>
                <button disabled={!ttName || savingTt} onClick={async ()=>{
                  if (!editingId) return
                  setSavingTt(true)
                  try {
                    const body:any = { name: ttName }
                    if (ttMax !== '' && !Number.isNaN(ttMax)) body.max_quantity = Number(ttMax)
                    if (ttPrice !== '' && !Number.isNaN(ttPrice)) body.price_baht = Number(ttPrice)
                    const created = await api.createTicketType(editingId, body)
                    setTicketTypes([...(ticketTypes||[]), created])
                    setTtName(''); setTtMax('' as any); setTtPrice('' as any)
                  } catch (e:any) {
                    setMessageType('error'); setMessage(e.message || 'Failed to add ticket type')
                  } finally {
                    setSavingTt(false)
                  }
                }}>Add ticket type</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {message && (
        <p style={{ color: messageType==='error' ? '#b00020' : messageType==='success' ? '#0c7a0c' : '#333' }}>
          {message}
        </p>
      )}
    </section>
  )
}

function TicketTypeRow({ t, onSaved }: { t:any, onSaved:(t:any)=>void }) {
  const [name, setName] = useState(t.name)
  const [maxQ, setMaxQ] = useState<number | ''>((t.max_quantity ?? '') as any)
  const [price, setPrice] = useState<number | ''>((t.price_baht ?? '') as any)
  const [active, setActive] = useState<boolean>(!!t.active)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true); setErr('')
    try {
      const body:any = {}
      if (name !== t.name) body.name = name
      if (maxQ !== (t.max_quantity ?? '')) body.max_quantity = (maxQ === '' ? null : Number(maxQ))
      if (price !== (t.price_baht ?? '')) body.price_baht = (price === '' ? null : Number(price))
      if (active !== t.active) body.active = active
      const updated = await api.updateTicketType(t.id, body)
      onSaved(updated)
    } catch (e:any) { setErr(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <tr>
      <td style={{ padding:8 }}>
        <input value={name} onChange={e=>setName(e.target.value)} style={{ width:'100%' }} />
      </td>
      <td style={{ padding:8 }}>
        <input type='number' min={0} value={maxQ} onChange={e=> setMaxQ((e.target.value===''?'':parseInt(e.target.value)) as any)} style={{ width: 120 }} />
      </td>
      <td style={{ padding:8 }}>
        <input type='number' min={0} value={price} onChange={e=> setPrice((e.target.value===''?'':parseInt(e.target.value)) as any)} style={{ width: 140 }} />
      </td>
      <td style={{ padding:8 }}>
        <input type='checkbox' checked={active} onChange={e=> setActive(e.target.checked)} />
      </td>
      <td style={{ padding:8 }}>
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {err && <div style={{ color:'#b00020', marginTop:4 }}>{err}</div>}
      </td>
    </tr>
  )
}
