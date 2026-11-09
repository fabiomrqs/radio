/**
 * Filtro de palavras proibidas no nome da rádio.
 * Lista: "Minha Rádio GTA VI: The Album – versão inicial para aprovação da Warner – 03/11/2026".
 *
 * IMPORTANTE: este filtro é só para feedback imediato. O backend DEVE aplicar a mesma regra
 * em POST /radios (o front pode ser burlado). Sugestão: servir estas listas por API ou
 * compartilhar este arquivo com o backend (é JS puro, sem dependências de DOM).
 *
 * Duas regras:
 *  - BLOCK_ANYWHERE: bloqueia também dentro de outras palavras ("bolsonarista" pega "Rádio Bolsonaristas").
 *  - BLOCK_WHOLE: bloqueia só como palavra inteira. Sem isso, "cu" bloquearia "música" e "pt" bloquearia "captain".
 * Escreva tudo em minúsculas e sem acento.
 */
export const BLOCK_ANYWHERE = [
  // Política
  'bolsonaro', 'bolsonarista', 'bolsominion', 'lulista', 'petralha', 'petista', 'esquerdopata', 'direitopata',
  'comunista', 'fascista', 'intervencaomilitar', 'trump', 'biden', 'kamala',
  // Red pill e misoginia
  'redpill', 'blackpill', 'incel', 'mgtow', 'femoid', 'hipergamia', 'machoalfa', 'feminazi',
  // Discriminação
  'boiola', 'baitola', 'sapatao', 'traveco', 'retardado', 'mongoloide', 'crioulo', 'nigger', 'nigga', 'faggot', 'tranny',
  // Palavrões (português)
  'caralho', 'buceta', 'boceta', 'xoxota', 'xereca', 'piroca', 'punheta', 'siririca', 'arrombado', 'filhodaputa',
  'putaria', 'boquete', 'cuzao',
  // Palavrões (inglês)
  'fuck', 'motherfucker', 'bitch', 'pussy', 'cunt', 'asshole', 'bastard', 'whore', 'slut',
  // Ódio, violência grave e crimes
  'nazista', 'hitler', 'estupro', 'estuprador', 'pedofilo', 'pedofilia', 'terrorista', 'suicidio',
];

export const BLOCK_WHOLE = [
  // Política
  'lula', 'bozo', 'mito', 'pt', 'pl', 'psol', 'maga', 'ai5', 'ditadura', 'stf', 'xandao', 'moraes',
  // Red pill e misoginia
  'foid', 'simp', 'chad', 'vadia', 'piranha', 'vagabunda', 'quenga', 'rapariga',
  // Discriminação
  'viado', 'bicha', 'mongol', 'fag', 'retard', 'kike', 'chink', 'spic',
  // Palavrões (português)
  'porra', 'pinto', 'pau', 'pica', 'rola', 'cu', 'foda', 'foder', 'fodase', 'fdp', 'pqp', 'vsf', 'vtnc', 'krl',
  'puta', 'puto', 'merda', 'bosta', 'otario', 'babaca', 'corno', 'broxa',
  // Palavrões (inglês)
  'dick', 'cock', 'shit', 'porn', 'nude', 'nudes', 'sex', 'tits', 'boobs',
  // Ódio, violência grave e crimes
  'nazi', 'heil', 'kkk', '1488', 'rape', 'pedo',
];

/**
 * Avaliar com a Warner antes de bloquear (palavras comuns com uso ofensivo ou político).
 * NÃO são bloqueadas. Se aprovadas, mova para BLOCK_WHOLE.
 */
export const PENDING_REVIEW = ['veado', 'macaco', 'coxinha', 'mortadela', 'alfa', 'beta', 'sigma', 'gozar', 'tesao', 'safado', 'cocaina', 'maconha', 'crack'];

/** Nunca bloquear: "golpe" é resposta do quiz ("Planejar o golpe perfeito"). */
export const ALLOW = ['golpe'];

/* ---------- Normalização ---------- */
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
const unleet = (w) => w.replace(/[0-9@$!]/g, (c) => LEET[c]);
/** max=1: "fuuuck" → "fuck". max=2: "assssshole" → "asshole". */
const squeeze = (w, max) => w.replace(/(.)\1+/g, (_, c) => (max === 2 ? c + c : c));
const hasDouble = (w) => /(.)\1/.test(w);
/** Palavra da lista sem letra dobrada compara com o termo reduzido a 1; com dobrada, reduzido a 2.
 *  Assim "Níger" não bate com "nigger" e "Bobs" não bate com "boobs". */
const formFor = (b, x) => (hasDouble(b) ? squeeze(x, 2) : squeeze(x, 1));

function variants(term) {
  const raw = term.replace(/[^a-z0-9]/g, '');
  const leet = unleet(term).replace(/[^a-z0-9]/g, '');
  return [...new Set([raw, leet].filter(Boolean))];
}
function wholeHit(x, b) {
  if (x === b || formFor(b, x) === b) return true;
  // "kkkkk" ainda bate com "kkk": mesma forma reduzida e pelo menos o mesmo tamanho
  return hasDouble(b) && squeeze(x, 1) === squeeze(b, 1) && x.length >= b.length;
}

/** Retorna true se o nome contém termo proibido. */
export function isBlocked(text) {
  const n = norm(text);
  // Termos separados por espaço; pontuação dentro do termo é ignorada ("f.u.c.k", "ai-5").
  const terms = n.split(/\s+/).filter(Boolean);
  // Também palavras quebradas por pontuação ("rádio_lula" → "radio", "lula").
  n.split(/[^a-z0-9@$!]+/).forEach((t) => { if (t && !terms.includes(t)) terms.push(t); });
  return terms.some((t) => variants(t).some((x) => {
    if (ALLOW.includes(x)) return false;
    if (BLOCK_WHOLE.some((b) => wholeHit(x, b))) return true;
    return BLOCK_ANYWHERE.some((b) => x.includes(b) || formFor(b, x).includes(b));
  }));
}
