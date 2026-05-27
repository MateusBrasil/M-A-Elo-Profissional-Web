/*
  M&A Elo Profissional
  Core interface behavior
*/

(() => {
  const header = document.querySelector("[data-site-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const mobileLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll("a")) : [];
  const allAnchorLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
  const applicationLinks = Array.from(document.querySelectorAll('a[href*="/apply/"]'));
  const whatsappLinks = Array.from(document.querySelectorAll('a[href*="wa.me/"]'));
  let lastFocusedElement = null;
  let headerIsScrolled = false;
  let headerTicking = false;

  const setHeaderState = () => {
    if (!header) return;
    const nextState = window.scrollY > 18;
    if (nextState === headerIsScrolled) return;
    headerIsScrolled = nextState;
    header.classList.toggle("is-scrolled", headerIsScrolled);
  };

  const requestHeaderState = () => {
    if (headerTicking) return;
    headerTicking = true;
    window.requestAnimationFrame(() => {
      setHeaderState();
      headerTicking = false;
    });
  };

  const closeMenu = (restoreFocus = true) => {
    if (!menuToggle || !mobileMenu) return;
    document.documentElement.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
  };

  const openMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    lastFocusedElement = document.activeElement;
    document.documentElement.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Fechar menu");
    mobileMenu.setAttribute("aria-hidden", "false");
    const firstLink = mobileLinks[0];
    if (firstLink) {
      firstLink.focus({ preventScroll: true });
    }
  };

  const toggleMenu = () => {
    const isOpen = document.documentElement.classList.contains("menu-open");
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const scrollToTarget = (event) => {
    const link = event.currentTarget;
    const href = link.getAttribute("href");

    if (!href || href === "#") return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    closeMenu(false);

    const lenis = window.maeloLenis;

    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(target, { offset: -72, duration: 1.15 });
      window.history.pushState(null, "", href);
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", href);
  };

  const resolveApplicationUrl = (href) => {
    let url;

    try {
      url = new URL(href, window.location.href);
    } catch {
      return href;
    }

    const hostname = window.location.hostname;
    const isProductionHost = hostname === "maelo.pt" || hostname === "www.maelo.pt";
    const isLocalPreview =
      window.location.protocol === "file:" ||
      hostname === "" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    if (isLocalPreview || !isProductionHost) {
      return `http://localhost:3005${url.pathname}`;
    }

    return url.href;
  };

  const trackEvent = (eventName, parameters = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...parameters });

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters);
    }
  };

  const getApplicationEventName = (href) => {
    if (href.includes("/apply/soldador")) return "click_form_soldador";
    if (href.includes("/apply/serralheiro")) return "click_form_serralheiro";
    if (href.includes("/apply/pintor")) return "click_form_pintor";
    return "click_form_generico";
  };

  const prepareApplicationLinks = () => {
    applicationLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      link.href = resolveApplicationUrl(href);
    });
  };

  const openApplicationForm = (event) => {
    const link = event.currentTarget;
    const href = link.getAttribute("href");
    if (!href) return;

    const nextUrl = resolveApplicationUrl(href);
    trackEvent(getApplicationEventName(href), {
      link_url: nextUrl,
      page_path: window.location.pathname
    });
    if (nextUrl === href) return;

    event.preventDefault();
    closeMenu(false);
    window.location.href = nextUrl;
  };

  const trackWhatsappClick = (event) => {
    const link = event.currentTarget;
    const context = link.textContent.toLowerCase().includes("candidat") ? "candidato" : "empresa";

    trackEvent(`click_whatsapp_${context}`, {
      link_url: link.href,
      page_path: window.location.pathname
    });
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  };

  const trapMobileMenuFocus = (event) => {
    if (!document.documentElement.classList.contains("menu-open")) return;
    if (event.key !== "Tab" || mobileLinks.length === 0) return;

    const focusable = [menuToggle, ...mobileLinks].filter(Boolean);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const markActiveNavLink = () => {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a, .footer__bottom a").forEach((link) => {
      const href = link.getAttribute("href");
      if (href === currentPath || (currentPath === "" && href === "index.html")) {
        link.setAttribute("aria-current", "page");
      }
    });
  };

  const handleClickOutsideMenu = (event) => {
    if (!document.documentElement.classList.contains("menu-open")) return;
    if (header && header.contains(event.target)) return;
    if (mobileMenu && mobileMenu.contains(event.target)) return;
    closeMenu();
  };

  window.addEventListener("scroll", requestHeaderState, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) closeMenu();
  });
  document.addEventListener("keydown", handleEscape);
  document.addEventListener("keydown", trapMobileMenuFocus);
  document.addEventListener("click", handleClickOutsideMenu);

  if (menuToggle) {
    menuToggle.addEventListener("click", toggleMenu);
  }

  if (mobileMenu) {
    mobileMenu.addEventListener("click", (event) => {
      if (event.target === mobileMenu) closeMenu();
    });
  }

  allAnchorLinks.forEach((link) => {
    link.addEventListener("click", scrollToTarget);
  });

  applicationLinks.forEach((link) => {
    link.addEventListener("click", openApplicationForm);
  });

  whatsappLinks.forEach((link) => {
    link.addEventListener("click", trackWhatsappClick);
  });

  const injectWhatsappFloat = () => {
    const btn = document.createElement("a");
    btn.className = "wa-float";
    btn.href = "https://wa.me/351936525992?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20a%20M%26A%20Elo.";
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.setAttribute("aria-label", "Falar pelo WhatsApp — abre nova janela");
    btn.innerHTML = [
      '<svg class="wa-float__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">',
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>',
        '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.521 5.855L.057 23.486a.75.75 0 0 0 .919.921l5.733-1.497A11.938 11.938 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.722 9.722 0 0 1-4.98-1.371l-.356-.212-3.697.966.992-3.607-.232-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>',
      "</svg>",
      '<span class="wa-float__label" aria-hidden="true">WhatsApp</span>',
      '<span class="wa-float__ring" aria-hidden="true"></span>'
    ].join("");
    btn.addEventListener("click", () => {
      trackEvent("click_whatsapp_float", { page_path: window.location.pathname });
    });
    document.body.appendChild(btn);
  };

  const injectGdprBanner = () => {
    if (localStorage.getItem("maelo_gdpr_accepted")) return;
    const banner = document.createElement("div");
    banner.className = "gdpr-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Aviso de privacidade");
    banner.innerHTML = [
      '<div class="gdpr-banner__inner">',
        '<p>Este site utiliza Google Fonts e recursos externos. Ao continuar, aceita o tratamento de dados conforme a nossa <a href="privacidade.html">política de privacidade</a>.</p>',
        '<div class="gdpr-banner__actions">',
          '<button class="gdpr-accept" type="button">Aceitar e continuar</button>',
        "</div>",
      "</div>"
    ].join("");
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add("is-visible")));
    banner.querySelector(".gdpr-accept").addEventListener("click", () => {
      localStorage.setItem("maelo_gdpr_accepted", "1");
      banner.classList.remove("is-visible");
      banner.addEventListener("transitionend", () => banner.remove(), { once: true });
    });
  };

  prepareApplicationLinks();
  setHeaderState();
  markActiveNavLink();
  // injectWhatsappFloat(); — removed per design decision
  injectGdprBanner();
})();
