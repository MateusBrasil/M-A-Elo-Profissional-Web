/**
 * Importa as fotografias da equipa M&A Elo para assets/.
 * Gera webp (principal) + jpg (fallback) nos formatos usados pelo site,
 * mantendo os nomes de ficheiro para a substituição não mexer no HTML/CSS.
 *
 * Lote actual: "premium-bordado" (21/08/2026) — logo bordado no braço,
 * sem sinalética em português do Brasil, qualidade fotográfica superior.
 * Lote anterior guardado em `_ARQUIVO/fotos-equipa-v1/`.
 *
 * Correr: node scripts/importar-fotos-equipa.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const SRC = 'C:/Users/mateu/Downloads/maelo imagens sites/premium-bordado';
const OUT = path.resolve(import.meta.dirname, '..', 'assets');

// [ficheiro origem, nome destino, largura, altura, posição do crop]
const JOBS = [
  ['04-montagem-estruturas.png',   'equipa-montagem-estruturas',      1600, 1067, 'centre'],
  ['08-soldador-eletrodo.png',     'equipa-solda-electrodo-tall',      900, 1125, 'centre'],
  ['08-soldador-eletrodo.png',     'equipa-solda-electrodo',          1200,  800, 'centre'],
  ['07-solda-tig-inox.png',        'equipa-solda-tig-inox',           1200,  800, 'centre'],
  ['09-soldador-tig-tubulacao.png','equipa-solda-tubagem',            1200,  800, 'centre'],
  ['02-serralheria-estruturas.png','equipa-serralharia-corte',        1200,  800, 'centre'],
  ['06-serralheria-preparacao.png','equipa-serralheiro-preparacao',   1200,  800, 'centre'],
  ['06-serralheria-preparacao.png','equipa-serralheiro-preparacao-hero', 1350, 900, 'centre'],
  ['01-caldeireiro.png',           'equipa-caldeiraria',               980,  920, 'centre'],
  ['10-tubista-preparacao.png',    'equipa-tubista',                  1200,  800, 'centre'],
  ['05-pintura-industrial.png',    'equipa-pintura-industrial',       1200,  800, 'centre'],
  ['03-manutencao-bomba.png',      'equipa-manutencao-bomba',         1200,  800, 'centre'],
  ['03-manutencao-bomba.png',      'equipa-manutencao-bomba-hero',    1400,  840, 'centre'],
];

let total = 0;
for (const [file, name, w, h, position] of JOBS) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) { console.error('FALTA:', file); continue; }
  const base = sharp(src).resize(w, h, { fit: 'cover', position });
  await base.clone().webp({ quality: 82 }).toFile(path.join(OUT, `${name}.webp`));
  await base.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
  const kb = (n) => Math.round(fs.statSync(path.join(OUT, n)).size / 1024);
  console.log(`${name.padEnd(36)} ${w}x${h}  webp ${String(kb(name + '.webp')).padStart(4)}KB  jpg ${String(kb(name + '.jpg')).padStart(4)}KB`);
  total += kb(name + '.webp');
}
console.log(`\ntotal webp: ${total}KB em ${JOBS.length} ficheiros`);
