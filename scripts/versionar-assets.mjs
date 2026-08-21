/**
 * Versiona CSS e JS locais nos HTML com ?v=<hash do conteudo>.
 *
 * Porque isto existe: o edge da Cloudflare serve os CSS com
 * `max-age=86400, stale-while-revalidate=604800`. Sem versao no URL, uma
 * correccao de CSS demora ate 24h a chegar aos visitantes (medido a
 * 19/08/2026: type-scale-v2.css servido com 4881 bytes quando o ficheiro
 * ja tinha 9355, cf-cache-status HIT, age 13284s).
 *
 * Correr sempre antes de commitar alteracoes a CSS ou JS:
 *   node scripts/versionar-assets.mjs
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const ALVOS = [
  'design-tokens.css', 'styles.css', 'effects.css', 'cookies.css', 'palette-v2.css',
  'footer-v3.css', 'type-scale-v2.css', 'obra-reveal.css', 'obra-reveal.js', 'casos-scroll.css', 'casos-scroll.js', 'equipa-grid.css', 'equipa-grid.js', 'obra-reveal.css', 'obra-reveal.js', 'forms.css', 'form-styles.css', 'map-iberia.css',
  'main.js', 'animations.js', 'cookies.js', 'neon.js', 'map-iberia.js', 'supabase.js',
  'form-app.js', 'form-contact.js', 'form-geral.js', 'form-pintor.js', 'form-serralheiro.js', 'form-soldador.js',
];

const versao = {};
for (const a of ALVOS) {
  if (!fs.existsSync(a)) continue;
  versao[a] = crypto.createHash('sha1').update(fs.readFileSync(a)).digest('hex').slice(0, 8);
}

/* As fotografias saem com `max-age=31536000, immutable` (ver `_headers`).
   Substituir uma foto mantendo o nome do ficheiro não chega ao visitante
   durante um ano. Por isso as `assets/equipa-*` também levam ?v=<hash>. */
const FOTOS = fs.existsSync('assets')
  ? fs.readdirSync('assets').filter((f) => /^(equipa-|favicon-|apple-touch-icon).*\.(webp|jpg|png)$/.test(f))
  : [];
for (const f of FOTOS) {
  versao['assets/' + f] = crypto.createHash('sha1').update(fs.readFileSync('assets/' + f)).digest('hex').slice(0, 8);
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let paginas = 0, substituicoes = 0;

/* As fotos aparecem em HTML (src/href) e em CSS (url(...)), por isso o
   padrão é diferente do dos scripts e folhas de estilo. */
function versionarFotos(texto) {
  for (const [ficheiro, v] of Object.entries(versao)) {
    if (!ficheiro.startsWith('assets/')) continue;
    const re = new RegExp(escapar(ficheiro) + '(\\?v=[a-f0-9]+)?', 'g');
    texto = texto.replace(re, () => { substituicoes++; return `${ficheiro}?v=${v}`; });
  }
  return texto;
}

for (const css of ['effects.css', 'styles.css', 'palette-v2.css']) {
  if (!fs.existsSync(css)) continue;
  const antes = fs.readFileSync(css, 'utf8');
  const depois = versionarFotos(antes);
  if (depois !== antes) fs.writeFileSync(css, depois, 'utf8');
}

for (const f of fs.readdirSync('.').filter((x) => x.endsWith('.html'))) {
  let t = fs.readFileSync(f, 'utf8');
  const antes = t;
  for (const [ficheiro, v] of Object.entries(versao)) {
    const re = new RegExp('(href|src)="' + escapar(ficheiro) + '(?:\\?v=[a-f0-9]+)?"', 'g');
    t = t.replace(re, (m, attr) => { substituicoes++; return `${attr}="${ficheiro}?v=${v}"`; });
  }
  if (t !== antes) { fs.writeFileSync(f, t, 'utf8'); paginas++; }
}

console.log(`paginas actualizadas: ${paginas} | referencias versionadas: ${substituicoes}`);
console.log('exemplo:', Object.entries(versao).slice(0, 3).map(([k, v]) => `${k}?v=${v}`).join('  '));
