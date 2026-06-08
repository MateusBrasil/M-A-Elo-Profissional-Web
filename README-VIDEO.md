# Vídeo Hero — Instruções

Esta pasta `assets/video/` aceita 2 ficheiros opcionais que o sistema lazy-load automaticamente quando existem:

```
assets/video/hero-welding-loop.webm
assets/video/hero-welding-loop.mp4
```

Se nenhum existir, o hero fica com a imagem actual (`assets/equipa-obra-lisboa.webp`) sem perda visual. Não é obrigatório. O sistema está preparado para receber.

## Especificações recomendadas

| Parâmetro | Valor |
|---|---|
| Duração | 8 a 15 segundos (loop seamless) |
| Resolução | 1920 × 1080 (Full HD) |
| Frame rate | 24 ou 30 fps |
| Bitrate | ≤ 2 Mbps (~500 KB para 15s) |
| Codec MP4 | H.264 + AAC |
| Codec WebM | VP9 + Opus |
| Aspecto | 16:9 |
| Áudio | **Sem áudio** (autoplay precisa de mute, melhor sem) |

## Sugestões de footage (todos com licença CC0 ou comercial gratuita)

### Pexels (recomendado — mais qualidade, fácil download)
Pesquisar em https://www.pexels.com/search/videos/ por:

- `welding sparks` — soldadura com faíscas em câmara lenta
- `industrial welding` — operação MIG/MAG profissional
- `steel construction` — estrutura metálica a ser erguida
- `metal grinding` — rebarbadora industrial
- `welder mask` — soldador a trabalhar (focus em mãos/tocha)

**Critério de selecção:** preferir close-ups de técnica (mãos, faísca, ferramenta) em vez de "equipa genérica de marketing".

### Coverr (alternativa, foco "ambient")
https://coverr.co/ — biblioteca dedicada a video loops para web. Procurar "factory", "industrial", "welding".

### Mixkit (alternativa)
https://mixkit.co/free-stock-video/industrial/ — secção industrial gratuita.

## Como exportar versão optimizada

Se o ficheiro original for grande, comprimir antes de colocar em produção:

```powershell
# Exemplo com ffmpeg (Windows)
# MP4 H.264 ~500KB
ffmpeg -i original.mp4 -vf "scale=1920:1080" -c:v libx264 -crf 28 -preset slow -an -t 15 assets/video/hero-welding-loop.mp4

# WebM VP9 ~400KB
ffmpeg -i original.mp4 -vf "scale=1920:1080" -c:v libvpx-vp9 -crf 35 -b:v 0 -an -t 15 assets/video/hero-welding-loop.webm
```

Se não tiver `ffmpeg`, o site https://www.freeconvert.com/video-compressor faz o mesmo.

## Comportamento técnico do sistema

O `main.js` faz lazy-load do video apenas em desktop (≥ 769 px), sem `Save-Data` no header, e respeitando `prefers-reduced-motion`. Em mobile e tablet, mostra sempre a imagem poster, nunca puxa o video.

Se o video estiver presente e carregar, o poster faz fade-out suave e o video aparece com `opacity: 0 → 1` em 1.2s. Se falhar (autoplay bloqueado, 404, timeout 4s), o poster fica visível como se nada tivesse acontecido.

## Validação final

Depois de colocar os ficheiros:

1. Abrir `index.html` em desktop com DevTools / Network
2. Esperar 1.5 s após carregar — o `hero-welding-loop.webm` aparece como request
3. Aceitar autoplay (Chrome/Edge fazem-no se for muted) — video deve começar
4. O `equipa-obra-lisboa.webp` fica em fade-out, o video em fade-in

Se nada disto acontecer, verificar:
- Caminho correto do ficheiro: `assets/video/hero-welding-loop.mp4`
- Codec compatível (H.264 baseline ou main, perfil simples)
- DevTools console sem erros de CORS
