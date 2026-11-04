import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input } from '../components/Input'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  // useState: controla os campos do formulário e o estado de erro/envio
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (!email.includes('@')) {
      setErro('Informe um e-mail válido.')
      return
    }

    setEnviando(true)
    try {
      await login(email, senha)
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
          <span className="auth__tag">Acesso do freelancer</span>
          <h1>Entrar na sua conta</h1>
          <p>Use qualquer e-mail e uma senha com 4 ou mais caracteres.</p>

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
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
              placeholder="••••••"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              hint="Mínimo de 4 caracteres"
              required
            />

            {erro && <p className="auth__error">{erro}</p>}

            <Button type="submit" fullWidth disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="auth__foot">
            Ainda não tem conta? <Link to="/perfil">Complete seu perfil</Link> para começar.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
