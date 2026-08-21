/*
  EQUIPA GRID — a grelha de obra monta-se e abre no scroll.

  Origem do mecanismo: banco Code Eagle, `parallax/sticky-grid-scroll`
  ("Sticky Grid Scroll"). Portado dessa peça:
    - agrupar os itens por coluna e animar coluna a coluna
    - entrada alternada: colunas pares vêm de cima, ímpares de baixo,
      com `stagger` de 0.06 e `from` invertido conforme a direcção
    - zoom final da grelha (`scale`) com as colunas laterais a afastarem-se
      em `xPercent` para abrir espaço ao conteúdo central
    - wrapper `sticky` e timeline com `scrub`

  Diverge do original:
    - liga-se ao evento "maelo:page-init" (o pipeline do site mata os triggers)
    - conteúdo real da M&A e tokens da marca
    - fallback estático em movimento reduzido, que o original não tinha
    - sem a classe/estado do demo: aqui é uma função simples, não um objecto
*/

(function () {
  "use strict";

  var COLUNAS = 3;
  var triggers = [];
  var mm = null;

  function esperarGsap(callback, tentativas) {
    tentativas = tentativas || 0;
    if (window.gsap && window.ScrollTrigger) return callback();
    if (tentativas > 120) return;
    window.requestAnimationFrame(function () { esperarGsap(callback, tentativas + 1); });
  }

  function agruparPorColuna(itens) {
    var colunas = [];
    for (var c = 0; c < COLUNAS; c++) colunas.push([]);
    itens.forEach(function (item, i) { colunas[i % COLUNAS].push(item); });
    return colunas;
  }

  function iniciar() {
    var seccao = document.querySelector("[data-equipa-grid]");
    if (!seccao) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      seccao.setAttribute("data-estatica", "true");
      return;
    }
    seccao.removeAttribute("data-estatica");

    var malha = seccao.querySelector("[data-equipa-malha]");
    var itens = Array.prototype.slice.call(seccao.querySelectorAll("[data-equipa-item]"));
    var centro = seccao.querySelector("[data-equipa-centro]");
    var veu = seccao.querySelector("[data-equipa-veu]");
    if (!malha || itens.length < COLUNAS) return;

    var colunas = agruparPorColuna(itens);

    mm = gsap.matchMedia();

    mm.add("(min-width: 700px)", function () {
      var dy = window.innerHeight * 0.9;

      gsap.set(centro.children, { opacity: 0, y: 24 });
      gsap.set(veu, { opacity: 0 });

      var linha = gsap.timeline({
        scrollTrigger: {
          id: "equipa-grid",
          trigger: seccao,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      /* 1. As colunas entram, alternando o lado de onde vêm */
      /* fromTo com immediateRender:false, nunca `from`. Este pipeline corre
         duas vezes (boot e runPageInits) e um `from` deixava as fotografias
         presas em opacity 0 para sempre: a secção ficava um ecrã preto.
         É a mesma armadilha que já tinha escondido o CTA do nav. */
      var entrada = gsap.timeline({ defaults: { duration: 1, ease: "power1.inOut" } });
      colunas.forEach(function (coluna, i) {
        var deCima = i % 2 === 0;
        entrada.fromTo(coluna,
          { y: dy * (deCima ? -1 : 1), opacity: 0 },
          {
            y: 0,
            opacity: 1,
            immediateRender: false,
            stagger: { each: 0.06, from: deCima ? "end" : "start" }
          }, "entrada");
      });
      linha.add(entrada);

      /* 2. Zoom e abertura: as laterais afastam-se e o centro respira */
      var abertura = gsap.timeline({ defaults: { duration: 1, ease: "power3.inOut" } });
      abertura.to(malha, { scale: 1.32 });
      abertura.to(colunas[0], { xPercent: -24 }, "<");
      abertura.to(colunas[2], { xPercent: 24 }, "<");
      abertura.to(colunas[1], {
        yPercent: function (i) { return (i < Math.floor(colunas[1].length / 2) ? -1 : 1) * 30; },
        duration: 0.5,
        ease: "power1.inOut"
      }, "-=0.5");
      linha.add(abertura, "-=0.6");

      /* 3. O texto entra depois de haver espaço para ele */
      linha.to(veu, { opacity: 1, duration: 0.4 }, "-=0.75");
      linha.to(centro.children, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }, "-=0.55");

      /* 4. Pausa no fim: sem isto o texto acabava de entrar já com a secção
         a soltar-se do sticky, e lia-se cortado por cima do nav. */
      linha.to({}, { duration: 1.1 });

      triggers.push(linha.scrollTrigger);

      return function () {
        gsap.set([malha].concat(itens), { clearProps: "transform,opacity" });
        gsap.set(centro.children, { clearProps: "opacity,transform" });
      };
    });
  }

  function limpar() {
    triggers.forEach(function (t) { if (t && t.kill) t.kill(); });
    triggers = [];
    if (mm && mm.revert) { mm.revert(); mm = null; }
  }

  document.addEventListener("maelo:page-init", function () {
    limpar();
    esperarGsap(iniciar);
  });

  window.setTimeout(function () {
    var s = document.querySelector("[data-equipa-grid]");
    if (!s) return;
    if (window.gsap && window.ScrollTrigger) return;
    s.setAttribute("data-estatica", "true");
  }, 4500);
})();
