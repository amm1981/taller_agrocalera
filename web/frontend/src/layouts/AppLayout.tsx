import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  CarFront,
  ChevronDown,
  Factory,
  Gauge,
  Home,
  Layers3,
  LogOut,
  MapPinned,
  Menu,
  ClipboardList,
  SlidersHorizontal,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Tag,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { cn } from '../utils/cn'

const masterNavigation = [
  { label: 'Vehículos', icon: CarFront, to: '/maestros?tab=vehiculos', tab: 'vehiculos' },
  { label: 'Personal', icon: UserRound, to: '/maestros?tab=personal', tab: 'personal' },
  { label: 'Tipos personal', icon: Users, to: '/maestros?tab=tipos-personal', tab: 'tipos-personal' },
  { label: 'Gerencias', icon: Building2, to: '/maestros?tab=gerencias', tab: 'gerencias' },
  { label: 'Sedes', icon: Factory, to: '/maestros?tab=sedes', tab: 'sedes' },
  { label: 'Fundos', icon: MapPinned, to: '/maestros?tab=fundos', tab: 'fundos' },
  { label: 'Sectores', icon: Layers3, to: '/maestros?tab=sectores', tab: 'sectores' },
  { label: 'Lotes', icon: Tag, to: '/maestros?tab=lotes', tab: 'lotes' },
  { label: 'Tipos vehículo', icon: Wrench, to: '/maestros?tab=tipos-vehiculo', tab: 'tipos-vehiculo' },
  { label: 'Tipos falla', icon: Wrench, to: '/maestros?tab=tipos-falla', tab: 'tipos-falla' },
]

const horometrosNavigation = [
  { label: 'Dashboard', icon: ChartNoAxesCombined, to: '/horometros', key: 'dashboard' },
  { label: 'Registros', icon: ClipboardList, to: '/horometros/registros', key: 'registros' },
  { label: 'Validaciones', icon: ShieldCheck, to: '/horometros/validaciones', key: 'validaciones' },
  { label: 'Configuración', icon: SlidersHorizontal, to: '/horometros/configuracion', key: 'configuracion' },
]

const usuariosNavigation = [
  { label: 'Usuarios', icon: Users, to: '/usuarios', key: 'usuarios' },
  { label: 'Usuarios aplicativo', icon: Smartphone, to: '/usuarios/aplicativo', key: 'usuarios-aplicativo' },
  { label: 'Roles', icon: ShieldCheck, to: '/usuarios/roles', key: 'roles' },
]

const navigation = [
  { label: 'Inicio', icon: Home, to: '/' },
  { label: 'Taller', icon: Wrench, to: '/taller' },
  { label: 'Horómetros', icon: Gauge, to: '/horometros', children: horometrosNavigation },
  { label: 'Maestros', icon: ShieldCheck, to: '/maestros?tab=vehiculos', children: masterNavigation },
  { label: 'Usuarios', icon: Users, to: '/usuarios', children: usuariosNavigation },
  { label: 'Configuración', icon: Settings, to: '/configuracion' },
]

type AppLayoutProps = {
  children: ReactNode
  title?: string
  description?: string
}

export function AppLayout({
  children,
  title = 'Inicio',
  description = 'Estado general de la plataforma',
}: AppLayoutProps) {
  const { session, logout } = useAuth()
  const location = useLocation()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const initials = (session?.user.name ?? 'Juan Andrade')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  useEffect(() => {
    if (!sidebarExpanded) {
      return
    }

    const activeParent = navigation.find((item) => {
      if (!item.children) {
        return false
      }

      const itemPath = item.to.split('?')[0]

      return itemPath === '/horometros'
        ? location.pathname.startsWith('/horometros')
        : itemPath === '/maestros'
          ? location.pathname === '/maestros'
          : location.pathname.startsWith(itemPath)
    })?.label ?? null

    setOpenMenu(activeParent)
  }, [location.pathname, sidebarExpanded])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 hidden border-r border-[#315f3c] bg-[#14502d] shadow-sm transition-[width] duration-200 lg:block',
          sidebarExpanded ? 'w-[260px]' : 'w-20',
        )}
      >
        <div className={cn('flex h-20 items-center border-b border-white/10 px-4', sidebarExpanded ? 'justify-between gap-3' : 'justify-center')}>
          {sidebarExpanded ? (
            <img
              className="h-auto max-h-12 w-44 object-contain object-left"
              src="/assets/logos_Taller-19.webp"
              alt="Taller AgroCalera"
            />
          ) : null}
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#edebdd] transition hover:bg-white/10"
            onClick={() => {
              setSidebarExpanded((current) => {
                if (current) {
                  setOpenMenu(null)
                }

                return !current
              })
            }}
            aria-label={sidebarExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'}
            title={sidebarExpanded ? 'Contraer menú' : 'Expandir menú'}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="max-h-[calc(100vh-164px)] space-y-1.5 overflow-y-auto p-3 pr-2">
          {navigation.map((item) => {
            const isMaestros = item.label === 'Maestros'
            const isHorometros = item.label === 'Horómetros'
            const itemPath = item.to.split('?')[0]
            const isActive = isMaestros
              ? location.pathname === '/maestros'
              : isHorometros
                ? location.pathname.startsWith('/horometros')
              : itemPath === '/' ? location.pathname === '/' : location.pathname.startsWith(itemPath)
            const isOpen = openMenu === item.label

            return (
              <div key={item.label}>
                {item.children ? (
                  <button
                    type="button"
                    className={cn(
                      'flex h-10 w-full items-center rounded-lg text-sm text-white transition-colors',
                      sidebarExpanded ? 'gap-3 px-3' : 'justify-center px-0',
                      isActive ? 'bg-white/20 font-black' : 'font-bold hover:bg-white/10',
                    )}
                    onClick={() => {
                      if (!sidebarExpanded) {
                        setSidebarExpanded(true)
                      }

                      setOpenMenu((current) => (current === item.label ? null : item.label))
                    }}
                    aria-expanded={sidebarExpanded ? isOpen : undefined}
                    title={sidebarExpanded ? undefined : item.label}
                  >
                    <item.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#edebdd]" />
                    {sidebarExpanded ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-left text-white">{item.label}</span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#edebdd] transition-transform', isOpen ? 'rotate-180' : '')} aria-hidden="true" />
                      </>
                    ) : null}
                  </button>
                ) : (
                  <Link
                    to={item.to}
                    onClick={() => setOpenMenu(null)}
                    className={cn(
                      'flex h-10 items-center rounded-lg text-sm text-white transition-colors',
                      sidebarExpanded ? 'gap-3 px-3' : 'justify-center px-0',
                      isActive ? 'bg-white/20 font-black' : 'font-bold hover:bg-white/10',
                    )}
                    title={sidebarExpanded ? undefined : item.label}
                  >
                    <item.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#edebdd]" />
                    {sidebarExpanded ? <span className="truncate text-white">{item.label}</span> : null}
                  </Link>
                )}

                {sidebarExpanded && item.children && isOpen ? (
                  <div className="mt-1.5 space-y-1 border-l border-white/15 pl-3">
                    {item.children.map((child) => {
                      const params = new URLSearchParams(location.search)
                      const activeTab = params.get('tab') ?? 'vehiculos'
                      const childTab = 'tab' in child ? child.tab : undefined
                      const isChildActive = isMaestros
                        ? location.pathname === '/maestros' && activeTab === childTab
                        : child.to === item.to
                          ? location.pathname === child.to
                          : location.pathname.startsWith(child.to)

                      return (
                        <Link
                          key={child.label}
                          to={child.to}
                          onClick={() => setOpenMenu(item.label)}
                          className={cn(
                            'flex h-8 items-center gap-2 rounded-md px-2 text-xs text-white transition-colors',
                            isChildActive ? 'bg-white/20 font-black' : 'font-semibold hover:bg-white/10',
                          )}
                        >
                          <child.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#edebdd]" />
                          <span className="truncate text-white">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-5 border-t border-white/10 pt-4">
          <div className={cn('flex items-center', sidebarExpanded ? 'gap-3' : 'flex-col gap-2')}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-black text-white ring-1 ring-white/10">
              {initials}
            </div>
            {sidebarExpanded ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-white">{session?.user.name ?? 'Usuario'}</div>
                <div className="truncate text-xs font-semibold text-[#edebdd]">{session?.roles[0] ?? 'Sin rol'}</div>
              </div>
            ) : null}
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#edebdd] transition hover:bg-white/10"
              onClick={() => void logout()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className={cn('transition-[padding] duration-200', sidebarExpanded ? 'lg:pl-[260px]' : 'lg:pl-20')}>
        <header className="sticky top-0 z-10 grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6 xl:grid-cols-[1fr_300px_auto]">
          <div>
            <h1 className="text-xl font-black leading-tight text-slate-950">{title}</h1>
            <p className="text-xs font-medium text-slate-500">{description}</p>
          </div>
          <label className="hidden h-10 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500 xl:flex">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input className="min-w-0 flex-1 border-0 bg-transparent text-slate-700 outline-none placeholder:text-slate-400" placeholder="Buscar..." />
          </label>
          <button
            type="button"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm md:flex"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[11px] font-black text-white">3</span>
          </button>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 lg:hidden">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? 'inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-bold text-emerald-800'
                  : 'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600'
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-[1540px] px-4 py-5 md:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
