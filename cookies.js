/* ═══ COOKIES — Banner RGPD-compliant ═══
   M&A Elo Profissional — DIY, sem dependências, design system cream/copper.
   Storage: localStorage key 'maelo_cookie_consent' = { necessary: true, analytics: bool, ts: ISO }
   API pública: window.MAELOcookies.open()  — abre painel (botão "Gerir cookies" no footer)
                window.MAELOcookies.reset() — esquece consentimento (útil para QA)
*/
(function () {
  'use strict';

  var STORAGE_KEY = 'maelo_cookie_consent';
  var POLICY_URL = 'politica-de-privacidade.html';

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function saveConsent(consent) {
    try {
      var payload = {
        necessary: true,
        analytics: !!consent.analytics,
        ts: new Date().toISOString(),
        v: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('maelo:consent', { detail: payload }));
      return payload;
    } catch (err) {
      return null;
    }
  }

  function elem(tag, attrs, html) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (key === 'class') el.className = attrs[key];
        else if (key === 'data') {
          for (var dataKey in attrs.data) el.dataset[dataKey] = attrs.data[dataKey];
        } else el.setAttribute(key, attrs[key]);
      }
    }
    if (html != null) el.innerHTML = html;
    return el;
  }

  function buildBanner() {
    var banner = elem('aside', {
      class: 'cookie-banner',
      role: 'dialog',
      'aria-labelledby': 'cookie-banner-title',
      'aria-describedby': 'cookie-banner-text',
      'aria-live': 'polite',
    });

    banner.innerHTML = '' +
      '<div class="cookie-banner__content">' +
        '<p class="cookie-banner__label">Privacidade &amp; Cookies</p>' +
        '<h2 class="cookie-banner__title" id="cookie-banner-title">Esta página usa cookies para funcionar.</h2>' +
        '<p class="cookie-banner__text" id="cookie-banner-text">Os cookies essenciais garantem o funcionamento do site. Os de análise ajudam-nos a perceber o que melhorar &mdash; nunca são partilhados. Pode aceitar, recusar ou personalizar a sua escolha. Consulte a nossa <a href="' + POLICY_URL + '">Política de Privacidade</a>.</p>' +
      '</div>' +
      '<div class="cookie-banner__actions">' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-cookie-action="accept-all">Aceitar todos</button>' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--essential" data-cookie-action="essential-only">Apenas essenciais</button>' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--customize" data-cookie-action="customize">Personalizar</button>' +
      '</div>';
    return banner;
  }

  function buildModal(currentConsent) {
    var backdrop = elem('div', {
      class: 'cookie-modal-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'cookie-modal-title',
    });
    var analyticsChecked = currentConsent && currentConsent.analytics ? 'checked' : '';

    backdrop.innerHTML = '' +
      '<div class="cookie-modal">' +
        '<div class="cookie-modal__header">' +
          '<h2 class="cookie-modal__title" id="cookie-modal-title">Gerir consentimento</h2>' +
          '<button type="button" class="cookie-modal__close" aria-label="Fechar" data-cookie-action="close">&times;</button>' +
        '</div>' +
        '<p class="cookie-modal__intro">Escolha que categorias de cookies aceita. Os essenciais não podem ser desactivados &mdash; são necessários para o site funcionar. Sem rastreio publicitário, sem partilha com terceiros.</p>' +

        '<div class="cookie-category">' +
          '<div class="cookie-category__header">' +
            '<h3 class="cookie-category__title">Essenciais</h3>' +
            '<span class="cookie-category__required">Sempre activo</span>' +
          '</div>' +
          '<p class="cookie-category__desc">Necessários para o funcionamento básico: navegação, preferências de consentimento e segurança da sessão. Sem estes, o site não funciona.</p>' +
        '</div>' +

        '<div class="cookie-category">' +
          '<div class="cookie-category__header">' +
            '<h3 class="cookie-category__title">Análise agregada</h3>' +
            '<label class="cookie-toggle">' +
              '<input type="checkbox" id="cookie-toggle-analytics" data-category="analytics" ' + analyticsChecked + '>' +
              '<span class="cookie-toggle__slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cookie-category__desc">Ajudam-nos a perceber que páginas são mais úteis e onde melhorar. Dados agregados e anonimizados &mdash; nunca identificam o visitante.</p>' +
        '</div>' +

        '<div class="cookie-modal__footer">' +
          '<button type="button" class="cookie-banner__btn cookie-banner__btn--essential" data-cookie-action="essential-only">Apenas essenciais</button>' +
          '<button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-cookie-action="save-custom">Guardar escolha</button>' +
        '</div>' +
      '</div>';
    return backdrop;
  }

  var bannerEl = null;
  var modalEl = null;

  function showBanner() {
    if (bannerEl) return;
    bannerEl = buildBanner();
    document.body.appendChild(bannerEl);
    requestAnimationFrame(function () { bannerEl.classList.add('is-visible'); });
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-visible');
    var el = bannerEl;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 450);
    bannerEl = null;
  }

  function openModal() {
    if (modalEl) return;
    modalEl = buildModal(readConsent());
    document.body.appendChild(modalEl);
    requestAnimationFrame(function () { modalEl.classList.add('is-open'); });
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    var el = modalEl;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 300);
    modalEl = null;
  }

  function handleAction(action) {
    if (action === 'accept-all') {
      saveConsent({ analytics: true });
      hideBanner();
      closeModal();
    } else if (action === 'essential-only') {
      saveConsent({ analytics: false });
      hideBanner();
      closeModal();
    } else if (action === 'customize') {
      openModal();
    } else if (action === 'save-custom') {
      var checkbox = document.getElementById('cookie-toggle-analytics');
      saveConsent({ analytics: checkbox ? checkbox.checked : false });
      hideBanner();
      closeModal();
    } else if (action === 'close') {
      closeModal();
    }
  }

  function init() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cookie-action]');
      if (btn) {
        e.preventDefault();
        handleAction(btn.dataset.cookieAction);
        return;
      }
      var manage = e.target.closest('[data-cookie-manage]');
      if (manage) {
        e.preventDefault();
        openModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl) closeModal();
    });

    if (!readConsent()) {
      setTimeout(showBanner, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MAELOcookies = {
    open: openModal,
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
      showBanner();
    },
    consent: readConsent,
  };
})();
