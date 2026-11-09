/** Eventos para o Google Tag Manager (window.dataLayer). Nunca enviar dados pessoais aqui. */
export function track(event, params = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  } catch (_) { /* analytics nunca quebra o fluxo */ }
}
