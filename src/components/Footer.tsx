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
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#precos">Preços</a>
        </div>

        <div className="footer__col">
          <h4>Links</h4>
          <a href="#termos">Termos de uso</a>
          <a href="#privacidade">Privacidade</a>
          <a href="#contato">Contato</a>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} ContratoFree — Projeto acadêmico.</span>
      </div>
    </footer>
  )
}
