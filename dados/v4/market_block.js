  // ---------- mercado: preço pedido, disposição do jogador, propostas, empréstimos e mercado da IA ----------
  const DIV_PREST = { A: 60, B: 40, C: 25, D: 12 };
  function prestige(st, id) { const c = st.clubs[id]; return DIV_PREST[c.div] + (strength(st, id) - 60) * 0.8 + (c.fan || 0.3) * 10; }
  function mValue(p) { return E.valueFor(p.ovr, p.age, p.pos); }
  const r10 = v => Math.max(10000, Math.round(v / 10000) * 10000);
  function topIds(st, clubId, n) { return squadOf(st, clubId).slice().sort((a, b) => b.ovr - a.ovr).slice(0, n).map(p => p.id); }
  function contOf(st, id) { return !!(st.cont && st.cont.clubs && st.cont.clubs.includes(id)); }
  function loanFee(p) { return r10(mValue(p) * 0.05); }

  // preço pedido pelo clube dono, com os motivos (em % sobre o valor de mercado)
  function sellerAsk(st, p, buyerId = st.coach.club) {
    const v = mValue(p) * (p.mkt || 1); const reasons = []; let f = 1;
    const c = st.clubs[p.club]; const inXi = starters(st, p.club).has(p.id);
    if (topIds(st, p.club, 3).includes(p.id)) { f *= 1.4; reasons.push(['Um dos 3 melhores do elenco', 40]); }
    else if (inXi) { f *= 1.25; reasons.push(['Titular no clube', 25]); }
    if (p.age <= 21) { f *= 1.1; reasons.push(['Jovem (até 21 anos)', 10]); }
    if (c.cash < 0) { f *= 0.85; reasons.push(['Clube precisa de dinheiro', -15]); }
    if (buyerId && st.clubs[buyerId] && st.clubs[buyerId].div === c.div) { f *= 1.1; reasons.push(['Venda para rival da mesma série', 10]); }
    if ((p.contract || 2) <= 1) { f *= 0.85; reasons.push(['Último ano de contrato', -15]); }
    return { ask: r10(v * f), value: r10(mValue(p)), reasons };
  }
  function askPrice(st, p) { return sellerAsk(st, p).ask; }

  // disposição do jogador para vir ao seu clube (0 a 100; precisa de 50 para aceitar)
  function disposition(st, p, wageOffer) {
    const me = st.coach.club; const reasons = []; let s = 50;
    const dp = Math.max(-30, Math.min(30, Math.round(0.9 * (prestige(st, me) - prestige(st, p.club)))));
    if (dp) { s += dp; reasons.push([dp > 0 ? 'Seu clube é maior que o dele' : 'Seu clube é menor que o dele', dp]); }
    const fam = E.FAM[p.pos]; const mine = squadOf(st, me).filter(x => E.FAM[x.pos] === fam && x.id !== p.id).sort((a, b) => b.ovr - a.ovr);
    const n = { GOL: 1, ZAG: 2, LAT: 2, MEI: 3, ATA: 3 }[fam]; const bar = mine[n - 1] ? mine[n - 1].ovr : 0;
    let pt = p.ovr > bar + 1 ? 12 : p.ovr >= bar - 2 ? 3 : -12;
    if (pt > 0 && p.club && !starters(st, p.club).has(p.id)) pt += 6;
    s += pt; reasons.push([pt >= 10 ? 'Seria titular no seu time' : pt > 0 ? 'Brigaria por posição' : 'Seria reserva no seu time', pt]);
    const ratio = wageOffer / Math.max(1000, p.wage); const ws = Math.round(Math.max(-30, Math.min(30, (ratio - 1) * 60)));
    if (ws) { s += ws; reasons.push([`Salário oferecido: ${Math.round(ratio * 100)}% do atual`, ws]); }
    if (p.age >= 31 && pt > 0) { s += 5; reasons.push(['Veterano quer jogar', 5]); }
    if (p.age <= 22 && dp >= 10) { s += 5; reasons.push(['Jovem quer clube maior', 5]); }
    if ((p.contract || 2) <= 1) { s += 5; reasons.push(['Contrato dele acabando', 5]); }
    if (contOf(st, me) && !contOf(st, p.club)) { s += 6; reasons.push(['Você joga torneio continental', 6]); }
    s = Math.round(s);
    const label = s >= 65 ? 'Quer vir' : s >= 50 ? 'Aberto a conversar' : s >= 35 ? 'Quer salário maior' : 'Não quer vir';
    return { score: s, label, reasons };
  }

  // proposta sua por um jogador de outro clube: compra ou empréstimo
  function makeOffer(st, pid, o) {
    if (typeof o === 'number') o = { type: 'buy', fee: o };
    const p = st.players[pid]; const meId = st.coach.club; const me = st.clubs[meId]; const seller = st.clubs[p.club];
    if (!windowOpen(st.round)) return { status: 'closed', msg: 'A janela de transferências está fechada.' };
    if (p.loan) return { status: 'blocked', msg: `${p.n} está emprestado pelo ${st.clubs[p.loan.owner].name}. Só dá para negociar quando o empréstimo acabar.` };
    if (st.rosters[meId].length >= SQUAD_MAX) return { status: 'blocked', msg: `Elenco cheio (${SQUAD_MAX}). Venda ou empreste alguém antes.` };
    const wage = Math.round((o.wage || p.wage) / 1000) * 1000;
    const myWage = o.type === 'loan' ? Math.round(wage * (o.share ?? 1) / 1000) * 1000 : wage;
    if (myWage > wageRoom(st)) return { status: 'blocked', msg: `O salário (${fmt(myWage)} por semana para você) estoura o teto da folha em ${fmt(myWage - wageRoom(st))}.` };
    const upfront = o.type === 'loan' ? loanFee(p) : o.fee;
    if (upfront > me.cash) return { status: 'blocked', msg: 'Caixa insuficiente para essa proposta.' };
    const neg = st.market.neg[pid] || (st.market.neg[pid] = { tries: 0, window: windowKey(st) });
    if (neg.window !== windowKey(st)) { neg.tries = 0; neg.window = windowKey(st); delete neg.counter; delete neg.offended; }
    if (neg.offended) return { status: 'refused', msg: `${seller.name} se sentiu desrespeitado e não negocia mais ${p.n} nesta janela.` };
    if (neg.tries >= 3) return { status: 'refused', msg: `${seller.name} encerrou a conversa até a próxima janela.` };
    neg.tries++; const left = 3 - neg.tries;
    const A = sellerAsk(st, p);
    if (o.type === 'buy') {
      const r = o.fee / A.ask;
      if (!(o.fee >= A.ask || (neg.counter && o.fee >= neg.counter))) {
        if (r >= 0.85) { const counter = r10((A.ask + o.fee) / 2); neg.counter = counter; return { status: 'counter', counter, msg: `${seller.name} faz contraproposta: ${fmt(counter)}. ${left} ${left === 1 ? 'tentativa restante' : 'tentativas restantes'}.` }; }
        if (r >= 0.7) return { status: 'rejected', msg: `${seller.name} recusou. Pede perto de ${fmt(A.ask)}. ${left} ${left === 1 ? 'tentativa restante' : 'tentativas restantes'}.` };
        neg.offended = true; return { status: 'offended', msg: `${seller.name} achou a oferta baixa demais (${Math.round(r * 100)}% do pedido) e encerrou a negociação nesta janela.` };
      }
    } else {
      const inXi = starters(st, p.club).has(p.id); const key = topIds(st, p.club, 3).includes(p.id);
      const share = o.share ?? 1;
      let sc = 0.45 + (share >= 1 ? 0.25 : share >= 0.5 ? 0.1 : -0.1) - (inXi ? 0.35 : 0) - (key ? 0.5 : 0) + (p.age <= 21 && !inXi ? 0.15 : 0);
      if (o.obligation) sc += o.buyFee >= A.ask * 0.9 ? 0.35 : o.buyFee >= A.value * 0.8 ? 0.1 : -0.2;
      if (sc < 0.5) return { status: 'rejected', msg: `${seller.name} não empresta ${p.n} ${key ? '(é um dos melhores do elenco)' : inXi ? '(é titular lá)' : 'nessas condições'}. ${share < 1 ? 'Pagar todo o salário ajuda. ' : ''}${!o.obligation ? 'Com obrigação de compra fica mais fácil. ' : ''}${left} ${left === 1 ? 'tentativa restante' : 'tentativas restantes'}.` };
    }
    const d = disposition(st, p, wage);
    if (d.score < 50) return { status: 'player', d, msg: `${seller.name} topou, mas ${p.n} não quer vir agora (${d.label.toLowerCase()}). ${d.score >= 35 ? 'Um salário maior pode convencer.' : 'Nem com salário maior, por enquanto.'}` };
    delete st.market.neg[pid];
    if (o.type === 'buy') {
      transfer(st, p, meId, o.fee, wage); if (o.fee <= A.ask * 0.9) unlockAch(st, 'dealer');
      return { status: 'accepted', msg: `Fechado! ${p.n} é do ${me.name} por ${fmt(o.fee)}, com salário de ${fmt(wage)} por semana.` };
    }
    loanMove(st, p, meId, { share: o.share ?? 1, obligation: !!o.obligation, buyFee: o.obligation ? o.buyFee : null, fee: loanFee(p), wage });
    return { status: 'accepted', msg: `Empréstimo fechado: ${p.n} joga pelo ${me.name} até o fim de ${st.year}.${o.obligation ? ` Compra obrigatória de ${fmt(o.buyFee)} no fim do empréstimo.` : ''}` };
  }
  function windowKey(st) { return st.year + ':' + (st.round <= 20 ? 1 : 2); }

  function transfer(st, p, toClub, fee, wage, quiet) {
    const from = p.club; const me = st.coach.club;
    st.rosters[from] = st.rosters[from].filter(id => id !== p.id);
    st.rosters[toClub].push(p.id);
    if (from === me) money(st, 'sale', fee, `Venda de ${p.n}`); else st.clubs[from].cash += fee;
    if (toClub === me) { money(st, 'buy', -fee, `Contratação de ${p.n}`); life(st).signs++; } else st.clubs[toClub].cash -= fee;
    p.club = toClub; if (wage) p.wage = wage; p.listed = false; p.mkt = 0.95 + Math.random() * 0.15; delete p.unhappy; p.contract = Math.max(p.contract || 0, 3);
    if (st.lineup) { st.lineup.slots = st.lineup.slots.map(id => id === p.id ? null : id); st.lineup.bench = (st.lineup.bench || []).filter(id => id !== p.id); }
    feed(st, { t: 'buy', pid: p.id, n: p.n, from, to: toClub, fee, ovr: p.ovr, pos: p.pos });
    if (!quiet || from === me || toClub === me) pushNews(st, 'transfer', `${p.n} troca o ${st.clubs[from].name} pelo ${st.clubs[toClub].name} por ${fmt(fee)}.`);
  }
  function feed(st, it) { it.y = st.year; it.w = st.round + 1; st.market.feed = [it].concat(st.market.feed || []).slice(0, 80); }

  // empréstimo: o jogador muda de elenco; o salário é dividido; com obrigação, a compra é paga no fim
  function loanMove(st, p, to, t, quiet) {
    const from = p.club; const me = st.coach.club;
    st.rosters[from] = st.rosters[from].filter(id => id !== p.id); st.rosters[to].push(p.id);
    p.loan = { owner: from, until: st.year, share: t.share ?? 1, obligation: !!t.obligation, buyFee: t.buyFee || null, since: st.round + 1, year: st.year, apps0: p.apps };
    p.club = to; p.listed = false;
    if (t.wage && to === me) p.wage = t.wage;
    st.market.loans = (st.market.loans || []).filter(id => id !== p.id).concat(p.id);
    if (t.fee) { if (to === me) money(st, 'buy', -t.fee, `Taxa de empréstimo: ${p.n}`); else st.clubs[to].cash -= t.fee; if (from === me) money(st, 'sale', t.fee, `Taxa de empréstimo: ${p.n}`); else st.clubs[from].cash += t.fee; }
    if (st.lineup && from === me) { st.lineup.slots = st.lineup.slots.map(id => id === p.id ? null : id); st.lineup.bench = (st.lineup.bench || []).filter(id => id !== p.id); }
    if (to === me) life(st).signs++;
    feed(st, { t: 'loan', pid: p.id, n: p.n, from, to, fee: t.fee || 0, obligation: !!t.obligation, buyFee: t.buyFee || null, ovr: p.ovr, pos: p.pos });
    if (!quiet || from === me || to === me) pushNews(st, 'transfer', `${p.n} é emprestado pelo ${st.clubs[from].name} ao ${st.clubs[to].name} até o fim de ${st.year}${t.obligation ? `, com compra obrigatória de ${fmt(t.buyFee)}` : ''}.`);
  }
  // fim dos empréstimos na virada da temporada
  function endLoans(st) {
    const me = st.coach.club; const out = [];
    (st.market.loans || []).slice().forEach(pid => {
      const p = st.players[pid]; if (!p || !p.loan || p.loan.until > st.year) return;
      const L = p.loan; const holder = p.club; const owner = L.owner; const apps = p.apps - (L.apps0 || 0);
      delete p.loan; st.market.loans = st.market.loans.filter(id => id !== pid);
      if (!st.clubs[holder] || !st.clubs[owner]) return;
      if (L.obligation) {
        if (holder === me) money(st, 'buy', -L.buyFee, `Compra obrigatória: ${p.n}`); else st.clubs[holder].cash -= L.buyFee;
        if (owner === me) money(st, 'sale', L.buyFee, `Compra obrigatória: ${p.n}`); else st.clubs[owner].cash += L.buyFee;
        p.contract = 3;
        if (holder === me || owner === me) { pushNews(st, 'transfer', `${p.n} fica no ${st.clubs[holder].name}: compra obrigatória de ${fmt(L.buyFee)}.`); out.push(`${p.n} fica no ${st.clubs[holder].name} (${fmt(L.buyFee)}).`); }
      } else {
        st.rosters[holder] = st.rosters[holder].filter(id => id !== pid); st.rosters[owner].push(pid); p.club = owner;
        if (holder === me && st.lineup) { st.lineup.slots = st.lineup.slots.map(id => id === pid ? null : id); st.lineup.bench = (st.lineup.bench || []).filter(id => id !== pid); }
        // garoto que jogou no empréstimo volta melhor
        let grow = 0; if (p.age <= 23 && apps >= 10 && p.ovr < p.pot) { grow = apps >= 25 ? 2 : 1; p.ovr = Math.min(p.pot, p.ovr + grow); bumpAt(p, grow); }
        if (holder === me || owner === me) { pushNews(st, 'transfer', `${p.n} volta ao ${st.clubs[owner].name} depois do empréstimo${grow ? ` (+${grow} de nota)` : ''}.`); out.push(`${p.n} volta ao ${st.clubs[owner].name}${grow ? ` (+${grow})` : ''}.`); }
      }
    });
    return out;
  }

  // motivos de uma proposta pelos seus jogadores (fator sobre o valor de mercado)
  function offerFactor(st, p, buyerId, rng) {
    const reasons = []; let f = 1; const add = (t, pct) => { f *= 1 + pct / 100; reasons.push([t, pct]); };
    const me = st.coach.club; const inXi = (st.lineup.slots || []).includes(p.id);
    if (p.listed) add('Está à venda', -10); else if (inXi) add('Titular e não está à venda', 15);
    const c = p.contract || 2; if (c <= 1) add('Último ano de contrato', -20); else if (c === 2) add('Dois anos de contrato', -5);
    const ar = p.apps >= 4 ? p.rsum / p.apps : null; if (ar != null && ar >= 7.2) add(`Boa fase (nota média ${ar.toFixed(1).replace('.', ',')})`, 10); else if (ar != null && ar < 6.3) add(`Má fase (nota média ${ar.toFixed(1).replace('.', ',')})`, -10);
    if (p.age <= 23 && p.pot > p.ovr) add('Jovem com potencial', Math.min(20, 2 * (p.pot - p.ovr)));
    const b = st.clubs[buyerId]; const v = mValue(p);
    if (b.cash > v * 5) add('Comprador com muito caixa', 10); else if (b.cash < v * 1.5) add('Comprador com caixa apertado', -10);
    const wi = windowInfo(st.round); if (wi.open && wi.closesIn <= 1) add('Última semana da janela', 10);
    const luck = Math.round((rng() * 2 - 1) * 7); if (luck) add('Interesse do comprador', luck);
    f = Math.max(0.55, Math.min(1.6, f));
    return { f, reasons };
  }
  function marketTick(st, report) {
    const rng = rngFor(st, 'market', st.round); const me = st.coach.club;
    st.market.offers = (st.market.offers || []).filter(o => o.expires > st.round && st.players[o.pid] && st.players[o.pid].club === me);
    if (!windowOpen(st.round + 1) && !windowOpen(st.round)) return;
    const myP = prestige(st, me); const xi = new Set(st.lineup.slots || []);
    const sq = squadOf(st, me); const floor = sq.filter(p => xi.has(p.id)).reduce((a, p) => Math.min(a, p.ovr), 99);
    const others = Object.keys(st.clubs).filter(id => id !== me);
    const pres = {}; others.forEach(id => pres[id] = prestige(st, id));
    sq.forEach(p => {
      if (p.loan) return; // emprestado para você: não é seu para vender
      const has = t => st.market.offers.some(o => o.pid === p.id && o.type === t);
      const v = mValue(p);
      const buyChance = p.listed ? 0.7 : xi.has(p.id) && p.ovr >= floor + 3 ? 0.05 : p.age <= 21 && p.pot - p.ovr >= 8 ? 0.04 : 0;
      if (!has('buy') && rng() < buyChance) {
        const buyers = others.filter(id => st.clubs[id].cash > v * 0.7 && pres[id] >= myP - 25);
        if (buyers.length) {
          const b = rng.weighted(buyers, id => 1 + Math.max(0, pres[id] - myP + 25) / 10);
          const { f, reasons } = offerFactor(st, p, b, rng); const fee = r10(v * f);
          const wants = pres[b] > myP + 8;
          st.market.offers.push({ id: (st.market.oid = (st.market.oid || 0) + 1), type: 'buy', pid: p.id, club: b, fee, value: r10(v), reasons, ceil: r10(fee * (1.05 + rng() * 0.2)), wants, expires: st.round + 2 });
          if (report) report.offers = (report.offers || 0) + 1;
        }
      }
      const loanChance = !xi.has(p.id) && (p.age <= 25 || p.ovr < floor) ? (p.listed ? 0.25 : 0.06) : 0;
      if (!has('loan') && rng() < loanChance) {
        const borrowers = others.filter(id => pres[id] <= myP + 5 && st.rosters[id].length < SQUAD_MAX - 2);
        if (borrowers.length) {
          const b = rng.pick(borrowers); const obligation = rng() < 0.35;
          const reasons = [['Joga pouco no seu time', 0]]; if (p.age <= 21) reasons.push(['Jovem precisa de minutos', 0]);
          st.market.offers.push({ id: (st.market.oid = (st.market.oid || 0) + 1), type: 'loan', pid: p.id, club: b, fee: loanFee(p), share: rng() < 0.5 ? 1 : 0.5, obligation, buyFee: obligation ? r10(v * (0.85 + rng() * 0.3)) : null, value: r10(v), reasons, expires: st.round + 2 });
          if (report) report.offers = (report.offers || 0) + 1;
        }
      }
    });
  }
  // responder uma proposta: aceitar, recusar ou pedir mais
  function respondOffer(st, id, action, ask) {
    const i = st.market.offers.findIndex(o => o.id === id); if (i < 0) return null;
    const o = st.market.offers[i]; const p = st.players[o.pid]; const me = st.coach.club; const buyer = st.clubs[o.club];
    if (action !== 'refuse' && !windowOpen(st.round)) return { msg: 'A negociação só fecha com a janela aberta.' };
    if (action !== 'refuse' && st.rosters[me].length <= 18) return { msg: 'Elenco mínimo é 18 jogadores.' };
    const drop = () => { st.market.offers = st.market.offers.filter(x => x.pid !== o.pid || x.type !== o.type); };
    if (action === 'accept') {
      if (o.type === 'buy') { transfer(st, p, o.club, o.fee); if (o.fee > o.value) unlockAch(st, 'seller'); st.market.offers = st.market.offers.filter(x => x.pid !== o.pid); return { ok: true, msg: `${p.n} vendido ao ${buyer.name} por ${fmt(o.fee)}.` }; }
      loanMove(st, p, o.club, { share: o.share, obligation: o.obligation, buyFee: o.buyFee, fee: o.fee });
      st.market.offers = st.market.offers.filter(x => x.pid !== o.pid);
      return { ok: true, msg: `${p.n} emprestado ao ${buyer.name} até o fim de ${st.year}.` };
    }
    if (action === 'refuse') {
      drop(); let msg = 'Proposta recusada.';
      if (o.type === 'buy' && o.wants) { p.unhappy = 8; msg = `Proposta recusada. ${p.n} queria ir para o ${buyer.name} e fica insatisfeito: rende menos por 8 semanas.`; pushNews(st, 'club', `${p.n} fica insatisfeito por não ir ao ${buyer.name}.`); }
      return { ok: true, msg };
    }
    // contraproposta (só compra): o comprador tem um teto escondido
    if (o.type !== 'buy' || !ask) return null;
    const rng = rngFor(st, 'counter', o.id, st.round);
    if (ask <= o.ceil) { o.fee = ask; return respondOffer(st, id, 'accept'); }
    if (!o.countered && rng() < 0.5) { o.countered = true; o.fee = o.ceil; return { ok: false, improved: true, msg: `${buyer.name} não chega a ${fmt(ask)}, mas melhora para ${fmt(o.fee)}. É a última oferta.` }; }
    drop(); return { ok: true, walked: true, msg: `${buyer.name} desistiu: ${fmt(ask)} passa do que podem pagar.` };
  }
  function acceptOffer(st, idx) { const o = st.market.offers[idx]; return o ? respondOffer(st, o.id, 'accept') : null; }

  // mercado entre clubes da IA: na janela, compram, vendem e emprestam pelas mesmas regras de preço
  function aiMarketTick(st) {
    if (!windowOpen(st.round)) return 0;
    const rng = rngFor(st, 'aimkt', st.round); const me = st.coach.club;
    const ids = Object.keys(st.clubs).filter(id => id !== me);
    const pres = {}; ids.forEach(id => pres[id] = prestige(st, id));
    const famN = { GOL: 1, ZAG: 2, LAT: 2, MEI: 3, ATA: 3 };
    // pool de vendáveis: não emprestados, fora do top 3 do clube, clubes com elenco folgado
    const sellable = []; ids.forEach(id => { if (st.rosters[id].length <= 20) return; const top = new Set(topIds(st, id, 3)); squadOf(st, id).forEach(p => { if (!p.loan && !top.has(p.id) && p.inj <= 0) sellable.push(p); }); });
    let deals = 0;
    const nBuy = 5 + rng.int(0, 4);
    for (let k = 0; k < nBuy; k++) {
      const buyer = rng.weighted(ids.filter(id => st.clubs[id].cash > 0 && st.rosters[id].length < SQUAD_MAX - 4), id => Math.max(1, st.clubs[id].cash / 1e6));
      if (!buyer) break;
      // posição mais fraca do titular comparada à força do time
      const sq = squadOf(st, buyer); const str = strength(st, buyer);
      let need = null, gap = 0;
      Object.keys(famN).forEach(fam => { const g = sq.filter(p => E.FAM[p.pos] === fam).sort((a, b) => b.ovr - a.ovr); const s = g[famN[fam] - 1]; const d = str - (s ? s.ovr : 40); if (d > gap) { gap = d; need = { fam, bar: s ? s.ovr : 40 }; } });
      if (!need || gap < 2) continue;
      const budget = st.clubs[buyer].cash * 0.5;
      const cands = sellable.filter(p => p.club !== buyer && E.FAM[p.pos] === need.fam && p.ovr >= need.bar + 2 && pres[p.club] <= pres[buyer] + 15 && askPrice(st, p) <= budget);
      if (!cands.length) continue;
      const p = cands.sort((a, b) => (b.ovr - b.age * 0.2) - (a.ovr - a.age * 0.2))[Math.min(cands.length - 1, rng.int(0, 2))];
      if (st.rosters[p.club].length <= 20) continue;
      transfer(st, p, buyer, askPrice(st, p), Math.round(E.wageFor(p.ovr) / 1000) * 1000, true);
      sellable.splice(sellable.indexOf(p), 1); deals++;
    }
    // empréstimos: garoto sem espaço num clube grande vai para um menor que precisa
    const nLoan = 2 + rng.int(0, 3);
    for (let k = 0; k < nLoan; k++) {
      const young = sellable.filter(p => p.age <= 22 && !starters(st, p.club).has(p.id) && pres[p.club] >= 45);
      if (!young.length) break;
      const p = young[rng.int(0, young.length - 1)];
      const to = ids.filter(id => id !== p.club && pres[id] < pres[p.club] - 10 && st.rosters[id].length < SQUAD_MAX - 4 && strength(st, id) <= p.ovr + 2);
      if (!to.length) continue;
      const dest = to[rng.int(0, to.length - 1)]; const obligation = rng() < 0.25;
      loanMove(st, p, dest, { share: 1, obligation, buyFee: obligation ? r10(mValue(p) * (0.9 + rng() * 0.25)) : null, fee: 0 }, true);
      sellable.splice(sellable.indexOf(p), 1); deals++;
    }
    return deals;
  }
  function quickSell(st, pid) {
    const p = st.players[pid]; if (!windowOpen(st.round)) return { msg: 'A venda só fecha com a janela aberta.' };
    if (p.loan) return { msg: 'Jogador emprestado não pode ser vendido.' };
    if (st.rosters[st.coach.club].length <= 18) return { msg: 'Elenco mínimo é 18 jogadores.' };
    const rng = rngFor(st, 'quick', pid, st.round);
    const v = E.valueFor(p.ovr, p.age, p.pos); const fee = Math.round(v * 0.75 / 10000) * 10000;
    const myDiv = st.clubs[st.coach.club].div;
    const buyer = rng.pick(Object.values(st.clubs).filter(c => c.id !== st.coach.club && c.div === myDiv));
    transfer(st, p, buyer.id, fee); return { msg: `${p.n} vendido ao ${buyer.name} por ${fmt(fee)} (venda rápida).` };
  }

