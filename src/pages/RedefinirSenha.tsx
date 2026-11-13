import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input } from '../components/Input'
import { authClient, mensagemDeErro } from '../services/auth'

/**
 * Página pública /reset-password — troca a senha com o token do e-mail.
 * O Neon Auth redireciona para cá com ?token=... (ou ?error=INVALID_TOKEN).
 */
export function RedefinirSenha() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')
  const erroLink = searchParams.get('error') // INVALID_TOKEN = link expirado/inválido

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (senha.length < 8) {
      setErro('A senha precisa ter no mínimo 8 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.')
      return
    }
    if (!token) {
      setErro('Token ausente. Peça um novo link de redefinição.')
      return
    }

    setEnviando(true)
    try {
      const resultado = await authClient.resetPassword({
        token,
        newPassword: senha,
      })
      if (resultado.error) throw new Error(mensagemDeErro(resultado.error))
      setPronto(true)
    } catch (err) {
      setErro(
        err instanceof Error
          ? mensagemDeErro({ message: err.message })
          : 'Não foi possível redefinir a senha. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="page">
      <Header />

      <main className="auth">
        <div className="auth__card">
          <span className="auth__tag">Nova senha</span>
          <h1>{pronto ? 'Senha redefinida' : 'Redefinir sua senha'}</h1>
          <p>
            {pronto
              ? 'Tudo certo! Sua senha foi alterada — entre com a nova senha.'
              : 'Escolha uma nova senha com 8 ou mais caracteres.'}
          </p>

          {!token ? (
            <p className="auth__error">
              {erroLink === 'INVALID_TOKEN'
                ? 'Este link de redefinição é inválido ou expirou. Peça um novo.'
                : 'Este link não tem o token de redefinição. Peça um novo link por e-mail.'}
            </p>
          ) : pronto ? (
            <Button fullWidth onClick={() => navigate('/login')}>
              Entrar com a nova senha
            </Button>
          ) : (
            <form className="auth__form" onSubmit={handleSubmit} noValidate>
              <Input
                label="Nova senha"
                type="password"
                name="senha"
                placeholder="••••••••"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                hint="Mínimo de 8 caracteres"
                required
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                name="confirmar"
                placeholder="••••••••"
                value={confirmar}
                onChange={(event) => setConfirmar(event.target.value)}
                required
              />

              {erro && <p className="auth__error">{erro}</p>}

              <Button type="submit" fullWidth disabled={enviando}>
                {enviando ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </form>
          )}

          <p className="auth__foot">
            <Link to="/esqueci-senha" className="auth__link">
              Pedir novo link
            </Link>
            {' · '}
            <Link to="/login" className="auth__link">
              Voltar ao login
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
