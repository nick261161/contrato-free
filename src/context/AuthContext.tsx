import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'
import {
  authClient,
  definirTokenSessao,
  EVENTO_SESSAO_EXPIRADA,
  mensagemDeErro,
  type UsuarioAuth,
} from '../services/auth'

/** Flag lida pela tela de login para avisar "sua sessão expirou". */
export const FLAG_SESSAO_EXPIRADA = 'contratofree.sessao-expirada'

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

/**
 * Extrai o token de sessão do corpo do sign-in/sign-up do Better Auth
 * (`{ token, user }`). Guardado como reserva pelo request() da API enquanto o
 * SDK ainda não devolve a sessão via getSession().
 */
function extrairToken(data: unknown): string | null {
  const token = (data as { token?: unknown } | null | undefined)?.token
  return typeof token === 'string' && token.length > 0 ? token : null
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

  // Sessão rejeitada pela API (401): encerra a sessão na UI.
  // O ProtectedRoute leva para /login e a tela exibe o aviso (flag).
  // Só age quando havia usuário logado — chamada de página pública
  // (ex.: /assinar sem sessão) não pode gerar aviso espúrio.
  useEffect(() => {
    function sessaoExpirada() {
      if (!user) return
      setUser(null)
      try {
        sessionStorage.setItem(FLAG_SESSAO_EXPIRADA, '1')
      } catch {
        // armazenamento indisponível: segue sem aviso
      }
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, sessaoExpirada)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, sessaoExpirada)
  }, [user])

  /** Sign in (Neon Auth → Better Auth). Lança Error com mensagem em PT-BR. */
  async function login(email: string, senha: string): Promise<void> {
    try {
      const resultado = await authClient.signIn.email({ email, password: senha })
      if (resultado.error) throw erroDeAuth(resultado.error)
      definirTokenSessao(extrairToken(resultado.data))

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
      definirTokenSessao(extrairToken(resultado.data))

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
    definirTokenSessao(null)
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
