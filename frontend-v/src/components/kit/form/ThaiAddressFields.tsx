import React from 'react'
import { Input } from '@/components/ui/input'
import { FormGrid } from './FormGrid'
import { FormField } from './FormField'

export type ThaiAddress = {
  house_no?: string
  building?: string
  room?: string
  floor?: string
  moo?: string
  soi?: string
  road?: string
  subdistrict?: string
  district?: string
  province?: string
  postcode?: string
  country?: string
}

type Props = {
  value: ThaiAddress
  onChange: (v: ThaiAddress) => void
}

export function ThaiAddressFields({ value, onChange }: Props) {
  const set = (k: keyof ThaiAddress) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value })
  return (
    <FormGrid cols={3}>
      <FormField label="House No."><Input value={value.house_no ?? ''} onChange={set('house_no')} /></FormField>
      <FormField label="Building"><Input value={value.building ?? ''} onChange={set('building')} /></FormField>
      <FormField label="Room"><Input value={value.room ?? ''} onChange={set('room')} /></FormField>
      <FormField label="Floor"><Input value={value.floor ?? ''} onChange={set('floor')} /></FormField>
      <FormField label="Moo"><Input value={value.moo ?? ''} onChange={set('moo')} /></FormField>
      <FormField label="Soi"><Input value={value.soi ?? ''} onChange={set('soi')} /></FormField>
      <FormField label="Road"><Input value={value.road ?? ''} onChange={set('road')} /></FormField>
      <FormField label="Subdistrict"><Input value={value.subdistrict ?? ''} onChange={set('subdistrict')} /></FormField>
      <FormField label="District"><Input value={value.district ?? ''} onChange={set('district')} /></FormField>
      <FormField label="Province"><Input value={value.province ?? ''} onChange={set('province')} /></FormField>
      <FormField label="Postcode"><Input value={value.postcode ?? ''} onChange={set('postcode')} /></FormField>
      <FormField label="Country"><Input value={value.country ?? ''} onChange={set('country')} /></FormField>
    </FormGrid>
  )
}

