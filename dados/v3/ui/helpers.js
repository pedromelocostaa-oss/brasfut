  // ---------- séries, competições e atributos ----------
  const DIVN = { A: 'Série A', B: 'Série B', C: 'Série C', D: 'Série D' };
  const T = window.Comps;
  const ATTR_SHORT = { 'Reflexo': 'REF', 'Saída do gol': 'SAÍ', 'Desarme': 'DES', 'Cabeceio': 'CAB', 'Passe': 'PAS', 'Drible': 'DRI', 'Chute': 'CHU' };
  const attrNames = p => E.ATTR[E.GROUP[p.pos]] || ['', ''];
  function attrMini(p) { if (!p.at) return ''; const [a, b] = attrNames(p); return `<span class="attrs" data-tip="${esc(a + ' ' + p.at[0] + ' · ' + b + ' ' + p.at[1])}"><i>${ATTR_SHORT[a]}</i>${p.at[0]} <i>${ATTR_SHORT[b]}</i>${p.at[1]}</span>`; }
  function attrBars(p) {
    if (!p.at) return '';
    const names = attrNames(p);
    return `<div class="attr-bars">${names.map((n, i) => `<div class="ab"><span>${n}</span><span class="bar"><i style="width:${Math.max(4, Math.min(100, (p.at[i] - 30) / 65 * 100))}%"></i></span><b class="num">${p.at[i]}</b></div>`).join('')}</div>`;
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
    if (key === 'A') return pos <= 4 ? 'g4' : pos >= n - 3 ? 'z4' : '';
    if (key === 'B') return pos <= 4 ? 'up' : pos >= n - 3 ? 'z4' : '';
    if (key === 'C') return pos <= 8 ? 'up' : pos >= n - 3 ? 'z4' : '';
    if (key === 'CQA' || key === 'CQB') return pos <= 2 ? 'up' : '';
    if (/^D\d+$/.test(key)) return pos <= 4 ? 'up' : '';
    return pos <= 2 ? 'up' : '';
  }
  function legendOf(key) {
    if (key === 'A') return '<span><b style="color:var(--ima)">1º a 4º</b>: Libertadores</span><span><b style="color:var(--cartao)">17º a 20º</b>: caem para a Série B</span>';
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
