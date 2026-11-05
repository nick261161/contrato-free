import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/novo-contrato', label: 'Novo contrato', icon: '✎' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/perfil', label: 'Perfil & Termos', icon: '⚙' },
]

export function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar__profile">
        <div className="sidebar__avatar">{user?.nome?.charAt(0)?.toUpperCase() ?? 'U'}</div>
        <div>
          <strong>{user?.nome ?? 'Visitante'}</strong>
          <span>{user?.email ?? 'sem sessão'}</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
          >
            <span className="sidebar__icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__tip">
        <strong>Dica</strong>
        Preencha seu perfil para que os contratos já nasçam com seus termos padrão.
      </div>
    </aside>
  )
}
