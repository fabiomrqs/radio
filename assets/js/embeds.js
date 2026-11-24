/**
 * Players do Spotify na página.
 *
 * Usa a Spotify iFrame API para saber quando um player começa a tocar e pausar os outros:
 * assim nunca tocam duas músicas ao mesmo tempo. Se a API não carregar, os players continuam
 * funcionando como iframes comuns (só sem a pausa automática).
 */
const API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
const API_TIMEOUT_MS = 8000;

let apiPromise = null;
const tocando = new Map(); // controller → está tocando?

function loadApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), API_TIMEOUT_MS);
    window.onSpotifyIframeApiReady = (api) => { clearTimeout(timer); resolve(api); };
    const s = document.createElement('script');
    s.src = API_SRC; s.async = true;
    s.onerror = () => { clearTimeout(timer); reject(new Error('load')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** Pausa todos os players (menos `exceto`). */
export function pauseAllEmbeds(exceto = null) {
  tocando.forEach((estaTocando, c) => {
    if (c !== exceto && estaTocando) {
      try { c.pause(); } catch (_) { /* player removido da página */ }
      tocando.set(c, false);
    }
  });
}

function iframeSimples(slot, { spotifyId, embedUrl, title }) {
  const f = document.createElement('iframe');
  f.src = embedUrl || `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`;
  f.title = title; f.loading = 'lazy';
  f.width = '100%'; f.height = '80';
  f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  slot.appendChild(f);
}

async function montar(slot, opcoes) {
  const alvo = document.createElement('div');
  slot.appendChild(alvo);
  try {
    const api = await loadApi();
    await new Promise((resolve) => {
      api.createController(alvo, { uri: `spotify:track:${opcoes.spotifyId}`, width: '100%', height: 80 }, (c) => {
        tocando.set(c, false);
        c.addListener('playback_update', (e) => {
          const agora = Boolean(e.data) && !e.data.isPaused;
          const antes = tocando.get(c);
          tocando.set(c, agora);
          if (agora && !antes) pauseAllEmbeds(c); // começou a tocar: pausa os outros
        });
        const f = slot.querySelector('iframe');
        if (f) f.title = opcoes.title;
        resolve();
      });
    });
  } catch (_) {
    alvo.remove();
    if (!slot.querySelector('iframe')) iframeSimples(slot, opcoes);
  }
}

// Players da lista só são criados quando chegam perto da tela (são 34)
const pendentes = new WeakMap();
const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entradas) => entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    observer.unobserve(en.target);
    const o = pendentes.get(en.target);
    if (o) { pendentes.delete(en.target); montar(en.target, o); }
  }), { rootMargin: '600px 0px' })
  : null;

/**
 * Coloca o player de uma faixa dentro de `slot`.
 * @param {HTMLElement} slot
 * @param {{ spotifyId: string, embedUrl?: string, title: string, lazy?: boolean }} opcoes
 */
export function mountSpotifyEmbed(slot, opcoes) {
  if (opcoes.lazy && observer) { pendentes.set(slot, opcoes); observer.observe(slot); }
  else montar(slot, opcoes);
}
