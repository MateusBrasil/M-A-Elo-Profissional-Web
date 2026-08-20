/*
  OBRA REVEAL — sequência de obra revelada em lâminas, ligada ao scroll.

  Origem do mecanismo: banco Code Eagle, `parallax/svg-mask-scroll-transitions`
  ("SVG Mask Scroll Transitions"). O que foi efectivamente portado dessa peça:
    - a estrutura de máscara SVG (rect preto a esconder + <g> de rects brancos
      a revelar, com `maskUnits="userSpaceOnUse"`)
    - `createHorizontalBlinds`: duas rects por lâmina, a abrir a partir do centro
    - a animação por `attr` de `y` e `height` com stagger de 0.02 e `power3.out`
    - o padrão de camadas empilhadas dentro de um contentor sticky

  O que é nosso e diverge do original:
    - sticky em CSS puro em vez de `pin` do ScrollTrigger
    - conteúdo, tokens e tipografia da M&A Elo; nada do demo entra
    - sem Lenis próprio (o site já tem uma instância em animations.js)
    - fallback estático em telemóvel e em prefers-reduced-motion
    - cleanup ligado ao Barba, que o original não tinha
*/

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var LAMINAS_DESKTOP = 26;
  var LAMINAS_MOBILE = 14;
  var triggers = [];

  function esperarGsap(callback, tentativas) {
    tentativas = tentativas || 0;
    if (window.gsap && window.ScrollTrigger) return callback();
    if (tentativas > 120) return; // ~10s: desiste e fica no fallback estático
    window.requestAnimationFrame(function () {
      esperarGsap(callback, tentativas + 1);
    });
  }

  /* Gera as lâminas de uma camada. Duas rects por lâmina, ambas a nascer com
     altura 0 no centro da lâmina: uma cresce para cima, outra para baixo. */
  function criarLaminas(grupo, total) {
    var altura = 100 / total;
    var laminas = [];
    for (var i = 0; i < total; i++) {
      var centro = 100 - (i * altura + altura / 2);
      var cima = document.createElementNS(SVG_NS, "rect");
      var baixo = document.createElementNS(SVG_NS, "rect");
      [cima, baixo].forEach(function (r) {
        r.setAttribute("x", 0);
        r.setAttribute("width", 100);
        r.setAttribute("height", 0);
        r.setAttribute("y", centro);
        r.setAttribute("fill", "#fff");
        r.setAttribute("shape-rendering", "crispEdges");
        grupo.appendChild(r);
      });
      laminas.push({ cima: cima, baixo: baixo, y: centro, h: altura / 2 });
    }
    return laminas;
  }

  function abrirInstantaneamente(laminas) {
    laminas.forEach(function (l) {
      l.cima.setAttribute("y", l.y - l.h);
      l.cima.setAttribute("height", l.h + 0.1);
      l.baixo.setAttribute("y", l.y);
      l.baixo.setAttribute("height", l.h + 0.1);
    });
  }

  function animacaoDeAbertura(laminas) {
    var alvos = laminas.flatMap(function (l) { return [l.cima, l.baixo]; });
    return window.gsap.timeline().to(alvos, {
      attr: {
        y: function (i) {
          var l = laminas[Math.floor(i / 2)];
          return i % 2 === 0 ? l.y - l.h : l.y;
        },
        height: function (i) { return laminas[Math.floor(i / 2)].h + 0.1; }
      },
      ease: "power3.out",
      stagger: { each: 0.02, from: "start" }
    });
  }

  function iniciar() {
    var seccao = document.querySelector("[data-obra-reveal]");
    if (!seccao) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      seccao.setAttribute("data-estatica", "true");
      seccao.querySelectorAll("[data-obra-blinds]").forEach(function (g) {
        abrirInstantaneamente(criarLaminas(g, 2));
      });
      seccao.querySelectorAll("[data-obra-step]").forEach(function (s) {
        s.setAttribute("data-activa", "true");
      });
      return;
    }

    var grupos = Array.prototype.slice.call(seccao.querySelectorAll("[data-obra-blinds]"));
    var etapas = Array.prototype.slice.call(seccao.querySelectorAll("[data-obra-step]"));
    var barras = Array.prototype.slice.call(seccao.querySelectorAll("[data-obra-bar]"));
    if (!grupos.length) return;

    var total = window.innerWidth <= 849 ? LAMINAS_MOBILE : LAMINAS_DESKTOP;
    var conjuntos = grupos.map(function (g) {
      g.textContent = "";
      return criarLaminas(g, total);
    });

    abrirInstantaneamente(conjuntos[0]);
    if (etapas[0]) etapas[0].setAttribute("data-activa", "true");

    var linha = gsap.timeline({
      scrollTrigger: {
        id: "obra-reveal",
        trigger: seccao,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.4,
        invalidateOnRefresh: true
      }
    });

    conjuntos.forEach(function (laminas, i) {
      if (i === 0) return;
      linha.add(animacaoDeAbertura(laminas), i === 1 ? ">" : ">+=0.35");
    });

    triggers.push(linha.scrollTrigger);

    /* Etapa activa e barras de progresso a partir do progresso do scroll.
       Isto era feito por callbacks na timeline, mas com `scrub` um salto de
       scroll dispara todos os callbacks de uma vez e o texto passava à frente
       da fotografia. Calcular pelo progresso é determinístico em qualquer
       velocidade de scroll, incluindo saltos e scroll para trás. */
    var progresso = ScrollTrigger.create({
      id: "obra-reveal-progresso",
      trigger: seccao,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: function (self) {
        var n = etapas.length;
        var p = self.progress * barras.length;
        barras.forEach(function (barra, i) {
          barra.style.transform = "scaleX(" + Math.max(0, Math.min(1, p - i)) + ")";
        });
        /* A camada só se lê como trocada perto do fim da sua abertura, por
           isso a etapa muda um pouco depois do início do segmento. */
        var indice = Math.floor(self.progress * n + 0.28);
        indice = Math.max(0, Math.min(n - 1, indice));
        etapas.forEach(function (s, j) {
          s.setAttribute("data-activa", j === indice ? "true" : "false");
        });
      }
    });
    triggers.push(progresso);

    /* Quando o utilizador volta ao topo, a primeira etapa tem de reaparecer */
    var reset = ScrollTrigger.create({
      id: "obra-reveal-reset",
      trigger: seccao,
      start: "top bottom",
      onLeaveBack: function () {
        etapas.forEach(function (s, j) {
          s.setAttribute("data-activa", j === 0 ? "true" : "false");
        });
      }
    });
    triggers.push(reset);
  }

  function limpar() {
    triggers.forEach(function (t) { if (t && t.kill) t.kill(); });
    triggers = [];
  }

  /* O animations.js mata TODOS os ScrollTriggers no seu pipeline de página
     (runPageInits) e recria os dele. Criar os nossos por fora não resulta:
     eram mortos poucos milissegundos depois, foi o que aconteceu à primeira.
     Por isso ligamo-nos ao evento que esse pipeline dispara no fim, o que
     também trata da re-entrada quando o Barba troca de página. */
  document.addEventListener("maelo:page-init", function () {
    limpar();
    esperarGsap(iniciar);
  });

  document.addEventListener("obra-reveal:limpar", limpar);

  /* Rede de segurança: se o pipeline nunca correr (GSAP indisponível, modo
     motion-unavailable), a secção fica na versão estática legível em vez de
     ficar uma mancha preta com uma foto só. */
  window.setTimeout(function () {
    var s = document.querySelector("[data-obra-reveal]");
    if (!s) return;
    if (s.querySelector("[data-obra-blinds] rect")) return;
    s.setAttribute("data-estatica", "true");
    Array.prototype.forEach.call(s.querySelectorAll("[data-obra-step]"), function (e) {
      e.setAttribute("data-activa", "true");
    });
  }, 4500);
})();
