  // ---------- estrutura do clube: CT, base, estádio e loja (fase 2) ----------
  // custos de CT e base em semanas da folha de referência; estádio pela renda de uma ampliação; loja pela margem semanal
  const INFRA = {
    ct: { name: 'Centro de Treinamento', short: 'CT', min: 1, max: 5, cost: [0, 0, 2, 3.5, 5.5, 8], weeks: [0, 0, 4, 6, 9, 12], maint: 0.006 },
    base: { name: 'Categorias de base', short: 'Base', min: 1, max: 5, cost: [0, 0, 1.5, 2.5, 4, 6], weeks: [0, 0, 4, 6, 8, 10], maint: 0.004 },
    estadio: { name: 'Estádio', short: 'Estádio', min: 0, max: 3, cost: [0, 1, 1.4, 1.9], weeks: [0, 10, 14, 18], maint: 0.005 },
    loja: { name: 'Loja oficial', short: 'Loja', min: 1, max: 5, cost: [0, 0, 20, 30, 42, 56], weeks: [0, 0, 3, 4, 5, 6], maint: 0.002 },
  };
  const TICKET_MULT = [0.7, 0.85, 1, 1.2, 1.45];
  const TICKET_NAME = ['Popular', 'Barato', 'Normal', 'Caro', 'Premium'];
  const KIT_PRICE = { A: 280, B: 200, C: 150, D: 120 };
  const KIT_DM = { A: 1, B: 0.6, C: 0.45, D: 0.3 };
  const PROSPECTS = [0, 1, 1, 2, 2, 3];
  const BASE_MAX = 6, SQUAD_MAX = 42, PENEIRA_WEEK = 29;
  const VERBA = [
    { k: 'pequena', name: 'Pequena', w: 1.5, thr: 25, press: 0, fail: 3 },
    { k: 'media', name: 'Média', w: 3, thr: 40, press: 5, fail: 4 },
    { k: 'grande', name: 'Grande', w: 5, thr: 55, press: 10, fail: 5 },
  ];
  const r10k = v => Math.round(v / 10000) * 10000, r1k = v => Math.round(v / 1000) * 1000;

  // níveis iniciais estimados pelo tamanho do clube (não refletem a estrutura real)
  function infraInit(st, id) {
    const c = st.clubs[id];
    const rankA = c.div === 'A' ? strengthRanks(st, 'A').indexOf(id) + 1 : 99;
    const ct = c.div === 'A' ? (rankA <= 6 ? 3 : 2) : c.div === 'B' ? 2 : 1;
    const base = c.div === 'A' ? ct : c.div === 'B' && c.fan >= 0.7 ? 2 : 1;
    const inf = { ct, base, estadio: 0, loja: 1, build: null, ticket: 2, stock: 0, auto: true, hype: 1.15, sold: 0, missed: 0, salesWk: 0, prospects: [], att: [], verba: null, pressure: 0, ref: wageBill(st, id), cap0: c.cap };
    inf.stock = Math.round(lojaDemand(st, id, inf) * 4 / 10) * 10;
    // a manutenção dos níveis iniciais já vem embutida na cota de TV
    c.tv += infraMaint(inf);
    return inf;
  }
  function infra(st, id = st.coach.club) { st.infra = st.infra || {}; if (!st.infra[id]) st.infra[id] = infraInit(st, id); return st.infra[id]; }
  function infraMaint(inf) { return r1k(inf.ref * (INFRA.ct.maint * (inf.ct - 1) + INFRA.base.maint * (inf.base - 1) + INFRA.estadio.maint * inf.estadio + INFRA.loja.maint * (inf.loja - 1))); }
  function formOf(st, id) {
    const lk = C.leagueKey(st.comp, id); const t = lk && st.comp.tables[lk] ? st.comp.tables[lk][id] : null;
    return t && t.form.length ? t.form.reduce((a, f) => a + (f === 'V' ? 3 : f === 'E' ? 1 : 0), 0) / (t.form.length * 3) : 0.5;
  }
  function kitPrice(st, id = st.coach.club) { return KIT_PRICE[st.clubs[id].div]; }
  function lojaDemand(st, id, inf, neutral) {
    const c = st.clubs[id]; const f = neutral ? 0.5 : formOf(st, id);
    const lv = neutral ? 1 : 1 + 0.35 * (inf.loja - 1);
    return 1200 * (0.05 + c.fan * c.fan) * KIT_DM[c.div] * (0.75 + 0.5 * f) * (neutral ? 1 : inf.hype) * lv;
  }
  function lojaInfo(st) {
    const id = st.coach.club; const inf = infra(st); const price = kitPrice(st, id);
    const demand = Math.round(lojaDemand(st, id, inf));
    const lots = [4, 8, 12].map((w, i) => { const n = Math.max(10, Math.round(demand * w / 10) * 10); const unit = price * 0.5 * (1 - [0, 0.05, 0.1][i]); return { weeks: w, n, cost: r1k(n * unit), disc: [0, 5, 10][i] }; });
    return { price, unit: price * 0.5, demand, weeksLeft: demand ? inf.stock / demand : 99, lots };
  }
  function buyStock(st, weeks) {
    const info = lojaInfo(st); const lot = info.lots.find(l => l.weeks === weeks); if (!lot) return { ok: false };
    const c = st.clubs[st.coach.club]; if (c.cash < lot.cost) return { ok: false, msg: 'Caixa insuficiente para essa encomenda.' };
    money(st, 'loja', -lot.cost, `Loja: ${lot.n.toLocaleString('pt-BR')} camisas encomendadas`); infra(st).stock += lot.n;
    return { ok: true, n: lot.n, cost: lot.cost };
  }
  function infraCost(st, k, inf = infra(st)) {
    const S = INFRA[k]; const to = inf[k] + 1; if (to > S.max) return 0;
    if (k === 'ct' || k === 'base') return r10k(inf.ref * S.cost[to]);
    if (k === 'estadio') return r10k(0.15 * inf.cap0 * st.clubs[st.coach.club].ticket * 40 * S.cost[to]);
    const baseMargin = lojaDemand(st, st.coach.club, inf, true) * kitPrice(st) * 0.5;
    return r10k(Math.max(20000, baseMargin * S.cost[to]));
  }
  function infraLabel(k, lvl) { return k === 'estadio' ? (lvl ? `${lvl}ª ampliação` : 'sem ampliação') : `nível ${lvl}`; }
  function infraStart(st, k) {
    const inf = infra(st); const S = INFRA[k]; if (!S) return { ok: false };
    const to = inf[k] + 1;
    if (inf.build) return { ok: false, msg: 'Já há uma obra em andamento. Uma por vez.' };
    if (to > S.max) return { ok: false, msg: 'Já está no máximo.' };
    const cost = infraCost(st, k); const c = st.clubs[st.coach.club];
    if (c.cash < cost) return { ok: false, msg: 'Caixa insuficiente para a obra.' };
    money(st, 'obra', -cost, `Obra: ${S.name}, ${infraLabel(k, to)}`);
    inf.build = { k, to, left: S.weeks[to], total: S.weeks[to] };
    pushNews(st, 'club', `Começa a obra: ${S.name}, ${infraLabel(k, to)}. Fica pronta em ${S.weeks[to]} semanas.`);
    return { ok: true, cost };
  }
  function ctBonus(st) { const l = infra(st).ct; return { rec: 1.5 * (l - 1), evo: 1 + 0.08 * (l - 1), inj: 0.1 * (l - 1) }; }

  // público de um jogo em casa: torcida, fase do time, tamanho do jogo e, no clube do usuário, preço do ingresso e confiança
  function crowd(st, id, mt) {
    const c = st.clubs[id]; const isUser = id === st.coach.club;
    const big = mt && (mt.comp === 'CDB' || (mt.tie && mt.comp !== 'EST')) ? 1.25 : mt && mt.comp === 'EST' ? 0.8 : 1;
    let fill = (0.30 + 0.45 * c.fan + 0.25 * formOf(st, id)) * big; let mult = 1;
    if (isUser) {
      fill *= 0.85 + 0.3 * st.board.conf / 100; if (st.coach.persona === 'carismatico') fill *= 1.1;
      mult = TICKET_MULT[infra(st).ticket]; fill *= Math.pow(mult, -1.2);
    }
    const f = Math.min(1, fill); const att = Math.round(c.cap * f); const price = Math.round(c.ticket * mult);
    return { demand: fill, fill: f, att, price, gate: att * price };
  }

  // peneira da base: garotos fictícios; quantidade e qualidade sobem com o nível
  function genProspects(st) {
    const inf = infra(st); const me = st.coach.club; const lvl = inf.base;
    const k = Math.min(PROSPECTS[lvl], BASE_MAX - inf.prospects.length); if (k <= 0) return 0;
    const rng = rngFor(st, 'base', st.year, st.round);
    const ovrs = squadOf(st, me).map(p => p.ovr).sort((a, b) => a - b); const med = ovrs.length ? ovrs[Math.floor(ovrs.length / 2)] : 60;
    const POSL = ['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST'];
    for (let i = 0; i < k; i++) {
      const pos = rng.pick(POSL); const ovr = Math.max(45, Math.min(72, Math.round(med - 15 + 1.5 * lvl + rng.int(-3, 3))));
      const p = E.genPlayer(rng, pos, ovr, rng.int(16, 17), null, st.nextId++);
      p.pot = Math.min(92, ovr + 10 + Math.round(2.5 * lvl) + rng.int(0, 10));
      const w = 6 - lvl; p.potLo = p.pot - rng.int(0, w); p.potHi = Math.min(95, p.potLo + w);
      p.youth = true; p.base = true; p.wage = 0;
      inf.prospects.push(p);
    }
    pushNews(st, 'club', `Peneira: ${k} ${k === 1 ? 'garoto chega' : 'garotos chegam'} à base do ${st.clubs[me].name}.`);
    return k;
  }
  function promoteProspect(st, pid) {
    const inf = infra(st); const me = st.coach.club; const i = inf.prospects.findIndex(p => p.id === pid); if (i < 0) return { ok: false };
    if (st.rosters[me].length >= SQUAD_MAX) return { ok: false, msg: `Elenco cheio (${SQUAD_MAX}). Venda alguém antes.` };
    const p = inf.prospects.splice(i, 1)[0];
    p.club = me; delete p.base; p.wage = r1k(E.wageFor(p.ovr) * 0.6); p.mkt = 1; p.contract = 3;
    st.players[p.id] = p; st.rosters[me].push(p.id);
    pushNews(st, 'club', `${p.n}, ${p.age} anos, sobe da base para o profissional.`);
    return { ok: true, p };
  }
  function releaseProspect(st, pid) { const inf = infra(st); const i = inf.prospects.findIndex(p => p.id === pid); if (i < 0) return false; inf.prospects.splice(i, 1); return true; }

  // verba extra da diretoria: uma vez por janela; aprovada vira caixa e aumenta a cobrança no fim da temporada
  function verbaInfo(st) {
    const inf = infra(st); const open = windowOpen(st.round); const used = inf.verba === windowKey(st);
    return { open, used, pressure: inf.pressure, opts: VERBA.map(v => ({ ...v, amount: r10k(inf.ref * v.w), chance: Math.max(0.05, Math.min(0.95, (st.board.conf - v.thr + 20) / 40)) })) };
  }
  function askVerba(st, k) {
    const vi = verbaInfo(st); const o = vi.opts.find(x => x.k === k); if (!o || !vi.open || vi.used) return { ok: false };
    const inf = infra(st); inf.verba = windowKey(st);
    const yes = rngFor(st, 'verba', st.year, st.round, k)() < o.chance;
    if (yes) {
      money(st, 'verba', o.amount, `Verba extra da diretoria (${o.name.toLowerCase()})`); inf.pressure += o.press;
      pushNews(st, 'club', `A diretoria libera ${fmt(o.amount)} para reforços.${o.press ? ' E vai cobrar a meta.' : ''}`);
    } else { st.board.conf = Math.max(0, st.board.conf - o.fail); pushNews(st, 'club', `A diretoria nega o pedido de verba.`); }
    return { ok: true, approved: yes, amount: o.amount, fail: o.fail, press: o.press };
  }

  // semana do clube do usuário: obra, manutenção, loja e peneira
  function infraWeek(st, report, res) {
    const me = st.coach.club; const c = st.clubs[me]; const inf = infra(st);
    const maint = infraMaint(inf);
    if (maint) money(st, 'estrutura', -maint, 'Manutenção da estrutura');
    // loja: vende o que o estoque permite; reposição automática encomenda 4 semanas com 8% de taxa
    const price = kitPrice(st, me); const demand = Math.round(lojaDemand(st, me, inf));
    let restock = 0;
    if (inf.auto && inf.stock < demand * 1.5) {
      const n = Math.max(10, Math.round(demand * 4 / 10) * 10); restock = r1k(n * price * 0.5 * 1.08);
      if (c.cash - restock > 0) { money(st, 'loja', -restock, `Loja: reposição automática de ${n.toLocaleString('pt-BR')} camisas`); inf.stock += n; } else restock = 0;
    }
    const sold = Math.min(inf.stock, demand); inf.stock -= sold; inf.sold = sold; inf.missed = demand - sold; inf.salesWk = sold * price;
    if (sold) money(st, 'loja', sold * price, `Loja: ${sold.toLocaleString('pt-BR')} camisas vendidas`);
    // humor da torcida pela camisa: volta devagar ao normal; vitória anima, derrota esfria
    inf.hype = 1 + (inf.hype - 1) * 0.93 + (res === 'V' ? 0.04 : res === 'D' ? -0.02 : 0) + (report.tie ? (report.tie.won ? 0.12 : -0.05) : 0);
    inf.hype = Math.max(0.8, Math.min(2.2, inf.hype));
    // obra
    if (inf.build) {
      inf.build.left--;
      if (inf.build.left <= 0) {
        const { k, to } = inf.build; inf[k] = to; inf.build = null;
        if (k === 'estadio') c.cap = Math.round(inf.cap0 * (1 + 0.15 * to));
        pushNews(st, 'club', `Obra concluída: ${INFRA[k].name}, ${infraLabel(k, to)}.`); report.built = { k, to, name: INFRA[k].name };
      }
    }
    if (report.finance) Object.assign(report.finance, { loja: sold * price, restock: -restock, maint: -maint });
    if (st.round === PENEIRA_WEEK) report.peneira = genProspects(st);
  }

  // virada de temporada da estrutura: garotos crescem, coleção antiga é liquidada
  function infraSeasonTurn(st, summary) {
    const rng = rngFor(st, 'baseturn', st.year);
    Object.entries(st.infra || {}).forEach(([id, inf]) => {
      const mine = id === st.coach.club;
      inf.prospects = inf.prospects.filter(p => {
        p.age++; p.ovr = Math.min(p.pot, p.ovr + rng.int(2, 5) + (inf.ct >= 4 ? 1 : 0));
        if (p.at) p.at = p.at.map(v => Math.min(95, v + 3));
        if (p.age >= 20) { if (mine) pushNews(st, 'club', `${p.n} completa 20 anos e deixa a base sem subir.`); return false; }
        return true;
      });
      if (mine && inf.stock > 0) {
        const v = r1k(inf.stock * kitPrice(st, id) * 0.5 * 0.6);
        if (v) money(st, 'loja', v, `Loja: liquidação de ${inf.stock.toLocaleString('pt-BR')} camisas da coleção ${st.year}`);
        inf.stock = 0;
      }
      inf.hype = 1.15 + (summary && summary.promo === 'up' ? 0.3 : 0) + (summary && (summary.champion === id || (summary.cup && summary.cup.champion)) ? 0.3 : 0);
      inf.pressure = 0; inf.verba = null;
    });
  }

