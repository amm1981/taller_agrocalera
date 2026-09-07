import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardCheck, Gauge, ListChecks, TriangleAlert } from 'lucide-react'
import { cn } from '../../../utils/cn'

const tabs = [
  { label: 'Balance', to: '/horometros', icon: Gauge, end: true },
  { label: 'Registros', to: '/horometros/registros', icon: ListChecks },
  { label: 'Pendientes', to: '/horometros/pendientes', icon: ClipboardCheck },
  { label: 'Validaciones', to: '/horometros/validaciones', icon: TriangleAlert },
  { label: 'Reportes', to: '/horometros/reportes', icon: BarChart3 },
]

export function HorometrosNav() {
  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                : 'text-slate-600 hover:bg-white hover:text-slate-950',
            )
          }
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
