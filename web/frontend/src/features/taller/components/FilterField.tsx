import type { ReactNode } from 'react'

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">
      {label}
      {children}
    </label>
  )
}

export const inputClass =
  'h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
