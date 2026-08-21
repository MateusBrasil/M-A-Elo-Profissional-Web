/**
 * Gera o conjunto de favicons a partir do símbolo da marca
 * (engrenagem + tocha + faísca).
 *
 * Decisões:
 * - o símbolo é cortado à margem transparente e recolocado num quadrado com
 *   folga de 12%, senão a 16px fica minúsculo dentro do vazio
 * - fundo cream da marca em vez de transparente: o azul-navy da tocha
 *   desaparece em separadores escuros, e o iOS não lida bem com alpha
 * - favicon.ico com 16, 32 e 48 embutidos, para o pedido automático que
 *   os browsers fazem à raiz não devolver 404
 *
 * Correr: node scripts/gerar-favicon.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/Users/mateu/_ORGANIZADO/Imagens/2026-08/Imagem do Codex 21 de ago. de 2026, 11_54_23.png';
const RAIZ = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(RAIZ, 'assets');
const FUNDO = { r: 243, g: 239, b: 233, alpha: 1 }; // --color-paper

/** Símbolo cortado e centrado num quadrado, com folga. */
async function quadrado(lado, fundo = FUNDO) {
  const simbolo = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
  const interior = Math.round(lado * 0.92);
  const redimensionado = await sharp(simbolo)
    .resize(interior, interior, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  return sharp({
    create: { width: lado, height: lado, channels: 4, background: fundo },
  })
    .composite([{ input: redimensionado, gravity: 'centre' }])
    .png()
    .toBuffer();
}

/** ICO com vários PNG embutidos (suportado desde o Vista). */
function construirIco(pngs) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);          // reservado
  cabecalho.writeUInt16LE(1, 2);          // 1 = ícone
  cabecalho.writeUInt16LE(pngs.length, 4);

  let deslocamento = 6 + pngs.length * 16;
  const entradas = [];
  for (const { lado, dados } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado >= 256 ? 0 : lado, 0);
    e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt8(0, 2);                   // paleta
    e.writeUInt8(0, 3);                   // reservado
    e.writeUInt16LE(1, 4);                // planos
    e.writeUInt16LE(32, 6);               // bits por pixel
    e.writeUInt32LE(dados.length, 8);
    e.writeUInt32LE(deslocamento, 12);
    deslocamento += dados.length;
    entradas.push(e);
  }
  return Buffer.concat([cabecalho, ...entradas, ...pngs.map((p) => p.dados)]);
}

const kb = (f) => Math.round(fs.statSync(f).size / 1024 * 10) / 10;

// PNG para o HTML
for (const lado of [16, 32, 180, 192, 512]) {
  const nome = lado === 180 ? 'apple-touch-icon.png' : `favicon-${lado}.png`;
  const destino = path.join(ASSETS, nome);
  fs.writeFileSync(destino, await quadrado(lado));
  console.log(`${nome.padEnd(24)} ${lado}x${lado}  ${kb(destino)}KB`);
}

// ICO na raiz
const pngs = [];
for (const lado of [16, 32, 48]) pngs.push({ lado, dados: await quadrado(lado) });
const ico = path.join(RAIZ, 'favicon.ico');
fs.writeFileSync(ico, construirIco(pngs));
console.log(`${'favicon.ico'.padEnd(24)} 16+32+48  ${kb(ico)}KB`);
