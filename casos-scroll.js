/*
  CASOS SCROLL — intervenções reais, coluna de imagens presa.

  Origem do mecanismo: banco Code Eagle, `parallax/gsap-scroll-reveal`
  ("Architecture Showcase"). Portado dessa peça:
    - z-index decrescente nas imagens empilhadas, para a de cima sair primeiro
    - `pin` na coluna visual com `scrub`, ancorado ao contentor das duas colunas
    - corte por `clipPath: inset(0px 0px 100%)` na imagem que sai
    - parallax por `objectPosition` (0% -> 60% na que sai, 40% -> 0% na que entra)
    - `ScrollTrigger.matchMedia` para desligar tudo em telemóvel

  Diverge do original:
    - não anima o `background` do <body> (com Barba a cor ficava presa entre páginas)
    - liga-se ao evento "maelo:page-init" porque o pipeline do site mata os triggers
    - fallback estático com foto por caso, em vez de pilha inútil
*/

(function () {
  "use strict";

  var triggers = [];
  var mm = null;

  function esperarGsap(callback, tentativas) {
    tentativas = tentativas || 0;
    if (window.gsap && window.ScrollTrigger) return callback();
    if (tentativas > 120) return;
    window.requestAnimationFrame(function () { esperarGsap(callback, tentativas + 1); });
  }

  function estatica(seccao) {
    seccao.setAttribute("data-estatica", "true");
  }

  function iniciar() {
    var seccao = document.querySelector("[data-casos-scroll]");
    if (!seccao) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      estatica(seccao);
      return;
    }
    seccao.removeAttribute("data-estatica");

    var fotos = Array.prototype.slice.call(seccao.querySelectorAll("[data-caso-foto]"));
    var tags = Array.prototype.slice.call(seccao.querySelectorAll("[data-caso-tag]"));
    if (fotos.length < 2) return;

    /* A primeira foto tem de ficar por cima e sair primeiro */
    fotos.forEach(function (f, i) { f.style.zIndex = String(fotos.length - i); });

    mm = gsap.matchMedia();

    mm.add("(min-width: 901px)", function () {
      var imgs = fotos.map(function (f) { return f.querySelector("img"); });

      gsap.set(imgs, { clipPath: "inset(0px)", objectPosition: "0px 0%" });

      var linha = gsap.timeline({
        scrollTrigger: {
          id: "casos-scroll",
          trigger: seccao,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      imgs.forEach(function (img, i) {
        var seguinte = imgs[i + 1];
        if (!seguinte) return;
        var passo = gsap.timeline();
        passo.to(img, { clipPath: "inset(0px 0px 100%)", objectPosition: "0px 60%", duration: 1.5, ease: "none" }, 0);
        passo.to(seguinte, { objectPosition: "0px 0%", duration: 1.5, ease: "none" }, 0);
        linha.add(passo);
      });

      /* A etiqueta acompanha a foto que está à vista */
      var progresso = ScrollTrigger.create({
        id: "casos-scroll-tag",
        trigger: seccao,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
        onUpdate: function (self) {
          var i = Math.round(self.progress * (fotos.length - 1));
          tags.forEach(function (t, j) { t.style.opacity = j === i ? "1" : "0"; });
        }
      });

      triggers.push(linha.scrollTrigger, progresso);

      return function () {
        gsap.set(imgs, { clearProps: "clipPath,objectPosition" });
      };
    });

    /* Abaixo de 900px o CSS já empilha texto e foto; nada a animar. */
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

  /* Rede de segurança: sem GSAP, mostrar a versão estática legível */
  window.setTimeout(function () {
    var s = document.querySelector("[data-casos-scroll]");
    if (!s) return;
    if (window.gsap && window.ScrollTrigger) return;
    estatica(s);
  }, 4500);
})();
