import { useParams } from 'react-router-dom'

export default function InvoicePage() {
  const { id } = useParams()
  const guid = id || ''
  const now = new Date()
  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoice</h1>
        <span className="text-xs text-muted-foreground">{guid}</span>
      </div>
      <div className="text-sm text-muted-foreground">Issued: {now.toLocaleString()}</div>
      <div className="border rounded p-3 text-sm">
        <p>This is a mock invoice for demonstration purposes.</p>
        <p className="mt-2">It would include buyer details, line items for selected ticket types, quantities, and totals.</p>
      </div>
      {/* No app nav and no back button per spec */}
    </div>
  )
}
