import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  erro: Error | null
}

/**
 * Evita a "tela branca": qualquer erro de renderização caia aqui com uma
 * mensagem recuperável em vez de derrubar a árvore React inteira.
 * (Componente de classe: o React exige isso para getDerivedStateFromError.)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[app] erro de renderização:', erro, info.componentStack)
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="page">
          <main className="notfound" role="alert">
            <span className="notfound__code">!</span>
            <h1>Algo deu errado</h1>
            <p>
              Ocorreu um erro inesperado ao exibir esta página. Você pode
              tentar novamente ou voltar ao início.
            </p>
            <div className="notfound__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => this.setState({ erro: null })}
              >
                Tentar novamente
              </button>
              <a className="btn btn--secondary" href="/">
                Voltar ao início
              </a>
            </div>
            <small className="notfound__detalhe">{String(this.state.erro.message)}</small>
          </main>
        </div>
      )
    }

    return this.props.children
  }
}
