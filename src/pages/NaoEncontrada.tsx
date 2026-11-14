import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

/** Página404 — endereço desconhecido (rota `*` do App). */
export function NaoEncontrada() {
  return (
    <div className="page">
      <Header />

      <main className="notfound">
        <span className="notfound__code">404</span>
        <h1>Página não encontrada</h1>
        <p>
          O endereço pode ter sido digitado incorretamente ou a página não
          existe mais.
        </p>
        <div className="notfound__actions">
          <Link to="/" className="btn btn--primary">
            Voltar ao início
          </Link>
          <Link to="/login" className="btn btn--secondary">
            Ir para o painel
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
