import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

/** Política de privacidade — conteúdo estático vinculado pelo rodapé. */
export function Privacidade() {
  return (
    <div className="page">
      <Header />

      <main className="legal container">
        <span className="hero__tag">Legal</span>
        <h1>Política de privacidade</h1>
        <p className="legal__meta">Última atualização: novembro de 2026</p>

        <section>
          <h2>1. Quais dados coletamos</h2>
          <p>
            <strong>Conta:</strong> nome, e-mail e senha (esta última armazenada
            de forma criptografada pelo serviço de autenticação).{' '}
            <strong>Perfil do freelancer:</strong> telefone, profissao, chave
            PIX e os termos padrão que você escreve.{' '}
            <strong>Contratos e clientes:</strong> tudo o que você preenche no
            assistente — nomes, e-mails, CPF/CNPJ, endereços, valores e
            assinaturas.
          </p>
        </section>

        <section>
          <h2>2. Para que usamos</h2>
          <p>
            Exclusivamente para operar a plataforma: autenticar você, exibir
            seus contratos e clientes, gerar os documentos em PDF e registrar
            as assinaturas. Não usamos seus dados para marketing de terceiros
            e não vendemos informações.
          </p>
        </section>

        <section>
          <h2>3. Como os dados ficam protegidos</h2>
          <p>
            O acesso ao painel exige login, e cada conta enxerga apenas os
            próprios registros — contratos, clientes e perfil são isolados por
            usuário. A comunicação com a plataforma usa HTTPS, e os dados ficam
            armazenados em banco de dados gerenciado (Neon/Postgres) em região
            da América do Sul.
          </p>
        </section>

        <section>
          <h2>4. Links de assinatura</h2>
          <p>
            O link enviado ao cliente contém o contrato completo para leitura e
            assinatura. Trate-o como confidencial: quem tiver o link acessa o
            documento. Recomendamos enviá-lo apenas ao cliente contratado.
          </p>
        </section>

        <section>
          <h2>5. Seus direitos (LGPD)</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão dos seus dados a
            qualquer momento pelo e-mail de contato. A exclusão da conta remove
            os registros de contratos e clientes vinculados a ela.
          </p>
        </section>

        <section>
          <h2>6. Retenção</h2>
          <p>
            Os dados são mantidos enquanto sua conta existir. Ao excluir a
            conta, os registros são removidos ou anonimizados, salvo obrigação
            legal de conservação.
          </p>
        </section>

        <section>
          <h2>7. Contato</h2>
          <p>
            Encarregado de dados: <a href="mailto:contato@contratofree.com.br">contato@contratofree.com.br</a>.
            Veja também os nossos <Link to="/termos">Termos de uso</Link>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
