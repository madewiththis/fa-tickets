import React from 'react'

type Props = {
  onInput: (digit: string) => void
  onBackspace: () => void
  onSubmit: () => void
  disabled?: boolean
}

export function NumericKeypad({ onInput, onBackspace, onSubmit, disabled }: Props) {
  const digits = ['1','2','3','4','5','6','7','8','9','0']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
      {digits.slice(0,9).map(d => (
        <button key={d} disabled={disabled} onClick={() => onInput(d)} style={{ padding: 16, fontSize: 18, width: '100%', height: 56 }}>{d}</button>
      ))}
      <button disabled={disabled} onClick={onBackspace} style={{ padding: 16, fontSize: 18, width: '100%', height: 56 }}>⌫</button>
      <button disabled={disabled} onClick={() => onInput('0')} style={{ padding: 16, fontSize: 18, width: '100%', height: 56 }}>0</button>
      <button disabled={disabled} onClick={onSubmit} style={{ padding: 16, fontSize: 18, width: '100%', height: 56 }}>✓</button>
    </div>
  )
}
