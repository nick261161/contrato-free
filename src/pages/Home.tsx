import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

const features = [
  {
    icon: '⚡',
    title: 'Geração em segundos',
    text: 'Preencha um wizard curto e receba o contrato completo com cláusulas e valores já preenchidos.',
  },
  {
    icon: '🧩',
    title: 'Termos padrão reutilizáveis',
    text: 'Cadastre uma vez as suas condições de pagamento e prazos: elas entram automaticamente em todo contrato.',
  },
  {
    icon: '📊',
    title: 'Painel de métricas',
    text: 'Acompanhe valor faturado, contratos pendentes e prazos de entrega em um só lugar.',
  },
  {
    icon: '🖨️',
    title: 'Exportação em PDF',
    text: 'Imprima ou salve o contrato finalizado direto do navegador, pronto para assinar.',
  },
]

const steps = [
  { n: '1', title: 'Cadastre seus dados', text: 'Nome, contato, PIX e termos padrão no perfil.' },
  { n: '2', title: 'Preencha o wizard', text: 'Cliente, escopo, valor e prazo do serviço.' },
  { n: '3', title: 'Gere e compartilhe', text: 'Confira a prévia e exporte o documento.' },
]

export function Home() {
  const [highlight, setHighlight] = useState(0)
  const { hash } = useLocation()

  // useEffect: alterna o destaque do hero para criar um pequeno carrossel
  useEffect(() => {
    const timer = setInterval(() => {
      setHighlight((current) => (current + 1) % steps.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  // Links do rodapé chegam como /#seccion — rola suave até o alvo.
  useEffect(() => {
    if (!hash) return
    const alvo = document.getElementById(hash.slice(1))
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="page">
      <Header />

      <main>
        <section className="hero">
          <div className="container hero__inner">
            <div className="hero__content">
              <span className="hero__tag">Feito para freelancers</span>
              <h1>
                Contratos fechados em minutos,
                <span className="hero__accent"> sem burocracia.</span>
              </h1>
              <p>
                O ContratoFree automatiza a criação dos seus contratos de prestação
                de serviços: dados do cliente, escopo, valores e cláusulas padrão em
                um único fluxo guiado.
              </p>
              <div className="hero__cta">
                <Link to="/novo-contrato" className="btn btn--primary btn--lg">
                  Gerar meu primeiro contrato
                </Link>
                <Link to="/login" className="btn btn--secondary btn--lg">
                  Já tenho conta
                </Link>
              </div>
              <div className="hero__stats">
                <div>
                  <strong>+2.400</strong>
                  <span>contratos gerados</span>
                </div>
                <div>
                  <strong>4 min</strong>
                  <span>tempo médio por contrato</span>
                </div>
                <div>
                  <strong>100%</strong>
                  <span>personalizável</span>
                </div>
              </div>
            </div>

            <div className="hero__card" aria-hidden="true">
              <div className="hero__card-head">
                <span className="badge badge--pendente">Prévia</span>
                <span>Contrato #1004</span>
              </div>
              <h3>Landing page institucional</h3>
              <p>Cliente: Padaria Estrela</p>
              <div className="hero__card-row">
                <span>Valor</span>
                <strong>R$ 3.500,00</strong>
              </div>
              <div className="hero__card-row">
                <span>Prazo</span>
                <strong>30 dias</strong>
              </div>
              <div className="hero__card-bar">
                <span style={{ width: `${((highlight + 1) / steps.length) * 100}%` }} />
              </div>
              <small>Etapa {highlight + 1} de {steps.length}: {steps[highlight].title}</small>
            </div>
          </div>
        </section>

        <section className="section" id="funcionalidades">
          <div className="container">
            <header className="section__head">
              <span>Funcionalidades</span>
              <h2>Tudo o que você precisa para contratar certo</h2>
            </header>

            <div className="features">
              {features.map((feature) => (
                <article key={feature.title} className="feature">
                  <span className="feature__icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--muted" id="como-funciona">
          <div className="container">
            <header className="section__head">
              <span>Como funciona</span>
              <h2>Três etapas até o contrato assinado</h2>
            </header>

            <div className="steps">
              {steps.map((step, index) => (
                <article
                  key={step.n}
                  className={`step ${index === highlight ? 'step--active' : ''}`}
                >
                  <span className="step__number">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta" id="precos">
          <div className="container cta__inner">
            <h2>Pronto para automatizar seus contratos?</h2>
            <p>Crie sua conta gratuita e gere o primeiro contrato em menos de 5 minutos.</p>
            <Link to="/login" className="btn btn--light btn--lg">
              Começar agora
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
