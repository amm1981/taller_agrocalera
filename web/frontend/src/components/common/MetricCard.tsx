import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type MetricTone = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'orange'

const tones: Record<MetricTone, { bubble: string; trend: string; line: string }> = {
  green: {
    bubble: 'bg-emerald-100 text-emerald-700',
    trend: 'text-emerald-700',
    line: 'from-emerald-100 via-emerald-500 to-emerald-100',
  },
  amber: {
    bubble: 'bg-amber-100 text-amber-700',
    trend: 'text-amber-700',
    line: 'from-amber-100 via-amber-500 to-amber-100',
  },
  blue: {
    bubble: 'bg-blue-100 text-blue-700',
    trend: 'text-blue-700',
    line: 'from-blue-100 via-blue-500 to-blue-100',
  },
  red: {
    bubble: 'bg-rose-100 text-rose-700',
    trend: 'text-rose-700',
    line: 'from-rose-100 via-rose-500 to-rose-100',
  },
  purple: {
    bubble: 'bg-violet-100 text-violet-700',
    trend: 'text-violet-700',
    line: 'from-violet-100 via-violet-500 to-violet-100',
  },
  orange: {
    bubble: 'bg-orange-100 text-orange-700',
    trend: 'text-orange-700',
    line: 'from-orange-100 via-orange-500 to-orange-100',
  },
}

export function MetricCard({
  label,
  value,
  icon,
  tone = 'green',
  trend = 'vs. ayer',
  delta = '+ 0%',
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone?: MetricTone
  trend?: string
  delta?: string
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-[64px_1fr] gap-4">
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-full', tones[tone].bubble)}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-1 text-3xl font-black leading-none text-slate-950">{value}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs">
        <span className={cn('font-bold', tones[tone].trend)}>↑ {delta}</span>
        <span className="font-medium text-slate-400">{trend}</span>
      </div>
      <div className={cn('absolute bottom-5 right-5 h-7 w-24 rounded-full bg-gradient-to-r opacity-80 blur-[1px]', tones[tone].line)} />
    </section>
  )
}
