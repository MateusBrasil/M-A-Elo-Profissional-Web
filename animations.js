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

  /* ─── Custom cursor ──────────────────────────────────────────── */
  const initCustomCursor = () => {
    if (prefersReducedMotion || isTouchDevice || !window.gsap) return;

    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
    document.body.appendChild(cursor);
    document.documentElement.classList.add("has-custom-cursor");

    const dot  = cursor.querySelector(".cursor-dot");
    const ring = cursor.querySelector(".cursor-ring");
    let mx = -100, my = -100;

    document.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      gsap.to(dot,  { x: mx, y: my, duration: 0.06, ease: "none" });
      gsap.to(ring, { x: mx, y: my, duration: 0.38, ease: "power2.out" });
    });

    const grow = () => gsap.to(ring, { scale: 2.2, opacity: 0.6, duration: 0.28, ease: "power2.out" });
    const shrink = () => gsap.to(ring, { scale: 1, opacity: 1, duration: 0.32, ease: "power2.out" });
    const expand = () => gsap.to(ring, { scale: 3.6, opacity: 0.35, duration: 0.32, ease: "power2.out" });

    document.querySelectorAll("a, button").forEach(el => {
      el.addEventListener("mouseenter", grow);
      el.addEventListener("mouseleave", shrink);
    });
    document.querySelectorAll(".image-frame, .sector-card, .about-visual").forEach(el => {
      el.addEventListener("mouseenter", expand);
      el.addEventListener("mouseleave", shrink);
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

    const words = splitHeroTitle();
    const line  = document.querySelector("[data-hero-line]");
    const headerItems = document.querySelectorAll(".brand, .nav-links a, .nav-cta, .menu-toggle");
    const eyebrow = document.querySelector(".hero__eyebrow");
    const lead    = document.querySelector(".hero__lead");
    const actions = document.querySelector(".hero__actions");
    const meta    = document.querySelector(".hero__meta");
    const strip   = document.querySelector(".hero__strip");
    const bgMark  = document.querySelector(".hero__bg-mark");

    if (prefersReducedMotion) {
      gsap.set([words, line, headerItems, eyebrow, lead, actions, meta, strip, bgMark], { clearProps: "all" });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    // Header entrance
    tl.from(headerItems, { y: -18, opacity: 0, duration: 0.7, stagger: 0.04 }, 0);

    // Background mark reveal
    if (bgMark) {
      tl.fromTo(bgMark, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power3.out" }, 0.1);
    }

    // Eyebrow
    if (eyebrow) {
      tl.fromTo(eyebrow,
        { clipPath: "inset(0 100% 0 0)", opacity: 0 },
        { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.9, ease: "power3.out" },
        0.15
      );
    }

    // Words clip-path reveal from bottom
    if (words.length) {
      tl.fromTo(words,
        { yPercent: 108, opacity: 0 },
        { yPercent: 0,   opacity: 1, duration: 1.1, stagger: 0.045 },
        0.3
      );
    }

    // Copper line scale
    if (line) {
      tl.fromTo(line, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 1.1 }, 0.52);
    }

    // Lead + actions
    if (lead)    tl.fromTo(lead,    { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.62);
    if (actions) tl.fromTo(actions, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.72);
    if (meta)    tl.fromTo(meta,    { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.82);
    if (strip)   tl.fromTo(strip,   { opacity: 0 },         { opacity: 1, duration: 0.8 }, 0.9);
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

    // Hero image parallax — desktop only (mobile: continuous layout work = TBT)
    if (!isTouchDevice) {
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
    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;

    document.querySelectorAll(".section-label, .page-kicker").forEach(label => {
      gsap.fromTo(label,
        { clipPath: "inset(0 100% 0 0)", opacity: 0 },
        {
          clipPath: "inset(0 0% 0 0)", opacity: 1,
          duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: label, start: "top 88%", once: true }
        }
      );
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

      // Non-critical — defer to idle so main thread is free for LCP/FID
      const ric = window.requestIdleCallback
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb) => setTimeout(cb, 50);

      ric(() => {
        initCustomCursor();
        initScrollReveals();
        initCounterAnimations();
        initGridStagger();
        initEditorialLines();
        initImageMotion();
        initBannerMotion();
        initPageRhythmMotion();
        initSectionLabels();
        initMobileMenuMotion();
        initMagneticButtons();
        initStatsSection();
        ScrollTrigger.refresh();
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
