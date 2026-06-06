// tracking-script/index.ts
// Serve o script de rastreamento JS customizado por cliente
// Lê os eventos configurados na tabela tracking_events e gera o script dinamicamente

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("tracking-script");
  const clientId = parts[idx + 1];

  if (!clientId) {
    return new Response("// Error: clientId required", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/javascript" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Buscar config e eventos em paralelo
  const [cfgResult, eventsResult] = await Promise.all([
    supabase.from("tracking_config" as any)
      .select("pixel_id, active")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase.from("tracking_events" as any)
      .select("event_name, enabled, trigger_type, trigger_selector, trigger_value, custom_params")
      .eq("client_id", clientId)
      .eq("enabled", true)
      .order("sort_order"),
  ]);

  const cfg = cfgResult.data as any;
  if (!cfg?.active) {
    return new Response("// TrackingHub: inactive config", {
      headers: { ...corsHeaders, "Content-Type": "application/javascript" },
    });
  }

  const events = (eventsResult.data as any[]) || [];
  const pixelId = cfg.pixel_id || "";
  const collectEndpoint = `${SUPABASE_URL}/functions/v1/tracking-collect/${clientId}`;

  const script = generateTrackingScript(clientId, pixelId, collectEndpoint, events);

  return new Response(script, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60", // cache 1 min para refletir mudanças de eventos
    },
  });
});

function generateTrackingScript(
  clientId: string,
  pixelId: string,
  collectEndpoint: string,
  events: any[]
): string {
  // Separar eventos por tipo de gatilho
  const pageLoadEvents = events.filter(e => e.trigger_type === "page_load");
  const checkoutEvents = events.filter(e => e.trigger_type === "checkout_click");
  const formEvents = events.filter(e => e.trigger_type === "form_submit");
  const visibleEvents = events.filter(e => e.trigger_type === "element_visible");
  const clickEvents = events.filter(e => e.trigger_type === "element_click");
  const scrollEvents = events.filter(e => e.trigger_type === "scroll_depth");
  const timeEvents = events.filter(e => e.trigger_type === "time_on_page");

  // Gerar JSON dos eventos para injetar no script
  const eventsJson = JSON.stringify(events.map(e => ({
    n: e.event_name,
    t: e.trigger_type,
    s: e.trigger_selector,
    v: e.trigger_value,
    p: e.custom_params || {},
  })));

  return `
/**
 * TrackingHub — Script de Rastreamento Server-Side
 * Cliente: ${clientId}
 * Eventos ativos: ${events.map(e => e.event_name).join(", ")}
 */
(function(w, d) {
  'use strict';

  var TH = w.__TrackingHub = w.__TrackingHub || {};
  TH.clientId = '${clientId}';
  TH.pixelId = '${pixelId}';
  TH.endpoint = '${collectEndpoint}';
  TH.events = ${eventsJson};
  TH.firedEvents = {};
  TH.initialized = false;

  // ── Utilitários ──────────────────────────────────────────────────────────

  function getCookie(name) {
    var v = d.cookie.match('(^|;)\\\\s*' + name + '\\\\s*=\\\\s*([^;]+)');
    return v ? decodeURIComponent(v.pop()) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    d.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getParam(key) {
    return new URLSearchParams(w.location.search).get(key) || null;
  }

  function generateFbp() {
    return 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 1e10);
  }

  function getStoredData() {
    try { return JSON.parse(localStorage.getItem('_th_data') || '{}'); } catch(e) { return {}; }
  }

  function generateEventId(prefix) {
    return (prefix || 'ev') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ── Captura de parâmetros ─────────────────────────────────────────────────

  function captureParams() {
    var fbclid = getParam('fbclid');
    var utmSource = getParam('utm_source');
    var utmMedium = getParam('utm_medium');
    var utmCampaign = getParam('utm_campaign');
    var utmContent = getParam('utm_content');
    var utmTerm = getParam('utm_term');
    var src = getParam('src');

    var fbp = getCookie('_fbp');
    if (!fbp) {
      fbp = generateFbp();
      setCookie('_fbp', fbp, 90);
    }

    var fbc = getCookie('_fbc');
    if (fbclid && (!fbc || fbc.indexOf(fbclid) === -1)) {
      fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      setCookie('_fbc', fbc, 90);
    }

    var ga4Cid = getCookie('_ga');
    if (ga4Cid) {
      var parts = ga4Cid.split('.');
      if (parts.length >= 4) ga4Cid = parts[2] + '.' + parts[3];
    }
    if (!ga4Cid) {
      ga4Cid = Math.floor(Math.random() * 1e9) + '.' + Math.floor(Date.now() / 1000);
      setCookie('_ga_th', ga4Cid, 365);
    }

    var data = {
      fbclid: fbclid,
      fbp: fbp,
      fbc: fbc,
      utm_source: utmSource || getCookie('th_utm_source'),
      utm_medium: utmMedium || getCookie('th_utm_medium'),
      utm_campaign: utmCampaign || getCookie('th_utm_campaign'),
      utm_content: utmContent || getCookie('th_utm_content'),
      utm_term: utmTerm || getCookie('th_utm_term'),
      src: src,
      ga4_client_id: ga4Cid,
      page_url: w.location.href,
      referrer: d.referrer,
    };

    if (utmSource) setCookie('th_utm_source', utmSource, 30);
    if (utmMedium) setCookie('th_utm_medium', utmMedium, 30);
    if (utmCampaign) setCookie('th_utm_campaign', utmCampaign, 30);
    if (utmContent) setCookie('th_utm_content', utmContent, 30);
    if (utmTerm) setCookie('th_utm_term', utmTerm, 30);

    try { localStorage.setItem('_th_data', JSON.stringify(data)); } catch(e) {}
    return data;
  }

  // ── Envio ao servidor ──────────────────────────────────────────────────────

  function send(eventName, extraParams, eventId) {
    var stored = getStoredData();
    var payload = Object.assign({}, stored, {
      event_name: eventName,
      event_id: eventId || generateEventId(eventName),
    }, extraParams || {});

    var json = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TH.endpoint, new Blob([json], { type: 'application/json' }));
    } else {
      fetch(TH.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(function(){});
    }
  }

  // ── Meta Pixel ─────────────────────────────────────────────────────────────

  function pixelTrack(eventName, params, eventId) {
    if (!TH.pixelId || !w.fbq) return;
    w.fbq('track', eventName, params || {}, { eventID: eventId });
  }

  function initPixel(pixelId) {
    if (!pixelId || w.fbq) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
    }(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
    w.fbq('init', pixelId);
  }

  // ── Disparo de evento (Pixel + CAPI) ──────────────────────────────────────

  function fireEvent(eventName, params, once) {
    var key = eventName + JSON.stringify(params || {});
    if (once && TH.firedEvents[key]) return;
    TH.firedEvents[key] = true;

    var eventId = generateEventId(eventName);
    pixelTrack(eventName, params, eventId);
    send(eventName, params, eventId);
  }

  // ── Injeção nos links de checkout ─────────────────────────────────────────

  function processLink(a) {
    try {
      var href = a.href;
      if (!href) return;
      var u = new URL(href);
      var host = u.hostname;
      var stored = getStoredData();

      if (host.indexOf('hotmart') !== -1) {
        if (stored.src) u.searchParams.set('src', stored.src);
        if (stored.utm_source) u.searchParams.set('sck', stored.utm_source + (stored.utm_campaign ? '|' + stored.utm_campaign : ''));
        if (stored.fbclid) u.searchParams.set('off', stored.fbclid);
        a.href = u.toString();
      } else if (host.indexOf('kiwify') !== -1) {
        ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(function(k) {
          if (stored[k]) u.searchParams.set(k, stored[k]);
        });
        a.href = u.toString();
      } else if (host.indexOf('eduzz') !== -1) {
        ['utm_source','utm_medium','utm_campaign','fbclid'].forEach(function(k) {
          if (stored[k]) u.searchParams.set(k, stored[k]);
        });
        a.href = u.toString();
      }
    } catch(e) {}
  }

  function injectCheckoutLinks() {
    d.querySelectorAll('a[href]').forEach(processLink);
    if (w.MutationObserver) {
      new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'A') processLink(node);
            (node.querySelectorAll ? node.querySelectorAll('a[href]') : []).forEach(processLink);
          });
        });
      }).observe(d.body, { childList: true, subtree: true });
    }
  }

  // ── Gatilhos configuráveis ────────────────────────────────────────────────

  // Gatilho: elemento visível (Intersection Observer)
  function setupElementVisible(eventName, selector, params) {
    if (!selector || !w.IntersectionObserver) return;
    var targets = d.querySelectorAll(selector);
    if (!targets.length) {
      // Tentar após DOM estar completo
      d.addEventListener('DOMContentLoaded', function() {
        d.querySelectorAll(selector).forEach(function(el) {
          observeElement(el, eventName, params);
        });
      });
      return;
    }
    targets.forEach(function(el) { observeElement(el, eventName, params); });
  }

  function observeElement(el, eventName, params) {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          fireEvent(eventName, params, true);
          obs.disconnect();
        }
      });
    }, { threshold: 0.5 });
    obs.observe(el);
  }

  // Gatilho: clique em elemento
  function setupElementClick(eventName, selector, params) {
    if (!selector) return;
    function attach() {
      d.querySelectorAll(selector).forEach(function(el) {
        el.addEventListener('click', function() {
          fireEvent(eventName, params, false);
        });
      });
    }
    if (d.readyState === 'loading') {
      d.addEventListener('DOMContentLoaded', attach);
    } else {
      attach();
    }
    // MutationObserver para elementos dinâmicos
    if (w.MutationObserver) {
      new MutationObserver(function() {
        d.querySelectorAll(selector).forEach(function(el) {
          if (!el._th_click) {
            el._th_click = true;
            el.addEventListener('click', function() { fireEvent(eventName, params, false); });
          }
        });
      }).observe(d.body, { childList: true, subtree: true });
    }
  }

  // Gatilho: scroll depth
  function setupScrollDepth(eventName, pct, params) {
    var threshold = parseInt(pct || '50', 10);
    var fired = false;
    w.addEventListener('scroll', function() {
      if (fired) return;
      var scrolled = (w.scrollY + w.innerHeight) / d.documentElement.scrollHeight * 100;
      if (scrolled >= threshold) {
        fired = true;
        fireEvent(eventName, params, true);
      }
    }, { passive: true });
  }

  // Gatilho: tempo na página
  function setupTimeOnPage(eventName, seconds, params) {
    var secs = parseInt(seconds || '30', 10);
    setTimeout(function() {
      fireEvent(eventName, params, true);
    }, secs * 1000);
  }

  // Gatilho: form submit
  function setupFormSubmit(eventName, params) {
    function attachForms() {
      d.querySelectorAll('form').forEach(function(form) {
        if (form._th_form) return;
        form._th_form = true;
        form.addEventListener('submit', function() {
          // Tentar capturar email do form
          var emailInput = form.querySelector('input[type=email], input[name*=email], input[name*=Email]');
          var emailVal = emailInput ? emailInput.value : null;
          var extra = Object.assign({}, params);
          if (emailVal) extra.email = emailVal;
          fireEvent(eventName, extra, false);
        });
      });
    }
    if (d.readyState === 'loading') {
      d.addEventListener('DOMContentLoaded', attachForms);
    } else {
      attachForms();
    }
  }

  // ── Inicialização ─────────────────────────────────────────────────────────

  function init() {
    if (TH.initialized) return;
    TH.initialized = true;

    captureParams();

    // Inicializar Pixel
    if (TH.pixelId) initPixel(TH.pixelId);

    // Configurar gatilhos de cada evento habilitado
    TH.events.forEach(function(ev) {
      var params = ev.p || {};

      switch (ev.t) {
        case 'page_load':
          fireEvent(ev.n, params, true);
          break;

        case 'checkout_click':
          // Detectado via click listener nos links de checkout
          d.addEventListener('click', function(e) {
            var a = e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            try {
              var u = new URL(a.href);
              var h = u.hostname;
              if (h.indexOf('hotmart') !== -1 || h.indexOf('kiwify') !== -1 || h.indexOf('eduzz') !== -1) {
                fireEvent(ev.n, params, false);
              }
            } catch(err) {}
          }, { capture: true });
          break;

        case 'form_submit':
          setupFormSubmit(ev.n, params);
          break;

        case 'element_visible':
          setupElementVisible(ev.n, ev.s, params);
          break;

        case 'element_click':
          setupElementClick(ev.n, ev.s, params);
          break;

        case 'scroll_depth':
          setupScrollDepth(ev.n, ev.v, params);
          break;

        case 'time_on_page':
          setupTimeOnPage(ev.n, ev.v, params);
          break;

        case 'webhook_only':
          // Evento server-side puro — nada a fazer no client
          break;
      }
    });

    // Injetar parâmetros nos links de checkout
    if (d.readyState === 'loading') {
      d.addEventListener('DOMContentLoaded', injectCheckoutLinks);
    } else {
      injectCheckoutLinks();
    }
  }

  // ── API pública ───────────────────────────────────────────────────────────

  TH.identify = function(email, phone) {
    try {
      var stored = getStoredData();
      if (email) stored.email = email.trim().toLowerCase();
      if (phone) stored.phone = phone;
      localStorage.setItem('_th_data', JSON.stringify(stored));
      send('Lead', { email: stored.email, phone: stored.phone });
    } catch(e) {}
  };

  TH.track = function(eventName, params) {
    fireEvent(eventName, params, false);
  };

  TH.viewContent = function(contentName, contentId, value, currency) {
    fireEvent('ViewContent', {
      content_name: contentName,
      content_ids: contentId ? [contentId] : [],
      value: value,
      currency: currency || 'BRL'
    }, true);
  };

  init();

})(window, document);
`;
}
