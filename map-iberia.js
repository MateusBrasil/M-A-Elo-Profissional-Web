/* ═══════════════════════════════════════════════════════════
   MAPA IBÉRICO PREMIUM v3 — MapLibre GL JS
   Renderização cartográfica real + paleta M&A Elo + animação intro
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Coordenadas verificadas contra Wikipedia/Google Maps — formato [longitude, latitude]
  const CITIES = [
    {
      id: 'miranda',
      name: 'Miranda do Douro',
      sublabel: 'Sede',
      sublabelMarker: '★ SEDE',
      coords: [-6.2737, 41.4933],            // 41°29'36"N 6°16'25"W
      labelOffset: [14, 0],                  // label à direita do pin
      sede: true,
      desc: 'Sede da M&A Elo Profissional. Fronteira com Espanha — posição estratégica para mobilidade ibérica.',
    },
    {
      id: 'viana',
      name: 'Viana do Castelo',
      sublabel: '01',
      coords: [-8.8326, 41.6932],            // 41°41'36"N 8°49'57"W
      labelOffset: [14, 0],
      desc: 'Intervenções em construção metálica e indústria na região do Minho.',
    },
    {
      id: 'vilareal',
      name: 'Vila Real',
      sublabel: '02',
      coords: [-7.7441, 41.3006],            // 41°18'02"N 7°44'39"W
      labelOffset: [14, 0],
      desc: 'Pintura industrial e construção civil metálica — projectos executados 2025/2026.',
    },
    {
      id: 'aveiro',
      name: 'Aveiro · Estarreja',
      sublabel: '03',
      coords: [-8.6082, 40.7000],            // ponto médio Aveiro–Estarreja
      labelOffset: [14, 0],
      desc: 'Indústria química e metalomecânica. Fabricação de tubagens em aço carbono executada em 2025.',
    },
    {
      id: 'lisboa',
      name: 'Lisboa',
      sublabel: '04',
      coords: [-9.1393, 38.7223],            // 38°43'20"N 9°08'21"W
      labelOffset: [14, 0],
      desc: 'Intervenções em indústria, construção e infraestrutura na região de Lisboa e Setúbal.',
    },
  ];

  // GeoJSON para connection lines entre Miranda (sede) e outras cidades
  const SEDE = CITIES.find(c => c.sede);
  const CONNECTIONS_GEOJSON = {
    type: 'FeatureCollection',
    features: CITIES
      .filter(c => !c.sede)
      .map(c => ({
        type: 'Feature',
        properties: { name: c.name },
        geometry: {
          type: 'LineString',
          coordinates: [SEDE.coords, c.coords],
        },
      })),
  };

  // Connection Miranda → Europa (ponto simbólico no NE)
  const EUROPE_CONNECTION = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [SEDE.coords, [4.5, 47.5]], // direcção centro Europa
        },
      },
    ],
  };

  // Style customizado: usa OpenFreeMap "positron" (light, neutro) e re-paint com paleta M&A
  const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

  // ═══ INIT MAP ═══
  function initMap(container) {
    if (!window.maplibregl) {
      console.warn('[map-iberia] MapLibre GL JS não carregado.');
      return;
    }

    const loadingEl = container.querySelector('.map-iberia-v3__loading');

    const canvasEl = container.querySelector('.map-iberia-v3__canvas-target') || container.querySelector('#map-iberia-canvas');
    const map = new maplibregl.Map({
      container: canvasEl,
      style: MAP_STYLE_URL,
      center: [-3.5, 40.5], // centro PT+ES
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 9,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      cooperativeGestures: false, // permite scroll-zoom directo
      dragRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'bottom-right');
    map.scrollZoom.disable(); // evitar accidental scroll-zoom durante navegação da página

    // Robustez: força resize quando o container ganha tamanho (layout shifts, fontes, etc.)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        try { map.resize(); } catch (e) {}
      });
      ro.observe(canvasEl);
    }

    map.on('load', () => {
      // Esconder loading
      if (loadingEl) loadingEl.classList.add('is-hidden');

      // Resize defensivo após load (caso o container tenha mudado durante init)
      setTimeout(() => { try { map.resize(); } catch (e) {} }, 100);
      setTimeout(() => { try { map.resize(); } catch (e) {} }, 400);

      // Re-paint do mapa para tons mais neutros que combinam com M&A
      try {
        // Esbater cores de fundo dos países
        const repaints = {
          'background': { 'background-color': '#F4F7FB' },
          'water': { 'fill-color': '#DCE5EE' },
          'park': { 'fill-color': '#E8EFE9' },
          'landuse': { 'fill-color': 'rgba(232, 239, 233, 0.4)' },
          'place-country': { 'text-color': 'rgba(15, 34, 68, 0.55)' },
          'place-city': { 'text-color': '#1C2B3A' },
        };
        Object.keys(repaints).forEach(layerId => {
          if (map.getLayer(layerId)) {
            Object.entries(repaints[layerId]).forEach(([prop, val]) => {
              try { map.setPaintProperty(layerId, prop, val); } catch (e) {}
            });
          }
        });
      } catch (e) {
        console.warn('[map-iberia] repaint skipped:', e);
      }

      // ═══ Adicionar connections (linhas Miranda → cidades) ═══
      map.addSource('iberia-connections', { type: 'geojson', data: CONNECTIONS_GEOJSON });
      map.addLayer({
        id: 'iberia-connections-glow',
        type: 'line',
        source: 'iberia-connections',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#F07814',
          'line-width': 3.5,
          'line-opacity': 0.18,
          'line-blur': 4,
        },
      });
      map.addLayer({
        id: 'iberia-connections-line',
        type: 'line',
        source: 'iberia-connections',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#F07814',
          'line-width': 1.5,
          'line-dasharray': [2, 2.5],
          'line-opacity': 0.7,
        },
      });

      // Connection para Europa (mais grossa, simbólica)
      map.addSource('iberia-europe', { type: 'geojson', data: EUROPE_CONNECTION });
      map.addLayer({
        id: 'iberia-europe-line',
        type: 'line',
        source: 'iberia-europe',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#F07814',
          'line-width': 2,
          'line-dasharray': [4, 4],
          'line-opacity': 0.45,
        },
      });

      // ═══ Adicionar pins (dot only) + labels permanentes como popups separados ═══
      CITIES.forEach(city => {
        // 1. DOT puro — sem wrapper, sem label dentro. Anchor 'center' = lat/lng exacto.
        const dot = document.createElement('div');
        dot.className = 'iberia-marker' + (city.sede ? ' iberia-marker--sede' : '');
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('aria-label', city.name + (city.sede ? ' — sede da M&A Elo' : ''));

        // 2. Popup detalhado (abre on click)
        const detailPopup = new maplibregl.Popup({
          offset: city.sede ? 18 : 14,
          closeButton: true,
          closeOnClick: true,
          maxWidth: '260px',
          className: 'iberia-popup-wrapper',
        }).setHTML(
          '<p class="iberia-popup__meta">' + (city.sede ? '★ SEDE' : city.sublabel + ' · Cidade activa') + '</p>' +
          '<h3 class="iberia-popup__city">' + city.name + '</h3>' +
          '<p class="iberia-popup__desc">' + city.desc + '</p>'
        );

        // 3. Marker = só o dot, ancorado no centro = posição lat/lng EXACTA
        new maplibregl.Marker({ element: dot, anchor: 'center' })
          .setLngLat(city.coords)
          .setPopup(detailPopup)
          .addTo(map);

        // 4. Label permanente como popup separado (não fecha, sem botão close, ancorado à esquerda do pin)
        const labelEl = document.createElement('div');
        labelEl.className = 'iberia-label-pill' + (city.sede ? ' iberia-label-pill--sede' : '');
        labelEl.innerHTML =
          '<span class="iberia-label-pill__sub">' + (city.sublabelMarker || city.sublabel) + '</span>' +
          '<span class="iberia-label-pill__name">' + city.name + '</span>';

        // Posicionar label como marker separado, anchor 'left' = lado esquerdo do label fica no lat/lng,
        // mas com offset horizontal para empurrar para a direita do dot
        const labelOffsetX = city.sede ? 18 : 14;
        new maplibregl.Marker({
          element: labelEl,
          anchor: 'left',
          offset: [labelOffsetX, 0],
        })
          .setLngLat(city.coords)
          .addTo(map);
      });

      // ═══ Animação intro cinematográfica ═══
      // Começa zoom Europa wider, depois flyTo PT+ES, depois zoom suave para Miranda, depois volta ao overview
      const introTimeline = () => {
        // T0: já estamos em zoom 4.2 center [-3.5, 40.5] — vista geral PT+ES
        setTimeout(() => {
          // T+1.5s: zoom para Miranda (dramatic reveal da sede)
          map.flyTo({
            center: SEDE.coords,
            zoom: 6.5,
            speed: 0.7,
            curve: 1.6,
            essential: true,
          });
        }, 1500);

        setTimeout(() => {
          // T+5s: zoom out para overview confortável que mostra todas as cidades
          map.flyTo({
            center: [-7.2, 40.0],
            zoom: 5.6,
            speed: 0.8,
            curve: 1.4,
            essential: true,
          });
        }, 5500);
      };

      // Só animar se utilizador não tem prefers-reduced-motion
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Usar IntersectionObserver para esperar que mapa fique visível antes de animar
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              introTimeline();
              observer.disconnect();
            }
          });
        }, { threshold: 0.35 });
        observer.observe(container);
      }

      // Re-habilitar scroll-zoom só ao clicar no mapa (UX defensive)
      map.getCanvas().addEventListener('click', () => map.scrollZoom.enable(), { once: true });
    });

    map.on('error', (e) => {
      console.warn('[map-iberia] map error:', e && e.error && e.error.message);
      if (loadingEl) {
        loadingEl.innerHTML = '<p class="map-iberia-v3__loading-text" style="color:#6B7E94;">Mapa temporariamente indisponível — recarregue a página</p>';
      }
    });
  }

  // ═══ INIT ═══
  function init() {
    const containers = document.querySelectorAll('[data-map-iberia]');
    if (containers.length === 0) return;

    if (!window.maplibregl) {
      // Carregar MapLibre dinamicamente se não estiver carregado
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      script.onload = () => containers.forEach(initMap);
      document.head.appendChild(script);
    } else {
      containers.forEach(initMap);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
