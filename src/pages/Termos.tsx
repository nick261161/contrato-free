import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

/** Termos de uso — conteúdo estático vinculado pelo rodapé. */
export function Termos() {
  return (
    <div className="page">
      <Header />

      <main className="legal container">
        <span className="hero__tag">Legal</span>
        <h1>Termos de uso</h1>
        <p className="legal__meta">Última atualização: novembro de 2026</p>

        <section>
          <h2>1. Sobre o serviço</h2>
          <p>
            O ContratoFree é uma plataforma que ajuda freelancers a gerar,
            acompanhar e compartilhar contratos de prestação de serviços. Ele
            automatiza a montagem do documento — dados do cliente, escopo,
            valores e cláusulas padrão — e facilita a coleta de assinaturas
            eletrônicas.
          </p>
        </section>

        <section>
          <h2>2. Conta e segurança</h2>
          <p>
            Para usar o painel é necessário criar uma conta com um e-mail
            válido e uma senha de no mínimo 8 caracteres. Você é responsável
            por manter o acesso à sua conta em sigilo e por toda a atividade
            realizada com ela. Cada conta acessa apenas os próprios contratos,
            clientes e dados de perfil.
          </p>
        </section>

        <section>
          <h2>3. Conteúdo gerado pelos usuários</h2>
          <p>
            Os contratos, dados de clientes e termos inseridos na plataforma
            são de responsabilidade de quem os criou. O ContratoFree apenas
            organiza e formata as informações fornecidas: a validade jurídica
            de cada contrato depende das partes envolvidas e da legislação
            aplicável.
          </p>
        </section>

        <section>
          <h2>4. Assinaturas eletrônicas</h2>
          <p>
            A assinatura é coletada por um link exclusivo enviado ao cliente,
            com registro de nome, data e hora. O titular do contrato deve
            validar se esse formato atende à sua necessidade — para operações
            de maior valor recomendamos consulta jurídica e, quando cabível,
            certificação digital (ICP-Brasil).
          </p>
        </section>

        <section>
          <h2>5. Uso aceitável</h2>
          <p>
            É proibido usar a plataforma para conteúdo ilícito, fraude,
            assédio ou qualquer atividade que vise a lei. Podemos suspender
            contas que violem estes termos.
          </p>
        </section>

        <section>
          <h2>6. Isenção de responsabilidade</h2>
          <p>
            O serviço é fornecido “como está”, sem garantias de
            indisponibilidade total. O ContratoFree é um projeto acadêmico e
            não substitui advogado, contador ou notário.
          </p>
        </section>

        <section>
          <h2>7. Alterações</h2>
          <p>
            Estes termos podem ser atualizados a qualquer momento. O uso
            continuado da plataforma após mudanças implica aceitação da nova
            versão.
          </p>
        </section>

        <section>
          <h2>8. Contato</h2>
          <p>
            Dúvidas sobre estes termos: <a href="mailto:contato@contratofree.com.br">contato@contratofree.com.br</a>.
            Veja também a nossa <Link to="/privacidade">Política de Privacidade</Link>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
