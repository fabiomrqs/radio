/**
 * Players do Spotify na página.
 *
 * Cada faixa tem o próprio iframe, com o endereço da faixa fixo no src. (A versão anterior usava a
 * Spotify iFrame API, que, ao criar vários players ao mesmo tempo, às vezes colocava a música de uma
 * faixa no player de outra: a pessoa marcava uma faixa vendo o player de outra.)
 *
 * Para não tocarem duas músicas juntas: quando a pessoa toca num player, o player usado antes é
 * recarregado, o que para a música dele.
 */
const players = new Set();
let ativo = null;

function parar(iframe) {
  if (!iframe || !iframe.isConnected) return;
  const src = iframe.src;
  iframe.src = 'about:blank';
  iframe.src = src; // recarregar o player interrompe a reprodução
}

/** Para o player em uso (ao trocar de tela, por exemplo). */
export function pauseAllEmbeds() {
  parar(ativo);
  ativo = null;
}

// Clicar dentro de um iframe move o foco da página para ele. Ao sair da página, conferimos qual iframe
// está com o foco; enquanto o foco estiver nos players, conferimos de novo a cada meio segundo
// (de um player para outro o navegador não avisa).
function conferirFoco() {
  const el = document.activeElement;
  if (!el || el.tagName !== 'IFRAME' || !players.has(el) || el === ativo) return;
  parar(ativo);
  ativo = el;
}
let vigia = null;
window.addEventListener('blur', () => {
  setTimeout(conferirFoco, 0);
  clearInterval(vigia);
  vigia = setInterval(conferirFoco, 500);
});
window.addEventListener('focus', () => { clearInterval(vigia); vigia = null; });

function criar(slot, { spotifyId, embedUrl, title }) {
  const f = document.createElement('iframe');
  f.src = embedUrl || `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`;
  f.title = title;
  f.loading = 'lazy';
  f.width = '100%'; f.height = '80';
  f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  f.dataset.spotifyId = spotifyId;
  slot.replaceChildren(f);
  players.add(f);
}

// Players da lista só são criados quando chegam perto da tela (são 34)
const pendentes = new WeakMap();
const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entradas) => entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    observer.unobserve(en.target);
    const o = pendentes.get(en.target);
    if (o) { pendentes.delete(en.target); criar(en.target, o); }
  }), { rootMargin: '600px 0px' })
  : null;

/**
 * Coloca o player de uma faixa dentro de `slot`.
 * @param {HTMLElement} slot
 * @param {{ spotifyId: string, embedUrl?: string, title: string, lazy?: boolean }} opcoes
 */
export function mountSpotifyEmbed(slot, opcoes) {
  if (opcoes.lazy && observer) { pendentes.set(slot, opcoes); observer.observe(slot); }
  else criar(slot, opcoes);
}
