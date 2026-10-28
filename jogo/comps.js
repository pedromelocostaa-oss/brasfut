/* Prancheta FC: competições (calendário, tabelas, mata-mata). Sem DOM. Depende de Engine. */
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.Engine;

  // ---------- calendário: 58 semanas por temporada, mais 15 datas de meio de semana das copas continentais ----------
  // 11 semanas de estadual (com as 3 primeiras fases da Copa do Brasil) e 47 de Brasileirão (com o resto da Copa).
  // Libertadores e Sul-Americana jogam no meio de semana (mid): não contam como semana para salário, cota de TV e obras.
  const CUP = [
    { k: 'Q1', name: '1ª fase', legs: 1 }, { k: 'Q2', name: '2ª fase', legs: 1 }, { k: 'Q3', name: '3ª fase', legs: 1 },
    { k: 'R32', name: '16 avos de final', legs: 2 }, { k: 'R16', name: 'Oitavas de final', legs: 2 },
    { k: 'QF', name: 'Quartas de final', legs: 2 }, { k: 'SF', name: 'Semifinal', legs: 2 }, { k: 'F', name: 'Final', legs: 1, neutral: true },
  ];
  // copas continentais: grupos (6 rodadas), playoff da Sul-Americana, oitavas, quartas e semi em ida e volta, final única em campo neutro
  const CONT = { L: { name: 'Libertadores', comp: 'LIB' }, S: { name: 'Sul-Americana', comp: 'SUL' } };
  const CONT_PH = { G: 'Fase de grupos', PO: 'Playoff das oitavas', R16: 'Oitavas de final', QF: 'Quartas de final', SF: 'Semifinal', F: 'Final' };
  const CONT_AFTER = { 3: ['G', 0], 5: ['G', 1], 7: ['G', 2], 9: ['G', 3], 11: ['G', 4], 13: ['G', 5], 16: ['PO', 1], 17: ['PO', 2], 19: ['R16', 1], 20: ['R16', 2], 23: ['QF', 1], 24: ['QF', 2], 28: ['SF', 1], 29: ['SF', 2], 33: ['F', 1] };
  const CAL = (() => {
    const cal = [];
    ['E0', 'E1', 'Q0', 'E2', 'E3', 'Q1', 'E4', 'E5', 'Q2', 'E6', 'E7'].forEach(x => cal.push(x[0] === 'E' ? { t: 'est', r: +x.slice(1) } : { t: 'cup', ph: +x.slice(1), leg: 1 }));
    const after = { 2: [3, 1], 4: [3, 2], 8: [4, 1], 10: [4, 2], 15: [5, 1], 17: [5, 2], 23: [6, 1], 25: [6, 2], 30: [7, 1] };
    for (let r = 0; r < 38; r++) {
      cal.push({ t: 'liga', r }); if (after[r]) cal.push({ t: 'cup', ph: after[r][0], leg: after[r][1] });
      if (CONT_AFTER[r]) cal.push({ t: 'cont', ph: CONT_AFTER[r][0], md: CONT_AFTER[r][1], mid: true });
    }
    return cal;
  })();
  const WEEKS = CAL.length; // 73 datas
  const SEASON_WEEKS = CAL.filter(d => !d.mid).length; // 58 semanas
  // número da semana (1 a 58) de uma data do calendário; datas de meio de semana ficam na semana da rodada anterior
  function weekNo(w) { let n = 0; for (let i = 0; i <= w && i < CAL.length; i++) if (!CAL[i].mid) n++; return Math.max(1, n); }
  function ligaWeek(r) { return CAL.findIndex(d => d.t === 'liga' && d.r === r); }

  // Série C: 1ª fase em turno único (19 rodadas), quadrangulares (6), final (2). Série D: 16 grupos de 6 (10 rodadas) e mata-mata de ida e volta.
  const C_Q = [20, 21, 22, 23, 24, 25], C_F = [27, 28];
  const D_KO = [{ k: 'R64', name: '2ª fase', legs: [11, 12] }, { k: 'R32', name: '3ª fase', legs: [14, 15] }, { k: 'R16', name: 'Oitavas de final', legs: [17, 18] }, { k: 'QF', name: 'Quartas de final', legs: [20, 21] }, { k: 'SF', name: 'Semifinal', legs: [23, 24] }, { k: 'F', name: 'Final', legs: [26, 27] }];
  const EST_NAME = { AC: 'Acreano', AL: 'Alagoano', AP: 'Amapaense', AM: 'Amazonense', BA: 'Baiano', CE: 'Cearense', DF: 'Brasiliense', ES: 'Capixaba', GO: 'Goiano', MA: 'Maranhense', MT: 'Mato-Grossense', MS: 'Sul-Mato-Grossense', MG: 'Mineiro', PA: 'Paraense', PB: 'Paraibano', PR: 'Paranaense', PE: 'Pernambucano', PI: 'Piauiense', RJ: 'Carioca', RN: 'Potiguar', RS: 'Gaúcho', RO: 'Rondoniense', RR: 'Roraimense', SC: 'Catarinense', SP: 'Paulista', SE: 'Sergipano', TO: 'Tocantinense' };
  const REGION = ['AM', 'RR', 'AC', 'RO', 'PA', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'MT', 'MS', 'GO', 'DF', 'ES', 'MG', 'RJ', 'SP', 'PR', 'SC', 'RS'];
  const DIV_NAME = { A: 'Série A', B: 'Série B', C: 'Série C', D: 'Série D' };

  const row = () => ({ p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, form: [] });
  function shuffle(a, rng) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // turno único (ou com folga se o número for ímpar); a volta é o espelho
  function single(ids, rng) {
    const t = shuffle(ids, rng); if (t.length % 2) t.push(null);
    const n = t.length, rounds = []; let arr = t.slice();
    for (let r = 0; r < n - 1; r++) {
      const g = [];
      for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a && b) g.push(r % 2 === 0 ? (i === 0 ? [a, b] : [b, a]) : (i === 0 ? [b, a] : [a, b])); }
      rounds.push(g); arr = [arr[0], arr[n - 1]].concat(arr.slice(1, n - 1));
    }
    return rounds;
  }
  const double = (ids, rng) => { const f = single(ids, rng); return f.concat(f.map(g => g.map(([h, a]) => [a, h]))); };

  function sortRows(tab) {
    return Object.entries(tab).sort((x, y) => y[1].p - x[1].p || y[1].v - x[1].v || (y[1].gp - y[1].gc) - (x[1].gp - x[1].gc) || y[1].gp - x[1].gp || x[0].localeCompare(y[0])).map(([id, t], i) => ({ id, pos: i + 1, ...t }));
  }
  function addResult(tab, h, a, gh, ga) {
    const th = tab[h], ta = tab[a]; if (!th || !ta) return;
    th.j++; ta.j++; th.gp += gh; th.gc += ga; ta.gp += ga; ta.gc += gh;
    if (gh > ga) { th.p += 3; th.v++; ta.d++; th.form.push('V'); ta.form.push('D'); }
    else if (gh < ga) { ta.p += 3; ta.v++; th.d++; th.form.push('D'); ta.form.push('V'); }
    else { th.p++; ta.p++; th.e++; ta.e++; th.form.push('E'); ta.form.push('E'); }
    [th, ta].forEach(t => { if (t.form.length > 5) t.form.shift(); });
  }
  const tie = (a, b, legs) => ({ a, b, legs, g: [], pen: null, w: null });

  // ---------- montar a temporada ----------
  // ctx: { clubs (id -> {div, uf}), str(id) -> força, rng }
  function buildSeason(ctx) {
    const { clubs, str, rng } = ctx;
    const byDiv = { A: [], B: [], C: [], D: [] };
    Object.values(clubs).forEach(c => byDiv[c.div].push(c.id));
    const S = { div: byDiv, tables: {}, fx: {}, est: {}, cup: [], cq: null, cf: null, dko: [], dgroups: [], done: {} };
    const mkTab = (key, ids) => { S.tables[key] = {}; ids.forEach(id => S.tables[key][id] = row()); };
    ['A', 'B'].forEach(d => { mkTab(d, byDiv[d]); S.fx[d] = double(byDiv[d], rng); });
    mkTab('C', byDiv.C); S.fx.C = single(byDiv.C, rng);
    // Série D: grupos regionais de 6
    const dOrd = byDiv.D.slice().sort((a, b) => REGION.indexOf(clubs[a].uf) - REGION.indexOf(clubs[b].uf) || str(b) - str(a));
    S.fx.D = Array.from({ length: 10 }, () => []);
    for (let g = 0; g < dOrd.length / 6; g++) {
      const ids = dOrd.slice(g * 6, g * 6 + 6); const key = 'D' + (g + 1); S.dgroups.push(key); mkTab(key, ids);
      double(ids, rng).forEach((rd, r) => rd.forEach(m => S.fx.D[r].push(m.concat(key))));
    }
    // estaduais: por estado, os clubes das quatro séries; quem passa de 8 vai para uma 2ª divisão estadual
    const byUf = {}; Object.values(clubs).forEach(c => (byUf[c.uf] = byUf[c.uf] || []).push(c.id));
    Object.entries(byUf).forEach(([uf, ids]) => {
      ids.sort((a, b) => str(b) - str(a));
      // divisões estaduais equilibradas, até 8 clubes cada (9 clubes viram 5 + 4, 19 viram 7 + 6 + 6)
      const k = Math.ceil(ids.length / 8), base = Math.floor(ids.length / k), extra = ids.length % k; let at = 0;
      for (let t = 0; t < k; t++) {
        const size = base + (t < extra ? 1 : 0); const part = ids.slice(at, at + size); at += size; const key = 'E' + uf + (t + 1);
        const name = `${EST_NAME[uf] || uf}${t ? ' ' + ['', 'Série A2', 'Série A3', 'Série A4'][t] : ''}`;
        mkTab(key, part);
        S.est[key] = { uf, tier: t + 1, name, ids: part, fx: part.length >= 2 ? single(part, rng) : [], final: null };
      }
    });
    // Copa do Brasil: Série A entra nos 16 avos; Séries B, C e as 56 melhores da D começam na 1ª fase
    const dTop = byDiv.D.slice().sort((a, b) => str(b) - str(a)).slice(0, 56);
    S.cupIn = byDiv.B.concat(byDiv.C, dTop);
    S.cup[0] = seedTies(S.cupIn, str, 1);
    // copas continentais: ctx.cont = { L: { A: [4 ids], ... }, S: { ... } }
    S.cont = {};
    Object.entries(ctx.cont || {}).forEach(([K, groups]) => {
      const C = { groups: {}, fx: {}, ko: {} };
      Object.entries(groups).forEach(([g, ids]) => { const key = K + g; C.groups[g] = ids.slice(); mkTab(key, ids); C.fx[key] = double(ids, rng); });
      S.cont[K] = C;
    });
    return S;
  }
  // mais forte x mais fraco; o mais fraco manda o jogo (fases de jogo único)
  function seedTies(ids, str, legs) {
    const s = ids.slice().sort((a, b) => str(b) - str(a)); const out = [];
    for (let i = 0; i < s.length / 2; i++) out.push(tie(s[s.length - 1 - i], s[i], legs));
    return out;
  }
  function drawTies(ids, rng, legs) { const s = shuffle(ids, rng); const out = []; for (let i = 0; i < s.length; i += 2) out.push(tie(s[i], s[i + 1], legs)); return out; }

  // ---------- jogos de uma semana ----------
  // devolve [{ comp, key, h, a, tie: {path}, leg, neutral, label }]
  function fixturesOf(S, w) {
    const d = CAL[w]; const out = [];
    if (!d) return out;
    if (d.t === 'est') {
      Object.entries(S.est).forEach(([key, e]) => {
        if (d.r < 7 && e.fx[d.r]) e.fx[d.r].forEach(([h, a]) => out.push({ comp: 'EST', key, h, a, label: e.name }));
        if (d.r === 7 && e.final && !e.final.w) out.push({ comp: 'EST', key: null, h: e.final.a, a: e.final.b, tie: { est: key }, leg: 1, label: e.name + ' · final' });
      });
    } else if (d.t === 'cup') {
      const ph = S.cup[d.ph]; const P = CUP[d.ph];
      if (ph) ph.forEach((t, i) => { if (t.w) return; const leg1 = d.leg === 1; out.push({ comp: 'CDB', key: null, h: leg1 ? t.a : t.b, a: leg1 ? t.b : t.a, tie: { cup: d.ph, i }, leg: d.leg, neutral: !!P.neutral, label: 'Copa do Brasil · ' + P.name + (P.legs === 2 ? (d.leg === 1 ? ' (ida)' : ' (volta)') : '') }); });
    } else if (d.t === 'cont') {
      Object.entries(S.cont || {}).forEach(([K, Cc]) => {
        const nm = CONT[K].name, comp = CONT[K].comp;
        if (d.ph === 'G') Object.entries(Cc.fx).forEach(([key, rounds]) => (rounds[d.md] || []).forEach(([h, a]) => out.push({ comp, key, h, a, mid: true, label: `${nm} · grupo ${key.slice(1)} · ${d.md + 1}ª rodada` })));
        else (Cc.ko[d.ph] || []).forEach((t, i) => {
          if (t.w) return; const fin = d.ph === 'F'; const leg1 = d.md === 1;
          out.push({ comp, key: null, h: leg1 ? t.a : t.b, a: leg1 ? t.b : t.a, tie: { cont: K, ph: d.ph, i }, leg: d.md, neutral: fin, mid: true, label: `${nm} · ${CONT_PH[d.ph]}${fin ? '' : leg1 ? ' (ida)' : ' (volta)'}` });
        });
      });
    } else {
      const r = d.r;
      ['A', 'B'].forEach(dv => (S.fx[dv][r] || []).forEach(([h, a]) => out.push({ comp: dv, key: dv, h, a, label: DIV_NAME[dv] + ' · ' + (r + 1) + 'ª rodada' })));
      if (r < 19) (S.fx.C[r] || []).forEach(([h, a]) => out.push({ comp: 'C', key: 'C', h, a, label: 'Série C · ' + (r + 1) + 'ª rodada' }));
      const qi = C_Q.indexOf(r); if (qi >= 0 && S.cq) S.cq.fx[qi].forEach(([h, a, key]) => out.push({ comp: 'C', key, h, a, label: 'Série C · quadrangular ' + (key === 'CQA' ? 'A' : 'B') }));
      const fi = C_F.indexOf(r); if (fi >= 0 && S.cf && !S.cf.w) out.push({ comp: 'C', key: null, h: fi === 0 ? S.cf.a : S.cf.b, a: fi === 0 ? S.cf.b : S.cf.a, tie: { cf: 1 }, leg: fi + 1, label: 'Série C · final (' + (fi === 0 ? 'ida' : 'volta') + ')' });
      if (r < 10) (S.fx.D[r] || []).forEach(([h, a, key]) => out.push({ comp: 'D', key, h, a, label: 'Série D · grupo ' + key.slice(1) }));
      D_KO.forEach((K, ki) => { const li = K.legs.indexOf(r); if (li < 0 || !S.dko[ki]) return; S.dko[ki].forEach((t, i) => { if (t.w) return; out.push({ comp: 'D', key: null, h: li === 0 ? t.a : t.b, a: li === 0 ? t.b : t.a, tie: { dko: ki, i }, leg: li + 1, label: 'Série D · ' + K.name + ' (' + (li === 0 ? 'ida' : 'volta') + ')' }); }); });
    }
    return out;
  }

  // ---------- resultado ----------
  function tieRef(S, ref) {
    if (ref.cup != null) return S.cup[ref.cup][ref.i];
    if (ref.dko != null) return S.dko[ref.dko][ref.i];
    if (ref.cf) return S.cf;
    if (ref.est) return S.est[ref.est].final;
    if (ref.cont) return S.cont[ref.cont].ko[ref.ph][ref.i];
    return null;
  }
  // penaltis: 5 cobranças, depois alternadas; goleiro melhor pesa um pouco
  function penalties(rng, gkA, gkB) {
    const pa = 0.76 - (gkB - 70) * 0.004, pb = 0.76 - (gkA - 70) * 0.004; let a = 0, b = 0;
    for (let i = 0; i < 5; i++) { if (rng() < pa) a++; if (rng() < pb) b++; }
    let n = 0; while (a === b && n < 20) { const x = rng() < pa, y = rng() < pb; a += x; b += y; n++; }
    if (a === b) a++;
    return [a, b];
  }
  // aplica um jogo terminado; gh/ga do ponto de vista do mandante; gk = [goleiro mandante, goleiro visitante]
  function applyResult(S, mt, gh, ga, rng, gk) {
    if (mt.key && S.tables[mt.key]) addResult(S.tables[mt.key], mt.h, mt.a, gh, ga);
    if (!mt.tie) return null;
    const t = tieRef(S, mt.tie); if (!t) return null;
    const ga_ = mt.h === t.a ? gh : ga, gb_ = mt.h === t.a ? ga : gh;
    t.g.push([ga_, gb_]);
    if (t.g.length >= t.legs) {
      const A = t.g.reduce((s, x) => s + x[0], 0), B = t.g.reduce((s, x) => s + x[1], 0);
      if (A !== B) t.w = A > B ? t.a : t.b;
      else { const gkA = mt.h === t.a ? gk[0] : gk[1], gkB = mt.h === t.a ? gk[1] : gk[0]; t.pen = penalties(rng, gkA, gkB); t.w = t.pen[0] > t.pen[1] ? t.a : t.b; }
    }
    return t;
  }

  // ---------- depois de cada semana: monta as fases seguintes ----------
  // cruza 1º x 2º de grupos diferentes; o líder decide em casa (b manda a volta)
  function crossTies(win, run, rng, legs) {
    for (let k = 0; k < 50; k++) {
      const r = shuffle(run, rng); if (win.every((x, i) => x.g !== r[i].g) || k === 49) return win.map((x, i) => tie(r[i].id, x.id, legs));
    }
  }
  // chave fixa: vencedores dos confrontos 2i e 2i+1 se cruzam; quem foi melhor na fase de grupos decide em casa
  function nextRound(prev, str, legs) { const out = []; for (let i = 0; i < prev.length; i += 2) { const x = prev[i].w, y = prev[i + 1].w; const [a, b] = str(x) >= str(y) ? [y, x] : [x, y]; out.push(tie(a, b, legs)); } return out; }
  function contAfter(S, d, ctx) {
    const { str, rng } = ctx; const L = S.cont.L, Su = S.cont.S;
    const standings = Cc => Object.keys(Cc.groups).map(g => sortRows(S.tables[(Cc === L ? 'L' : 'S') + g]).map(x => ({ id: x.id, g })));
    if (d.ph === 'G' && d.md === 5) {
      if (L && !L.ko.R16) { const st = standings(L); L.thirds = st.map(r => r[2]); L.ko.R16 = crossTies(st.map(r => r[0]), st.map(r => r[1]), rng, 2); }
      if (Su && !Su.ko.PO) {
        const st = standings(Su); Su.winners = st.map(r => r[0]);
        // playoff: 2º da Sul-Americana recebe na volta o 3º da Libertadores
        const thirds = shuffle((L && L.thirds) || [], rng); const run = st.map(r => r[1]);
        Su.ko.PO = run.map((x, i) => thirds[i] ? tie(thirds[i].id, x.id, 2) : Object.assign(tie(x.id, x.id, 2), { w: x.id }));
      }
    }
    if (d.ph === 'PO' && d.md === 2 && Su && Su.ko.PO && Su.ko.PO.every(t => t.w) && !Su.ko.R16) {
      const win = Su.winners.map(x => ({ id: x.id, g: x.g })); const po = Su.ko.PO.map((t, i) => ({ id: t.w, g: 'po' + i }));
      Su.ko.R16 = crossTies(win, po, rng, 2);
    }
    const NEXT = { R16: 'QF', QF: 'SF', SF: 'F' };
    if (NEXT[d.ph] && d.md === 2) [L, Su].forEach(Cc => {
      if (!Cc) return; const cur = Cc.ko[d.ph], nx = NEXT[d.ph];
      if (cur && cur.every(t => t.w) && !Cc.ko[nx]) Cc.ko[nx] = nx === 'F' ? [tie(cur[0].w, cur[1].w, 1)] : nextRound(cur, str, 2);
    });
  }
  function afterWeek(S, w, ctx) {
    const { str, rng } = ctx; const d = CAL[w];
    if (d.t === 'cont' && S.cont) contAfter(S, d, ctx);
    if (d.t === 'est' && d.r === 6) {
      Object.values(S.est).forEach(e => { const t = sortRows(S.tables['E' + e.uf + e.tier]); if (t.length >= 2) e.final = tie(t[0].id, t[1].id, 1); else if (t.length === 1) e.final = Object.assign(tie(t[0].id, t[0].id, 1), { w: t[0].id }); });
    }
    if (d.t === 'cup') {
      const ph = S.cup[d.ph];
      if (ph && ph.every(t => t.w) && !S.cup[d.ph + 1] && d.ph + 1 < CUP.length) {
        const win = ph.map(t => t.w); const nxt = d.ph + 1;
        if (nxt <= 2) S.cup[nxt] = seedTies(win, str, 1);
        else if (nxt === 3) {
          // 16 avos: Série A + 12 classificados; potes por força, o mais fraco manda a ida
          const all = S.div.A.concat(win).sort((a, b) => str(b) - str(a));
          const p1 = shuffle(all.slice(0, 16), rng), p2 = shuffle(all.slice(16), rng);
          S.cup[3] = p1.map((x, i) => tie(p2[i], x, 2));
        } else S.cup[nxt] = drawTies(win, rng, CUP[nxt].legs);
      }
    }
    if (d.t === 'liga') {
      const r = d.r;
      if (r === 18 && !S.cq) {
        const t = sortRows(S.tables.C).map(x => x.id);
        const qa = [t[0], t[3], t[4], t[7]], qb = [t[1], t[2], t[5], t[6]];
        S.tables.CQA = {}; qa.forEach(id => S.tables.CQA[id] = row()); S.tables.CQB = {}; qb.forEach(id => S.tables.CQB[id] = row());
        const fa = double(qa, rng), fb = double(qb, rng);
        S.cq = { fx: fa.map((g, i) => g.map(m => m.concat('CQA')).concat(fb[i].map(m => m.concat('CQB')))) };
      }
      if (r === 25 && S.cq && !S.cf) {
        const a = sortRows(S.tables.CQA)[0], b = sortRows(S.tables.CQB)[0];
        const [w1, w2] = a.p > b.p || (a.p === b.p && a.gp - a.gc >= b.gp - b.gc) ? [a.id, b.id] : [b.id, a.id];
        S.cf = tie(w2, w1, 2); // melhor campanha decide em casa
      }
      if (r === 9 && !S.dko[0]) {
        const g = S.dgroups.map(k => sortRows(S.tables[k]).map(x => x.id));
        const ties = [];
        for (let i = 0; i < g.length; i += 2) { const A = g[i], B = g[i + 1]; ties.push(tie(B[3], A[0], 2), tie(B[2], A[1], 2), tie(A[3], B[0], 2), tie(A[2], B[1], 2)); }
        S.dko[0] = ties;
      }
      D_KO.forEach((K, ki) => {
        if (r === K.legs[1] && S.dko[ki] && S.dko[ki].every(t => t.w) && !S.dko[ki + 1] && ki + 1 < D_KO.length) {
          const win = S.dko[ki].map(t => t.w); const ties = [];
          for (let i = 0; i < win.length; i += 2) { const [x, y] = str(win[i]) >= str(win[i + 1]) ? [win[i + 1], win[i]] : [win[i], win[i + 1]]; ties.push(tie(x, y, 2)); }
          S.dko[ki + 1] = ties;
        }
      });
    }
  }

  // ---------- fim de temporada ----------
  function seasonOutcome(S) {
    const A = sortRows(S.tables.A), B = sortRows(S.tables.B), C1 = sortRows(S.tables.C);
    const up = { B: B.slice(0, 4).map(x => x.id), C: [], D: [] }, down = { A: A.slice(-4).map(x => x.id), B: B.slice(-4).map(x => x.id), C: C1.slice(-4).map(x => x.id) };
    if (S.tables.CQA) up.C = sortRows(S.tables.CQA).slice(0, 2).map(x => x.id).concat(sortRows(S.tables.CQB).slice(0, 2).map(x => x.id));
    const sf = S.dko[4]; if (sf) up.D = sf.flatMap(t => [t.a, t.b]);
    const cf = K => S.cont && S.cont[K] && S.cont[K].ko.F && S.cont[K].ko.F[0] && S.cont[K].ko.F[0].w;
    const champ = { A: A[0].id, B: B[0].id, C: S.cf && S.cf.w, D: S.dko[5] && S.dko[5][0] && S.dko[5][0].w, CDB: S.cup[7] && S.cup[7][0] && S.cup[7][0].w, LIB: cf('L') || null, SUL: cf('S') || null };
    const est = {}; Object.entries(S.est).forEach(([k, e]) => { if (e.final && e.final.w) est[k] = e.final.w; });
    return { up, down, champ, est };
  }

  // fase da Copa e da Série D em que o clube parou (para premiação e resumo)
  function cupReach(S, id) {
    let last = -1, out = false;
    S.cup.forEach((ph, i) => { if (!ph) return; const t = ph.find(x => x.a === id || x.b === id); if (t) { last = i; if (t.w && t.w !== id) out = true; } });
    if (last < 0) return null;
    const champion = S.cup[7] && S.cup[7][0] && S.cup[7][0].w === id;
    return { ph: last, name: CUP[last].name, out, champion };
  }

  // até onde o clube foi nas copas continentais (a mais alta em que jogou)
  const CONT_ORDER = ['G', 'PO', 'R16', 'QF', 'SF', 'F'];
  function contReach(S, id) {
    let best = null;
    Object.entries(S.cont || {}).forEach(([K, Cc]) => {
      let ph = Object.values(Cc.groups).some(g => g.includes(id)) ? 'G' : null, out = false;
      CONT_ORDER.slice(1).forEach(p => { const t = (Cc.ko[p] || []).find(x => (x.a === id || x.b === id) && x.a !== x.b); if (t) { ph = p; out = !!(t.w && t.w !== id); } });
      if (!ph) return;
      if (ph === 'G') out = K === 'L' ? !!Cc.ko.R16 : !!Cc.ko.PO && !(Cc.winners || []).some(x => x.id === id);
      const champion = !!(Cc.ko.F && Cc.ko.F[0] && Cc.ko.F[0].w === id);
      const r = { K, comp: CONT[K].comp, cup: CONT[K].name, ph, name: CONT_PH[ph], out, champion };
      // 3º da Libertadores que cai para o playoff da Sul-Americana: vale a copa em que está mais adiante
      if (!best || CONT_ORDER.indexOf(ph) > CONT_ORDER.indexOf(best.ph)) best = r;
    });
    return best;
  }

  // chave da tabela que vale para a diretoria (liga do clube)
  function leagueKey(S, id) {
    if (S.div.A.includes(id)) return 'A'; if (S.div.B.includes(id)) return 'B'; if (S.div.C.includes(id)) return 'C';
    return S.dgroups.find(k => S.tables[k] && S.tables[k][id]) || null;
  }
  function divOf(S, id) { return ['A', 'B', 'C', 'D'].find(d => S.div[d].includes(id)); }
  function estOf(S, id) { return Object.keys(S.est).find(k => S.est[k].ids.includes(id)) || null; }

  // artigo + preposição certo para o nome da fase: 'na 1ª fase', 'nas oitavas', 'nos 16 avos'
  function inPhase(name, prep = 'n') { const n = name.toLowerCase(); return `${prep}${/avos/.test(n) ? 'os' : /^(oitavas|quartas)/.test(n) ? 'as' : 'a'} ${n}`; }

  const api = { inPhase, CAL, WEEKS, SEASON_WEEKS, weekNo, ligaWeek, CONT, CONT_PH, CONT_ORDER, contReach, CUP, D_KO, C_Q, C_F, EST_NAME, DIV_NAME, buildSeason, fixturesOf, applyResult, afterWeek, sortRows, seasonOutcome, cupReach, leagueKey, divOf, estOf, penalties, tieRef };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Comps = api;
})(typeof window !== 'undefined' ? window : globalThis);
