import Link from 'next/link'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <nav className="border-b border-neutral-800/60">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-bold tracking-tight">Lokiq</span>
          <div className="flex items-center gap-4">
            <Link href="/search" className="text-xs font-medium text-neutral-400 hover:text-neutral-100 transition-colors">
              Pesquisa
            </Link>
            <Link href="/leads" className="text-xs font-medium text-neutral-400 hover:text-neutral-100 transition-colors">
              Pipeline
            </Link>
            <Link href="/blocked" className="text-xs font-medium text-neutral-400 hover:text-neutral-100 transition-colors">
              Bloqueados
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
