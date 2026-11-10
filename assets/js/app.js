/**
 * Rádio GTA VI: The Album – aplicação.
 * Roteamento por hash (#inicio, #musica…) para funcionar em qualquer hospedagem estática.
 */
import { CONFIG } from './config.js';
import { api, ApiError } from './api.js';
import { state, set, resetRadio } from './store.js';
import { masks, validateField, parseBirthDate, onlyDigits } from './validation.js';
import { isBlocked } from './profanity.js';
import { track } from './analytics.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const params = new URLSearchParams(location.search);
const QA = CONFIG.features.qaPanel && params.get('qa') === '1';

/* ============================================================
   Utilidades
   ============================================================ */
const fmtDay = (iso) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: CONFIG.timezone }).format(new Date(iso));
const D = {
  start: fmtDay(CONFIG.dates.start),
  end: fmtDay(CONFIG.dates.end),
  result: fmtDay(CONFIG.dates.result),
};
function setText(key, value) { $$(`[data-text="${key}"]`).forEach((el) => { el.textContent = value; }); }
function setLoading(btn, on) {
  btn.classList.toggle('is-loading', on);
  btn.disabled = on;
  btn.setAttribute('aria-busy', on ? 'true' : 'false');
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
}
function friendlyError(err) {
  if (!(err instanceof ApiError)) return 'Algo deu errado. Tente de novo.';
  if (err.status === 0) return 'Não conseguimos conectar. Confira sua internet e tente de novo.';
  if (err.status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (err.code === 'promo_closed') return 'As participações estão encerradas.';
  return err.message && err.status < 500 ? err.message : 'Nosso servidor não respondeu. Tente de novo em instantes.';
}
const firstName = (artist) => artist.split(/,| feat\.| ft\.| & | x /i)[0].trim();

/* ============================================================
   Fase da promoção
   pre → promo → encerrada → resultado → arquivo
   ============================================================ */
let status = { phase: 'promo', winner: null };

async function loadStatus() {
  try { status = await api.getStatus(); } catch (_) { status = { phase: phaseByDate(), winner: null }; }
  if (QA && params.get('fase')) {
    status.phase = params.get('fase');
    if (['resultado', 'arquivo'].includes(status.phase) && !status.winner) status.winner = { displayName: 'Ana S.' };
  }
}
function phaseByDate(now = new Date()) {
  const d = Object.fromEntries(Object.entries(CONFIG.dates).map(([k, v]) => [k, new Date(v)]));
  if (now < d.start) return 'pre';
  if (now <= d.end) return 'promo';
  if (now < d.result) return 'encerrada';
  if (now < d.archive) return 'resultado';
  return 'arquivo';
}

/* ============================================================
   Roteador
   ============================================================ */
const ROUTES = {
  inicio:       { screen: () => homeScreen(), title: 'Rádio GTA VI: The Album' },
  musica:       { screen: 'musica', title: 'Escolha a faixa', back: 'inicio', guard: () => isPromo() },
  resposta:     { screen: 'resposta', title: 'Por que essa faixa', back: 'musica', guard: () => isPromo() && state.trackId ? true : 'musica' },
  cadastro:     { screen: 'cadastro', title: 'Seus dados', back: 'resposta', guard: () => isPromo() && state.trackId && state.answer.trim() ? true : 'resposta' },
  confirmado:   { screen: 'confirmado', title: 'Participação confirmada', guard: () => !!state.participationId },
  quiz:         { screen: 'quiz', title: 'Monte sua rádio', back: () => quizBack(), guard: () => canMakeRadio() },
  personalizar: { screen: 'personalizar', title: 'Nome da rádio', back: 'quiz', guard: () => canMakeRadio() && quizComplete() ? true : 'quiz' },
  radio:        { screen: 'radio', title: 'Sua rádio', back: 'inicio', guard: () => !!state.radio },
};
/* Antes do início ('pre') o fluxo de participação fica liberado no front para testes.
   O backend deve recusar envios fora do período com 403 promo_closed. */
const isPromo = () => ['pre', 'promo'].includes(status.phase);
const canMakeRadio = () => (isPromo() ? !!state.participationId : ['encerrada', 'resultado'].includes(status.phase));
function homeScreen() {
  if (status.phase === 'arquivo') return 'home-arquivo';
  if (['encerrada', 'resultado'].includes(status.phase)) return 'home-pos';
  return 'home-promo';
}

let current = null;
function go(route) { if (location.hash === '#' + route) render(); else location.hash = route; }

function render() {
  let name = location.hash.slice(1) || 'inicio';
  if (name === 'regulamento') { name = 'inicio'; }
  let route = ROUTES[name];
  if (!route) { history.replaceState(null, '', '#inicio'); name = 'inicio'; route = ROUTES.inicio; }

  if (route.guard) {
    const ok = route.guard();
    if (ok !== true) {
      const target = typeof ok === 'string' ? ok : 'inicio';
      history.replaceState(null, '', '#' + (target === name ? 'inicio' : target));
      return render();
    }
  }

  const screenId = typeof route.screen === 'function' ? route.screen() : route.screen;
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === screenId));
  document.title = route.title === ROUTES.inicio.title ? route.title : `${route.title} | Rádio GTA VI: The Album`;
  $('#headerBack').hidden = !route.back;

  const enter = SCREEN_ENTER[screenId];
  if (enter) enter();

  const changed = current !== name;
  current = name;
  if (location.hash === '#regulamento') {
    requestAnimationFrame(() => $('#regulamento').scrollIntoView());
  } else if (changed) {
    window.scrollTo(0, 0);
    // Foco no título da tela para leitores de tela
    const h = $(`[data-screen="${screenId}"] h1`);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  track('page_view_virtual', { page: name, phase: status.phase });
}

$('#headerBack').addEventListener('click', () => {
  const r = ROUTES[current];
  if (!r?.back) return;
  const target = typeof r.back === 'function' ? r.back() : r.back;
  if (target) go(target);
});
window.addEventListener('hashchange', render);

/* ============================================================
   Home
   ============================================================ */
function enterHome() {
  setText('periodo', `Participações de ${D.start} a ${D.end}. Resultado revelado nesta página em ${D.result}.`);
}
$('#ctaParticipate').addEventListener('click', () => track('cta_participar'));

function enterHomePos() {
  const hasWinner = !!status.winner;
  $('[data-screen="home-pos"] [data-block="winner"]').hidden = !hasWinner;
  $('[data-screen="home-pos"] [data-block="awaiting"]').hidden = hasWinner;
  setText('posTitle', hasWinner ? 'A cidade já tem um dono' : 'Participações encerradas');
  setText('awaitingMsg', `O resultado será revelado nesta página em ${D.result}. Segura a ansiedade!`);
  setText('winnerName', status.winner?.displayName || '');
  setText('closedMsg', `A promoção foi encerrada em ${D.end}. Valeu a todos que encararam o desafio!`);
}

/* ============================================================
   Passo 1 – faixas
   ============================================================ */
let tracks = null;

async function enterMusic() {
  if (tracks) { if (!$('#trackList').childElementCount) renderTracks(); else syncTrackSelection(); return; }
  const box = $('#tracksState');
  box.innerHTML = '<div class="stack gap-10" aria-label="Carregando faixas"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
  try {
    tracks = normalizeTracks(await api.getTracks());
    box.innerHTML = '';
    renderTracks();
  } catch (err) {
    box.innerHTML = '';
    const s = document.createElement('div');
    s.className = 'state-box';
    s.innerHTML = '<p class="body"></p><button type="button" class="btn btn-ghost">Tentar de novo</button>';
    s.querySelector('p').textContent = `Não conseguimos carregar as faixas. ${friendlyError(err)}`;
    s.querySelector('button').addEventListener('click', enterMusic);
    box.appendChild(s);
  }
}

/** Padroniza a lista vinda do JSON estático ou do backend. */
function normalizeTracks(res) {
  return (res.tracks || []).map((t, i) => ({
    ...t,
    n: i + 1,
    released: t.released !== false,
    spotifyEmbedUrl: t.spotifyEmbedUrl || (t.spotifyId ? `https://open.spotify.com/embed/track/${t.spotifyId}?utm_source=generator&theme=0` : null),
    spotifyUrl: t.spotifyUrl || (t.spotifyId ? `https://open.spotify.com/track/${t.spotifyId}` : null),
  }));
}
const trackLabel = (t) => t.title || `Faixa ${t.n}`;
const canPick = (t) => t.released || CONFIG.features.unreleasedSelectable;

/**
 * Se o tracks.json ainda não tem título, tenta buscar no oEmbed público do Spotify.
 * Se não der (rede/CORS), a linha mostra o player do Spotify aberto, que já exibe título e artista.
 */
async function enrichFromSpotify(t, li) {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(t.spotifyUrl)}`);
    if (!res.ok) throw new Error(res.status);
    const o = await res.json();
    if (!o.title) throw new Error('sem título');
    t.title = o.title;
    if (!t.coverUrl && o.thumbnail_url) t.coverUrl = o.thumbnail_url;
    paintTrackMeta(t, li);
    if (state.trackId === t.id) syncTrackSelection();
  } catch (_) {
    openEmbed(t, li);
  }
}
function paintTrackMeta(t, li) {
  $('.track-title', li).textContent = trackLabel(t);
  $('.track-artist', li).textContent = t.artist || '';
  $('input', li).setAttribute('aria-label', [trackLabel(t), t.artist, t.released ? '' : 'em breve'].filter(Boolean).join(', '));
  const cover = $('.track-cover', li);
  if (t.coverUrl && cover.tagName !== 'IMG') {
    const img = new Image(); img.src = t.coverUrl; img.alt = ''; img.className = 'track-cover'; img.loading = 'lazy';
    img.width = 56; img.height = 56;
    cover.replaceWith(img);
  }
}
function openEmbed(t, li) {
  const play = $('.track-play', li), embed = $('.track-embed', li);
  if (!play || !t.spotifyEmbedUrl) return;
  play.setAttribute('aria-expanded', 'true');
  embed.hidden = false;
  if (!embed.childElementCount) {
    const f = document.createElement('iframe');
    f.src = t.spotifyEmbedUrl; f.loading = 'lazy'; f.title = `Prévia de ${trackLabel(t)} no Spotify`;
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    embed.appendChild(f);
  }
}

function renderTracks() {
  const list = $('#trackList');
  list.innerHTML = '';
  tracks.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'track' + (t.released ? '' : ' is-soon');
    li.innerHTML = `
      <div class="track-row">
        <label class="track-main">
          <input class="sr-only" type="radio" name="track">
          <span class="radio-dot" aria-hidden="true"></span>
          <span class="track-cover" aria-hidden="true"></span>
          <span class="track-meta"><span class="track-title"></span><span class="track-artist"></span></span>
        </label>
        ${t.released ? `<button class="track-play" type="button" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>` : '<span class="soon-badge">Em breve</span>'}
      </div>
      <div class="track-embed" hidden></div>`;
    const input = $('input', li);
    input.value = t.id;
    input.disabled = !canPick(t);
    input.checked = state.trackId === t.id;
    input.addEventListener('change', () => pickTrack(t.id));
    const cover = $('.track-cover', li);
    cover.textContent = String(t.n).padStart(2, '0');
    paintTrackMeta(t, li);

    const play = $('.track-play', li);
    if (play) {
      play.setAttribute('aria-label', `Ouvir prévia de ${trackLabel(t)}`);
      play.addEventListener('click', () => {
        const open = play.getAttribute('aria-expanded') !== 'true';
        if (open) { openEmbed(t, li); track('ouvir_previa', { track_id: t.id }); }
        else { play.setAttribute('aria-expanded', 'false'); $('.track-embed', li).hidden = true; }
      });
    }
    list.appendChild(li);
    if (!t.title && t.spotifyUrl && t.released) enrichFromSpotify(t, li);
  });
  syncTrackSelection();
}
function syncTrackSelection() {
  const t = tracks?.find((x) => x.id === state.trackId);
  $('#pickedName').textContent = t ? trackLabel(t) : 'nenhuma ainda';
  $('#toAnswer').disabled = !t;
  $$('#trackList input[name="track"]').forEach((i) => { i.checked = i.value === state.trackId; });
}
function pickTrack(id) { set({ trackId: id }); syncTrackSelection(); track('selecionar_faixa', { track_id: id }); }
$('#toAnswer').addEventListener('click', () => go('resposta'));

/* ============================================================
   Passo 2 – resposta
   ============================================================ */
const answer = $('#answer');
answer.maxLength = CONFIG.limits.answerMax;
async function enterAnswer() {
  if (!tracks) { try { tracks = normalizeTracks(await api.getTracks()); } catch (_) { tracks = []; } }
  const t = tracks.find((x) => x.id === state.trackId) || { title: '', artist: '' };
  $('#answerTitle').textContent = t.n ? trackLabel(t) : '';
  $('#answerArtist').textContent = t.artist || '';
  const ac = $('#answerCover');
  if (ac) {
    if (t.coverUrl) ac.innerHTML = `<img src="${encodeURI(t.coverUrl)}" alt="" width="56" height="56" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;
    else ac.textContent = t.n ? String(t.n).padStart(2, '0') : '';
  }
  if (answer.value !== state.answer) answer.value = state.answer;
  updateAnswerCount();
}
function updateAnswerCount() { $('#answerCount').textContent = `${answer.value.length}/${CONFIG.limits.answerMax} caracteres`; }
answer.addEventListener('input', () => {
  set({ answer: answer.value });
  updateAnswerCount();
  if (answer.value.trim()) { answer.removeAttribute('aria-invalid'); $('#answerErr').textContent = ''; }
});
$('#toForm').addEventListener('click', () => {
  if (!answer.value.trim()) {
    answer.setAttribute('aria-invalid', 'true');
    $('#answerErr').textContent = 'Escreva sua resposta pra seguir.';
    answer.focus();
    return;
  }
  track('resposta_preenchida', { length: answer.value.length });
  go('cadastro');
});

/* ============================================================
   Passo 3 – cadastro
   ============================================================ */
const form = $('#participationForm');
const FIELD_NAMES = ['nome', 'nascimento', 'cpf', 'email', 'telefone', 'cidade'];
/** Nome do campo no backend → nome do campo no formulário (para erros 422). */
const BACKEND_FIELD = { name: 'nome', birthDate: 'nascimento', cpf: 'cpf', email: 'email', phone: 'telefone', city: 'cidade', consents: 'aceites' };

function showFieldError(name, msg) {
  const input = form.elements[name];
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  const el = $('#e-' + name);
  if (el) el.textContent = msg || '';
}
$$('[data-mask]', form).forEach((input) => {
  input.addEventListener('input', () => {
    const masked = masks[input.dataset.mask](input.value);
    if (masked !== input.value) input.value = masked;
  });
});
FIELD_NAMES.forEach((name) => {
  const input = form.elements[name];
  input.addEventListener('blur', () => { if (input.value) showFieldError(name, validateField(name, input.value, CONFIG.limits)); });
  input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showFieldError(name, validateField(name, input.value, CONFIG.limits)); });
});
['aceiteRegulamento', 'aceitePrivacidade'].forEach((n) => form.elements[n].addEventListener('change', () => {
  if (form.elements.aceiteRegulamento.checked && form.elements.aceitePrivacidade.checked) showFieldError('aceites', '');
}));

function utm() {
  const out = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => { if (params.get(k)) out[k] = params.get(k); });
  return out;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#formAlert').textContent = '';
  let firstInvalid = null;
  FIELD_NAMES.forEach((name) => {
    const msg = validateField(name, form.elements[name].value, CONFIG.limits);
    showFieldError(name, msg);
    if (msg && !firstInvalid) firstInvalid = form.elements[name];
  });
  if (!form.elements.aceiteRegulamento.checked || !form.elements.aceitePrivacidade.checked) {
    showFieldError('aceites', 'Aceite o regulamento e a Política de Privacidade pra participar.');
    if (!firstInvalid) firstInvalid = form.elements.aceiteRegulamento;
  }
  if (firstInvalid) { firstInvalid.focus(); return; }

  const now = new Date().toISOString();
  const payload = {
    trackId: state.trackId,
    answer: state.answer.trim(),
    name: form.elements.nome.value.trim().replace(/\s+/g, ' '),
    birthDate: parseBirthDate(form.elements.nascimento.value),
    cpf: onlyDigits(form.elements.cpf.value),
    email: form.elements.email.value.trim().toLowerCase(),
    phone: onlyDigits(form.elements.telefone.value),
    city: form.elements.cidade.value.trim(),
    consents: {
      rules: { accepted: true, at: now },
      privacy: { accepted: true, at: now },
      marketingWarner: { accepted: form.elements.optinWarner.checked, at: now },
    },
    website: form.elements.website.value, // honeypot
    utm: utm(),
  };

  const btn = $('#submitBtn');
  setLoading(btn, true);
  try {
    const res = await api.createParticipation(payload);
    set({ participationId: res.participationId, answer: '' });
    form.reset();
    track('participacao_enviada', { track_id: payload.trackId, optin_warner: payload.consents.marketingWarner.accepted });
    resetRadio();
    go('confirmado');
  } catch (err) {
    if (err instanceof ApiError && err.status === 422 && Object.keys(err.fields).length) {
      let focused = false;
      Object.entries(err.fields).forEach(([k, msg]) => {
        const name = BACKEND_FIELD[k] || k;
        showFieldError(name, msg);
        if (!focused && form.elements[name]) { form.elements[name].focus(); focused = true; }
      });
    } else {
      const alert = $('#formAlert');
      alert.textContent = err.code === 'already_participated'
        ? 'Este CPF já está participando da promoção. Cada pessoa participa uma vez, conforme o regulamento.'
        : friendlyError(err);
      alert.focus();
    }
    track('participacao_erro', { code: err.code || 'unknown' });
  } finally {
    setLoading(btn, false);
  }
});

/* ============================================================
   Confirmação
   ============================================================ */
function enterConfirm() { setText('resultChip', `Resultado em ${D.result}`); }

/* ============================================================
   Quiz
   ============================================================ */
let quiz = null;
async function ensureQuiz() { if (!quiz) quiz = await api.getQuiz(); return quiz; }
const quizComplete = () => !!quiz && quiz.questions.every((q) => state.quizAnswers[q.id]);
function quizBack() {
  if (state.quizStep > 0) { set({ quizStep: state.quizStep - 1 }); renderQuestion(); return null; }
  return isPromo() ? 'confirmado' : 'inicio';
}

async function enterQuiz() {
  $('#quizKicker').textContent = isPromo() ? 'Enquanto o resultado não é revelado' : 'Monte sua rádio';
  const box = $('#quizState');
  if (!quiz) {
    box.innerHTML = '<div class="stack gap-10"><div class="skeleton"></div><div class="skeleton"></div></div>';
    $('#quizBody').innerHTML = '';
    try { await ensureQuiz(); box.innerHTML = ''; } catch (err) {
      box.innerHTML = '<div class="state-box"><p class="body"></p><button type="button" class="btn btn-ghost">Tentar de novo</button></div>';
      $('p', box).textContent = `Não conseguimos carregar as perguntas. ${friendlyError(err)}`;
      $('button', box).addEventListener('click', enterQuiz);
      return;
    }
  }
  if (state.quizStep >= quiz.questions.length) set({ quizStep: 0 });
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.questions[state.quizStep];
  const n = quiz.questions.length;
  $('#quizDots').innerHTML = quiz.questions.map((_, i) => `<span class="${i <= state.quizStep ? 'is-on' : ''}"></span>`).join('');
  const body = $('#quizBody');
  body.innerHTML = `
    <fieldset class="quiz-fieldset slide-in">
      <legend class="stack gap-6"><span class="small">Pergunta ${state.quizStep + 1} de ${n}</span><h1 class="h1"></h1></legend>
    </fieldset>`;
  $('h1', body).textContent = q.text;
  const fs = $('fieldset', body);
  q.options.forEach((o) => {
    const label = document.createElement('label');
    label.className = 'opt';
    label.innerHTML = '<input class="sr-only" type="radio"><span class="opt-ico" aria-hidden="true"></span><span></span>';
    const input = $('input', label);
    input.name = q.id; input.value = o.id; input.checked = state.quizAnswers[q.id] === o.id;
    input.addEventListener('change', () => {
      set({ quizAnswers: { ...state.quizAnswers, [q.id]: o.id } });
      $('#quizNext').disabled = false;
    });
    label.children[1].textContent = o.icon || '';
    label.children[2].textContent = o.label;
    fs.appendChild(label);
  });
  const next = $('#quizNext');
  next.disabled = !state.quizAnswers[q.id];
  next.textContent = state.quizStep < n - 1 ? 'Próxima' : 'Continuar';
}
$('#quizNext').addEventListener('click', () => {
  const n = quiz.questions.length;
  track('quiz_resposta', { question_id: quiz.questions[state.quizStep].id, option_id: state.quizAnswers[quiz.questions[state.quizStep].id] });
  if (state.quizStep < n - 1) {
    set({ quizStep: state.quizStep + 1 });
    renderQuestion();
    window.scrollTo(0, 0);
    $('#quizBody h1').setAttribute('tabindex', '-1');
    $('#quizBody h1').focus({ preventScroll: true });
  } else go('personalizar');
});

/* ============================================================
   Personalizar
   ============================================================ */
const nameInput = $('#radioName');
nameInput.maxLength = CONFIG.limits.radioNameMax;
function selectedCover() {
  const q = quiz.questions.find((x) => x.definesCover) || quiz.questions[0];
  const o = q.options.find((x) => x.id === state.quizAnswers[q.id]) || q.options[0];
  return { option: o, cover: o.cover || { name: o.label, imageUrl: 'assets/img/kv-gta-vi-the-album.jpg' } };
}
async function enterCustomize() {
  await ensureQuiz();
  const { option, cover } = selectedCover();
  // Prévia da capa é opcional: só preenche se o bloco existir no HTML
  const img = $('#coverThumb');
  if (img) { img.src = cover.imageUrl; img.alt = `Capa ${cover.name}`; }
  const coverName = $('#coverName');
  if (coverName) coverName.textContent = cover.name;
  const coverWhy = $('#coverWhy');
  if (coverWhy) coverWhy.textContent = `Definida pela sua resposta: “${option.label}”.`;
  if (!state.radioName) set({ radioName: `Rádio ${cover.name}` });
  nameInput.value = state.radioName;
  checkName(false);
}
function checkName(showEmpty = true) {
  const v = nameInput.value;
  $('#nameCount').textContent = `${v.length}/${CONFIG.limits.radioNameMax}`;
  let msg = '';
  if (!v.trim()) msg = showEmpty ? 'Dê um nome pra sua rádio.' : '';
  else if (isBlocked(v)) msg = 'Nome não aceito. Tente outro.';
  nameInput.setAttribute('aria-invalid', msg ? 'true' : 'false');
  $('#nameErr').textContent = msg;
  $('#toRadio').disabled = !v.trim() || !!msg;
  return !msg && !!v.trim();
}
nameInput.addEventListener('input', () => { set({ radioName: nameInput.value }); checkName(); });

$('#toRadio').addEventListener('click', async () => {
  if (!checkName()) { nameInput.focus(); return; }
  const btn = $('#toRadio');
  const overlay = $('#radioLoading');
  setLoading(btn, true); overlay.hidden = false;
  try {
    const radio = await api.createRadio({
      participationId: state.participationId, // null fora da promoção
      answers: state.quizAnswers,
      name: nameInput.value.trim(),
    });
    set({ radio });
    track('radio_gerada', { cover_id: radio.cover?.id });
    go('radio');
  } catch (err) {
    if (err instanceof ApiError && err.fields?.name) {
      $('#nameErr').textContent = err.fields.name;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
    } else toast(friendlyError(err));
  } finally {
    setLoading(btn, false); overlay.hidden = true;
    checkName();
  }
});

/* ============================================================
   Rádio gerada
   ============================================================ */
function enterRadio() {
  const r = state.radio;
  if (!r) return;
  const cover = $('#stationCover');
  cover.src = r.cover?.imageUrl || 'assets/img/kv-gta-vi-the-album.jpg';
  cover.alt = `Capa da rádio ${r.name}`;
  $('#stationName').textContent = r.name;
  $('#stationLink').textContent = r.playlistUrl.replace(/^https?:\/\//, '');
  $('#playRadio').href = r.playlistUrl;

  const artist = $('#stationArtist');
  artist.innerHTML = '';
  if (r.featuredArtist?.photoUrl) {
    const img = new Image(); img.src = r.featuredArtist.photoUrl; img.alt = r.featuredArtist.name;
    artist.appendChild(img);
  } else artist.textContent = `[FOTO DO ARTISTA${r.featuredArtist ? ': ' + r.featuredArtist.name : ''}]`;

  const lineup = $('#lineup');
  lineup.innerHTML = '';
  (r.artists || []).forEach((a) => {
    const li = document.createElement('li');
    li.innerHTML = '<div class="avatar"></div><span></span>';
    const av = $('.avatar', li);
    if (a.photoUrl) {
      av.classList.add('has-img');
      const img = new Image(); img.src = a.photoUrl; img.alt = ''; img.loading = 'lazy'; av.appendChild(img);
    } else av.textContent = '[FOTO]';
    $('span', li).textContent = firstName(a.name);
    lineup.appendChild(li);
  });
  $('#lineupBlock').hidden = !(r.artists || []).length;

  const foot = $('#radioFoot'); // opcional
  if (foot) foot.textContent = isPromo()
    ? `O resultado do concurso será revelado nesta página em ${D.result}.`
    : 'Bom jogo! Manda sua rádio pro seu bonde.';

  const card = $('#stationCard');
  card.classList.remove('reveal'); void card.offsetWidth; card.classList.add('reveal');
}
$('#shareRadio').addEventListener('click', async () => {
  const r = state.radio;
  const data = { title: r.name, text: `Escuta a minha rádio de GTA VI: The Album: ${r.name}`, url: r.shareUrl || r.playlistUrl };
  if (navigator.share) {
    try { await navigator.share(data); track('compartilhar_radio', { method: 'native' }); } catch (_) { /* cancelado */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${data.text} ${data.url}`);
    toast('Link copiado. Agora é só colar e mandar!');
    track('compartilhar_radio', { method: 'clipboard' });
  } catch (_) { toast('Copie o link: ' + data.url); }
});
$('#newRadio')?.addEventListener('click', () => { resetRadio(); go('quiz'); });

const SCREEN_ENTER = {
  'home-promo': enterHome,
  'home-pos': enterHomePos,
  'home-arquivo': enterHomePos,
  musica: enterMusic,
  resposta: enterAnswer,
  confirmado: enterConfirm,
  quiz: enterQuiz,
  personalizar: enterCustomize,
  radio: enterRadio,
};

/* ============================================================
   Regulamento (embed na home + modal) e links
   ============================================================ */
function fillRules() {
  $$('[data-slot="rules"]').forEach((slot) => {
    if (CONFIG.links.rulesEmbedUrl) {
      slot.innerHTML = '';
      const f = document.createElement('iframe');
      f.src = CONFIG.links.rulesEmbedUrl; f.title = 'Regulamento da promoção'; f.loading = 'lazy';
      slot.appendChild(f);
      slot.style.padding = '0';
    } else slot.innerHTML = CONFIG.rulesHtml;
  });
}
function fillLinks() {
  $$('[data-link]').forEach((a) => { a.href = CONFIG.links[a.dataset.link] || '#'; });
  $$('[data-feature]').forEach((el) => { el.hidden = !CONFIG.features[el.dataset.feature]; });
}

const modal = $('#modal');
let lastFocus = null;
function openModal() {
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#modalClose').focus();
  track('abrir_regulamento');
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  lastFocus?.focus();
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-modal]')) { e.preventDefault(); openModal(); }
  const tracked = e.target.closest('a[data-track]');
  if (tracked && tracked.id !== 'ctaParticipate') track(tracked.dataset.track);
});
$('#modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') { // mantém o foco dentro do modal
    const f = $$('button, [href], [tabindex]:not([tabindex="-1"]), iframe', modal);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ============================================================
   Painel de QA (?qa=1) – navegar entre telas e fases
   ============================================================ */
async function mountQA() {
  // Preenche o estado com dados de teste para abrir qualquer tela direto
  try {
    if (!tracks) tracks = normalizeTracks(await api.getTracks());
    await ensureQuiz();
  } catch (_) {}
  const seed = async (route) => {
    if (['resposta', 'cadastro', 'confirmado'].includes(route) && !state.trackId) set({ trackId: tracks[0].id });
    if (route === 'cadastro' && !state.answer) set({ answer: 'Resposta de teste.' });
    if (['confirmado', 'quiz', 'personalizar', 'radio'].includes(route) && !state.participationId) set({ participationId: 'p_qa' });
    if (['personalizar', 'radio'].includes(route) && !quizComplete()) {
      const a = {}; quiz.questions.forEach((q) => { a[q.id] = q.options[1].id; }); set({ quizAnswers: a, quizStep: quiz.questions.length - 1 });
    }
    if (route === 'radio' && !state.radio) set({ radio: await api.createRadio({ participationId: 'p_qa', answers: state.quizAnswers, name: 'Rádio Vice Nights' }) });
    if (route === 'quiz') set({ quizStep: 0 });
  };
  const wrap = document.createElement('div');
  wrap.className = 'qa';
  const routes = [['inicio', 'Home (fase atual)'], ['musica', '1. Escolha da faixa'], ['resposta', '2. Por que essa faixa'], ['cadastro', '3. Cadastro'], ['confirmado', 'Confirmação'], ['quiz', 'Quiz'], ['personalizar', 'Nome e capa'], ['radio', 'Rádio gerada']];
  const phases = [['pre', 'Antes do início'], ['promo', 'Promoção ativa'], ['encerrada', 'Encerrada, sem resultado'], ['resultado', 'Resultado + criar rádio'], ['arquivo', 'Só resultado']];
  wrap.innerHTML = `<button type="button" aria-expanded="false">QA</button><div class="qa-panel" hidden>
    <p>Telas</p>${routes.map(([r, l]) => `<a href="#${r}" data-qa-route="${r}">${l}</a>`).join('')}
    <p>Fase (fase atual: ${status.phase})</p>${phases.map(([f, l]) => `<a href="?qa=1&fase=${f}#inicio">${l}</a>`).join('')}
    <p>Testes</p><a href="#" data-qa-reset>Limpar estado do fluxo</a></div>`;
  const btn = $('button', wrap), panel = $('.qa-panel', wrap);
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden)); });
  wrap.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-qa-route]');
    if (a) { e.preventDefault(); await seed(a.dataset.qaRoute); panel.hidden = true; go(a.dataset.qaRoute); }
    if (e.target.closest('[data-qa-reset]')) { e.preventDefault(); sessionStorage.clear(); location.reload(); }
  });
  document.body.appendChild(wrap);
}

/* ============================================================
   Início
   ============================================================ */
(async function init() {
  fillLinks();
  fillRules();
  await loadStatus();
  if (state.quizStep == null) set({ quizStep: 0 });
  if (['personalizar'].includes(location.hash.slice(1))) { try { await ensureQuiz(); } catch (_) {} }
  render();
  if (QA) mountQA();
})();
