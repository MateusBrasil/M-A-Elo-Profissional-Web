/**
 * Importa as fotos reais da equipa M&A Elo para assets/.
 * Gera webp (principal) + jpg (fallback) nos formatos usados pelo site.
 * Origem: C:\Users\mateu\Downloads\maelo imagens sites
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const SRC = 'C:/Users/mateu/Downloads/maelo imagens sites';
const OUT = path.resolve(import.meta.dirname, '..', 'assets');

// [ficheiro origem, nome destino, largura, altura, posição do crop]
const JOBS = [
  // hero da homepage e páginas de topo — panorâmica
  ['montagem de estruturas.jpeg',                    'equipa-montagem-estruturas', 1600, 1067, 'centre'],
  // card vertical (soldadura, coluna alta)
  ['soldador elétrodo.jpeg',                         'equipa-solda-electrodo-tall', 900, 1125, sharp.strategy.attention],
  // cards e secções
  ['soldador elétrodo.jpeg',                         'equipa-solda-electrodo',      1200, 800, 'centre'],
  ['solda TIG inox.jpeg',                            'equipa-solda-tig-inox',       1200, 800, 'centre'],
  ['soldador TIG de fundo.jpeg',                     'equipa-solda-tubagem',        1200, 800, 'centre'],
  ['estruturas metálicas serralheria e solda.jpeg',  'equipa-serralharia-corte',    1200, 800, 'centre'],
  ['serralheria, preparação de peças.jpeg',          'equipa-serralheiro-preparacao', 1200, 800, 'centre'],
  ['caldeireiro.jpeg',                               'equipa-caldeiraria',           980,  920, 'centre'],
  ['tubista preparação de tubo para soldador,.jpeg', 'equipa-tubista',              1200, 800, 'centre'],
  ['pintura industrial.jpeg',                        'equipa-pintura-industrial',   1200, 800, 'centre'],
  ['manutenção de Bomba.jpeg',                       'equipa-manutencao-bomba',     1200, 800, 'centre'],
];

for (const [file, name, w, h, position] of JOBS) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) { console.error('FALTA:', file); continue; }
  const base = sharp(src).resize(w, h, { fit: 'cover', position });
  await base.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${name}.webp`));
  await base.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
  const kb = (n) => Math.round(fs.statSync(path.join(OUT, n)).size / 1024);
  console.log(`${name}: ${w}x${h}  webp ${kb(name + '.webp')}KB  jpg ${kb(name + '.jpg')}KB`);
}
