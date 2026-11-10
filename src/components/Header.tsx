import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark">§</span>
          Contrato<span className="brand__accent">Free</span>
        </Link>

        <nav className="header__nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Início
          </NavLink>
          {user && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/novo-contrato"
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                Novo contrato
              </NavLink>
              <NavLink
                to="/clientes"
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                Clientes
              </NavLink>
              <NavLink
                to="/perfil"
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                Perfil
              </NavLink>
            </>
          )}
        </nav>

        <div className="header__actions">
          {user ? (
            <>
              <span className="header__user">Olá, {user.nome}</span>
              <Button variant="ghost" onClick={logout}>
                Sair
              </Button>
            </>
          ) : (
            <Link to="/login" className="btn btn--primary">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
