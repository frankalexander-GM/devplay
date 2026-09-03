'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Compass,
  Sparkles,
  MessageCircle,
  Video,
  FileText,
  Gamepad2,
  Plus,
  X,
  Heart,
  TrendingUp,
  Flame,
  Bookmark,
  Library,
  HelpCircle,
  Info,
  Award,
  Users,
  Home,
  BarChart3,
  ShoppingBag,
  Settings2,
  RotateCcw,
} from 'lucide-react'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'
import { UserAvatar, UserTags } from '@/components/devplay/shared/shared'
import type { ViewId } from '@/types/devplay'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface NavItem {
  id: ViewId
  label: string
  description: string
  icon: typeof Compass
  gradient: string
}

const MAIN_NAV: NavItem[] = [
  { id: 'explore', label: 'Inicio', description: 'Feed principal', icon: Home, gradient: 'from-wine-400 to-wine-500' },
  { id: 'discover', label: 'Descubrir', description: 'Novedades y trending', icon: Sparkles, gradient: 'from-wine-400 to-wine-500' },
  { id: 'betas', label: 'Betas', description: 'Centro de betas', icon: Gamepad2, gradient: 'from-amber-400 to-bronze-500' },
  { id: 'videos', label: 'Videos', description: 'Gameplays y trailers', icon: Video, gradient: 'from-wine-400 to-sepia-500' },
  { id: 'chat', label: 'Chat Mundial', description: 'Chatea con la comunidad', icon: MessageCircle, gradient: 'from-amber-400 to-bronze-500' },
  { id: 'store', label: 'Tienda', description: 'Power-ups, avatar y premium', icon: ShoppingBag, gradient: 'from-bronze-400 to-bronze-600' },
]

// Vistas rápidas de comunidad (filtros del feed)
const COMMUNITY_ITEMS = [
  { id: 'trending' as const, label: 'Trending', desc: 'Lo más popular', icon: Flame, gradient: 'from-wine-400 to-bronze-400' },
  { id: 'betas' as const, label: 'Betas', desc: 'Solo betas', icon: Gamepad2, gradient: 'from-amber-400 to-bronze-500' },
  { id: 'devs' as const, label: 'Devs', desc: 'Desarrolladores top', icon: Users, gradient: 'from-wine-400 to-wine-400' },
]

export function Sidebar() {
  const {
    currentView,
    setView,
    openProfile,
    openCreatePost,
    openCreateBeta,
    openCreatePoll,
    mobileSidebarOpen,
    closeMobileSidebar,
    onboardingDone,
    setOnboardingDone,
  } = useUIStore()
  const { user, isAuthed, isGuest } = useCurrentUser()

  const canCreate = isAuthed && !isGuest

  const { sidebarCompact, hideCommunity, hideHelp } = useUIStore()

  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Al hacer clic en un filtro de comunidad, vamos a explore y mostramos toast
  function handleCommunityClick(id: string) {
    setActiveFilter(id)
    setView('explore')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand en móvil */}
      <div className="flex items-center justify-between px-4 py-4 lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/logo-devplay.png" alt="DevPlay" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-display font-bold text-lg tracking-tight text-foreground">DevPlay</span>
        </div>
        <Button variant="ghost" size="icon" onClick={closeMobileSidebar} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className={cn('flex-1 px-3 py-2 overflow-y-auto custom-scroll', sidebarCompact ? 'space-y-3' : 'space-y-4')}>
        {/* ===== Sección 1: Menú Principal (+ opciones del sidebar) ===== */}
        <div>
          <div className="flex items-center justify-between pr-1.5">
            <SectionTitle>Menú principal</SectionTitle>
            <SidebarOptionsButton />
          </div>
          <div className="space-y-1">
            {MAIN_NAV.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={currentView === item.id}
                compact={sidebarCompact}
                onClick={() => { setView(item.id); setActiveFilter(null) }}
              />
            ))}
          </div>
        </div>

        {/* ===== Sección 2: Comunidad (filtros rápidos) — ocultable ===== */}
        {!hideCommunity && (
        <div>
          <SectionTitle>Comunidad</SectionTitle>
          <div className="space-y-1">
            {COMMUNITY_ITEMS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCommunityClick(c.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-all',
                  sidebarCompact ? 'py-1.5' : 'py-2',
                  activeFilter === c.id
                    ? 'nav-active shadow-sm'
                    : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'
                )}
              >
                <span className={cn(
                  'flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition',
                  sidebarCompact ? 'h-7 w-7' : 'h-8 w-8',
                  c.gradient
                )}>
                  <c.icon className={sidebarCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold">{c.label}</div>
                  {!sidebarCompact && <div className="truncate text-[10px] text-muted-foreground">{c.desc}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* ===== Sección 3: Crear (logueados) ===== */}
        {canCreate && (
          <div>
            <SectionTitle>Crear contenido</SectionTitle>
            <div className="space-y-1">
              <CreateButton icon={FileText} label="Nueva publicación" gradient="from-wine-400 to-wine-500" compact={sidebarCompact} onClick={openCreatePost} />
              <CreateButton icon={Gamepad2} label="Subir beta" gradient="from-amber-400 to-bronze-500" compact={sidebarCompact} onClick={openCreateBeta} />
              <CreateButton icon={Video} label="Subir video" gradient="from-wine-400 to-sepia-500" compact={sidebarCompact} onClick={openCreatePost} />
              <CreateButton icon={BarChart3} label="Crear encuesta" gradient="from-olive-400 to-sepia-500" compact={sidebarCompact} onClick={openCreatePoll} />
            </div>
          </div>
        )}

        {/* ===== Sección 4: Biblioteca (logueados) ===== */}
        {canCreate && (
          <div>
            <SectionTitle>Mi biblioteca</SectionTitle>
            <div className="space-y-1">
              <CreateButton icon={Bookmark} label="Guardados" gradient="from-amber-400 to-bronze-500" compact={sidebarCompact} onClick={() => user && openProfile(user.id, 'favoritos')} />
              <CreateButton icon={Library} label="Mis betas" gradient="from-wine-400 to-wine-500" compact={sidebarCompact} onClick={() => user && openProfile(user.id, 'publicaciones')} />
              <CreateButton icon={Award} label="Logros" gradient="from-wine-400 to-bronze-500" compact={sidebarCompact} onClick={() => user && openProfile(user.id, 'logros')} />
            </div>
          </div>
        )}

        {/* ===== Sección 5: Ayuda — ocultable ===== */}
        {!hideHelp && (
        <div>
          <SectionTitle>Ayuda</SectionTitle>
          <div className="space-y-1">
            <CreateButton
              icon={HelpCircle}
              label="Tour guiado"
              gradient="from-wine-400 to-bronze-500"
              compact={sidebarCompact}
              onClick={() => {
                setOnboardingDone(false)
                toast.success('Recargando para mostrar el tour...')
                setTimeout(() => window.location.reload(), 800)
              }}
            />
            <CreateButton
              icon={Info}
              label="Acerca de DevPlay"
              gradient="from-slate-400 to-gray-500"
              compact={sidebarCompact}
              onClick={() => setView('about')}
            />
          </div>
        </div>
        )}
      </nav>

      {/* Card de bienvenida para invitados */}
      {!canCreate && (
        <div className="px-3 pb-3">
          <div className="card-rose rounded-lg p-4 text-center">
            <Heart className="mx-auto mb-2 h-6 w-6 text-wine-400" />
            <p className="text-xs text-muted-foreground">
              Únete a DevPlay para comentar, dar like y seguir a tus devs favoritos
            </p>
          </div>
        </div>
      )}

      {/* Usuario abajo */}
      {user && (
        <div className="border-t border-border/50 p-3">
          <button
            onClick={() => openProfile(user.id)}
            className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-secondary/60 transition"
          >
            <UserAvatar username={user.username} avatar={user.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user.username}</span>
              {user.tags && user.tags.length > 0 ? (
                <UserTags tags={user.tags} size="xs" max={2} className="mt-0.5" />
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {user.isGuest ? 'Modo invitado' : 'Ver perfil'}
                </p>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Footer — sello de la gaceta */}
      <div className="border-t border-border/50 px-4 py-4 text-center">
        <div className="rule-ornate opacity-50 mb-2.5">
          <span className="text-[8px]">◆</span>
        </div>
        <p className="label-caps !text-[9px] mb-1">Gaceta DevPlay</p>
        <p className="text-[10px] text-muted-foreground">
          Est. 2025 · Hecho con 💗
        </p>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex w-56 shrink-0 flex-col sticky top-16 h-[calc(100vh-4rem)] glass border-r border-border/50">
        {sidebarContent}
      </aside>

      <MobileDrawer
        open={mobileSidebarOpen}
        onClose={closeMobileSidebar}
        currentView={currentView}
        user={user}
        isAuthed={isAuthed}
        isGuest={isGuest}
        canCreate={canCreate}
        activeFilter={activeFilter}
        setView={setView}
        setActiveFilter={setActiveFilter}
        openProfile={openProfile}
        openCreatePost={openCreatePost}
        openCreateBeta={openCreateBeta}
        openCreatePoll={openCreatePoll}
        openAuth={useUIStore.getState().openAuth}
        setOnboardingDone={setOnboardingDone}
      />
    </>
  )
}

// ===== Drawer Móvil Rediseñado =====
interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  currentView: ViewId
  user: any
  isAuthed: boolean
  isGuest: boolean
  canCreate: boolean
  activeFilter: string | null
  setView: (v: ViewId) => void
  setActiveFilter: (s: string | null) => void
  openProfile: (id: string) => void
  openCreatePost: () => void
  openCreateBeta: () => void
  openCreatePoll: () => void
  openAuth: (mode?: 'login' | 'register') => void
  setOnboardingDone: (v: boolean) => void
}

function MobileDrawer({
  open, onClose, currentView, user, isAuthed, isGuest, canCreate,
  activeFilter, setView, setActiveFilter, openProfile,
  openCreatePost, openCreateBeta, openCreatePoll, openAuth, setOnboardingDone,
}: MobileDrawerProps) {
  function handleNav(view: ViewId) {
    setView(view)
    setActiveFilter(null)
    onClose()
  }

  function handleCommunity(id: string) {
    setActiveFilter(id)
    setView('explore')
    onClose()
  }

  const { hideCommunity, hideHelp } = useUIStore()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay con blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed left-0 top-0 z-50 flex h-full w-[88vw] max-w-sm flex-col glass-strong lg:hidden"
          >
            {/* Header con perfil destacado */}
            <div className="relative overflow-hidden border-b border-border/50">
              {/* Fondo gradiente */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />

              <div className="relative p-4 pb-3">
                {/* Logo + opciones + cerrar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <img src="/logo-devplay.png" alt="DevPlay" className="h-8 w-8 rounded-lg object-cover" />
                    <span className="font-display font-bold text-lg tracking-tight text-foreground">DevPlay</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <SidebarOptionsButton />
                    <button
                      onClick={onClose}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary/60 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Perfil de usuario */}
                {user ? (
                  <button
                    onClick={() => { openProfile(user.id); onClose() }}
                    className="flex w-full items-center gap-3 rounded-lg bg-secondary/40 p-3 text-left hover:bg-secondary/60 transition"
                  >
                    <UserAvatar username={user.username} avatar={user.avatar} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{user.username}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {isGuest ? 'Modo invitado' : 'Ver mi perfil'}
                      </p>
                      {user.tags && user.tags.length > 0 && (
                        <UserTags tags={user.tags} size="xs" max={2} className="mt-1" />
                      )}
                    </div>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { openAuth('login'); onClose() }}
                      className="btn-gradient-primary flex-1 rounded-sm py-2 text-xs font-bold"
                    >
                      Entrar
                    </button>
                    <button
                      onClick={() => { openAuth('register'); onClose() }}
                      className="flex-1 rounded-full border border-border py-2 text-xs font-bold hover:bg-secondary/60 transition"
                    >
                      Crear cuenta
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto custom-scroll px-3 py-3 space-y-4">
              {/* Accesos rápidos — grid de 2x2 */}
              {canCreate && (
                <div>
                  <SectionTitle>Crear</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <QuickAction icon={FileText} label="Publicar" gradient="from-wine-400 to-wine-500" onClick={() => { openCreatePost(); onClose() }} />
                    <QuickAction icon={Gamepad2} label="Beta" gradient="from-amber-400 to-bronze-500" onClick={() => { openCreateBeta(); onClose() }} />
                    <QuickAction icon={Video} label="Video" gradient="from-wine-400 to-sepia-500" onClick={() => { openCreatePost(); onClose() }} />
                    <QuickAction icon={BarChart3} label="Encuesta" gradient="from-olive-400 to-sepia-500" onClick={() => { openCreatePoll(); onClose() }} />
                  </div>
                </div>
              )}

              {/* Navegación principal */}
              <div>
                <SectionTitle>Navegación</SectionTitle>
                <div className="space-y-1">
                  {MAIN_NAV.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <MobileNavItem
                        item={item}
                        active={currentView === item.id}
                        onClick={() => handleNav(item.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Comunidad — ocultable desde opciones */}
              {!hideCommunity && (
              <div>
                <SectionTitle>Comunidad</SectionTitle>
                <div className="space-y-1">
                  {COMMUNITY_ITEMS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCommunity(c.id)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                        activeFilter === c.id
                          ? 'nav-active shadow-sm'
                          : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'
                      )}
                    >
                      <span className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition',
                        c.gradient
                      )}>
                        <c.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm font-semibold">{c.label}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Biblioteca */}
              {canCreate && (
                <div>
                  <SectionTitle>Mi biblioteca</SectionTitle>
                  <div className="grid grid-cols-3 gap-2">
                    <LibraryMini icon={Bookmark} label="Guardados" gradient="from-amber-400 to-bronze-500" onClick={() => { if (user) { openProfile(user.id, 'favoritos'); onClose() } }} />
                    <LibraryMini icon={Library} label="Mis betas" gradient="from-wine-400 to-wine-500" onClick={() => { if (user) { openProfile(user.id, 'publicaciones'); onClose() } }} />
                    <LibraryMini icon={Award} label="Logros" gradient="from-wine-400 to-bronze-500" onClick={() => { if (user) { openProfile(user.id, 'logros'); onClose() } }} />
                  </div>
                </div>
              )}

              {/* Ayuda — ocultable desde opciones */}
              {!hideHelp && (
              <div>
                <SectionTitle>Ayuda</SectionTitle>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setOnboardingDone(false)
                      toast.success('Recargando para mostrar el tour...')
                      setTimeout(() => window.location.reload(), 800)
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary/60 transition"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary from-wine-400 to-bronze-500">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-sm">Tour guiado</span>
                  </button>
                  <button
                    onClick={() => { setView('about'); onClose() }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary/60 transition"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary from-slate-400 to-gray-500">
                      <Info className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-sm">Acerca de</span>
                  </button>
                </div>
              </div>
              )}
            </div>

            {/* Footer — CTA para invitados */}
            {!canCreate && (
              <div className="border-t border-border/50 p-3">
                <div className="card-rose rounded-lg p-3 text-center">
                  <Heart className="mx-auto mb-1.5 h-5 w-5 text-wine-400" />
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Únete para comentar, dar like y seguir devs
                  </p>
                  <button
                    onClick={() => { openAuth('register'); onClose() }}
                    className="btn-gradient-primary w-full rounded-sm py-2 text-xs font-bold"
                  >
                    Crear cuenta gratis
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ===== Item de navegación móvil (más grande y claro) =====
function MobileNavItem({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-all',
        active
          ? 'nav-active shadow-sm'
          : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition',
          item.gradient,
          !active && 'opacity-80 group-hover:opacity-100'
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-semibold text-sm">{item.label}</div>
        <div className="truncate text-[10px] text-muted-foreground">{item.description}</div>
      </div>
      {active && (
        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  )
}

// ===== Acción rápida (grid 2x2) =====
function QuickAction({ icon: Icon, label, gradient, onClick }: { icon: typeof Plus; label: string; gradient: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 rounded-md bg-secondary/40 p-3 hover:bg-secondary/70 transition"
    >
      <span className={cn(
        'flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm transition group-hover:scale-110',
        gradient
      )}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  )
}

// ===== Biblioteca mini (grid 3 cols) =====
function LibraryMini({ icon: Icon, label, gradient, onClick }: { icon: typeof Plus; label: string; gradient: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1 rounded-md bg-secondary/40 p-2.5 hover:bg-secondary/70 transition"
    >
      <span className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white transition group-hover:scale-110',
        gradient
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[9px] font-semibold text-center leading-tight">{label}</span>
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="label-caps flex items-center gap-2 px-3 pb-1.5 pt-1">
      <span className="inline-block h-px w-3 bg-wine-500/70" />
      {children}
    </p>
  )
}

function NavButton({ item, active, onClick, compact }: { item: NavItem; active: boolean; onClick: () => void; compact?: boolean }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-all',
        compact ? 'py-1.5' : 'py-2.5',
        active
          ? 'nav-active shadow-sm'
          : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition',
          compact ? 'h-7 w-7' : 'h-9 w-9',
          item.gradient,
          !active && 'opacity-80 group-hover:opacity-100'
        )}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-semibold">{item.label}</div>
        {!compact && <div className="truncate text-[10px] text-muted-foreground">{item.description}</div>}
      </div>
    </button>
  )
}

function CreateButton({
  icon: Icon,
  label,
  gradient,
  onClick,
  compact,
}: {
  icon: typeof Plus
  label: string
  gradient: string
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-secondary/60 transition',
        compact ? 'py-1' : 'py-2'
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition',
          compact ? 'h-7 w-7' : 'h-8 w-8',
          gradient
        )}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </span>
      <span className="font-semibold text-sm">{label}</span>
    </button>
  )
}

// ===== Botón de opciones del sidebar (⋯) =====
function SidebarOptionsButton() {
  const {
    sidebarCompact, setSidebarCompact,
    hideCommunity, setHideCommunity,
    hideHelp, setHideHelp,
    resetSidebarPrefs,
  } = useUIStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Opciones del sidebar"
          aria-label="Opciones del sidebar"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-md">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
          <Settings2 className="h-3 w-3" />
          Opciones del sidebar
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={sidebarCompact}
          onCheckedChange={(v) => setSidebarCompact(v === true)}
          onSelect={(e) => e.preventDefault()}
          className="gap-2 rounded-lg text-xs"
        >
          Modo compacto
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hideCommunity}
          onCheckedChange={(v) => setHideCommunity(v === true)}
          onSelect={(e) => e.preventDefault()}
          className="gap-2 rounded-lg text-xs"
        >
          Ocultar sección Comunidad
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hideHelp}
          onCheckedChange={(v) => setHideHelp(v === true)}
          onSelect={(e) => e.preventDefault()}
          className="gap-2 rounded-lg text-xs"
        >
          Ocultar sección Ayuda
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            resetSidebarPrefs()
            toast.success('Sidebar restablecido')
          }}
          className="gap-2 rounded-lg text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restablecer todo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
