import { useEffect, useState } from 'react'
import { FilePlus2, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { getShopSettings } from '../lib/data'
import { isDemoMode, signOut } from '../lib/supabase'
import type { ShopSettings } from '../types'
import { AppFooter } from './AppFooter'
import { Loading } from './ui'

interface AdminContextValue {
  shop: ShopSettings
  refreshShop: () => Promise<void>
}

function Brand({ shop }: { shop: ShopSettings }) {
  return (
    <div className="brand">
      {shop.logoDataUrl ? (
        <img src={shop.logoDataUrl} alt="" className="brand__logo" />
      ) : (
        <span className="brand__mark" aria-hidden="true">{shop.nomeFantasia.trim().charAt(0).toUpperCase() || 'L'}</span>
      )}
      <span>
        <strong>{shop.nomeFantasia}</strong>
      </span>
    </div>
  )
}

export function AdminLayout() {
  const [shop, setShop] = useState<ShopSettings | null>(null)

  const refreshShop = async () => setShop(await getShopSettings())

  useEffect(() => {
    void refreshShop()
  }, [])

  useEffect(() => {
    if (shop?.nomeFantasia) document.title = shop.nomeFantasia
  }, [shop?.nomeFantasia])

  if (!shop) return <Loading label="Preparando o painel…" />

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Brand shop={shop} />
        <nav aria-label="Navegação principal">
          <NavLink to="/" end><LayoutDashboard aria-hidden="true" /> Painel</NavLink>
          <NavLink to="/nova"><FilePlus2 aria-hidden="true" /> Nova ATPV</NavLink>
          <NavLink to="/configuracoes"><Settings aria-hidden="true" /> Configurações</NavLink>
        </nav>
        <div className="sidebar__footer">
          {isDemoMode ? <span className="demo-pill">Modo demonstração</span> : null}
          {!isDemoMode ? (
            <button className="button button--ghost button--small" onClick={() => void signOut()}>
              <LogOut aria-hidden="true" /> Sair
            </button>
          ) : null}
          <small>Horário de Fortaleza</small>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main__content">
          {isDemoMode ? (
            <div className="demo-banner">
              Os dados desta demonstração ficam somente neste navegador. O Supabase será conectado antes da publicação.
            </div>
          ) : null}
          <Outlet context={{ shop, refreshShop } satisfies AdminContextValue} />
        </div>
        <AppFooter />
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal no celular">
        <NavLink to="/" end><LayoutDashboard aria-hidden="true" /><span>Painel</span></NavLink>
        <NavLink to="/nova"><FilePlus2 aria-hidden="true" /><span>Nova</span></NavLink>
        <NavLink to="/configuracoes"><Settings aria-hidden="true" /><span>Ajustes</span></NavLink>
      </nav>
    </div>
  )
}

export function useAdminContext(): AdminContextValue {
  return useOutletContext<AdminContextValue>()
}
