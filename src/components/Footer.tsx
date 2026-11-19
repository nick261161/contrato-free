import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <span className="brand">
            <span className="brand__mark">§</span>
            Contrato<span className="brand__accent">Free</span>
          </span>
          <p>
            Automação de contratos para freelancers: do briefing à assinatura em
            poucos minutos.
          </p>
        </div>

        <div className="footer__col">
          <h4>Produto</h4>
          {/* Levam à Home e rolam até a seção (# no react-router) */}
          <Link to="/#funcionalidades">Funcionalidades</Link>
          <Link to="/#como-funciona">Como funciona</Link>
          <Link to="/#precos">Começar</Link>
        </div>

        <div className="footer__col">
          <h4>Links</h4>
          <Link to="/termos">Termos de uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          <a href="mailto:contato@contratofree.com.br">Contato</a>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} ContratoFree — Projeto acadêmico.</span>
        <span className="footer__disclaimer">
          Modelos educativos e informativos — <strong>não substituem a revisão de um
          advogado</strong> para casos complexos.{' '}
          <Link to="/termos">Ler os termos</Link>
        </span>
      </div>
    </footer>
  )
}
