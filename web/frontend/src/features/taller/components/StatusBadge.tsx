import { cn } from '../../../utils/cn'

const tones: Record<string, string> = {
  PENDIENTE: 'border-amber-200 bg-amber-50 text-amber-800',
  EN_CURSO: 'border-sky-200 bg-sky-50 text-sky-800',
  ESPERANDO_REPUESTO: 'border-orange-200 bg-orange-50 text-orange-800',
  FINALIZADA_CON_PENDIENTE: 'border-violet-200 bg-violet-50 text-violet-800',
  FINALIZADA: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  OPERATIVO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  OPERATIVO_CON_PENDIENTE: 'border-violet-200 bg-violet-50 text-violet-800',
  FUERA_DE_SERVICIO: 'border-rose-200 bg-rose-50 text-rose-800',
  MANTENIMIENTO: 'border-sky-200 bg-sky-50 text-sky-800',
  SOLICITADO: 'border-amber-200 bg-amber-50 text-amber-800',
  DISPONIBLE: 'border-lime-200 bg-lime-50 text-lime-800',
  ENTREGADO: 'border-slate-200 bg-slate-50 text-slate-700',
  PENDIENTE_INICIO: 'border-amber-200 bg-amber-50 text-amber-800',
  EN_JORNADA: 'border-sky-200 bg-sky-50 text-sky-800',
  COMPLETO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  SIN_INICIO: 'border-orange-200 bg-orange-50 text-orange-800',
  SIN_CIERRE: 'border-orange-200 bg-orange-50 text-orange-800',
  INCONSISTENCIA: 'border-rose-200 bg-rose-50 text-rose-800',
  REGULARIZADO: 'border-violet-200 bg-violet-50 text-violet-800',
  OBSERVADO: 'border-rose-200 bg-rose-50 text-rose-800',
  ANULADO: 'border-slate-300 bg-slate-100 text-slate-700',
  AL_DIA: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PROXIMO: 'border-amber-200 bg-amber-50 text-amber-800',
  VENCIDO: 'border-rose-200 bg-rose-50 text-rose-800',
  SIN_HOROMETRO: 'border-blue-200 bg-blue-50 text-blue-800',
  SIN_PLAN: 'border-slate-300 bg-slate-100 text-slate-700',
}

const textTones: Record<string, string> = {
  PENDIENTE: 'text-amber-700',
  EN_CURSO: 'text-sky-700',
  ESPERANDO_REPUESTO: 'text-orange-700',
  FINALIZADA_CON_PENDIENTE: 'text-violet-700',
  FINALIZADA: 'text-emerald-700',
  OPERATIVO: 'text-emerald-700',
  OPERATIVO_CON_PENDIENTE: 'text-violet-700',
  FUERA_DE_SERVICIO: 'text-rose-700',
  MANTENIMIENTO: 'text-sky-700',
  SOLICITADO: 'text-amber-700',
  DISPONIBLE: 'text-lime-700',
  ENTREGADO: 'text-slate-700',
  PENDIENTE_INICIO: 'text-amber-700',
  EN_JORNADA: 'text-sky-700',
  COMPLETO: 'text-emerald-700',
  SIN_INICIO: 'text-orange-700',
  SIN_CIERRE: 'text-orange-700',
  INCONSISTENCIA: 'text-rose-700',
  REGULARIZADO: 'text-violet-700',
  OBSERVADO: 'text-rose-700',
  ANULADO: 'text-slate-600',
  AL_DIA: 'text-emerald-700',
  PROXIMO: 'text-amber-700',
  VENCIDO: 'text-rose-700',
  SIN_HOROMETRO: 'text-blue-700',
  SIN_PLAN: 'text-slate-600',
}

export function StatusBadge({
  value,
  variant = 'badge',
  className,
}: {
  value?: string | null
  variant?: 'badge' | 'text'
  className?: string
}) {
  const label = value ? value.replaceAll('_', ' ') : 'Sin estado'

  if (variant === 'text') {
    return (
      <span
        className={cn(
          'inline-block text-xs font-bold leading-tight',
          value ? textTones[value] ?? 'text-slate-700' : 'text-slate-700',
          className,
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-md border px-2 py-1 text-xs font-semibold leading-tight',
        value ? tones[value] ?? 'border-slate-200 bg-slate-50 text-slate-700' : tones.ENTREGADO,
        className,
      )}
    >
      {label}
    </span>
  )
}
