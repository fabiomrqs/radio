/**
 * Respostas simuladas da API (CONFIG.useMocks = true). Seguem exatamente o contrato do README.
 * CPFs de teste: 529.982.247-25 (sucesso) · 111.444.777-35 (já participou → 409).
 */
import { CONFIG } from './config.js';
import { isBlocked } from './profanity.js';
import { ApiError } from './errors.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KV = 'assets/img/kv-gta-vi-the-album.jpg';

const TRACKS = [
  { id: 't01', title: 'RHYNO', artist: 'Travis Scott' },
  { id: 't02', title: 'Sexy Magic', artist: 'CA7RIEL & Paco Amoroso, PinkPantheress, Fred again.., Etienne de Crécy' },
  { id: 't03', title: 'That’s It', artist: 'Yung Lean feat. Future & Metro Boomin' },
  { id: 't04', title: 'Last Thing You Need', artist: 'Morgan Wallen' },
  { id: 't05', title: 'Macacoa 2000', artist: 'Rauw Alejandro' },
  { id: 't06', title: 'Bright Lights, Big City', artist: 'Keith Richards' },
].map((t) => ({ ...t, coverUrl: null, spotifyEmbedUrl: null }));

// Perguntas (textos aprovados): serão construídas junto com a curadoria das playlists.
const QUIZ = {
  questions: [
    {
      id: 'q1', text: 'Qual é o seu rolê em Leonida?', definesCover: true,
      options: [
        { id: 'q1a', label: 'Pôr do sol na praia', icon: '🌅', cover: { id: 'c-por-do-sol', name: 'Pôr do sol', imageUrl: KV } },
        { id: 'q1b', label: 'Noite neon em Vice City', icon: '🌃', cover: { id: 'c-neon', name: 'Noite neon', imageUrl: KV } },
        { id: 'q1c', label: 'Fuga em alta velocidade', icon: '🏎️', cover: { id: 'c-velocidade', name: 'Alta velocidade', imageUrl: KV } },
        { id: 'q1d', label: 'Estrada sem destino', icon: '🛣️', cover: { id: 'c-estrada', name: 'Estrada sem destino', imageUrl: KV } },
      ],
    },
    {
      id: 'q2', text: 'Quando a polícia aparece, você:',
      options: [
        { id: 'q2a', label: 'Pisa fundo e some', icon: '💨' },
        { id: 'q2b', label: 'Planeja o golpe perfeito', icon: '🧠' },
        { id: 'q2c', label: 'Nem liga e curte a paisagem', icon: '😎' },
        { id: 'q2d', label: 'Chama o parceiro e parte pro caos', icon: '🔥' },
      ],
    },
  ],
};

function phaseByDate(now = new Date()) {
  const d = Object.fromEntries(Object.entries(CONFIG.dates).map(([k, v]) => [k, new Date(v)]));
  if (now < d.start) return 'pre';
  if (now <= d.end) return 'promo';
  if (now < d.result) return 'encerrada';
  if (now < d.archive) return 'resultado';
  return 'arquivo';
}

const withSpotifyUrl = (a) => ({ ...a, spotifyUrl: a.spotifyUrl || (a.spotifyId ? `https://open.spotify.com/artist/${a.spotifyId}` : null) });
const error = (status, code, message, fields) => new ApiError(status, code, message, fields);

export const api = {
  registerVisit() {},
  async getStatus() {
    await wait(150);
    const phase = phaseByDate();
    return {
      phase,
      serverTime: new Date().toISOString(),
      winner: phase === 'resultado' || phase === 'arquivo' ? { displayName: 'Ana S.' } : null,
    };
  },
  async getTracks() {
    // Usa a lista real (assets/data/tracks.json) também no modo simulado
    if (CONFIG.tracksUrl) { const { getStaticTracks } = await import('./api.js'); return getStaticTracks(); }
    await wait(500); return { tracks: TRACKS };
  },
  async getQuiz() { await wait(300); return QUIZ; },
  async createParticipation(p) {
    await wait(900);
    if (p.website) throw error(400, 'bad_request', 'Requisição inválida.');
    if (p.cpf === '11144477735') {
      throw error(409, 'already_participated', 'Este CPF já está participando da promoção.');
    }
    return { participationId: 'p_' + Math.random().toString(36).slice(2, 10) };
  },
  async createRadio(p) {
    await wait(1400);
    if (isBlocked(p.name)) throw error(422, 'validation_error', 'Nome não aceito.', { name: 'Nome não aceito. Tente outro.' });
    // Mesma regra do servidor: a pergunta 1 define a capa (sorteada entre as opções)
    const CAPAS = { q1a: ['capa-2', 'capa-4'], q1b: ['capa-3', 'capa-5'], q1c: ['capa-6'], q1d: ['capa-1'] };
    const opt = QUIZ.questions[0].options.find((o) => o.id === p.answers.q1) || QUIZ.questions[0].options[1];
    const opcoes = CAPAS[opt.id] || ['capa-1'];
    const capa = opcoes[Math.floor(Math.random() * opcoes.length)];
    const id = 'r_' + Math.random().toString(36).slice(2, 10);
    // Nomes como o Spotify devolve; o site só mostra os que têm foto aprovada
    const artists = ['Travis Scott', 'Morgan Wallen', 'Dua Lipa', 'Future', 'Metro Boomin', 'JENNIE', 'Rauw Alejandro', 'Playboi Carti']
      .map((name) => ({ name, photoUrl: null, spotifyUrl: 'https://open.spotify.com/' }));
    return {
      radioId: id,
      name: p.name.trim(),
      cover: { id: capa, name: opt.cover.name, imageUrl: `assets/img/capas/${capa}.jpg` },
      playlistUrl: 'https://open.spotify.com/album/5BYKG4MHfySZthe2W6r7n4',
      playlistCreated: false,
      shareUrl: location.origin + location.pathname + '#inicio',
      // O backend escolhe os artistas da playlist gerada; aqui usamos todos os do artists.json
      featuredArtist: artists[0] || null,
      artists,
    };
  },
};
