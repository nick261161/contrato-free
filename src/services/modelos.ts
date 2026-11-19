import type { Clausulas } from '../types'

export const CLAUSULAS_VAZIAS: Clausulas = {
  multa: false, nda: false, portfolio: false, rescisao: false,
}

export const TEMAS_PDF = [
  { value: 'editorial', label: 'Editorial · azul e lavanda', color: '#4933a3', tint: '#f1edfc' },
  { value: 'botanico', label: 'Botânico · verde e sálvia', color: '#21654e', tint: '#e8f3ed' },
] as const

export const MODELOS = [
  {
    value: 'design', label: 'Identidade visual', prazoDias: 30,
    descricao: 'Criação de uma identidade visual para a marca do contratante, com apresentação de conceito e refinamento da solução aprovada.',
    entregaveis: 'Logotipo principal e variações, paleta de cores, tipografia e guia de aplicação em PDF.',
  },
  {
    value: 'dev', label: 'Site institucional', prazoDias: 30,
    descricao: 'Planejamento e desenvolvimento de um site institucional responsivo conforme o conteúdo e as referências aprovados pelo contratante.',
    entregaveis: 'Site responsivo, formulário de contato e instruções de publicação e atualização.',
  },
  {
    value: 'social', label: 'Gestão de redes sociais', prazoDias: 30,
    descricao: 'Planejamento de conteúdo para os canais definidos com o contratante, com criação de peças e aprovação prévia.',
    entregaveis: 'Calendário editorial, artes e legendas para as publicações definidas no escopo.',
  },
  {
    value: 'video', label: 'Edição de vídeo', prazoDias: 15,
    descricao: 'Montagem e finalização do material audiovisual fornecido pelo contratante conforme o briefing aprovado.',
    entregaveis: 'Vídeo final exportado no formato acordado e versão de revisão para aprovação.',
  },
  {
    value: 'redacao', label: 'Redação de conteúdo', prazoDias: 14,
    descricao: 'Pesquisa e redação de conteúdo original conforme a pauta, o público e o tom de voz combinados.',
    entregaveis: 'Textos editáveis e versão revisada após a rodada de comentários do contratante.',
  },
]
