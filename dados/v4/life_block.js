  // ---------- vida do técnico: licenças, cursos, coletivas, promessas e eventos (fase 3) ----------
  // Licenças reais da CBF Academy: cargas e preços da Trivela (abr/2025). A Pró é exigida na Série A (regra anunciada em 2021)
  // e nos torneios da Conmebol. No jogo, cada licença leva semanas de estudo e o clube paga o curso.
  const LIC = {
    B: { name: 'Licença B', hours: 260, price: 9030, weeks: 10, xp: 1 },
    A: { name: 'Licença A', hours: 330, price: 13200, weeks: 13, req: 'B', xp: 1.1 },
    PRO: { name: 'Licença Pró', hours: 450, price: 24900, weeks: 18, req: 'A', xp: 1.2 },
  };
  const LIC_ORDER = ['B', 'A', 'PRO'];
  // cursos livres: inventados para o jogo (não são cursos oficiais)
  const COURSES = {
    fisica: { name: 'Preparação física', weeks: 6, price: 6000, txt: 'Seus jogadores perdem 10% menos condição durante as partidas.' },
    analise: { name: 'Análise de desempenho', weeks: 6, price: 6000, txt: 'Seu time cria 2% mais chances.' },
    grupo: { name: 'Gestão de grupo', weeks: 5, price: 5000, txt: 'A moral cai 30% menos depois de derrotas.' },
    bola: { name: 'Bola parada', weeks: 5, price: 5000, txt: 'Seus cobradores valem +4 em pênaltis, faltas e escanteios.' },
    base: { name: 'Formação de jovens', weeks: 5, price: 5000, txt: 'Garotos da peneira chegam com +2 de nota.' },
  };
  function life(st) { st.life = st.life || { promises: [], presser: null, event: null, lastPresser: -9, lastEvent: -9, signs: 0, flags: {}, seasonQs: {} }; st.coach.courses = st.coach.courses || {}; if (!st.coach.lic) st.coach.lic = 'B'; return st.life; }
  function hasLic(st, need) { return !need || LIC_ORDER.indexOf(st.coach.lic || 'B') >= LIC_ORDER.indexOf(need); }
  function licNeed(div) { return div === 'A' ? 'PRO' : null; }
  function xpMult(st) { return (LIC[st.coach.lic || 'B'] || {}).xp || 1; }
  function course(st, k) { return !!(st.coach.courses || {})[k]; }
  // checa a exigência de licença do clube atual; sem ela, a CBF dá licença provisória até o fim da temporada
  function checkLicense(st) {
    const need = licNeed(st.clubs[st.coach.club].div); life(st);
    if (need && !hasLic(st, need)) { if (!st.coach.provisional || st.coach.provisional.year !== st.year) { st.coach.provisional = { need, year: st.year }; pushNews(st, 'club', `${st.coach.name} recebe licença provisória: precisa concluir a ${LIC[need].name} até o fim de ${st.year}.`); } }
    else st.coach.provisional = null;
  }
  function studyOptions(st) {
    const out = [];
    LIC_ORDER.forEach(k => { if (k === 'B') return; const L = LIC[k]; out.push({ k, kind: 'lic', name: L.name, weeks: L.weeks, price: L.price, hours: L.hours, done: hasLic(st, k), locked: !hasLic(st, L.req), req: L.req ? LIC[L.req].name : null, txt: `${L.hours} horas. XP ×${String(L.xp).replace('.', ',')}.${k === 'PRO' ? ' Exigida na Série A e nos torneios da Conmebol.' : ''}` }); });
    Object.entries(COURSES).forEach(([k, c]) => out.push({ k, kind: 'curso', name: c.name, weeks: c.weeks, price: c.price, done: course(st, k), locked: false, txt: c.txt }));
    return out;
  }
  function startStudy(st, k) {
    life(st); if (st.coach.study) return { ok: false, msg: 'Termine o curso atual antes de começar outro.' };
    const o = studyOptions(st).find(x => x.k === k); if (!o) return { ok: false };
    if (o.done) return { ok: false, msg: 'Você já concluiu este curso.' };
    if (o.locked) return { ok: false, msg: `Precisa da ${o.req} antes.` };
    if (st.clubs[st.coach.club].cash < o.price) return { ok: false, msg: 'Caixa insuficiente.' };
    money(st, 'curso', -o.price, `Curso do técnico: ${o.name}`);
    st.coach.study = { k, kind: o.kind, name: o.name, left: o.weeks, total: o.weeks };
    pushNews(st, 'club', `${st.coach.name} começa o curso: ${o.name}. Termina em ${o.weeks} semanas.`);
    return { ok: true, o };
  }

  // ---------- promessas ----------
  function addPromise(st, pr) { const L = life(st); pr.id = (L.pid = (L.pid || 0) + 1); pr.made = st.round; L.promises.push(pr); }
  function promiseEff(st, eff, label) {
    if (!eff) return;
    if (eff.conf) st.board.conf = Math.max(0, Math.min(100, st.board.conf + eff.conf));
    if (eff.moral) st.morale = Math.max(20, Math.min(92, st.morale + eff.moral));
    if (eff.hype) { const inf = infra(st); inf.hype = Math.max(0.8, Math.min(2.2, inf.hype + eff.hype)); }
    if (eff.xp) { st.coach.xp += eff.xp; st.coach.level = levelFromXp(st.coach.xp); }
  }
  function effTxt(eff) {
    if (!eff) return '';
    const p = []; const sg = v => (v > 0 ? '+' : '−') + Math.abs(v);
    if (eff.conf) p.push(`confiança ${sg(eff.conf)}`); if (eff.moral) p.push(`moral ${sg(eff.moral)}`); if (eff.hype) p.push(`procura na loja ${sg(Math.round(eff.hype * 100))}%`); if (eff.xp) p.push(`${sg(eff.xp)} XP`); if (eff.cash) p.push(`caixa ${eff.cash > 0 ? '+' : '−'}${fmt(Math.abs(eff.cash))}`);
    return p.join(', ');
  }
  // depois de cada jogo do usuário (e no fim da janela e da temporada), cobra as promessas
  function checkPromises(st, ctx) {
    const L = life(st); const done = [];
    L.promises = L.promises.filter(pr => {
      let res = null;
      if (ctx.match) {
        if (pr.kind === 'win' && pr.week === ctx.week) res = ctx.res === 'V';
        if (pr.kind === 'unbeaten') { if (ctx.res === 'D') res = false; else if (--pr.left <= 0) res = true; }
        if (pr.kind === 'youth') { pr.games--; if (ctx.xi.includes(pr.pid)) pr.got++; if (pr.got >= pr.need) res = true; else if (pr.games <= 0) res = false; }
        if (pr.kind === 'starter') { pr.games--; if (ctx.xi.includes(pr.pid)) pr.got++; if (pr.got >= pr.need) res = true; else if (pr.games <= 0) res = false; }
      }
      if (ctx.windowEnd && pr.kind === 'sign') res = L.signs > pr.base;
      if (ctx.season && pr.kind === 'meta') res = ctx.pos <= pr.pos;
      if (ctx.season && res === null && ['win', 'unbeaten', 'youth', 'starter', 'sign'].includes(pr.kind)) res = false;
      if (res === null) return true;
      promiseEff(st, res ? pr.ok : pr.fail);
      pushNews(st, 'club', `${res ? 'Promessa cumprida' : 'Promessa quebrada'}: ${pr.txt}.`);
      done.push({ txt: pr.txt, ok: res, eff: effTxt(res ? pr.ok : pr.fail) });
      return false;
    });
    return done;
  }

  // ---------- coletivas de imprensa ----------
  function sameCity(st, a, b) { return st.clubs[a].city && st.clubs[a].city === st.clubs[b].city; }
  function lastLeague(st, n) { const lk = leagueKey(st); const t = lk && st.comp.tables[lk] ? st.comp.tables[lk][st.coach.club] : null; return t ? t.form.slice(-n) : []; }
  function genPresser(st) {
    const L = life(st); const fx = userFixture(st); if (!fx || st.round - L.lastPresser < 2) return null;
    const me = st.coach.club; const c = st.clubs[me]; const opp = st.clubs[fx.opp]; const rng = rngFor(st, 'press', st.round);
    const diff = strength(st, fx.opp) - strength(st, me);
    const form = lastLeague(st, 4); const losses = form.filter(f => f === 'D').length; const streak = st.stats.winStreak;
    const yk = st.year + ':' + (st.round <= 20 ? 1 : 2);
    const kid = squadOf(st, me).filter(p => p.age <= 20 && !(st.lineup.slots || []).includes(p.id) && p.ovr >= xiFloor(st) - 12).sort((a, b) => b.ovr - a.ovr)[0];
    const big = fx.mt.tie && (fx.mt.leg === 2 || !fx.mt.leg) || sameCity(st, me, fx.opp) || diff >= 3;
    const Qs = [];
    if (!L.seasonQs[st.year + 'meta'] && fx.mt.key === leagueKey(st)) Qs.push(['meta', 10]);
    if (big) Qs.push(['big', 6]);
    if (losses >= 3) Qs.push(['crise', 8]);
    if (streak >= 4) Qs.push(['fase', 5]);
    if (windowOpen(st.round) && !L.seasonQs[yk + 'ref']) Qs.push(['reforcos', 5]);
    if (kid && !L.seasonQs[st.year + 'jovem']) Qs.push(['jovem', 3]);
    const special = Qs.length > 0;
    if (!special && rng() > 0.18) return null;
    if (special && rng() > 0.75) return null;
    const k = special ? rng.weighted(Qs, q => q[1])[0] : 'geral';
    const oppN = opp.name; const tgt = st.board.target;
    const P = {
      meta: { q: `Qual é o objetivo do ${c.name} em ${st.year}?`, opts: [
        { l: `Brigar por mais do que a meta`, now: { moral: 2, hype: 0.1 }, promise: { kind: 'meta', pos: Math.max(1, tgt.pos - 2), txt: `terminar em ${Math.max(1, tgt.pos - 2)}º ou melhor`, ok: { conf: 8, xp: 60 }, fail: { conf: -8 } } },
        { l: `Cumprir a meta da diretoria`, now: { conf: 1 } },
        { l: `Ir jogo a jogo, sem prometer nada`, now: { moral: 1 } }] },
      big: { q: `O jogo contra o ${oppN} ${fx.mt.tie ? 'vale vaga' : sameCity(st, me, fx.opp) ? 'é clássico' : 'é contra um time mais forte'}. Dá para vencer?`, opts: [
        { l: `Vamos vencer`, now: { moral: 2 }, promise: { kind: 'win', week: st.round, txt: `vencer o ${oppN}`, ok: { moral: 4, conf: 3, hype: 0.08 }, fail: { moral: -3, conf: -3 } } },
        { l: `Vamos competir de igual para igual`, now: { moral: 1 } },
        { l: `O favorito é o ${oppN}`, now: { moral: -1 }, flag: 'underdog' }] },
      crise: { q: `São ${losses} derrotas nos últimos 4 jogos da liga. O que está acontecendo?`, opts: [
        { l: `A responsabilidade é minha`, now: { conf: 3, moral: 1 } },
        { l: `Falta entrega de alguns jogadores`, now: { conf: 1, moral: -5 } },
        { l: `Vamos ficar 3 jogos sem perder`, now: { moral: 2 }, promise: { kind: 'unbeaten', left: 3, txt: 'ficar 3 jogos sem perder', ok: { conf: 5, moral: 3 }, fail: { conf: -6 } } }] },
      fase: { q: `${streak} vitórias seguidas. Esse time pode ganhar tudo?`, opts: [
        { l: `Ninguém segura esse time`, now: { hype: 0.15, moral: 2 }, promise: { kind: 'win', week: st.round, txt: `vencer o ${oppN} e manter a sequência`, ok: { moral: 2, hype: 0.1 }, fail: { moral: -3, conf: -2 } } },
        { l: `Pés no chão: é jogo a jogo`, now: { moral: 1, conf: 1 } }] },
      reforcos: { q: `A janela está aberta. Vai chegar reforço?`, opts: [
        { l: `Sim, vai chegar reforço`, now: { hype: 0.05 }, promise: { kind: 'sign', base: L.signs, txt: 'contratar pelo menos um reforço nesta janela', ok: { conf: 3, hype: 0.15 }, fail: { conf: -5, hype: -0.15 } } },
        { l: `Confio no elenco que tenho`, now: { moral: 4 } },
        { l: `Depende da diretoria`, now: { conf: -2, moral: 1 } }] },
      jovem: kid ? { q: `${kid.n}, ${kid.age} anos, vai ter chance?`, pid: kid.id, opts: [
        { l: `Vai ser titular em breve`, now: { moral: 1 }, promise: { kind: 'youth', pid: kid.id, games: 4, need: 2, got: 0, txt: `escalar ${kid.n} como titular em 2 dos próximos 4 jogos`, ok: { moral: 3, xp: 30 }, fail: { moral: -3 } } },
        { l: `Ainda precisa amadurecer`, now: {} }] } : null,
      geral: { q: `Como você avalia o momento do elenco?`, opts: [
        { l: `Grupo confiante`, now: { moral: 2, hype: 0.03 } },
        { l: `Precisamos melhorar`, now: { moral: -1, conf: 1 } }] },
    };
    const Q = P[k]; if (!Q) return null;
    if (k === 'meta') L.seasonQs[st.year + 'meta'] = 1; if (k === 'reforcos') L.seasonQs[yk + 'ref'] = 1; if (k === 'jovem') L.seasonQs[st.year + 'jovem'] = 1;
    L.lastPresser = st.round;
    return { k, week: st.round, q: Q.q, opts: Q.opts.map(o => ({ ...o, effTxt: effTxt(o.now), promTxt: o.promise ? `Promessa: ${o.promise.txt}. Cumprida: ${effTxt(o.promise.ok)}. Quebrada: ${effTxt(o.promise.fail)}.` : o.flag === 'underdog' ? 'Se perder este jogo, a diretoria cobra só metade.' : '' })) };
  }
  function xiFloor(st) { const s = squadOf(st, st.coach.club).map(p => p.ovr).sort((a, b) => b - a); return s[10] || 60; }
  function answerPresser(st, i) {
    const L = life(st); const pz = L.presser; if (!pz) return null; const o = pz.opts[i]; if (!o) return null;
    promiseEff(st, o.now);
    if (o.promise) addPromise(st, { ...o.promise, ok: { ...o.promise.ok }, fail: { ...o.promise.fail } });
    if (o.flag) L.flags[o.flag] = st.round;
    pushNews(st, 'club', `Coletiva: "${o.l}."`);
    L.presser = null;
    return { txt: o.l, eff: o.effTxt, prom: o.promise ? o.promise.txt : null };
  }

  // ---------- eventos da semana ----------
  function genEvent(st) {
    const L = life(st); if (st.round - L.lastEvent < 3) return null;
    const rng = rngFor(st, 'event', st.round); if (rng() > 0.32) return null;
    const me = st.coach.club; const sq = squadOf(st, me).filter(p => p.inj <= 0); const c = st.clubs[me];
    const top = sq.slice().sort((a, b) => b.ovr - a.ovr);
    const pool = [];
    const star = top.slice(0, 4).find(p => p.age >= 24 && p.age <= 31);
    if (star) pool.push(['aumento', 3]);
    pool.push(['balada', 2]);
    const young = top.find(p => p.age <= 22 && p.ovr >= (top[10] || top[top.length - 1]).ovr);
    if (young && windowOpen(st.round)) pool.push(['joia', 2]);
    if (st.sponsor) pool.push(['patrocinador', 2]);
    if (lastLeague(st, 4).filter(f => f === 'D').length >= 3) pool.push(['torcida', 3]);
    pool.push(['treino', 2]);
    const vet = sq.find(p => p.age >= 32 && !(st.lineup.slots || []).includes(p.id) && p.ovr >= (top[13] || top[top.length - 1]).ovr);
    if (vet) pool.push(['veterano', 2]);
    if (st.board.conf >= 70 && st.history.length >= 0 && st.round > 10) pool.push(['sondagem', 1]);
    pool.push(['palestra', 1]);
    const k = rng.weighted(pool, x => x[1])[0];
    const pick = arr => arr[Math.floor(rng() * arr.length)];
    let ev = null;
    if (k === 'aumento') { const p = star; const add = Math.round(p.wage * 0.2 / 1000) * 1000; ev = { k, pid: p.id, title: `${p.n} pede aumento`, txt: `${p.n} (${p.ovr}) quer 20% a mais de salário: +${fmt(add)} por semana.`, opts: [
      { l: 'Dar o aumento', eff: { moral: 3 }, act: 'raise', add, effTxt: `Folha +${fmt(add)}/sem., moral +3` },
      { l: 'Negar', eff: { moral: -2 }, act: 'deny', effTxt: 'Moral −2. 40% de chance de ele pedir para sair (vai à venda).' },
      { l: 'Prometer para o fim da temporada', eff: {}, act: 'later', add, effTxt: 'Sem custo agora; o aumento entra na próxima temporada.' }] }; }
    else if (k === 'balada') { const p = pick(sq.filter(x => x.age <= 29)); if (!p) return null; ev = { k, pid: p.id, title: 'Flagrado na balada', txt: `${p.n} foi visto numa festa na véspera do treino.`, opts: [
      { l: 'Multar e barrar no próximo jogo', eff: { moral: -1, conf: 1 }, act: 'bench', effTxt: `${p.n} fica suspenso 1 jogo. Moral −1, confiança +1.` },
      { l: 'Conversa reservada', eff: { moral: 1 }, act: 'talk', effTxt: `Moral +1. ${p.n} perde 15 de condição.` },
      { l: 'Deixar passar', eff: { moral: -2 }, act: 'none', effTxt: 'Moral −2: o grupo acha que há privilégio.' }] }; }
    else if (k === 'joia') { const p = young; const buyer = strengthRanks(st, 'A').find(id => id !== me && st.clubs[id].cash > 0) || strengthRanks(st, 'A')[0]; const fee = Math.round(E.valueFor(p.ovr, p.age, p.pos) * 1.5 / 10000) * 10000; ev = { k, pid: p.id, buyer, fee, title: `Proposta pela joia`, txt: `${st.clubs[buyer].name} oferece ${fmt(fee)} por ${p.n} (${p.age} anos, ${p.ovr}). É 50% acima do valor de mercado.`, opts: [
      { l: 'Vender', eff: {}, act: 'sell', effTxt: `Caixa +${fmt(fee)}. Moral −2.` },
      { l: 'Recusar e segurar', eff: { moral: 2 }, act: 'keep', effTxt: `Moral +2. ${p.n} fica e pode evoluir.` }] }; }
    else if (k === 'patrocinador') { const v = Math.round(st.sponsor.per * 1 / 1000) * 1000; ev = { k, title: 'Ação do patrocinador', txt: `${withB(st.sponsor.brand)} quer o elenco num evento de marketing nesta semana e paga ${fmt(v)}.`, opts: [
      { l: 'Aceitar', eff: { cash: v }, act: 'promo', effTxt: `Caixa +${fmt(v)}. Titulares perdem 8 de condição.` },
      { l: 'Recusar', eff: {}, act: 'none', effTxt: 'Sem efeito.' }] }; }
    else if (k === 'torcida') { ev = { k, title: 'Protesto da torcida', txt: `Depois das derrotas, um grupo de torcedores protesta no CT.`, opts: [
      { l: 'Receber os líderes', eff: { conf: 2, moral: -1 }, act: 'none', effTxt: 'Confiança +2, moral −1.' },
      { l: 'Ignorar', eff: { hype: -0.1 }, act: 'none', effTxt: 'Procura na loja −10%.' },
      { l: 'Pedir paciência na imprensa', eff: { conf: -1, hype: 0.05 }, act: 'none', effTxt: 'Confiança −1, procura na loja +5%.' }] }; }
    else if (k === 'treino') { const p = pick(top.slice(0, 11)); if (!p) return null; ev = { k, pid: p.id, title: 'Pancada no treino', txt: `${p.n} sentiu o tornozelo no treino.`, opts: [
      { l: 'Poupar por 2 semanas', eff: {}, act: 'rest', effTxt: `${p.n} fica 2 semanas fora.` },
      { l: 'Infiltração para jogar', eff: {}, act: 'risk', effTxt: `Joga normalmente; 30% de chance de virar lesão de 4 semanas.` }] }; }
    else if (k === 'veterano') { const p = vet; ev = { k, pid: p.id, title: `${p.n} quer jogar`, txt: `${p.n}, ${p.age} anos, cobra mais minutos.`, opts: [
      { l: 'Prometer chances', eff: { moral: 1 }, act: 'promise', effTxt: `Promessa: titular em 2 dos próximos 4 jogos (cumprida: moral +2; quebrada: moral −3).` },
      { l: 'Explicar que é reserva', eff: { moral: -1 }, act: 'none', effTxt: 'Moral −1.' }] }; }
    else if (k === 'sondagem') { const cand = jobCandidates(st); if (!cand.length) return null; const to = cand[0]; ev = { k, to, title: 'Sondagem', txt: `O ${st.clubs[to].name} (${C.DIV_NAME[st.clubs[to].div]}) sonda você para assumir o clube agora.`, opts: [
      { l: 'Recusar em público', eff: { conf: 5, moral: 2 }, act: 'none', effTxt: 'Confiança +5, moral +2.' },
      { l: `Aceitar e ir para o ${st.clubs[to].name}`, eff: {}, act: 'move', effTxt: 'Você troca de clube agora. A carreira segue no novo clube.' },
      { l: 'Usar para pedir mais verba', eff: { conf: -3 }, act: 'leverage', effTxt: 'Confiança −3; teto da folha +5%.' }] }; }
    else if (k === 'palestra') { ev = { k, title: 'Convite para palestra', txt: 'A federação convida você para falar num curso de técnicos.', opts: [
      { l: 'Aceitar', eff: { xp: 40 }, act: 'none', effTxt: '+40 XP. Seus jogadores perdem 3 de condição (treino com o auxiliar).', cond: 3 },
      { l: 'Recusar', eff: {}, act: 'none', effTxt: 'Sem efeito.' }] }; }
    if (!ev) return null;
    ev.week = st.round; L.lastEvent = st.round;
    return ev;
  }
  // clubes que podem querer o técnico: mais fortes, dentro da licença (com provisória para a Série A)
  function jobCandidates(st) {
    const me = st.coach.club; const d = st.clubs[me].div; const order = ['A', 'B', 'C', 'D'];
    const up = order[Math.max(0, order.indexOf(d) - 1)];
    const pool = strengthRanks(st, up).filter(id => id !== me).slice(-6);
    return pool.filter(id => strength(st, id) > strength(st, me)).slice(0, 2);
  }
  function answerEvent(st, i) {
    const L = life(st); const ev = L.event; if (!ev) return null; const o = ev.opts[i]; if (!o) return null;
    const p = ev.pid ? st.players[ev.pid] : null; const me = st.coach.club; const rng = rngFor(st, 'evans', st.round, ev.k);
    promiseEff(st, o.eff); if (o.eff && o.eff.cash) money(st, 'evento', o.eff.cash, ev.title);
    let extra = '';
    if (o.act === 'raise' && p) p.wage += o.add;
    if (o.act === 'deny' && p && rng() < 0.4) { p.listed = true; extra = ` ${p.n} pediu para sair e foi colocado à venda.`; }
    if (o.act === 'later' && p) { L.raises = (L.raises || []).concat({ pid: p.id, add: o.add }); }
    if (o.act === 'bench' && p) p.sus = Math.max(p.sus, 1);
    if (o.act === 'talk' && p) p.cond = Math.max(30, p.cond - 15);
    if (o.act === 'sell' && p) { transfer(st, p, ev.buyer, ev.fee); st.morale = Math.max(20, st.morale - 2); }
    if (o.act === 'promo') squadOf(st, me).forEach(x => { if ((st.lineup.slots || []).includes(x.id)) x.cond = Math.max(30, x.cond - 8); });
    if (o.act === 'rest' && p) p.inj = Math.max(p.inj, 2);
    if (o.act === 'risk' && p && rng() < 0.3) { p.injLater = 4; }
    if (o.act === 'promise' && p) addPromise(st, { kind: 'starter', pid: p.id, games: 4, need: 2, got: 0, txt: `escalar ${p.n} como titular em 2 dos próximos 4 jogos`, ok: { moral: 2 }, fail: { moral: -3 } });
    if (o.act === 'leverage') st.clubs[me].wageCap = Math.round(st.clubs[me].wageCap * 1.05 / 1000) * 1000;
    if (o.cond) squadOf(st, me).forEach(x => { x.cond = Math.max(30, x.cond - o.cond); });
    let moved = null;
    if (o.act === 'move') { const from = st.clubs[me].name; restartAfterFire(st, ev.to); checkLicense(st); moved = ev.to; pushNews(st, 'club', `${st.coach.name} deixa o ${from} e assume o ${st.clubs[ev.to].name}.`); }
    pushNews(st, 'club', `${ev.title}: ${o.l.toLowerCase()}.${extra}`);
    L.event = null;
    return { txt: o.l, eff: o.effTxt + extra, moved };
  }

  // semana a semana: estudo, promessas da janela, coletiva e evento novos
  function lifeWeek(st, report) {
    const L = life(st);
    // estudo
    const sd = st.coach.study;
    if (sd) {
      sd.left--;
      if (sd.left <= 0) {
        if (sd.kind === 'lic') st.coach.lic = sd.k; else st.coach.courses[sd.k] = true;
        st.coach.study = null; pushNews(st, 'club', `${st.coach.name} conclui: ${sd.name}.`); report.studied = sd.name;
        if (sd.kind === 'lic') checkLicense(st);
      }
    }
    // lesão escondida da infiltração aparece depois do jogo
    squadOf(st, st.coach.club).forEach(p => { if (p.injLater) { p.inj = Math.max(p.inj, p.injLater); delete p.injLater; pushNews(st, 'club', `${p.n} piora da lesão e fica ${p.inj} semanas fora.`); } });
    // fim de janela: promessa de reforço
    if (st.round === WINDOWS[0][1] + 1 || st.round === WINDOWS[1][1] + 1) { const r = checkPromises(st, { windowEnd: true }); if (r.length) report.promises = (report.promises || []).concat(r); }
    // coletiva e evento ignorados expiram
    if (L.presser && L.presser.week < st.round) { L.presser = null; }
    if (L.event && L.event.week < st.round) { const ev = L.event; L.event = null; pushNews(st, 'club', `${ev.title}: ficou sem resposta e nada mudou.`); }
    if (st.round < WEEKS && !st.fired) {
      if (!L.presser) L.presser = genPresser(st);
      if (!L.event) L.event = genEvent(st);
    }
  }

