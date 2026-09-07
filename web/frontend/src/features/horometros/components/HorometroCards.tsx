import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

type PanelTone = 'mint' | 'rose' | 'aqua' | 'amber'

const panelTones: Record<PanelTone, string> = {
  mint: 'border-emerald-100 bg-emerald-50/35',
  rose: 'border-rose-100 bg-rose-50/35',
  aqua: 'border-cyan-100 bg-cyan-50/35',
  amber: 'border-amber-100 bg-amber-50/35',
}

export function HorometroPanel({
  title,
  icon,
  tone = 'mint',
  children,
}: {
  title: string
  icon: ReactNode
  tone?: PanelTone
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className={cn('flex h-14 items-center gap-2 border-b px-5', panelTones[tone])}>
        {icon}
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function MetricTile({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string | number
  accent: string
  icon: ReactNode
}) {
  return (
    <div className={cn('grid min-h-20 grid-cols-[40px_1fr] items-center gap-3 rounded-xl border px-3', accent)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/65">{icon}</div>
      <div>
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="text-xl font-black text-slate-950">{value}</div>
      </div>
    </div>
  )
}

export function SoftStat({ label, value, positive = false }: { label: string; value: string | number; positive?: boolean }) {
  return (
    <div className={cn('flex h-9 items-center justify-between rounded-xl px-3 text-sm', positive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700')}>
      <span className="font-medium">{label}</span>
      <strong className="text-slate-950">{value}</strong>
    </div>
  )
}
