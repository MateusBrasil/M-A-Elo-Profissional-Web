/*
  M&A Elo Profissional
  Premium Motion System v2 — GSAP + ScrollTrigger + Lenis
  Techniques: clip-path reveals, text masking, counter animation,
  magnetic buttons, custom cursor, grid staggers, parallax
*/

(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = window.matchMedia("(hover: none)").matches;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") { resolve(); return; }
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const loadMotionLibraries = async () => {
    if (prefersReducedMotion) return;
    await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js");
    await Promise.all([
      loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"),
      loadScript("https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js")
    ]);
  };

  const loadBarba = async () => {
    if (prefersReducedMotion) return;
    await loadScript("https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js");
  };

  /* ─── Smooth scroll ──────────────────────────────────────────── */
  const initLenis = () => {
    if (prefersReducedMotion || !window.Lenis) return null;
    const lenis = new Lenis({
      duration: 0.92,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 1
    });
    window.maeloLenis = lenis;
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    return lenis;
  };

  /* ─── Custom cursor v2 — modes view/cta + trail ─────────────── */
  const initCustomCursor = () => {
    if (prefersReducedMotion || isTouchDevice || !window.gsap) return;

    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"><span class="cursor-ring__label" data-cursor-label></span></div>';
    document.body.appendChild(cursor);
    document.documentElement.classList.add("has-custom-cursor");

    const dot   = cursor.querySelector(".cursor-dot");
    const ring  = cursor.querySelector(".cursor-ring");
    const label = cursor.querySelector("[data-cursor-label]");

    let mx = -100, my = -100, lastMoveAt = 0;

    document.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      lastMoveAt = performance.now();
      gsap.to(dot,  { x: mx, y: my, duration: 0.06, ease: "none" });
      gsap.to(ring, { x: mx, y: my, duration: 0.38, ease: "power2.out" });
    });

    const setMode = (mode, labelText) => {
      cursor.classList.remove("is-view", "is-cta");
      if (mode) cursor.classList.add(mode);
      if (label) label.textContent = labelText || "";
    };

    const grow   = () => gsap.to(ring, { scale: 2.2, opacity: 0.6, duration: 0.28, ease: "power2.out" });
    const shrink = () => { setMode(null, ""); gsap.to(ring, { scale: 1, opacity: 1, duration: 0.32, ease: "power2.out" }); };

    // Mode: cta — primary/dark buttons get label echo
    document.querySelectorAll(".button--primary, .button--dark").forEach(el => {
      el.addEventListener("mouseenter", () => {
        setMode("is-cta", "");
        gsap.to(ring, { scale: 1.6, opacity: 1, duration: 0.28, ease: "power2.out" });
      });
      el.addEventListener("mouseleave", shrink);
    });

    // Mode: regular links + buttons
    document.querySelectorAll("a:not(.button--primary):not(.button--dark), button").forEach(el => {
      el.addEventListener("mouseenter", grow);
      el.addEventListener("mouseleave", shrink);
    });

    // Mode: view — image cards & visual frames show "VER →"
    document.querySelectorAll(".image-frame, .sector-card, .role-card, .region-card-v2, .about-visual, .tech-service-item").forEach(el => {
      el.addEventListener("mouseenter", () => {
        setMode("is-view", "Ver");
        gsap.to(ring, { scale: 3.6, opacity: 1, duration: 0.32, ease: "power2.out" });
      });
      el.addEventListener("mouseleave", shrink);
    });

    // Trail: faint copper dots when moving fast
    const trail = [];
    const TRAIL_LEN = 4;
    for (let i = 0; i < TRAIL_LEN; i++) {
      const t = document.createElement("div");
      t.className = "cursor-trail";
      document.body.appendChild(t);
      trail.push(t);
    }
    let lastTrailAt = 0;
    let trailIdx = 0;
    document.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (now - lastTrailAt < 60) return;
      lastTrailAt = now;
      const t = trail[trailIdx];
      trailIdx = (trailIdx + 1) % TRAIL_LEN;
      gsap.set(t, { x: e.clientX, y: e.clientY, opacity: 0.45 });
      gsap.to(t, { opacity: 0, duration: 0.6, ease: "power2.out" });
    });
  };

  /* ─── Hero ───────────────────────────────────────────────────── */
  const splitHeroTitle = () => {
    const title = document.querySelector("[data-hero-title]");
    if (!title) return [];
    const words = title.innerHTML.replace(/<br\s*\/?>/gi, " <br> ").split(/\s+/).filter(Boolean);
    title.innerHTML = words.map(w => w === "<br>" ? "<br>" : `<span class="hero-word"><span>${w}</span></span>`).join(" ");
    return Array.from(title.querySelectorAll(".hero-word span"));
  };

  const initHeroMotion = () => {
    if (!window.gsap) return;

    // New hero--screen (preferred). Fallback to legacy if not present.
    const heroScreen = document.querySelector(".hero--screen, .hero--bleed");
    if (heroScreen) return initHeroSplit(heroScreen);

    // Legacy fallback (mantém-se para páginas que ainda usem o hero antigo)
    const words = splitHeroTitle();
    const line  = document.querySelector("[data-hero-line]");
    const headerItems = document.querySelectorAll(".brand, .nav-links a, .nav-cta, .menu-toggle");
    const eyebrow = document.querySelector(".hero__eyebrow");
    const lead    = document.querySelector(".hero__lead");
    const actions = document.querySelector(".hero__actions");

    if (prefersReducedMotion) {
      gsap.set([words, line, headerItems, eyebrow, lead, actions], { clearProps: "all" });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(headerItems, { y: -18, opacity: 0, duration: 0.7, stagger: 0.04 }, 0);
    if (eyebrow) tl.fromTo(eyebrow, { clipPath: "inset(0 100% 0 0)", opacity: 0 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.9 }, 0.15);
    if (words.length) tl.fromTo(words, { yPercent: 108, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.045 }, 0.3);
    if (line) tl.fromTo(line, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 1.1 }, 0.52);
    if (lead) tl.fromTo(lead, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.62);
    if (actions) tl.fromTo(actions, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.72);
  };

  /* ─── Hero — Apple-style calm fade-in ───────────────────────── */
  const initHeroSplit = (section) => {
    const pill  = section.querySelector(".hero__pill");
    const title = section.querySelector(".hero__title");
    const lead  = section.querySelector(".hero__lead");
    const ctas  = section.querySelectorAll(".hero__cta-split, .hero__cta-ghost, .hero__cta");
    const visual = section.querySelector(".hero__bg img, .hero__visual img");

    if (prefersReducedMotion) {
      gsap.set([pill, title, lead, ctas, visual], { clearProps: "all" });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    if (pill)  tl.fromTo(pill,  { opacity: 0, y: 8  }, { opacity: 1, y: 0, duration: 0.7 }, 0);
    if (title) tl.fromTo(title, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.0 }, 0.15);
    if (lead)  tl.fromTo(lead,  { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9 }, 0.35);
    if (ctas.length) tl.fromTo(ctas, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.5);
    if (visual) tl.fromTo(visual, { scale: 1.06 }, { scale: 1, duration: 1.8, ease: "power3.out" }, 0);
  };

  /* ─── Scroll reveals — clip-path edition ────────────────────── */
  const initScrollReveals = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    if (prefersReducedMotion) {
      gsap.set("[data-reveal]", { opacity: 1, y: 0, clipPath: "inset(0 0 0 0)" });
      return;
    }

    const revealItems = gsap.utils.toArray("[data-reveal]");
    revealItems.forEach((item) => {
      // Headings get clip-path reveal; other elements get y+fade
      const isHeading = item.matches("h1, h2, h3, h4");
      if (isHeading) {
        gsap.fromTo(item,
          { clipPath: "inset(0 0 100% 0)", y: 20 },
          {
            clipPath: "inset(0 0 0% 0)", y: 0,
            duration: 1.05, ease: "power4.out",
            scrollTrigger: { trigger: item, start: "top 87%", once: true }
          }
        );
      } else {
        gsap.fromTo(item,
          { opacity: 0, y: 36 },
          {
            opacity: 1, y: 0,
            duration: 1.05, ease: "power3.out",
            onComplete: () => gsap.set(item, { clearProps: "willChange,transform" }),
            scrollTrigger: { trigger: item, start: "top 85%", once: true }
          }
        );
      }
    });
  };

  /* ─── Counter animation ──────────────────────────────────────── */
  const initCounterAnimations = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    document.querySelectorAll("[data-counter]").forEach(el => {
      const raw = el.textContent.trim();
      const numStr = raw.replace(/[^\d.]/g, "");
      const target  = parseFloat(numStr);
      if (isNaN(target)) return;

      const prefix = raw.slice(0, raw.search(/[\d]/));
      const suffix = raw.slice(raw.search(/[\d]/) + numStr.length);
      const isInt  = Number.isInteger(target);

      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 2.4,
        ease: "power2.out",
        onUpdate() {
          const v = isInt ? Math.round(obj.val) : obj.val.toFixed(1);
          el.textContent = prefix + v + suffix;
        },
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true
        }
      });
    });
  };

  /* ─── Grid stagger reveals ───────────────────────────────────── */
  const initGridStagger = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    const grids = [
      ".values-grid",
      ".sectors-grid",
      ".capabilities-row",
      ".stats-strip__grid",
      ".trust-row__inner",
    ];

    grids.forEach(selector => {
      document.querySelectorAll(selector).forEach(grid => {
        const children = Array.from(grid.children).filter(c => !c.matches("style, script"));
        if (!children.length) return;

        gsap.fromTo(children,
          { opacity: 0, y: 44 },
          {
            opacity: 1, y: 0,
            duration: 0.82,
            stagger: 0.09,
            ease: "power3.out",
            onComplete: () => gsap.set(children, { clearProps: "transform,opacity" }),
            scrollTrigger: { trigger: grid, start: "top 83%", once: true }
          }
        );
      });
    });

    // Role/service cards — from sides alternating
    document.querySelectorAll(".role-list, .service-list, .evidence-grid, .contact-grid").forEach(grid => {
      const children = Array.from(grid.children);
      if (!children.length) return;
      gsap.fromTo(children,
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0,
          duration: 0.78,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: grid, start: "top 82%", once: true }
        }
      );
    });
  };

  /* ─── Magnetic buttons ───────────────────────────────────────── */
  const initMagneticButtons = () => {
    if (prefersReducedMotion || isTouchDevice || !window.gsap) return;

    document.querySelectorAll(".button, .footer__whatsapp").forEach(btn => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 14;
        const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 8;
        gsap.to(btn, { x, y, duration: 0.34, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
      });
    });
  };

  /* ─── Editorial line-draw ────────────────────────────────────── */
  const initEditorialLines = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    document.querySelectorAll(".editorial-block, .area-panel, .region-item, .role-card, .service-item, .contact-card, .faq-item, .value-item, .capability-item").forEach(item => {
      gsap.fromTo(item, { "--line-progress": 0 }, {
        "--line-progress": 1,
        duration: 1.1,
        ease: "power2.out",
        scrollTrigger: { trigger: item, start: "top 84%", once: true }
      });
    });
  };

  /* ─── Image parallax + reveal ────────────────────────────────── */
  const initImageMotion = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    // Signature image frames — clip-path reveal
    gsap.utils.toArray("[data-image-reveal]").forEach(frame => {
      const image = frame.querySelector("img");
      const isSignature = frame.classList.contains("image-frame--signature");

      if (isSignature) {
        gsap.fromTo(frame,
          { clipPath: "inset(14% 0 14% 0)" },
          {
            clipPath: "inset(0% 0 0% 0)",
            duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: frame, start: "top 84%", once: true }
          }
        );
      } else {
        gsap.fromTo(frame,
          { clipPath: "inset(0 0 100% 0)" },
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.95, ease: "power4.out",
            scrollTrigger: { trigger: frame, start: "top 86%", once: true }
          }
        );
      }

      if (image) {
        gsap.fromTo(image,
          { scale: 1.1, yPercent: -2 },
          {
            scale: 1.02, yPercent: 3,
            ease: "none",
            scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: 0.6 }
          }
        );
      }
    });

    // Sector cards
    gsap.utils.toArray(".sector-card").forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0,
          duration: 0.9, delay: i * 0.1, ease: "power3.out",
          scrollTrigger: { trigger: ".sectors-grid", start: "top 80%", once: true }
        }
      );
    });

    // Feature split image reveal
    gsap.utils.toArray(".feature-split__visual").forEach(vis => {
      gsap.fromTo(vis,
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.3, ease: "power4.out",
          scrollTrigger: { trigger: vis, start: "top 80%", once: true }
        }
      );
    });

    // Regions visuals stagger
    const regionImgs = gsap.utils.toArray(".regions__visual");
    if (regionImgs.length) {
      gsap.from(regionImgs, {
        y: 48, opacity: 0, duration: 0.9, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: ".regions__visuals", start: "top 82%", once: true }
      });
    }

    // Hero media multi-layer parallax — desktop only
    if (!isTouchDevice) {
      const heroMedia = document.querySelector(".hero__media");
      const heroPoster = document.querySelector(".hero__media-poster");
      const heroVideo = document.querySelector(".hero__video");
      const heroBgMark = document.querySelector(".hero__bg-mark");

      if (heroMedia) {
        gsap.fromTo(heroMedia,
          { scale: 1.02 },
          { scale: 1.08, ease: "none",
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1.2 }
          }
        );
      }
      [heroPoster, heroVideo].forEach(el => {
        if (!el) return;
        gsap.fromTo(el,
          { yPercent: 0 },
          { yPercent: 12, ease: "none",
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 }
          }
        );
      });
      if (heroBgMark) {
        gsap.fromTo(heroBgMark,
          { yPercent: 0 },
          { yPercent: -28, ease: "none",
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 }
          }
        );
      }

      // Legacy fallback for older pages still using .hero__image
      const heroImg = document.querySelector(".hero__image");
      if (heroImg) {
        gsap.fromTo(heroImg,
          { scale: 1.05, yPercent: 0 },
          { scale: 1.1, yPercent: 8, ease: "none",
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.9 }
          }
        );
      }
    }
  };

  /* ─── Barba.js page transitions ──────────────────────────────── */
  const initBarba = async () => {
    if (prefersReducedMotion) return;
    if (!document.querySelector('[data-barba="wrapper"]')) return;
    await loadBarba();
    if (!window.barba || !window.gsap) return;

    // Page-init pipeline that re-runs on every barba enter
    const runPageInits = () => {
      // Kill old triggers to prevent ghosts
      if (window.ScrollTrigger) {
        ScrollTrigger.getAll().forEach(t => t.kill());
      }
      // Reset any lingering opacity/transforms
      gsap.set("[data-reveal]", { clearProps: "all" });

      // Re-run all scroll-aware init functions
      initHeroMotion();
      // initHeroScramble();  // removido — ver boot()
      initScrollReveals();
      initCounterAnimations();
      initGridStagger();
      initEditorialLines();
      initImageMotion();
      initBannerMotion();
      initPageRhythmMotion();
      initSectionLabels();
      initSectionReveal();
      initMagneticCTA();
      // initStickySpec(); // deprecated
      if (window.ScrollTrigger) ScrollTrigger.refresh();

      // Re-mark active nav link
      const curr = window.location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".nav-links a").forEach(l => {
        const href = l.getAttribute("href");
        if (href === curr || (curr === "" && href === "index.html")) {
          l.setAttribute("aria-current", "page");
        } else {
          l.removeAttribute("aria-current");
        }
      });
    };

    barba.init({
      timeout: 6000,
      debug: false,
      preventRunning: true,
      transitions: [
        {
          name: "fade-cinematic",
          sync: false,
          leave(data) {
            return gsap.to(data.current.container, {
              opacity: 0,
              y: -12,
              duration: 0.42,
              ease: "power2.in"
            });
          },
          enter(data) {
            window.scrollTo(0, 0);
            if (window.maeloLenis && typeof window.maeloLenis.scrollTo === "function") {
              window.maeloLenis.scrollTo(0, { immediate: true });
            }
            return gsap.from(data.next.container, {
              opacity: 0,
              y: 14,
              duration: 0.7,
              ease: "power3.out"
            });
          }
        }
      ]
    });

    // After every page enter, re-bootstrap motion
    barba.hooks.afterEnter(() => {
      // Allow next frame for DOM to settle
      requestAnimationFrame(() => requestAnimationFrame(runPageInits));
    });

    // Prevent Barba from intercepting external / WhatsApp / new-tab / mailto / tel
    barba.hooks.beforeLeave((data) => {
      // (Barba already handles these by default, but guarantees explicit safety)
    });
  };

  /* ─── Sticky specialty narrative (pin + scrub, 6 frames) ────── */
  const initStickySpec = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;
    if (window.innerWidth < 1024) return;

    const section = document.querySelector("[data-sticky-spec]");
    if (!section) return;

    const inner = section.querySelector(".sticky-spec__inner");
    const panels = Array.from(section.querySelectorAll("[data-spec-panel]"));
    const indexItems = Array.from(section.querySelectorAll("[data-spec-index]"));
    const bgImages = Array.from(section.querySelectorAll("[data-spec-bg]"));

    if (!inner || !panels.length) return;

    const total = panels.length;

    const setActive = (idx) => {
      panels.forEach((p, i) => p.classList.toggle("is-active", i === idx));
      indexItems.forEach((p, i) => p.classList.toggle("is-active", i === idx));
      bgImages.forEach((p, i) => p.classList.toggle("is-active", i === idx));
    };

    setActive(0);

    // Pin the inner stage for the full section height.
    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      pin: inner,
      pinSpacing: false,
      anticipatePin: 1,
      onUpdate: (self) => {
        const progress = Math.min(0.9999, Math.max(0, self.progress));
        const idx = Math.min(total - 1, Math.floor(progress * total));
        setActive(idx);
      }
    });
  };

  /* ─── Process Rail — activate steps as user scrolls ─────────── */
  const initProcessRail = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;
    if (window.innerWidth < 1024) return;

    const section = document.querySelector("[data-process-rail]");
    if (!section) return;

    const steps = Array.from(section.querySelectorAll("[data-process-step]"));
    const dots = Array.from(section.querySelectorAll("[data-process-dot]"));
    const fill = section.querySelector("[data-process-fill]");

    if (!steps.length) return;

    steps.forEach((step, idx) => {
      ScrollTrigger.create({
        trigger: step,
        start: "top 65%",
        end: "bottom 35%",
        onEnter: () => activateStep(idx),
        onEnterBack: () => activateStep(idx)
      });
    });

    const activateStep = (idx) => {
      steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      dots.forEach((d, i) => {
        d.classList.toggle("is-active", i === idx);
        d.classList.toggle("is-passed", i < idx);
      });
      if (fill) {
        const pct = ((idx + 0.5) / steps.length) * 100;
        fill.style.height = `${pct}%`;
      }
    };

    activateStep(0);
  };

  /* ─── Word-by-word fade — opt-in via [data-reveal-words] ────── */
  const initWordReveal = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    document.querySelectorAll("[data-reveal-words]").forEach(el => {
      // Split text into word spans (skip if already done)
      if (el.dataset.wordsSplit === "true") return;
      const original = el.textContent;
      const words = original.split(/\s+/).filter(Boolean);
      el.innerHTML = words.map(w => `<span class="reveal-word">${w}</span>`).join(" ");
      el.dataset.wordsSplit = "true";

      const spans = el.querySelectorAll(".reveal-word");
      gsap.fromTo(spans,
        { opacity: 0, y: 14, filter: "blur(4px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)",
          duration: 0.7,
          stagger: 0.04,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        }
      );
    });
  };

  /* ─── Image blur-up — sharpens when viewport intersects ─────── */
  const initImageBlurUp = () => {
    if (prefersReducedMotion) return;

    const targets = document.querySelectorAll("[data-blur-up], .spec-edit__media img, .role-card__image img");
    if (!targets.length || !("IntersectionObserver" in window)) return;

    targets.forEach(img => {
      img.classList.add("img-blur-up");
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-sharp");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "100px" });

    targets.forEach(img => io.observe(img));
  };

  /* ─── Hero scramble — kinetic eyebrow Stripe-style ──────────── */
  const initHeroScramble = () => {
    if (prefersReducedMotion) return;
    const targets = document.querySelectorAll("[data-scramble]");
    if (!targets.length) return;

    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·";

    targets.forEach(el => {
      const original = el.textContent;
      const len = original.length;
      let frame = 0;
      const totalFrames = 32;
      el.classList.add("kinetic-text");
      const stepEvery = 1;

      const tick = () => {
        if (frame >= totalFrames) {
          el.textContent = original;
          return;
        }
        const progress = frame / totalFrames;
        const settled = Math.floor(progress * len);
        let out = original.slice(0, settled);
        for (let i = settled; i < len; i++) {
          const c = original[i];
          if (c === " " || c === "·") { out += c; continue; }
          out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        el.textContent = out;
        frame += stepEvery;
        requestAnimationFrame(tick);
      };

      // Start after hero entrance — delay 0.4s
      setTimeout(() => requestAnimationFrame(tick), 400);
    });
  };

  /* ─── Feature banner list items ──────────────────────────────── */
  const initBannerMotion = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    document.querySelectorAll(".feature-banner, .block-cta, .pullquote-section").forEach(section => {
      const children = Array.from(section.querySelectorAll("h2, p, .block-cta__heading, .block-cta__sub, .block-cta__actions, .pullquote__text"));
      if (!children.length) return;
      gsap.fromTo(children,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.85,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 80%", once: true }
        }
      );
    });
  };

  /* ─── Page hero internal pages ───────────────────────────────── */
  const initPageRhythmMotion = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    const pageHeroItems = document.querySelectorAll(".page-hero__inner > *");
    if (pageHeroItems.length) {
      gsap.fromTo(pageHeroItems,
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.08, ease: "power3.out", delay: 0.1 }
      );
    }

    document.querySelectorAll(".page-section .section__shell").forEach(section => {
      const items = Array.from(section.children).slice(0, 8);
      if (!items.length) return;
      gsap.fromTo(items,
        { y: 28, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.78, stagger: 0.07, ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 82%", once: true }
        }
      );
    });
  };

  /* ─── Section label draws ────────────────────────────────────── */
  const initSectionLabels = () => {
    // (injeção do sparkle ✦ removida — decoração genérica; labels ficam limpos. Animação de reveal mantida.)

    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    document.querySelectorAll(".section-label, .page-kicker").forEach(label => {
      gsap.fromTo(label,
        { opacity: 0, y: 8 },
        {
          opacity: 1, y: 0,
          duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: label, start: "top 88%", once: true }
        }
      );
    });
  };

  /* ─── Section reveal — fade-in calm iOS-style ───────────────── */
  const initSectionReveal = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    // Auto-stagger nos grids principais que contêm cards repetidos
    const gridSelectors = [
      ".sectors-grid",
      ".spec-edit__grid",
      ".values-grid",
      ".cred-strip",
      ".capabilities-row",
      ".service-list",
      ".role-list--two-col",
      ".regions__grid",
      ".region-grid",
    ];

    gridSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(grid => {
        const children = Array.from(grid.children).filter(el => el.tagName !== "SCRIPT");
        if (!children.length) return;

        gsap.fromTo(children,
          { opacity: 0, y: 18 },
          {
            opacity: 1, y: 0,
            duration: 0.7, ease: "power2.out",
            stagger: 0.08,
            scrollTrigger: { trigger: grid, start: "top 88%", once: true }
          }
        );
      });
    });

    // Opt-in via attribute para outros casos
    const optInCards = gsap.utils.toArray(".screen-card[data-screen-reveal]");
    optInCards.forEach(card => {
      gsap.fromTo(card,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 92%", once: true } }
      );
    });
  };

  /* ─── Magnetic CTA — Linear/Rauno-style subtle attraction ───── */
  const initMagneticCTA = () => {
    if (!window.gsap || prefersReducedMotion) return;

    // Apenas CTAs principais com data-cta começando por "hero" ou "cta"
    const magnetSelectors = ".hero__cta-split, .block-cta .button--whatsapp, .block-cta .button--secondary";
    const magnets = document.querySelectorAll(magnetSelectors);

    magnets.forEach(el => {
      const strength = 16; // px max translation
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * strength;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * strength;
        gsap.to(el, { x, y, duration: 0.6, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
    });
  };

  /* ─── Mobile menu ────────────────────────────────────────────── */
  const initMobileMenuMotion = () => {
    if (!window.gsap || prefersReducedMotion) return;
    const menu  = document.querySelector("[data-mobile-menu]");
    const links = menu ? menu.querySelectorAll("a") : [];
    if (!menu) return;
    new MutationObserver(() => {
      if (document.documentElement.classList.contains("menu-open")) {
        gsap.fromTo(links,
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.52, stagger: 0.055, ease: "power3.out" }
        );
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  };

  /* ─── Stats section entrance ─────────────────────────────────── */
  const initStatsSection = () => {
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    const strip = document.querySelector(".stats-strip");
    if (!strip) return;

    const blocks = strip.querySelectorAll(".stat-block");
    gsap.fromTo(blocks,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.9, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: strip, start: "top 82%", once: true }
      }
    );
  };

  /* ─── Horizontal scroll marquee speed control ────────────────── */
  const initMarquee = () => {
    const tracks = document.querySelectorAll(".marquee-strip__track");
    tracks.forEach(track => {
      // double the content for seamless loop
      const clone = track.innerHTML;
      track.innerHTML = clone + clone;
    });
  };

  /* ─── Boot sequence ──────────────────────────────────────────── */
  const boot = async () => {
    try {
      document.documentElement.classList.add("gsap-loaded");
      await loadMotionLibraries();
      gsap.registerPlugin(ScrollTrigger);

      // Critical path — visible above the fold
      initLenis();
      initHeroMotion();
      // initHeroScramble();  // removido — efeito "hacker" destoava da seriedade industrial; eyebrow fica estática

      // Non-critical — defer to idle so main thread is free for LCP/FID
      const ric = window.requestIdleCallback
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb) => setTimeout(cb, 50);

      ric(() => {
        // initCustomCursor();  // removido — cursor custom + trail dava "cara de template"; devolve o cursor do sistema
        initScrollReveals();
        initCounterAnimations();
        initGridStagger();
        initEditorialLines();
        initImageMotion();
        initBannerMotion();
        initPageRhythmMotion();
        initSectionLabels();
      initSectionReveal();
      initMagneticCTA();
        initMobileMenuMotion();
        initMagneticButtons();
        initStatsSection();
        // initStickySpec();  // deprecated — replaced by .spec-edit editorial grid
        initProcessRail();
        initWordReveal();
        initImageBlurUp();
        ScrollTrigger.refresh();
        // Barba last — depends on everything else being ready
        initBarba();
      });
    } catch (err) {
      document.documentElement.classList.remove("gsap-loaded");
      document.documentElement.classList.add("motion-unavailable");
    }
  };

  const scheduleBoot = () => {
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      boot();
    };
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach(ev =>
      window.addEventListener(ev, run, { once: true, passive: true })
    );
    // Boot immediately after load — don't wait for interaction
    window.addEventListener("load", run, { once: true });
  };

  if (prefersReducedMotion) {
    document.documentElement.classList.add("reduced-motion");
  } else {
    scheduleBoot();
  }
})();
