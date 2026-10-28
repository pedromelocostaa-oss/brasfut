  function money(st, type, amount, txt) { st.clubs[st.coach.club].cash += amount; st.finance.unshift({ y: st.year, r: st.round + 1, type, amount, txt }); if (st.finance.length > 120) st.finance.length = 120; }

  // ---------- jogos da semana ----------
  function weekFixtures(st, w = st.round) { return st.comp && w < WEEKS ? C.fixturesOf(st.comp, w) : []; }
  function userFixture(st, w = st.round) {
    const me = st.coach.club; const mt = weekFixtures(st, w).find(m => m.h === me || m.a === me);
    if (!mt) return null;
    const isHome = mt.h === me;
    return { h: mt.h, a: mt.a, home: isHome && !mt.neutral, isHome, neutral: !!mt.neutral, opp: isHome ? mt.a : mt.h, comp: mt.comp, label: mt.label, mt };
  }
  // próxima semana com jogo do usuário (a partir de w)
  function nextUserWeek(st, w = st.round) { for (let i = w; i < WEEKS; i++) { const fx = userFixture(st, i); if (fx) return { w: i, fx }; } return null; }
  function leagueKey(st, id = st.coach.club) { return C.leagueKey(st.comp, id); }
  function sortedTable(st, key = leagueKey(st)) { return key && st.comp.tables[key] ? C.sortRows(st.comp.tables[key]) : []; }
  function position(st, clubId = st.coach.club, key = leagueKey(st, clubId)) { const r = sortedTable(st, key).find(x => x.id === clubId); return r ? r.pos : null; }

  // ---------- objetivos da partida ----------
  function genObjectives(st) {
    const fx = userFixture(st); if (!fx) { st.objectives = []; return; }
    const rng = rngFor(st, 'obj', st.round);
    const diff = strength(st, fx.opp) - strength(st, st.coach.club);
    const result = [['win', 'Vença o jogo'], ['score2', 'Marque 2 gols ou mais'], ['clean', 'Não sofra gols']];
    if (!fx.isHome && !fx.neutral) result.push(['awaypt', 'Pontue fora de casa']);
    if (diff >= 3) result.push(['nolose', 'Não perca para um rival mais forte']);
    const mgmt = [['youth', 'Escale um titular de até 21 anos'], ['fitness', 'Comece com todos os titulares descansados'], ['bench', 'Use as 5 substituições']];
    const a = rng.pick(result), b = rng.pick(mgmt);
    const rest = result.concat(mgmt).filter(x => x !== a && x !== b && x[0] !== a[0]);
    const c = rng.pick(rest);
    st.objectives = [a, b, c].map(([id, txt]) => ({ id, txt, done: false, xp: 20 }));
  }

  function checkObjectives(st, ctx) {
    const bonus = Math.round(wageBill(st, st.coach.club) * 0.02 / 1000) * 1000;
    const done = [];
    st.objectives.forEach(o => {
      let ok = false;
      if (o.id === 'win') ok = ctx.gf > ctx.ga;
      if (o.id === 'score2') ok = ctx.gf >= 2;
      if (o.id === 'clean') ok = ctx.ga === 0;
      if (o.id === 'awaypt') ok = !ctx.home && ctx.gf >= ctx.ga;
      if (o.id === 'nolose') ok = ctx.gf >= ctx.ga;
      if (o.id === 'youth') ok = ctx.xiPlayers.some(p => p.age <= 21);
      if (o.id === 'fitness') ok = ctx.xiPlayers.every(p => p.condStart >= 75);
      if (o.id === 'bench') ok = ctx.subs >= 5;
      o.done = ok; if (ok) { done.push(o); money(st, 'bonus', bonus, `Bônus por objetivo: ${o.txt.toLowerCase()}`); }
    });
    return { done, bonus };
  }

  // ---------- partidas ----------
  function aiSide(st, clubId, oppId, isHome, rng) {
    const c = st.clubs[clubId]; const squad = squadOf(st, clubId);
    const lu = E.autoLineup(squad, c.formation);
    const ment = E.aiMentality(strength(st, clubId) - strength(st, oppId), isHome);
    return { club: clubId, xi: E.lineupFrom(clubId, st.players, lu), bench: lu.bench.map(i => st.players[i]), ment, persona: null, morale: 50 };
  }

  function userSide(st) {
    const lu = st.lineup; const me = st.coach.club; const squad = squadOf(st, me);
    const ok = id => id && st.players[id] && st.players[id].club === me && st.players[id].inj <= 0 && st.players[id].sus <= 0;
    const assist = st.coach.assist !== false;
    const fslots = E.FORMATIONS[lu.formation].slots;
    // a escalacao do tecnico fica salva; trocas do auxiliar valem so para este jogo
    const slots = lu.slots.map((id, i) => (ok(id) && !lu.slots.slice(0, i).includes(id)) ? id : null);
    const notes = [];
    const used = new Set(slots.filter(Boolean));
    const pickFor = (i, minBetter) => {
      const pos = fslots[i][0]; let best = null, bv = -1;
      squad.forEach(p => { if (used.has(p.id) || p.inj > 0 || p.sus > 0) return; const v = E.effRating(p, pos, {}); if (v > bv) { bv = v; best = p; } });
      return best && bv > minBetter ? best : null;
    };
    slots.forEach((id, i) => { if (!id) { const b = pickFor(i, -1); if (b) { slots[i] = b.id; used.add(b.id); const orig = st.players[lu.slots[i]]; if (orig) notes.push({ out: orig.n, in: b.n, why: orig.inj > 0 ? 'lesão' : orig.sus > 0 ? 'suspensão' : 'ausência' }); } } });
    if (assist) slots.forEach((id, i) => {
      const p = st.players[id]; if (!p || p.cond >= 62 || fslots[i][0] === 'GK') return;
      const cur = E.effRating(p, fslots[i][0], {}); const b = pickFor(i, cur + 1);
      if (b) { used.delete(id); slots[i] = b.id; used.add(b.id); notes.push({ out: p.n, in: b.n, why: 'cansaço' }); }
    });
    const use = { ...lu, slots };
    const benchIds = (lu.bench || []).filter(id => ok(id) && !slots.includes(id));
    const fill = squad.filter(p => p.inj <= 0 && p.sus <= 0 && !slots.includes(p.id) && !benchIds.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
    while (benchIds.length < 9 && fill.length) benchIds.push(fill.shift().id);
    st.lineup = { ...lu, bench: (lu.bench || []).filter(id => st.players[id] && st.players[id].club === me) };
    return { club: me, xi: E.lineupFrom(me, st.players, use), bench: benchIds.map(i => st.players[i]), ment: lu.ment || 'equilibrada', persona: st.coach.persona, morale: st.morale, human: true, assist, notes };
  }

  function suggestMent(st) {
    const fx = userFixture(st); if (!fx) return 'equilibrada';
    return E.aiMentality(strength(st, st.coach.club) - strength(st, fx.opp), fx.home);
  }

  function prepareUserMatch(st) {
    const fx = userFixture(st); if (!fx) return null;
    const rng = rngFor(st, 'match', st.round, 'user');
    const me = userSide(st); const opp = aiSide(st, fx.opp, st.coach.club, !fx.isHome && !fx.neutral, rng);
    me.xi.forEach(o => { if (o.p) o.p.condStart = o.p.cond; });
    const m = E.newMatch({ home: fx.isHome ? me : opp, away: fx.isHome ? opp : me, rng, neutral: fx.neutral });
    m.userSide = fx.isHome ? 0 : 1; m.fx = fx; m.mt = fx.mt; m.auxNotes = me.notes || [];
    m.strength = [strength(st, fx.h), strength(st, fx.a)];
    return m;
  }

  function playAiWeek(st) {
    const out = []; const me = st.coach.club;
    weekFixtures(st).forEach((mt, gi) => {
      if (mt.h === me || mt.a === me) return;
      const rng = rngFor(st, 'match', st.round, gi);
      const m = E.newMatch({ home: aiSide(st, mt.h, mt.a, !mt.neutral, rng), away: aiSide(st, mt.a, mt.h, false, rng), rng, neutral: mt.neutral });
      E.playFull(m); m.mt = mt; out.push(m);
    });
    return out;
  }

  // aplica efeitos de uma partida terminada a jogadores, tabela e mata-mata
  function applyMatch(st, m, isUser) {
    const [gh, ga] = m.score; const h = m.side[0].club, a = m.side[1].club;
    const ratings = {};
    m.side.forEach((s, si) => {
      s.playedIds.forEach(pid => {
        const p = st.players[pid]; if (!p) return;
        const slotObj = s.xi.find(o => o.p && o.p.id === pid);
        const slot = slotObj ? slotObj.slot : p.pos;
        const r = E.matchRating(m.rng, p, slot, s, m, si);
        ratings[pid] = r;
        p.apps++; p.rsum += r; p.g += p._g || 0; p.a += p._a || 0;
        if (p.condLive != null) p.cond = Math.max(5, p.condLive);
        if (p._yc) { p.yc += p._yc >= 2 ? 0 : 1; if (p.yc >= 3) { p.sus = 1; p.yc = 0; } }
        if (p._red) p.sus = 1;
        if (p._inj) p.inj = p._inj;
      });
    });
    const gk = m.side.map(s => { const o = s.xi.find(x => x.slot === 'GK' && x.p); return o ? o.p.ovr : 60; });
    const t = C.applyResult(st.comp, m.mt, gh, ga, rngFor(st, 'pen', st.round, h, a), gk);
    return { h, a, gh, ga, user: isUser, ratings, comp: m.mt.comp, key: m.mt.key, label: m.mt.label, tie: t ? { w: t.w, pen: t.pen, legs: t.legs, g: t.g.slice(), a: t.a, b: t.b } : null };
  }

  function clearTemp(st) { Object.values(st.players).forEach(p => { delete p._g; delete p._a; delete p._yc; delete p._red; delete p._inj; delete p._hurt; delete p._off; delete p.condStart; delete p.condLive; }); }

  function recoverAll(st) {
    Object.values(st.players).forEach(p => {
      p.cond = Math.min(100, p.cond + 0.35 * (100 - p.cond) + 8);
      if (p.inj > 0) p.inj--; else if (p.sus > 0 && p._susServed) { p.sus = 0; delete p._susServed; }
    });
  }

  // ---------- fechar a semana (com ou sem jogo do usuário) ----------
  function finishRound(st, userMatch) {
    const me = st.coach.club;
    const report = { xp: 0, xpBefore: st.coach.xp, levelBefore: st.coach.level, evolutions: [], achievements: [], finance: [], conf: 0, objectives: [], news: [], week: st.round + 1, played: !!userMatch };
    const fixtures = weekFixtures(st);
    const aiMatches = playAiWeek(st);
    Object.values(st.players).forEach(p => { if (p.sus > 0) p._susServed = true; });
    const results = [];
    const ures = userMatch ? applyMatch(st, userMatch, true) : null; if (ures) results.push(ures);
    aiMatches.forEach(m => results.push(applyMatch(st, m, false)));
    st.results = results.map(r => ({ h: r.h, a: r.a, gh: r.gh, ga: r.ga, comp: r.comp, key: r.key, label: r.label, pen: r.tie && r.tie.w && r.tie.pen ? r.tie.pen : null }));
    let res = null, xp = 0, obj = { done: [], bonus: 0 }, fx = null, gf = 0, ga = 0;
    const goalCount = {};
    if (userMatch) {
      const us = userMatch.userSide; gf = userMatch.score[us]; ga = userMatch.score[1 - us];
      fx = userMatch.fx; const meSide = userMatch.side[us];
      const startXI = meSide.xi.map(o => o.p).filter(Boolean);
      userMatch.events.filter(e => e.t === 'goal' && e.side === us).forEach(e => goalCount[e.p] = (goalCount[e.p] || 0) + 1);
      obj = checkObjectives(st, { gf, ga, home: fx.home, xiPlayers: userMatch.startXI || startXI, subs: meSide.subs });
      report.objectives = st.objectives.map(o => ({ ...o })); report.objBonus = obj.bonus;
      res = gf > ga ? 'V' : gf < ga ? 'D' : 'E';
      xp = (res === 'V' ? 30 : res === 'E' ? 12 : 5) + obj.done.length * 20;
      st.morale = Math.max(20, Math.min(92, st.morale + (res === 'V' ? 8 : res === 'E' ? 1 : -7))); st.morale += (55 - st.morale) * 0.08;
      st.stats.winStreak = res === 'V' ? st.stats.winStreak + 1 : 0;
      st.stats.unbeaten = res !== 'D' ? st.stats.unbeaten + 1 : 0;
      st.stats.clean = ga === 0 ? st.stats.clean + 1 : 0;
      // diretoria: resultado contra o esperado pela força e pelo mando; distância da meta só conta nos jogos da liga
      const sd = strength(st, fx.opp) - strength(st, me);
      const ptsGot = res === 'V' ? 3 : res === 'E' ? 1 : 0;
      const pExp = Math.max(0.3, Math.min(2.6, 1.181 - 0.070 * sd + 0.388 * (fx.home ? 1 : 0)));
      let dc = Math.max(-7, Math.min(7, Math.round(2.0 * (ptsGot - pExp))));
      const lk = leagueKey(st); const isLeague = !!fx.mt.key && fx.mt.key === lk;
      const lrow = lk && st.comp.tables[lk] ? st.comp.tables[lk][me] : null; const lj = lrow ? lrow.j : 0;
      const pos = position(st);
      if (isLeague && lj >= 7) { const gap = pos - st.board.target.pos; if (gap > 5) dc -= 2; else if (gap > 2) dc -= 1; else if (gap <= 0) dc += 1; }
      if (st.clubs[me].cash < 0) dc -= 2;
      st.board.conf = Math.max(0, Math.min(100, st.board.conf + dc)); report.conf = dc;
      if (isLeague) { if (st.board.conf < 15 && lj >= 9 && pos - st.board.target.pos > 2) st.board.low++; else st.board.low = 0; }
      // conquistas
      const ach = k => { if (!st.achievements[k]) { st.achievements[k] = `${st.year}·S${st.round + 1}`; report.achievements.push(k); xp += 50; } };
      if (res === 'V') ach('first_win');
      if (gf - ga >= 3) ach('rout');
      if (res === 'V' && userMatch.events.some(e => e.t === 'goal' && e.score && e.score[us] < e.score[1 - us])) ach('comeback');
      if (res === 'V' && sd >= 4) ach('zebra');
      if (st.stats.clean >= 3) ach('wall');
      if (st.stats.winStreak >= 3) ach('streak3');
      if (st.stats.unbeaten >= 6) ach('unbeaten6');
      if (Object.values(goalCount).some(n => n >= 3)) ach('hattrick');
      if (isLeague && lj >= 3 && pos === 1) ach('leader');
      // evolução dos jogadores do usuário
      const rngEvo = rngFor(st, 'evo', st.round);
      Object.entries(ures.ratings).forEach(([pid, r]) => {
        const p = st.players[pid]; if (!p || p.club !== me) return;
        if (p.age <= 23 && p.ovr < p.pot) {
          let ch = Math.max(0.03, Math.min(0.38, 0.12 + 0.09 * (r - 6.5))); if (st.coach.persona === 'revelador') ch *= 1.5;
          if (rngEvo() < ch) { p.ovr++; if (p.at) p.at = p.at.map(v => Math.min(95, v + 1)); report.evolutions.push({ id: p.id, n: p.n, from: p.ovr - 1, to: p.ovr }); if (p.age <= 21 && p.ovr >= 75) ach('talent'); }
        } else if (p.age >= 31 && r < 6.0 && rngEvo() < 0.06) { p.ovr--; if (p.at) p.at = p.at.map(v => Math.max(30, v - 1)); report.evolutions.push({ id: p.id, n: p.n, from: p.ovr + 1, to: p.ovr }); }
        p.wage = Math.max(p.wage, E.wageFor(p.ovr) * 0.8 | 0);
      });
      // mata-mata decidido
      if (ures.tie && ures.tie.w) { report.tie = { ...ures.tie, won: ures.tie.w === me, label: fx.label }; }
    }
    // finanças semanais de todos os clubes
    const homeGame = {}; fixtures.forEach(mt => { if (!mt.neutral) homeGame[mt.h] = mt; });
    Object.values(st.clubs).forEach(c => {
      const isUser = c.id === me; const wb = wageBill(st, c.id);
      let gate = 0;
      if (homeGame[c.id]) {
        const lk = C.leagueKey(st.comp, c.id); const t = lk && st.comp.tables[lk] ? st.comp.tables[lk][c.id] : null;
        const formPts = t && t.form.length ? t.form.reduce((a, f) => a + (f === 'V' ? 3 : f === 'E' ? 1 : 0), 0) / (t.form.length * 3) : 0.5;
        const big = homeGame[c.id].comp === 'CDB' || (homeGame[c.id].tie && homeGame[c.id].comp !== 'EST') ? 1.25 : homeGame[c.id].comp === 'EST' ? 0.8 : 1;
        let fill = (0.30 + 0.45 * c.fan + 0.25 * formPts) * big; if (isUser) { fill *= 0.85 + 0.3 * st.board.conf / 100; if (st.coach.persona === 'carismatico') fill *= 1.1; }
        const att = Math.round(c.cap * Math.min(1, fill)); gate = att * c.ticket;
        if (isUser) report.attendance = att;
      }
      if (isUser) {
        money(st, 'tv', c.tv, 'Cota de TV');
        money(st, 'wage', -wb, 'Folha salarial');
        if (gate) money(st, 'gate', gate, `Bilheteria (${(report.attendance || 0).toLocaleString('pt-BR')} torcedores)`);
        report.finance = { tv: c.tv, wage: -wb, gate, bonus: obj.done.length * obj.bonus, sponsor: 0, winBonus: 0 };
        const sp = st.sponsor;
        if (sp) {
          money(st, 'sponsor', sp.per, `Patrocínio ${sp.brand.name}`); sp.earned += sp.per; report.finance.sponsor = sp.per; report.sponsorName = sp.brand.name;
          if (sp.winBonus && res === 'V') { money(st, 'sponsor', sp.winBonus, `Bônus por vitória (${sp.brand.name})`); sp.earned += sp.winBonus; report.finance.winBonus = sp.winBonus; }
          sp.left--;
          if (sp.left <= 0) { pushNews(st, 'club', `Fim do contrato com ${withB(sp.brand)}. Novas propostas de patrocínio na mesa.`); report.sponsorEnded = withB(sp.brand); st.sponsor = null; st.sponsorOffers = sponsorOffers(st); }
        }
      } else c.cash += c.tv - wb + gate;
    });
    // fases seguintes (mata-mata, quadrangulares, finais)
    const sm = {}; const str = id => sm[id] != null ? sm[id] : (sm[id] = strength(st, id));
    const before = { cup: st.comp.cup.length, dko: st.comp.dko.length, cq: !!st.comp.cq, cf: !!st.comp.cf };
    C.afterWeek(st.comp, st.round, { str, rng: rngFor(st, 'draw', st.round) });
    stageNews(st, before);
    marketTick(st, report);
    if (userMatch) {
      st.coach.xp += xp; report.xp = xp; st.coach.level = levelFromXp(st.coach.xp);
      const oppName = st.clubs[fx.opp].name; const myName = st.clubs[me].name;
      pushNews(st, 'result', `${fx.isHome ? myName + ' ' + gf + ' x ' + ga + ' ' + oppName : oppName + ' ' + ga + ' x ' + gf + ' ' + myName} (${fx.label})`);
      if (report.tie) pushNews(st, 'club', report.tie.won ? `${myName} avança: ${fx.label.split(' · ')[0]}.` : `${myName} é eliminado: ${fx.label.split(' · ')[0]}.`);
    }
    report.levelAfter = st.coach.level;
    report.unlocks = []; for (let l = report.levelBefore + 1; l <= report.levelAfter; l++) if (UNLOCKS[l]) report.unlocks.push(...UNLOCKS[l]);
    report.evolutions.forEach(e => pushNews(st, 'evo', `${e.n} evolui: ${e.from} → ${e.to}.`));
    const lk = leagueKey(st); const lead = sortedTable(st, lk)[0];
    if (lead && lead.j > 0 && st._lastLeader !== lk + lead.id && (lk === 'A' || lk === st.clubs[me].div)) { if (st._lastLeader && st._lastLeader.startsWith(lk)) pushNews(st, 'leader', `${st.clubs[lead.id].name} assume a liderança da ${C.DIV_NAME[lk] || 'liga'} com ${lead.p} pontos.`); st._lastLeader = lk + lead.id; }
    clearTemp(st); recoverAll(st);
    report.position = position(st); report.res = res; report.gf = gf; report.ga = ga; report.round = st.round + 1;
    if (ures) {
      report.mvp = (() => { let best = null; Object.entries(ures.ratings).forEach(([pid, r]) => { if (!best || r > best.r) best = { id: +pid, r, n: st.players[pid].n, club: st.players[pid].club }; }); return best; })();
      report.myRatings = Object.entries(ures.ratings).filter(([pid]) => st.players[pid].club === me).map(([pid, r]) => ({ id: +pid, n: st.players[pid].n, pos: st.players[pid].pos, r })).sort((a, b) => b.r - a.r);
      st.lastMatch = { round: st.round + 1, fx, label: fx.label, score: userMatch.score.slice(), events: userMatch.events.filter(e => e.t !== 'chance' || e.xg > 0.2) };
    }
    st.round++;
    if (st.board.low >= 3) { st.fired = true; pushNews(st, 'club', `${st.coach.name} é demitido do ${st.clubs[me].name}.`); }
    if (st.round >= WEEKS) report.season = endSeason(st);
    else { genObjectives(st); auctionTick(st); }
    return report;
  }
  // semana sem jogo do usuário
  function simWeek(st) { return finishRound(st, null); }

  // notícias quando as fases mudam
  function stageNews(st, before) {
    const S = st.comp, me = st.coach.club; const nm = id => st.clubs[id].name;
    if (S.cup.length > before.cup) { const ph = S.cup.length - 1; const t = S.cup[ph].find(x => x.a === me || x.b === me); pushNews(st, 'cup', `Copa do Brasil: sorteio da ${C.CUP[ph].name.toLowerCase()}${t ? '. Seu rival: ' + nm(t.a === me ? t.b : t.a) : ''}.`); }
    if (!before.cq && S.cq) pushNews(st, 'club', `Série C: definidos os quadrangulares do acesso.`);
    if (!before.cf && S.cf) pushNews(st, 'club', `Série C: final entre ${nm(S.cf.a)} e ${nm(S.cf.b)}.`);
    if (S.dko.length > before.dko) pushNews(st, 'club', `Série D: definida a ${C.D_KO[S.dko.length - 1].name.toLowerCase()}.`);
  }

  // ---------- mercado ----------
  const xiMemo = new WeakMap();
  function starters(st, clubId) {
    const key = st.round + ':' + st.year + ':' + (st.rosters[clubId] || []).join(',');
    let memo = xiMemo.get(st); if (!memo) { memo = {}; xiMemo.set(st, memo); }
    if (!memo[clubId] || memo[clubId].key !== key) memo[clubId] = { key, set: new Set(E.autoLineup(squadOf(st, clubId), st.clubs[clubId].formation).slots) };
    return memo[clubId].set;
  }
  function askPrice(st, p) {
    const inXi = p.club && st.clubs[p.club] ? starters(st, p.club).has(p.id) : false;
    const imp = inXi ? 1.25 : p.age <= 21 ? 1.1 : 1.0;
    return Math.round(E.valueFor(p.ovr, p.age, p.pos) * imp * (p.mkt || 1) / 10000) * 10000;
  }
  function marketList(st, filt = {}) {
    let list = Object.values(st.players).filter(p => p.club && st.clubs[p.club] && p.club !== st.coach.club && p.inj <= 0);
    if (filt.div) list = list.filter(p => st.clubs[p.club].div === filt.div);
    if (filt.pos) list = list.filter(p => p.pos === filt.pos);
    if (filt.maxAge) list = list.filter(p => p.age <= filt.maxAge);
    if (filt.minOvr) list = list.filter(p => p.ovr >= filt.minOvr);
    if (filt.q) { const q = filt.q.toLowerCase(); list = list.filter(p => p.n.toLowerCase().includes(q) || st.clubs[p.club].name.toLowerCase().includes(q)); }
    return list.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
  }
  function wageRoom(st) { const c = st.clubs[st.coach.club]; return c.wageCap - wageBill(st, st.coach.club); }

  function makeOffer(st, pid, fee) {
    const p = st.players[pid]; const me = st.clubs[st.coach.club];
    if (!windowOpen(st.round)) return { status: 'closed', msg: 'A janela de transferências está fechada.' };
    if (st.rosters[st.coach.club].length >= 42) return { status: 'blocked', msg: 'Elenco cheio (42). Venda alguém antes.' };
    const newWage = Math.round(E.wageFor(p.ovr) / 1000) * 1000;
    if (newWage > wageRoom(st)) return { status: 'blocked', msg: `O salário dele (${fmt(newWage)} por semana) estoura o teto da folha em ${fmt(newWage - wageRoom(st))}. Venda alguém para abrir espaço.` };
    if (fee > me.cash) return { status: 'blocked', msg: 'Caixa insuficiente para essa proposta.' };
    const neg = st.market.neg[pid] || (st.market.neg[pid] = { tries: 0, window: windowKey(st) });
    if (neg.window !== windowKey(st)) { neg.tries = 0; neg.window = windowKey(st); }
    if (neg.tries >= 3) return { status: 'refused', msg: `${st.clubs[p.club].name} encerrou a conversa até a próxima janela.` };
    neg.tries++;
    const ask = askPrice(st, p);
    if (fee >= ask || (neg.counter && fee >= neg.counter)) { transfer(st, p, st.coach.club, fee, newWage); if (fee <= ask * 0.9) unlockAch(st, 'dealer'); delete st.market.neg[pid]; return { status: 'accepted', msg: `Fechado! ${p.n} é do ${me.name} por ${fmt(fee)}.` }; }
    if (fee >= ask * 0.86) { const counter = Math.round((ask + fee) / 2 / 10000) * 10000; neg.counter = counter; return { status: 'counter', counter, msg: `${st.clubs[p.club].name} faz contraproposta: ${fmt(counter)}. ${3 - neg.tries} tentativa(s) restante(s).` }; }
    return { status: 'rejected', msg: `Recusada. Pedem perto de ${fmt(Math.round(ask / 100000) * 100000)}. ${3 - neg.tries} tentativa(s) restante(s).` };
  }
  function windowKey(st) { return st.year + ':' + (st.round <= 20 ? 1 : 2); }

  function transfer(st, p, toClub, fee, wage) {
    const from = p.club;
    st.rosters[from] = st.rosters[from].filter(id => id !== p.id);
    st.rosters[toClub].push(p.id);
    if (from === st.coach.club) money(st, 'sale', fee, `Venda de ${p.n}`); else st.clubs[from].cash += fee;
    if (toClub === st.coach.club) money(st, 'buy', -fee, `Contratação de ${p.n}`); else st.clubs[toClub].cash -= fee;
    p.club = toClub; if (wage) p.wage = wage; p.listed = false; p.mkt = 0.95 + Math.random() * 0.15;
    if (st.lineup) { st.lineup.slots = st.lineup.slots.map(id => id === p.id ? null : id); st.lineup.bench = (st.lineup.bench || []).filter(id => id !== p.id); }
    pushNews(st, 'transfer', `${p.n} troca o ${st.clubs[from].name} pelo ${st.clubs[toClub].name} por ${fmt(fee)}.`);
  }

  function unlockAch(st, k) { if (!st.achievements[k]) { st.achievements[k] = `${st.year}·S${st.round + 1}`; st.coach.xp += 50; st.coach.level = levelFromXp(st.coach.xp); st._newAch = (st._newAch || []).concat(k); } }

  function marketTick(st, report) {
    const rng = rngFor(st, 'market', st.round);
    st.market.offers = st.market.offers.filter(o => o.expires > st.round);
    if (!windowOpen(st.round + 1) && !windowOpen(st.round)) return;
    const myDiv = st.clubs[st.coach.club].div; const order = ['A', 'B', 'C', 'D'];
    squadOf(st, st.coach.club).forEach(p => {
      const v = E.valueFor(p.ovr, p.age, p.pos);
      const chance = p.listed ? 0.85 : (p.ovr >= strength(st, st.coach.club) + 2 ? 0.06 : 0);
      if (rng() < chance) {
        // compradores: clubes com caixa, da mesma série ou acima
        const buyers = Object.values(st.clubs).filter(c => c.id !== st.coach.club && c.cash > v * 0.8 && order.indexOf(c.div) <= order.indexOf(myDiv) + 1);
        if (!buyers.length) return;
        const b = rng.pick(buyers); const fee = Math.round(v * (0.8 + rng() * 0.35) / 10000) * 10000;
        st.market.offers.push({ pid: p.id, club: b.id, fee, expires: st.round + 3 });
        if (report) report.offers = (report.offers || 0) + 1;
      }
    });
  }
  function acceptOffer(st, idx) {
    const o = st.market.offers[idx]; if (!o) return null; const p = st.players[o.pid];
    if (!windowOpen(st.round)) return { msg: 'A venda só fecha com a janela aberta.' };
    if (st.rosters[st.coach.club].length <= 18) return { msg: 'Elenco mínimo é 18 jogadores.' };
    const v = E.valueFor(p.ovr, p.age, p.pos);
    transfer(st, p, o.club, o.fee); if (o.fee > v) unlockAch(st, 'seller');
    st.market.offers = st.market.offers.filter(x => x.pid !== o.pid);
    return { msg: `${p.n} vendido ao ${st.clubs[o.club].name} por ${fmt(o.fee)}.` };
  }
  function quickSell(st, pid) {
    const p = st.players[pid]; if (!windowOpen(st.round)) return { msg: 'A venda só fecha com a janela aberta.' };
    if (st.rosters[st.coach.club].length <= 18) return { msg: 'Elenco mínimo é 18 jogadores.' };
    const rng = rngFor(st, 'quick', pid, st.round);
    const v = E.valueFor(p.ovr, p.age, p.pos); const fee = Math.round(v * 0.75 / 10000) * 10000;
    const myDiv = st.clubs[st.coach.club].div;
    const buyer = rng.pick(Object.values(st.clubs).filter(c => c.id !== st.coach.club && c.div === myDiv));
    transfer(st, p, buyer.id, fee); return { msg: `${p.n} vendido ao ${buyer.name} por ${fmt(fee)} (venda rápida).` };
  }

  // leilão relâmpago: jogador sem clube aparece no começo de cada janela
  function auctionTick(st) {
    const r = st.round; if (st.market.auction && st.market.auction.round !== r) st.market.auction = null;
    if (!windowOpen(r) || st.market.auctionsDone.includes(st.year + ':' + r)) return;
    if (r !== 1 && r !== 31) return;
    const rng = rngFor(st, 'auction', r);
    const base = strength(st, st.coach.club);
    const pos = rng.pick(['ST', 'AM', 'RW', 'CB', 'DM', 'LW']);
    const age = rng.int(24, 31);
    const p = E.genPlayer(rng, pos, Math.min(88, base + rng.int(1, 5)), age, null, st.nextId++);
    p.club = null; st.players[p.id] = p;
    const start = Math.round(E.valueFor(p.ovr, p.age, p.pos) * 0.35 / 10000) * 10000;
    const myDiv = st.clubs[st.coach.club].div;
    st.market.auction = { pid: p.id, round: r, start, bid: start, leader: null, rivals: Object.values(st.clubs).filter(c => c.id !== st.coach.club && c.div === myDiv).sort(() => rng() - 0.5).slice(0, 3).map(c => c.id), cap: Math.round(E.valueFor(p.ovr, p.age, p.pos) * (0.75 + rng() * 0.4) / 10000) * 10000, status: 'open' };
    st.market.auctionsDone.push(st.year + ':' + r);
    pushNews(st, 'transfer', `Leilão relâmpago: ${p.n} (${E.POS_NAME[p.pos]}, ${p.ovr}) está sem clube.`);
  }
  function auctionBid(st) {
    const a = st.market.auction; if (!a || a.status !== 'open') return null;
    const p = st.players[a.pid]; const next = Math.round(a.bid * 1.1 / 10000) * 10000;
    const newWage = E.wageFor(p.ovr);
    if (newWage > wageRoom(st)) return { msg: `O salário dele estoura o teto da folha em ${fmt(newWage - wageRoom(st))}.` };
    if (next > st.clubs[st.coach.club].cash) return { msg: 'Caixa insuficiente para cobrir o lance.' };
    a.bid = next; a.leader = 'me'; return { msg: `Seu lance: ${fmt(next)}.` };
  }
  function auctionRivalTick(st, rng) {
    const a = st.market.auction; if (!a || a.status !== 'open') return null;
    if (a.bid * 1.1 <= a.cap && (a.leader === 'me' || a.leader === null) && rng() < 0.55) { a.bid = Math.round(a.bid * 1.1 / 10000) * 10000; a.leader = rng.pick(a.rivals); return { rival: a.leader, bid: a.bid }; }
    return null;
  }
  function auctionClose(st) {
    const a = st.market.auction; if (!a || a.status !== 'open') return null;
    const p = st.players[a.pid]; a.status = 'closed';
    if (a.leader === 'me') {
      st.players[p.id].club = st.coach.club; st.rosters[st.coach.club].push(p.id); p.wage = E.wageFor(p.ovr);
      money(st, 'buy', -a.bid, `Leilão: ${p.n}`); pushNews(st, 'transfer', `${p.n} arrematado pelo ${st.clubs[st.coach.club].name} por ${fmt(a.bid)}.`);
      return { won: true, msg: `Arrematado! ${p.n} é seu por ${fmt(a.bid)}.` };
    }
    const club = a.leader || a.rivals[0]; p.club = club; st.rosters[club].push(p.id); st.clubs[club].cash -= a.bid; p.wage = E.wageFor(p.ovr);
    pushNews(st, 'transfer', `${p.n} fica com o ${st.clubs[club].name} por ${fmt(a.bid)}.`);
    return { won: false, msg: `${st.clubs[club].name} levou ${p.n} por ${fmt(a.bid)}.` };
  }

  // ---------- fim de temporada ----------
  function endSeason(st) {
    st.seasonOver = true;
    const me = st.coach.club, myc = st.clubs[me], d = myc.div;
    const out = C.seasonOutcome(st.comp); st.lastOutcome = out;
    const lk = leagueKey(st); const tab = sortedTable(st, lk); const myRow = tab.find(r => r.id === me);
    const myPos = myRow.pos; const met = myPos <= st.board.target.pos;
    const tvRef = myc.tvFull || myc.tv;
    const prize = Math.round(tvRef * Math.max(0, tab.length + 1 - myPos) * 0.22 * (d === 'D' ? 3 : 1) / 10000) * 10000;
    money(st, 'prize', prize, `Premiação: ${myPos}º lugar (${d === 'D' ? 'grupo da Série D' : C.DIV_NAME[d]})`);
    const reach = C.cupReach(st.comp, me);
    let cupPrize = 0;
    if (reach) { cupPrize = Math.round(tvRef * (CUP_PRIZE[reach.ph] + (reach.champion ? 20 : 0)) / 10000) * 10000; money(st, 'prize', cupPrize, `Copa do Brasil: ${reach.champion ? 'campeão' : reach.name}`); }
    const estKey = C.estOf(st.comp, me); const estWon = estKey && out.est[estKey] === me;
    if (estWon) money(st, 'prize', Math.round(tvRef * 3 / 10000) * 10000, `Título: ${st.comp.est[estKey].name}`);
    const promo = (out.up[d] || []).includes(me) ? 'up' : (out.down[d] || []).includes(me) ? 'down' : null;
    const divChamp = out.champ[d] === me, cupChamp = out.champ.CDB === me;
    let titleBonus = 0;
    if (st.sponsor && st.sponsor.titleBonus && (divChamp || cupChamp)) { titleBonus = st.sponsor.titleBonus; money(st, 'sponsor', titleBonus, `Bônus por título (${st.sponsor.brand.name})`); st.sponsor.earned += titleBonus; }
    let xp = (met ? 150 : 40) + (divChamp ? (d === 'A' ? 300 : 120) : 0) + (cupChamp ? 250 : 0) + (promo === 'up' ? 200 : 0) + (estWon ? 80 : 0);
    if (d === 'A' && divChamp) unlockAch(st, 'champion');
    if (cupChamp) unlockAch(st, 'copa');
    if (promo === 'up') unlockAch(st, 'acesso');
    if (estWon) unlockAch(st, 'estadual');
    st.coach.xp += xp; st.coach.level = levelFromXp(st.coach.xp);
    st.board.conf = Math.max(20, Math.min(95, st.board.conf + (met ? 15 : -15) + (promo === 'up' ? 10 : promo === 'down' ? -10 : 0)));
    if (met) myc.wageCap = Math.round(myc.wageCap * 1.08 / 1000) * 1000;
    const divIds = new Set(divClubs(st, d));
    const scorers = Object.values(st.players).filter(p => p.club && divIds.has(p.club)).sort((a, b) => b.g - a.g).slice(0, 3).map(p => ({ n: p.n, club: p.club, g: p.g }));
    const summary = { year: st.year, div: d, league: d === 'D' ? 'Série D' : C.DIV_NAME[d], pos: myPos, points: myRow.p, champion: out.champ[d] || null, champs: out.champ, met, target: st.board.target, prize, cupPrize, titleBonus, xp, scorers, promo, cup: reach, est: estKey ? { name: st.comp.est[estKey].name, won: estWon, champ: out.est[estKey] || null } : null, up: out.up, down: out.down };
    st.history.push(summary);
    if (out.champ.A) pushNews(st, 'club', `${st.clubs[out.champ.A].name} é campeão brasileiro de ${st.year}.`);
    if (out.champ.CDB) pushNews(st, 'club', `${st.clubs[out.champ.CDB].name} é campeão da Copa do Brasil de ${st.year}.`);
    if (promo === 'up') pushNews(st, 'club', `${myc.name} conquista o acesso para a ${C.DIV_NAME[{ B: 'A', C: 'B', D: 'C' }[d]]}!`);
    if (promo === 'down') pushNews(st, 'club', `${myc.name} é rebaixado para a ${C.DIV_NAME[{ A: 'B', B: 'C', C: 'D' }[d]]}.`);
    return summary;
  }

  function moveDiv(st, id, to) {
    const c = st.clubs[id]; const from = c.div; if (from === to) return;
    const k = DIV_TV[to] / DIV_TV[from];
    c.div = to; c.tv = Math.round(c.tv * k / 1000) * 1000;
    if (c.tvFull) c.tvFull = Math.round(c.tvFull * k / 1000) * 1000;
    if (c.sponsorBase) c.sponsorBase = Math.round(c.sponsorBase * Math.sqrt(k) / 1000) * 1000;
    if (k > 1) c.wageCap = Math.round(c.wageCap * 1.25 / 1000) * 1000;
  }

  function nextSeason(st) {
    const out = st.lastOutcome || C.seasonOutcome(st.comp);
    // acesso e rebaixamento: 4 sobem e 4 descem entre cada série
    out.down.A.forEach(id => moveDiv(st, id, 'B')); out.up.B.forEach(id => moveDiv(st, id, 'A'));
    out.down.B.forEach(id => moveDiv(st, id, 'C')); out.up.C.forEach(id => moveDiv(st, id, 'B'));
    out.down.C.forEach(id => moveDiv(st, id, 'D')); out.up.D.forEach(id => moveDiv(st, id, 'C'));
    const rng = rngFor(st, 'aging');
    st.year++;
    Object.values(st.players).forEach(p => {
      if (!p.club) return;
      p.age++;
      let d = 0;
      if (p.age <= 20) d = rng.int(1, 4); else if (p.age <= 23) d = rng.int(0, 2); else if (p.age <= 28) d = rng.int(-1, 1); else if (p.age <= 31) d = rng.int(-2, 0); else d = rng.int(-3, -1);
      const nv = Math.max(45, Math.min(p.age <= 23 ? Math.max(p.pot, p.ovr) : 95, p.ovr + d));
      if (p.at) p.at = p.at.map(v => Math.max(30, Math.min(95, v + (nv - p.ovr))));
      p.ovr = nv;
      p.cond = 100; p.inj = 0; p.sus = 0;
      if (p.age >= 36) { // aposenta e entra um garoto da base
        const club = st.clubs[p.club]; const np = E.genPlayer(rng, p.pos, club.base - 10 + rng.int(-2, 3), 17, club.id, st.nextId++);
        np.youth = true; st.players[np.id] = np; st.rosters[club.id] = st.rosters[club.id].map(id => id === p.id ? np.id : id); p.club = null;
        if (club.id === st.coach.club) pushNews(st, 'club', `${p.n} se aposenta. ${np.n}, 17 anos, sobe da base.`);
      }
    });
    st.market.neg = {}; st.market.offers = []; st.market.auction = null;
    startSeason(st);
    st.lineup = { ...E.autoLineup(squadOf(st, st.coach.club), st.lineup.formation), ment: st.lineup.ment };
  }

  function restartAfterFire(st, newClub) {
    st.coach.club = newClub; st.fired = false; st.board.conf = 55; st.board.low = 0; st.morale = 55;
    splitSponsor(st, newClub); st.sponsor = null; st.sponsorOffers = sponsorOffers(st);
    setTarget(st);
    st.lineup = { ...E.autoLineup(squadOf(st, newClub), '4-3-3'), ment: 'equilibrada' };
    genObjectives(st); pushNews(st, 'club', `${st.coach.name} assume o ${st.clubs[newClub].name}.`);
  }
  // propostas depois da demissão: clubes mais fracos da mesma série e os melhores da série de baixo
  function fireOffers(st) {
    const me = st.coach.club, d = st.clubs[me].div; const order = ['A', 'B', 'C', 'D'];
    const same = strengthRanks(st, d).filter(id => id !== me); const myIdx = strengthRanks(st, d).indexOf(me);
    const weaker = same.slice(Math.max(0, myIdx)).slice(0, 2);
    const low = order[Math.min(3, order.indexOf(d) + 1)];
    const below = low !== d ? strengthRanks(st, low).slice(0, 1) : same.slice(-1);
    return weaker.concat(below).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 3);
  }

  function fmt(v) {
    const a = Math.abs(v); const s = v < 0 ? '−' : '';
    if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: a >= 1e8 ? 0 : 1 })} mi`;
    if (a >= 1e3) return `${s}R$ ${Math.round(a / 1e3).toLocaleString('pt-BR')} mil`;
    return `${s}R$ ${a.toLocaleString('pt-BR')}`;
  }

  const api = { WEEKS, WINDOWS, LEVELS, LEVEL_TITLES, UNLOCKS, ACH, TICKET, CUP_PRIZE, rngFor, hashSeed, levelFromXp, formationsFor, squadOf, wageBill, strength, windowOpen, windowInfo, strengthRanks, divClubs, targetFor, newCareer, startSeason, weekFixtures, userFixture, nextUserWeek, leagueKey, sortedTable, position, prepareUserMatch, suggestMent, sponsorOffers, signSponsor, sponsorPending, sponsorPerf, migrate, BRANDS, withB, finishRound, simWeek, askPrice, marketList, wageRoom, makeOffer, acceptOffer, quickSell, auctionBid, auctionRivalTick, auctionClose, nextSeason, restartAfterFire, fireOffers, fmt, userSide };
  if (NODE) module.exports = api; else root.Game = api;
})(typeof window !== 'undefined' ? window : globalThis);
