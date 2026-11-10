/**
 * Configuração do site. Tudo que muda por ambiente fica aqui.
 * Em produção, este arquivo pode ser gerado no deploy (ex.: a partir de variáveis de ambiente).
 */
export const CONFIG = {
  /** Base da API. Todas as rotas em api.js são relativas a ela. */
  apiBase: '/api',

  /** true = usa os dados simulados de mocks.js (sem backend). Em produção: false. */
  useMocks: true,

  /** Timeout das chamadas à API, em ms. */
  requestTimeoutMs: 15000,

  /**
   * Datas da promoção (horário de Brasília). Usadas no texto da página e como fallback de fase
   * caso GET /status não responda. A fonte de verdade da fase é sempre o backend.
   */
  dates: {
    start:   '2026-11-19T00:00:00-03:00', // início das participações
    end:     '2026-12-07T23:59:59-03:00', // fim das participações
    result:  '2026-12-10T00:00:00-03:00', // divulgação do resultado
    archive: '2026-12-31T00:00:00-03:00', // a partir daqui a home mostra só o resultado
  },

  limits: {
    answerMax: 500,
    radioNameMax: 100,
    /** Idade mínima para participar, se o regulamento exigir (ex.: 18). null = sem trava no front. */
    minAge: null,
  },

  features: {
    /** Bloco com foto do PS5 na home. Desligar se o uso da imagem não for aprovado. */
    prizePhoto: true,
    /** Painel de QA para revisar telas e fases. Só aparece com ?qa=1 na URL. */
    qaPanel: true,
  },

  links: {
    linktree: 'https://lnk.to/GTAVI_TheAlbum', // botões “Salvar o álbum” e “Ouvir o álbum”
    privacy: '#',                // [LINK DA POLÍTICA DE PRIVACIDADE WARNER]
    /** URL do regulamento para embed via iframe. null = usa rulesHtml abaixo. */
    rulesEmbedUrl: null,
  },

  /** HTML provisório do regulamento enquanto não há URL de embed. */
  rulesHtml: `
    <h3>[REGULAMENTO EMBEDADO AQUI]</h3>
    <p>Este espaço recebe o texto completo do regulamento da promoção, com rolagem própria.
    Para usar um embed, preencha <code>CONFIG.links.rulesEmbedUrl</code>.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`,

  /**
   * Proteção anti-bot (opcional). Se preenchido, o token do reCAPTCHA v3 / Turnstile
   * é enviado no header X-Captcha-Token. O script do provedor deve ser incluído no index.html.
   */
  captcha: { provider: null, siteKey: null },

  timezone: 'America/Sao_Paulo',
};
