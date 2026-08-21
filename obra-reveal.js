/*
  OBRA REVEAL — sequência de obra ligada ao scroll.

  As fotografias são camadas HTML com `object-fit: cover`; em vez de SVGs
  esticados, cada camada é revelada por `clip-path`. Assim, a fotografia fica
  sempre proporcional em qualquer largura de ecrã.
*/

(function () {
  "use strict";

  var triggers = [];

  function esperarGsap(callback, tentativas) {
    tentativas = tentativas || 0;
    if (window.gsap && window.ScrollTrigger) return callback();
    if (tentativas > 120) return; // ~10s: desiste e fica no fallback estático
    window.requestAnimationFrame(function () {
      esperarGsap(callback, tentativas + 1);
    });
  }

  function iniciar() {
    var seccao = document.querySelector("[data-obra-reveal]");
    if (!seccao) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduzido) {
      /* A rede de segurança lá em baixo marca a secção como estática se o
         GSAP tardar. Numa ligação lenta isso acontecia e ficava assim para
         sempre, porque nada revertia o atributo: a secção nunca animava. */
      seccao.removeAttribute("data-estatica");
    }
    if (reduzido) {
      seccao.setAttribute("data-estatica", "true");
      seccao.querySelectorAll("[data-obra-step]").forEach(function (s) {
        s.setAttribute("data-activa", "true");
      });
      return;
    }

    seccao.setAttribute("data-obra-animada", "true");

    var camadas = Array.prototype.slice.call(seccao.querySelectorAll(".obra-reveal__layer"));
    var etapas = Array.prototype.slice.call(seccao.querySelectorAll("[data-obra-step]"));
    var barras = Array.prototype.slice.call(seccao.querySelectorAll("[data-obra-bar]"));
    if (!camadas.length) return;

    gsap.set(camadas, { clipPath: "inset(0 100% 0 0)" });
    gsap.set(camadas[0], { clipPath: "inset(0 0 0 0)" });
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

    camadas.forEach(function (camada, i) {
      if (i === 0) return;
      linha.to(camada, { clipPath: "inset(0 0 0 0)", duration: 1, ease: "power3.out" }, i === 1 ? ">" : ">+=0.35");
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
    if (s.hasAttribute("data-obra-animada")) return;
    s.setAttribute("data-estatica", "true");
    Array.prototype.forEach.call(s.querySelectorAll("[data-obra-step]"), function (e) {
      e.setAttribute("data-activa", "true");
    });
  }, 4500);
})();
