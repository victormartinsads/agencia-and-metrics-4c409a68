(function(window, document) {
    'use strict';

    const VERSION = '1.0.0';
    // Em produção, isso pode apontar para o Cloudflare Worker em um subdomínio do cliente
    // Mas, como fallback/default, usaremos o path atual ou um endpoint configurável
    let ENDPOINT = 'https://api.centraland.com/collect'; 
    let CLIENT_ID = null;

    // Função utilitária para gerar UUID (v4)
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Função para Hash SHA-256 (Exigência Meta CAPI)
    async function sha256(message) {
        if (!message) return null;
        message = message.trim().toLowerCase();
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Gerenciamento de Identidade (Cookies de Primeira Parte)
    const Identity = {
        getCookie: function(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        },
        setCookie: function(name, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            // Root domain para manter o cookie entre subdomínios (se for o caso)
            const domainParts = window.location.hostname.split('.');
            let domain = window.location.hostname;
            if (domainParts.length > 2) {
                domain = '.' + domainParts.slice(-2).join('.');
            }
            document.cookie = name + "=" + (value || "")  + expires + "; path=/; domain=" + domain + "; samesite=lax";
        },
        getUserId: function() {
            // Tenta pegar da URL (Cross-Domain)
            const urlParams = new URLSearchParams(window.location.search);
            const urlId = urlParams.get('_and_id');
            if (urlId) {
                this.setCookie('_and_id', urlId, 365);
                return urlId;
            }

            let uid = this.getCookie('_and_id');
            if (!uid) {
                uid = generateUUID();
                this.setCookie('_and_id', uid, 365);
            }
            return uid;
        },
        getFbp: function() { return this.getCookie('_fbp'); },
        getFbc: function() { return this.getCookie('_fbc'); }
    };

    // Objeto central do tracker
    const Tracker = {
        init: function(config) {
            if (!config || !config.clientId) {
                console.warn('Central AND: Tracker missing clientId');
                return;
            }
            CLIENT_ID = config.clientId;
            if (config.endpoint) ENDPOINT = config.endpoint;

            this.userId = Identity.getUserId();
            this.sessionId = generateUUID();
            this.url = window.location.href;
            this.referrer = document.referrer;
            this.userAgent = navigator.userAgent;

            this.setupListeners();
            this.trackPageView();
            this.startHeartbeat();
        },

        buildPayload: function(eventName, eventData = {}) {
            return {
                client_id: CLIENT_ID,
                user_id: this.userId,
                session_id: this.sessionId,
                event_name: eventName,
                event_data: eventData,
                context: {
                    url: this.url,
                    referrer: this.referrer,
                    user_agent: this.userAgent,
                    title: document.title,
                    fbp: Identity.getFbp(),
                    fbc: Identity.getFbc(),
                    timestamp: new Date().toISOString()
                }
            };
        },

        send: function(eventName, eventData = {}) {
            const payload = this.buildPayload(eventName, eventData);
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            
            // navigator.sendBeacon é ideal para não perder eventos ao sair da página
            if (navigator.sendBeacon) {
                navigator.sendBeacon(ENDPOINT, blob);
            } else {
                fetch(ENDPOINT, {
                    method: 'POST',
                    body: blob,
                    keepalive: true
                }).catch(() => {});
            }
        },

        trackPageView: function() {
            this.send('PageView');
        },

        startHeartbeat: function() {
            // Heartbeat a cada 30 segundos
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.send('Heartbeat');
                }
            }, 30000);
        },

        // Captura furtiva de formulários
        setupListeners: function() {
            // Captura de e-mail/telefone ao sair do campo (blur)
            document.addEventListener('blur', async (e) => {
                const target = e.target;
                if (!target || target.tagName !== 'INPUT') return;

                const type = target.type ? target.type.toLowerCase() : '';
                const name = target.name ? target.name.toLowerCase() : '';
                const val = target.value;

                if (!val) return;

                let isEmail = type === 'email' || name.includes('email');
                let isPhone = type === 'tel' || name.includes('phone') || name.includes('telefone');

                if (isEmail || isPhone) {
                    const hashedVal = await sha256(val);
                    if (isEmail) {
                        this.send('Identify', { email_hash: hashedVal });
                    }
                    if (isPhone) {
                        this.send('Identify', { phone_hash: hashedVal });
                    }
                }
            }, true);

            // Cross-Domain Tracking para Checkouts
            document.addEventListener('click', (e) => {
                // Encontra a tag A mais próxima
                let target = e.target;
                while (target && target.tagName !== 'A') {
                    target = target.parentNode;
                }
                
                if (target && target.href) {
                    try {
                        const url = new URL(target.href);
                        const host = url.hostname;
                        // Regra simplificada: Se está saindo do domínio atual para hotmart, kiwify, eduzz
                        const checkoutDomains = ['pay.hotmart.com', 'pay.kiwify.com.br', 'sun.eduzz.com'];
                        
                        let isCheckout = false;
                        for (let cd of checkoutDomains) {
                            if (host.includes(cd)) isCheckout = true;
                        }

                        if (isCheckout || host !== window.location.hostname) {
                            // Adiciona _and_id na URL
                            url.searchParams.set('_and_id', this.userId);
                            target.href = url.toString();
                        }
                    } catch (err) {
                        // Ignora links inválidos
                    }
                }
            });
        }
    };

    // Expor globalmente para inicialização
    window.AndTracker = Tracker;

    // Se o cliente definiu uma configuração antes do script carregar (snippet style)
    if (window.andTrackerConfig) {
        Tracker.init(window.andTrackerConfig);
    }

})(window, document);
