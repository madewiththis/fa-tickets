import React from 'react'

type Props = {
  imageUrl?: string
  alt?: string
}

export function QRCodeDisplay({ imageUrl, alt = 'QR Code' }: Props) {
  if (!imageUrl) return <div className="text-sm text-muted-foreground">QR not available</div>
  return (
    <img src={imageUrl} alt={alt} className="h-40 w-40 object-contain" />
  )
}

