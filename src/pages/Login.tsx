import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input } from '../components/Input'
import { FLAG_SESSAO_EXPIRADA, useAuth } from '../context/AuthContext'

type Modo = 'entrar' | 'criar'

export function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()

  // useState: modo (entrar/criar conta) e campos do formulário
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [avisoSessao, setAvisoSessao] = useState(false)

  // Aviso de sessão expirada (flag gravada pelo AuthContext no 401).
  // Fica antes do return condicional para respeitar as regras de hooks.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG_SESSAO_EXPIRADA)) {
        sessionStorage.removeItem(FLAG_SESSAO_EXPIRADA)
        setAvisoSessao(true)
      }
    } catch {
      // armazenamento indisponível: segue sem aviso
    }
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  const criando = modo === 'criar'

  function trocarModo(novo: Modo) {
    setModo(novo)
    setErro(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (!email.includes('@')) {
      setErro('Informe um e-mail válido.')
      return
    }

    if (criando && nome.trim().length < 2) {
      setErro('Informe seu nome completo.')
      return
    }

    if (criando && senha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      if (criando) {
        await register(nome.trim(), email, senha)
      } else {
        await login(email, senha)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="page">
      <Header />

      <main className="auth">
        <div className="auth__card">
          <span className="auth__tag">{criando ? 'Criar conta' : 'Acesso do freelancer'}</span>
          <h1>{criando ? 'Crie sua conta' : 'Entrar na sua conta'}</h1>
          <p>
            {criando
              ? 'Cadastro no Neon Auth: use um e-mail e uma senha com 8 ou mais caracteres.'
              : 'Entre com o e-mail e a senha da sua conta.'}
          </p>

          {avisoSessao && (
            <p className="auth__notice" role="status">
              Sua sessão expirou. Entre novamente para continuar de onde parou.
            </p>
          )}

          <div className="auth__tabs" role="tablist" aria-label="Entrar ou criar conta">
            <button
              type="button"
              role="tab"
              aria-selected={!criando}
              className={`auth__tab${criando ? '' : ' auth__tab--ativo'}`}
              onClick={() => trocarModo('entrar')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={criando}
              className={`auth__tab${criando ? ' auth__tab--ativo' : ''}`}
              onClick={() => trocarModo('criar')}
            >
              Criar conta
            </button>
          </div>

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            {criando && (
              <Input
                label="Nome"
                type="text"
                name="nome"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
              />
            )}
            <Input
              label="E-mail"
              type="email"
              name="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label="Senha"
              type="password"
              name="senha"
              placeholder="••••••••"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              hint={criando ? 'Mínimo de 8 caracteres' : 'Use a senha da sua conta'}
              required
            />

            {!criando && (
              <p className="auth__forgot">
                <Link to="/esqueci-senha" className="auth__link">
                  Esqueci minha senha
                </Link>
              </p>
            )}

            {erro && <p className="auth__error">{erro}</p>}

            <Button type="submit" fullWidth disabled={enviando}>
              {enviando
                ? criando
                  ? 'Criando conta…'
                  : 'Entrando…'
                : criando
                  ? 'Criar conta'
                  : 'Entrar'}
            </Button>
          </form>

          <p className="auth__foot">
            {criando ? (
              <>
                Já tem conta?{' '}
                <button type="button" className="auth__link" onClick={() => trocarModo('entrar')}>
                  Entrar
                </button>
              </>
            ) : (
              <>
                Ainda não tem conta?{' '}
                <button type="button" className="auth__link" onClick={() => trocarModo('criar')}>
                  Criar agora
                </button>{' '}
                — é grátis e leva menos de 1 minuto.
              </>
            )}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
