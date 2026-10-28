/* Prancheta FC: interface. Depende de Engine e Game. */
(function () {
  'use strict';
  const E = window.Engine, G = window.Game;
  const KEY = 'prancheta.v1';
  const CKEY = 'prancheta.escudos.v1';
  let CRESTS = {};
  function loadCrests() { try { const raw = localStorage.getItem(CKEY); CRESTS = raw ? JSON.parse(raw) || {} : {}; } catch (e) { CRESTS = {}; } }
  function saveCrests() { try { localStorage.setItem(CKEY, JSON.stringify(CRESTS)); return true; } catch (e) { return false; } }
  let S = null;
  const U = { view: 'central', sheet: null, settings: { sound: true }, onb: { step: 1, club: null, persona: 'motivador', name: '' }, mkt: { tab: 'buy', pos: '', young: false, fit: true, offer: 0, resp: null }, match: null, ms: null, post: null, confirmNew: false, auctionTimer: null, liga: null };
  const app = document.getElementById('app');

  // ---------- persistencia (conveniencia local; o jogo funciona sem ela) ----------
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ S, settings: U.settings })); } catch (e) { /* sem armazenamento: segue em memoria */ } }
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.S && d.S.v === 3) { S = G.migrate(d.S); if (!S.coach.avatar) S.coach.avatar = randomAvatar(); } else if (d && d.S) U.oldSave = true; if (d && d.settings) U.settings = d.settings; } } catch (e) { S = null; } }

  // ---------- utilidades ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => G.fmt(v);
  const me = () => S.coach.club;
  const club = id => (S || window.__preview || { clubs: {} }).clubs[id];
  function lum(hex) { const h = hex.replace('#', ''); const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  const txtOn = hex => lum(hex) > 0.55 ? '#111111' : '#FFFFFF';
  function badge(id, cls = '') { if (CRESTS[id]) return `<span class="badge crest ${cls}" aria-hidden="true"><img src="${CRESTS[id]}" alt=""></span>`; const c = club(id) || E.CLUBS.find(x => x.id === id); return `<span class="badge ${cls}" style="--c1:${c.c1};--c2:${c.c2};color:${txtOn(c.c1)}" aria-hidden="true">${c.div === 'X' ? c.id.slice(1) : c.id}</span>`; }
  const money = v => { const t = fmt(v); return t.replace(/^(−?)R\$ /, '$1<small>R$</small>'); };
  const tier = o => o >= 82 ? 't1' : o >= 76 ? 't2' : o >= 60 ? 't3' : 't4';
  const ovr = o => `<span class="ovr ${tier(o)}" data-tip="Nota do jogador. Dourado: 82 ou mais. Verde: 76 a 81. Cinza: 60 a 75. Vermelho: abaixo de 60.">${o}</span>`;
  function fadiga(c) { const cls = c >= 80 ? '' : c >= 62 ? 'mid' : 'low'; const lbl = c >= 80 ? 'descansado' : c >= 62 ? 'cansado' : 'esgotado'; return `<span class="fadiga ${cls}" role="img" aria-label="${lbl}" data-tip="Condição física: ${lbl}. Cansado rende menos. Recupera um pouco a cada rodada.">${''}<i style="width:${Math.round(c)}%"></i></span>`; }
  const shortN = n => { if (n.length <= 10) return n; const p = n.split(' '); let i = p.length - 1; while (i > 0 && /^(de|da|do|dos|das|la|del|van|von)$/.test(p[i - 1])) i--; return p.slice(i).join(' '); };
  const posLbl = p => E.POS_PT[p];
  const plural = (n, a, b) => n === 1 ? a : b;
  const myPlayers = () => G.squadOf(S, me());

  const IC = {
    central: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    elenco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/></svg>',
    tabela: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="7" cy="6" r=".5"/></svg>',
    mercado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',
    clube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/></svg>',
    liga: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 15c3 0 6 1.8 6 5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  };

  // ---------- ajuda: icone (i) que explica a funcao ao passar o mouse. So aparece no computador (mouse); celular e tablet ficam sem. ----------
  const HELP_MQ = '(hover: hover) and (pointer: fine)';
  const canHover = () => !!(window.matchMedia && matchMedia(HELP_MQ).matches);
  const IC_HINT = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.2v4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="4.7" r="1.05" fill="currentColor"/></svg>';
  const hint = txt => `<span class="hint" tabindex="0" role="note" aria-label="Ajuda: ${esc(txt)}" data-tip="${esc(txt)}">${IC_HINT}</span>`;
  const tipA = txt => `data-tip="${esc(txt)}"`;
  let tipEl = null, tipT = null, tipFor = null, tipPend = null;
  function showTip(a) {
    const txt = a.getAttribute('data-tip'); if (!txt || !document.body.contains(a)) return;
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tipbox'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    const t = tipEl; t.textContent = txt; tipFor = a;
    const vw = document.documentElement.clientWidth, r = a.getBoundingClientRect();
    t.style.maxWidth = Math.min(300, vw - 16) + 'px'; t.style.left = '0px'; t.style.top = '0px'; t.classList.add('on');
    const tw = t.offsetWidth, th = t.offsetHeight;
    const x = Math.max(8, Math.min(vw - tw - 8, r.left + r.width / 2 - tw / 2));
    let y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
    t.style.left = Math.round(x) + 'px'; t.style.top = Math.round(y) + 'px';
  }
  function hideTip() { clearTimeout(tipT); tipFor = null; tipPend = null; if (tipEl) tipEl.classList.remove('on'); }
  document.addEventListener('mouseover', e => {
    if (!canHover()) return;
    const a = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (a && (a === tipFor || a === tipPend)) return;
    hideTip(); if (!a) return;
    tipPend = a; tipT = setTimeout(() => { tipPend = null; showTip(a); }, a.classList.contains('hint') ? 60 : 450);
  });
  document.addEventListener('focusin', e => { const a = e.target.closest ? e.target.closest('.hint') : null; if (a && canHover()) showTip(a); });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('pointerdown', hideTip);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, true);

  // ---------- toasts, confete, som ----------
  function toast(html, cls = '', ms = 3200) { const box = document.getElementById('toasts'); if (!box) return; const t = document.createElement('div'); t.className = 'toast ' + cls; t.setAttribute('role', 'status'); t.innerHTML = html; box.appendChild(t); setTimeout(() => t.remove(), ms); }
  function confetti(n = 70) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = [club(me()).c1, club(me()).c2, getComputedStyle(document.documentElement).getPropertyValue('--ouro').trim() || '#E8B400', '#2350C8'];
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length]; c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * 0.4 + 's'; c.style.opacity = 0.9; box.appendChild(c); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3800);
  }
  let AC = null;
  function audio() { if (!U.settings.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
  function beep(f, t0, d, type = 'square', vol = 0.06) { const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + d); o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + 0.02); }
  function whistle(n = 1) { for (let i = 0; i < n; i++) beep(2700, i * 0.32, 0.22, 'square', 0.035); }
  function cheer() {
    const a = audio(); if (!a) return;
    const len = 1.6, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / (a.sampleRate * 0.25)) * (1 - i / d.length);
    const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7; const g = a.createGain(); g.gain.value = 0.25;
    s.connect(f).connect(g).connect(a.destination); s.start();
    [523, 659, 784].forEach((fr, i) => beep(fr, 0.05 + i * 0.09, 0.25, 'triangle', 0.05));
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* sem vibracao */ } }

  // ---------- casca ----------
  const NAV = [['central', 'Central'], ['elenco', 'Elenco'], ['tabela', 'Tabela'], ['mercado', 'Mercado'], ['clube', 'Clube']];
  const NAV_TIP = { central: 'Próximo jogo, objetivos, patrocínio e resumo do clube.', elenco: 'Escalação, formação, banco, postura e lista de jogadores.', tabela: 'Classificação do Brasileirão e jogos da rodada.', mercado: 'Comprar, vender e leilões. Negócios só fecham com a janela aberta.', clube: 'Técnico, diretoria, finanças, conquistas, escudos e opções.', liga: 'Prévia do modo liga com amigos.' };
  function shell(content) {
    const c = club(me());
    const navBtns = NAV.map(([k, l]) => `<button data-act="go" data-v="${k}" ${tipA(NAV_TIP[k])} ${U.view === k ? 'aria-current="page"' : ''}>${IC[k]}<span>${l}</span></button>`).join('') + `<button class="only-wide" data-act="go" data-v="liga" ${tipA(NAV_TIP.liga)} ${U.view === 'liga' ? 'aria-current="page"' : ''}>${IC.liga}<span>Liga</span></button>`;
    const roundLbl = S.seasonOver ? `Temporada ${S.year} encerrada` : `${DIVN[c.div]} · semana ${T.weekNo(S.round)} de ${G.SEASON_WEEKS}${G.isMid(S.round) ? ' · meio de semana' : ''}`;
    return `<div class="shell ${U.view === 'match' ? 'focus' : ''}">
      <nav class="nav" aria-label="Menu principal"><div class="nav-brand">Pran<i>cheta</i></div>${navBtns}</nav>
      <div class="content">
        <header class="topbar">
          <div class="club">${badge(me())}<b>${esc(c.name)}</b></div>
          <div class="meta"><span class="pill muted hide-sm">${roundLbl}</span><span class="pill num" ${tipA('Dinheiro do clube agora. Toda semana entram cota de TV e patrocínio e sai a folha salarial; em jogo em casa entra a bilheteria. Caixa negativo tira 2 de confiança por rodada.')}><span class="muted hide-sm">Caixa</span> <b class="${c.cash < 0 ? 'neg-c' : ''}">${fmt(c.cash)}</b></span></div>
        </header>
        <main id="main">${content}</main>
      </div>
    </div>`;
  }

  // ---------- avatar do tecnico (desenho proprio, montado por partes) ----------
  const AV = {
    skin: ['#F6D7C3', '#EBC09F', '#D9A47E', '#B97F57', '#8D5A3B', '#5E3A26'],
    hairColor: [['#1F1A17', 'Preto'], ['#5A3825', 'Castanho'], ['#D8B162', 'Loiro'], ['#B5532A', 'Ruivo'], ['#9A9A9A', 'Grisalho'], ['#ECECEC', 'Branco']],
    hair: [['careca', 'Careca'], ['raspado', 'Raspado'], ['curto', 'Curto'], ['topete', 'Topete'], ['cacheado', 'Cacheado'], ['black', 'Black power'], ['longo', 'Comprido'], ['coque', 'Coque']],
    beard: [['nenhuma', 'Sem barba'], ['porfazer', 'Por fazer'], ['bigode', 'Bigode'], ['cavanhaque', 'Cavanhaque'], ['cheia', 'Barba cheia']],
    glasses: [['nenhum', 'Sem óculos'], ['redondo', 'Redondo'], ['quadrado', 'Quadrado'], ['escuro', 'Escuro']],
  };
  function randomAvatar() { const r = a => a[Math.floor(Math.random() * a.length)]; return { skin: Math.floor(Math.random() * 6), hair: r(AV.hair)[0], hairColor: Math.floor(Math.random() * 4), beard: r(AV.beard)[0], glasses: Math.random() < 0.7 ? 'nenhum' : r(AV.glasses.slice(1))[0] }; }
  function shade(hex, k) { const h = hex.replace('#', ''); const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v * (1 + k)))).toString(16).padStart(2, '0')).join(''); }
  let avN = 0;
  function avatarSVG(a, clubId, size = 64) {
    a = a || { skin: 1, hair: 'curto', hairColor: 0, beard: 'nenhuma', glasses: 'nenhum' };
    const sk = AV.skin[a.skin] || AV.skin[1], skD = shade(sk, -0.16), hc = (AV.hairColor[a.hairColor] || AV.hairColor[0])[0];
    const c = clubId ? (club(clubId) || E.CLUBS.find(x => x.id === clubId)) : null;
    let jk = c ? c.c1 : '#2350C8'; if (lum(jk) > 0.85) jk = c.c2; const tie = c && lum(c.c2) < 0.85 ? c.c2 : '#1A1A1A';
    const id = 'avc' + (++avN);
    const brow = a.hair === 'careca' ? '#3A2A20' : hc;
    let back = '', front = '';
    const cap = 'M33 50 Q31 20 60 18 Q89 20 87 50 Q84 34 72 31 Q60 36 46 31 Q36 35 33 50 Z';
    switch (a.hair) {
      case 'raspado': front = `<path d="M34 46 Q36 22 60 21 Q84 22 86 46 Q80 32 60 31 Q40 32 34 46 Z" fill="${hc}" opacity=".55"/>`; break;
      case 'curto': front = `<path d="${cap}" fill="${hc}"/>`; break;
      case 'topete': front = `<path d="${cap}" fill="${hc}"/><path d="M42 27 Q50 6 74 12 Q86 17 82 30 Q72 20 58 25 Z" fill="${hc}"/>`; break;
      case 'cacheado': front = [[36, 40], [42, 29], [52, 22], [64, 21], [75, 26], [83, 38], [48, 32], [60, 28], [71, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${hc}"/>`).join(''); break;
      case 'black': back = `<circle cx="60" cy="40" r="40" fill="${hc}"/>`; front = `<path d="M32 50 Q30 16 60 14 Q90 16 88 50 Q84 30 60 30 Q36 30 32 50 Z" fill="${hc}"/>`; break;
      case 'longo': back = `<path d="M29 50 Q26 96 40 104 L80 104 Q94 96 91 50 Q90 15 60 15 Q30 15 29 50 Z" fill="${hc}"/>`; front = `<path d="M33 50 Q33 19 60 18 Q87 19 87 50 Q79 29 60 30 Q45 30 33 50 Z" fill="${hc}"/>`; break;
      case 'coque': front = `<path d="M34 46 Q35 21 60 20 Q85 21 86 46 Q80 31 60 30 Q40 31 34 46 Z" fill="${hc}"/><circle cx="60" cy="14" r="9" fill="${hc}"/>`; break;
      default: front = '';
    }
    const must = `<path d="M47 67 Q54 61 60 64 Q66 61 73 67 Q66 66 60 68 Q54 66 47 67 Z" fill="${hc}"/>`;
    let beard = '';
    if (a.beard === 'cheia') beard = `<path d="M34 54 Q33 86 60 88 Q87 86 86 54 Q82 62 79 60 Q77 77 60 78 Q43 77 41 60 Q38 62 34 54 Z" fill="${hc}"/>` + must;
    else if (a.beard === 'porfazer') beard = `<path d="M34 54 Q33 86 60 88 Q87 86 86 54 Q82 62 79 60 Q77 77 60 78 Q43 77 41 60 Q38 62 34 54 Z" fill="${hc}" opacity=".3"/>`;
    else if (a.beard === 'cavanhaque') beard = `<path d="M51 73 Q60 90 69 73 Q60 79 51 73 Z" fill="${hc}"/>` + must;
    else if (a.beard === 'bigode') beard = must;
    let gl = '';
    const tmp = `<path d="M34 49 L41 49 M79 49 L86 49" stroke="#222" stroke-width="2"/>`;
    if (a.glasses === 'redondo') gl = `<circle cx="50" cy="50" r="8" fill="rgba(255,255,255,.18)" stroke="#222" stroke-width="2"/><circle cx="70" cy="50" r="8" fill="rgba(255,255,255,.18)" stroke="#222" stroke-width="2"/><path d="M58 50 Q60 48 62 50" stroke="#222" stroke-width="2" fill="none"/>` + tmp;
    else if (a.glasses === 'quadrado') gl = `<rect x="40.5" y="44" width="18" height="12" rx="3" fill="rgba(255,255,255,.18)" stroke="#222" stroke-width="2"/><rect x="61.5" y="44" width="18" height="12" rx="3" fill="rgba(255,255,255,.18)" stroke="#222" stroke-width="2"/><path d="M58.5 49 L61.5 49" stroke="#222" stroke-width="2"/>` + tmp;
    else if (a.glasses === 'escuro') gl = `<rect x="40" y="44" width="19" height="12" rx="4" fill="#111"/><rect x="61" y="44" width="19" height="12" rx="4" fill="#111"/><path d="M59 48 L61 48" stroke="#111" stroke-width="2.5"/>` + tmp;
    return `<svg class="avatar" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="Visual do técnico"><defs><clipPath id="${id}"><circle cx="60" cy="60" r="60"/></clipPath></defs><g clip-path="url(#${id})"><rect width="120" height="120" fill="var(--sup2)"/>${back}
      <path d="M12 124 C12 98 34 88 60 88 C86 88 108 98 108 124 Z" fill="${jk}"/><path d="M47 89 L60 106 L73 89 Z" fill="#FFFFFF"/><path d="M57.5 92 L62.5 92 L63.5 106 L60 111 L56.5 106 Z" fill="${tie}"/>
      <rect x="51" y="70" width="18" height="21" rx="6" fill="${skD}"/><ellipse cx="33.5" cy="55" rx="5" ry="7" fill="${skD}"/><ellipse cx="86.5" cy="55" rx="5" ry="7" fill="${skD}"/>
      <ellipse cx="60" cy="52" rx="26" ry="30" fill="${sk}"/>${beard}
      <path d="M44 42.5 Q50 39 55.5 42" stroke="${brow}" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M64.5 42 Q70 39 76 42.5" stroke="${brow}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="50" rx="2.6" ry="3.1" fill="#1D1D1D"/><ellipse cx="70" cy="50" rx="2.6" ry="3.1" fill="#1D1D1D"/>
      <path d="M60 52 Q56.5 60 59.5 62 Q62 62.5 64 61" stroke="${skD}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M53 71.5 Q60 77 67 71.5" stroke="#5B2B22" stroke-width="2.4" fill="none" stroke-linecap="round"/>${front}${gl}</g></svg>`;
  }
  function avatarEditor(a) {
    const sw = (k, list, cur) => list.map((col, i) => `<button class="swatch" data-act="av" data-k="${k}" data-v="${i}" aria-pressed="${cur === i}" aria-label="${k === 'skin' ? 'Tom de pele ' + (i + 1) : col[1]}" style="--sw:${Array.isArray(col) ? col[0] : col}"></button>`).join('');
    const ch = (k, list, cur) => list.map(([v, l]) => `<button class="chip" data-act="av" data-k="${k}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('');
    return `<div class="av-ed stack" style="gap:12px">
      <div><div class="eyebrow">Pele</div><div class="row" style="gap:8px;margin-top:6px">${sw('skin', AV.skin, a.skin)}</div></div>
      <div><div class="eyebrow">Cabelo</div><div class="chips wrap" style="margin-top:6px">${ch('hair', AV.hair, a.hair)}</div></div>
      <div><div class="eyebrow">Cor do cabelo e da barba</div><div class="row" style="gap:8px;margin-top:6px">${sw('hairColor', AV.hairColor, a.hairColor)}</div></div>
      <div><div class="eyebrow">Barba</div><div class="chips wrap" style="margin-top:6px">${ch('beard', AV.beard, a.beard)}</div></div>
      <div><div class="eyebrow">Óculos</div><div class="chips wrap" style="margin-top:6px">${ch('glasses', AV.glasses, a.glasses)}</div></div>
      <button class="btn" data-act="avRandom" style="justify-self:start" ${tipA('Monta um visual aleatório. Dá para ajustar depois.')}>Sortear visual</button></div>`;
  }

  // ---------- previa do clube antes de assumir ----------
  function sheetClubPreview() {
    const tmp = window.__preview; const id = U.sheet.id; const c = tmp.clubs[id];
    const t = roleOf(tmp, id);
    const sq = G.squadOf(tmp, id); const lu = E.autoLineup(sq, c.formation || '4-3-3');
    const sec = E.sectors(E.lineupFrom(id, tmp.players, lu).filter(o => o.p), {});
    const groups = [['G', 'Goleiros'], ['D', 'Defensores'], ['M', 'Meio-campistas'], ['A', 'Atacantes']];
    const avgAge = sq.reduce((x, p) => x + p.age, 0) / sq.length;
    const list = groups.map(([g, l]) => { const ps = sq.filter(p => E.GROUP[p.pos] === g).sort((a, b) => b.ovr - a.ovr); return `<div class="eyebrow sector-h">${l} · ${ps.length}</div><div class="plist">${ps.map(p => `<div class="prow" style="cursor:default">${ovr(p.ovr)}<span class="who"><b>${esc(p.n)}${p.youth ? ' <span class="tag">base</span>' : ''}</b><span>${E.POS_NAME[p.pos]} · ${p.age} anos ${attrMini(p)}</span></span>${lu.slots.includes(p.id) ? '<span class="tag">Titular</span>' : ''}</div>`).join('')}</div>`; }).join('');
    return `<div class="row between nowrap" style="margin-bottom:12px"><div class="row nowrap">${badge(id, 'lg')}<div><h2 class="disp" style="font-size:28px;text-transform:uppercase;line-height:1">${esc(c.name)}</h2><div class="small muted">${esc(c.city)}-${c.uf} · ${DIVN[c.div]}</div></div></div><button class="btn" data-act="closeSheet">Fechar</button></div>
      <div class="notice info small"><b>${t.role}.</b> Meta ${t.meta}, cobrança ${t.press}.${c.stadium ? ` Estádio: ${esc(c.stadium)}, ${c.cap.toLocaleString('pt-BR')} lugares.` : ''}</div>
      <div class="stats3" style="margin:12px 0">${[['Defesa', sec.def], ['Meio', sec.mid], ['Ataque', sec.att]].map(([l, v]) => `<div class="stat" ${tipA(SECTOR_TIP[l])}><div class="lbl">${l}</div><div class="disp" style="text-align:center;font-size:26px;font-weight:900">${Math.round(v)}</div></div>`).join('')}</div>
      <p class="small muted" style="margin:0">${sq.length} jogadores · força dos titulares ${Math.round(G.strength(tmp, id))}${hint(FORCA_TIP)} · idade média ${avgAge.toFixed(1).replace('.', ',')}</p>
      ${list}
      <div class="row nowrap" style="gap:8px;position:sticky;bottom:-16px;background:var(--sup);padding:12px 0 4px;margin-top:8px"><button class="btn" data-act="closeSheet" style="flex:1">Ver outros clubes</button><button class="btn primary" data-act="onbPick" data-id="${id}" style="flex:2">Ser técnico do ${esc(c.name)}</button></div>`;
  }
  function sheetAvatar() {
    return `<div class="row between nowrap" style="margin-bottom:12px"><h2 class="disp" style="font-size:26px;text-transform:uppercase">Seu visual</h2><button class="btn" data-act="closeSheet">Pronto</button></div>
      <div class="av-wrap"><div class="av-prev">${avatarSVG(S.coach.avatar, me(), 140)}</div>${avatarEditor(S.coach.avatar)}</div>`;
  }

  // ---------- onboarding ----------
  function roleOf(tmp, id) { const d = tmp.clubs[id].div; const rank = G.strengthRanks(tmp, d).indexOf(id) + 1; return G.targetFor(d === 'D' ? Math.ceil(rank / 16) : rank, d); }
  const normQ = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function clubCards() {
    const tmp = window.__preview; const d = U.onb.div || 'A'; const q = normQ(U.onb.q || '').trim();
    const ids = q ? G.strengthRanks(tmp).filter(id => normQ(tmp.clubs[id].name + ' ' + tmp.clubs[id].city + ' ' + tmp.clubs[id].uf).includes(q)) : G.strengthRanks(tmp, d);
    return ids.map(id => { const c = tmp.clubs[id]; const t = roleOf(tmp, id); const s = Math.round(G.strength(tmp, id));
      return `<button class="club-card" data-act="onbClub" data-id="${id}" ${tipA('Abre o elenco do clube antes de você decidir.')}>${badge(id)}<span><b>${esc(c.name)}</b><span class="row" style="gap:6px;margin-top:4px"><span class="ovr ${tier(s)}">${s}</span><span class="tag ${t.role === 'Favorito' ? 'gold' : /Briga/.test(t.role) ? 'blue' : ''}">${t.role}</span>${q ? `<span class="tag">${DIVN[c.div]}</span>` : ''}</span><span class="tiny muted" style="display:block;margin-top:4px">${esc(c.city)}-${c.uf} · meta ${t.meta}</span></span></button>`; }).join('') || '<div class="empty">Nenhum clube encontrado.</div>';
  }
  function vOnboarding() {
    const o = U.onb;
    if (o.step === 1) {
      const tmp = window.__preview || (window.__preview = G.newCareer(20261003, 'FLA', 'x', 'motivador'));
      const d = o.div || 'A'; const n = G.divClubs(tmp, d).length;
      return `<div class="onb stack">
        <div class="row between"><span class="brand">Pran<i>cheta</i> FC</span><span class="tag">Protótipo · temporada 2026</span></div>
        ${U.oldSave ? '<div class="notice warn small">Sua carreira anterior era de uma versão antiga do jogo, sem as Séries B, C e D, e não pôde ser carregada. Comece uma nova.</div>' : ''}
        <h1>Escolha<br>o seu <i>clube</i>${hint('O número é a força: média das 11 maiores notas do elenco. Favorito tem meta alta e diretoria impaciente; azarão tem meta menor e mais paciência.')}</h1>
        <p class="muted" style="max-width:62ch">Os 156 clubes das Séries A, B, C e D de 2026. O número é a força dos titulares e o rótulo diz o papel do clube na série. Começar por baixo e subir de série é o caminho mais longo; na Série A a cobrança é maior.</p>
        <div class="seg wide" role="tablist">${['A', 'B', 'C', 'D'].map(x => `<button role="tab" data-act="onbDiv" data-v="${x}" aria-pressed="${d === x}">${DIVN[x]}</button>`).join('')}</div>
        <label class="sr" for="club-q">Buscar clube</label><input id="club-q" class="txt" placeholder="Buscar clube, cidade ou estado" value="${esc(o.q || '')}" autocomplete="off">
        <div class="club-grid">${clubCards()}</div>
        <div class="row" style="gap:10px">${crestMultiBtn('btn')}<span class="small muted">${Object.keys(CRESTS).length ? `${Object.keys(CRESTS).length} de ${E.CLUBS.length} escudos carregados.` : 'Tem os arquivos oficiais dos escudos? Carregue aqui ou depois em Clube.'}</span></div>
        <p class="tiny muted">Elencos reais e completos das Séries A, B, C e D de 2026 (Transfermarkt, 3 de outubro de 2026); clubes, estádios e capacidades da Wikipédia. Notas e atributos são estimativas do protótipo a partir do valor de mercado, da idade, dos minutos jogados e dos gols e assistências de 2026. Elencos com menos de 23 jogadores são completados com garotos da base de nomes gerados, e os que surgem nas temporadas seguintes também são fictícios.</p>
      </div>`;
    }
    const tmp = window.__preview; const c = tmp.clubs[o.club]; const t = roleOf(tmp, o.club);
    const ps = Object.entries(E.PERSONAS).map(([k, p]) => `<button class="persona" data-act="onbPersona" data-v="${k}" aria-pressed="${o.persona === k}"><b>${p.label}</b><span class="small muted">${p.txt}</span><span class="small">${p.match}</span></button>`).join('');
    return `<div class="onb stack" style="max-width:820px">
      <button class="btn ghost" data-act="onbBack" style="justify-self:start">← Trocar de clube</button>
      <div class="row">${badge(o.club, 'lg')}<div><div class="eyebrow">Seu clube · ${DIVN[c.div]}</div><h1 style="font-size:clamp(34px,6vw,54px)">${esc(c.name)}</h1></div></div>
      <div class="notice info"><b>${t.role}.</b> Meta da diretoria: ${t.label.charAt(0).toLowerCase() + t.label.slice(1)}, com cobrança ${t.press}.${c.div === 'D' ? ' Na Série D a meta vale para o grupo de 6 da primeira fase.' : ''} A partir do 10º jogo da liga, ficar abaixo de 15 de confiança por 3 jogos da liga seguidos, estando mais de 2 posições abaixo da meta, causa demissão.</div>
      <section class="card stack" style="gap:12px"><h2>Quem é o técnico?${hint('Nome e visual aparecem no jogo. O visual dá para mudar depois em Clube.')}</h2>
        <label class="stack" style="gap:6px"><span class="eyebrow">Nome do técnico</span><input id="coach-name" class="txt" maxlength="28" placeholder="Seu nome" value="${esc(o.name)}" autocomplete="name"></label>
        <div class="av-wrap"><div class="av-prev">${avatarSVG(o.avatar, o.club, 150)}</div>${avatarEditor(o.avatar)}</div></section>
      <div class="stack" style="gap:8px"><span class="eyebrow">Seu jeito de comandar${hint('Cada estilo dá um efeito fixo em todas as partidas. Ele não muda durante a carreira.')}</span><div class="personas">${ps}</div></div>
      <button class="btn primary big block" data-act="onbStart">Começar carreira</button>
    </div>`;
  }

  // ---------- séries, competições e atributos ----------
  const DIVN = { A: 'Série A', B: 'Série B', C: 'Série C', D: 'Série D' };
  const T = window.Comps;
  // atributos: 2 por jogador, tirados do conjunto da posição
  const atKeys = p => p.at && !Array.isArray(p.at) ? Object.keys(p.at).sort((a, b) => p.at[b] - p.at[a]) : [];
  function attrMini(p) {
    const ks = atKeys(p); if (!ks.length) return '';
    return `<span class="attrs" data-tip="${esc(ks.map(k => E.ATTR_NAME[k] + ' ' + p.at[k]).join(' · ') + (p.atEst ? ' (estimado)' : ''))}">${ks.map(k => `<i>${E.ATTR_SHORT[k]}</i>${p.at[k]}`).join(' ')}</span>`;
  }
  function attrBars(p) {
    const ks = atKeys(p); if (!ks.length) return '';
    const fam = E.FAM[p.pos]; const pool = E.POOL[fam] || [];
    const bars = ks.map(k => `<div class="ab"><span>${E.ATTR_NAME[k]}${hint(E.ATTR_TIP[k])}</span><span class="bar"><i style="width:${Math.max(4, Math.min(100, (p.at[k] - 30) / 65 * 100))}%"></i></span><b class="num">${p.at[k]}</b></div>`).join('');
    const others = pool.filter(k => !ks.includes(k)).map(k => E.ATTR_NAME[k]).join(', ');
    return `<div class="attr-bars">${bars}</div><p class="tiny muted" style="margin:6px 0 0">${p.atEst ? 'Atributos estimados pelo jogo (sem estatística suficiente de 2026).' : 'Pontos fortes tirados das estatísticas reais de 2026 (SofaScore), comparando com quem joga na mesma posição e na mesma série.'} Outros atributos de ${E.FAM_NAME[fam].toLowerCase()}: ${others}.</p>`;
  }
  // nome da tabela pela chave
  function keyName(key) {
    if (!key) return '';
    if (key === 'A' || key === 'B') return DIVN[key];
    if (key === 'C') return 'Série C · 1ª fase';
    if (key === 'CQA' || key === 'CQB') return 'Série C · quadrangular ' + key.slice(2);
    if (/^D\d+$/.test(key)) return 'Série D · grupo ' + key.slice(1);
    const e = S.comp.est[key]; return e ? e.name : key;
  }
  // zonas da tabela: classificação (verde/azul) e queda (vermelho)
  function zoneOf(key, pos, n) {
    if (key === 'A') return pos <= 6 ? 'g4' : pos <= 13 ? 'sula' : pos >= n - 3 ? 'z4' : '';
    if (/^L[A-H]$/.test(key)) return pos <= 2 ? 'up' : pos === 3 ? 'sula' : '';
    if (/^S[A-H]$/.test(key)) return pos === 1 ? 'up' : pos === 2 ? 'sula' : '';
    if (key === 'B') return pos <= 4 ? 'up' : pos >= n - 3 ? 'z4' : '';
    if (key === 'C') return pos <= 8 ? 'up' : pos >= n - 3 ? 'z4' : '';
    if (key === 'CQA' || key === 'CQB') return pos <= 2 ? 'up' : '';
    if (/^D\d+$/.test(key)) return pos <= 4 ? 'up' : '';
    return pos <= 2 ? 'up' : '';
  }
  function legendOf(key) {
    if (key === 'A') return '<span><b style="color:var(--ima)">1º a 6º</b>: Libertadores</span><span><b style="color:var(--ambar)">7º a 13º</b>: Sul-Americana</span><span><b style="color:var(--cartao)">17º a 20º</b>: caem para a Série B</span>';
    if (/^L[A-H]$/.test(key)) return '<span><b style="color:var(--verde)">1º e 2º</b>: oitavas de final</span><span><b style="color:var(--ambar)">3º</b>: playoff da Sul-Americana</span>';
    if (/^S[A-H]$/.test(key)) return '<span><b style="color:var(--verde)">1º</b>: oitavas de final</span><span><b style="color:var(--ambar)">2º</b>: playoff contra um 3º da Libertadores</span>';
    if (key === 'B') return '<span><b style="color:var(--verde)">1º a 4º</b>: sobem para a Série A</span><span><b style="color:var(--cartao)">17º a 20º</b>: caem para a Série C</span>';
    if (key === 'C') return '<span><b style="color:var(--verde)">1º a 8º</b>: quadrangulares do acesso</span><span><b style="color:var(--cartao)">17º a 20º</b>: caem para a Série D</span>';
    if (key === 'CQA' || key === 'CQB') return '<span><b style="color:var(--verde)">1º e 2º</b>: sobem para a Série B; o 1º vai à final</span>';
    if (/^D\d+$/.test(key)) return '<span><b style="color:var(--verde)">1º a 4º</b>: vão ao mata-mata; os 4 semifinalistas sobem para a Série C</span>';
    return '<span><b style="color:var(--verde)">1º e 2º</b>: decidem o título em jogo único, na casa do 1º</span>';
  }
  function tableCard(key, title, opts = {}) {
    const t = G.sortedTable(S, key); if (!t.length) return '';
    const n = t.length;
    const rows = t.map(r => `<tr class="${r.id === me() ? 'me' : ''} ${zoneOf(key, r.pos, n)}"><td class="pos">${r.pos}</td><td><span class="cl">${badge(r.id, 'sm')}${esc(club(r.id).name)}</span></td><td class="pts">${r.p}</td><td>${r.j}</td><td class="hide-sm">${r.v}</td><td class="hide-sm">${r.e}</td><td class="hide-sm">${r.d}</td><td>${r.gp - r.gc > 0 ? '+' : ''}${r.gp - r.gc}</td><td class="hide-sm"><span class="form">${r.form.map(f => `<i class="${f}" title="${f}"></i>`).join('')}</span></td></tr>`).join('');
    return `<section class="card"><div class="head"><h2>${esc(title || keyName(key))}${opts.tip === false ? '' : hint('P pontos, J jogos, V vitórias, E empates, D derrotas, SG saldo de gols. Desempate: vitórias, saldo e gols marcados. Forma: últimos resultados.')}</h2>${opts.right || ''}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th class="hide-sm">V</th><th class="hide-sm">E</th><th class="hide-sm">D</th><th>SG</th><th class="hide-sm">Forma</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row tiny muted" style="margin-top:10px">${legendOf(key)}</div></section>`;
  }
  // confronto de mata-mata (a = mandante da ida)
  function tieRow(t, mine) {
    const leg = i => t.g[i] ? `${t.g[i][0]}-${t.g[i][1]}` : '–';
    const legs = t.legs === 2 ? `${leg(0)} · ${leg(1)}` : leg(0);
    const w = id => t.w === id ? 'win' : t.w ? 'lose' : '';
    return `<div class="tie ${mine ? 'mine' : ''}"><span class="side ${w(t.a)}">${esc(club(t.a).name)} ${badge(t.a, 'sm')}</span><span class="sc num">${legs}${t.pen ? `<small>pên. ${t.pen[0]}-${t.pen[1]}</small>` : ''}</span><span class="side r ${w(t.b)}">${badge(t.b, 'sm')} ${esc(club(t.b).name)}</span></div>`;
  }
  function tiesCard(title, ties, opts = {}) {
    if (!ties || !ties.length) return '';
    const mine = ties.filter(t => t.a === me() || t.b === me()), rest = ties.filter(t => t.a !== me() && t.b !== me());
    const big = ties.length > 8;
    return `<section class="card"><div class="head"><h2>${esc(title)}</h2><span class="small muted">${ties.length} ${plural(ties.length, 'confronto', 'confrontos')}${opts.note ? ' · ' + opts.note : ''}</span></div>
      ${mine.map(t => tieRow(t, true)).join('')}
      ${big ? `<details class="more"><summary>Ver ${rest.length} ${plural(rest.length, 'confronto', 'confrontos')}</summary>${rest.map(t => tieRow(t)).join('')}</details>` : rest.map(t => tieRow(t)).join('')}</section>`;
  }
  // resultados da última semana e jogos da semana atual, filtrados
  function gamesCard(title, list, isResult) {
    if (!list.length) return '';
    return `<section class="card"><div class="head"><h2>${esc(title)}</h2></div>${list.map(g => `<div class="row between nowrap small game ${g.h === me() || g.a === me() ? 'mine' : ''}"><span class="cl row nowrap" style="gap:6px;flex:1;justify-content:flex-end;min-width:0">${esc(club(g.h).name)} ${badge(g.h, 'sm')}</span><b class="disp num" style="font-size:${isResult ? 20 : 16}px;min-width:56px;text-align:center">${isResult ? `${g.gh} × ${g.ga}` : '×'}</b><span class="row nowrap" style="gap:6px;flex:1;min-width:0">${badge(g.a, 'sm')} ${esc(club(g.a).name)}</span></div>`).join('')}</section>`;
  }

  // ---------- textos de ajuda usados em mais de um lugar ----------
  const FORCA_TIP = 'Média das 11 maiores notas do elenco, sem contar lesionados. Não considera posição nem cansaço; a partida considera.';
  const SECTOR_TIP = { Defesa: 'Força da defesa com os titulares atuais, já com moral e estilo do técnico. Segura as chances do rival.', Meio: 'Força do meio-campo com os titulares atuais. Decide quem fica mais com a bola.', Ataque: 'Força do ataque com os titulares atuais. Pesa na qualidade das chances criadas.' };
  const OBJ_TIP = 'Metas deste jogo. Cada uma cumprida vale 20 XP e um bônus em dinheiro. O resultado também dá XP: vitória 30, empate 12, derrota 5.';
  const CONF_TIP = 'Paciência da diretoria, de 0 a 100. Cada jogo mexe nela. A partir do 10º jogo da liga, abaixo de 15 por 3 jogos da liga seguidos e mais de 2 posições abaixo da meta: demissão.';
  const MORAL_TIP = 'Humor do elenco. Acima de 50, os jogadores rendem mais; abaixo, rendem menos. Sobe com vitórias e cai com derrotas.';
  const XP_TIP = 'Nível do técnico. O XP vem de resultados, objetivos dos jogos, conquistas, títulos, acesso e do fim de temporada. Cada nível libera formações e recursos.';
  const JANELA_TIP = 'Janela de transferências: semanas 1 a 14 e 31 a 38. Fora dela dá para olhar e negociar, mas nada fecha.';
  const FOLHA_TIP = 'Limite de salários por semana que a diretoria aceita. Sobe 25% com o acesso. Cumprir a meta da temporada aumenta o teto em 8%.';
  const TABELA_TIP = 'Sua liga. Verde ou azul: zona de classificação ou acesso. Vermelho: zona de rebaixamento. Entre as séries, 4 sobem e 4 descem por temporada.';
  const SPONS_TIP = 'Contrato longo: 3 temporadas, luvas na assinatura e valor fixo. Valor alto: 1 temporada pagando mais; a renovação acompanha a campanha. Bônus por vitória: fixo menor e extra a cada vitória. Bônus por título: extra se ganhar a sua série ou a Copa do Brasil, só para favoritos.';
  const MATCH_TIP = { 'Posse': 'Tempo com a bola de cada time.', 'Finalizações': 'Chutes a gol de cada time.', 'Gols esperados': 'Soma da qualidade das chances criadas. Mostra quem mereceu mais, mesmo sem gol.' };

  // ---------- central ----------
  function postureLine() {
    const cur = S.lineup.ment || 'equilibrada'; const sug = G.suggestMent(S);
    return `<div class="scout row between nowrap" style="gap:10px"><span>Postura${hint('Como o time começa o jogo. Dá para mudar no intervalo e nos momentos-chave da partida.')}: <b>${E.MENT[cur].label}</b>${sug !== cur ? ` <span style="opacity:.85">· auxiliar sugere ${E.MENT[sug].label.toLowerCase()}</span>` : ' <span style="opacity:.85">· igual à sugestão do auxiliar</span>'}</span>${sug !== cur ? `<button class="btn" style="min-height:36px;padding:4px 12px;background:#fff;color:#10201A;border-color:#fff" data-act="useSug" data-v="${sug}" ${tipA('Troca a postura inicial pela sugerida pelo auxiliar.')}>Usar</button>` : ''}</div>`;
  }
  function tiredLine() {
    const tired = S.lineup.slots.map(id => S.players[id]).filter(p => p && p.club === me() && p.cond < 70);
    if (tired.length < 2) return '';
    return `<div class="scout row between nowrap" style="gap:10px"><span><b>${tired.length} titulares cansados.</b> ${S.coach.assist !== false ? 'O auxiliar poupa quem estiver esgotado.' : 'O auxiliar está desligado.'}</span><button class="btn" style="min-height:36px;padding:4px 12px;background:#fff;color:#10201A;border-color:#fff" data-act="auto" ${tipA('Escala os melhores desta formação já descontando o cansaço: quem está esgotado vai para o banco.')}>Rodar elenco</button></div>`;
  }

  // ---------- vida do técnico: coletivas, eventos, promessas e formação (fase 3) ----------
  const IC_MIC = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6"/></svg>';
  const IC_BOLT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>';
  function pressCard() {
    const pz = S.life && S.life.presser; if (!pz || pz.week !== S.round) return '';
    return `<section class="card press" id="press"><div class="head"><h2><span class="inf-ic">${IC_MIC}</span>Coletiva de imprensa${hint('Uma pergunta por semana, no máximo. Cada resposta tem efeito imediato; algumas viram promessa que a diretoria e o elenco cobram depois. Se não responder, a assessoria dá uma resposta neutra.')}</h2></div>
      <p class="quote">“${esc(pz.q)}”</p>
      <div class="stack" style="gap:8px">${pz.opts.map((o, i) => `<button class="opt" data-act="press" data-i="${i}"><b>${esc(o.l)}</b>${o.effTxt ? `<span class="small muted">Agora: ${esc(o.effTxt)}.</span>` : ''}${o.promTxt ? `<span class="small">${esc(o.promTxt)}</span>` : ''}</button>`).join('')}</div></section>`;
  }
  function eventCard() {
    const ev = S.life && S.life.event; if (!ev || ev.week !== S.round) return '';
    return `<section class="card press" id="evento"><div class="head"><h2><span class="inf-ic gold">${IC_BOLT}</span>${esc(ev.title)}${hint('Acontecimento da semana. Cada escolha mostra o efeito antes. Se não decidir até o fim da semana, nada muda.')}</h2></div>
      <p class="small" style="margin:0 0 10px">${esc(ev.txt)}</p>
      <div class="stack" style="gap:8px">${ev.opts.map((o, i) => `<button class="opt" data-act="evento" data-i="${i}"><b>${esc(o.l)}</b><span class="small muted">${esc(o.effTxt)}</span></button>`).join('')}</div></section>`;
  }
  function promiseLine(pr) {
    const st = pr.kind === 'win' ? 'no jogo desta semana' : pr.kind === 'unbeaten' ? `faltam ${pr.left} ${plural(pr.left, 'jogo', 'jogos')}` : pr.kind === 'youth' || pr.kind === 'starter' ? `${pr.got} de ${pr.need} · restam ${pr.games} ${plural(pr.games, 'jogo', 'jogos')}` : pr.kind === 'sign' ? `até a semana ${S.round <= 14 ? 14 : 38}` : 'no fim da temporada';
    return `<li><b>${esc(pr.txt.charAt(0).toUpperCase() + pr.txt.slice(1))}</b><span class="tiny muted">${st}</span></li>`;
  }
  function promisesCard() {
    const ps = (S.life && S.life.promises) || []; if (!ps.length) return '';
    return `<section class="card"><div class="head"><h2>Promessas${hint('O que você prometeu na coletiva ou a jogadores. Cumprida, rende confiança, moral ou XP; quebrada, custa.')}</h2><span class="tag gold">${ps.length}</span></div><ul class="proms">${ps.map(promiseLine).join('')}</ul></section>`;
  }
  function formacaoCard() {
    const c = S.coach; const lic = G.LIC[c.lic || 'B']; const sd = c.study; const pv = c.provisional;
    const opts = G.studyOptions(S);
    const row = o => `<div class="pr-row"><span><b>${esc(o.name)}</b><span class="tiny muted">${esc(o.txt)}${o.kind === 'curso' ? ' Curso do jogo.' : ''}</span></span><span>${o.done ? '<span class="tag good">Concluído</span>' : sd && sd.k === o.k ? `<span class="tag blue">Estudando · ${sd.left} sem.</span>` : `<button class="btn ${o.locked || sd ? '' : 'primary'}" data-act="study" data-k="${o.k}" ${o.locked || sd ? 'aria-disabled="true"' : ''} ${tipA(o.locked ? `Precisa da ${o.req} antes.` : sd ? 'Um curso por vez.' : `O clube paga ${fmt(o.price)}. Enquanto estuda, seus jogadores recuperam 2 a menos de condição por semana.`)}>${o.weeks} sem. · ${fmt(o.price)}</button>`}</span></div>`;
    return `<section class="card"><div class="head"><h2>Formação do técnico${hint('Licenças reais da CBF Academy (cargas e preços de 2025). A Pró é exigida na Série A e nos torneios da Conmebol; sem ela, a CBF dá licença provisória até o fim da temporada. Cursos livres são do jogo. Um curso por vez.')}</h2><span class="tag ${c.lic === 'PRO' ? 'good' : 'blue'}">${esc(lic.name)}</span></div>
      ${pv ? `<div class="notice warn small" style="margin-bottom:10px"><b>Licença provisória:</b> conclua a ${esc(G.LIC[pv.need].name)} até o fim de ${pv.year}, ou a confiança cai 10.</div>` : ''}
      ${sd ? `<div class="build"><div class="row between small"><b>Estudando: ${esc(sd.name)}</b><span class="muted">faltam ${sd.left} de ${sd.total} semanas</span></div><div class="bar"><i style="width:${Math.round((sd.total - sd.left) / sd.total * 100)}%"></i></div></div>` : ''}
      <div class="eyebrow" style="margin-top:6px">Licenças CBF</div><div class="pr">${opts.filter(o => o.kind === 'lic').map(row).join('')}</div>
      <div class="eyebrow" style="margin-top:12px">Cursos livres</div><div class="pr">${opts.filter(o => o.kind === 'curso').map(row).join('')}</div>
      <p class="tiny muted" style="margin:8px 0 0">Fontes: preços e horas da CBF Academy (Trivela, 2025); exigência da Pró na Série A anunciada pela CBF em 2021.</p></section>`;
  }

  function vCentral() {
    if (S.fired) return vFired();
    const cols = [];
    // coluna 1: proximo jogo + objetivos
    let c1 = '';
    const pend = G.sponsorPending(S);
    if (S.seasonOver) c1 += seasonCard();
    else {
      if (pend) c1 += sponsorCard();
      const fx = G.userFixture(S);
      if (fx) {
        const ms = G.strength(S, me()), os = G.strength(S, fx.opp);
        const leftIsMe = fx.mt.h === me(); const pct = Math.max(15, Math.min(85, 50 + (ms - os) * 4));
        const lvl = S.coach.level; const oc = club(fx.opp);
        const exp = E.aiMentality(os - ms, !fx.home);
        const scout = lvl >= 2 ? `<div class="scout"><b>Análise do rival:</b> ${oc.formation}, deve vir ${E.MENT[exp].label.toLowerCase()}.</div>` : `<div class="scout">Análise do rival libera no nível 2.</div>`;
        const issues = S.lineup.slots.map(id => S.players[id]).filter(p => !p || p.club !== me() || p.inj > 0 || p.sus > 0).length;
        const first = S.round === 0 && S.year === 2026 && !S.tipSeen;
        let tieInfo = '';
        if (fx.mt.tie && fx.mt.leg === 2) { const t = T.tieRef(S.comp, fx.mt.tie); if (t && t.g[0]) { const mine = t.a === me() ? t.g[0][0] : t.g[0][1], their = t.a === me() ? t.g[0][1] : t.g[0][0]; tieInfo = `<div class="scout"><b>Jogo de ida:</b> ${club(me()).name} ${mine} × ${their} ${club(fx.opp).name}. ${mine > their ? 'Empate classifica.' : mine < their ? `Precisa vencer por ${their - mine + 1} gols ou por ${their - mine} para levar aos pênaltis.` : 'Quem vencer passa; empate vai para os pênaltis.'}</div>`; } }
        else if (fx.mt.tie && (fx.mt.comp === 'CDB' || fx.mt.comp === 'EST' || fx.mt.leg === 1 && T.tieRef(S.comp, fx.mt.tie) && T.tieRef(S.comp, fx.mt.tie).legs === 1)) tieInfo = `<div class="scout">Jogo único${fx.neutral ? ' em campo neutro' : ''}: empate vai para os pênaltis.</div>`;
        const hAlt = club(fx.h).alt || 0, aAlt = club(fx.a).alt || 0;
        if (!fx.neutral && hAlt >= 2500 && aAlt < 2000) tieInfo += `<div class="scout"><b>Altitude:</b> ${esc(club(fx.h).city)} fica a cerca de ${hAlt.toLocaleString('pt-BR')} m. ${fx.isHome ? 'Vantagem extra para o seu time em casa.' : 'O mandante cria mais chances; poupar fôlego e jogar compacto ajuda.'}</div>`;
        c1 += `<section class="hero" aria-label="Próximo jogo"><div class="inner">
          <div class="row between"><span class="eyebrow">${esc(fx.label)} · ${S.year}</span><span class="tag" style="background:rgba(0,0,0,.3);color:#fff">${fx.neutral ? 'Campo neutro' : fx.isHome ? 'Em casa' : 'Fora de casa'}</span></div>
          <div class="vs"><div class="t">${badge(fx.h, 'lg')}<b>${esc(club(fx.h).name)}</b></div><div class="x">×</div><div class="t">${badge(fx.a, 'lg')}<b>${esc(club(fx.a).name)}</b></div></div>
          <div><div class="eyebrow" style="margin-bottom:4px">Força dos titulares${hint(FORCA_TIP)}</div><div class="forca"><span>${Math.round(leftIsMe ? ms : os)}</span><span class="track"><i style="width:${leftIsMe ? pct : 100 - pct}%"></i><em style="flex:1"></em></span><span>${Math.round(leftIsMe ? os : ms)}</span></div></div>
          ${tieInfo}
          ${fx.isHome && !fx.neutral ? (() => { const cw = G.crowd(S, me(), fx.mt); return `<div class="scout"><b>Público esperado:</b> ${cw.att.toLocaleString('pt-BR')} (${Math.round(cw.fill * 100)}%) com ingresso a R$ ${cw.price}. Pressão da torcida ${cw.fill >= 0.6 ? '+' : '−'}${dec(Math.abs(6 * (cw.fill - 0.6)))}% de chances.</div>`; })() : ''}
          ${scout}
          ${postureLine()}
          ${tiredLine()}
          ${S.lineupFrom ? `<div class="scout"><b>Time:</b> ${G.PRESETS[S.lineupFrom]}${(S.presetFor || {})[G.compKind(fx.mt.comp)] === S.lineupFrom ? ` (automático no ${G.PRESET_COMP[G.compKind(fx.mt.comp)] || 'torneio'})` : ''}.</div>` : ''}
          ${issues ? `<div class="scout"><b>${issues} ${plural(issues, 'titular fora', 'titulares fora')}</b> (lesão, suspensão ou venda): o auxiliar escala substituto se você não mexer.</div>` : ''}
          ${pend ? `<button class="btn gold big block" data-act="play" aria-disabled="true" style="opacity:.6" ${tipA('Assine uma das propostas de patrocínio acima para liberar o jogo.')}>Assine um patrocínio para jogar</button>` : `<div class="${first ? 'coachmark' : ''}">${first ? '<div class="tip">Seu time já está escalado. No intervalo, o jogo para e você escolhe a postura.</div>' : ''}<button class="btn gold big block" data-act="play" ${tipA('Começa a partida. O jogo para no intervalo, em gol sofrido, na reta final e em lesão para você decidir.')}>Jogar</button></div>`}
          <button class="btn block" style="background:rgba(0,0,0,.25);border-color:transparent;color:#fff" data-act="go" data-v="elenco" ${tipA('Abre o Elenco para mexer em formação, titulares, banco e postura.')}>Ajustar escalação</button>
        </div></section>`;
        c1 += pressCard() + eventCard();
        c1 += `<section class="card"><div class="head"><h2>Objetivos do jogo${hint(OBJ_TIP)}</h2><span class="xp">+${S.objectives.length * 20} XP</span></div>
          ${S.objectives.map(o => `<div class="obj"><span class="box"></span><span class="t">${esc(o.txt)}</span><span class="xp">+${o.xp}</span></div>`).join('')}
          <p class="tiny muted" style="margin:8px 0 0">Cada objetivo cumprido também paga um bônus em dinheiro.</p></section>`;
      } else {
        const nx = G.nextUserWeek(S, S.round + 1);
        c1 += `<section class="hero" aria-label="Semana sem jogo"><div class="inner">
          <div class="row between"><span class="eyebrow">Semana ${T.weekNo(S.round)} de ${G.SEASON_WEEKS}${G.isMid(S.round) ? ' · meio de semana' : ''} · ${S.year}</span><span class="tag" style="background:rgba(0,0,0,.3);color:#fff">Sem jogo</span></div>
          <p style="margin:6px 0 0;font-size:17px">${esc(club(me()).name)} não joga nesta semana.</p>
          ${nx ? `<div class="scout"><b>Próximo jogo:</b> ${esc(nx.fx.label)}, ${nx.fx.neutral ? 'em campo neutro' : nx.fx.isHome ? 'em casa' : 'fora'}, contra o ${esc(club(nx.fx.opp).name)}, na semana ${T.weekNo(nx.w)}${G.isMid(nx.w) ? ', no meio de semana' : ''}.</div>` : `<div class="scout">Seu time não tem mais jogos nesta temporada. Os outros campeonatos seguem até a semana ${G.SEASON_WEEKS}.</div>`}
          <button class="btn gold big block" data-act="skipWeek" ${pend ? 'aria-disabled="true" style="opacity:.6"' : ''} ${tipA('Joga a semana dos outros clubes. Salários, cota de TV e patrocínio entram normalmente.')}>Avançar uma semana</button>
          ${nx && nx.w > S.round + 1 ? `<button class="btn block" style="background:rgba(0,0,0,.25);border-color:transparent;color:#fff" data-act="skipTo" ${tipA('Simula todas as semanas até o próximo jogo do seu time.')}>Avançar até o próximo jogo (${nx.w - S.round} semanas)</button>` : ''}
          ${!nx ? `<button class="btn block" style="background:rgba(0,0,0,.25);border-color:transparent;color:#fff" data-act="skipTo" ${tipA('Simula as semanas restantes e mostra o fim da temporada.')}>Simular até o fim da temporada</button>` : ''}
        </div></section>`;
        c1 += eventCard();
      }
    }
    cols.push(`<div class="stack">${c1}</div>`);
    // coluna 2: medidores, nivel, mercado
    const c = club(me()); const wb = G.wageBill(S, me());
    const conf = Math.round(S.board.conf);
    let c2 = `<section class="card"><div class="head"><h2>Seu momento</h2><button class="btn ghost" data-act="go" data-v="clube" ${tipA('Abre a página do Clube com as regras da diretoria e as finanças.')}>Detalhes</button></div>
      <div class="meters">
        <div class="meter ${conf < 30 ? 'warn' : ''}" ${tipA(CONF_TIP)}><div class="lbl">Confiança</div><div class="v num">${conf}</div><div class="bar"><i style="width:${conf}%"></i></div></div>
        <div class="meter" ${tipA('Dinheiro em mãos. Embaixo, quanto a folha salarial custa por semana.')}><div class="lbl">Caixa</div><div class="v num money ${c.cash < 0 ? 'neg-c' : ''}">${money(c.cash)}</div><div class="tiny muted">folha ${fmt(wb)}/sem.</div></div>
        <div class="meter" ${tipA(MORAL_TIP)}><div class="lbl">Moral</div><div class="v num">${Math.round(S.morale)}</div><div class="bar"><i style="width:${S.morale}%"></i></div></div>
      </div>
      <p class="small" style="margin:12px 0 0"><b>Meta:</b> ${S.board.target.label}. Hoje: ${G.position(S)}º ${club(me()).div === 'D' ? 'no grupo' : 'na ' + DIVN[club(me()).div]}.</p></section>`;
    c2 += promisesCard();
    c2 += levelCard();
    const w = G.windowInfo(S.round);
    const offers = S.market.offers.length;
    const a = S.market.auction && S.market.auction.status === 'open' ? S.market.auction : null;
    c2 += `<section class="card"><div class="head"><h2>Mercado${hint(JANELA_TIP)}</h2><span class="tag ${w.open ? 'good' : ''}">${w.open ? `Janela aberta · fecha em ${w.closesIn} ${plural(w.closesIn, 'semana', 'semanas')}` : w.opensIn ? `Abre em ${w.opensIn} ${plural(w.opensIn, 'semana', 'semanas')}` : 'Fechada até ' + (S.year + 1)}</span></div>
      ${a ? `<div class="notice warn row between"><span><b>Leilão relâmpago:</b> ${esc(S.players[a.pid].n)} (${posLbl(S.players[a.pid].pos)}, ${S.players[a.pid].ovr})</span><button class="btn gold" data-act="goAuction">Ver leilão</button></div>` : ''}
      ${offers ? `<div class="notice info row between" style="margin-top:8px"><span><b>${offers} ${plural(offers, 'proposta', 'propostas')}</b> por jogadores seus</span><button class="btn" data-act="goSell">Responder</button></div>` : ''}
      ${!a && !offers ? `<p class="small muted" style="margin:0">${w.open ? 'Procure reforços ou coloque jogadores à venda para receber propostas.' : 'Fora da janela você pode olhar o mercado, mas nada fecha.'}</p>` : ''}</section>`;
    c2 += centralClubCard();
    cols.push(`<div class="stack">${c2}</div>`);
    // coluna 3: tabela e noticias
    cols.push(`<div class="stack">${miniTable()}<section class="card"><div class="head"><h2>Notícias${hint('O que aconteceu no campeonato e no seu clube: resultados, transferências, evoluções e contratos.')}</h2></div><ul class="news">${S.news.slice(0, 7).map(n => `<li><span class="r">${n.r > G.WEEKS ? 'Fim' : 'S' + T.weekNo(n.r - 1)}</span>${esc(n.txt)}</li>`).join('')}</ul></section></div>`);
    return `<div class="grid g-hub">${cols.join('')}</div>`;
  }

  function levelCard() {
    const lv = S.coach.level, xp = S.coach.xp; const cur = G.LEVELS[lv - 1] || 0, nxt = G.LEVELS[lv] || cur + 1000;
    const pct = Math.min(100, (xp - cur) / (nxt - cur) * 100);
    const nextUnl = Object.entries(G.UNLOCKS).find(([l]) => +l > lv);
    return `<section class="card"><div class="lvl"><button class="av-lvl" data-act="editAvatar" aria-label="Editar visual do técnico" ${tipA('Editar o visual do técnico. O número é o seu nível.')}>${avatarSVG(S.coach.avatar, me(), 56)}<span class="n-badge">${lv}</span></button><div style="flex:1;min-width:0"><div class="row between"><b>${G.LEVEL_TITLES[lv - 1]}${hint(XP_TIP)}</b><span class="small muted num">${xp - cur} / ${nxt - cur} XP</span></div><div class="xpbar" style="margin-top:6px"><i style="width:${pct}%"></i></div>
      <div class="tiny muted" style="margin-top:6px">${nextUnl ? `Nível ${nextUnl[0]} libera: ${nextUnl[1].join(', ')}` : 'Todas as formações liberadas'}</div></div></div></section>`;
  }

  function miniTable() {
    const key = G.leagueKey(S); const t = G.sortedTable(S, key); if (!t.length) return '';
    const n = t.length; const myPos = (t.find(r => r.id === me()) || {}).pos || 1;
    const show = n <= 8 ? null : new Set([1, 2, 3, 4, myPos - 1, myPos, myPos + 1].filter(x => x >= 1 && x <= n));
    let prev = 0;
    const rows = t.filter(r => !show || show.has(r.pos)).map(r => { const gap = r.pos - prev > 1 ? `<tr><td colspan="4" class="muted" style="text-align:center;padding:2px">···</td></tr>` : ''; prev = r.pos; return gap + `<tr class="${r.id === me() ? 'me' : ''} ${zoneOf(key, r.pos, n)}"><td class="pos">${r.pos}</td><td><span class="cl">${badge(r.id, 'sm')}${esc(club(r.id).name)}</span></td><td>${r.j}</td><td class="pts">${r.p}</td></tr>`; }).join('');
    return `<section class="card"><div class="head"><h2>${esc(keyName(key))}${hint(TABELA_TIP)}</h2><button class="btn ghost" data-act="go" data-v="tabela" ${tipA('Abre as tabelas completas, o estadual e a Copa do Brasil.')}>Completa</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Clube</th><th>J</th><th>P</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function seasonCard() {
    const h = S.history[S.history.length - 1];
    if (!h) return '';
    const nextDiv = h.promo === 'up' ? { B: 'A', C: 'B', D: 'C' }[h.div] : h.promo === 'down' ? { A: 'B', B: 'C', C: 'D' }[h.div] : h.div;
    const champ = id => id ? `${badge(id, 'sm')} <span>${esc(club(id).name)}</span>` : '<span class="muted">–</span>';
    const cupTxt = h.cup ? (h.cup.champion ? '<b>Campeão!</b>' : `Parou ${T.inPhase(h.cup.name)}`) : 'Não disputou';
    const contTxt = h.cont ? (h.cont.champion ? `<b>Campeão da ${esc(h.cont.cup)}!</b>` : `${esc(h.cont.cup)}: parou ${T.inPhase(h.cont.name)}`) : '';
    const estTxt = h.est ? (h.est.won ? `<b>Campeão ${esc(h.est.name)}!</b>` : `${esc(h.est.name)}: campeão ${h.est.champ ? esc(club(h.est.champ).name) : '–'}`) : '–';
    return `<section class="card stack reveal">
      <div class="eyebrow">Temporada ${h.year} encerrada</div>
      <div class="row">${badge(me(), 'lg')}<div><div class="disp" style="font-size:56px;font-weight:900;line-height:1">${h.pos}º</div><div class="muted">${h.div === 'D' ? 'no grupo da Série D' : 'na ' + esc(h.league)} · ${h.points} pontos</div></div></div>
      ${h.promo === 'up' ? `<div class="notice good"><b>Acesso!</b> Em ${h.year + 1} o ${esc(club(me()).name)} joga a ${DIVN[nextDiv]}.</div>` : h.promo === 'down' ? `<div class="notice bad"><b>Rebaixado.</b> Em ${h.year + 1} o ${esc(club(me()).name)} joga a ${DIVN[nextDiv]}.</div>` : ''}
      <div class="notice ${h.met ? 'good' : 'bad'}"><b>${h.met ? 'Meta cumprida' : 'Meta não cumprida'}:</b> ${esc(h.target.label)}.${h.met ? ' A diretoria aumentou o teto da folha em 8%.' : ''}</div>
      <div class="fin small"><span>Copa do Brasil</span><b>${cupTxt}</b>${h.cont ? `<span>${esc(h.cont.cup)}</span><b>${contTxt}</b>` : ''}<span>Estadual</span><b>${estTxt}</b></div>
      ${h.contNext && (h.contNext.L || h.contNext.S) ? `<div class="notice good small"><b>Vaga continental:</b> em ${h.year + 1} o ${esc(club(me()).name)} joga a fase de grupos da ${h.contNext.L ? 'Libertadores' : 'Sul-Americana'}.</div>` : ''}
      <div><div class="eyebrow">Campeões de ${h.year}</div><div class="champs">${[['Série A', h.champs.A], ['Série B', h.champs.B], ['Série C', h.champs.C], ['Série D', h.champs.D], ['Copa do Brasil', h.champs.CDB]].concat(h.champs.LIB ? [['Libertadores', h.champs.LIB], ['Sul-Americana', h.champs.SUL]] : []).map(([l, id]) => `<div><span class="muted">${l}</span>${champ(id)}</div>`).join('')}</div></div>
      <div><div class="eyebrow">Artilheiros da ${esc(h.league)}</div><ol class="small" style="margin:6px 0 0;padding-left:20px">${h.scorers.map(s => `<li>${esc(s.n)} (${esc(club(s.club).name)}): ${s.g} gols</li>`).join('')}</ol></div>
      <div class="small">Premiação: <b>${fmt(h.prize + (h.cupPrize || 0) + (h.contPrize || 0))}</b>${h.titleBonus ? ` · Bônus de título do patrocinador: <b>${fmt(h.titleBonus)}</b>` : ''} · XP da temporada: <b>+${h.xp}</b></div>
      ${G.sponsorPending(S) ? '<div class="notice info small">O contrato de patrocínio terminou. As novas propostas aparecem na Central quando a temporada começar.</div>' : ''}
      <button class="btn primary big block" data-act="nextSeason" ${tipA('Aplica acessos e rebaixamentos, envelhece o elenco e começa um novo ano com estaduais, Copa do Brasil e Brasileirão.')}>Começar temporada ${h.year + 1}${nextDiv !== h.div ? ' na ' + DIVN[nextDiv] : ''}</button>
    </section>`;
  }

  // ---------- patrocinio ----------
  // nome da empresa no nosso estilo (sem logo e sem as cores da marca); a faixa lateral usa a cor do setor, da nossa paleta
  const SECTOR = { 'Banco': 'ima', 'Banco digital': 'ima', 'Pagamentos': 'ima', 'Bebidas': 'cartao', 'Alimentos': 'ouro', 'Tecnologia': 'verde', 'Telefonia': 'verde', 'Varejo': 'ouro', 'Moda': 'cartao', 'Beleza': 'cartao', 'Limpeza': 'verde', 'Energia': 'ouro', 'Combustível': 'ouro', 'Aviação': 'ima', 'Saúde': 'verde', 'Aluguel de carros': 'verde', 'Automóveis': 'ima', 'Delivery': 'cartao' };
  function brandMark(b, sm) { return `<span class="brandmark ${sm ? 'sm' : ''}" style="--bs:var(--${SECTOR[b.cat] || 'ima'})"><b>${esc(b.name)}</b>${sm ? '' : `<span>${esc(b.cat)}</span>`}</span>`; }
  function seasonsLbl(r) { const s = Math.round(r / G.SEASON_WEEKS); return `${s} ${plural(s, 'temporada', 'temporadas')}`; }
  function sponsorCard() {
    const offers = S.sponsorOffers || []; const renew = (S.history || []).length > 0 || S.round > 0;
    const perf = G.sponsorPerf(S); const pp = Math.round((perf - 1) * 100);
    return `<section class="card spons" id="spons"><div class="head"><h2>Propostas de patrocínio${hint(SPONS_TIP)}</h2><span class="tag gold">Decisão pendente</span></div>
      <p class="small" style="margin:0 0 4px">${renew ? 'O contrato anterior acabou. ' : ''}Três marcas querem estampar a camisa do ${esc(club(me()).name)}. Escolha uma para começar a jogar.</p>
      ${renew && pp ? `<p class="tiny muted" style="margin:0 0 4px">A campanha ${pp > 0 ? 'valorizou' : 'desvalorizou'} as propostas em ${Math.abs(pp)}%.</p>` : ''}
      <div class="offers">${offers.map((o, i) => `<article class="offer">
        ${brandMark(o.brand)}
        <span class="tag ${o.kind === 'alto' ? 'gold' : o.kind === 'longo' ? 'blue' : o.kind === 'titulo' ? 'gold' : 'good'}">${o.label}</span>
        <div class="fin small">
          <span>Por semana</span><b class="num">${fmt(o.per)}</b>
          <span>Duração</span><b>${seasonsLbl(o.rounds)}</b>
          ${o.signing ? `<span>Luvas na assinatura${hint('Dinheiro pago de uma vez, assim que você assina.')}</span><b class="num pos-c">+${fmt(o.signing)}</b>` : ''}
          ${o.winBonus ? `<span>Por vitória</span><b class="num pos-c">+${fmt(o.winBonus)}</b>` : ''}
          ${o.titleBonus ? `<span>Se for campeão</span><b class="num pos-c">+${fmt(o.titleBonus)}</b>` : ''}
          <span class="tot">Garantido em ${seasonsLbl(o.rounds)}${hint('Valor por semana vezes a duração, mais as luvas. Bônus por vitória e por título vêm por cima e não estão somados.')}</span><b class="tot num">${fmt(o.total + (o.signing || 0))}</b>
        </div>
        <p class="tiny muted offer-txt">${esc(o.pitch)}</p>
        <button class="btn primary block" data-act="signSponsor" data-i="${i}">Assinar</button>
      </article>`).join('')}</div>
      <p class="tiny muted" style="margin:10px 0 0">A cota de TV continua entrando toda semana; o patrocínio vem por cima. Empresas citadas só pelo nome, sem logo e sem vínculo real com o jogo.</p></section>`;
  }
  function sponsorRows() {
    const sp = S.sponsor; if (!sp) return `<span>Patrocínio</span><b class="muted">sem contrato</b>`;
    return `<span>Patrocínio · ${esc(sp.brand.name)}</span><b class="num pos-c">+${fmt(sp.per)} por semana</b>${sp.winBonus ? `<span>Bônus por vitória</span><b class="num pos-c">+${fmt(sp.winBonus)}</b>` : ''}${sp.titleBonus ? `<span>Bônus por título</span><b class="num pos-c">+${fmt(sp.titleBonus)}</b>` : ''}<span>Contrato</span><b>${sp.left} ${plural(sp.left, 'semana restante', 'semanas restantes')}</b><span>Recebido até agora</span><b class="num">${fmt(sp.earned)}</b>`;
  }

  function vFired() {
    const offers = G.fireOffers(S);
    return `<section class="card stack" style="max-width:640px;margin:0 auto">
      <div class="eyebrow">Fim de linha</div><h2 style="font-size:40px">Você foi demitido</h2>
      <p>A confiança da diretoria ficou abaixo de 15 por 3 jogos da liga seguidos. Seu nível e suas conquistas continuam com você.</p>
      <div class="eyebrow">Propostas recebidas</div>
      ${offers.map(id => `<button class="club-card" data-act="takeJob" data-id="${id}">${badge(id)}<span><b>${esc(club(id).name)}</b><span class="small muted">${DIVN[club(id).div]} · força ${Math.round(G.strength(S, id))}</span></span></button>`).join('')}
    </section>`;
  }

  // ---------- elenco ----------
  function sectorsNow() { const xi = E.lineupFrom(me(), S.players, S.lineup).map(o => ({ ...o, p: o.p && o.p.club === me() && o.p.inj <= 0 && o.p.sus <= 0 ? o.p : null })); return E.sectors(xi.filter(o => o.p), { persona: S.coach.persona, morale: S.morale }); }
  // ---------- bola parada, capitão e times salvos (fase 4) ----------
  const TK = [['cap', 'Capitão', 'Liderança em campo: até +3 de moral durante o jogo, conforme nota e experiência, e 8% menos cartões. Se ele sair, a braçadeira passa para o mais experiente.'], ['pen', 'Pênaltis', 'Quem cobra os pênaltis. Pesa a Finalização (ou Chute de longe). A cobrança média converte cerca de 77%.'], ['fk', 'Faltas', 'Quem bate falta direta. Pesa o Chute de longe (ou Criação e Passe).'], ['ck', 'Escanteios', 'Quem cobra escanteio. Pesa o Cruzamento (ou Criação e Passe) e melhora as cabeçadas do time.']];
  function takersCard() {
    const lu = S.lineup; const tk = lu.takers || {};
    const xi = lu.slots.map(id => S.players[id]).filter(p => p && p.club === me() && p.inj <= 0 && p.sus <= 0);
    const rows = TK.map(([k, l, tip]) => {
      const pool = xi.filter(p => k === 'cap' || p.pos !== 'GK');
      const auto = E.bestTaker(pool, k); const val = p => k === 'cap' ? `+${dec(E.capBonus(p))}` : Math.round(E.TAKER[k](p));
      const opts = [`<option value="">Automático${auto ? ` (${esc(shortN(auto.n))}, ${val(auto)})` : ''}</option>`].concat(pool.slice().sort((a, b) => E.TAKER[k](b) - E.TAKER[k](a)).map(p => `<option value="${p.id}" ${tk[k] === p.id ? 'selected' : ''}>${esc(shortN(p.n))} · ${val(p)}</option>`)).join('');
      return `<label class="tk-row"><span>${l}${hint(tip)}</span><select class="txt" data-change="taker" data-k="${k}" aria-label="${l}">${opts}</select></label>`;
    }).join('');
    return `<section class="card"><div class="head"><h2>Bola parada e capitão${hint('Escolha quem cobra e quem usa a braçadeira entre os titulares. Automático escolhe o melhor em campo a cada lance. O número é o valor de cobrança (ou o bônus de liderança).')}</h2></div><div class="tk">${rows}</div></section>`;
  }
  function presetsCard() {
    const pr = S.presets || {}; const pf = S.presetFor || {};
    const rows = Object.entries(G.PRESETS).map(([k, l]) => { const p = pr[k]; return `<div class="pr-row"><span><b>${l}</b><span class="tiny muted">${p ? `${p.formation} · salvo em ${p.saved.replace('·', ', semana ').replace('S', '')}` : 'vazio'}</span></span><span class="row nowrap" style="gap:6px"><button class="btn" data-act="presetSave" data-k="${k}" ${tipA(`Guarda a escalação atual (formação, titulares, banco, postura e cobradores) como "${l}".`)}>Salvar atual</button><button class="btn ${p ? 'primary' : ''}" data-act="presetLoad" data-k="${k}" ${p ? '' : 'disabled'} ${tipA(`Troca a escalação atual pelo time "${l}". Quem saiu do clube é substituído pelo melhor da posição.`)}>Usar</button></span></div>`; }).join('');
    const auto = Object.entries(G.PRESET_COMP).map(([c, l]) => `<label class="tk-row"><span>${l}</span><select class="txt" data-change="presetFor" data-k="${c}" aria-label="Time automático no ${l}"><option value="">Não trocar</option>${Object.entries(G.PRESETS).map(([k, n]) => `<option value="${k}" ${pf[c] === k ? 'selected' : ''} ${pr[k] ? '' : 'disabled'}>${n}</option>`).join('')}</select></label>`).join('');
    return `<section class="card"><div class="head"><h2>Times salvos${hint('Guarde até 3 escalações e escolha qual entra sozinha em cada competição. Ex.: reservas no Estadual, titulares no Brasileiro.')}</h2>${S.lineupFrom ? `<span class="tag blue">Em uso: ${G.PRESETS[S.lineupFrom]}</span>` : ''}</div>
      <div class="pr">${rows}</div>
      <div class="eyebrow" style="margin-top:14px">Usar automaticamente${hint('No começo da semana de cada jogo, o time escolhido entra sozinho para aquela competição. Você ainda pode mexer antes de jogar.')}</div>
      <div class="tk" style="margin-top:6px">${auto}</div></section>`;
  }

  function vElenco() {
    const lu = S.lineup; const f = E.FORMATIONS[lu.formation]; const lv = S.coach.level;
    const forms = Object.entries(E.FORMATIONS).map(([k, v]) => v.lvl <= lv ? `<button class="chip" data-act="formation" data-v="${k}" aria-pressed="${lu.formation === k}" ${tipA(v.txt)}>${k}</button>` : `<button class="chip lock" disabled data-tip="Libera no nível ${v.lvl} do técnico." aria-label="${k}, libera no nível ${v.lvl}">${IC.lock} ${k} <span class="lk">nv ${v.lvl}</span></button>`).join('');
    const c = club(me());
    const mags = f.slots.map(([slot, x, y], i) => {
      const p = S.players[lu.slots[i]]; const ok = p && p.club === me();
      const off = ok && (p.inj > 0 || p.sus > 0);
      const left = x, top = 100 - y;
      if (!ok) return `<button class="mag empty" style="left:${left}%;top:${top}%" data-act="slot" data-i="${i}" aria-label="Escolher ${E.POS_NAME[slot]}"><span class="disc">+</span><span class="nm">${posLbl(slot)}</span></button>`;
      const imp = E.fitFactor(slot, p.pos) < 1;
      return `<button class="mag ${off ? 'off' : ''}" style="left:${left}%;top:${top}%;--c1:${c.c1};--c2:${c.c2};--cx:${txtOn(c.c1)}" data-act="slot" data-i="${i}" aria-label="${esc(p.n)}, ${E.POS_NAME[slot]}, nota ${p.ovr}"><span class="disc">${Math.round(p.ovr * E.fitFactor(slot, p.pos))}</span><span class="nm">${esc(shortN(p.n))}</span>${fadiga(p.cond)}${imp ? `<span class="slot">improvisado</span>` : ''}</button>`;
    }).join('');
    const bench = Array.from({ length: 9 }, (_, i) => { const p = S.players[(lu.bench || [])[i]]; return p && p.club === me() ? `<button class="chip" data-act="benchslot" data-i="${i}">${p.ovr} · ${esc(shortN(p.n))} <span class="muted">${posLbl(p.pos)}</span></button>` : `<button class="chip lock" data-act="benchslot" data-i="${i}">+ vaga</button>`; }).join('');
    const sec = sectorsNow();
    const ment = E.MENT[lu.ment || 'equilibrada'];
    const ruler = E.MENT_KEYS.map((k, i) => `<button data-act="ment" data-v="${k}" aria-pressed="${(lu.ment || 'equilibrada') === k}" aria-label="${E.MENT[k].label}" data-tip="${esc(E.MENT[k].label + ': ' + E.MENT[k].txt)}"><i class="rk" style="--h:${i + 1}"></i><span class="rl">${E.MENT[k].label.replace(' total', '')}</span></button>`).join('');
    const out = lu.slots.map(id => S.players[id]).filter(p => p && p.club === me() && (p.inj > 0 || p.sus > 0));
    return `<div class="lineup-layout">
      <div class="stack">
        <section class="card stack" style="gap:12px">
          <div class="head" style="margin:0"><h2>Escalação${hint('Clique num jogador no campo para trocar. O número no círculo é a nota já com o efeito da posição: fora dela, o jogador rende menos e aparece como improvisado.')}</h2><button class="btn" data-act="auto" ${tipA('Monta o time com os melhores para esta formação, descontando cansaço, lesão e suspensão.')}>Escalar os melhores</button></div>
          <div class="chips wrap" role="group" aria-label="Formação">${forms}</div>
          <p class="small muted" style="margin:0">${f.txt}</p>
        </section>
        <div class="pitch" aria-label="Campo">${'<div class="lines"></div><div class="box-top"></div><div class="box-bot"></div>'}${mags}</div>
        ${out.length ? `<div class="notice bad small">${out.map(p => `${esc(p.n)} ${p.inj > 0 ? `lesionado (${p.inj} ${plural(p.inj, 'semana', 'semanas')})` : 'suspenso'}`).join(' · ')}. Toque no ímã para trocar.</div>` : ''}
        <section class="card"><div class="head"><h2>Banco${hint('Até 9 reservas para as trocas durante o jogo (até 5 por partida). Clique numa vaga para escolher quem fica nela.')}</h2><span class="tiny muted">Entra primeiro quem está antes</span></div><div class="row" style="gap:8px">${bench}</div></section>
      </div>
      <div class="stack side">
        <section class="card stack" style="gap:10px">
          <div class="head" style="margin:0"><h2>Postura${hint('Como o time começa o jogo. Do lado seguro, menos gols a favor e contra. Do lado arriscado, mais chances para os dois times e mais cansaço. Passe o mouse em cada opção.')}</h2><span class="tag blue">${ment.label}</span></div>
          <div class="ruler" role="group" aria-label="Postura">${ruler}</div><div class="ruler-ends"><span>Segura</span><span>Arrisca</span></div>
          <p class="small" style="margin:0"><span class="ment-now only-sm">${ment.label}. </span>${ment.txt}</p>
          <div class="stats3">${[['Defesa', sec.def], ['Meio', sec.mid], ['Ataque', sec.att]].map(([l, v]) => `<div class="stat" ${tipA(SECTOR_TIP[l])}><div class="lbl">${l}</div><div class="disp" style="text-align:center;font-size:26px;font-weight:900">${Math.round(v)}</div></div>`).join('')}</div>
        </section>
        ${takersCard()}
        ${presetsCard()}
        <section class="card"><div class="head"><h2>Elenco${hint('Clique num jogador para ver números, valor e salário e para colocá-lo à venda. A barra ao lado é a condição física.')}</h2><span class="small muted">${myPlayers().length} jogadores</span></div>${squadList()}</section>
      </div>
    </div>`;
  }

  function squadList(selectable) {
    const groups = [['G', 'Goleiros'], ['D', 'Defensores'], ['M', 'Meio-campistas'], ['A', 'Atacantes']];
    const lu = S.lineup;
    return groups.map(([g, l]) => {
      const ps = myPlayers().filter(p => E.GROUP[p.pos] === g).sort((a, b) => b.ovr - a.ovr);
      return `<div class="eyebrow sector-h">${l}</div><div class="plist">${ps.map(p => {
        const st = p.inj > 0 ? `<span class="tag bad">Lesionado ${p.inj}r</span>` : p.sus > 0 ? '<span class="tag bad">Suspenso</span>' : lu.slots.includes(p.id) ? '<span class="tag blue">Titular</span>' : (lu.bench || []).includes(p.id) ? '<span class="tag">Banco</span>' : '';
        return `<button class="prow" data-act="player" data-pid="${p.id}">${ovr(p.ovr)}<span class="who"><b>${esc(p.n)}${p.youth ? ' <span class="tag">base</span>' : ''}</b><span>${posLbl(p.pos)} · ${p.age} anos${p.listed ? ' · <b>à venda</b>' : ''} ${attrMini(p)}</span></span><span class="end">${st}${fadiga(p.cond)}</span></button>`;
      }).join('')}</div>`;
    }).join('');
  }

  function sheetPick() {
    const sh = U.sheet; const lu = S.lineup;
    const isBench = sh.type === 'bench';
    const slot = isBench ? null : E.FORMATIONS[lu.formation].slots[sh.i][0];
    let ps = myPlayers();
    if (isBench) ps = ps.filter(p => !lu.slots.includes(p.id));
    const val = p => slot ? E.effRating(p, slot, {}) : p.ovr * (0.8 + 0.2 * p.cond / 100);
    ps.sort((a, b) => ((b.inj > 0 || b.sus > 0) ? -999 : val(b)) - ((a.inj > 0 || a.sus > 0) ? -999 : val(a)));
    const curId = isBench ? (lu.bench || [])[sh.i] : lu.slots[sh.i];
    const rows = ps.map(p => {
      const unav = p.inj > 0 || p.sus > 0;
      const role = lu.slots.includes(p.id) ? 'Titular' : (lu.bench || []).includes(p.id) ? 'Banco' : 'Fora';
      const fit = slot ? (p.pos === slot ? '' : E.fitFactor(slot, p.pos) >= 0.92 ? '<span class="tag">Adaptado</span>' : '<span class="tag bad">Improvisado</span>') : '';
      return `<button class="prow ${p.id === curId ? 'cur' : ''}" data-act="pick" data-pid="${p.id}" ${unav ? 'disabled style="opacity:.5"' : ''}>${ovr(slot ? Math.round(p.ovr * E.fitFactor(slot, p.pos)) : p.ovr)}<span class="who"><b>${esc(p.n)}</b><span>${posLbl(p.pos)} · ${p.age} anos · ${role}</span></span><span class="end">${unav ? (p.inj > 0 ? '<span class="tag bad">Lesionado</span>' : '<span class="tag bad">Suspenso</span>') : fit}${fadiga(p.cond)}</span></button>`;
    }).join('');
    return `<div class="row between" style="margin-bottom:8px"><div><div class="eyebrow">${isBench ? 'Banco · vaga ' + (sh.i + 1) : 'Escolha para a posição'}</div><h2 class="disp" style="font-size:28px;text-transform:uppercase">${isBench ? 'Reserva' : E.POS_NAME[slot]}</h2></div><button class="btn" data-act="closeSheet">Fechar</button></div>
      <p class="small muted" style="margin:0 0 8px">A nota já mostra o efeito da posição: fora dela o jogador rende menos. A barra é o cansaço.</p>
      <div class="plist">${isBench && curId ? `<button class="prow" data-act="pick" data-pid="0"><span class="ovr">–</span><span class="who"><b>Deixar vaga livre</b><span>O auxiliar completa com o melhor que sobrar</span></span><span></span></button>` : ''}${rows}</div>`;
  }

  function sheetPlayer() {
    const p = S.players[U.sheet.pid]; const mine = p.club === me();
    const avg = p.apps ? (p.rsum / p.apps).toFixed(1) : '–';
    const w = G.windowOpen(S.round);
    const v = E.valueFor(p.ovr, p.age, p.pos);
    return `<div class="row between" style="margin-bottom:12px"><div class="row nowrap">${ovr(p.ovr)}<div><h2 class="disp" style="font-size:28px;text-transform:uppercase;line-height:1">${esc(p.n)}</h2><div class="small muted">${E.POS_NAME[p.pos]} · ${p.age} anos · ${esc(club(p.club).name)}</div></div></div><button class="btn" data-act="closeSheet">Fechar</button></div>
      <div class="stats3" style="grid-template-columns:repeat(4,1fr)">${[['Jogos', p.apps], ['Gols', p.g], ['Assist.', p.a], ['Nota média', avg]].map(([l, x]) => `<div class="stat"><div class="lbl">${l}</div><div class="disp" style="text-align:center;font-size:24px;font-weight:900">${x}</div></div>`).join('')}</div>
      ${attrBars(p)}
      ${p.s26 ? `<p class="tiny muted" style="margin:6px 0 0">Na vida real em 2026 (Transfermarkt, até 3 de outubro): ${p.s26[0]} jogos, ${p.s26[1]} gols, ${p.s26[2]} assistências.</p>` : p.youth ? '<p class="tiny muted" style="margin:6px 0 0">Garoto da base gerado pelo jogo (nome fictício).</p>' : ''}
      <div class="fin" style="margin-top:14px"><span>Condição física</span><span>${fadiga(p.cond)}</span><span>Valor de mercado${hint('Estimativa pela nota, idade e posição. Serve de base para propostas e vendas.')}</span><b class="num">${fmt(v)}</b><span>Salário</span><b class="num">${fmt(p.wage)} por semana</b>${p.inj > 0 ? `<span>Lesão</span><b class="neg-c">${p.inj} ${plural(p.inj, 'semana', 'semanas')}</b>` : ''}</div>
      ${mine ? `<div class="row" style="margin-top:16px"><button class="btn ${p.listed ? '' : 'primary'}" data-act="listToggle" data-pid="${p.id}" ${tipA(p.listed ? 'Tira o jogador da lista de venda: para de receber propostas.' : 'Avisa o mercado. Com a janela aberta, chegam propostas a cada rodada; você responde em Mercado, aba Vender.')}>${p.listed ? 'Tirar da venda' : 'Pôr à venda'}</button>${w ? `<button class="btn danger" data-act="quickSell" data-pid="${p.id}" ${tipA('Vende na hora por 75% do valor de mercado.')}>Venda rápida · ${fmt(Math.round(v * 0.75 / 10000) * 10000)}</button>` : ''}</div>
      <p class="tiny muted" style="margin:8px 0 0">${p.listed ? 'Clubes interessados mandam propostas na próxima semana.' : 'À venda, ele recebe propostas a cada semana com a janela aberta.'}${w ? '' : ' A janela está fechada: vendas só fecham quando abrir.'}</p>` : ''}`;
  }

  // ---------- tabela ----------
  function vTabela() {
    const SC = S.comp; const myDiv = club(me()).div; const myKey = G.leagueKey(S);
    const tb = U.tb || (U.tb = { v: 'liga' });
    const estKey = T.estOf(SC, me());
    const tabs = [['liga', DIVN[myDiv]], ['est', 'Estadual'], ['cdb', 'Copa<span class="wide-only"> do Brasil</span>']].concat(SC.cont && SC.cont.L ? [['cont', '<span class="wide-only">Continental</span><span class="narrow-only">Conmebol</span>']] : []).concat([['outras', 'Outras<span class="wide-only"> séries</span>']]);
    let body = '';
    if (tb.v === 'liga') body = divView(myDiv, myDiv === 'D' ? (tb.g || myKey) : null);
    else if (tb.v === 'outras') {
      const d = tb.d && tb.d !== myDiv ? tb.d : ['A', 'B', 'C', 'D'].find(x => x !== myDiv);
      body = `<div class="chips">${['A', 'B', 'C', 'D'].filter(x => x !== myDiv).map(x => `<button class="chip" data-act="tbDiv" data-v="${x}" aria-pressed="${x === d}">${DIVN[x]}</button>`).join('')}</div>` + divView(d, d === 'D' ? (tb.g && tb.gd === 'D' ? tb.g : 'D1') : null);
    } else if (tb.v === 'est') {
      const key = tb.e && SC.est[tb.e] ? tb.e : estKey;
      const opts = Object.keys(SC.est).sort((a, b) => SC.est[a].name.localeCompare(SC.est[b].name)).map(k => `<option value="${k}" ${k === key ? 'selected' : ''}>${esc(SC.est[k].name)}</option>`).join('');
      const e = SC.est[key];
      body = `<section class="card row between" style="gap:10px"><span class="small muted">Estaduais com os clubes das quatro séries; estados com mais de 8 clubes têm uma segunda divisão.</span><label class="sr" for="est-sel">Escolher estadual</label><select id="est-sel" class="txt" data-change="estSel" style="max-width:260px">${opts}</select></section>`
        + tableCard(key, e.name)
        + (e.final ? tiesCard('Final', [e.final], { note: 'jogo único' }) : '')
        + gamesCard('Resultados da semana', (S.results || []).filter(g => g.key === key || (g.comp === 'EST' && SC.est[key].ids.includes(g.h))), true);
    } else if (tb.v === 'cont') body = contView();
    else body = cupView();
    return `<div class="stack" style="max-width:980px;margin:0 auto">
      <div class="seg wide" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="tbTab" data-v="${k}" aria-pressed="${tb.v === k}">${l}</button>`).join('')}</div>
      ${body}</div>`;
  }
  function divView(d, gkey) {
    const SC = S.comp; let out = '';
    const now = G.weekFixtures(S);
    if (d === 'A' || d === 'B') {
      out += tableCard(d, `${DIVN[d]} ${S.year}`);
      out += `<div class="grid g2">${gamesCard('Resultados da última semana', (S.results || []).filter(g => g.comp === d), true)}${gamesCard('Jogos desta semana', now.filter(g => g.comp === d), false)}</div>`;
    } else if (d === 'C') {
      if (SC.cf) out += tiesCard('Série C · final', [SC.cf], { note: 'ida e volta' });
      if (SC.cq) out += `<div class="grid g2">${tableCard('CQA')}${tableCard('CQB')}</div>`;
      out += tableCard('C', `Série C ${S.year} · 1ª fase`);
      out += `<div class="grid g2">${gamesCard('Resultados da última semana', (S.results || []).filter(g => g.comp === 'C'), true)}${gamesCard('Jogos desta semana', now.filter(g => g.comp === 'C'), false)}</div>`;
    } else {
      const key = gkey || 'D1';
      out += `<section class="card"><div class="head"><h2>Série D ${S.year}${hint('96 clubes em 16 grupos regionais de 6. Os 4 primeiros de cada grupo vão ao mata-mata de ida e volta; os 4 semifinalistas sobem para a Série C.')}</h2></div><div class="chips wrap">${SC.dgroups.map(k => `<button class="chip" data-act="tbGroup" data-v="${k}" aria-pressed="${k === key}">Grupo ${k.slice(1)}</button>`).join('')}</div></section>`;
      out += tableCard(key);
      for (let i = SC.dko.length - 1; i >= 0; i--) out += tiesCard('Série D · ' + T.D_KO[i].name, SC.dko[i], { note: 'ida e volta' });
      out += gamesCard('Resultados da última semana', (S.results || []).filter(g => g.comp === 'D' && (g.key === key || !g.key)), true);
    }
    return out;
  }
  function cupView() {
    const SC = S.comp; let out = `<section class="card"><div class="head"><h2>Copa do Brasil ${S.year}${hint('Séries B, C e as 56 melhores da D começam na 1ª fase, em jogo único na casa do mais fraco. A Série A entra nos 16 avos. Dos 16 avos à semifinal é ida e volta; a final é jogo único em campo neutro. Empate no placar total vai para os pênaltis.')}</h2></div>`;
    const reach = T.cupReach(SC, me());
    out += `<p class="small" style="margin:0">${reach ? (reach.champion ? '<b>Seu time é campeão!</b>' : reach.out ? `Seu time parou ${T.inPhase(reach.name)}.` : `Seu time está ${T.inPhase(reach.name)}.`) : club(me()).div === 'A' ? 'Seu time entra nos 16 avos de final.' : 'Seu time não está nesta edição.'}</p></section>`;
    for (let i = SC.cup.length - 1; i >= 0; i--) if (SC.cup[i]) out += tiesCard(T.CUP[i].name, SC.cup[i], { note: T.CUP[i].legs === 2 ? 'ida e volta' : T.CUP[i].neutral ? 'jogo único, campo neutro' : 'jogo único' });
    return out;
  }

  function contView() {
    const SC = S.comp; const tb = U.tb; const reach = T.contReach(SC, me());
    const K = tb.k || (reach ? reach.K : 'L'); const Cc = SC.cont[K]; const nm = T.CONT[K].name;
    const chips = ['L', 'S'].map(k => `<button class="chip" data-act="tbCont" data-v="${k}" aria-pressed="${k === K}">${T.CONT[k].name}</button>`).join('');
    const status = reach ? (reach.champion ? `<b>Seu time é campeão da ${esc(reach.cup)}!</b>` : reach.out ? `Seu time parou ${T.inPhase(reach.name)} da ${esc(reach.cup)}.` : `Seu time está ${T.inPhase(reach.name)} da ${esc(reach.cup)}.`) : 'Seu time não disputa copa continental neste ano. Vagas: G-6 do Brasileirão e campeão da Copa do Brasil na Libertadores; os 7 seguintes na Sul-Americana.';
    const tip = K === 'L' ? 'Fase de grupos com 32 clubes em 8 grupos de 4, jogos no meio de semana. Os 2 primeiros vão às oitavas; o 3º cai para o playoff da Sul-Americana. Oitavas a semifinal em ida e volta; final única em campo neutro. Grupos de 2026 pelo sorteio real.' : 'Fase de grupos com 32 clubes. O 1º de cada grupo vai direto às oitavas; o 2º joga o playoff contra um 3º da Libertadores. Oitavas a semifinal em ida e volta; final única em campo neutro. Grupos de 2026 pelo sorteio real.';
    let out = `<section class="card"><div class="head"><h2>${nm} ${S.year}${hint(tip)}</h2></div><div class="chips" style="margin-bottom:8px">${chips}</div><p class="small" style="margin:0">${status}</p></section>`;
    ['F', 'SF', 'QF', 'R16', 'PO'].forEach(ph => { if (Cc.ko[ph]) out += tiesCard(T.CONT_PH[ph], Cc.ko[ph].filter(t => t.a !== t.b), { note: ph === 'F' ? 'jogo único, campo neutro' : 'ida e volta' }); });
    const keys = Object.keys(Cc.groups).map(g => K + g);
    const mine = keys.find(k => Cc.groups[k.slice(1)].includes(me()));
    const order = mine ? [mine].concat(keys.filter(k => k !== mine)) : keys;
    out += `<div class="grid g2">${order.map(k => tableCard(k, `Grupo ${k.slice(1)}`)).join('')}</div>`;
    const comp = T.CONT[K].comp;
    out += `<div class="grid g2">${gamesCard('Últimos resultados', (S.results || []).filter(g => g.comp === comp), true)}${gamesCard('Jogos desta data', G.weekFixtures(S).filter(g => g.comp === comp), false)}</div>`;
    return out;
  }

  // ---------- mercado ----------
  const pctTxt = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`;
  const reasonChips = rs => rs.filter(r => r[1] !== 0 || r[0]).map(([t, v]) => `<span class="rchip ${v > 0 ? 'up' : v < 0 ? 'dn' : ''}">${esc(t)}${v ? ` <b>${pctTxt(v)}</b>` : ''}</span>`).join('');
  function vMercado() {
    const w = G.windowInfo(S.round); const m = U.mkt;
    const a = S.market.auction && S.market.auction.status === 'open' ? S.market.auction : null;
    const nOff = S.market.offers.length;
    const myLoans = (S.market.loans || []).map(id => S.players[id]).filter(p => p && p.loan && (p.loan.owner === me() || p.club === me()));
    const tabs = [['buy', 'Comprar'], ['sell', `Vender${nOff ? ' · ' + nOff : ''}`], ['loans', `<span class="wide-only">Empréstimos</span><span class="narrow-only">Emprést.</span>${myLoans.length ? ' · ' + myLoans.length : ''}`], ['feed', '<span class="wide-only">Movimentações</span><span class="narrow-only">Geral</span>']].concat(a ? [['auction', 'Leilão']] : []);
    if (!tabs.some(x => x[0] === m.tab)) m.tab = 'buy';
    const head = `<section class="card stack" style="gap:12px"><div class="head" style="margin:0"><h2>Mercado${hint(JANELA_TIP + ' O caixa paga a transferência e o salário precisa caber no teto da folha.')}</h2><span class="tag ${w.open ? 'good' : ''}">${w.open ? `Janela aberta · fecha em ${w.closesIn} ${plural(w.closesIn, 'semana', 'semanas')}` : w.opensIn ? `Janela fechada · abre em ${w.opensIn} ${plural(w.opensIn, 'semana', 'semanas')}` : `Janela fechada até ${S.year + 1}`}</span></div>
      <div class="fin small"><span>Caixa</span><b class="num">${fmt(club(me()).cash)}</b><span>Espaço na folha${hint(FOLHA_TIP)}</span><b class="num ${G.wageRoom(S) < 0 ? 'neg-c' : ''}">${fmt(G.wageRoom(S))} por semana</b><span>Elenco${hint('Limite de 42 jogadores, contando quem veio emprestado. Mínimo de 18.')}</span><b>${myPlayers().length} de 42</b></div>
      ${(() => { const vi = G.verbaInfo(S); return `<div class="row between" style="gap:8px"><span class="small muted">${vi.used ? 'Verba já pedida nesta janela.' : vi.open ? 'Precisa de dinheiro para reforços? Peça à diretoria.' : 'Verba extra só com a janela aberta.'}</span><button class="btn" data-act="verba" ${tipA('Pede dinheiro extra para reforços. Uma vez por janela; a chance depende da confiança.')}>Pedir verba</button></div>`; })()}
      <div class="seg wide" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="mktTab" data-v="${k}" aria-pressed="${m.tab === k}">${l}</button>`).join('')}</div></section>`;
    let body = '';
    if (m.tab === 'buy') {
      const pos = ['', 'GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'ST', 'LW'];
      const divChips = ['', 'A', 'B', 'C', 'D'].map(x => `<button class="chip" data-act="mktDiv" data-v="${x}" aria-pressed="${(m.div || '') === x}">${x ? DIVN[x] : 'Todas as séries'}</button>`).join('');
      const chips = pos.map(p => `<button class="chip" data-act="mktPos" data-v="${p}" aria-pressed="${m.pos === p}">${p ? posLbl(p) : 'Todos'}</button>`).join('') + `<button class="chip" data-act="mktYoung" aria-pressed="${m.young}" ${tipA('Jovens de até 23 anos ainda evoluem: boas atuações podem subir a nota.')}>Até 23 anos</button><button class="chip" data-act="mktFit" aria-pressed="${m.fit}" ${tipA('Mostra só quem dá para pagar: caixa com margem de negociação e salário dentro do teto da folha.')}>Cabe no orçamento</button>`;
      const myBest = {}; myPlayers().forEach(p => { myBest[p.pos] = Math.max(myBest[p.pos] || 0, p.ovr); });
      const cash = club(me()).cash, room = G.wageRoom(S);
      const fits = p => G.askPrice(S, p) * 0.86 <= cash && p.wage <= room;
      const list = G.marketList(S, { pos: m.pos || null, maxAge: m.young ? 23 : null, div: m.div || null, q: m.q || null }).filter(p => !m.fit || fits(p) || p.loan).slice(0, 40);
      body = `<section class="card"><input id="mkt-q" class="txt" type="search" placeholder="Buscar jogador ou clube" value="${esc(m.q || '')}" aria-label="Buscar jogador ou clube" style="margin-bottom:10px"><div class="chips" style="margin-bottom:6px">${divChips}</div><div class="chips" style="margin-bottom:8px">${chips}</div><div class="plist">${list.map(p => `<button class="prow ${fits(p) ? '' : 'dim'}" data-act="mktSel" data-pid="${p.id}">${ovr(p.ovr)}<span class="who"><b>${esc(p.n)} ${p.ovr > (myBest[p.pos] || 0) ? '<span class="tag gold" data-tip="Nota acima do seu melhor jogador nesta posição.">reforço</span>' : ''}${p.loan ? ' <span class="tag">emprestado</span>' : ''}</b><span>${posLbl(p.pos)} · ${p.age} anos · ${esc(club(p.club).name)} <span class="muted">(${club(p.club).div})</span> ${attrMini(p)}</span></span><span class="end"><b class="num gold-c">${fmt(G.askPrice(S, p))}</b><span class="tiny muted">${fmt(p.wage)}/sem.</span><span class="ct-cue">Contratar</span></span></button>`).join('') || `<div class="empty">Nenhum jogador com esse filtro.${m.fit ? ' Desligue “Cabe no orçamento” para ver todos, ou venda alguém para abrir caixa e folha.' : ''}</div>`}</div><p class="tiny muted" style="margin:8px 0 0">O valor da lista é o pedido do clube. Toque no jogador para ver se ele topa vir e fazer proposta de compra ou de empréstimo.</p></section>`;
    } else if (m.tab === 'sell') {
      const idolId = (G.idolOf(S).p || {}).id; const idolPct = (G.lojaInfo(S).idol || {}).pct || 0;
      const offs = S.market.offers.map(o => {
        const p = S.players[o.pid]; const b = club(o.club); const loan = o.type === 'loan'; const wk = o.expires - S.round;
        const ask = Math.round(o.fee * (U.cnt && U.cnt[o.id] || 1.15) / 10000) * 10000;
        const line = loan ? `${esc(b.name)} pede emprestado · paga ${Math.round(o.share * 100)}% do salário${o.obligation ? ` · compra obrigatória de <b class="gold-c">${fmt(o.buyFee)}</b>` : ' · volta no fim da temporada'}` : `${esc(b.name)} oferece <b class="gold-c">${fmt(o.fee)}</b>`;
        return `<div class="pcard"><div class="pc-top">${ovr(p.ovr)}<div class="pc-who"><b>${esc(p.n)}</b><span class="small muted">${line} · ${wk <= 0 ? 'vale só nesta semana' : `expira em ${wk} ${plural(wk, 'semana', 'semanas')}`}</span></div><div class="pc-act"><button class="btn primary" data-act="offerAccept" data-id="${o.id}" ${w.open ? '' : 'disabled'}>Aceitar</button><button class="btn" data-act="offerRefuse" data-id="${o.id}">Recusar</button></div></div>
          ${!loan ? `<details class="more"><summary>${Math.round(o.fee / o.value * 100)}% do valor de mercado (${fmt(o.value)}) · ver motivos e pedir mais</summary><div class="rchips">${reasonChips(o.reasons || [])}</div><div class="row" style="gap:4px;margin-top:8px"><button class="btn ghost" data-act="cntStep" data-id="${o.id}" data-v="-1" aria-label="Pedir menos">−</button><button class="btn" data-act="offerCounter2" data-id="${o.id}" data-ask="${ask}" ${w.open ? '' : 'disabled'} ${tipA('O comprador tem um teto que você não vê: até ele, fecha; acima, ele melhora uma vez ou desiste.')}>Pedir ${fmt(ask)}</button><button class="btn ghost" data-act="cntStep" data-id="${o.id}" data-v="1" aria-label="Pedir mais">+</button></div></details>` : ''}
          ${o.wants ? `<p class="tiny" style="margin:6px 0 0;color:var(--alerta)">${esc(p.n)} quer ir: recusar deixa ele insatisfeito por 8 semanas.</p>` : ''}${p.id === idolId ? `<p class="tiny muted" style="margin:6px 0 0">${esc(p.n)} é o ídolo da torcida: sem ele a loja perde o pico do ídolo${idolPct > 0 ? ` (${idolPct}%)` : ''} e esfria 12% por 4 semanas.</p>` : ''}</div>`;
      }).join('');
      const mine = myPlayers().filter(p => !p.loan || p.loan.owner === me());
      const xi = new Set(S.lineup.slots || []); const canSell = Math.max(0, myPlayers().length - 18);
      const worth = mine.reduce((a, p) => a + E.valueFor(p.ovr, p.age, p.pos), 0);
      const F = U.sf || 'all';
      const filts = [['all', 'Todos', mine], ['out', 'Fora do time', mine.filter(p => !xi.has(p.id))], ['xi', 'Titulares', mine.filter(p => xi.has(p.id))], ['ct', 'Contrato acabando', mine.filter(p => (p.contract || 2) <= 1)], ['30', '30+ anos', mine.filter(p => p.age >= 30)], ['ad', 'Anunciados', mine.filter(p => p.listed)]];
      let list = (filts.find(f => f[0] === F) || filts[0])[2].slice();
      const sort = U.ss || 'valor';
      list.sort((a, b) => sort === 'nota' ? b.ovr - a.ovr : sort === 'idade' ? a.age - b.age : E.valueFor(b.ovr, b.age, b.pos) - E.valueFor(a.ovr, a.age, a.pos));
      const groups = [['G', 'Goleiros'], ['D', 'Defensores'], ['M', 'Meio-campistas'], ['A', 'Atacantes']];
      const inPos = {}; mine.forEach(p => { inPos[p.pos] = (inPos[p.pos] || 0) + 1; });
      const card = p => { const v = E.valueFor(p.ovr, p.age, p.pos); const q = Math.round(v * 0.8 / 10000) * 10000; const ask = U.qs === p.id;
        return `<div class="pcard ${xi.has(p.id) ? 'tit' : ''}"><div class="pc-top">${ovr(p.ovr)}<div class="pc-who"><b>${esc(p.n)}</b><span class="small muted">${E.POS_NAME[p.pos]} · ${p.age} anos · ${inPos[p.pos]} na posição${p.unhappy > 0 ? ' · <span class="neg-c">insatisfeito</span>' : ''}</span><span class="row" style="gap:6px;margin-top:2px">${xi.has(p.id) ? '<span class="tag blue">Titular</span>' : ''}${p.id === idolId ? '<span class="tag gold" data-tip="Camisa mais vendida do clube. Vender esfria a loja por algumas semanas.">Ídolo</span>' : ''}${p.listed ? '<span class="tag gold">Anunciado</span>' : ''}${(p.contract || 2) <= 1 ? '<span class="tag bad">Contrato acabando</span>' : ''}</span></div></div>
          <div class="pc-bot"><span><b class="pos-c num">${fmt(q)}</b> <span class="small muted">vale ${fmt(v)}</span></span>${ask ? `<span class="row nowrap" style="gap:6px"><button class="btn danger" data-act="quickYes" data-pid="${p.id}">Vender por ${fmt(q)}</button><button class="btn ghost" data-act="quickNo">Voltar</button></span>` : `<span class="row nowrap" style="gap:6px"><button class="btn ghost" data-act="listQuick" data-pid="${p.id}" ${tipA(p.listed ? 'Tira do anúncio.' : 'Anuncia o jogador: chegam mais propostas, mas o mercado sabe que você quer vender (−10%).')}>${p.listed ? 'Tirar anúncio' : 'Anunciar'}</button><button class="btn" data-act="quickAsk" data-pid="${p.id}" ${w.open && canSell ? '' : 'disabled'} ${tipA('Venda rápida: um clube da sua série leva na hora e paga 80% do valor.')}>Vender</button></span>`}</div></div>`; };
      const listHtml = groups.map(([g, l]) => { const ps = list.filter(p => E.GROUP[p.pos] === g); return ps.length ? `<h3 class="grp">${l} <span class="muted">${ps.length}</span></h3>${ps.map(card).join('')}` : ''; }).join('');
      body = `<section class="card"><div class="head"><h2>Propostas recebidas${hint('Ofertas de outros clubes por jogadores seus, de compra ou de empréstimo. Em cada uma dá para ver os motivos do valor e pedir mais.')}</h2></div>${offs || '<p class="small muted" style="margin:0">Nenhuma proposta agora. Jogadores anunciados recebem mais ofertas; quem joga pouco recebe pedidos de empréstimo.</p>'}</section>
        <section class="card"><div class="head"><h2>Vender do meu elenco${hint('Venda rápida paga 80% do valor na hora. Anunciar atrai propostas, que costumam pagar mais.')}</h2></div>
          <p class="small" style="margin:0 0 6px">${mine.length} jogadores · pode vender <b class="pos-c">${canSell}</b> · elenco vale <b class="gold-c">${fmt(worth)}</b></p>
          <p class="small muted" style="margin:0 0 12px">Venda rápida: um clube da sua série leva o jogador na hora e paga 80% do valor. Propostas de outros clubes pagam mais: para os seus melhores, vale esperar.</p>
          <div class="chips wrap" style="margin-bottom:10px">${filts.map(([k, l, arr]) => `<button class="chip" data-act="sellFilt" data-v="${k}" aria-pressed="${F === k}">${l} <span class="lk">${arr.length}</span></button>`).join('')}</div>
          <div class="row" style="justify-content:flex-end;margin-bottom:6px"><select class="txt" data-change="sellSort" aria-label="Ordenar"><option value="valor" ${sort === 'valor' ? 'selected' : ''}>Maior valor</option><option value="nota" ${sort === 'nota' ? 'selected' : ''}>Maior nota</option><option value="idade" ${sort === 'idade' ? 'selected' : ''}>Mais novos</option></select></div>
          ${listHtml || '<p class="small muted">Ninguém neste filtro.</p>'}</section>`;
    } else if (m.tab === 'loans') {
      const row = (p, out) => { const L = p.loan; const other = out ? p.club : L.owner; return `<button class="prow" data-act="player" data-pid="${p.id}">${ovr(p.ovr)}<span class="who"><b>${esc(p.n)}</b><span>${out ? 'no' : 'do'} ${esc(club(other).name)} · até o fim de ${L.until} · ${out ? `${club(other).name} paga ${Math.round(L.share * 100)}% do salário` : `você paga ${Math.round(L.share * 100)}% do salário`}${L.obligation ? ` · compra obrigatória ${fmt(L.buyFee)}` : ''} · ${p.apps - (L.apps0 || 0)} jogos</span></span></button>`; };
      const out = myLoans.filter(p => p.loan.owner === me()); const inn = myLoans.filter(p => p.club === me());
      body = `<section class="card"><div class="head"><h2>Emprestados por você${hint('Seus jogadores jogando em outros clubes. Voltam no fim da temporada, a não ser que haja compra obrigatória. Garoto que joga 10 ou mais partidas volta com +1 ou +2 de nota.')}</h2></div>${out.length ? `<div class="plist">${out.map(p => row(p, true)).join('')}</div>` : '<p class="small muted" style="margin:0">Nenhum. Pedidos de empréstimo chegam na aba Propostas.</p>'}</section>
        <section class="card"><div class="head"><h2>Emprestados para você${hint('Jogadores de outros clubes no seu elenco. Com compra obrigatória, o valor sai do seu caixa no fim da temporada.')}</h2></div>${inn.length ? `<div class="plist">${inn.map(p => row(p, false)).join('')}</div>` : '<p class="small muted" style="margin:0">Nenhum. Em Comprar, toque num jogador e escolha Empréstimo.</p>'}${inn.some(p => p.loan.obligation) ? `<div class="notice warn small" style="margin-top:10px">Compras obrigatórias no fim da temporada: <b>${fmt(inn.filter(p => p.loan.obligation).reduce((s, p) => s + p.loan.buyFee, 0))}</b>.</div>` : ''}</section>`;
    } else if (m.tab === 'feed') {
      const f = (S.market.feed || []).slice(0, 50);
      body = `<section class="card"><div class="head"><h2>Movimentações${hint('Compras, vendas e empréstimos de todos os clubes, inclusive entre clubes da IA.')}</h2></div>${f.length ? `<div class="plist">${f.map(x => `<div class="prow" style="cursor:default">${ovr(x.ovr)}<span class="who"><b>${esc(x.n)}</b><span>${badge(x.from, 'sm')} ${esc(club(x.from).name)} → ${badge(x.to, 'sm')} ${esc(club(x.to).name)}</span></span><span class="end"><b class="num">${x.t === 'loan' ? 'Empréstimo' : fmt(x.fee)}</b><span class="tiny muted">${x.t === 'loan' && x.obligation ? `compra obrigatória ${fmt(x.buyFee)} · ` : ''}S${x.w} · ${x.y}</span></span></div>`).join('')}</div>` : '<p class="small muted" style="margin:0">Nada ainda. Os clubes negociam quando a janela abre.</p>'}</section>`;
    } else if (m.tab === 'auction' && a) body = auctionCard(a);
    return `<div class="stack" style="max-width:860px;margin:0 auto">${head}${body}</div>`;
  }

  // ---------- contratar: modal no modelo do Brasileirinho (preço, luvas, salário e interesse do jogador) ----------
  const seg3 = (act, cur, opts) => `<div class="opt3">${opts.map(([v, l]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
  function interestBox(it) {
    const cls = it.score >= G.INTEREST_OK ? 'good' : it.score >= 45 ? 'warn' : 'bad';
    return `<div class="intbox ${cls}"><div class="row between"><b class="disp">${esc(it.label)}</b><span class="small muted">interesse ${it.score}/100</span></div>
      <div class="dbar"><i style="width:${Math.max(3, it.score)}%"></i><em style="left:${G.INTEREST_OK}%"></em></div>
      <div class="int-rows">${it.reasons.map(([txt, v]) => `<span>${esc(txt)}</span><b class="${v > 0 ? 'pos-c' : 'neg-c'}">${v > 0 ? '+' : '−'}${Math.abs(v)}</b>`).join('')}</div></div>`;
  }
  function sheetOffer() {
    const p = S.players[U.sheet.pid]; const m = U.mkt; const loan = m.mode === 'loan';
    const T = loan ? G.loanTerms(S, p.id, { share: m.share ?? 1, obligation: !!m.oblig, sal: m.sal || 0 }) : G.buyTerms(S, p.id, { valor: m.valor || 0, luvas: m.luvas || 0, sal: m.sal || 0 });
    const c = club(p.club); const r = m.resp;
    const full = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
    const q = loan ? `Pedir ${esc(p.n)} emprestado ao ${esc(c.name)} até o fim de ${S.year}?` : `Contratar ${esc(p.n)} do ${esc(c.name)} por ${full(T.total)}?`;
    const rows = loan ? `
        <span class="eyebrow">Salário pago por você${hint('O resto do salário continua com o clube dono. Pagar tudo facilita o sim do clube.')}</span>
        ${seg3('loanShare', m.share ?? 1, [[0.5, '50 %'], [1, '100 %']])}
        <span class="eyebrow">Tipo${hint('Com obrigação de compra, você paga o pedido do clube no fim do empréstimo e o jogador fica de vez. Clube costuma aceitar mais fácil.')}</span>
        ${seg3('loanOblig', m.oblig ? 1 : 0, [[0, 'Só empréstimo'], [1, 'Com compra']])}
        <span class="eyebrow">Salário${hint('Acima do mercado, o jogador fica mais interessado.')}</span>
        ${seg3('offerSal', m.sal || 0, [[0, 'De mercado'], [15, '+15 %'], [30, '+30 %']])}
        <p class="small muted" style="margin:0">${fmt(T.wage)} por semana · você paga ${fmt(T.myWage)} · taxa de empréstimo ${fmt(T.fee)}${T.buyFee ? ` · compra obrigatória de ${fmt(T.buyFee)} no fim` : ''}.</p>` : `
        <span class="eyebrow">Valor ao clube${hint('O pedido do clube já considera se ele é titular, jovem ou um dos melhores. Abaixo do pedido só passa se o clube tiver motivo para vender; um dos 3 melhores só sai acima do pedido.')}</span>
        ${seg3('offerValor', m.valor || 0, [[-1, '−15 %'], [0, 'Pedido'], [1, '+15 %']])}
        <span class="eyebrow">Luvas${hint('Bônus pago ao jogador na assinatura, em % do valor da transferência. Aumenta muito o interesse.')}</span>
        ${seg3('offerLuvas', m.luvas || 0, [[0, 'Sem luvas'], [15, '+15 %'], [30, '+30 %']])}
        <span class="eyebrow">Salário${hint('Salário de mercado é o da nota dele. Acima disso, o interesse sobe.')}</span>
        ${seg3('offerSal', m.sal || 0, [[0, 'De mercado'], [15, '+15 %'], [30, '+30 %']])}
        <p class="small muted" style="margin:0">${fmt(T.wage)} por semana · contrato de 3 anos${T.luvasV ? ` · luvas de ${fmt(T.luvasV)}` : ''}.</p>`;
    return `<div class="contratar">
      <h2 class="disp ct-t">${loan ? 'Empréstimo' : 'Contratar'}</h2>
      <div class="seg wide" style="margin-top:10px">${[['buy', 'Comprar'], ['loan', 'Pedir emprestado']].map(([k, l]) => `<button data-act="offerMode" data-v="${k}" aria-pressed="${(m.mode || 'buy') === k}">${l}</button>`).join('')}</div>
      <p class="ct-q">${q}</p>
      <div class="row nowrap ct-p">${ovr(p.ovr)}<div style="min-width:0"><b>${esc(p.n)}</b><div class="small muted">${E.POS_NAME[p.pos]} · ${p.age} anos · ${badge(p.club, 'sm')} ${esc(c.name)} · ${DIVN[c.div]}</div><div>${attrMini(p)}</div></div></div>
      <div class="ct-box">
        ${interestBox(T.it)}
        <div class="notice ${T.club.ok ? 'good' : 'bad'} small" style="margin:4px 0 0"><b>Clube:</b> ${esc(T.club.txt)}${!loan ? ` Pedido: ${fmt(T.ask)} (valor de mercado ${fmt(T.value)}).` : ''}</div>
        ${rows}
        <p class="small muted" style="margin:0">Seu caixa: ${fmt(club(me()).cash)}${(S.infra || {})[me()] && G.verbaInfo(S).open && !G.verbaInfo(S).used ? ' · dá para pedir verba à diretoria' : ''}. Espaço na folha: ${fmt(G.wageRoom(S))} por semana.</p>
      </div>
      ${r ? `<div class="notice ${r.ok ? 'good' : 'bad'}" style="margin-top:12px">${esc(r.msg)}</div>` : ''}
      ${T.blocked ? `<div class="notice bad small" style="margin-top:12px">${esc(T.blocked)}</div>` : !T.club.ok ? '' : !T.it.ok ? `<div class="notice warn small" style="margin-top:12px">${esc(p.n)} ainda não topa (precisa de ${G.INTEREST_OK}). ${loan ? 'Tente um salário maior.' : 'Luvas e salário maior aumentam o interesse.'}</div>` : ''}
      <div class="row ct-btns"><button class="btn big" data-act="closeSheet">Voltar</button><button class="btn primary big" data-act="sendOffer" ${T.ok ? '' : 'disabled'}>Confirmar</button></div></div>`;
  }

  function auctionCard(a) {
    const p = S.players[a.pid]; const t = U.auction ? U.auction.left : 30;
    return `<section class="card auction stack"><div class="head" style="margin:0"><h2>Leilão relâmpago${hint('Jogador sem clube. São 30 segundos: cada lance sobe 10% e os rivais podem cobrir. Quem estiver na frente no fim leva.')}</h2><span class="timer num" id="auc-timer">${t}s</span></div>
      <div class="row nowrap">${ovr(p.ovr)}<div><b>${esc(p.n)}</b><div class="small muted">${E.POS_NAME[p.pos]} · ${p.age} anos · sem clube · ${fmt(E.wageFor(p.ovr))} por semana</div></div></div>
      <div class="fin"><span>Lance atual</span><b class="num" id="auc-bid">${fmt(a.bid)}</b><span>Na frente</span><b id="auc-lead">${a.leader === 'me' ? 'Você' : a.leader ? esc(club(a.leader).name) : 'Ninguém'}</b></div>
      <div id="auc-msg"></div>
      ${U.auction ? `<button class="btn gold big block" data-act="bid">Dar lance de ${fmt(Math.round(a.bid * 1.1 / 10000) * 10000)}</button>` : `<button class="btn primary big block" data-act="startAuction">Entrar no leilão (30 segundos)</button>`}
      <p class="tiny muted" style="margin:0">Cada lance sobe 10%. Quem estiver na frente quando o tempo acabar leva.</p></section>`;
  }

  // ---------- clube ----------
  // ---------- estrutura do clube: CT, base, estádio e loja ----------
  const dec = (v, n = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
  const INFRA_TIP = {
    ct: 'Centro de Treinamento. Cada nível acima do 1 recupera mais condição por semana, aumenta a chance de evolução dos jovens e encurta lesões. Tem manutenção semanal.',
    base: `Categorias de base. Em cada peneira (início da temporada e semana ${G.PENEIRA_WEEK + 1}) chegam garotos de 16 e 17 anos. Nível maior traz mais garotos, nota inicial maior e potencial mais preciso.`,
    estadio: 'Estádio. O preço do ingresso muda o público e a renda. Casa cheia empurra o time. Ampliação soma lugares e só rende se o estádio costuma lotar.',
    loja: 'Loja oficial. Vende camisas toda semana sozinha: o tamanho da torcida, a fase do time, os grandes momentos e o ídolo do elenco decidem quanto. O lucro cai no caixa toda semana.',
  };
  const INFRA_IC = {
    ct: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 20V9l7-5 7 5v11M10 20v-5h4v5"/></svg>',
    base: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9M12 12c0-4 3-7 8-7 0 4-3 7-8 7zM12 15c0-3-2.5-6-7-6 0 3 2.5 6 7 6z"/></svg>',
    estadio: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="9.5" ry="6.5"/><ellipse cx="12" cy="12" rx="4.5" ry="2.6"/></svg>',
    loja: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/></svg>',
  };
  const pips = (l, max) => `<span class="pips" aria-hidden="true">${Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span>`;
  const cmp = (now, nxt) => nxt == null || nxt === now ? `<b class="num">${now}</b>` : `<b class="num">${now} <span class="nx">→ ${nxt}</span></b>`;
  function maintOf(k, l) { const inf = G.infra(S); const D = G.INFRA[k]; return Math.round(inf.ref * D.maint * Math.max(0, l - D.min) / 1000) * 1000; }
  function buildBar(k) {
    const b = G.infra(S).build; if (!b || (k && b.k !== k)) return '';
    const pct = Math.round((b.total - b.left) / b.total * 100);
    return `<div class="build"><div class="row between small"><b>Em obra: ${esc(k ? G.infraLabel(b.k, b.to) : G.INFRA[b.k].name + ', ' + G.infraLabel(b.k, b.to))}</b><span class="muted">faltam ${b.left} de ${b.total} ${plural(b.total, 'semana', 'semanas')}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }
  function infraUpBtn(k) {
    const inf = G.infra(S); const D = G.INFRA[k]; const to = inf[k] + 1; const c = club(me());
    if (inf.build && inf.build.k === k) return '';
    if (to > D.max) return `<span class="tag good">${k === 'estadio' ? 'Todas as ampliações feitas' : 'Nível máximo'}</span>`;
    const cost = G.infraCost(S, k);
    if (!cost) return `<p class="small muted" style="margin:0">O estádio já está no limite de ${G.CAP_MAX.toLocaleString('pt-BR')} lugares.</p>`;
    const busy = inf.build; const poor = c.cash < cost; const after = c.cash - cost; const thin = !busy && !poor && after < G.wageBill(S, me()) * 2;
    const why = busy ? `Uma obra por vez: espere ${G.INFRA[busy.k].short === 'Base' ? 'a da base' : busy.k === 'loja' ? 'a da loja' : busy.k === 'estadio' ? 'a do estádio' : 'a do CT'} terminar.` : poor ? `Falta ${fmt(cost - c.cash)} no caixa.` : '';
    const lbl = k === 'estadio' ? `Ampliar para ${G.capAt(inf.cap0, to).toLocaleString('pt-BR')} lugares` : `Construir nível ${to}`;
    return `<button class="btn ${busy || poor ? '' : 'primary'} block" data-act="infraUp" data-k="${k}" ${busy || poor ? 'aria-disabled="true"' : ''} ${tipA(`Paga a obra agora e espera ${D.weeks[to]} semanas. A manutenção semanal sobe junto.`)}>${lbl} · ${fmt(cost)} · ${D.weeks[to]} sem.</button>${why ? `<p class="tiny muted" style="margin:6px 0 0">${why}</p>` : thin ? `<p class="tiny" style="margin:6px 0 0;color:var(--alerta)">Depois da obra o caixa fica em ${fmt(after)}, menos de 2 semanas de folha.</p>` : ''}`;
  }
  function infraCard(k, rows, extra = '') {
    const inf = G.infra(S); const D = G.INFRA[k]; const l = inf[k];
    const sub = k === 'estadio' ? `${l ? l + ' de 3 ampliações' : 'Sem ampliação'}` : `Nível ${l} de ${D.max}`;
    return `<section class="card infra" id="inf-${k}"><div class="head"><h2><span class="inf-ic">${INFRA_IC[k]}</span>${D.name}${hint(INFRA_TIP[k])}</h2>${pips(l, D.max)}</div>
      <div class="small muted" style="margin:-6px 0 10px">${sub}</div>${buildBar(k)}
      <div class="fin small">${rows}</div>${extra}
      <div style="margin-top:14px">${infraUpBtn(k)}</div></section>`;
  }
  function ctCard() {
    const l = G.infra(S).ct; const to = l < 5 ? l + 1 : null;
    const f = lv => ({ rec: 1.5 * (lv - 1), evo: 1 + 0.08 * (lv - 1), inj: 10 * (lv - 1) });
    const a = f(l), b = to ? f(to) : null;
    return infraCard('ct',
      `<span>Recuperação extra${hint('Condição a mais que cada jogador seu recupera por semana, além da recuperação normal.')}</span>${cmp('+' + dec(a.rec) + ' por semana', b && '+' + dec(b.rec))}`
      + `<span>Chance de evolução${hint('Multiplica a chance de jogadores de até 23 anos subirem a nota depois de boas atuações.')}</span>${cmp('×' + dec(a.evo, 2), b && '×' + dec(b.evo, 2))}`
      + `<span>Lesões${hint('Quanto encolhe o tempo de recuperação de uma lesão.')}</span>${cmp(a.inj ? a.inj + '% mais curtas' : 'duração normal', b && b.inj + '% mais curtas')}`
      + `<span>Manutenção</span>${cmp(fmt(maintOf('ct', l)) + '/sem.', to && fmt(maintOf('ct', to)) + '/sem.')}`);
  }
  function baseCard() {
    const inf = G.infra(S); const l = inf.base; const to = l < 5 ? l + 1 : null;
    const ovrs = myPlayers().map(p => p.ovr).sort((x, y) => x - y); const med = ovrs.length ? ovrs[Math.floor(ovrs.length / 2)] : 60;
    const nota = lv => Math.max(45, Math.round(med - 15 + 1.5 * lv));
    const next = S.round <= G.PENEIRA_WEEK ? `semana ${G.PENEIRA_WEEK + 1}` : `início de ${S.year + 1}`;
    const full = inf.prospects.length >= G.BASE_MAX;
    const list = inf.prospects.map(p => `<div class="prow pros" style="cursor:default">${ovr(p.ovr)}<span class="who"><b>${esc(p.n)}</b><span>${posLbl(p.pos)} · ${p.age} anos · potencial <b>${p.potLo}${p.potHi > p.potLo ? '–' + p.potHi : ''}</b> ${attrMini(p)}</span></span><span class="row nowrap" style="gap:4px">${U.relConfirm === p.id ? `<button class="btn danger" data-act="release" data-pid="${p.id}">Confirmar</button><button class="btn ghost" data-act="relCancel">Voltar</button>` : `<button class="btn primary" data-act="promote" data-pid="${p.id}" ${tipA('Leva o garoto para o elenco profissional com salário de formação (60% do normal). Ele passa a jogar e pode evoluir em campo.')}>Subir</button><button class="btn ghost" data-act="relAsk" data-pid="${p.id}" ${tipA('Libera a vaga na base. Não tem volta.')}>Dispensar</button>`}</span></div>`).join('');
    return infraCard('base',
      `<span>Garotos por peneira</span>${cmp(String(G.PROSPECTS[l]), to && String(G.PROSPECTS[to]))}`
      + `<span>Nota inicial${hint('Nota aproximada com que os garotos chegam, a partir do nível do seu elenco.')}</span>${cmp('cerca de ' + nota(l), to && String(nota(to)))}`
      + `<span>Precisão do potencial${hint('Largura da faixa de potencial mostrada. No nível 5 o potencial aparece quase exato.')}</span>${cmp(`faixa de ${6 - l} ${plural(6 - l, 'ponto', 'pontos')}`, to && `${6 - to}`)}`
      + `<span>Próxima peneira</span><b>${next}</b>`
      + `<span>Manutenção</span>${cmp(fmt(maintOf('base', l)) + '/sem.', to && fmt(maintOf('base', to)) + '/sem.')}`,
      `<div class="eyebrow" style="margin-top:14px">Na base · ${inf.prospects.length} de ${G.BASE_MAX}${hint('Garotos ficam na base até os 20 anos. Quem não subir até lá vai embora. Com a base cheia, a peneira não traz ninguém.')}</div>
       ${list ? `<div class="plist">${list}</div>` : `<p class="small muted" style="margin:6px 0 0">Ninguém na base agora. A próxima peneira é na ${next}.</p>`}${full ? '<p class="tiny" style="margin:6px 0 0;color:var(--alerta)">Base cheia: a próxima peneira só traz garotos se abrir vaga.</p>' : ''}`);
  }
  function estadioCard() {
    const inf = G.infra(S); const c = club(me()); const l = inf.estadio; const to = l < 3 ? l + 1 : null;
    const cw = G.crowd(S, me(), null); const push = 6 * (cw.fill - 0.6);
    const avg = inf.att.length ? Math.round(inf.att.reduce((x, y) => x + y, 0) / inf.att.length) : null;
    const seg = G.TICKET_MULT.map((m, i) => `<button role="radio" data-act="ticket" data-v="${i}" aria-checked="${inf.ticket === i}" aria-pressed="${inf.ticket === i}" ${tipA(`${G.TICKET_NAME[i]}: ${i < 2 ? 'mais público e mais pressão da torcida, menos renda por pessoa' : i > 2 ? 'mais renda por pessoa quando o estádio lota, menos público' : 'preço de referência do clube'}.`)}>R$ ${Math.round(c.ticket * m)}</button>`).join('');
    return infraCard('estadio',
      `<span>Estádio</span><b>${esc(c.stadium || '–')}</b>`
      + `<span>Capacidade</span>${cmp(c.cap.toLocaleString('pt-BR'), to && G.capAt(inf.cap0, to) > c.cap ? G.capAt(inf.cap0, to).toLocaleString('pt-BR') : null)}`
      + `<span>Público médio${hint('Média dos últimos jogos em casa do seu time nesta carreira.')}</span><b class="num">${avg != null ? avg.toLocaleString('pt-BR') + ' (' + Math.round(avg / c.cap * 100) + '%)' : 'sem jogos ainda'}</b>`
      + `<span>Manutenção</span>${cmp(fmt(maintOf('estadio', l)) + '/sem.', to && fmt(maintOf('estadio', to)) + '/sem.')}`,
      `<div class="eyebrow" style="margin-top:14px">Ingresso · ${G.TICKET_NAME[inf.ticket]}${hint('Preço mais baixo enche o estádio e aumenta a pressão da torcida; mais alto rende mais quando o estádio lota.')}</div>
       <div class="seg wide tix" role="radiogroup" aria-label="Preço do ingresso" style="margin-top:6px">${seg}</div>
       <div class="notice info small" style="margin-top:10px">Num jogo da liga em casa agora: <b>${cw.att.toLocaleString('pt-BR')}</b> pessoas (${Math.round(cw.fill * 100)}%), renda de <b>${fmt(cw.gate)}</b>. Pressão da torcida: <b>${push >= 0 ? '+' : '−'}${dec(Math.abs(push))}%</b> de chances.${cw.demand > 1.05 ? ' Procura maior que a capacidade: dá para subir o preço ou ampliar.' : ''}</div>`);
  }
  function lojaCard() {
    const inf = G.infra(S); const li = G.lojaInfo(S); const l = inf.loja; const to = l < 5 ? l + 1 : null;
    const sg = v => `<span class="${v > 0 ? 'pos-c' : v < 0 ? 'neg-c' : 'muted'}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%</span>`;
    const fase = Math.round(li.fase * 100);
    const moments = li.boosts.length ? li.boosts.map(b => `<li><span>${esc(b.txt)}</span><span class="nowrap">${sg(b.pct)} <span class="tiny muted">· ${b.w} ${plural(b.w, 'semana', 'semanas')}</span></span></li>`).join('') : '<li class="muted"><span>Nenhum agora. Títulos, classificações, clássicos vencidos e reforços de peso criam picos.</span></li>';
    return infraCard('loja',
      `<span>Camisa${hint('Preço da camisa oficial na sua série e quanto fica para o clube em cada uma.')}</span><b class="num">R$ ${li.price} <span class="muted">· lucro R$ ${li.profit}</span></b>`
      + `<span>Por semana${hint('Camisas que a torcida compra por semana agora e o lucro que isso deixa no caixa.')}</span><b class="num">${li.demand.toLocaleString('pt-BR')} · <span class="pos-c">+${fmt(li.weekProfit)}</span></b>`
      + `<span>Pontos de venda${hint('Cada nível vende 35% a mais que o nível 1.')}</span>${cmp('×' + dec(li.lv, 2), to && '×' + dec(1 + 0.35 * (to - 1), 2))}`
      + `<span>Manutenção</span>${cmp(fmt(maintOf('loja', l)) + '/sem.', to && fmt(maintOf('loja', to)) + '/sem.')}`,
      `<div class="eyebrow" style="margin-top:14px">O que move a venda</div>
       <ul class="why">
         <li><span>Torcida${hint('Tamanho da torcida e série do clube. É a base da venda.')}</span><span class="num">${li.base.toLocaleString('pt-BR')} camisas</span></li>
         <li><span>Fase do time${hint('Resultados recentes e clima da torcida. Vitórias animam, derrotas esfriam.')}</span>${sg(fase)}</li>
         <li><span>Ídolo${hint('O jogador que mais vende camisa no elenco, pela nota, pelos gols e pelas assistências. Craque acima do padrão da série vende mais; vender o ídolo esfria a torcida.')}</span><span>${li.idol ? `${esc(li.idol.n)} ${sg(li.idol.pct)}` : '–'}</span></li>
       </ul>
       <div class="eyebrow" style="margin-top:12px">Momentos${hint('Picos de venda com prazo. O efeito diminui a cada semana até acabar.')}</div>
       <ul class="why">${moments}</ul>`);
  }
  function vEstrutura() {
    const inf = G.infra(S);
    return `<section class="card"><div class="head"><h2>Estrutura do clube${hint('Obras melhoram o clube de vez, mas custam caixa agora e manutenção toda semana. Só uma obra por vez.')}</h2><span class="small muted">Caixa <b class="num ${club(me()).cash < 0 ? 'neg-c' : ''}">${fmt(club(me()).cash)}</b></span></div>
        ${inf.build ? buildBar(null) : '<p class="small" style="margin:0">Nenhuma obra em andamento. Escolha a próxima abaixo: uma por vez.</p>'}
        <p class="tiny muted" style="margin:8px 0 0">Manutenção total: ${fmt(G.infraMaint(inf))} por semana. Os níveis iniciais são uma estimativa do jogo pelo tamanho do clube, não a estrutura real.</p></section>
      <div class="grid g2">${ctCard()}${baseCard()}${estadioCard()}${lojaCard()}</div>`;
  }
  function centralClubCard() {
    const inf = G.infra(S); const li = G.lojaInfo(S); const np = inf.prospects.length;
    const top = li.boosts.slice().sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
    const lines = [];
    if (inf.build) lines.push(buildBar(null)); else lines.push(`<p class="small muted" style="margin:0">Nenhuma obra em andamento.</p>`);
    if (np) lines.push(`<div class="row between small" style="margin-top:8px"><span><b>${np} ${plural(np, 'garoto', 'garotos')}</b> na base</span><button class="btn ghost" data-act="goInfra" data-v="inf-base">Ver base</button></div>`);
    lines.push(`<div class="row between small" style="margin-top:8px"><span><b>Loja:</b> ${li.demand.toLocaleString('pt-BR')} camisas por semana${top ? ` · ${esc(top.txt)} <span class="${top.pct >= 0 ? 'pos-c' : 'neg-c'}">${top.pct >= 0 ? '+' : '−'}${Math.abs(top.pct)}%</span>` : ''}</span><button class="btn ghost" data-act="goInfra" data-v="inf-loja">Ver loja</button></div>`);
    return `<section class="card"><div class="head"><h2>Estrutura${hint('Obras, base e loja do clube. Tudo fica em Clube > Estrutura.')}</h2><button class="btn ghost" data-act="goInfra" ${tipA('Abre CT, base, estádio e loja.')}>Abrir</button></div>${lines.join('')}</section>`;
  }
  function sheetVerba() {
    const vi = G.verbaInfo(S); const r = U.sheet.res;
    const opts = vi.opts.map(o => `<div class="verba"><div class="row between"><b>${o.name} · ${fmt(o.amount)}</b><span class="tag ${o.chance >= 0.7 ? 'good' : o.chance >= 0.4 ? 'gold' : 'bad'}">${Math.round(o.chance * 100)}% de chance</span></div>
      <p class="small muted" style="margin:4px 0 8px">${o.press ? `Se aprovar e você não cumprir a meta, a confiança cai mais ${o.press} no fim da temporada.` : 'Sem cobrança extra no fim da temporada.'} Se a diretoria negar, a confiança cai ${o.fail}.</p>
      <button class="btn ${o.chance >= 0.5 ? 'primary' : ''} block" data-act="askVerba" data-k="${o.k}" ${!vi.open || vi.used ? 'disabled' : ''}>Pedir verba ${o.name.toLowerCase()}</button></div>`).join('');
    return `<div class="row between" style="margin-bottom:12px"><h2 class="disp sheet-t" style="text-transform:uppercase;line-height:1">Verba da diretoria</h2><button class="btn" data-act="closeSheet">Fechar</button></div>
      ${r ? `<div class="notice ${r.approved ? 'good' : 'bad'}" style="margin-bottom:12px">${r.approved ? `<b>Aprovado!</b> ${fmt(r.amount)} entraram no caixa.${r.press ? ` A cobrança da meta aumentou (${r.press} de confiança em jogo).` : ''}` : `<b>Negado.</b> A confiança caiu ${r.fail}.`}</div>` : ''}
      <p class="small" style="margin:0 0 12px">Um pedido por janela de transferências. A chance depende da confiança da diretoria, hoje em <b>${Math.round(S.board.conf)}</b>.${!vi.open ? ' <b>A janela está fechada.</b>' : vi.used && !r ? ' <b>Você já pediu nesta janela.</b>' : ''}${vi.pressure ? ` Cobrança extra acumulada: ${vi.pressure}.` : ''}</p>
      <div class="stack" style="gap:12px">${opts}</div>`;
  }

  function vClube() {
    const c = club(me()); const wb = G.wageBill(S, me());
    const lv = S.coach.level; const inf = G.infra(S);
    const tab = U.cb || 'estrutura';
    const tabs = [['estrutura', 'Estrutura'], ['gestao', 'Finanças'], ['carreira', 'Carreira'], ['ajustes', 'Ajustes']];
    const seg = `<div class="seg wide" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="cbTab" data-v="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'estrutura') body = vEstrutura();
    else if (tab === 'gestao') {
      const cw = G.crowd(S, me(), null);
      body = `<div class="grid g2">
        <section class="card"><div class="head"><h2>Finanças${hint('Entradas: cota de TV e patrocínio toda semana, bilheteria nos jogos em casa, loja, cotas da Copa e bônus dos objetivos. Saídas: folha salarial, manutenção da estrutura e obras.')}</h2></div>
          <div class="fin"><span>Caixa</span><b class="num ${c.cash < 0 ? 'neg-c' : ''}">${fmt(c.cash)}</b><span>Cota de TV</span><b class="num pos-c">+${fmt(c.tv)} por semana</b>${sponsorRows()}<span>Folha salarial</span><b class="num neg-c">${fmt(-wb)} por semana</b><span>Manutenção da estrutura</span><b class="num ${G.infraMaint(inf) ? 'neg-c' : ''}">${G.infraMaint(inf) ? fmt(-G.infraMaint(inf)) : 'R$ 0'} por semana</b><span>Lucro da loja (última semana)</span><b class="num pos-c">+${fmt(inf.salesWk)}</b><span>Teto da folha${hint(FOLHA_TIP)}</span><b class="num">${fmt(c.wageCap)}</b><span>Ingresso${hint('Preço atual do ingresso. Muda em Clube > Estrutura > Estádio.')}</span><b class="num">R$ ${cw.price} · ${G.TICKET_NAME[inf.ticket].toLowerCase()}</b>${S.cupEarned ? `<span>Cotas da Copa do Brasil${hint('Valores reais da CBF para 2026, pagos a cada fase que o clube disputa.')}</span><b class="num pos-c">+${fmt(S.cupEarned)} na temporada</b>` : ''}</div>
          <div class="eyebrow" style="margin-top:16px">Últimos lançamentos${hint('Cada entrada e saída de dinheiro, da mais recente para a mais antiga.')}</div>
          <div class="fin small" style="margin-top:6px">${S.finance.slice(0, 12).map(f => `<span>S${T.weekNo(Math.min(f.r, G.WEEKS) - 1)} · ${esc(f.txt)}</span><b class="num ${f.amount < 0 ? 'neg-c' : 'pos-c'}">${f.amount < 0 ? '' : '+'}${fmt(f.amount)}</b>`).join('') || '<span class="muted">Nada ainda. A primeira semana mexe no caixa.</span><span></span>'}</div></section>
        <section class="card"><div class="head"><h2>Diretoria${hint(CONF_TIP)}</h2><span class="tag ${S.board.conf < 30 ? 'bad' : 'good'}">${S.board.conf < 30 ? 'Cargo em risco' : 'Cargo estável'}</span></div>
          <div class="meter ${S.board.conf < 30 ? 'warn' : ''}"><div class="lbl">Confiança</div><div class="v num">${Math.round(S.board.conf)}</div><div class="bar"><i style="width:${S.board.conf}%"></i></div></div>
          <ul class="small" style="margin:12px 0 0;padding-left:18px"><li>Meta: ${S.board.target.label}. Hoje: ${G.position(S)}º ${c.div === 'D' ? 'no grupo' : 'na ' + DIVN[c.div]}.</li><li>Cada resultado é comparado com o esperado pela força dos elencos e pelo mando: vencer fora um time bem mais forte rende até +5; perder em casa para um bem mais fraco tira até −5.</li><li>Nos jogos da liga, a partir do 8º, longe da meta tira 1 ou 2; dentro dela soma 1.</li><li>Caixa negativo tira 2 por jogo.</li><li>A partir do 10º jogo da liga, abaixo de 15 por 3 jogos da liga seguidos e mais de 2 posições abaixo da meta: demissão.</li><li>Fim de temporada: meta cumprida soma 15; acesso soma mais 10, rebaixamento tira 10.</li>${inf.pressure ? `<li><b>Verba extra aprovada:</b> se não cumprir a meta, a confiança cai mais ${inf.pressure} no fim da temporada.</li>` : ''}</ul>
          <button class="btn block" style="margin-top:12px" data-act="verba" ${tipA('Pede dinheiro extra para reforços. Uma vez por janela; a chance depende da confiança.')}>Pedir verba à diretoria</button></section>
      </div>`;
    } else if (tab === 'carreira') {
      const achs = Object.entries(G.ACH).map(([k, [n, d]]) => `<div class="ach ${S.achievements[k] ? 'on' : ''}"><span class="ic">${S.achievements[k] ? IC.star : IC.lock}</span><span><b>${n}</b><span>${d}</span></span></div>`).join('');
      const unl = Object.entries(G.UNLOCKS).map(([l, items]) => `<div><span class="tag ${lv >= +l ? 'good' : ''}">${lv >= +l ? 'Liberado' : 'Nível ' + l}</span>${items.join(', ')}</div>`).join('');
      const pers = E.PERSONAS[S.coach.persona];
      body = `<div class="grid g2"><div class="stack">
        <section class="card"><div class="head"><h2>Técnico${hint('Seu estilo dá um efeito fixo em todas as partidas. O nível sobe com XP e libera formações e recursos.')}</h2></div>
          <div class="row nowrap" style="margin-bottom:12px">${avatarSVG(S.coach.avatar, me(), 72)}<div class="stack" style="gap:4px"><div class="row" style="gap:8px"><b style="font-size:20px">${esc(S.coach.name)}</b><span class="tag blue">${pers.label}</span></div><button class="btn ghost" data-act="editAvatar" style="justify-self:start;padding-inline:0;min-height:32px" ${tipA('Muda pele, cabelo, barba e óculos do técnico.')}>Editar visual</button></div></div>
          <p class="small" style="margin:0 0 12px">${pers.match}</p>
          ${levelCard().replace('<section class="card">', '<div>').replace('</section>', '</div>')}
          <div class="unlocks">${unl}</div></section>
        ${formacaoCard()}
        <section class="card"><div class="head"><h2>Liga com amigos${hint('Ainda é prévia: o modo online chega numa próxima fase.')}</h2><span class="tag">Prévia</span></div><p class="small" style="margin:0 0 12px">Cada amigo comanda um clube do mesmo campeonato; a rodada roda quando todos confirmam.</p><button class="btn primary" data-act="go" data-v="liga">Abrir liga com amigos</button></section></div>
        <section class="card"><div class="head"><h2>Conquistas${hint('Marcos da carreira. Cada conquista vale 50 XP.')}</h2><span class="small muted">${Object.keys(S.achievements).length} de ${Object.keys(G.ACH).length}</span></div><div class="achs">${achs}</div></section>
      </div>`;
    } else {
      body = `<div class="grid g2">
        <section class="card"><div class="head"><h2>Opções${hint('Ajustes do jogo neste navegador.')}</h2></div>
          <label class="toggle"><input type="checkbox" data-act="assist" ${S.coach.assist !== false ? 'checked' : ''}><span><b>Auxiliar ajuda nas trocas</b><span class="small muted">Poupa titular esgotado antes do jogo e troca cansados ou lesionados durante a partida (até 3 trocas). A postura é sempre sua.</span></span></label>
          <div class="row" style="margin-top:12px"><button class="btn" data-act="sound" ${tipA('Liga ou desliga os sons do jogo.')}>${U.settings.sound ? IC.sound + ' Som ligado' : IC.mute + ' Som desligado'}</button>
          ${U.confirmNew ? `<button class="btn danger" data-act="newCareerYes">Confirmar: apagar esta carreira</button><button class="btn ghost" data-act="newCareerNo">Cancelar</button>` : `<button class="btn danger" data-act="newCareer" ${tipA('Apaga a carreira deste navegador e começa do zero. Pede confirmação antes.')}>Nova carreira</button>`}</div>
          <p class="tiny muted" style="margin:10px 0 0">O jogo salva sozinho neste navegador depois de cada semana.</p></section>
        ${crestCard()}
      </div>`;
    }
    return `<div class="stack" style="max-width:1100px;margin:0 auto">${seg}${body}</div>`;
  }

  // ---------- escudos (arquivos fornecidos pelo usuario) ----------
  const crestMultiBtn = cls => `<label class="${cls}" style="cursor:pointer"><input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" multiple data-crest-multi hidden>Carregar escudos</label>`;
  function crestCard() {
    const n = Object.keys(CRESTS).length;
    const rows = E.CLUBS.filter(c => !S || (U.crestAll || club(c.id).div === club(me()).div)).map(c => `<div class="crest-row">${badge(c.id)}<span class="small"><b>${esc(c.name)}</b> <span class="muted">${c.id}</span></span><span class="row nowrap" style="gap:6px;margin-left:auto"><label class="btn" style="min-height:36px;padding:4px 12px;cursor:pointer"><input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" data-crest="${c.id}" hidden>${CRESTS[c.id] ? 'Trocar' : 'Escolher'}</label>${CRESTS[c.id] ? `<button class="btn ghost" style="min-height:36px" data-act="crestDel" data-id="${c.id}" aria-label="Remover escudo do ${esc(c.name)}">Remover</button>` : ''}</span></div>`).join('');
    return `<section class="card"><div class="head"><h2>Escudos${hint('Carregue os arquivos de escudo que você tem. Ficam só neste navegador.')}</h2><span class="small muted">${n} de ${E.CLUBS.length}</span></div>
      <p class="small" style="margin:0 0 10px">Carregue os arquivos oficiais (PNG, SVG, JPG ou WebP). O nome do arquivo identifica o clube: sigla (<b>FLA.png</b>) ou nome (<b>sao-paulo.svg</b>). Clube sem arquivo usa o selo com as cores.</p>
      <div class="row" style="gap:8px;margin-bottom:8px">${crestMultiBtn('btn primary')}${n ? `<button class="btn ghost" data-act="crestClear">Remover todos</button>` : ''}</div>
      <div class="crest-list">${rows}</div>${S ? `<button class="btn ghost" data-act="crestAll" style="margin-top:6px">${U.crestAll ? 'Mostrar só a sua série' : `Mostrar os ${E.CLUBS.length} clubes`}</button>` : ''}
      <p class="tiny muted" style="margin:10px 0 0">Ficam salvos só neste navegador, reduzidos para 128 px.</p></section>`;
  }
  const normName = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const CREST_ALIAS = { FLA: ['mengao'], CAM: ['atletico mg', 'atletico mineiro', 'galo', 'cam'], CAP: ['athletico', 'athletico pr', 'cap', 'furacao'], RBB: ['red bull bragantino', 'rb bragantino', 'rbb'], SAO: ['spfc'], VAS: ['vasco'], INT: ['inter'], CHA: ['chape'], REM: ['clube do remo'], COR: ['timao'], SAN: ['santos fc'], GRE: ['gremio fbpa'] };
  function matchCrest(fileName) {
    const base = normName(fileName.replace(/\.[a-z0-9]+$/i, ''));
    const al = [];
    E.CLUBS.forEach(c => { [c.id.toLowerCase(), normName(c.name)].concat(CREST_ALIAS[c.id] || []).forEach(a => al.push([a, c.id])); });
    const exact = al.find(([a]) => a === base); if (exact) return exact[1];
    const hit = al.filter(([a]) => a.length > 3 && (' ' + base + ' ').includes(' ' + a + ' ')).sort((x, y) => y[0].length - x[0].length)[0];
    return hit ? hit[1] : null;
  }
  function crestFromFile(file) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type) && !/\.svg$/i.test(file.name)) return rej(new Error('formato'));
      if (file.size > 6e6) return rej(new Error('grande'));
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('leitura'));
      fr.onload = () => { const img = new Image(); img.onload = () => { try { const S2 = 128, w = img.naturalWidth || S2, h = img.naturalHeight || S2, k = Math.min(S2 / w, S2 / h); const cv = document.createElement('canvas'); cv.width = S2; cv.height = S2; const ctx = cv.getContext('2d'); ctx.drawImage(img, (S2 - w * k) / 2, (S2 - h * k) / 2, w * k, h * k); res(cv.toDataURL('image/png')); } catch (e) { rej(e); } }; img.onerror = () => rej(new Error('imagem')); img.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  async function addCrests(files, forced) {
    const ok = [], miss = [];
    for (const f of files) { const id = forced || matchCrest(f.name); if (!id) { miss.push(f.name); continue; } try { CRESTS[id] = await crestFromFile(f); ok.push(id); } catch (e) { miss.push(f.name); } }
    const stored = saveCrests(); render();
    if (ok.length) toast(`${ok.length} ${plural(ok.length, 'escudo carregado', 'escudos carregados')}: ${ok.join(', ')}.${stored ? '' : ' O navegador não deixou salvar: valem até fechar a página.'}`, 'gold', 4200);
    if (miss.length) toast(`Sem clube identificado: ${miss.slice(0, 4).map(esc).join(', ')}${miss.length > 4 ? '…' : ''}. Use a sigla no nome do arquivo ou o botão do clube.`, 'bad', 5200);
  }
  document.addEventListener('change', e => {
    const t = e.target; if (!t.files || !t.files.length) return;
    if (t.matches('input[data-crest-multi]')) addCrests(Array.from(t.files));
    else if (t.matches('input[data-crest]')) addCrests([t.files[0]], t.dataset.crest);
  });

  // ---------- liga com amigos (previa) ----------
  function vLiga() {
    const L = U.liga;
    return `<div class="stack" style="max-width:760px;margin:0 auto">
      <section class="card stack"><div class="head" style="margin:0"><h2>Liga com amigos${hint('Prévia: códigos e convites ainda não funcionam. O modo online precisa de servidor.')}</h2><span class="tag">Prévia da fase 2</span></div>
        <p style="margin:0">Cada amigo assume um clube do mesmo Brasileirão. A rodada roda no servidor quando todos confirmam a escalação ou no horário que o criador definir. Quem não confirmar joga com a última escalação salva.</p>
        <ol class="small" style="margin:0;padding-left:20px"><li>Crie a liga e mande o código no grupo.</li><li>Seus amigos entram e escolhem clubes livres.</li><li>Antes de cada rodada, defina o plano de jogo: até 3 ordens como "vencendo por 1 aos 70', ir para retranca".</li><li>Todo mundo assiste ao replay com as ordens disparando.</li></ol>
        <div class="notice warn small">Neste protótipo os convites ainda não funcionam: as contas e a liga online chegam com o Supabase.</div></section>
      <div class="grid g2">
        <section class="card stack"><h2>Criar liga</h2>
          ${L ? `<div class="eyebrow">Código da liga</div><div class="code">${L}</div><div class="row"><button class="btn" data-act="copyCode">Copiar código</button></div>
            <div class="plist"><div class="prow" style="cursor:default">${badge(me())}<span class="who"><b>${esc(S.coach.name)}</b><span>${esc(club(me()).name)} · criador</span></span><span class="tag good">Pronto</span></div>${[1, 2, 3].map(i => `<div class="prow" style="cursor:default"><span class="badge" style="--c1:var(--sup2);--c2:var(--linha);color:var(--tinta2)">?</span><span class="who"><b class="muted">Vaga ${i}</b><span>Aguardando amigo</span></span><span></span></div>`).join('')}</div>` : `<p class="small muted" style="margin:0">Gera um código de 6 letras para compartilhar.</p><button class="btn primary" data-act="makeLeague">Gerar código</button>`}</section>
        <section class="card stack"><h2>Entrar com código</h2><label class="sr" for="join-code">Código da liga</label><input id="join-code" class="txt disp" maxlength="6" placeholder="EX: K7PQ2M" style="text-transform:uppercase;letter-spacing:.2em;font-size:24px">
          <button class="btn" data-act="joinLeague">Entrar na liga</button><div id="join-msg"></div></section>
      </div></div>`;
  }

  // ---------- partida ----------
  function evText(e, m) {
    const us = m.userSide; const cn = si => esc(club(m.side[si].club).name);
    switch (e.t) {
      case 'goal': return `<span class="k">Gol</span><b class="who">GOL DO ${cn(e.side).toUpperCase()}!</b> ${esc(e.pn)}, ${e.kind}. ${e.an ? `Assistência de ${esc(e.an)}.` : ''} <b>${e.score[0]} × ${e.score[1]}</b>`;
      case 'chance': return `<span class="k">Chance</span>${({ save: `${esc(e.pn)} finaliza e ${esc(e.gk)} defende.`, wide: `${esc(e.pn)} manda para fora.`, post: `Na trave! ${esc(e.pn)} quase marca.`, block: `${esc(e.pn)} chuta e a zaga bloqueia.` })[e.kind]} <span class="muted tiny">(${cn(e.side)})</span>`;
      case 'penmiss': return `<span class="k">Pênalti</span><b>${e.saved ? `${esc(e.gk)} defende o pênalti de ${esc(e.pn)}!` : `${esc(e.pn)} cobra o pênalti para fora!`}</b>`;
      case 'yellow': return `<span class="k">Cartão</span>Amarelo para ${esc(e.pn)} (${cn(e.side)}).`;
      case 'red': return `<span class="k">Expulsão</span><b>Vermelho! ${esc(e.pn)} é expulso.</b> ${cn(e.side)} com um a menos.`;
      case 'injury': return `<span class="k">Lesão</span>${esc(e.pn)} sente e ${e.side === us ? 'precisa sair: faça a troca.' : 'é substituído.'}`;
      case 'ht': return `<span class="k">Intervalo</span>Fim do primeiro tempo: ${e.score[0]} × ${e.score[1]}.`;
      case 'ft': return `<span class="k">Fim</span><b>Fim de jogo: ${e.score[0]} × ${e.score[1]}.</b>`;
      case 'sub': return e.auto ? `<span class="k">Auxiliar</span>Troca por ${e.auto}: sai ${esc(e.out)}, entra ${esc(e.in)}.` : `<span class="k">Troca</span>${cn(e.side)}: sai ${esc(e.out)}, entra ${esc(e.in)}.`;
      case 'ment': return `<span class="k">Postura</span>${cn(e.side)} muda para ${E.MENT[e.v].label.toLowerCase()}.`;
      case 'coach': return `<span class="k">Técnico</span>${esc(e.txt)}`;
      default: return '';
    }
  }

  function vMatch() {
    const m = U.match; const h = m.side[0].club, a = m.side[1].club;
    return `<div class="match">
      <div class="comp-lbl">${esc(m.fx ? m.fx.label : '')}</div>
      <div class="score" id="score"><div class="sb">
        <div class="t">${badge(h)}<span>${esc(club(h).name)}</span></div>
        <div class="g num" id="sc">${m.score[0]} × ${m.score[1]}</div>
        <div class="t away"><span>${esc(club(a).name)}</span>${badge(a)}</div></div>
        <div class="clock"><span id="clk">0'</span><span>·</span><span id="ments"></span></div>
        <div class="prog"><i id="prog" style="width:0%"></i><span id="marks"></span></div></div>
      <div class="match-layout">
        <div class="stack" style="gap:12px">
          <div class="mini-pitch" id="mp"><div class="l"></div><div class="gl"></div><div class="gr"></div><div class="ball" id="ball" style="left:50%;top:50%"></div></div>
          <div class="stats3" id="stats"></div>
        </div>
        <section class="card"><div class="head"><h2>Narração${hint('Lances do jogo, do mais recente para o mais antigo. Os gols do seu time aparecem em destaque.')}</h2><span class="tiny muted">${m.side[m.userSide].human ? 'Você é o ' + esc(club(me()).name) : ''}</span></div><div class="feed" id="feed"></div></section>
      </div>
      <div class="controls" id="ctl"></div>
    </div>`;
  }

  function matchControls() {
    const ms = U.ms, m = U.match;
    if (m.done) return `<button class="btn primary big block" data-act="finishMatch">Ver resumo do jogo</button>`;
    return `<div class="seg" role="group" aria-label="Velocidade">${[1, 2, 4].map(s => `<button data-act="speed" data-v="${s}" aria-pressed="${ms.speed === s}" ${tipA('Velocidade da narração: ' + s + '×.')}>${s}×</button>`).join('')}</div>
      <button class="btn primary" style="flex:1" data-act="openMoment" data-v="manual" ${tipA('Pausa o jogo para mudar a postura ou fazer substituições.')}>${ms.running ? 'Mexer<span class="hide-sm"> no time</span>' : 'Ajustar<span class="hide-sm"> e voltar</span>'}</button>
      <button class="btn" data-act="skip" ${tipA('Simula até o fim sem paradas. Lesionados são trocados sozinhos.')}>Pular</button>
      <button class="btn" data-act="sound" aria-label="${U.settings.sound ? 'Desligar som' : 'Ligar som'}" ${tipA(U.settings.sound ? 'Desligar som' : 'Ligar som')}>${U.settings.sound ? IC.sound : IC.mute}</button>`;
  }

  function updateMatchUI(newEvents = []) {
    const m = U.match; if (!m || U.view !== 'match') return;
    const us = m.userSide;
    const $ = id => document.getElementById(id);
    const sc = $('sc'); if (!sc) return;
    sc.textContent = `${m.score[0]} × ${m.score[1]}`;
    $('clk').textContent = m.done ? 'Encerrado' : (m.minute > 45 && m.minute < 46 ? 'Intervalo' : `${m.minute}'`) + (m.half === 2 && m.minute === 45 ? ' · intervalo' : '');
    $('ments').textContent = `${E.MENT[m.side[0].ment].label} × ${E.MENT[m.side[1].ment].label}`;
    $('prog').style.width = (m.minute / 90 * 100) + '%';
    $('marks').innerHTML = m.events.filter(e => e.t === 'goal').map(e => `<b style="left:${e.min / 90 * 100}%;background:${e.side === us ? 'var(--ouro)' : '#fff'}"></b>`).join('');
    const poss = m.minute ? Math.round(m.possAcc / m.minute * 100) : 50;
    const xg = [m.side[0].xg, m.side[1].xg];
    const st3 = [['Posse', poss + '%', (100 - poss) + '%', poss], ['Finalizações', m.side[0].shots, m.side[1].shots, m.side[0].shots / Math.max(1, m.side[0].shots + m.side[1].shots) * 100], ['Gols esperados', xg[0].toFixed(1), xg[1].toFixed(1), xg[0] / Math.max(0.01, xg[0] + xg[1]) * 100]];
    $('stats').innerHTML = st3.map(([l, x, y, p]) => `<div class="stat" ${tipA(MATCH_TIP[l])}><div class="lbl">${l}</div><div class="vv num"><span>${x}</span><span>${y}</span></div><div class="split"><i style="width:${p}%"></i><em style="flex:1"></em></div></div>`).join('');
    const feed = $('feed');
    newEvents.forEach(e => { const txt = evText(e, m); if (!txt) return; const d = document.createElement('div'); d.className = 'ev ' + (e.t === 'goal' ? 'goal ' : '') + (e.side === us ? 'mine' : ''); d.innerHTML = `<span class="m">${e.t === 'ft' ? 'FIM' : e.min + "'"}</span><span>${txt}</span>`; feed.prepend(d); });
    $('ctl').innerHTML = matchControls();
  }

  function animateBall(side, goal) {
    const b = document.getElementById('ball'); if (!b) return;
    const x = side === 0 ? (goal ? 95 : 72 + Math.random() * 16) : (goal ? 5 : 12 + Math.random() * 16);
    b.style.left = x + '%'; b.style.top = (goal ? 50 : 30 + Math.random() * 40) + '%';
    if (goal) { const mp = document.getElementById('mp'); const f = document.createElement('div'); f.className = 'goal-flash'; f.textContent = 'GOL!'; mp.appendChild(f); setTimeout(() => f.remove(), 1500); setTimeout(() => { b.style.left = '50%'; b.style.top = '50%'; }, 1200); }
  }
  function idleBall() { const m = U.match; const b = document.getElementById('ball'); if (!b || !m) return; const poss = m.minute ? m.possAcc / m.minute : 0.5; b.style.left = (30 + poss * 40 + (Math.random() - 0.5) * 30) + '%'; b.style.top = (25 + Math.random() * 50) + '%'; }

  function startMatch() {
    const m = G.prepareUserMatch(S); m.startXI = m.side[m.userSide].xi.map(o => o.p).filter(Boolean);
    U.match = m; U.ms = { speed: 1, running: true, timer: null, moments: 0, first: S.round === 0 && S.year === 2026, lastMent: [m.side[0].ment, m.side[1].ment], coachSaid: false };
    S.tipSeen = true;
    U.view = 'match'; render(); whistle(1);
    updateMatchUI([{ t: 'coach', min: 0, txt: `Bola rolando! ${club(me()).name} começa ${E.MENT[m.side[m.userSide].ment].label.toLowerCase()}.` }].concat((m.auxNotes || []).map(n => ({ t: 'coach', min: 0, txt: `Auxiliar: ${n.in} começa no lugar de ${n.out} (${n.why}).` }))));
    tickLoop();
  }
  function tickLoop() { clearTimeout(U.ms.timer); if (!U.ms.running || U.match.done) return; U.ms.timer = setTimeout(tick, 430 / U.ms.speed); }
  function tick() {
    const m = U.match, ms = U.ms; if (!m || m.done || !ms.running) return;
    const us = m.userSide, os = 1 - us;
    E.aiInGame(m, os);
    const aux = E.assistInGame(m, us);
    const evs = aux.concat(E.step(m));
    // mudancas de postura da IA viram evento
    [0, 1].forEach(si => { if (m.side[si].ment !== ms.lastMent[si]) { evs.unshift({ t: 'ment', side: si, min: m.minute, v: m.side[si].ment }); ms.lastMent[si] = m.side[si].ment; } });
    // fala da personalidade do tecnico
    const diff = m.score[us] - m.score[os];
    if (S.coach.persona === 'motivador' && m.minute > 45 && diff < 0 && !ms.coachSaid) { ms.coachSaid = true; evs.push({ t: 'coach', min: m.minute, txt: `${esc(S.coach.name)} vai à beira do campo e empurra o time: mais chances até o fim.` }); }
    const shown = evs.filter(e => e.t !== 'chance' || e.xg > 0.13 || e.kind === 'post');
    updateMatchUI(shown);
    let goalSide = null;
    evs.forEach(e => { if (e.t === 'goal') goalSide = e.side; else if (e.t === 'chance' && e.xg > 0.13) animateBall(e.side, false); });
    if (goalSide != null) { animateBall(goalSide, true); const sc = document.getElementById('sc'); sc.classList.remove('flash'); void sc.offsetWidth; sc.classList.add('flash'); if (goalSide === us) { cheer(); buzz([60, 40, 90]); } else beep(180, 0, 0.35, 'sawtooth', 0.04); }
    else if (m.minute % 3 === 0) idleBall();
    if (m.done) { whistle(3); ms.running = false; updateMatchUI([]); return; }
    // momentos-chave
    let mo = null;
    if (m.minute === 45) mo = 'ht';
    else if (evs.some(e => e.t === 'injury' && e.side === us)) mo = 'injury';
    else if (ms.moments < 3 && evs.some(e => e.t === 'goal' && e.side === os) && m.minute >= 15 && m.minute < 88) mo = 'concede';
    else if (ms.moments < 3 && m.minute === 70 && Math.abs(diff) <= 1) mo = 'reta';
    if (mo) { if (mo !== 'ht' && mo !== 'injury') ms.moments++; openMoment(mo); return; }
    tickLoop();
  }

  function recommend(m) {
    const us = m.userSide, os = 1 - us; const diff = m.score[us] - m.score[os]; const om = m.side[os].ment;
    if (diff >= 1 && m.minute >= 60) return ['retranca', 'Segura o resultado: nas simulações, a retranca mantém a vitória em 83% a 87% dos jogos, contra cerca de 75% atacando.'];
    if (diff < 0 && m.minute >= 45) return ['pressao', 'Para buscar o resultado, a pressão total dobra a chance de reação em relação à retranca.'];
    if (om === 'pressao' || om === 'ofensiva') return ['defensiva', 'O rival se expõe: a defensiva deixa seus contra-ataques 22% mais perigosos.'];
    if (om === 'retranca') return ['pressao', 'Pressão abre retranca: o cerco empurra o rival para trás e aumenta suas chances.'];
    if (om === 'defensiva') return ['equilibrada', 'Contra time fechado, a equilibrada cria sem se expor ao contra-ataque.'];
    return ['equilibrada', 'Jogo parelho: mantenha o equilíbrio e observe a reação do rival.'];
  }

  function openMoment(kind) {
    const m = U.match; U.ms.running = false; clearTimeout(U.ms.timer);
    U.sheet = { type: 'moment', kind, pick: m.side[m.userSide].ment, subOut: null };
    renderSheet(); const c = document.getElementById('ctl'); if (c) c.innerHTML = matchControls();
  }
  function sheetMoment() {
    const m = U.match, sh = U.sheet, us = m.userSide, os = 1 - us, s = m.side[us];
    const diff = m.score[us] - m.score[os];
    const situ = diff > 0 ? `Você vence por ${m.score[us]} a ${m.score[os]}` : diff < 0 ? `Você perde por ${m.score[us]} a ${m.score[os]}` : `Empate em ${m.score[us]} a ${m.score[os]}`;
    const [rec, why] = recommend(m);
    const title = { ht: 'Intervalo', concede: 'Gol sofrido', reta: 'Reta final', injury: 'Lesão', manual: 'Mexer no time' }[sh.kind];
    const first = U.ms.first && sh.kind === 'ht';
    const opts = E.MENT_KEYS.map(k => `<button class="opt" data-act="momentMent" data-v="${k}" aria-pressed="${sh.pick === k}"><b>${E.MENT[k].label}</b>${k === rec ? '<span class="tag gold" style="grid-column:auto;justify-self:end">Recomendado</span>' : '<i></i>'}<span>${E.MENT[k].txt}</span></button>`).join('');
    // substituicoes
    let subs = '';
    if (sh.subOut != null) {
      const out = s.xi[sh.subOut].p;
      subs = `<div class="eyebrow">Quem entra no lugar de ${esc(out ? out.n : '')}?</div><div class="plist">${s.bench.map((p, bi) => p && !p._off ? `<button class="prow" data-act="subIn" data-i="${bi}">${ovr(Math.round(p.ovr * E.fitFactor(s.xi[sh.subOut].slot, p.pos)))}<span class="who"><b>${esc(p.n)}</b><span>${posLbl(p.pos)}${E.fitFactor(s.xi[sh.subOut].slot, p.pos) < 0.92 ? ' · improvisado' : ''}</span></span>${fadiga(p.condLive != null ? p.condLive : p.cond)}</button>` : '').join('')}</div><button class="btn ghost" data-act="subCancel">Voltar</button>`;
    } else {
      subs = `<div class="row between"><div class="eyebrow">Substituições</div><span class="small muted">${s.subs} de 5 feitas</span></div>${s.subs >= 5 ? '<p class="small muted">Você já fez as 5 trocas.</p>' : `<div class="plist">${s.xi.map((o, i) => o.p ? `<button class="prow" data-act="subOut" data-i="${i}">${ovr(o.p.ovr)}<span class="who"><b>${esc(o.p.n)}</b><span>${posLbl(o.slot)}${o.p._hurt ? ' · <b class="neg-c">lesionado</b>' : ''}${o.p._yc ? ' · amarelado' : ''}</span></span>${fadiga(o.p.condLive)}</button>` : '').join('')}</div>`}`;
    }
    return `<div class="moment stack" style="gap:12px">
      <div class="row between"><div class="eyebrow">Momento-chave · ${m.minute}'</div><span class="tag">${title}</span></div>
      <div class="situ"><div class="disp">${situ}</div><div class="small" style="opacity:.85;margin-top:6px">${esc(club(m.side[os].club).name)} joga ${E.MENT[m.side[os].ment].label.toLowerCase()}. Você está ${E.MENT[s.ment].label.toLowerCase()}.</div></div>
      ${first ? `<div class="notice warn small"><b>Primeira decisão.</b> A postura muda o ritmo do jogo e quem fica com as chances. Nos 25 minutos finais o efeito dobra.</div>` : ''}
      <div class="notice info small"><b>Leitura:</b> ${why}</div>
      <div class="opts">${opts}</div>
      ${subs}
      <button class="btn primary big block" data-act="momentGo">Voltar para o jogo</button></div>`;
  }

  function finishMatch() {
    const m = U.match; const report = G.finishRound(S, m);
    report.newAch = (S._newAch || []).splice(0); delete S._newAch;
    U.post = report; U.match = null; U.ms = null; U.view = 'post'; save(); render(); window.scrollTo(0, 0);
    // recompensas em sequencia
    setTimeout(() => { const bar = document.getElementById('xpfill'); if (bar) bar.style.width = bar.dataset.to + '%'; }, 250);
    if (report.res === 'V') { setTimeout(() => confetti(report.gf - report.ga >= 3 ? 110 : 60), 300); }
    let delay = 900;
    report.evolutions.filter(e => e.to > e.from).forEach(e => { setTimeout(() => toast(`<span class="ti">${e.from} → ${e.to}</span><span>${esc(e.n)} evoluiu</span>`, 'gold'), delay); delay += 700; });
    report.achievements.concat(report.newAch).forEach(k => { setTimeout(() => { toast(`<span class="ti">${IC.star}</span><span>Conquista: <b>${G.ACH[k][0]}</b> · +50 XP</span>`, 'gold', 4000); beep(880, 0, 0.15, 'triangle', 0.05); beep(1320, 0.12, 0.25, 'triangle', 0.05); }, delay); delay += 900; });
    if (report.cupQuota) { setTimeout(() => toast(`Copa do Brasil: cota de ${fmt(report.cupQuota)} no caixa.`, 'gold', 3500), delay); delay += 700; }
    if (report.built) { setTimeout(() => toast(`Obra concluída: ${esc(report.built.name)}.`, 'gold', 3500), delay); delay += 700; }
    if (report.levelAfter > report.levelBefore) setTimeout(() => { confetti(90); toast(`<span class="ti">Nível ${report.levelAfter}</span><span>${G.LEVEL_TITLES[report.levelAfter - 1]}${report.unlocks.length ? ' · libera ' + report.unlocks.join(', ') : ''}</span>`, 'gold', 5000); }, delay);
  }

  function tieNotice(t) {
    const me_ = me(); const isA = t.a === me_; const agg = t.g.reduce((x, g) => [x[0] + (isA ? g[0] : g[1]), x[1] + (isA ? g[1] : g[0])], [0, 0]);
    const pen = t.pen ? ` Nos pênaltis, ${isA ? t.pen[0] : t.pen[1]} a ${isA ? t.pen[1] : t.pen[0]}.` : '';
    const what = t.label ? esc(t.label.split(' · ')[0]) : 'Mata-mata';
    return `<section class="notice ${t.won ? 'good' : 'bad'}"><b>${t.won ? 'Classificado!' : 'Eliminado.'}</b> ${what}: ${t.legs === 2 ? `placar somado ${agg[0]} a ${agg[1]}.` : `${agg[0]} a ${agg[1]}.`}${pen}</section>`;
  }
  function vPost() {
    const r = U.post; const fx = S.lastMatch.fx; const words = { V: 'Vitória', E: 'Empate', D: 'Derrota' };
    const goals = S.lastMatch.events.filter(e => e.t === 'goal');
    const xpBeforePct = (() => { const lv = r.levelBefore; const cur = G.LEVELS[lv - 1] || 0, nxt = G.LEVELS[lv] || cur + 1000; return Math.min(100, (r.xpBefore - cur) / (nxt - cur) * 100); })();
    const lv = S.coach.level; const cur = G.LEVELS[lv - 1] || 0, nxt = G.LEVELS[lv] || cur + 1000; const toPct = Math.min(100, (S.coach.xp - cur) / (nxt - cur) * 100);
    const fin = r.finance || {}; const total = (fin.tv || 0) + (fin.wage || 0) + (fin.gate || 0) + (fin.bonus || 0) + (fin.sponsor || 0) + (fin.winBonus || 0) + (fin.loja || 0) + (fin.maint || 0) + (r.cupQuota || 0) + (r.contPrize || 0);
    const myIsHome = fx.home;
    return `<div class="stack reveal" style="max-width:760px;margin:0 auto">
      <section class="result ${r.res}"><div class="eyebrow" style="color:rgba(255,255,255,.85)">${esc(S.lastMatch.label || '')} · ${fx.neutral ? 'campo neutro' : fx.isHome ? 'em casa' : 'fora'}</div>
        <div class="row" style="justify-content:center;gap:16px;margin-top:8px">${badge(fx.h, 'lg')}<span class="big num">${S.lastMatch.score[0]} × ${S.lastMatch.score[1]}</span>${badge(fx.a, 'lg')}</div>
        <div class="word" style="margin-top:6px">${words[r.res]}</div>
        <div class="small" style="opacity:.9">${goals.map(g => `${esc(g.pn)} ${g.min}'`).join(' · ') || 'Sem gols'}</div></section>
      ${r.tie ? tieNotice(r.tie) : ''}
      ${r.mvp ? `<section class="card row between"><div><div class="eyebrow">Craque da partida</div><b style="font-size:20px">${esc(r.mvp.n)}</b><div class="small muted">${esc(club(r.mvp.club).name)}</div></div><span class="ovr t1" style="font-size:26px;height:44px;min-width:60px">${r.mvp.r.toFixed(1)}</span></section>` : ''}
      <section class="card"><div class="head"><h2>Objetivos${hint(OBJ_TIP)}</h2><span class="xp">+${r.xp} XP</span></div>
        ${r.objectives.map(o => `<div class="obj ${o.done ? 'done' : ''}"><span class="box">${o.done ? IC.check : ''}</span><span class="t">${esc(o.txt)}</span><span class="xp">${o.done ? '+' + o.xp : ''}</span></div>`).join('')}
        <div class="lvl" style="margin-top:12px"><div class="n">${lv}</div><div style="flex:1"><div class="row between small"><b>${G.LEVEL_TITLES[lv - 1]}</b><span class="muted num">${S.coach.xp - cur} / ${nxt - cur} XP</span></div><div class="xpbar" style="margin-top:6px"><i id="xpfill" data-to="${toPct}" style="width:${r.levelAfter > r.levelBefore ? 0 : xpBeforePct}%"></i></div></div></div></section>
      ${r.evolutions.length ? `<section class="card"><div class="head"><h2>Evolução${hint('Jogadores de até 23 anos podem subir a nota quando jogam bem. Acima de 31, atuações ruins podem baixar.')}</h2></div>${r.evolutions.map(e => `<div class="evo">${ovr(e.to)}<b style="flex:1">${esc(e.n)}</b><span class="${e.to > e.from ? 'up' : 'dn'}">${e.from} → ${e.to}</span></div>`).join('')}</section>` : ''}
      <section class="card"><div class="head"><h2>Notas do time${hint('Nota de cada jogador na partida, de 4 a 10. Verde: 7 ou mais. Vermelho: abaixo de 6.')}</h2></div><div class="row" style="gap:6px">${r.myRatings.slice(0, 14).map(p => `<span class="chip" style="cursor:default">${esc(shortN(p.n))} <b class="${p.r >= 7 ? 'pos-c' : p.r < 6 ? 'neg-c' : ''}">${p.r.toFixed(1)}</b></span>`).join('')}</div></section>
      <div class="grid g2">
        <section class="card"><div class="head"><h2>Caixa${hint('O que entrou e saiu do caixa nesta semana.')}</h2></div><div class="fin">${r.mid ? '<span class="muted" style="grid-column:1/-1">Jogo de meio de semana: salário, cota de TV e patrocínio caem na semana do Brasileirão.</span>' : `<span>Cota de TV</span><b class="num pos-c">+${fmt(fin.tv || 0)}</b>`}${fin.sponsor ? `<span>Patrocínio · ${esc(r.sponsorName || '')}</span><b class="num pos-c">+${fmt(fin.sponsor)}</b>` : ''}${fin.winBonus ? `<span>Bônus por vitória</span><b class="num pos-c">+${fmt(fin.winBonus)}</b>` : ''}${r.mid ? '' : `<span>Folha</span><b class="num neg-c">${fmt(fin.wage || 0)}</b>`}${fin.gate ? `<span>Bilheteria · ${(r.attendance || 0).toLocaleString('pt-BR')} pessoas${r.fill != null ? ` (${Math.round(r.fill * 100)}%)` : ''}</span><b class="num pos-c">+${fmt(fin.gate)}</b>` : ''}${fin.bonus ? `<span>Bônus dos objetivos</span><b class="num pos-c">+${fmt(fin.bonus)}</b>` : ''}${fin.loja ? `<span>Loja · lucro das camisas</span><b class="num pos-c">+${fmt(fin.loja)}</b>` : ''}${fin.maint ? `<span>Manutenção da estrutura</span><b class="num neg-c">${fmt(fin.maint)}</b>` : ''}${r.cupQuota ? `<span>Cota da Copa do Brasil</span><b class="num pos-c">+${fmt(r.cupQuota)}</b>` : ''}${r.contPrize ? `<span>Prêmio da CONMEBOL${hint('Valores da CONMEBOL 2026 em dólar, convertidos a R$ 5,30 (câmbio fixo do jogo): cota por jogo em casa e por vitória na fase de grupos, prêmio por fase alcançada e pela final.')}</span><b class="num pos-c">+${fmt(r.contPrize)}</b>` : ''}<span class="tot">Saldo da semana</span><b class="tot num ${total < 0 ? 'neg-c' : 'pos-c'}">${total < 0 ? '' : '+'}${fmt(total)}</b></div></section>
        <section class="card"><div class="head"><h2>Diretoria${hint('Variação da confiança neste jogo: o resultado comparado com o esperado pela força dos times e pelo mando, mais o ajuste por estar dentro ou longe da meta.')}</h2></div><div class="row between"><span>Confiança</span><b class="disp" style="font-size:28px">${Math.round(S.board.conf)} <span class="${r.conf >= 0 ? 'pos-c' : 'neg-c'}" style="font-size:20px">${r.conf >= 0 ? '+' : ''}${r.conf}</span></b></div>${r.compKey && G.position(S, me(), r.compKey) ? `<div class="row between"><span>Posição · ${esc(keyName(r.compKey))}</span><b class="disp" style="font-size:28px">${G.position(S, me(), r.compKey)}º</b></div>` : ""}<p class="small muted" style="margin:6px 0 0">Meta: ${S.board.target.label}.</p>${r.offers ? `<div class="notice info small" style="margin-top:8px">${r.offers} ${plural(r.offers, 'nova proposta', 'novas propostas')} por jogadores seus.</div>` : ''}</section>
      </div>
      ${(r.promises || []).map(p => `<div class="notice ${p.ok ? 'good' : 'bad'}"><b>${p.ok ? 'Promessa cumprida' : 'Promessa quebrada'}:</b> ${esc(p.txt)}.${p.eff ? ` ${esc(p.eff.charAt(0).toUpperCase() + p.eff.slice(1))}.` : ''}</div>`).join('')}
      ${r.studied ? `<div class="notice good"><b>Curso concluído:</b> ${esc(r.studied)}.</div>` : ''}
      ${r.built ? `<div class="notice good"><b>Obra concluída:</b> ${esc(r.built.name)}, ${esc(G.infraLabel(r.built.k, r.built.to))}.</div>` : ''}
      ${r.peneira ? `<div class="notice info row between"><span><b>Peneira:</b> ${r.peneira} ${plural(r.peneira, 'garoto novo', 'garotos novos')} na base.</span><button class="btn" data-act="goInfra" data-v="inf-base">Ver base</button></div>` : ''}
      ${r.sponsorEnded && !S.fired ? `<div class="notice info"><b>Acabou o contrato com ${esc(r.sponsorEnded)}.</b> Há novas propostas de patrocínio na Central.</div>` : ''}
      ${S.fired ? `<div class="notice bad"><b>A diretoria perdeu a paciência.</b> Veja as propostas na Central.</div>` : ''}
      <p class="stop">Jogo salvo. Um bom momento para uma pausa, ou siga para a próxima semana.</p>
      <button class="btn primary big block" data-act="postDone">${r.season ? 'Ver fim de temporada' : 'Continuar'}</button></div>`;
  }

  // ---------- render ----------
  function content() {
    switch (U.view) {
      case 'central': return vCentral();
      case 'elenco': return vElenco();
      case 'tabela': return vTabela();
      case 'mercado': return vMercado();
      case 'clube': return vClube();
      case 'liga': return vLiga();
      case 'match': return vMatch();
      case 'post': return vPost();
      default: return vCentral();
    }
  }
  function render() {
    hideTip();
    if (!S) { app.innerHTML = vOnboarding(); return; }
    app.innerHTML = shell(content());
    if (U.view === 'match' && U.match) updateMatchUI([]);
    renderSheet();
  }
  function renderSheet() {
    let el = document.getElementById('sheet');
    const html = !U.sheet || (!S && U.sheet.type !== 'clubPreview') ? null : U.sheet.type === 'clubPreview' ? sheetClubPreview() : U.sheet.type === 'avatar' ? sheetAvatar() : U.sheet.type === 'pick' || U.sheet.type === 'bench' ? sheetPick() : U.sheet.type === 'player' ? sheetPlayer() : U.sheet.type === 'offer' ? sheetOffer() : U.sheet.type === 'moment' ? sheetMoment() : U.sheet.type === 'verba' ? sheetVerba() : '';
    // o editor de visual atualiza no lugar, sem reabrir a folha a cada toque
    if (el && html !== null && U.sheet.type === 'avatar' && el.dataset.type === 'avatar') { const sh = el.querySelector('.sheet'); const y = sh.scrollTop; sh.innerHTML = `<div class="grab"></div>${html}`; sh.scrollTop = y; return; }
    if (el) el.remove();
    if (html === null) return;
    el = document.createElement('div'); el.id = 'sheet'; el.className = 'sheet-back'; el.dataset.type = U.sheet.type;
    el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    el.addEventListener('click', ev => { if (ev.target === el && U.sheet.type !== 'moment') { U.sheet = null; renderSheet(); } });
    document.body.appendChild(el);
  }
  function closeSheet() { U.sheet = null; renderSheet(); }

  // ---------- acoes ----------
  const A = {
    go: el => { U.view = el.dataset.v; U.sheet = null; if (U.view !== 'mercado') stopAuction(); render(); window.scrollTo(0, 0); },
    onbClub: el => { U.sheet = { type: 'clubPreview', id: el.dataset.id }; renderSheet(); },
    onbPick: el => { U.sheet = null; renderSheet(); U.onb.club = el.dataset.id; U.onb.step = 2; if (!U.onb.avatar) U.onb.avatar = randomAvatar(); render(); window.scrollTo(0, 0); },
    av: el => { const tgt = U.sheet && U.sheet.type === 'avatar' ? S.coach.avatar : U.onb.avatar; const k = el.dataset.k; tgt[k] = (k === 'skin' || k === 'hairColor') ? +el.dataset.v : el.dataset.v; if (U.sheet && U.sheet.type === 'avatar') { save(); render(); } else render(); },
    avRandom: () => { const a = randomAvatar(); if (U.sheet && U.sheet.type === 'avatar') { S.coach.avatar = a; save(); render(); } else { U.onb.avatar = a; render(); } },
    editAvatar: () => { if (!S.coach.avatar) S.coach.avatar = randomAvatar(); U.sheet = { type: 'avatar' }; renderSheet(); },
    signSponsor: el => { const sp = G.signSponsor(S, +el.dataset.i); save(); render(); if (sp) { confetti(40); toast(`Contrato assinado com ${esc(G.withB(sp.brand))}.`, 'gold', 3200); } },
    onbBack: () => { U.onb.step = 1; render(); },
    onbDiv: el => { U.onb.div = el.dataset.v; U.onb.q = ''; render(); },
    tbCont: el => { U.tb.k = el.dataset.v; render(); },
    tbTab: el => { U.tb = { ...(U.tb || {}), v: el.dataset.v }; render(); },
    tbDiv: el => { U.tb = { ...(U.tb || {}), d: el.dataset.v }; render(); },
    tbGroup: el => { U.tb = { ...(U.tb || {}), g: el.dataset.v, gd: 'D' }; render(); },
    mktDiv: el => { U.mkt.div = el.dataset.v; render(); },
    crestAll: () => { U.crestAll = !U.crestAll; render(); },
    skipWeek: () => { if (G.sponsorPending(S)) { toast('Escolha um patrocinador antes.'); const el = document.getElementById('spons'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } afterSim([G.simWeek(S)]); },
    skipTo: () => {
      if (G.sponsorPending(S)) { toast('Escolha um patrocinador antes.'); return; }
      const reps = []; let n = 0;
      while (!S.seasonOver && !S.fired && n < G.WEEKS) { reps.push(G.simWeek(S)); n++; if (G.userFixture(S) || G.sponsorPending(S)) break; }
      afterSim(reps);
    },
    onbPersona: el => { U.onb.persona = el.dataset.v; render(); },
    onbStart: () => { const nm = (document.getElementById('coach-name').value || '').trim() || 'Técnico'; S = G.newCareer((Date.now() & 0x7fffffff) >>> 0, U.onb.club, nm, U.onb.persona); S.coach.avatar = U.onb.avatar || randomAvatar(); U.view = 'central'; save(); render(); window.scrollTo(0, 0); },
    play: () => { if (!G.userFixture(S)) { render(); return; } if (G.sponsorPending(S)) { toast('Escolha um patrocinador antes de jogar.'); const el = document.getElementById('spons'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } audio(); startMatch(); },
    formation: el => { const f = el.dataset.v; const keep = { ...S.lineup }; const auto = E.autoLineup(G.squadOf(S, me()), f); S.lineup = { ...auto, ment: keep.ment, formation: f, takers: keep.takers }; S.lineupFrom = null; save(); render(); toast('Formação ' + f + ': time reescalado nas posições novas.'); },
    ment: el => { S.lineup.ment = el.dataset.v; save(); render(); },
    auto: () => { S.lineup = { ...E.autoLineup(G.squadOf(S, me()), S.lineup.formation), ment: S.lineup.ment, takers: S.lineup.takers }; S.lineupFrom = null; save(); render(); toast('Escalados os melhores para esta formação, já contando o cansaço.'); },
    slot: el => { U.sheet = { type: 'pick', i: +el.dataset.i }; renderSheet(); },
    benchslot: el => { U.sheet = { type: 'bench', i: +el.dataset.i }; renderSheet(); },
    pick: el => {
      const pid = +el.dataset.pid; const lu = S.lineup; lu.bench = lu.bench || [];
      if (U.sheet.type === 'pick') {
        const i = U.sheet.i; const cur = lu.slots[i];
        const j = lu.slots.indexOf(pid); const b = lu.bench.indexOf(pid);
        if (j >= 0) { lu.slots[j] = cur; } else if (b >= 0) { if (cur) lu.bench[b] = cur; else lu.bench.splice(b, 1); }
        lu.slots[i] = pid;
      } else {
        const i = U.sheet.i;
        if (!pid) { lu.bench.splice(i, 1); }
        else { const b = lu.bench.indexOf(pid); if (b >= 0) { lu.bench[b] = lu.bench[i]; } lu.bench[i] = pid; lu.bench = lu.bench.filter(x => x != null); }
      }
      S.lineupFrom = null; save(); closeSheet(); render(); toast('Escalação salva.');
    },
    player: el => { U.sheet = { type: 'player', pid: +el.dataset.pid }; renderSheet(); },
    closeSheet: () => closeSheet(),
    listToggle: el => { const p = S.players[+el.dataset.pid]; p.listed = !p.listed; save(); renderSheet(); render(); toast(p.listed ? `${p.n} está à venda.` : `${p.n} saiu da lista de venda.`); },
    quickSell: el => { const r = G.quickSell(S, +el.dataset.pid); save(); closeSheet(); render(); toast(esc(r.msg)); },
    mktTab: el => { U.mkt.tab = el.dataset.v; if (U.mkt.tab !== 'auction') stopAuction(); render(); },
    mktPos: el => { U.mkt.pos = el.dataset.v; render(); },
    mktYoung: () => { U.mkt.young = !U.mkt.young; render(); },
    mktSel: el => { Object.assign(U.mkt, { valor: 0, luvas: 0, sal: 0, share: 1, oblig: false, mode: 'buy', resp: null }); U.sheet = { type: 'offer', pid: +el.dataset.pid }; renderSheet(); },
    offerMode: el => { U.mkt.mode = el.dataset.v; U.mkt.resp = null; renderSheet(); },
    offerValor: el => { U.mkt.valor = +el.dataset.v; U.mkt.resp = null; renderSheet(); },
    offerLuvas: el => { U.mkt.luvas = +el.dataset.v; U.mkt.resp = null; renderSheet(); },
    offerSal: el => { U.mkt.sal = +el.dataset.v; U.mkt.resp = null; renderSheet(); },
    loanShare: el => { U.mkt.share = +el.dataset.v; U.mkt.resp = null; renderSheet(); },
    loanOblig: el => { U.mkt.oblig = el.dataset.v === '1'; U.mkt.resp = null; renderSheet(); },
    quickAsk: el => { U.qs = +el.dataset.pid; render(); },
    quickNo: () => { U.qs = null; render(); },
    quickYes: el => { const r = G.quickSell(S, +el.dataset.pid); U.qs = null; save(); render(); toast(esc(r.msg), r.ok ? 'gold' : ''); },
    listQuick: el => { const p = S.players[+el.dataset.pid]; p.listed = !p.listed; save(); render(); toast(p.listed ? `${p.n} anunciado: deve receber propostas nas próximas semanas.` : `${p.n} saiu do anúncio.`); },
    sellFilt: el => { U.sf = el.dataset.v; render(); },
    offerAccept: el => { const r = G.respondOffer(S, +el.dataset.id, 'accept'); save(); render(); if (r) toast(esc(r.msg), r.ok ? 'gold' : ''); flushAch(); },
    offerRefuse: el => { const r = G.respondOffer(S, +el.dataset.id, 'refuse'); save(); render(); if (r) toast(esc(r.msg), r.msg.includes('insatisfeito') ? 'bad' : '', 3800); },
    cntStep: el => { U.cnt = U.cnt || {}; const id = +el.dataset.id; U.cnt[id] = Math.max(1.02, Math.min(1.6, (U.cnt[id] || 1.15) + 0.05 * (+el.dataset.v))); render(); },
    offerCounter2: el => { const r = G.respondOffer(S, +el.dataset.id, 'counter', +el.dataset.ask); save(); render(); if (r) toast(esc(r.msg), r.ok && !r.walked ? 'gold' : r.improved ? '' : 'bad', 4200); flushAch(); },
    offerStep: el => { const p = S.players[U.sheet.pid]; const ask = G.askPrice(S, p); const step = Math.max(10000, Math.round(ask * 0.03 / 10000) * 10000); U.mkt.offer = Math.max(10000, U.mkt.offer + step * (+el.dataset.v)); renderSheet(); },
    offerPct: el => { const p = S.players[U.sheet.pid]; U.mkt.offer = Math.round(G.askPrice(S, p) * (+el.dataset.v) / 100 / 10000) * 10000; renderSheet(); },
    sendOffer: () => { const p = S.players[U.sheet.pid]; const m = U.mkt; const r0 = m.mode === 'loan' ? G.loanIn(S, p.id, { share: m.share ?? 1, obligation: !!m.oblig, sal: m.sal || 0 }) : G.signPlayer(S, p.id, { valor: m.valor || 0, luvas: m.luvas || 0, sal: m.sal || 0 }); const r = { ...r0, status: r0.ok ? 'accepted' : 'rejected' }; U.mkt.resp = r; save(); if (r.status === 'accepted') { closeSheet(); render(); confetti(50); toast(esc(r.msg), 'gold', 4000); flushAch(); } else renderSheet(); },
    offerCounter: () => { U.mkt.offer = U.mkt.resp.counter; A.sendOffer(); },
    acceptOffer: el => { const r = G.acceptOffer(S, +el.dataset.i); save(); render(); if (r) toast(esc(r.msg), 'gold'); flushAch(); },
    // busca no mercado

    declineOffer: el => { S.market.offers.splice(+el.dataset.i, 1); save(); render(); toast('Proposta recusada.'); },
    goSell: () => { U.view = 'mercado'; U.mkt.tab = 'sell'; render(); },
    goAuction: () => { U.view = 'mercado'; U.mkt.tab = 'auction'; render(); },
    startAuction: () => startAuction(),
    bid: () => { const r = G.auctionBid(S); if (r) { const m = document.getElementById('auc-msg'); if (m) m.innerHTML = `<div class="notice ${r.msg.startsWith('Seu') ? 'good' : 'bad'} small">${esc(r.msg)}</div>`; } refreshAuction(); },
    nextSeason: () => { G.nextSeason(S); save(); render(); toast(`Temporada ${S.year} começa. Nova meta: ${S.board.target.label.charAt(0).toLowerCase() + S.board.target.label.slice(1)}.`, 'gold', 4500); },
    takeJob: el => { G.restartAfterFire(S, el.dataset.id); save(); render(); toast(`Novo desafio: ${club(me()).name}.`, 'gold'); },
    sound: () => { U.settings.sound = !U.settings.sound; save(); if (U.view === 'match') { const c = document.getElementById('ctl'); if (c) c.innerHTML = matchControls(); } else render(); },
    newCareer: () => { U.confirmNew = true; render(); },
    newCareerNo: () => { U.confirmNew = false; render(); },
    newCareerYes: () => { try { localStorage.removeItem(KEY); } catch (e) { /* ok */ } S = null; U.confirmNew = false; U.onb = { step: 1, club: null, persona: 'motivador', name: '' }; U.view = 'central'; render(); window.scrollTo(0, 0); },
    makeLeague: () => { const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; U.liga = Array.from({ length: 6 }, () => ch[Math.floor(Math.random() * ch.length)]).join(''); render(); },
    copyCode: () => { const t = U.liga; try { navigator.clipboard.writeText(t).then(() => toast('Código copiado.'), () => toast('Não deu para copiar: selecione o código na tela.')); } catch (e) { toast('Não deu para copiar: selecione o código na tela.'); } },
    joinLeague: () => { const v = (document.getElementById('join-code').value || '').trim().toUpperCase(); const msg = document.getElementById('join-msg'); msg.innerHTML = v.length !== 6 ? '<div class="notice bad small">O código tem 6 letras ou números.</div>' : '<div class="notice warn small">Entrar em ligas chega com as contas online (fase 2). Seu código foi conferido, mas ainda não há servidor para buscá-lo.</div>'; },
    // partida
    speed: el => { U.ms.speed = +el.dataset.v; document.getElementById('ctl').innerHTML = matchControls(); },
    openMoment: () => { if (U.ms.running) openMoment('manual'); },
    useSug: el => { S.lineup.ment = el.dataset.v; save(); render(); toast(`Postura: ${E.MENT[el.dataset.v].label.toLowerCase()}.`, '', 1800); },
    assist: () => { S.coach.assist = S.coach.assist === false; save(); render(); },
    crestDel: el => { delete CRESTS[el.dataset.id]; saveCrests(); render(); },
    crestClear: () => { CRESTS = {}; saveCrests(); render(); toast('Escudos removidos.', '', 2000); },
    mktFit: () => { U.mkt.fit = !U.mkt.fit; render(); },
    momentMent: el => { U.sheet.pick = el.dataset.v; renderSheet(); },
    subOut: el => { U.sheet.subOut = +el.dataset.i; renderSheet(); },
    subCancel: () => { U.sheet.subOut = null; renderSheet(); },
    subIn: el => {
      const m = U.match, us = m.userSide, s = m.side[us]; const si = U.sheet.subOut, bi = +el.dataset.i;
      const out = s.xi[si].p, inn = s.bench[bi];
      if (E.substitute(m, us, si, bi)) { m.side[us].lastManual = m.minute; updateMatchUI([{ t: 'sub', side: us, min: m.minute, out: out ? out.n : '', in: inn.n }]); if (out) delete out._hurt; }
      U.sheet.subOut = null; renderSheet();
    },
    momentGo: () => {
      const m = U.match, us = m.userSide; const s = m.side[us];
      // lesionado sem troca: sai e o time joga com o melhor do banco
      s.xi.forEach((o, i) => { if (o.p && o.p._hurt && s.subs < 5) { const bi = s.bench.findIndex(p => p && !p._off && E.GROUP[p.pos] === E.GROUP[o.slot]); const b2 = bi >= 0 ? bi : s.bench.findIndex(p => p && !p._off); if (b2 >= 0) { const out = o.p, inn = s.bench[b2]; E.substitute(m, us, i, b2); delete out._hurt; updateMatchUI([{ t: 'sub', side: us, min: m.minute, out: out.n, in: inn.n }]); } } });
      if (U.sheet.pick !== s.ment) { s.ment = U.sheet.pick; U.ms.lastMent[us] = s.ment; E.recalc(m, s); updateMatchUI([{ t: 'ment', side: us, min: m.minute, v: s.ment }]); }
      U.sheet = null; renderSheet(); U.ms.running = true; tickLoop(); const c = document.getElementById('ctl'); if (c) c.innerHTML = matchControls();
    },
    skip: () => {
      const m = U.match, us = m.userSide; U.ms.running = false; clearTimeout(U.ms.timer);
      const all = [];
      while (!m.done) {
        E.aiInGame(m, 1 - us);
        const evs = E.assistInGame(m, us).concat(E.step(m));
        // lesao do usuario: troca automatica
        m.side[us].xi.forEach((o, i) => { if (o.p && o.p._hurt && m.side[us].subs < 5) { const bi = m.side[us].bench.findIndex(p => p && !p._off); if (bi >= 0) { const out = o.p, inn = m.side[us].bench[bi]; E.substitute(m, us, i, bi); delete out._hurt; evs.push({ t: 'sub', side: us, min: m.minute, out: out.n, in: inn.n }); } } });
        all.push(...evs.filter(e => e.t !== 'chance' || e.xg > 0.13 || e.kind === 'post'));
      }
      updateMatchUI(all); whistle(3);
    },
    finishMatch: () => finishMatch(),
    postDone: () => { U.post = null; U.view = 'central'; render(); window.scrollTo(0, 0); },
    // vida do técnico
    press: el => { const r = G.answerPresser(S, +el.dataset.i); save(); render(); if (r) toast(`Coletiva: “${esc(r.txt)}”.${r.prom ? ' Promessa registrada.' : ''}`, r.prom ? 'gold' : '', 3200); },
    evento: el => { const r = G.answerEvent(S, +el.dataset.i); save(); if (r && r.moved) { U.view = 'central'; render(); window.scrollTo(0, 0); confetti(80); toast(`Novo clube: ${esc(club(me()).name)}.`, 'gold', 4500); return; } render(); if (r) toast(esc(r.eff || r.txt), '', 3500); },
    study: el => { const r = G.startStudy(S, el.dataset.k); if (!r.ok) { toast(esc(r.msg || 'Não deu para começar.')); return; } save(); render(); toast(`Matrícula feita: ${esc(r.o.name)}. ${r.o.weeks} semanas.`, 'gold'); },
    // times salvos
    presetSave: el => { G.savePreset(S, el.dataset.k); S.lineupFrom = el.dataset.k; save(); render(); toast(`Escalação salva como ${G.PRESETS[el.dataset.k]}.`); },
    presetLoad: el => { if (G.loadPreset(S, el.dataset.k)) { save(); render(); toast(`Time ${G.PRESETS[el.dataset.k]} escalado.`); } },
    // estrutura
    cbTab: el => { U.cb = el.dataset.v; render(); },
    goInfra: el => { U.view = 'clube'; U.cb = 'estrutura'; U.sheet = null; render(); const id = el.dataset.v; const t = id && document.getElementById(id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo(0, 0); },
    infraUp: el => { const k = el.dataset.k; const r = G.infraStart(S, k); if (!r.ok) { toast(esc(r.msg || 'Não deu para começar a obra.')); return; } save(); render(); beep(660, 0, 0.12, 'triangle', 0.05); toast(`Obra iniciada: ${esc(G.INFRA[k].name)}. Custo ${fmt(r.cost)}.`, 'gold'); },
    promote: el => { const r = G.promoteProspect(S, +el.dataset.pid); if (!r.ok) { toast(esc(r.msg || 'Não deu para subir.')); return; } save(); render(); confetti(30); toast(`${esc(r.p.n)} sobe para o profissional.`, 'gold'); },
    relAsk: el => { U.relConfirm = +el.dataset.pid; render(); },
    relCancel: () => { U.relConfirm = null; render(); },
    release: el => { const p = G.infra(S).prospects.find(x => x.id === +el.dataset.pid); G.releaseProspect(S, +el.dataset.pid); U.relConfirm = null; save(); render(); if (p) toast(`${esc(p.n)} foi dispensado.`); },
    ticket: el => { G.infra(S).ticket = +el.dataset.v; save(); render(); },
    verba: () => { U.sheet = { type: 'verba' }; renderSheet(); },
    askVerba: el => { const r = G.askVerba(S, el.dataset.k); if (!r.ok) return; U.sheet.res = r; save(); render(); renderSheet(); if (r.approved) { confetti(40); toast(`Verba aprovada: ${fmt(r.amount)}.`, 'gold'); } else toast('A diretoria negou a verba.', 'bad'); },
  };
  function flushAch() { const ks = (S._newAch || []).splice(0); delete S._newAch; ks.forEach((k, i) => setTimeout(() => toast(`<span class="ti">${IC.star}</span><span>Conquista: <b>${G.ACH[k][0]}</b> · +50 XP</span>`, 'gold', 4000), 600 + i * 800)); if (ks.length) save(); }

  // ---------- leilao ----------
  function startAuction() {
    const a = S.market.auction; if (!a || a.status !== 'open') return;
    U.auction = { left: 30, iv: null }; render();
    const rng = E.makeRng((Date.now() & 0xffffff) >>> 0);
    U.auction.iv = setInterval(() => {
      U.auction.left--;
      if (U.auction.left % 3 === 0 || (U.auction.left < 6 && rng() < 0.5)) { const r = G.auctionRivalTick(S, rng); if (r) { const m = document.getElementById('auc-msg'); if (m) m.innerHTML = `<div class="notice warn small">${esc(club(r.rival).name)} cobre: ${fmt(r.bid)}.</div>`; if (U.auction.left < 5) U.auction.left = 5; } }
      refreshAuction();
      if (U.auction.left <= 0) { clearInterval(U.auction.iv); const r = G.auctionClose(S); U.auction = null; save(); U.mkt.tab = 'buy'; render(); if (r) { toast(esc(r.msg), r.won ? 'gold' : '', 4500); if (r.won) confetti(60); } }
    }, 1000);
  }
  function refreshAuction() { const a = S.market.auction; if (!a) return; const t = document.getElementById('auc-timer'); if (t && U.auction) t.textContent = U.auction.left + 's'; const b = document.getElementById('auc-bid'); if (b) b.textContent = fmt(a.bid); const l = document.getElementById('auc-lead'); if (l) l.textContent = a.leader === 'me' ? 'Você' : a.leader ? club(a.leader).name : 'Ninguém'; const btn = document.querySelector('[data-act="bid"]'); if (btn) btn.textContent = `Dar lance de ${fmt(Math.round(a.bid * 1.1 / 10000) * 10000)}`; }
  function stopAuction() { if (U.auction) { clearInterval(U.auction.iv); U.auction = null; } }

  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const f = A[el.dataset.act]; if (f) { e.preventDefault(); f(el, e); } });
  document.addEventListener('input', e => {
    if (e.target.id === 'coach-name') U.onb.name = e.target.value;
    if (e.target.id === 'club-q') { U.onb.q = e.target.value; const g = document.querySelector('.club-grid'); if (g) g.innerHTML = clubCards(); }
    if (e.target.id === 'mkt-q') { U.mkt.q = e.target.value; clearTimeout(U.qT); U.qT = setTimeout(() => { const pos = e.target.selectionStart; render(); const i = document.getElementById('mkt-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { /* ok */ } } }, 250); }
  });
  document.addEventListener('change', e => {
    const d = e.target.dataset || {};
    if (d.change === 'estSel') { U.tb = { ...(U.tb || {}), v: 'est', e: e.target.value }; render(); }
    if (d.change === 'sellSort') { U.ss = e.target.value; render(); }
    if (d.change === 'taker' && S) { S.lineup.takers = { ...(S.lineup.takers || {}), [d.k]: +e.target.value || null }; save(); render(); }
    if (d.change === 'presetFor' && S) { S.presetFor = { ...(S.presetFor || {}), [d.k]: e.target.value || null }; const k = G.applyPresetFor(S); save(); render(); if (k) toast(`Time ${G.PRESETS[k]} escalado para o jogo desta semana.`); }
  });
  // depois de semanas simuladas sem jogo do usuário
  function afterSim(reps) {
    save(); U.view = 'central'; render(); window.scrollTo(0, 0);
    if (!reps.length) return;
    const last = reps[reps.length - 1];
    if (S.seasonOver) toast(`Temporada ${S.year} encerrada.`, 'gold', 3500);
    else toast(`${reps.length} ${plural(reps.length, 'semana simulada', 'semanas simuladas')}. ${G.userFixture(S) ? 'Seu time joga nesta semana.' : ''}`, '', 2800);
    const ended = reps.find(r => r.sponsorEnded); if (ended) toast(`Acabou o contrato com ${esc(ended.sponsorEnded)}. Há novas propostas na Central.`, '', 4500);
    const offers = reps.reduce((a, r) => a + (r.offers || 0), 0); if (offers) toast(`${offers} ${plural(offers, 'nova proposta', 'novas propostas')} por jogadores seus.`, '', 3500);
    if (S.market.auction && S.market.auction.status === 'open') toast('Leilão relâmpago aberto no Mercado.', 'gold', 3500);
    reps.forEach(r => (r.promises || []).forEach(p => toast(`${p.ok ? 'Promessa cumprida' : 'Promessa quebrada'}: ${esc(p.txt)}.`, p.ok ? 'gold' : 'bad', 4000)));
    reps.filter(r => r.studied).forEach(r => toast(`Curso concluído: ${esc(r.studied)}.`, 'gold', 3500));
    reps.filter(r => r.built).forEach(r => toast(`Obra concluída: ${esc(r.built.name)}, ${esc(G.infraLabel(r.built.k, r.built.to))}.`, 'gold', 4000));
    const pen = reps.reduce((a, r) => a + (r.peneira || 0), 0); if (pen) toast(`Peneira: ${pen} ${plural(pen, 'garoto novo', 'garotos novos')} na base.`, 'gold', 3500);
    const cq = reps.reduce((a, r) => a + (r.cupQuota || 0), 0); if (cq) toast(`Copa do Brasil: cota de ${fmt(cq)} no caixa.`, 'gold', 3500);
    if (S.fired) toast('A diretoria perdeu a paciência. Veja as propostas na Central.', 'bad', 5000);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && U.sheet && U.sheet.type !== 'moment') closeSheet(); });

  // ---------- inicio (com suporte a atualizacao ao vivo do visualizador) ----------
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(() => ({ S, settings: U.settings })); } catch (e) { /* ignora */ } }
  function start(data) { loadCrests(); if (data && data.S) { S = G.migrate(data.S); if (data.settings) U.settings = data.settings; } else load(); render(); }
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();

