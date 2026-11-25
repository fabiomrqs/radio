/**
 * Camada de API. Toda comunicação com o backend passa por aqui.
 * O contrato de cada rota está documentado no README.md.
 */
import { CONFIG } from './config.js';
import * as mocks from './mocks.js';
import { ApiError } from './errors.js';

export { ApiError };

async function captchaToken(action) {
  const { provider, siteKey } = CONFIG.captcha;
  try {
    if (provider === 'recaptcha' && window.grecaptcha && siteKey) {
      await new Promise((r) => window.grecaptcha.ready(r));
      return await window.grecaptcha.execute(siteKey, { action });
    }
  } catch (_) { /* segue sem token; o backend decide */ }
  return null;
}

async function request(method, path, body, { captchaAction, timeoutMs = CONFIG.requestTimeoutMs } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (captchaAction) {
    const token = await captchaToken(captchaAction);
    if (token) headers['X-Captcha-Token'] = token;
  }
  let res;
  try {
    res = await fetch(CONFIG.apiBase + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin', signal: ctrl.signal,
    });
  } catch (err) {
    throw new ApiError(0, err.name === 'AbortError' ? 'timeout' : 'network', 'Falha de conexão.');
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = res.status === 204 ? null : await res.json(); } catch (_) { /* corpo vazio */ }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code || 'http_' + res.status, data?.error?.message, data?.error?.fields || {});
  }
  return data;
}

/** Lê um JSON estático do site (sem cache do navegador entre atualizações). */
async function getStaticJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
    if (!res.ok) throw new ApiError(res.status, 'static_unavailable', 'Conteúdo indisponível.');
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'network', 'Falha de conexão.');
  } finally { clearTimeout(timer); }
}

export const getStaticTracks = () => getStaticJson(CONFIG.tracksUrl);
export const getStaticArtists = () => getStaticJson(CONFIG.artistsUrl);

const real = {
  // Curto de propósito: a página não espera o servidor acordar para abrir (usa as datas do config.js)
  getStatus: () => request('GET', '/status', null, { timeoutMs: 8000 }),
  getTracks: () => (CONFIG.tracksUrl ? getStaticTracks() : request('GET', '/tracks')),
  getQuiz: () => request('GET', '/quiz'),
  createParticipation: (payload) => request('POST', '/participations', payload, { captchaAction: 'participation' }),
  createRadio: (payload) => request('POST', '/radios', payload, { captchaAction: 'radio' }),
  /** Status de uma rádio na fila de criação de playlists. */
  getRadio: (id) => request('GET', `/radios/${encodeURIComponent(id)}`, null, { timeoutMs: 15000 }),
  /** Soma 1 no contador de visitas do painel (sem dados pessoais). Nunca quebra a página. */
  registerVisit: () => fetch(CONFIG.apiBase + '/acesso', { method: 'POST', keepalive: true }).catch(() => {}),
};

export const api = CONFIG.useMocks ? mocks.api : real;
