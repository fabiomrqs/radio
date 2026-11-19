/**
 * Fotos dos artistas aprovadas pela Warner (assets/img/artistas).
 * O nome que vem do Spotify é comparado de forma aproximada (sem acento, maiúsculas ou pontuação,
 * aceitando pequenas diferenças de grafia). Artista sem foto aqui não aparece na rádio.
 */
export const ARTIST_PHOTOS = [
  { name: 'Travis Scott', file: 'travis-scott', aliases: ['travis scott'] },
  { name: 'Tove Lo', file: 'tove-lo', aliases: ['tove lo'] },
  { name: 'Burna Boy', file: 'burna-boy', aliases: ['burna boy', 'burna'] },
  { name: 'Dua Lipa', file: 'dua-lipa', aliases: ['dua lipa'] },
  { name: 'Fuerza Regida', file: 'fuerza-regida', aliases: ['fuerza regida'] },
  { name: 'Omar Apollo', file: 'omar-apollo', aliases: ['omar apollo'] },
  { name: 'Keith Richards', file: 'keith-richards', aliases: ['keith richards'] },
  { name: 'Tee Grizzley', file: 'tee-grizzley', aliases: ['tee grizzley'] },
  { name: 'JENNIE', file: 'jennie', aliases: ['jennie'] },
  { name: 'Playboi Carti', file: 'playboi-carti', aliases: ['playboi carti', 'playboy carti'] },
  { name: 'Camila Cabello', file: 'camila-cabello', aliases: ['camila cabello', 'camilla cabello'] },
  { name: 'Rose Gray', file: 'rose-gray', aliases: ['rose gray', 'rose grey'] },
  { name: 'Zara Larsson', file: 'zara-larsson', aliases: ['zara larsson'] },
  { name: 'Gunna', file: 'gunna', aliases: ['gunna'] },
  { name: 'Rina Sawayama', file: 'rina-sawayama', aliases: ['rina sawayama'] },
  // Foto única do trio: aparece uma vez, para qualquer um dos três
  { name: 'Yung Lean, Future & Metro Boomin', file: 'yung-lean-future-metro-boomin', aliases: ['yung lean', 'future', 'metro boomin'] },
  { name: 'Kodak Black', file: 'kodak-black', aliases: ['kodak black', 'yak'] },
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Encontra a foto de um artista pelo nome (ou null). */
export function photoFor(nome) {
  const n = norm(nome);
  if (!n) return null;
  for (const a of ARTIST_PHOTOS) {
    for (const alias of a.aliases) {
      const k = norm(alias);
      // igual, ou diferença de até 1 letra em nomes curtos / 2 em nomes longos ("Playboy Carti")
      if (n === k || distancia(n, k) <= (k.length >= 9 ? 2 : k.length >= 7 ? 1 : 0)) return a;
    }
  }
  return null;
}

/**
 * Lista final para a rádio: só artistas com foto, sem repetir (o trio aparece uma vez).
 * Mantém a ordem recebida (o primeiro é o destaque).
 */
export function artistsWithPhotos(lista = []) {
  const vistos = new Set();
  const out = [];
  for (const a of lista) {
    // "Yung Lean feat. Future & Metro Boomin" também conta: testa cada nome separado
    const nomes = [a.name, ...String(a.name || '').split(/,|&| feat\.?| ft\.?| x | e /i)];
    const achado = nomes.map(photoFor).find(Boolean);
    if (achado && !vistos.has(achado.file)) {
      vistos.add(achado.file);
      out.push({ name: achado.name, photoUrl: `assets/img/artistas/${achado.file}.jpg`, spotifyUrl: a.spotifyUrl || null });
    }
  }
  return out;
}
