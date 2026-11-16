/**
 * Configuração do site. Tudo que muda por ambiente fica aqui.
 * Em produção, este arquivo pode ser gerado no deploy (ex.: a partir de variáveis de ambiente).
 */
export const CONFIG = {
  /**
   * Endereço da API (servidor no Render). Troque pelo endereço do seu serviço, terminando em /api.
   * Ex.: 'https://radio-gtavi-api.onrender.com/api'
   */
  apiBase: 'https://radio-z16y.onrender.com/api',

  /** true = usa os dados simulados de mocks.js (sem backend). Com o servidor no ar: false. */
  useMocks: false,

  /**
   * Lista de faixas. Com uma URL, o site lê o JSON estático (funciona no GitHub Pages).
   * Com null, usa GET {apiBase}/tracks do backend (mesmo formato).
   * Para atualizar títulos e faixas lançadas: node scripts/atualizar-faixas.mjs (ver README).
   */
  tracksUrl: 'assets/data/tracks.json',

  /** Artistas do álbum (foto e nome), usados em “Quem toca na sua rádio”. */
  artistsUrl: 'assets/data/artists.json',

  /** Timeout das chamadas à API, em ms. */
  requestTimeoutMs: 15000,

  /**
   * Datas da promoção (horário de Brasília). Usadas no texto da página e como fallback de fase
   * caso GET /status não responda. A fonte de verdade da fase é sempre o backend.
   */
  dates: {
    start:   '2026-11-19T00:00:00-03:00', // início das participações
    end:     '2026-12-07T23:59:59-03:00', // fim das participações
    result:  '2026-12-11T19:00:00-03:00', // divulgação do resultado (data e horário exibidos no site)
    archive: '2026-12-31T00:00:00-03:00', // a partir daqui a home mostra só o resultado
  },

  limits: {
    answerMax: 500,
    radioNameMax: 100,
    /** Idade mínima para participar, se o regulamento exigir (ex.: 18). null = sem trava no front. */
    minAge: 18,
  },

  features: {
    /** Bloco com foto do PS5 na home. Desligar se o uso da imagem não for aprovado. */
    prizePhoto: true,
    /** Painel de QA para revisar telas e fases. Só aparece com ?qa=1 na URL. */
    qaPanel: true,
    /** false = faixas ainda não lançadas aparecem como “Em breve” e não podem ser escolhidas. */
    unreleasedSelectable: false,
  },

  links: {
    linktree: 'https://lnk.to/GTAVI_TheAlbum', // botões “Salvar o álbum” e “Ouvir o álbum”
    privacy: 'https://privacy.wmg.com/wmi/privacy/por',
    /** Endereço da landing usado no texto de compartilhamento. Trocar pelo domínio final quando estiver configurado. */
    landing: 'https://www.radiogtavithealbum.com/#inicio',
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

  /** Número de certificação da promoção, exibido no rodapé. null = mostra “Número da promo”. */
  promoNumber: null,

  timezone: 'America/Sao_Paulo',
};
