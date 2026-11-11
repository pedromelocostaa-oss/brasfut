// Service worker do Prancheta FC. Guarda o jogo inteiro para abrir sem internet.
const V = 'prancheta-880c7bcea6';
const ARQ = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png', './icone-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ARQ)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // a fonte do Google pode falhar sem internet; o jogo tem fallback de fonte
  if (u.origin !== location.origin) return;
  // rede primeiro para o documento (pega versão nova), cache como rede de segurança
  if (e.request.mode === 'navigate') {
    // só o jogo tem reserva offline; privacidade, termos e suporte vão para a rede
    const ehJogo = u.pathname === '/' || u.pathname.endsWith('/index.html');
    e.respondWith(fetch(e.request).then(r => { if (ehJogo) { const c = r.clone(); caches.open(V).then(x => x.put('./index.html', c)); } return r; }).catch(() => ehJogo ? caches.match('./index.html') : Response.error()));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(e.request, c)); return res; })));
});
