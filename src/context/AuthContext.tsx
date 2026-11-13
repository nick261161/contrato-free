import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'
import { authClient, type UsuarioAuth } from '../services/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, senha: string) => Promise<void>
  register: (nome: string, email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
}

const LEGACY_STORAGE_KEY = 'contratofree.auth.user'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Converte o usuário do Neon Auth no formato exibido pelo app. */
function paraUsuario(usuario: UsuarioAuth): AuthUser {
  const nome = (usuario.name ?? '').trim()
  if (nome) return { nome, email: usuario.email }

  const base = usuario.email.split('@')[0].replace(/[._-]/g, ' ')
  return { nome: base.charAt(0).toUpperCase() + base.slice(1), email: usuario.email }
}

/** Extrai o usuário de `data` das chamadas { data, error } quando presente. */
function extrairUsuario(data: unknown): UsuarioAuth | null {
  const usuario = (data as { user?: UsuarioAuth | null } | null)?.user
  return usuario && usuario.email ? usuario : null
}

/** Traduz os erros comuns do Better Auth para PT-BR (mensagem específica). */
function mensagemDeErro(error: { message?: string; code?: string } | null | undefined): string {
  const texto = (error?.message ?? '').toLowerCase()

  if (texto.includes('invalid email or password') || texto.includes('invalid credential')) {
    return 'E-mail ou senha incorretos.'
  }
  if (texto.includes('user already exists') || texto.includes('already registered')) {
    return 'Já existe uma conta com este e-mail.'
  }
  if (texto.includes('password') && (texto.includes('at least') || texto.includes('minimum'))) {
    return 'A senha precisa ter no mínimo 8 caracteres.'
  }
  if (texto.includes('rate limit') || texto.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns segundos e tente novamente.'
  }

  return error?.message || 'Falha na autenticação. Tente novamente.'
}

/** Monta um Error com a mensagem traduzida (retorno { error } ou exceção HTTP). */
function erroDeAuth(err: unknown): Error {
  return new Error(mensagemDeErro(err as { message?: string; code?: string } | null))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restaura a sessão do Neon Auth ao carregar o app (sobrevive ao reload).
  useEffect(() => {
    let cancelado = false
    localStorage.removeItem(LEGACY_STORAGE_KEY) // sessão antiga em modo mock

    authClient
      .getSession()
      .then((resultado) => {
        if (cancelado) return
        const usuario = extrairUsuario(resultado?.data)
        if (usuario) setUser(paraUsuario(usuario))
      })
      .catch(() => {
        // offline ou sem sessão: continua deslogado
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  /** Sign in (Neon Auth → Better Auth). Lança Error com mensagem em PT-BR. */
  async function login(email: string, senha: string): Promise<void> {
    try {
      const resultado = await authClient.signIn.email({ email, password: senha })
      if (resultado.error) throw erroDeAuth(resultado.error)

      const usuario =
        extrairUsuario(resultado.data) ??
        extrairUsuario((await authClient.getSession()).data)
      if (!usuario) throw new Error('Não foi possível iniciar a sessão. Tente novamente.')

      setUser(paraUsuario(usuario))
    } catch (err) {
      throw erroDeAuth(err)
    }
  }

  /** Sign up (Neon Auth → Better Auth). A senha precisa ter 8+ caracteres. */
  async function register(nome: string, email: string, senha: string): Promise<void> {
    try {
      const resultado = await authClient.signUp.email({
        name: nome,
        email,
        password: senha,
      })
      if (resultado.error) throw erroDeAuth(resultado.error)

      const usuario =
        extrairUsuario(resultado.data) ??
        extrairUsuario((await authClient.getSession()).data)
      if (!usuario) {
        throw new Error('Conta criada, mas a sessão não iniciou. Entre para continuar.')
      }

      setUser(paraUsuario(usuario))
    } catch (err) {
      throw erroDeAuth(err)
    }
  }

  /** Sign out (Neon Auth → Better Auth). A UI sai mesmo sem rede. */
  async function logout(): Promise<void> {
    try {
      await authClient.signOut()
    } catch {
      // sem conexão: encerra a sessão local mesmo assim
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
