# Gera dois alvos a partir dos mesmos arquivos:
#   jogo/index.html  -> fragmento que vai para o artifact (sem doctype, a casca é do artifact)
#   app/index.html   -> documento completo do PWA, com manifest, service worker e ícone
import pathlib, hashlib, re
d = pathlib.Path(__file__).parent
raiz = d.parent / 'app'
app = raiz / 'jogar'
css = (d / 'styles.css').read_text()
files = ('nativo.js', 'rosters.js', 'clubs.js', 'foreign.js', 'engine.js', 'comps.js', 'game.js', 'ui.js')
scripts = '\n'.join(f'<script>\n{(d / f).read_text()}\n</script>' for f in files)
DESC = 'Manager de futebol brasileiro: Séries A a D, Copa do Brasil, estaduais, Libertadores e Sul-Americana.'
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900&family=Atkinson+Hyperlegible:wght@400;700&display=swap">')
BODY = f'<div id="app"></div>\n<div id="toasts" aria-live="polite"></div>\n{scripts}'

# 1) artifact
frag = f'''<title>Prancheta FC</title>
<meta name="description" content="{DESC}">
{FONTS}
<style>
{css}
</style>
{BODY}
'''
(d / 'index.html').write_text(frag)

# 2) PWA
app.mkdir(exist_ok=True)
pwa = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Prancheta FC</title>
<meta name="description" content="{DESC}">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#10201A">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Prancheta FC">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icone-192.png" sizes="192x192">
{FONTS}
<style>
:root {{ color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
html, body {{ min-height: 100%; }}
body {{ margin: 0; background: #E9EEEA; -webkit-text-size-adjust: 100%; overscroll-behavior-y: none; }}
img {{ max-width: 100%; }}
[hidden] {{ display: none !important; }}
{css}
</style>
</head>
<body>
{BODY}
<script>
// o service worker é do site; dentro do app nativo o Capacitor já serve tudo localmente
if ('serviceWorker' in navigator && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) addEventListener('load', () => {{
  const jaControlado = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {{}});
  // quando uma versão nova assume o controle, recarrega uma vez para a tela sair do código velho
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {{
    if (recarregou || !jaControlado) return;
    recarregou = true;
    location.reload();
  }});
}});
</script>
</body>
</html>
'''
(app / 'index.html').write_text(pwa)

ver = hashlib.sha1(pwa.encode()).hexdigest()[:10]
(app / 'manifest.webmanifest').write_text('''{
  "name": "Prancheta FC",
  "short_name": "Prancheta",
  "description": "''' + DESC + '''",
  "lang": "pt-BR",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#E9EEEA",
  "theme_color": "#10201A",
  "categories": ["games", "sports"],
  "icons": [
    { "src": "icone-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icone-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icone-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
''')
(app / 'sw.js').write_text('''// Service worker do Prancheta FC. Guarda o jogo inteiro para abrir sem internet.
const V = 'prancheta-''' + ver + '''';
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
    const ehJogo = u.pathname === '/jogar/' || u.pathname.endsWith('/jogar/index.html');
    e.respondWith(fetch(e.request).then(r => { if (ehJogo) { const c = r.clone(); caches.open(V).then(x => x.put('./index.html', c)); } return r; }).catch(() => ehJogo ? caches.match('./index.html') : Response.error()));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(e.request, c)); return res; })));
});
''')

# ---------- site (app/index.html) ----------
# A grade de 156 clubes sai do clubs.js, para nao ter a lista escrita a mao em dois lugares.
import json
_raw = (d / 'clubs.js').read_text()
_i = _raw.index('const C = ') + len('const C = ')
_j = _raw.index(']];', _i) + 2
CLUBES = json.loads(_raw[_i:_j])

def _lum(hexcor):
    h = hexcor.lstrip('#')
    r, g, b = (int(h[k:k+2], 16) / 255 for k in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def _ratio(a, b):
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)

def _mistura(hexcor, alvo, t):
    h = hexcor.lstrip('#'); a = alvo.lstrip('#')
    out = []
    for k in (0, 2, 4):
        c1, c2 = int(h[k:k+2], 16), int(a[k:k+2], 16)
        out.append(round(c1 + (c2 - c1) * t))
    return '#%02X%02X%02X' % tuple(out)

def _sigla(cor):
    """Fundo e tinta da sigla. Mantem a cor do clube, mas escurece ou clareia o minimo
    necessario para a sigla passar de 4.5:1, que e o limite de contraste para texto normal."""
    PRETO, BRANCO = '#10201A', '#FFFFFF'
    tinta = PRETO if _ratio(_lum(cor), _lum(PRETO)) >= _ratio(_lum(cor), _lum(BRANCO)) else BRANCO
    destino = BRANCO if tinta == PRETO else PRETO
    fundo = cor
    for i in range(21):
        if _ratio(_lum(fundo), _lum(tinta)) >= 4.5:
            break
        fundo = _mistura(cor, destino, (i + 1) * 0.05)
    return fundo, tinta

def _chave(*partes):
    import unicodedata
    t = ' '.join(partes).lower()
    return ''.join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn')

SERIE = {'A': 'Série A', 'B': 'Série B', 'C': 'Série C', 'D': 'Série D'}
cards = []
for sig, nome, cidade, uf, serie, cor1, cor2, cap, fan, estadio in sorted(CLUBES, key=lambda c: (c[4], c[1])):
    busca = _chave(nome, sig, cidade, uf, estadio)
    cards.append(
        f'<a class="clube" href="/jogar/?clube={sig}" data-s="{serie}" data-b="{busca}">'
        f'<span class="sig"><img src="/jogar/escudos/{sig}.png" alt="" width="34" height="34" loading="lazy" decoding="async"'
        f' onerror="this.closest(\'.sig\').className=\'sig sem-img\'">'
        f'<i style="background:{_sigla(cor1)[0]};color:{_sigla(cor1)[1]};box-shadow:inset 0 -4px 0 {cor2}">{sig}</i></span>'
        f'<span class="nm"><b>{nome}</b><span>{SERIE[serie]} · {uf}</span></span></a>')

site = (d / 'site.html').read_text().replace('<!--CLUBES-->', '\n'.join(cards))
(raiz / 'index.html').write_text(site)

print('site', len(site), '|', len(CLUBES), 'clubes |', 'artifact', len(frag), '| pwa', len(pwa), '| versão do cache', ver)
