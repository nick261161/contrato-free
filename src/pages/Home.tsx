import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: '▤', title: 'Modelos por serviço', text: 'Comece com um escopo pronto para design, sites, redes sociais, vídeo ou redação.' },
  { icon: '◈', title: 'Sua identidade no PDF', text: 'Adicione seu logo ou foto e escolha o estilo visual do documento.' },
  { icon: '⊞', title: 'Dados sempre à mão', text: 'Reaproveite contatos, prazos, valores e condições de pagamento nos próximos trabalhos.' },
  { icon: '✓', title: 'Assinatura por link', text: 'Compartilhe o contrato com seu cliente e acompanhe as assinaturas pelo painel.' },
]

export function Home() {
  const { hash } = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  const destination = user ? '/novo-contrato' : '/login?modo=cadastro'
  const action = user ? 'Criar contrato' : 'Criar conta grátis'

  return (
    <div className="page landing">
      <Header />
      <main>
        <section className="landing-hero">
          <div className="container landing-hero__layout">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow">Contratos para freelancers</p>
              <h1>Feche projetos <em>com confiança.</em></h1>
              <p>Crie contratos com a sua marca, reutilize os dados de cada trabalho e envie para seu cliente assinar por link.</p>
              <div className="landing-hero__actions">
                <Link to={destination} className="btn btn--primary btn--lg">{action}</Link>
                <Link to="/#como-funciona" className="btn btn--ghost btn--lg">Como funciona</Link>
              </div>
            </div>

            <div className="landing-showcase" aria-label="Exemplo de um contrato personalizado">
              <div className="landing-showcase__sheet">
                <div className="landing-paper__brand">
                  <span className="landing-paper__logo" aria-hidden="true">m.</span>
                  <div><span>Estúdio Mirante</span><small>Design independente</small></div>
                </div>
                <div className="landing-paper__title">
                  <small>Contrato de prestação de serviços</small>
                  <strong>Identidade<br />visual</strong>
                </div>
                <div className="landing-paper__details">
                  <div><span>Investimento</span><strong>R$ 3.500,00</strong></div>
                  <div><span>Prazo</span><strong>30 dias</strong></div>
                </div>
                <div className="landing-paper__lines" aria-hidden="true"><i /><i /><i /></div>
                <div className="landing-paper__signature"><span>Marina Lima</span><small>Prestadora</small></div>
              </div>
              <div className="landing-showcase__status">
                <span aria-hidden="true">✓</span>
                <div><strong>Assinatura registrada</strong><small>Estúdio Mirante · Prestador</small></div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features" id="funcionalidades">
          <div className="container">
            <div className="landing-section-heading">
              <h2>Seu processo de contrato, em um só lugar</h2>
              <p>Do escopo inicial ao PDF assinado, com os dados que você já usa no dia a dia.</p>
            </div>
            <div className="landing-features__grid">
              {features.map((feature) => (
                <article className="landing-feature" key={feature.title}>
                  <span className="landing-feature__icon" aria-hidden="true">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-flow" id="como-funciona">
          <div className="container landing-flow__grid">
            <div className="landing-section-heading">
              <h2>Do primeiro rascunho à assinatura</h2>
            </div>
            <ol>
              <li><div><strong>Personalize seu perfil</strong><p>Salve sua marca, os dados do prestador e as condições que você usa com frequência.</p></div></li>
              <li><div><strong>Monte o contrato</strong><p>Escolha um modelo, adicione o cliente e ajuste o escopo, os entregáveis e o pagamento.</p></div></li>
              <li><div><strong>Revise e compartilhe</strong><p>Baixe o PDF personalizado ou envie o link de assinatura ao cliente.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="landing-end" id="precos">
          <div className="container landing-end__inner">
            <h2>Seu próximo projeto começa aqui.</h2>
            <Link to={destination} className="btn btn--primary btn--lg">{action}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
