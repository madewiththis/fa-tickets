export function formatTHB(amount: number | null | undefined) {
  if (amount == null || isNaN(amount)) return '-'
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
}

export function formatNumber(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—'
  return new Intl.NumberFormat('en-US').format(Number(n))
}

export function formatAmount(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || isNaN(amount)) return '—'
  if ((currency || '').toUpperCase() === 'THB') return formatTHB(amount)
  const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(amount))
  return currency ? `${num} ${currency}` : num
}

export function formatDateDDMMYY(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}
