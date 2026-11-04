import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'contratofree.auth.user'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // useEffect: restaura a sessão salva no localStorage ao carregar o app
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setUser(JSON.parse(saved) as AuthUser)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  async function login(email: string, senha: string): Promise<void> {
    // Simulação de POST /auth/login — troque por uma chamada real ao backend:
    // const res = await request<{ user: AuthUser }>('/auth/login', { ... })
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (senha.length < 4) {
      throw new Error('Senha inválida (mínimo de 4 caracteres).')
    }

    const nome = email.split('@')[0].replace(/[._-]/g, ' ')
    const logged: AuthUser = {
      nome: nome.charAt(0).toUpperCase() + nome.slice(1),
      email,
    }

    setUser(logged)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logged))
  }

  function logout(): void {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook global de autenticação (useContext)
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.')
  }
  return context
}
