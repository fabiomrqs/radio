/**
 * Estado do fluxo. Persistido em sessionStorage para sobreviver a um refresh.
 * Dados pessoais do cadastro NÃO são persistidos.
 */
const KEY = 'radio-gta6:flow:v1';
const PERSISTED = ['trackId', 'answer', 'participationId', 'quizAnswers', 'radioName', 'radio'];

const initial = () => ({
  trackId: null,
  answer: '',
  participationId: null,
  quizAnswers: {},      // { [questionId]: optionId }
  quizStep: 0,
  radioName: '',
  radio: null,          // resposta de POST /radios
});

export const state = Object.assign(initial(), load());

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (_) { return {}; }
}
export function save() {
  try {
    const out = {};
    PERSISTED.forEach((k) => { out[k] = state[k]; });
    sessionStorage.setItem(KEY, JSON.stringify(out));
  } catch (_) { /* modo privado etc. */ }
}
export function set(patch) { Object.assign(state, patch); save(); }
export function resetRadio() { set({ quizAnswers: {}, quizStep: 0, radioName: '', radio: null }); }
export function resetAll() {
  Object.assign(state, initial());
  try { sessionStorage.removeItem(KEY); } catch (_) {}
}
