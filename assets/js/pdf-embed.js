/**
 * Mostra o PDF do regulamento dentro de um box com rolagem.
 *
 * Usa o PDF.js (Mozilla) para desenhar as páginas, porque a maioria dos celulares não exibe
 * PDF dentro de uma página (no iPhone aparece só a 1ª página; no Android, nada).
 * Se o PDF.js não carregar, cai para o visualizador do próprio navegador (iframe).
 */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let libPromise = null;
function carregarPdfJs() {
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const s = document.createElement('script');
    s.src = PDFJS; s.async = true;
    s.onload = () => (window.pdfjsLib ? resolve(window.pdfjsLib) : reject(new Error('pdf.js')));
    s.onerror = () => reject(new Error('pdf.js'));
    document.head.appendChild(s);
  });
  libPromise.catch(() => { libPromise = null; });
  return libPromise;
}

const docs = new Map(); // url → promessa do documento (baixado uma vez só)

function iframeNativo(box, url) {
  const f = document.createElement('iframe');
  f.src = `${url}#view=FitH`; f.title = 'Regulamento da promoção'; f.loading = 'lazy';
  box.replaceChildren(f);
  box.classList.add('is-native');
}

async function desenhar(box, url) {
  box.replaceChildren(Object.assign(document.createElement('p'), { className: 'pdf-carregando', textContent: 'Carregando regulamento…' }));
  try {
    const lib = await carregarPdfJs();
    lib.GlobalWorkerOptions.workerSrc = WORKER;
    if (!docs.has(url)) docs.set(url, lib.getDocument(url).promise);
    const pdf = await docs.get(url);
    const largura = Math.max(280, box.clientWidth - 24);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const paginas = document.createDocumentFragment();
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const base = pagina.getViewport({ scale: 1 });
      const vp = pagina.getViewport({ scale: (largura / base.width) * dpr });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      canvas.style.width = `${largura}px`;
      canvas.setAttribute('aria-label', `Página ${n} de ${pdf.numPages}`);
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      paginas.appendChild(canvas);
    }
    box.replaceChildren(paginas);
    box.dataset.largura = String(largura);
  } catch (_) {
    iframeNativo(box, url);
  }
}

/** Desenha o PDF no box quando ele chega perto da tela (e redesenha se a largura mudar muito). */
export function embedPdf(box, url) {
  let feito = false;
  const iniciar = () => { if (!feito) { feito = true; desenhar(box, url); } };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); iniciar(); } }, { rootMargin: '400px' });
    io.observe(box);
  } else iniciar();
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const antes = Number(box.dataset.largura || 0);
      if (feito && antes && Math.abs(box.clientWidth - 24 - antes) > 80 && !box.classList.contains('is-native')) desenhar(box, url);
    }, 300);
  });
  return { forcar: iniciar };
}
