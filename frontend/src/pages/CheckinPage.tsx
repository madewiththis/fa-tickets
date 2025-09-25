import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api/client'
import { NumericKeypad } from '../components/NumericKeypad'
import { PageHeader } from '@/components/kit'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function CheckinPage() {
  const [eventId, setEventId] = useState<number | ''>('' as any)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState('')
  const [attendees, setAttendees] = useState<any[]>([])
  const [valid, setValid] = useState(false)
  const [checking, setChecking] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [justChecked, setJustChecked] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    (async () => {
      setLoadingEvents(true)
      setError('')
      try {
        const list = await api.listEvents()
        setEvents(list)
      } catch (e:any) {
        setError(e.message || 'Failed to load events')
      } finally {
        setLoadingEvents(false)
      }
    })()
  }, [])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return (events || []).filter((ev:any) => {
      const starts = ev.starts_at ? new Date(ev.starts_at) : null
      const ends = ev.ends_at ? new Date(ev.ends_at) : null
      if (ends) return ends >= now
      if (starts) return starts >= now
      return false
    })
  }, [events])

  // Load attendees when event selected for details lookup
  useEffect(() => {
    (async () => {
      setAttendees([])
      if (!eventId) return
      try { setAttendees(await api.listAttendees(Number(eventId))) } catch {}
    })()
  }, [eventId])

  // Validate code when 3 chars and event selected
  useEffect(() => {
    (async () => {
      setValid(false)
      setJustChecked(false)
      if (!eventId || code.length !== 3) return
      try {
        await api.lookupTicket(code, Number(eventId))
        setValid(true)
      } catch {
        setValid(false)
      }
    })()
  }, [code, eventId])

  function onInput(d: string) {
    if (code.length < 3) setCode(code + d)
  }
  function onBackspace() { setCode(code.slice(0, -1)) }
  async function onSubmit() {
    if (!eventId || code.length !== 3) return
    // This submit step brings up details, actual confirmation uses confirmCheckin
  }

  const person = useMemo(() => {
    const c = code.trim().toUpperCase()
    return attendees.find(a => (a.short_code || '').toUpperCase() === c)
  }, [attendees, code])
  const alreadyChecked = !!(person && person.checked_in_at)

  async function confirmCheckin() {
    if (!eventId || code.length !== 3 || !valid) return
    setChecking(true); setMessage('')
    try {
      const res = await api.checkin(Number(eventId), code)
      // Show success state on the button briefly, then clear for next code
      setJustChecked(true)
      setTimeout(() => {
        setJustChecked(false)
        setCode('')
        setValid(false)
      }, 500)
    } catch (e:any) {
      setMessage(e.message || 'Failed to check in')
    } finally { setChecking(false) }
  }

  async function openScanner() {
    setScannerOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        tickScan()
      }
    } catch (e) {
      setMessage('Camera access denied or unavailable')
      setScannerOpen(false)
    }
  }

  function closeScanner() {
    setScannerOpen(false)
    if (videoRef.current) videoRef.current.pause()
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }

  async function tickScan() {
    if (!scannerOpen) return
    const BarcodeDetectorAny: any = (window as any).BarcodeDetector
    if (BarcodeDetectorAny && videoRef.current) {
      try {
        const detector = new BarcodeDetectorAny({ formats: ['qr_code'] })
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes && barcodes.length > 0) {
          const raw = String(barcodes[0].rawValue || '')
          // Accept either token URL or short code
          const m = raw.match(/code=([A-Z0-9]{3})/i)
          const c = m ? m[1] : raw.trim()
          if (c && c.length === 3) {
            setCode(c.toUpperCase())
            closeScanner()
            return
          }
        }
      } catch {}
    }
    // keep polling
    requestAnimationFrame(tickScan)
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Check in" />
      <div className="grid gap-3 max-w-sm">
        <Select value={eventId ? String(eventId) : ''} onValueChange={(v)=> setEventId(v ? Number(v) : ('' as any))}>
          <SelectTrigger><SelectValue placeholder={loadingEvents ? 'Loading…' : 'Select event…'} /></SelectTrigger>
          <SelectContent>
            {upcomingEvents.map((ev:any) => (
              <SelectItem key={ev.id} value={String(ev.id)}>#{ev.id} • {ev.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {eventId ? (
          <>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  enterKeyHint="done"
                  pattern="[0-9A-Za-z]{3}"
                  maxLength={3}
                  value={code}
                  onChange={(e)=> setCode(e.target.value.toUpperCase().slice(0,3))}
                  placeholder="Enter code"
                  className="flex-1 text-center text-3xl tracking-[0.6em] h-16"
                  autoFocus
                />
                <Button variant="outline" onClick={openScanner} className="h-16">Scan QR</Button>
              </div>

              {code.length === 3 && (
                <div className="space-y-2">
                  <div className={`${valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'} text-base font-semibold`}>
                    {valid ? 'Code is valid' : 'Code not found for this event'}{valid && alreadyChecked ? ' — already checked in' : ''}
                  </div>
                  {person && (
                    <div className="text-sm grid gap-1">
                      <div><span className="text-muted-foreground">Ticket No.:</span> {person.ticket_number || '—'}</div>
                      <div><span className="text-muted-foreground">Name:</span> {[person.first_name, person.last_name].filter(Boolean).join(' ') || '—'}</div>
                      <div><span className="text-muted-foreground">Email:</span> {person.email || '—'}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {person.phone || '—'}</div>
                    </div>
                  )}
                  <div>
                    {!valid ? (
                      <Button variant="outline" onClick={()=> setCode('')} className="w-full">Clear</Button>
                    ) : alreadyChecked ? (
                      <Button onClick={()=> { setCode(''); setMessage('') }} className="w-full">OK</Button>
                    ) : justChecked ? (
                      <Button className="w-full bg-green-600 hover:bg-green-600 text-white" disabled>
                        <Check className="h-4 w-4 mr-2" /> User has been checked in
                      </Button>
                    ) : (
                      <Button onClick={confirmCheckin} disabled={checking} className="w-full">{checking ? 'Checking in…' : 'Check in'}</Button>
                    )}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
        {code.length < 3 && (
          <NumericKeypad
            onInput={onInput}
            onBackspace={onBackspace}
            onSubmit={onSubmit}
            disabled={loading}
          />
        )}
        </>
        ) : null}

        {/* Inline validation replaces the full-screen overlay */}

        {scannerOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="bg-background p-3 rounded shadow max-w-sm w-full">
              <div className="text-sm mb-2">Scan QR</div>
              <video ref={videoRef} autoPlay playsInline className="w-full rounded" />
              <div className="mt-2 flex justify-end"><Button variant="outline" onClick={closeScanner}>Close</Button></div>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-destructive">{message}</p>}
    </section>
  )
}
