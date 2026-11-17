import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input } from '../components/Input'
import { Tilt } from '../components/Tilt'
import { authClient, mensagemDeErro } from '../services/auth'

/**
 * Pede o link de redefinição de senha (Neon Auth → e-mail).
 * Resposta sempre genérica: não revela se o e-mail existe ou não.
 */
export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (!email.includes('@')) {
      setErro('Informe um e-mail válido.')
      return
    }

    setEnviando(true)
    try {
      const resultado = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resultado.error) throw new Error(mensagemDeErro(resultado.error))
      setEnviado(true)
    } catch (err) {
      setErro(
        err instanceof Error
          ? mensagemDeErro({ message: err.message })
          : 'Não foi possível enviar o e-mail. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="page">
      <Header />

      <main className="auth">
        <Tilt className="auth__card" max={5}>
          <span className="auth__tag">Recuperar acesso</span>
          <h1>Esqueci minha senha</h1>
          <p>
            Informe o e-mail da sua conta e enviaremos um link para criar uma nova
            senha.
          </p>

          {enviado ? (
            <p className="auth__info">
              ✅ Se existir uma conta com <strong>{email}</strong>, enviamos o link de
              redefinição. Ele vale por <strong>1 hora</strong> — confira também a caixa
              de spam.
            </p>
          ) : (
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

              {erro && <p className="auth__error">{erro}</p>}

              <Button type="submit" fullWidth disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar link de redefinição'}
              </Button>
            </form>
          )}

          <p className="auth__foot">
            {enviado ? (
              <Link to="/login" className="auth__link">
                Voltar para o login
              </Link>
            ) : (
              <>
                Lembrou a senha?{' '}
                <Link to="/login" className="auth__link">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </Tilt>
      </main>

      <Footer />
    </div>
  )
}
