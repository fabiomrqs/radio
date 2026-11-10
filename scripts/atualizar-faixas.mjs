#!/usr/bin/env node
/**
 * Atualiza assets/data/tracks.json com título, artistas, capa e status de lançamento
 * de cada faixa, direto da API do Spotify.
 *
 * Rode sempre que uma faixa nova sair e faça commit do tracks.json:
 *
 *   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/atualizar-faixas.mjs
 *
 * As credenciais vêm de um app criado em https://developer.spotify.com/dashboard
 * (grátis). Elas ficam só na sua máquina: o site publicado nunca vê a chave.
 * Requer Node 18 ou mais recente.
 *
 * Regras:
 *  - A ordem e os spotifyId do tracks.json são mantidos.
 *  - "released" vira false quando a faixa ainda não está tocável no Brasil.
 *  - Campos preenchidos à mão com "lock": true não são sobrescritos.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'assets/data/tracks.json');
const MARKET = 'BR';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.');
  process.exit(1);
}

async function token() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Falha no token (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function get(url, auth) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${auth}` } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`);
  return res.json();
}

const data = JSON.parse(await readFile(FILE, 'utf8'));
const auth = await token();

// /v1/tracks aceita até 50 ids por chamada
const ids = data.tracks.map((t) => t.spotifyId).filter(Boolean);
const found = new Map();
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const res = await get(`https://api.spotify.com/v1/tracks?market=${MARKET}&ids=${chunk.join(',')}`, auth);
  res.tracks.forEach((t, j) => found.set(chunk[j], t));
}

let changed = 0;
data.tracks = data.tracks.map((t) => {
  const s = found.get(t.spotifyId);
  if (!s) {
    console.warn(`! ${t.id} (${t.spotifyId}) não encontrada no Spotify; marcada como "Em breve".`);
    return { ...t, released: false };
  }
  const next = { ...t };
  if (!t.lock) {
    next.title = s.name;
    next.artist = s.artists.map((a) => a.name).join(', ');
    // a menor imagem com pelo menos 120px serve para a lista
    const imgs = [...(s.album?.images || [])].sort((a, b) => a.width - b.width);
    next.coverUrl = (imgs.find((im) => im.width >= 120) || imgs[imgs.length - 1])?.url || null;
  }
  next.released = s.is_playable !== false;
  if (JSON.stringify(next) !== JSON.stringify(t)) changed++;
  console.log(`${next.released ? '✓' : '…'} ${t.id}  ${next.title} – ${next.artist}`);
  return next;
});

await writeFile(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`\n${changed} faixa(s) atualizada(s). Lançadas: ${data.tracks.filter((t) => t.released).length}/${data.tracks.length}.`);
