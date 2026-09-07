import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, PackageCheck, PanelTop, TimerReset, Wrench } from 'lucide-react'
import { cn } from '../../../utils/cn'

const tabs = [
  { label: 'Resumen', to: '/taller', icon: PanelTop, end: true },
  { label: 'Órdenes', to: '/taller/ordenes', icon: ClipboardList },
  { label: 'Repuestos', to: '/taller/repuestos', icon: PackageCheck },
  { label: 'Preventivo', to: '/taller/preventivo', icon: TimerReset },
  { label: 'Backlog', to: '/taller/backlog', icon: Wrench },
  { label: 'Reportes', to: '/taller/reportes', icon: BarChart3 },
]

export function TallerNav() {
  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-slate-900 text-white'
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
