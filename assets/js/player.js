/**
 * Toca faixas do Spotify a partir do nosso próprio botão de play.
 *
 * Usa a Spotify iFrame API (https://developer.spotify.com/documentation/embeds/references/iframe-api):
 * um único player do Spotify fica carregado fora da tela e é controlado por código.
 * - Quem está logado no Spotify no navegador ouve a faixa completa; quem não está ouve a prévia de 30s.
 * - Alguns navegadores (principalmente Safari no iPhone) bloqueiam o play disparado de fora do player.
 *   Nesse caso o evento "blocked" é emitido e a tela mostra o player do Spotify para a pessoa tocar.
 */
const API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
const BLOCK_TIMEOUT_MS = 3500;

let apiPromise = null;
let controllerPromise = null;
let controller = null;
let wantPlay = false;
let blockTimer = null;
const listeners = new Set();

export const playerState = { uri: null, playing: false, loading: false, position: 0, duration: 0 };

function emit(extra = {}) { listeners.forEach((fn) => fn({ ...playerState, ...extra })); }
export function onPlayerChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function loadApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const s = document.createElement('script');
    s.src = API_SRC; s.async = true;
    s.onerror = () => { apiPromise = null; reject(new Error('spotify_api_unavailable')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

function getController(uri) {
  if (controllerPromise) return controllerPromise;
  controllerPromise = loadApi().then((api) => new Promise((resolve) => {
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:300px;height:80px;opacity:0;pointer-events:none;';
    const el = document.createElement('div');
    holder.appendChild(el);
    document.body.appendChild(holder);
    api.createController(el, { uri, width: 300, height: 80 }, (c) => {
      controller = c;
      c.addListener('ready', () => { if (wantPlay) c.play(); });
      c.addListener('playback_update', (e) => {
        const d = e.data || {};
        playerState.position = d.position || 0;
        playerState.duration = d.duration || 0;
        playerState.loading = !!d.isBuffering;
        const ended = !d.isPaused ? false : d.duration > 0 && d.position >= d.duration - 250;
        playerState.playing = !d.isPaused;
        if (playerState.playing) clearTimeout(blockTimer);
        if (ended) { playerState.playing = false; playerState.position = 0; }
        emit();
      });
      resolve(c);
    });
  })).catch((err) => { controllerPromise = null; throw err; });
  return controllerPromise;
}

function watchForBlock(uri) {
  clearTimeout(blockTimer);
  blockTimer = setTimeout(() => {
    if (playerState.uri === uri && !playerState.playing) {
      wantPlay = false;
      playerState.loading = false;
      emit({ blocked: true });
    }
  }, BLOCK_TIMEOUT_MS);
}

/** Toca a faixa; se ela já é a atual, alterna entre tocar e pausar. */
export async function toggle(uri) {
  if (playerState.uri === uri && controller) {
    if (playerState.playing) { wantPlay = false; controller.pause(); }
    else { wantPlay = true; controller.resume(); watchForBlock(uri); }
    return;
  }
  playerState.uri = uri; playerState.playing = false; playerState.loading = true; playerState.position = 0;
  wantPlay = true;
  emit();
  watchForBlock(uri);
  try {
    const firstLoad = !controller;
    const c = await getController(uri);
    if (playerState.uri !== uri) return; // a pessoa já clicou em outra faixa
    if (!firstLoad) c.loadUri(uri);
    c.play();
  } catch (_) {
    clearTimeout(blockTimer);
    playerState.loading = false;
    emit({ blocked: true });
  }
}

export function pause() {
  wantPlay = false;
  clearTimeout(blockTimer);
  if (controller && playerState.playing) controller.pause();
}
