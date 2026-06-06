// tracking-script/index.ts — zero external dependencies
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey, authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function dbGet(table: string, filters: Record<string, string>) {
  const params = new URLSearchParams({ ...filters, limit: "1" });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: "application/vnd.pgrst.object+json" },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

async function dbList(table: string, filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  return await res.json().catch(() => []);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const clientId = parts[parts.length - 1];

  if (!clientId || clientId === "tracking-script") {
    return new Response("// Error: clientId required", {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/javascript" },
    });
  }

  const [cfg, events] = await Promise.all([
    dbGet("tracking_config", { "client_id": `eq.${clientId}`, "select": "pixel_id,active" }),
    dbList("tracking_events", { "client_id": `eq.${clientId}`, "enabled": "eq.true", "select": "event_name,trigger_type,trigger_selector,trigger_value,custom_params", "order": "sort_order" }),
  ]);

  if (!cfg?.active) {
    return new Response("// TrackingHub: inactive config", {
      headers: { ...corsHeaders, "Content-Type": "application/javascript" },
    });
  }

  const pixelId = cfg.pixel_id || "";
  const collectEndpoint = `${SUPABASE_URL}/functions/v1/tracking-collect/${clientId}`;
  const script = generateTrackingScript(clientId, pixelId, collectEndpoint, events || []);

  return new Response(script, {
    headers: { ...corsHeaders, "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=60" },
  });
});

function generateTrackingScript(
  clientId: string,
  pixelId: string,
  collectEndpoint: string,
  events: any[]
): string {
  const eventsJson = JSON.stringify(events.map(e => ({
    n: e.event_name,
    t: e.trigger_type,
    s: e.trigger_selector,
    v: e.trigger_value,
    p: e.custom_params || {},
  })));

  const hasViewContent      = events.some(e => e.event_name === "ViewContent" && e.enabled);
  const hasInitCheckout     = events.some(e => e.event_name === "InitiateCheckout" && e.enabled);
  const hasLead             = events.some(e => e.event_name === "Lead" && e.enabled);
  const hasContact          = events.some(e => e.event_name === "Contact" && e.enabled);

  return `
/**
 * TrackingHub — Script de Rastreamento Server-Side v2
 * Cliente: ${clientId}
 * Eventos: ${events.map(e => e.event_name).join(", ")}
 * Padrão: Meta CAPI + GA4 Measurement Protocol (deduplicação via event_id)
 */
(function(w, d) {
  'use strict';

  var TH = w.__TrackingHub = w.__TrackingHub || {};
  TH.clientId  = '${clientId}';
  TH.pixelId   = '${pixelId}';
  TH.endpoint  = '${collectEndpoint}';
  TH.firedEvts = {};
  TH.ready     = false;

  /* ── Utilitários ────────────────────────────────────────────────── */

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getCookie(name) {
    var m = d.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : null;
  }

  function setCookie(name, value, days) {
    var e = new Date();
    e.setTime(e.getTime() + days * 864e5);
    d.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + e.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getParam(key) {
    return new URLSearchParams(w.location.search).get(key) || null;
  }

  function normalizePhone(p) {
    if (!p) return null;
    var digits = p.replace(/\\D/g, '');
    if (digits.length === 10 || digits.length === 11) return '55' + digits;
    return digits;
  }

  function getGa4Cid() {
    var ga = getCookie('_ga');
    if (!ga) return null;
    var p = ga.split('.');
    return p.length >= 4 ? p[2] + '.' + p[3] : ga;
  }

  function getStoredData() {
    try { return JSON.parse(localStorage.getItem('_th_data') || '{}'); } catch(e) { return {}; }
  }

  function saveStoredData(data) {
    try { localStorage.setItem('_th_data', JSON.stringify(data)); } catch(e) {}
  }

  /* ── Captura de parâmetros ──────────────────────────────────────── */

  function captureParams() {
    var fbclid = getParam('fbclid');
    var utms   = {};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k) {
      var v = getParam(k) || getCookie('_th_' + k);
      if (v) { utms[k] = v; setCookie('_th_' + k, v, 30); }
    });

    var fbp = getCookie('_fbp');
    if (!fbp) {
      fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 1e10);
      setCookie('_fbp', fbp, 90);
    }

    var fbc = getCookie('_fbc');
    if (fbclid && (!fbc || fbc.indexOf(fbclid) === -1)) {
      fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      setCookie('_fbc', fbc, 90);
    }

    var ga4_client_id = getGa4Cid() || getCookie('_th_ga4');
    if (!ga4_client_id) {
      ga4_client_id = Math.floor(Math.random() * 1e9) + '.' + Math.floor(Date.now() / 1000);
      setCookie('_th_ga4', ga4_client_id, 365);
    }

    var th_uid = getCookie('_th_uid');
    if (!th_uid) {
      th_uid = uuid();
      setCookie('_th_uid', th_uid, 365);
    }

    var data = Object.assign({ fbclid: fbclid, fbp: fbp, fbc: fbc,
      ga4_client_id: ga4_client_id, user_id: th_uid, page_url: w.location.href, referrer: d.referrer }, utms);
    saveStoredData(data);
    return data;
  }

  /* ── Debug Mode ─────────────────────────────────────────────────── */

  var isDebug = w.location.search.indexOf('th_debug=true') !== -1;
  var debugPanel = null;
  if (isDebug) {
    debugPanel = d.createElement('div');
    debugPanel.style.cssText = 'position:fixed;bottom:10px;right:10px;width:320px;max-height:400px;overflow-y:auto;background:#1a1a1a;color:#0f0;font-family:monospace;font-size:11px;padding:10px;border-radius:8px;z-index:999999;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #333;';
    debugPanel.innerHTML = '<div style="font-weight:bold;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:5px;display:flex;justify-content:space-between;"><span>🟢 TrackingHub Debug</span><span onclick="this.parentNode.parentNode.remove()" style="cursor:pointer;color:#888;">✕</span></div><div id="th_debug_log"></div>';
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ d.body.appendChild(debugPanel); });
    else d.body.appendChild(debugPanel);
  }

  function logDebug(title, data) {
    if (!isDebug) return;
    console.log('[TrackingHub] ' + title, data);
    var logDiv = d.getElementById('th_debug_log');
    if (logDiv) {
      var entry = d.createElement('div');
      entry.style.cssText = 'margin-bottom:8px;padding:6px;background:#2a2a2a;border-radius:4px;word-break:break-all;border-left:2px solid #0f0;';
      var time = new Date().toLocaleTimeString();
      entry.innerHTML = '<strong style="color:#fff;">[' + time + '] ' + title + '</strong><br/><span style="color:#aaa;">' + JSON.stringify(data).substring(0, 150) + '...</span>';
      logDiv.prepend(entry);
    }
  }

  /* ── Envio ao servidor ──────────────────────────────────────────── */

  function send(eventName, extra, eventId) {
    var stored  = getStoredData();
    var payload = Object.assign({}, stored, { event_name: eventName, event_id: eventId || uuid() }, extra || {});
    var json    = JSON.stringify(payload);
    
    logDebug('Sending: ' + eventName, payload);
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TH.endpoint, new Blob([json], { type: 'application/json' }));
    } else {
      fetch(TH.endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:json, keepalive:true }).catch(function(){});
    }
  }

  /* ── Meta Pixel ─────────────────────────────────────────────────── */

  function pixelTrack(eventName, params, eventId) {
    if (!TH.pixelId || typeof w.fbq !== 'function') return;
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

  /* ── Disparo de evento ──────────────────────────────────────────── */

  function fireEvent(eventName, params, once) {
    var key = eventName + (once ? '_once' : '_' + Date.now());
    if (once && TH.firedEvts[eventName]) return;
    if (once) TH.firedEvts[eventName] = true;
    var eid = uuid();
    pixelTrack(eventName, params, eid);
    send(eventName, params, eid);
  }

  /* ── Injeção nos links de checkout ─────────────────────────────── */

  function processLink(a) {
    try {
      var u    = new URL(a.href);
      var host = u.hostname;
      var s    = getStoredData();
      if (host.indexOf('hotmart') !== -1) {
        if (s.utm_source)    u.searchParams.set('sck', s.utm_source + (s.utm_campaign ? '|' + s.utm_campaign : ''));
        if (s.fbclid)        u.searchParams.set('off', s.fbclid);
        if (s.utm_source)    u.searchParams.set('src', s.utm_source);
      } else if (host.indexOf('kiwify') !== -1 || host.indexOf('eduzz') !== -1) {
        ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(function(k) {
          if (s[k]) u.searchParams.set(k, s[k]);
        });
      }
      a.href = u.toString();
    } catch(e) {}
  }

  function injectLinks() {
    d.querySelectorAll('a[href]').forEach(processLink);
    if (w.MutationObserver) {
      new MutationObserver(function(muts) {
        muts.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'A') processLink(node);
            if (node.querySelectorAll) node.querySelectorAll('a[href]').forEach(processLink);
          });
        });
      }).observe(d.body, { childList: true, subtree: true });
    }
  }

  /* ── Gatilho: Scroll 50% → ViewContent ─────────────────────────── */
${hasViewContent ? `
  var _vcFired = false;
  w.addEventListener('scroll', function() {
    if (_vcFired) return;
    var pct = (w.scrollY + w.innerHeight) / d.documentElement.scrollHeight;
    if (pct >= 0.5) {
      _vcFired = true;
      fireEvent('ViewContent', {}, true);
    }
  }, { passive: true });
` : ''}
  /* ── Gatilho: Form submit → Lead + InitiateCheckout ────────────── */

  var _leadFired = false;
  function setupFormTracking() {
    d.querySelectorAll('form').forEach(function(form) {
      if (form._th_form) return;
      form._th_form = true;
      form.addEventListener('submit', function() {
        // Seletores amplos — cobre Lovable, WordPress, Elementor, RD Station
        function val(sels) {
          for (var i = 0; i < sels.length; i++) {
            var el = form.querySelector(sels[i]);
            if (el && el.value && el.value.trim()) return el.value.trim();
          }
          return '';
        }
        var email = val([
          'input[type="email"]','input[autocomplete="email"]',
          'input[id*="email" i]','input[name*="email" i]','input[placeholder*="email" i]'
        ]);
        var phone = val([
          'input[type="tel"]','input[autocomplete="tel"]',
          'input[id*="phone" i]','input[id*="fone" i]',
          'input[name*="phone" i]','input[name*="tel" i]','input[name*="fone" i]',
          'input[placeholder*="telefone" i]','input[placeholder*="celular" i]','input[placeholder*="phone" i]'
        ]);
        var fullName = val([
          'input[autocomplete="name"]','input[id*="name" i]','input[id*="nome" i]',
          'input[name*="name" i]','input[name*="nome" i]',
          'input[placeholder*="nome" i]','input[placeholder*="name" i]'
        ]);

        if (!email && !phone) return;

        var parts     = fullName.trim().split(/\\s+/);
        var firstName = parts[0] || '';
        var lastName  = parts.slice(1).join(' ') || '';
        var phoneNorm = normalizePhone(phone);

        // Salvar PII no localStorage para cruzamento posterior
        var stored = getStoredData();
        if (email)     stored.email      = email.trim().toLowerCase();
        if (phoneNorm) stored.phone      = phoneNorm;
        if (firstName) stored.first_name = firstName.trim().toLowerCase();
        if (lastName)  stored.last_name  = lastName.trim().toLowerCase();
        saveStoredData(stored);

        var extra = {};
        if (email)     extra.email      = email.trim().toLowerCase();
        if (phoneNorm) extra.phone      = phoneNorm;
        if (firstName) extra.first_name = firstName;
        if (lastName)  extra.last_name  = lastName;

        if (!_leadFired) {
          _leadFired = true;
          setTimeout(function(){ _leadFired = false; }, 5000);
${hasLead ? "          fireEvent('Lead', extra, false);" : ''}
${hasInitCheckout ? "          fireEvent('InitiateCheckout', extra, false);" : ''}
        }
      });
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', setupFormTracking);
  } else {
    setupFormTracking();
  }

  /* ── Gatilho: Checkout click → InitiateCheckout ────────────────── */

  d.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    try {
      var h = new URL(a.href).hostname;
      if (h.indexOf('hotmart') !== -1 || h.indexOf('kiwify') !== -1 || h.indexOf('eduzz') !== -1) {
${hasInitCheckout ? "        fireEvent('InitiateCheckout', {}, false);" : ''}
      }
    } catch(err) {}
  }, { capture: true });

  /* ── Gatilho: WhatsApp click → Contact ─────────────────────────── */
${hasContact ? `
  var _contactFired = false;
  d.addEventListener('click', function(e) {
    if (_contactFired) return;
    var target = e.target;
    var el = target && target.closest ? target.closest('a[href*="wa.me"], a[href*="whatsapp.com/send"], [data-track="whatsapp"], [class*="whatsapp" i]') : null;
    if (!el) return;
    _contactFired = true;
    setTimeout(function(){ _contactFired = false; }, 5000);
    fireEvent('Contact', { method: 'whatsapp' }, false);
  });
` : ''}
  /* ── Eventos configurados ───────────────────────────────────────── */

  TH.events = ${eventsJson};
  TH.events.forEach(function(ev) {
    var params = ev.p || {};
    switch(ev.t) {
      case 'page_load':       fireEvent(ev.n, params, true); break;
      case 'element_visible':
        if (!ev.s || !w.IntersectionObserver) break;
        (function(sel, name, p) {
          var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) { fireEvent(name, p, true); obs.disconnect(); }
            });
          }, { threshold: 0.5 });
          d.querySelectorAll(sel).forEach(function(el) { obs.observe(el); });
        })(ev.s, ev.n, params);
        break;
      case 'element_click':
        if (!ev.s) break;
        (function(sel, name, p) {
          function attach() {
            d.querySelectorAll(sel).forEach(function(el) {
              if (!el._th_c) { el._th_c = true; el.addEventListener('click', function() { fireEvent(name, p, false); }); }
            });
          }
          d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', attach) : attach();
        })(ev.s, ev.n, params);
        break;
      case 'scroll_depth':
        (function(pct, name, p) {
          var fired = false;
          w.addEventListener('scroll', function() {
            if (fired) return;
            if ((w.scrollY + w.innerHeight) / d.documentElement.scrollHeight * 100 >= parseInt(pct || '50')) {
              fired = true; fireEvent(name, p, true);
            }
          }, { passive: true });
        })(ev.v, ev.n, params);
        break;
      case 'time_on_page':
        setTimeout(function() { fireEvent(ev.n, params, true); }, parseInt(ev.v || '30') * 1000);
        break;
    }
  });

  /* ── API pública ────────────────────────────────────────────────── */

  TH.identify = function(email, phone, firstName, lastName) {
    var stored = getStoredData();
    if (email)     stored.email      = email.trim().toLowerCase();
    if (phone)     stored.phone      = normalizePhone(phone);
    if (firstName) stored.first_name = firstName.trim().toLowerCase();
    if (lastName)  stored.last_name  = lastName.trim().toLowerCase();
    saveStoredData(stored);
    send('Lead', stored);
  };

  TH.track = function(eventName, params) { fireEvent(eventName, params, false); };

  TH.viewContent = function(contentName, contentId, value, currency) {
    fireEvent('ViewContent', {
      content_name: contentName, content_ids: contentId ? [contentId] : [],
      value: value, currency: currency || 'BRL'
    }, true);
  };

  /* ── Inicialização ──────────────────────────────────────────────── */

  captureParams();
  if (TH.pixelId) initPixel(TH.pixelId);
  if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', injectLinks); }
  else { injectLinks(); }

  TH.ready = true;

})(window, document);
`;
}
