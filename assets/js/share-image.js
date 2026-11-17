/**
 * Imagem 9:16 (1080 × 1920) da rádio, para Stories do Instagram e para baixar.
 * Desenhada no navegador com canvas: capa da rádio, nome, texto de convite e links.
 */
const W = 1080, H = 1920;
const C = { bg: '#291C36', deep: '#1E1428', accent: '#F3A097', cream: '#F7D4BE', white: '#FFFFFF', soft: '#E8E1F2' };
const DISPLAY = '"Montserrat", "Arial Black", Arial, sans-serif';
const BODY = '"Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`imagem não carregou: ${src}`));
    img.src = src;
  });
}

/** Quebra o texto em linhas que cabem em `largura`. */
function linhas(ctx, texto, largura) {
  const out = [];
  let atual = '';
  for (const palavra of String(texto).split(/\s+/)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else { out.push(atual); atual = palavra; }
  }
  if (atual) out.push(atual);
  return out;
}

/** Escreve um parágrafo e devolve o y final. Reduz a fonte até caber em `maxLinhas`. */
function paragrafo(ctx, texto, { x, y, largura, fonte, tamanho, altura = 1.25, cor, maxLinhas = 99, alinhar = 'center' }) {
  let t = tamanho, ls;
  do { ctx.font = fonte.replace('{t}', t); ls = linhas(ctx, texto, largura); t -= 2; } while (ls.length > maxLinhas && t > 20);
  t += 2;
  ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.textBaseline = 'top';
  ls.forEach((l, i) => ctx.fillText(l, x, y + i * t * altura));
  return y + ls.length * t * altura;
}

function retanguloArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/**
 * @param {{ nomeFM: string, capaSrc: string, playlistUrl: string, siteUrl: string, convite: string }} d
 * @returns {Promise<Blob>} JPEG
 */
export async function gerarImagemStory(d) {
  try { await document.fonts?.ready; } catch (_) { /* segue com a fonte que tiver */ }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const capa = await carregarImagem(d.capaSrc);

  // Fundo: a própria capa ampliada e escurecida
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.filter = 'blur(40px)';
  ctx.drawImage(capa, -420, -120, H + 200, H + 200);
  ctx.restore();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(41,28,54,.55)'); grad.addColorStop(.45, 'rgba(41,28,54,.82)'); grad.addColorStop(1, 'rgba(30,20,40,.97)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Selo
  ctx.font = `800 34px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = C.accent;
  ctx.fillText('MINHA RÁDIO GTAVI: The Album', W / 2, 120);

  // Capa
  const lado = 760, cx = (W - lado) / 2, cy = 210;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  retanguloArredondado(ctx, cx, cy, lado, lado, 28); ctx.fillStyle = C.deep; ctx.fill();
  ctx.restore();
  ctx.save();
  retanguloArredondado(ctx, cx, cy, lado, lado, 28); ctx.clip();
  ctx.drawImage(capa, cx, cy, lado, lado);
  ctx.restore();

  // Nome da rádio
  let y = cy + lado + 70;
  y = paragrafo(ctx, d.nomeFM, { x: W / 2, y, largura: 920, fonte: `900 {t}px ${DISPLAY}`, tamanho: 96, altura: 1.05, cor: C.white, maxLinhas: 2 });

  // Escute … + link da playlist
  y += 40;
  y = paragrafo(ctx, `Escute ${d.nomeFM}, a minha rádio GTAVI: The Album`, {
    x: W / 2, y, largura: 900, fonte: `600 {t}px ${BODY}`, tamanho: 44, altura: 1.3, cor: C.soft, maxLinhas: 3,
  });
  y += 14;
  y = paragrafo(ctx, d.playlistUrl.replace(/^https?:\/\//, ''), {
    x: W / 2, y, largura: 940, fonte: `700 {t}px ${BODY}`, tamanho: 32, altura: 1.3, cor: C.cream, maxLinhas: 2,
  });

  // Convite (rodapé)
  const caixaY = Math.max(y + 60, H - 380);
  ctx.save();
  retanguloArredondado(ctx, 70, caixaY, W - 140, H - caixaY - 110, 32);
  ctx.fillStyle = 'rgba(243,160,151,.14)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = C.accent; ctx.stroke();
  ctx.restore();
  let yc = paragrafo(ctx, d.convite, {
    x: W / 2, y: caixaY + 44, largura: 820, fonte: `800 {t}px ${DISPLAY}`, tamanho: 42, altura: 1.25, cor: C.white, maxLinhas: 3,
  });
  paragrafo(ctx, d.siteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, ''), {
    x: W / 2, y: yc + 18, largura: 820, fonte: `900 {t}px ${DISPLAY}`, tamanho: 44, cor: C.accent, maxLinhas: 1,
  });

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('falha ao gerar imagem'))), 'image/jpeg', 0.9));
}
