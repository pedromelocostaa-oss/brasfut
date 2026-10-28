/* Prancheta FC: regras da carreira (sem DOM). Depende de Engine e Comps. */
(function (root) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const E = NODE ? require('./engine.js') : root.Engine;
  const C = NODE ? require('./comps.js') : root.Comps;

  const WEEKS = C.WEEKS; // 73 datas: 58 semanas e 15 datas de meio de semana das copas continentais
  const SEASON_WEEKS = C.SEASON_WEEKS; // 58
  // janelas: do início até a 3ª rodada e da 16ª à 21ª rodada do Brasileirão (datas base 0)
  const WINDOWS = [[0, C.ligaWeek(2)], [C.ligaWeek(15), C.ligaWeek(20)]];
  const isMid = w => !!(C.CAL[w] && C.CAL[w].mid);
  const LEVELS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
  const LEVEL_TITLES = ['Estagiário', 'Auxiliar', 'Interino', 'Efetivado', 'Professor', 'Estrategista', 'Comandante', 'Mestre', 'Lenda', 'Lenda', 'Lenda'];
  const UNLOCKS = { 2: ['5-3-2', 'Análise do rival'], 3: ['3-5-2'], 4: ['4-1-4-1'], 5: ['3-4-3'] };
  const TICKET = 45;
  // cota de TV relativa entre séries e chance de jogar em casa numa semana (calendário de 58 semanas)
  const DIV_TV = { A: 1, B: 0.45, C: 0.2, D: 0.08 };
  const HOME_SHARE = { A: 0.43, B: 0.40, C: 0.30, D: 0.17, X: 0.40 };
  // cotas reais da Copa do Brasil 2026 por fase disputada (CBF, divulgadas em fev/2026). [Série B, Séries C e D] nas fases 2 e 3; na final, [campeão, vice].
  // O jogo junta a 4ª e a 5ª fase reais numa só (16 avos, onde entra a Série A).
  const CUP_QUOTA = [400000, [1380000, 830000], [1530000, 950000], 2000000, 3000000, 4000000, 9000000, [78000000, 34000000]];
  function cupQuota(ph, div, champion) { const q = CUP_QUOTA[ph]; return Array.isArray(q) ? (ph === 7 ? (champion ? q[0] : q[1]) : (div === 'B' ? q[0] : q[1])) : q; }
  function payCup(st, ph, champion) {
    const v = cupQuota(ph, st.clubs[st.coach.club].div, champion); st.cupEarned = (st.cupEarned || 0) + v;
    money(st, 'prize', v, `Copa do Brasil: cota ${ph === 7 ? (champion ? 'de campeão' : 'de vice') : C.inPhase(C.CUP[ph].name, 'd')}`); return v;
  }

  // prêmios da CONMEBOL 2026 em dólar (El Observador e Bae Negocios), convertidos a R$ 5,30 (câmbio fixo do jogo)
  const USD = 5.3;
  const CONT_PRIZE = { L: { home: 1000000, win: 340000, PO: 0, R16: 1250000, QF: 1700000, SF: 2300000, F: [25000000, 7000000] }, S: { home: 300000, win: 125000, PO: 500000, R16: 600000, QF: 700000, SF: 800000, F: [10000000, 2500000] } };
  function payCont(st, K, usd, txt) {
    const v = Math.round(usd * USD / 10000) * 10000; if (!v) return 0;
    st.contEarned = (st.contEarned || 0) + v; money(st, 'prize', v, `${C.CONT[K].name}: ${txt}`); return v;
  }
  // grupos das copas continentais: 2026 usa o sorteio real; depois, os brasileiros classificados e os mesmos estrangeiros, em potes por força
  function contGroups(st) {
    const F = E.FOREIGN; if (!F) return {};
    const has = id => !!st.clubs[id];
    if (st.year === 2026) { const g = F.G2026; const ok = Object.values(g.LIB).concat(Object.values(g.SUL)).every(ids => ids.every(has)); if (ok) return { L: g.LIB, S: g.SUL }; }
    const nx = st.contNext; if (!nx) return {};
    const rng = rngFor(st, 'contdraw', st.year);
    const foreignOf = groups => Object.values(groups).flat().filter(id => st.clubs[id] && st.clubs[id].div === 'X');
    const draw = ids => {
      const ctry = id => st.clubs[id].div === 'X' ? st.clubs[id].country : 'BRA';
      const sorted = ids.slice().sort((a, b) => strength(st, b) - strength(st, a)); const pots = [0, 1, 2, 3].map(k => sorted.slice(k * 8, k * 8 + 8));
      for (let tr = 0; tr < 300; tr++) {
        const gs = Array.from({ length: 8 }, () => []); let ok = true;
        for (const pot of pots) {
          const order = pot.slice().sort(() => rng() - 0.5);
          for (const id of order) {
            const free = gs.map((g, i) => i).filter(i => gs[i].length < pots.indexOf(pot) + 1 && (tr > 250 || !gs[i].some(x => ctry(x) === ctry(id))));
            if (!free.length) { ok = false; break; }
            gs[free[Math.floor(rng() * free.length)]].push(id);
          }
          if (!ok) break;
        }
        if (ok) return Object.fromEntries(gs.map((g, i) => ['ABCDEFGH'[i], g]));
      }
      return Object.fromEntries(Array.from({ length: 8 }, (_, i) => ['ABCDEFGH'[i], sorted.filter((x, j) => j % 8 === i)]));
    };
    const L = nx.L.filter(has).concat(foreignOf(F.G2026.LIB)).slice(0, 32), S = nx.S.filter(has).concat(foreignOf(F.G2026.SUL)).slice(0, 32);
    return L.length === 32 && S.length === 32 ? { L: draw(L), S: draw(S) } : {};
  }
  // vagas brasileiras do ano seguinte: 6 na Libertadores (campeões continentais e da Copa do Brasil, depois o G-6) e 7 na Sul-Americana
  function contQualify(st, out) {
    const A = C.sortRows(st.comp.tables.A).map(r => r.id); const L = [];
    const br = id => id && st.clubs[id] && st.clubs[id].div !== 'X';
    [out.champ.LIB, out.champ.SUL, out.champ.CDB].forEach(id => { if (br(id) && !L.includes(id) && L.length < 6) L.push(id); });
    A.forEach(id => { if (L.length < 6 && !L.includes(id)) L.push(id); });
    const S = A.filter(id => !L.includes(id)).slice(0, 7);
    return { L, S };
  }

  const ACH = {
    first_win: ['Primeira vitória', 'Vença uma partida'],
    liberta: ['Glória eterna', 'Ganhe a Libertadores'],
    sula: ['Campeão continental', 'Ganhe a Sul-Americana'],
    rout: ['Goleada', 'Vença por 3 gols ou mais'],
    comeback: ['Virada', 'Vença depois de estar perdendo'],
    zebra: ['Zebra', 'Vença um time pelo menos 4 pontos mais forte'],
    wall: ['Muralha', '3 jogos seguidos sem sofrer gol'],
    streak3: ['Embalado', '3 vitórias seguidas'],
    unbeaten6: ['Invicto', '6 jogos sem perder'],
    hattrick: ['Hat-trick', 'Um jogador seu marca 3 gols'],
    talent: ['Caça-talentos', 'Um jovem de até 21 anos chega a 75'],
    dealer: ['Negociador', 'Contrate pagando 10% abaixo do pedido'],
    seller: ['Vendedor', 'Venda um jogador acima do valor de mercado'],
    leader: ['Líder', 'Assuma a liderança da sua liga a partir da 3ª rodada'],
    estadual: ['Estadual', 'Ganhe o campeonato estadual'],
    acesso: ['Acesso', 'Suba de série'],
    copa: ['Copa do Brasil', 'Ganhe a Copa do Brasil'],
    champion: ['Campeão brasileiro', 'Ganhe a Série A'],
  };

  function hashSeed(...parts) { let h = 2166136261 >>> 0; parts.forEach(p => { const s = String(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }); return h >>> 0; }
  const rngFor = (st, ...salt) => E.makeRng(hashSeed(st.seed, st.year, ...salt));

  function levelFromXp(xp) { let l = 1; while (l < LEVELS.length && xp >= LEVELS[l]) l++; return l; }
  function formationsFor(level) { return Object.keys(E.FORMATIONS).filter(k => E.FORMATIONS[k].lvl <= level); }

  function bumpAt(p, d) { if (!p.at) return; if (Array.isArray(p.at)) E.normAt(p); Object.keys(p.at).forEach(k => { p.at[k] = Math.max(30, Math.min(95, p.at[k] + d)); }); }
  function squadOf(st, clubId) { return st.rosters[clubId].map(id => st.players[id]); }
  // folha: quem está no elenco (emprestado para o clube paga a parte combinada) + a parte dos que o clube emprestou
  function wageBill(st, clubId) {
    let w = squadOf(st, clubId).reduce((a, p) => a + (p.loan && p.loan.owner !== clubId ? p.wage * p.loan.share : p.wage), 0);
    ((st.market && st.market.loans) || []).forEach(id => { const p = st.players[id]; if (p && p.loan && p.loan.owner === clubId) w += p.wage * (1 - p.loan.share); });
    return Math.round(w);
  }
  function strength(st, clubId) { return E.teamStrength(squadOf(st, clubId)); }
  function windowOpen(w) { return WINDOWS.some(([a, b]) => w >= a && w <= b); }
  function windowInfo(w) {
    for (const [a, b] of WINDOWS) { if (w >= a && w <= b) return { open: true, closesIn: C.weekNo(b) - C.weekNo(w) + 1 }; if (w < a) return { open: false, opensIn: C.weekNo(a) - C.weekNo(w) }; }
    return { open: false, opensIn: null };
  }

  function divClubs(st, d) { return Object.keys(st.clubs).filter(id => st.clubs[id].div === d); }
  function strengthRanks(st, d) { return (d ? divClubs(st, d) : Object.keys(st.clubs)).map(id => [id, strength(st, id)]).sort((a, b) => b[1] - a[1]).map(x => x[0]); }
  // metas por série (rank = posição de força na série; na Série D, dentro do grupo de 6)
  function targetFor(rank, div = 'A') {
    if (div === 'A') {
      if (rank <= 3) return { pos: 6, label: 'Brigar pelo título e terminar no G-6', role: 'Favorito', meta: 'G-6', press: 'alta' };
      if (rank <= 8) return { pos: 10, label: 'Terminar entre os 10 primeiros', role: 'Briga por vaga', meta: 'top 10', press: 'média' };
      if (rank <= 14) return { pos: 14, label: 'Terminar entre os 14 primeiros', role: 'Meio de tabela', meta: 'top 14', press: 'média' };
      return { pos: 16, label: 'Fugir do Z-4', role: 'Azarão', meta: 'fugir do Z-4', press: 'baixa' };
    }
    if (div === 'B') {
      if (rank <= 3) return { pos: 4, label: 'Subir para a Série A (G-4)', role: 'Favorito', meta: 'acesso', press: 'alta' };
      if (rank <= 8) return { pos: 8, label: 'Brigar pelo acesso e terminar entre os 8', role: 'Briga pelo acesso', meta: 'top 8', press: 'média' };
      if (rank <= 14) return { pos: 14, label: 'Terminar entre os 14 primeiros', role: 'Meio de tabela', meta: 'top 14', press: 'média' };
      return { pos: 16, label: 'Fugir do Z-4', role: 'Azarão', meta: 'fugir do Z-4', press: 'baixa' };
    }
    if (div === 'C') {
      if (rank <= 4) return { pos: 4, label: 'Terminar a 1ª fase entre os 4 e brigar pelo acesso', role: 'Favorito', meta: 'top 4', press: 'alta' };
      if (rank <= 10) return { pos: 8, label: 'Classificar ao quadrangular (top 8)', role: 'Briga por vaga', meta: 'top 8', press: 'média' };
      if (rank <= 15) return { pos: 14, label: 'Terminar entre os 14 primeiros', role: 'Meio de tabela', meta: 'top 14', press: 'média' };
      return { pos: 16, label: 'Fugir do Z-4', role: 'Azarão', meta: 'fugir do Z-4', press: 'baixa' };
    }
    if (rank <= 2) return { pos: 2, label: 'Terminar entre os 2 primeiros do grupo', role: 'Favorito', meta: 'top 2 do grupo', press: 'alta' };
    if (rank <= 4) return { pos: 4, label: 'Passar da fase de grupos (top 4 do grupo)', role: 'Briga por vaga', meta: 'top 4 do grupo', press: 'média' };
    return { pos: 5, label: 'Não terminar em último no grupo', role: 'Azarão', meta: 'fugir da lanterna', press: 'baixa' };
  }

  function newCareer(seed, clubId, coachName, persona) {
    const st = { v: 3, seed, year: 2026, round: 0, coach: { name: coachName || 'Técnico', persona, xp: 0, level: 1, club: clubId }, clubs: {}, players: {}, rosters: {}, comp: null, results: [], news: [], achievements: {}, finance: [], market: { neg: {}, offers: [], auction: null, auctionsDone: [] }, stats: { winStreak: 0, unbeaten: 0, clean: 0 }, history: [], morale: 55, board: { conf: 60 }, lineup: null, lastMatch: null, objectives: [], fired: false, seasonOver: false };
    const rng = rngFor(st, 'gen');
    let id = 1;
    const REAL = (typeof window !== 'undefined' && window.REAL_ROSTERS) || (typeof globalThis !== 'undefined' && globalThis.REAL_ROSTERS) || null;
    const forms = ['4-3-3', '4-4-2', '4-2-3-1'];
    E.CLUBS.forEach(c => {
      let squad;
      if (REAL && REAL[c.id]) {
        squad = REAL[c.id].map(row => E.realPlayer(rng, row, c.id, id++));
        // elencos curtos ganham garotos da base (nomes gerados) até 23, com 2 goleiros
        const ovrs = squad.map(p => p.ovr).sort((a, b) => a - b); const med = ovrs.length ? ovrs[Math.floor(ovrs.length / 2)] : 55;
        const add = pos => { const p = E.genPlayer(rng, pos, Math.max(45, med - 5 + rng.int(-2, 2)), rng.int(17, 20), c.id, id++); p.youth = true; squad.push(p); };
        while (squad.filter(p => p.pos === 'GK').length < 2) add('GK');
        const order = ['CB', 'ST', 'CM', 'RB', 'LB', 'DM', 'AM', 'LW', 'RW', 'CB', 'CM', 'ST']; let k = 0;
        while (squad.length < 23) add(order[k++ % order.length]);
      } else { squad = E.genSquad(rng, c, id); id += squad.length; }
      squad.forEach(p => { st.players[p.id] = p; p.mkt = 0.92 + rng() * 0.23; });
      st.rosters[c.id] = squad.map(p => p.id);
      st.clubs[c.id] = { ...c, cash: 0, tv: 0, wageCap: 0, formation: rng.pick(forms) };
    });
    // clubes estrangeiros das copas continentais
    E.FCLUBS.forEach(c => {
      const rows = E.FOREIGN && E.FOREIGN.R[c.id];
      const squad = rows && rows.length ? rows.map(row => E.realPlayer(rng, row, c.id, id++)) : E.genSquad(rng, c, id);
      if (!(rows && rows.length)) id += squad.length;
      squad.forEach(p => { st.players[p.id] = p; p.mkt = 1; });
      st.rosters[c.id] = squad.map(p => p.id);
      st.clubs[c.id] = { ...c, cash: 0, tv: 0, wageCap: 0, formation: rng.pick(forms) };
    });
    st.nextId = id;
    // escala de "base" (economia, ingresso): a Série A vai de 68 a 79 pela força; as outras séries seguem a mesma régua
    const sOf = {}; Object.keys(st.clubs).forEach(cid => sOf[cid] = strength(st, cid));
    const aS = Object.keys(st.clubs).filter(cid => st.clubs[cid].div === 'A').map(cid => sOf[cid]);
    const sMin = Math.min(...aS), sMax = Math.max(...aS);
    Object.values(st.clubs).forEach(c => { c.base = Math.round(Math.max(40, Math.min(85, 68 + (sOf[c.id] - sMin) / Math.max(1, sMax - sMin) * 11))); setEconomy(st, c); });
    splitSponsor(st, clubId);
    infra(st);
    startSeason(st);
    st.lineup = { ...E.autoLineup(squadOf(st, clubId), '4-3-3'), ment: 'equilibrada' };
    st.sponsor = null; st.sponsorOffers = sponsorOffers(st);
    life(st); st.coach.lic = st.clubs[clubId].div === 'A' ? 'PRO' : 'B'; checkLicense(st);
    pushNews(st, 'club', `${coachName} é o novo técnico do ${st.clubs[clubId].name}. Meta da diretoria: ${st.board.target.label.charAt(0).toLowerCase() + st.board.target.label.slice(1)}.`);
    st.life.presser = genPresser(st);
    return st;
  }
  // cota de TV semanal calibrada para cobrir a folha junto com a bilheteria esperada
  function setEconomy(st, c) {
    const wb = wageBill(st, c.id);
    c.ticket = Math.max(10, Math.round(25 + 2.5 * (c.base - 68)));
    const expGate = c.cap * Math.min(1, 0.30 + 0.45 * c.fan + 0.125) * c.ticket * HOME_SHARE[c.div];
    c.tv = Math.round(Math.max(0.3 * wb, 0.97 * wb - expGate) / 1000) * 1000;
    c.cash = Math.round(wb * Math.max(3, 5 + (c.base - 68) * 0.6) / 10000) * 10000;
    c.wageCap = Math.round(wb * 1.12 / 1000) * 1000;
  }

  // a cota do clube do usuario vira TV (60%) + patrocinio negociado (40% como referencia)
  function splitSponsor(st, clubId) {
    const c = st.clubs[clubId]; if (c.sponsorBase) return;
    const full = c.tv; c.tvFull = full; c.tv = Math.round(full * 0.6 / 1000) * 1000; c.sponsorBase = Math.round(full * 0.4 / 1000) * 1000;
  }

  function startSeason(st) {
    const rng = rngFor(st, 'season');
    const clubs = {}; Object.values(st.clubs).forEach(c => { if (c.div !== 'X') clubs[c.id] = { id: c.id, div: c.div, uf: c.uf }; });
    const sm = {}; Object.keys(st.clubs).forEach(id => sm[id] = strength(st, id));
    st.comp = C.buildSeason({ clubs, str: id => sm[id], rng, cont: contGroups(st) });
    st.cupEarned = 0; st.cupFinalPaid = false; st.contEarned = 0; st.contFinalPaid = {};
    if (st.coach && st.comp.cup[0] && st.comp.cup[0].some(t => t.a === st.coach.club || t.b === st.coach.club)) payCup(st, 0);
    st.results = [];
    st.round = 0; st.seasonOver = false;
    setTarget(st);
    Object.values(st.players).forEach(p => { p.g = 0; p.a = 0; p.apps = 0; p.rsum = 0; p.yc = 0; });
    genObjectives(st);
    genProspects(st);
    if (st.lineup) applyPresetFor(st);
  }
  function setTarget(st) {
    const me = st.coach.club, d = st.clubs[me].div; let rank;
    if (d === 'D') { const key = C.leagueKey(st.comp, me); rank = Object.keys(st.comp.tables[key]).sort((a, b) => strength(st, b) - strength(st, a)).indexOf(me) + 1; }
    else rank = strengthRanks(st, d).indexOf(me) + 1;
    st.board.target = { ...targetFor(rank, d), div: d }; st.board.rankStrength = rank; st.board.low = 0;
  }

  function pushNews(st, type, txt) { st.news.unshift({ y: st.year, r: st.round + 1, type, txt }); if (st.news.length > 80) st.news.length = 80; }
  // ---------- patrocinio (marcas ficticias do prototipo) ----------
  // empresas reais citadas so pelo nome (sem logo, sem cores da marca) como patrocinadoras no prototipo.
  // Fora da lista de proposito: casas de apostas, bebida alcoolica e tabaco.
  // art: artigo usado nas frases ("fecha com o Itaú", "com a Samsung").
  const BRANDS = [
    ['itau', 'Itaú', 'o', 'Banco'], ['bradesco', 'Bradesco', 'o', 'Banco'], ['bb', 'Banco do Brasil', 'o', 'Banco'], ['caixa', 'Caixa', 'a', 'Banco'],
    ['santander', 'Santander', 'o', 'Banco'], ['nubank', 'Nubank', 'o', 'Banco digital'], ['picpay', 'PicPay', 'o', 'Pagamentos'],
    ['cocacola', 'Coca-Cola', 'a', 'Bebidas'], ['guarana', 'Guaraná Antarctica', 'o', 'Bebidas'], ['pepsi', 'Pepsi', 'a', 'Bebidas'], ['gatorade', 'Gatorade', 'o', 'Bebidas'],
    ['sadia', 'Sadia', 'a', 'Alimentos'], ['seara', 'Seara', 'a', 'Alimentos'], ['nestle', 'Nestlé', 'a', 'Alimentos'], ['piracanjuba', 'Piracanjuba', 'a', 'Alimentos'],
    ['samsung', 'Samsung', 'a', 'Tecnologia'], ['motorola', 'Motorola', 'a', 'Tecnologia'],
    ['vivo', 'Vivo', 'a', 'Telefonia'], ['claro', 'Claro', 'a', 'Telefonia'], ['tim', 'TIM', 'a', 'Telefonia'],
    ['mercadolivre', 'Mercado Livre', 'o', 'Varejo'], ['magalu', 'Magalu', 'o', 'Varejo'], ['casasbahia', 'Casas Bahia', 'a', 'Varejo'], ['renner', 'Renner', 'a', 'Moda'],
    ['natura', 'Natura', 'a', 'Beleza'], ['boticario', 'Boticário', 'o', 'Beleza'], ['ype', 'Ypê', 'a', 'Limpeza'],
    ['petrobras', 'Petrobras', 'a', 'Energia'], ['ipiranga', 'Ipiranga', 'a', 'Combustível'],
    ['latam', 'LATAM', 'a', 'Aviação'], ['gol', 'Gol', 'a', 'Aviação'], ['azul', 'Azul', 'a', 'Aviação'],
    ['unimed', 'Unimed', 'a', 'Saúde'], ['localiza', 'Localiza', 'a', 'Aluguel de carros'], ['fiat', 'Fiat', 'a', 'Automóveis'], ['ifood', 'iFood', 'o', 'Delivery'],
  ].map(([id, name, art, cat]) => ({ id, name, art, cat }));
  const withB = b => `${b.art || 'a'} ${b.name}`;
  // valores em multiplos da base de patrocinio do clube (40% da cota antiga). Cada tipo tem um perfil de risco:
  // longo = seguro e com luvas na assinatura; alto = mais dinheiro agora, renovação depende do desempenho;
  // vitoria = paga mais para quem ganha muito; titulo = aposta alta, só para os favoritos.
  const SPONSOR_KINDS = {
    longo: { label: 'Contrato longo', rounds: 3 * SEASON_WEEKS, per: 0.95, signing: 3, pitch: (b, c) => `Parceria de três temporadas: ${b} paga luvas na assinatura e não mexe no valor, aconteça o que acontecer.` },
    alto: { label: 'Valor alto', rounds: SEASON_WEEKS, per: 1.0, pitch: (b, c) => `Uma temporada só, pagando mais. Na renovação, o valor acompanha a campanha do ${c}.` },
    vitoria: { label: 'Bônus por vitória', rounds: 2 * SEASON_WEEKS, per: 0.65, win: 0.8, pitch: (b, c) => `Fixo menor e um extra a cada vitória do ${c}. Rende mais para quem ganha muito.` },
    titulo: { label: 'Bônus por título', rounds: 2 * SEASON_WEEKS, per: 0.85, title: 20, pitch: (b, c) => `Se o ${c} ganhar a sua série ou a Copa do Brasil, ${b} paga um bônus grande no fim da temporada.` },
  };
  function sponsorPerf(st) {
    // campanha atual (ou a última) contra o lugar esperado pelo elenco (ranking de força):
    // cada posição acima vale +2%, abaixo −2%, entre −15% e +15%. Na média, um time que rende o que o elenco vale fica em 0%.
    if (st.round === 0 && !(st.history || []).length) return 1;
    const exp = st.board && st.board.rankStrength; if (!exp) return 1;
    const pos = st.round > 0 ? position(st) : st.history[st.history.length - 1].pos;
    return Math.max(0.85, Math.min(1.15, 1 + (exp - pos) * 0.02));
  }
  function sponsorOffers(st) {
    const c = st.clubs[st.coach.club]; const rng = rngFor(st, 'sponsor', st.year, st.round, c.id);
    const base = (c.sponsorBase || Math.round((c.tv || 0) * 0.4 / 1000) * 1000) * sponsorPerf(st);
    const rank = strengthRanks(st, c.div).indexOf(c.id) + 1;
    const kinds = ['longo', rank <= 4 ? 'titulo' : 'vitoria', 'alto'];
    const pool = BRANDS.slice(); const pick = () => pool.splice(Math.floor(rng() * pool.length), 1)[0];
    return kinds.map(k => {
      const K = SPONSOR_KINDS[k]; const b = pick(); const vary = 0.96 + rng() * 0.08;
      const per = Math.round(base * K.per * vary / 1000) * 1000;
      return { kind: k, label: K.label, brand: b, per, rounds: K.rounds, total: per * K.rounds,
        signing: K.signing ? Math.round(base * K.signing * vary / 10000) * 10000 : 0,
        winBonus: K.win ? Math.round(base * K.win * vary / 1000) * 1000 : 0,
        titleBonus: K.title ? Math.round(base * K.title * vary / 10000) * 10000 : 0,
        pitch: K.pitch(withB(b), c.name) };
    });
  }
  function signSponsor(st, i) {
    const o = (st.sponsorOffers || [])[i]; if (!o) return null;
    st.sponsor = { ...o, left: o.rounds, since: { y: st.year, r: st.round + 1 }, earned: 0 };
    st.sponsorOffers = [];
    if (o.signing) { money(st, 'sponsor', o.signing, `Luvas do patrocínio (${o.brand.name})`); st.sponsor.earned += o.signing; }
    pushNews(st, 'club', `${st.clubs[st.coach.club].name} fecha com ${withB(o.brand)}: ${fmt(o.per)} por rodada${o.signing ? ` e ${fmt(o.signing)} de luvas` : ''}${o.winBonus ? ` e ${fmt(o.winBonus)} por vitória` : ''}${o.titleBonus ? ` e ${fmt(o.titleBonus)} se for campeão` : ''}.`);
    return st.sponsor;
  }
  function migrate(st) {
    if (st.coach) { life(st); if (st.lineup && !st.lineup.takers) st.lineup.takers = {}; }
    Object.values(st.players || {}).forEach(p => { if (Array.isArray(p.at)) E.normAt(p); });
    Object.values(st.infra || {}).forEach(inf => (inf.prospects || []).forEach(p => { if (Array.isArray(p.at)) E.normAt(p); }));
    // loja antiga com estoque: devolve o estoque pelo custo e passa para a loja sem estoque
    Object.entries(st.infra || {}).forEach(([id, inf]) => {
      if (inf.stock > 0 && st.coach && id === st.coach.club) { const v = r1k(inf.stock * kitPrice(st, id) * 0.5); if (v) money(st, 'loja', v, `Loja: ${inf.stock.toLocaleString('pt-BR')} camisas do estoque antigo devolvidas ao fornecedor`); }
      delete inf.stock; delete inf.auto; delete inf.missed; if (!inf.boosts) inf.boosts = [];
      if (inf.hype > 1.6) inf.hype = 1.6;
    });
    // marcas antigas (ficticias) viram empresas da lista atual, mantendo os valores do contrato
    const known = b => b && BRANDS.some(x => x.id === b.id);
    if ((st.sponsorOffers || []).some(o => !known(o.brand))) st.sponsorOffers = sponsorOffers(st);
    if (st.sponsor && !known(st.sponsor.brand)) { st.sponsor.brand = BRANDS[hashSeed(st.sponsor.brand.id || 'x') % BRANDS.length]; st.sponsor.pitch = SPONSOR_KINDS[st.sponsor.kind].pitch(withB(st.sponsor.brand), st.clubs[st.coach.club].name); }
    return st;
  }
  function sponsorPending(st) { return !st.sponsor && (st.sponsorOffers || []).length > 0; }

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
  // quantos titulares o clube poupa nesta partida. Clube da Série A trata a Sul-Americana como
  // prioridade menor que o Brasileirão e gira o time, igual ao que acontece de verdade.
  function rotCount(st, clubId, mt) {
    if (!mt || mt.comp !== 'SUL') return 0;
    const c = st.clubs[clubId]; if (!c || c.div !== 'A') return 0;
    return 3;
  }
  function aiSide(st, clubId, oppId, isHome, rng, mt) {
    const c = st.clubs[clubId]; let squad = squadOf(st, clubId);
    const rot = rotCount(st, clubId, mt);
    if (rot > 0) {
      const poupa = new Set(squad.filter(p => p.pos !== 'GK' && p.inj <= 0 && p.sus <= 0)
        .sort((a, b) => b.ovr - a.ovr).slice(0, rot).map(p => p.id));
      if (squad.filter(p => p.inj <= 0 && p.sus <= 0).length - poupa.size >= 14) squad = squad.filter(p => !poupa.has(p.id));
    }
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
    const tk = {}; Object.entries(lu.takers || {}).forEach(([k, id]) => { if (id && st.players[id] && st.players[id].club === me) tk[k] = id; });
    return { club: me, xi: E.lineupFrom(me, st.players, use), bench: benchIds.map(i => st.players[i]), ment: lu.ment || 'equilibrada', persona: st.coach.persona, morale: st.morale, human: true, assist, notes, takers: tk, fit: course(st, 'fisica') ? 0.9 : 1, ana: course(st, 'analise') ? 1.02 : 1, spBonus: course(st, 'bola') ? 4 : 0 };
  }

  // ---------- times salvos (fase 4) ----------
  const PRESETS = { tit: 'Titular', res: 'Reserva', copa: 'Copa' };
  const PRESET_COMP = { liga: 'Brasileiro', est: 'Estadual', cdb: 'Copa do Brasil' };
  function compKind(comp) { return comp === 'EST' ? 'est' : comp === 'CDB' ? 'cdb' : comp === 'LIB' || comp === 'SUL' ? 'cont' : 'liga'; }
  function savePreset(st, k) {
    if (!PRESETS[k]) return false; st.presets = st.presets || {};
    const lu = st.lineup; st.presets[k] = { formation: lu.formation, slots: lu.slots.slice(), bench: (lu.bench || []).slice(), ment: lu.ment, takers: { ...(lu.takers || {}) }, saved: `${st.year}·S${st.round + 1}` };
    return true;
  }
  function loadPreset(st, k) {
    const pr = st.presets && st.presets[k]; if (!pr) return false;
    const me = st.coach.club; const mine = id => id && st.players[id] && st.players[id].club === me;
    st.lineup = { formation: pr.formation, slots: pr.slots.map(id => mine(id) ? id : null), bench: pr.bench.filter(mine), ment: pr.ment, takers: { ...(pr.takers || {}) } };
    // vaga de quem saiu do clube: o melhor disponível da posição
    const f = E.FORMATIONS[st.lineup.formation]; const used = new Set(st.lineup.slots.filter(Boolean));
    st.lineup.slots = st.lineup.slots.map((id, i) => { if (id) return id; let b = null, bv = -1; squadOf(st, me).forEach(p => { if (used.has(p.id) || p.inj > 0 || p.sus > 0) return; const v = E.effRating(p, f.slots[i][0], {}); if (v > bv) { bv = v; b = p; } }); if (b) used.add(b.id); return b ? b.id : null; });
    st.lineupFrom = k; return true;
  }
  // no começo de cada semana com jogo: usa o time salvo escolhido para aquela competição
  function applyPresetFor(st) {
    const fx = userFixture(st); if (!fx || !st.presetFor) return null;
    const k = st.presetFor[compKind(fx.mt.comp)]; if (!k || !(st.presets || {})[k]) return null;
    loadPreset(st, k); return k;
  }

  function suggestMent(st) {
    const fx = userFixture(st); if (!fx) return 'equilibrada';
    return E.aiMentality(strength(st, st.coach.club) - strength(st, fx.opp), fx.home);
  }

  // altitude: mandante acima de 2.500 m contra visitante de baixo ganha vantagem extra (até 10%)
  function altFactor(st, h, a) { const ah = st.clubs[h].alt || 0, aa = st.clubs[a].alt || 0; return ah >= 2500 && aa < 2000 ? 1 + Math.min(0.1, 0.02 + (ah - 2000) / 2000 * 0.08) : 1; }
  function prepareUserMatch(st) {
    const fx = userFixture(st); if (!fx) return null;
    const rng = rngFor(st, 'match', st.round, 'user');
    const me = userSide(st); const opp = aiSide(st, fx.opp, st.coach.club, !fx.isHome && !fx.neutral, rng, fx.mt);
    if (!fx.neutral) { (fx.isHome ? me : opp).crowd = crowd(st, fx.h, fx.mt).fill; (fx.isHome ? me : opp).alt = altFactor(st, fx.h, fx.a); }
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
      const home = aiSide(st, mt.h, mt.a, !mt.neutral, rng, mt); if (!mt.neutral) { home.crowd = crowd(st, mt.h, mt).fill; home.alt = altFactor(st, mt.h, mt.a); }
      const m = E.newMatch({ home, away: aiSide(st, mt.a, mt.h, false, rng, mt), rng, neutral: mt.neutral });
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
        if (p._inj) { let d = p._inj; if (p.club === st.coach.club) d = Math.max(1, Math.floor(d * (1 - ctBonus(st).inj) + rngFor(st, 'inj', st.round, pid)())); p.inj = d; }
      });
    });
    const gk = m.side.map(s => { const o = s.xi.find(x => x.slot === 'GK' && x.p); return o ? o.p.ovr : 60; });
    const t = C.applyResult(st.comp, m.mt, gh, ga, rngFor(st, 'pen', st.round, h, a), gk);
    return { h, a, gh, ga, user: isUser, ratings, comp: m.mt.comp, key: m.mt.key, label: m.mt.label, tie: t ? { w: t.w, pen: t.pen, legs: t.legs, g: t.g.slice(), a: t.a, b: t.b } : null };
  }

  function clearTemp(st) { Object.values(st.players).forEach(p => { delete p._g; delete p._a; delete p._yc; delete p._psv; delete p._pmiss; delete p._red; delete p._inj; delete p._hurt; delete p._off; delete p.condStart; delete p.condLive; }); }

  function recoverAll(st) {
    const me = st.coach.club; const rb = ctBonus(st).rec - (st.coach.study ? 2 : 0);
    Object.values(st.players).forEach(p => {
      p.cond = Math.min(100, p.cond + 0.35 * (100 - p.cond) + 8 + (p.club === me ? rb : 0));
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
      xp = Math.round(((res === 'V' ? 30 : res === 'E' ? 12 : 5) + obj.done.length * 20) * xpMult(st));
      st.morale = Math.max(20, Math.min(92, st.morale + (res === 'V' ? 8 : res === 'E' ? 1 : -7 * (course(st, 'grupo') ? 0.7 : 1)))); st.morale += (55 - st.morale) * 0.08;
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
      if (res === 'D' && dc < 0 && life(st).flags.underdog === st.round) dc = Math.round(dc / 2);
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
      const rngEvo = rngFor(st, 'evo', st.round); const cbEvo = ctBonus(st).evo;
      Object.entries(ures.ratings).forEach(([pid, r]) => {
        const p = st.players[pid]; if (!p || p.club !== me) return;
        if (p.age <= 23 && p.ovr < p.pot) {
          let ch = Math.max(0.03, Math.min(0.38, 0.12 + 0.09 * (r - 6.5))); if (st.coach.persona === 'revelador') ch *= 1.5; ch *= cbEvo;
          if (rngEvo() < ch) { p.ovr++; bumpAt(p, 1); report.evolutions.push({ id: p.id, n: p.n, from: p.ovr - 1, to: p.ovr }); if (p.age <= 21 && p.ovr >= 75) ach('talent'); }
        } else if (p.age >= 31 && r < 6.0 && rngEvo() < 0.06) { p.ovr--; bumpAt(p, -1); report.evolutions.push({ id: p.id, n: p.n, from: p.ovr + 1, to: p.ovr }); }
        p.wage = Math.max(p.wage, E.wageFor(p.ovr) * 0.8 | 0);
      });
      report.compKey = fx.mt.key || null;
      report.promises = checkPromises(st, { match: true, week: st.round, res, xi: startXI.map(p => p.id) });
      // mata-mata decidido
      if (ures.tie && ures.tie.w) { report.tie = { ...ures.tie, won: ures.tie.w === me, label: fx.label }; }
    }
    // finanças semanais de todos os clubes; no meio de semana (copas continentais) só entra a bilheteria
    const mid = isMid(st.round);
    const homeGame = {}; fixtures.forEach(mt => { if (!mt.neutral) homeGame[mt.h] = mt; });
    Object.values(st.clubs).forEach(c => {
      if (c.div === 'X') return;
      const isUser = c.id === me; const wb = wageBill(st, c.id);
      let gate = 0;
      if (homeGame[c.id]) {
        const cw = crowd(st, c.id, homeGame[c.id]); gate = cw.gate;
        if (isUser) { report.attendance = cw.att; report.fill = cw.fill; report.ticket = cw.price; const inf = infra(st); inf.att.unshift(cw.att); if (inf.att.length > 6) inf.att.length = 6; }
      }
      if (mid) {
        if (isUser) { if (gate) money(st, 'gate', gate, `Bilheteria (${(report.attendance || 0).toLocaleString('pt-BR')} torcedores)`); report.finance = { tv: 0, wage: 0, gate, bonus: obj.done.length * obj.bonus, sponsor: 0, winBonus: 0 }; report.mid = true; }
        else c.cash += gate;
        return;
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
    infraWeek(st, report, res, fx, mid);
    // prêmios da CONMEBOL nos jogos de grupo: mando de campo e vitória
    if (userMatch && fx && (fx.mt.comp === 'LIB' || fx.mt.comp === 'SUL') && fx.mt.key) {
      const K = fx.mt.comp === 'LIB' ? 'L' : 'S';
      report.contPrize = (fx.isHome ? payCont(st, K, CONT_PRIZE[K].home, 'cota por jogo em casa na fase de grupos') : 0) + (res === 'V' ? payCont(st, K, CONT_PRIZE[K].win, 'prêmio por vitória na fase de grupos') : 0);
    }
    // fases seguintes (mata-mata, quadrangulares, finais)
    const sm = {}; const str = id => sm[id] != null ? sm[id] : (sm[id] = strength(st, id));
    const contKo = () => Object.fromEntries(Object.entries(st.comp.cont || {}).map(([K, Cc]) => [K, Object.keys(Cc.ko).join(',')]));
    const before = { cup: st.comp.cup.length, dko: st.comp.dko.length, cq: !!st.comp.cq, cf: !!st.comp.cf, cont: contKo() };
    C.afterWeek(st.comp, st.round, { str, rng: rngFor(st, 'draw', st.round) });
    report.cupQuota = stageNews(st, before);
    report.contPrize = (report.contPrize || 0) + contStage(st, before.cont);
    if (!mid) { report.aiDeals = aiMarketTick(st); squadOf(st, me).forEach(p => { if (p.unhappy > 0) p.unhappy--; }); }
    const fin = st.comp.cup[7] && st.comp.cup[7][0];
    if (fin && fin.w && !st.cupFinalPaid && (fin.a === me || fin.b === me)) { st.cupFinalPaid = true; report.cupQuota = (report.cupQuota || 0) + payCup(st, 7, fin.w === me); }
    if (!mid) marketTick(st, report);
    if (userMatch) {
      st.coach.xp += xp; report.xp = xp; st.coach.level = levelFromXp(st.coach.xp);
      const oppName = st.clubs[fx.opp].name; const myName = st.clubs[me].name;
      pushNews(st, 'result', `${fx.isHome ? myName + ' ' + gf + ' x ' + ga + ' ' + oppName : oppName + ' ' + ga + ' x ' + gf + ' ' + myName} (${fx.label})`);
      if (report.tie) {
        const [comp, phRaw = ''] = fx.label.split(' · '); const ph = phRaw.replace(/ \((ida|volta)\)$/, ''); const fin = /^final$/i.test(ph);
        pushNews(st, 'club', report.tie.won
          ? (fin ? `${myName} vence ${oppName} na final e é campeão: ${comp}!` : `${myName} elimina ${oppName} e avança (${comp} · ${ph}).`)
          : (fin ? `${myName} perde a final para ${oppName} (${comp}).` : `${myName} cai para ${oppName} (${comp} · ${ph}).`));
      }
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
    lifeWeek(st, report, mid);
    if (st.board.low >= 3) { st.fired = true; pushNews(st, 'club', `${st.coach.name} é demitido do ${st.clubs[me].name}.`); }
    if (st.round >= WEEKS) report.season = endSeason(st);
    else { genObjectives(st); auctionTick(st); report.preset = applyPresetFor(st); }
    return report;
  }
  // semana sem jogo do usuário
  function simWeek(st) { return finishRound(st, null); }

  // copas continentais: sorteio de cada fase, prêmio de quem avança e prêmio da final
  function contStage(st, before) {
    const me = st.coach.club; let paid = 0; const nm = id => st.clubs[id].name;
    Object.entries(st.comp.cont || {}).forEach(([K, Cc]) => {
      const had = (before[K] || '').split(',').filter(Boolean);
      Object.keys(Cc.ko).filter(ph => !had.includes(ph)).forEach(ph => {
        const t = Cc.ko[ph].find(x => (x.a === me || x.b === me) && x.a !== x.b);
        pushNews(st, 'cup', `${C.CONT[K].name}: definid${ph === 'F' ? 'a a final' : ph === 'SF' ? 'a a semifinal' : ph === 'PO' ? 'o o playoff' : 'as as ' + C.CONT_PH[ph].toLowerCase()}${t ? '. Seu rival: ' + nm(t.a === me ? t.b : t.a) : ph === 'F' ? ': ' + nm(Cc.ko.F[0].a) + ' x ' + nm(Cc.ko.F[0].b) : ''}.`);
        if (t && ph !== 'F' && CONT_PRIZE[K][ph]) paid += payCont(st, K, CONT_PRIZE[K][ph], `prêmio ${C.inPhase(C.CONT_PH[ph], 'd')}`);
      });
      const f = Cc.ko.F && Cc.ko.F[0];
      if (f && f.w && !st.contFinalPaid[K]) {
        st.contFinalPaid[K] = true;
        pushNews(st, 'cup', `${nm(f.w)} é campeão da ${C.CONT[K].name} ${st.year}!`);
        if (f.a === me || f.b === me) paid += payCont(st, K, CONT_PRIZE[K].F[f.w === me ? 0 : 1], f.w === me ? 'prêmio de campeão' : 'prêmio de vice');
      }
    });
    return paid;
  }
  // notícias quando as fases mudam
  function stageNews(st, before) {
    const S = st.comp, me = st.coach.club; const nm = id => st.clubs[id].name;
    let paid = 0;
    if (S.cup.length > before.cup) { const ph = S.cup.length - 1; const t = S.cup[ph].find(x => x.a === me || x.b === me); pushNews(st, 'cup', `Copa do Brasil: sorteio ${C.inPhase(C.CUP[ph].name, 'd')}${t ? '. Seu rival: ' + nm(t.a === me ? t.b : t.a) : ''}.`); if (t && ph < 7) paid = payCup(st, ph); }
    if (!before.cq && S.cq) pushNews(st, 'club', `Série C: definidos os quadrangulares do acesso.`);
    if (!before.cf && S.cf) pushNews(st, 'club', `Série C: final entre ${nm(S.cf.a)} e ${nm(S.cf.b)}.`);
    if (S.dko.length > before.dko) pushNews(st, 'club', `Série D: definida a ${C.D_KO[S.dko.length - 1].name.toLowerCase()}.`);
    return paid;
  }

  // ---------- mercado ----------
  const xiMemo = new WeakMap();
  function starters(st, clubId) {
    const key = st.round + ':' + st.year + ':' + (st.rosters[clubId] || []).join(',');
    let memo = xiMemo.get(st); if (!memo) { memo = {}; xiMemo.set(st, memo); }
    if (!memo[clubId] || memo[clubId].key !== key) memo[clubId] = { key, set: new Set(E.autoLineup(squadOf(st, clubId), st.clubs[clubId].formation).slots) };
    return memo[clubId].set;
  }
  function marketList(st, filt = {}) {
    let list = Object.values(st.players).filter(p => p.club && st.clubs[p.club] && st.clubs[p.club].div !== 'X' && p.club !== st.coach.club && p.inj <= 0);
    if (filt.div) list = list.filter(p => st.clubs[p.club].div === filt.div);
    if (filt.pos) list = list.filter(p => p.pos === filt.pos);
    if (filt.maxAge) list = list.filter(p => p.age <= filt.maxAge);
    if (filt.minOvr) list = list.filter(p => p.ovr >= filt.minOvr);
    if (filt.q) { const q = filt.q.toLowerCase(); list = list.filter(p => p.n.toLowerCase().includes(q) || st.clubs[p.club].name.toLowerCase().includes(q)); }
    return list.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
  }
  function wageRoom(st) { const c = st.clubs[st.coach.club]; return c.wageCap - wageBill(st, st.coach.club); }

  function unlockAch(st, k) { if (!st.achievements[k]) { st.achievements[k] = `${st.year}·S${st.round + 1}`; st.coach.xp += 50; st.coach.level = levelFromXp(st.coach.xp); st._newAch = (st._newAch || []).concat(k); } }

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

  // ---------- contratar (modelo do Brasileirinho): preço, luvas e salário; o jogador mostra o interesse antes ----------
  // interesse começa em 55 e soma motivos; topa vir com 60 ou mais
  const INTEREST_OK = 60;
  function marketWage(p) { return Math.round(Math.max(p.wage, E.wageFor(p.ovr)) / 1000) * 1000; }
  function interest(st, p, t = {}) {
    const me = st.coach.club; const mc = st.clubs[me]; const hc = st.clubs[p.club]; const order = ['D', 'C', 'B', 'A'];
    const R = []; const add = (txt, v) => { if (v) R.push([txt, v]); };
    const dd = order.indexOf(mc.div) - order.indexOf(hc.div);
    if (dd > 0) add('Subir de divisão pesa a favor', 9 * dd); else if (dd < 0) add('Cair de divisão pesa contra', -12 * -dd);
    else { const pd = prestige(st, me) - prestige(st, p.club); if (pd >= 8) add('Clube maior que o atual', 5); else if (pd <= -8) add('Clube menor que o atual', -6); }
    const conf = st.board.conf, mor = st.morale;
    if (conf >= 65 && mor >= 60) add('Clube em bom momento, torcida e diretoria confiantes', 12); else if (conf < 35 || mor < 40) add('Clube em crise', -10);
    const fam = E.FAM[p.pos]; const mine = squadOf(st, me).filter(x => E.FAM[x.pos] === fam && x.id !== p.id).sort((a, b) => b.ovr - a.ovr);
    const n = { GOL: 1, ZAG: 2, LAT: 2, MEI: 3, ATA: 3 }[fam]; const bar = mine[n - 1] ? mine[n - 1].ovr : 0;
    const role = p.ovr > bar + 1 ? 'tit' : p.ovr >= bar - 2 ? 'briga' : 'res';
    add(role === 'tit' ? 'Chega como titular' : role === 'briga' ? 'Chega para brigar por posição' : 'Chega como reserva', role === 'tit' ? 12 : role === 'briga' ? 3 : -12);
    if (t.luvas) add(`Luvas de ${t.luvas} %`, t.luvas >= 30 ? 18 : 10);
    if (t.sal) add(`Salário ${t.sal} % acima do mercado`, t.sal >= 30 ? 11 : 6);
    if (p.age >= 31 && role !== 'res') add('Veterano, topa um novo desafio', 5);
    if (p.age <= 22 && dd >= 0 && prestige(st, me) > prestige(st, p.club) + 8) add('Jovem quer vitrine maior', 5);
    if ((p.contract || 2) <= 1) add('Contrato dele está acabando', 4);
    if (contOf(st, me) && !contOf(st, p.club)) add('Você disputa torneio continental', 6);
    add(mc.uf && mc.uf === hc.uf ? 'Já joga no mesmo estado' : 'Não tem ligação com o clube', mc.uf && mc.uf === hc.uf ? 2 : -2);
    const score = Math.max(0, Math.min(100, 55 + R.reduce((a, r) => a + r[1], 0)));
    const label = score >= INTEREST_OK ? 'Topa vir' : score >= 45 ? 'Quer mais' : 'Não topa';
    return { score, label, ok: score >= INTEREST_OK, reasons: R };
  }
  // quanto o clube dono aceita abaixo do pedido (regra aberta: aparece na tela antes de confirmar)
  function sellerFlex(st, p) {
    const R = []; let f = 0.05; R.push(['Margem normal de negociação', 5]);
    if (!starters(st, p.club).has(p.id)) { f += 0.1; R.push(['Não é titular lá', 10]); }
    if (st.clubs[p.club].cash < 0) { f += 0.1; R.push(['Clube precisa de dinheiro', 10]); }
    if ((p.contract || 2) <= 1) { f += 0.05; R.push(['Último ano de contrato', 5]); }
    if (p.age >= 31) { f += 0.05; R.push(['Veterano', 5]); }
    return { flex: f, reasons: R };
  }
  // termos de compra: valor (-1 abaixo 15%, 0 pedido, 1 acima 15%), luvas (0/15/30 % do valor), salário (0/15/30 % acima do mercado)
  function buyTerms(st, pid, t = {}) {
    const p = st.players[pid]; const me = st.coach.club; const A = sellerAsk(st, p);
    const valor = t.valor || 0; const fee = r10(A.ask * (1 + 0.15 * valor)); const luvasV = t.luvas ? r10(fee * t.luvas / 100) : 0;
    const wage = Math.round(marketWage(p) * (1 + (t.sal || 0) / 100) / 1000) * 1000;
    const top = topIds(st, p.club, 3).includes(p.id); const F = sellerFlex(st, p);
    let club;
    if (top && valor < 1) club = { ok: false, txt: `${st.clubs[p.club].name} só vende um dos 3 melhores do elenco acima do pedido.` };
    else if (valor < 0 && F.flex < 0.15) club = { ok: false, txt: `${st.clubs[p.club].name} não aceita 15% abaixo: aceita no máximo ${Math.round(F.flex * 100)}% de desconto.`, flex: F };
    else club = { ok: true, txt: valor < 0 ? `${st.clubs[p.club].name} aceita o desconto.` : valor > 0 ? `${st.clubs[p.club].name} aceita na hora.` : `${st.clubs[p.club].name} aceita o pedido.`, flex: F };
    const it = interest(st, p, t);
    const blocked = !windowOpen(st.round) ? 'A janela de transferências está fechada.' : p.loan ? `Emprestado pelo ${st.clubs[p.loan.owner].name}: só negocia quando voltar.` : st.rosters[me].length >= SQUAD_MAX ? `Elenco cheio (${SQUAD_MAX}).` : wage > wageRoom(st) ? `O salário estoura o teto da folha em ${fmt(wage - wageRoom(st))}.` : fee + luvasV > st.clubs[me].cash ? `Caixa insuficiente: faltam ${fmt(fee + luvasV - st.clubs[me].cash)}.` : null;
    return { p, ask: A.ask, value: A.value, askReasons: A.reasons, fee, luvasV, total: fee + luvasV, wage, club, it, blocked, ok: !blocked && club.ok && it.ok };
  }
  function signPlayer(st, pid, t) {
    const T = buyTerms(st, pid, t); if (!T.ok) return { ok: false, msg: T.blocked || (!T.club.ok ? T.club.txt : `${T.p.n} não topa vir (${T.it.score}/100).`) };
    const p = T.p; transfer(st, p, st.coach.club, T.fee, T.wage); if (T.luvasV) money(st, 'buy', -T.luvasV, `Luvas de ${p.n}`); p.contract = 3;
    if ((t.valor || 0) < 0) unlockAch(st, 'dealer');
    return { ok: true, msg: `${p.n} é do ${st.clubs[st.coach.club].name}! ${fmt(T.total)}${T.luvasV ? ` (com ${fmt(T.luvasV)} de luvas)` : ''}, salário de ${fmt(T.wage)} por semana, contrato de 3 anos.` };
  }
  // termos de empréstimo: quanto do salário você paga (50/100 %), com ou sem obrigação de compra (pelo pedido)
  function loanTerms(st, pid, t = {}) {
    const p = st.players[pid]; const me = st.coach.club; const A = sellerAsk(st, p);
    const share = t.share ?? 1; const wage = Math.round(marketWage(p) * (1 + (t.sal || 0) / 100) / 1000) * 1000; const myWage = Math.round(wage * share / 1000) * 1000;
    const inXi = starters(st, p.club).has(p.id); const top = topIds(st, p.club, 3).includes(p.id);
    let club;
    if (top) club = { ok: false, txt: `${st.clubs[p.club].name} não empresta um dos 3 melhores do elenco.` };
    else if (inXi && !t.obligation) club = { ok: false, txt: `É titular no ${st.clubs[p.club].name}: só sai emprestado com obrigação de compra.` };
    else if (share < 1 && !t.obligation && p.age > 21) club = { ok: false, txt: `${st.clubs[p.club].name} quer que você pague todo o salário.` };
    else club = { ok: true, txt: `${st.clubs[p.club].name} empresta${t.obligation ? ' com obrigação de compra' : ''}.` };
    const it = interest(st, p, { sal: t.sal });
    const fee = loanFee(p); const buyFee = t.obligation ? A.ask : null;
    const blocked = !windowOpen(st.round) ? 'A janela de transferências está fechada.' : p.loan ? 'Já está emprestado.' : st.rosters[me].length >= SQUAD_MAX ? `Elenco cheio (${SQUAD_MAX}).` : myWage > wageRoom(st) ? `O salário estoura o teto da folha em ${fmt(myWage - wageRoom(st))}.` : fee > st.clubs[me].cash ? 'Caixa insuficiente para a taxa.' : null;
    return { p, ask: A.ask, value: A.value, fee, buyFee, wage, myWage, share, club, it, blocked, ok: !blocked && club.ok && it.ok };
  }
  function loanIn(st, pid, t) {
    const T = loanTerms(st, pid, t); if (!T.ok) return { ok: false, msg: T.blocked || (!T.club.ok ? T.club.txt : `${T.p.n} não topa vir (${T.it.score}/100).`) };
    loanMove(st, T.p, st.coach.club, { share: T.share, obligation: !!t.obligation, buyFee: T.buyFee, fee: T.fee, wage: T.wage });
    return { ok: true, msg: `${T.p.n} chega emprestado até o fim de ${st.year}.${t.obligation ? ` Compra obrigatória de ${fmt(T.buyFee)} no fim.` : ' Volta ao clube no fim da temporada.'}` };
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

  // reforço que vira o novo craque do elenco anima a loja; vender o ídolo esfria
  function lojaMarket(st, p, from, to) {
    const me = st.coach.club; if (from !== me && to !== me) return;
    const idol = idolOf(st, me);
    if (from === me && idol.p && idol.p.id === p.id) { addBoost(st, 'saida', `Saída de ${p.n} esfriou a torcida`, -0.12, 4); return; }
    if (to === me && idol.p && p.ovr >= idol.p.ovr - 1) addBoost(st, 'reforco', `Camisa do reforço: ${p.n}`, Math.max(0.08, Math.min(0.3, 0.1 + 0.02 * (p.ovr - idol.p.ovr))), 4);
    else if (to === me && !idol.p) addBoost(st, 'reforco', `Camisa do reforço: ${p.n}`, 0.1, 4);
  }
  function transfer(st, p, toClub, fee, wage, quiet) {
    const from = p.club; const me = st.coach.club;
    lojaMarket(st, p, from, toClub);
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
    lojaMarket(st, p, from, to);
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
    const others = Object.keys(st.clubs).filter(id => id !== me && st.clubs[id].div !== 'X');
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

  // receita semanal esperada de um clube da IA (cota + bilheteria média): limita o que ele pode gastar em salário
  function aiIncome(st, id) { const c = st.clubs[id]; return c.tv + c.cap * Math.min(1, 0.30 + 0.45 * c.fan + 0.125) * c.ticket * HOME_SHARE[c.div]; }
  // espaço para salário novo: receita menos folha, mais o caixa diluído em 80 semanas (caixa negativo tira espaço)
  function aiRoom(st, id) { return Math.min(st.clubs[id].wageCap * 1.1, aiIncome(st, id) + st.clubs[id].cash / 80) - wageBill(st, id); }
  // mercado entre clubes da IA: na janela, compram, vendem e emprestam pelas mesmas regras de preço
  function aiMarketTick(st) {
    if (!windowOpen(st.round)) return 0;
    const rng = rngFor(st, 'aimkt', st.round); const me = st.coach.club;
    const ids = Object.keys(st.clubs).filter(id => id !== me && st.clubs[id].div !== 'X');
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
      const budget = st.clubs[buyer].cash * 0.5; const room = aiRoom(st, buyer);
      const cands = sellable.filter(p => p.club !== buyer && E.FAM[p.pos] === need.fam && p.ovr >= need.bar + 2 && pres[p.club] <= pres[buyer] + 15 && E.wageFor(p.ovr) <= room && askPrice(st, p) <= budget);
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
      const share = 0.5; // clube grande que empresta paga metade
      const to = ids.filter(id => id !== p.club && pres[id] < pres[p.club] - 10 && st.rosters[id].length < SQUAD_MAX - 4 && strength(st, id) <= p.ovr + 2 && p.wage * share <= aiRoom(st, id));
      if (!to.length) continue;
      const dest = to[rng.int(0, to.length - 1)]; const obligation = rng() < 0.25 && st.clubs[dest].cash > mValue(p);
      loanMove(st, p, dest, { share, obligation, buyFee: obligation ? r10(mValue(p) * (0.9 + rng() * 0.25)) : null, fee: 0 }, true);
      sellable.splice(sellable.indexOf(p), 1); deals++;
    }
    // clube no vermelho vende o salário mais alto fora dos 3 melhores
    ids.filter(id => st.clubs[id].cash < -2 * wageBill(st, id) && st.rosters[id].length > 22).slice(0, 4).forEach(id => {
      const top = new Set(topIds(st, id, 3)); const p = squadOf(st, id).filter(x => !x.loan && !top.has(x.id)).sort((a, b) => b.wage - a.wage)[0]; if (!p) return;
      const fee = askPrice(st, p); const b = ids.filter(o => o !== id && st.clubs[o].cash > fee * 1.5 && aiRoom(st, o) >= p.wage && st.rosters[o].length < SQUAD_MAX - 4 && pres[o] >= pres[id] - 15).sort((a, c) => st.clubs[c].cash - st.clubs[a].cash)[0];
      if (!b) return; transfer(st, p, b, fee, null, true); deals++;
    });
    return deals;
  }
  function quickSell(st, pid) {
    const p = st.players[pid]; if (!windowOpen(st.round)) return { msg: 'A venda só fecha com a janela aberta.' };
    if (p.loan) return { msg: 'Jogador emprestado não pode ser vendido.' };
    if (st.rosters[st.coach.club].length <= 18) return { msg: 'Elenco mínimo é 18 jogadores.' };
    const rng = rngFor(st, 'quick', pid, st.round);
    const v = E.valueFor(p.ovr, p.age, p.pos); const fee = Math.round(v * 0.8 / 10000) * 10000;
    const myDiv = st.clubs[st.coach.club].div;
    const buyer = rng.pick(Object.values(st.clubs).filter(c => c.id !== st.coach.club && c.div === myDiv));
    transfer(st, p, buyer.id, fee); return { ok: true, msg: `${p.n} vendido ao ${buyer.name} por ${fmt(fee)} (venda rápida).` };
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
      money(st, 'buy', -a.bid, `Leilão: ${p.n}`); life(st).signs++; pushNews(st, 'transfer', `${p.n} arrematado pelo ${st.clubs[st.coach.club].name} por ${fmt(a.bid)}.`);
      return { won: true, msg: `Arrematado! ${p.n} é seu por ${fmt(a.bid)}.` };
    }
    const club = a.leader || a.rivals[0]; p.club = club; st.rosters[club].push(p.id); st.clubs[club].cash -= a.bid; p.wage = E.wageFor(p.ovr);
    pushNews(st, 'transfer', `${p.n} fica com o ${st.clubs[club].name} por ${fmt(a.bid)}.`);
    return { won: false, msg: `${st.clubs[club].name} levou ${p.n} por ${fmt(a.bid)}.` };
  }

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
  function lifeWeek(st, report, mid) {
    const L = life(st);
    // estudo
    const sd = st.coach.study;
    if (sd && !mid) {
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
    if (st.round < WEEKS && !st.fired && !mid) {
      if (!L.presser) L.presser = genPresser(st);
      if (!L.event) L.event = genEvent(st);
    }
  }

  // ---------- estrutura do clube: CT, base, estádio e loja (fase 2) ----------
  // custos de CT e base em semanas da folha de referência; estádio por lugar novo; loja pela margem semanal da loja
  const INFRA = {
    ct: { name: 'Centro de Treinamento', short: 'CT', min: 1, max: 5, cost: [0, 0, 2, 3.5, 5.5, 8], weeks: [0, 0, 4, 6, 9, 12], maint: 0.006 },
    base: { name: 'Categorias de base', short: 'Base', min: 1, max: 5, cost: [0, 0, 1.5, 2.5, 4, 6], weeks: [0, 0, 4, 6, 8, 10], maint: 0.004 },
    estadio: { name: 'Estádio', short: 'Estádio', min: 0, max: 3, cost: [0, 1, 1.4, 1.9], weeks: [0, 10, 14, 18], maint: 0.005 },
    loja: { name: 'Loja oficial', short: 'Loja', min: 1, max: 5, cost: [0, 0, 30, 45, 65, 90], weeks: [0, 0, 4, 5, 6, 8], maint: 0.002 },
  };
  // cada ampliação soma 20% da capacidade original (no mínimo 2 mil lugares); nenhum estádio passa de 80 mil
  const CAP_MAX = 80000;
  function capAt(cap0, amp) { let c = cap0; for (let i = 0; i < amp; i++) c = Math.min(CAP_MAX, c + Math.max(Math.round(cap0 * 0.2), 2000)); return Math.max(cap0, c); }
  const TICKET_MULT = [0.7, 0.85, 1, 1.2, 1.45];
  const TICKET_NAME = ['Popular', 'Barato', 'Normal', 'Caro', 'Premium'];
  const KIT_PRICE = { A: 280, B: 200, C: 150, D: 120 };
  const KIT_DM = { A: 1, B: 0.6, C: 0.45, D: 0.3 };
  const PROSPECTS = [0, 1, 1, 2, 2, 3];
  const BASE_MAX = 6, SQUAD_MAX = 42, PENEIRA_WEEK = C.ligaWeek(14);
  const VERBA = [
    { k: 'pequena', name: 'Pequena', w: 1.5, off: 0, press: 0, fail: 3 },
    { k: 'media', name: 'Média', w: 3, off: 0.3, press: 5, fail: 4 },
    { k: 'grande', name: 'Grande', w: 5, off: 0.6, press: 10, fail: 5 },
  ];
  const r10k = v => Math.round(v / 10000) * 10000, r1k = v => Math.round(v / 1000) * 1000;

  // níveis iniciais estimados pelo tamanho do clube (não refletem a estrutura real)
  function infraInit(st, id) {
    const c = st.clubs[id];
    const rankA = c.div === 'A' ? strengthRanks(st, 'A').indexOf(id) + 1 : 99;
    const ct = c.div === 'A' ? (rankA <= 6 ? 3 : 2) : c.div === 'B' ? 2 : 1;
    const base = c.div === 'A' ? ct : c.div === 'B' && c.fan >= 0.7 ? 2 : 1;
    const inf = { ct, base, estadio: 0, loja: 1, build: null, ticket: 2, hype: 1, boosts: [{ k: 'kit', txt: 'Camisa nova da temporada', v: 0.15, w: 6, w0: 6 }], sold: 0, salesWk: 0, prospects: [], att: [], verba: null, pressure: 0, ref: wageBill(st, id), cap0: c.cap };
    // a manutenção dos níveis iniciais já vem embutida na cota de TV
    c.tv += infraMaint(inf);
    return inf;
  }
  function infra(st, id = st.coach.club) { st.infra = st.infra || {}; if (!st.infra[id]) st.infra[id] = infraInit(st, id); return st.infra[id]; }
  function infraMaint(inf) { return r1k(inf.ref * (INFRA.ct.maint * (inf.ct - 1) + INFRA.base.maint * (inf.base - 1) + INFRA.estadio.maint * inf.estadio + INFRA.loja.maint * (inf.loja - 1))); }
  function formOf(st, id) {
    if (!st.comp) return 0.5;
    const lk = C.leagueKey(st.comp, id); const t = lk && st.comp.tables[lk] ? st.comp.tables[lk][id] : null;
    return t && t.form.length ? t.form.reduce((a, f) => a + (f === 'V' ? 3 : f === 'E' ? 1 : 0), 0) / (t.form.length * 3) : 0.5;
  }
  function kitPrice(st, id = st.coach.club) { return KIT_PRICE[st.clubs[id].div]; }
  // loja sem estoque: o clube fica com 46% do preço de cada camisa vendida (custo de fábrica e repasse já descontados)
  const LOJA_MARGIN = 0.46;
  // ídolo: quem mais vende camisa no elenco (nota, gols e assistências; goleiro vende menos), comparado com o craque típico da série
  const IDOL_REF = { A: 81, B: 73, C: 62.5, D: 59 };
  function idolOf(st, id = st.coach.club) {
    let best = null, fame = -1;
    (st.rosters[id] || []).forEach(pid => { const p = st.players[pid]; if (!p) return; const f = p.ovr - (p.pos === 'GK' ? 4 : 0) + Math.min(6, 0.3 * (p.g || 0)) + (st.year === 2026 && p.s26 ? Math.min(3, 0.12 * ((p.s26[1] || 0) + (p.s26[2] || 0))) : 0); if (f > fame) { fame = f; best = p; } });
    if (!best) return { p: null, fame: 0, f: 1 };
    return { p: best, fame, f: 1 + Math.max(-0.12, Math.min(0.25, 0.02 * (fame - IDOL_REF[st.clubs[id].div]))) };
  }
  // momentos de venda: picos com nome e prazo; o efeito cai em linha reta até acabar
  function boostSum(inf) { return Math.max(-0.4, Math.min(1, (inf.boosts || []).reduce((a, b) => a + b.v * b.w / b.w0, 0))); }
  function addBoost(st, k, txt, v, w) {
    const inf = infra(st); inf.boosts = (inf.boosts || []).filter(b => b.k !== k);
    inf.boosts.push({ k, txt, v, w, w0: w });
  }
  function lojaDemand(st, id, inf, neutral) {
    const c = st.clubs[id]; const f = neutral ? 0.5 : formOf(st, id);
    const lv = neutral ? 1 : 1 + 0.35 * (inf.loja - 1);
    const extra = neutral ? 1 : (inf.hype || 1) * (1 + boostSum(inf)) * idolOf(st, id).f;
    return 1200 * (0.05 + c.fan * c.fan) * KIT_DM[c.div] * (0.75 + 0.5 * f) * extra * lv;
  }
  function lojaInfo(st) {
    const id = st.coach.club; const inf = infra(st); const price = kitPrice(st, id); const c = st.clubs[id];
    const demand = Math.round(lojaDemand(st, id, inf));
    const base = Math.round(1200 * (0.05 + c.fan * c.fan) * KIT_DM[c.div]);
    const fase = (0.75 + 0.5 * formOf(st, id)) * (inf.hype || 1) - 1;
    const idol = idolOf(st, id);
    const boosts = (inf.boosts || []).map(b => ({ txt: b.txt, pct: Math.round(b.v * b.w / b.w0 * 100), w: b.w }));
    return { price, profit: Math.round(price * LOJA_MARGIN), demand, base, fase, boosts, boostPct: Math.round(boostSum(inf) * 100), idol: idol.p ? { n: idol.p.n, id: idol.p.id, pct: Math.round((idol.f - 1) * 100) } : null, lv: 1 + 0.35 * (inf.loja - 1), weekProfit: r1k(demand * price * LOJA_MARGIN) };
  }
  function infraCost(st, k, inf = infra(st)) {
    const S = INFRA[k]; const to = inf[k] + 1; if (to > S.max) return 0;
    if (k === 'ct' || k === 'base') return r10k(inf.ref * S.cost[to]);
    if (k === 'estadio') { const seats = capAt(inf.cap0, to) - capAt(inf.cap0, to - 1); return seats > 0 ? r10k(seats * st.clubs[st.coach.club].ticket * 40 * S.cost[to]) : 0; }
    const baseMargin = lojaDemand(st, st.coach.club, inf, true) * kitPrice(st) * LOJA_MARGIN;
    return r10k(Math.max(20000, baseMargin * S.cost[to]));
  }
  function infraLabel(k, lvl) { return k === 'estadio' ? (lvl ? `${lvl}ª ampliação` : 'sem ampliação') : `nível ${lvl}`; }
  function infraStart(st, k) {
    const inf = infra(st); const S = INFRA[k]; if (!S) return { ok: false };
    const to = inf[k] + 1;
    if (inf.build) return { ok: false, msg: 'Já há uma obra em andamento. Uma por vez.' };
    if (to > S.max) return { ok: false, msg: 'Já está no máximo.' };
    const cost = infraCost(st, k); if (!cost) return { ok: false, msg: 'O estádio já está no limite de 80 mil lugares.' }; const c = st.clubs[st.coach.club];
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
    const big = mt && (mt.comp === 'LIB' || mt.comp === 'SUL') ? 1.3 : mt && (mt.comp === 'CDB' || (mt.tie && mt.comp !== 'EST')) ? 1.25 : mt && mt.comp === 'EST' ? 0.8 : 1;
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
      const pos = rng.pick(POSL); const ovr = Math.max(45, Math.min(74, Math.round(med - 15 + 1.5 * lvl + rng.int(-3, 3) + (course(st, 'base') ? 2 : 0))));
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
    return { open, used, pressure: inf.pressure, opts: VERBA.map(v => ({ ...v, amount: r10k(inf.ref * v.w), chance: Math.max(0.05, Math.min(0.95, 0.55 + (st.board.conf - 40) / 66 - v.off)) })) };
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

  // grandes momentos viram picos de venda na semana seguinte
  function lojaMoments(st, report, res, fx) {
    const me = st.coach.club;
    if (report.tie && report.tie.won) {
      const [comp, phRaw = ''] = String(report.tie.label || '').split(' · '); const ph = phRaw.replace(/ \((ida|volta)\)$/, '');
      const est = fx && fx.mt && fx.mt.comp === 'EST';
      if (/^final$/i.test(ph)) addBoost(st, 'titulo', `Título: ${comp}`, est ? 0.2 : 0.35, est ? 4 : 6);
      else addBoost(st, 'fase', `Classificação: ${comp}${ph ? ' (' + ph.toLowerCase() + ')' : ''}`, est ? 0.08 : 0.15, 3);
    }
    if (res === 'V' && fx && sameCity(st, me, fx.opp) && st.clubs[fx.opp].fan >= 0.5) addBoost(st, 'classico', `Vitória no clássico contra o ${st.clubs[fx.opp].name}`, 0.12, 2);
    const ws = st.stats.winStreak;
    if (res === 'V' && (ws === 3 || ws === 5 || ws === 8)) addBoost(st, 'seq', `${ws} vitórias seguidas`, 0.06 + 0.02 * (ws === 3 ? 0 : ws === 5 ? 1 : 2), 2);
  }
  // semana do clube do usuário: obra, manutenção, loja e peneira
  function infraWeek(st, report, res, fx, mid) {
    const me = st.coach.club; const c = st.clubs[me]; const inf = infra(st);
    if (mid) { lojaMoments(st, report, res, fx); return; }
    const maint = infraMaint(inf);
    if (maint) money(st, 'estrutura', -maint, 'Manutenção da estrutura');
    // loja: vende o que a torcida procura; o lucro entra direto no caixa
    const price = kitPrice(st, me); const sold = Math.round(lojaDemand(st, me, inf));
    const profit = r1k(sold * price * LOJA_MARGIN);
    inf.sold = sold; inf.salesWk = profit;
    if (profit) money(st, 'loja', profit, `Loja: ${sold.toLocaleString('pt-BR')} camisas vendidas`);
    // os momentos perdem força a cada semana
    inf.boosts = (inf.boosts || []).map(b => ({ ...b, w: b.w - 1 })).filter(b => b.w > 0);
    // clima da torcida: volta devagar ao normal; vitória anima, derrota esfria
    inf.hype = 1 + ((inf.hype || 1) - 1) * 0.93 + (res === 'V' ? 0.03 : res === 'D' ? -0.02 : 0) + (report.tie && !report.tie.won ? -0.05 : 0);
    inf.hype = Math.max(0.8, Math.min(2.2, inf.hype));
    lojaMoments(st, report, res, fx);
    // obra
    if (inf.build) {
      inf.build.left--;
      if (inf.build.left <= 0) {
        const { k, to } = inf.build; inf[k] = to; inf.build = null;
        if (k === 'estadio') c.cap = capAt(inf.cap0, to);
        pushNews(st, 'club', `Obra concluída: ${INFRA[k].name}, ${infraLabel(k, to)}.`); report.built = { k, to, name: INFRA[k].name };
      }
    }
    if (report.finance) Object.assign(report.finance, { loja: profit, maint: -maint });
    if (st.round === PENEIRA_WEEK) report.peneira = genProspects(st);
  }

  // virada de temporada da estrutura: garotos crescem, coleção antiga é liquidada
  function infraSeasonTurn(st, summary) {
    const rng = rngFor(st, 'baseturn', st.year);
    Object.entries(st.infra || {}).forEach(([id, inf]) => {
      const mine = id === st.coach.club;
      inf.prospects = inf.prospects.filter(p => {
        p.age++; p.ovr = Math.min(p.pot, p.ovr + rng.int(2, 5) + (inf.ct >= 4 ? 1 : 0));
        bumpAt(p, 3);
        if (p.age >= 20) { if (mine) pushNews(st, 'club', `${p.n} completa 20 anos e deixa a base sem subir.`); return false; }
        return true;
      });
      // nova temporada: lançamento da camisa e os momentos do ano que passou
      inf.hype = 1; inf.boosts = [{ k: 'kit', txt: 'Camisa nova da temporada', v: 0.15, w: 6, w0: 6 }];
      if (mine && summary) {
        const b = (k, txt, v) => inf.boosts.push({ k, txt, v, w: 6, w0: 6 });
        if (summary.champs && summary.champs.LIB === id) b('continental', 'Campeão da Libertadores', 0.35);
        else if (summary.champs && summary.champs.SUL === id) b('continental', 'Campeão da Sul-Americana', 0.25);
        if (summary.champion === id) b('campeao', `Campeão da ${summary.league}`, 0.3);
        else if (summary.champs && summary.champs.CDB === id) b('campeao', 'Campeão da Copa do Brasil', 0.3);
        if (summary.promo === 'up') b('acesso', 'Acesso conquistado', 0.25);
        if (summary.promo === 'down') b('queda', 'Rebaixamento esfriou a torcida', -0.1);
      }
      inf.pressure = 0; inf.verba = null;
    });
  }

  function endSeason(st) {
    st.seasonOver = true;
    const me = st.coach.club, myc = st.clubs[me], d = myc.div;
    const out = C.seasonOutcome(st.comp); st.lastOutcome = out;
    const lk = leagueKey(st); const tab = sortedTable(st, lk); const myRow = tab.find(r => r.id === me);
    const myPos = myRow.pos;
    const promo0 = (out.up[d] || []).includes(me) ? 'up' : null;
    // subir de divisão sempre conta como meta cumprida (vale para a Série C, que decide o acesso no quadrangular)
    const met = myPos <= st.board.target.pos || promo0 === 'up';
    const tvRef = myc.tvFull || myc.tv;
    const prize = Math.round(tvRef * Math.max(0, tab.length + 1 - myPos) * 0.22 * (d === 'D' ? 3 : 1) / 10000) * 10000;
    money(st, 'prize', prize, `Premiação: ${myPos}º lugar (${d === 'D' ? 'grupo da Série D' : C.DIV_NAME[d]})`);
    const reach = C.cupReach(st.comp, me);
    const cupPrize = st.cupEarned || 0;
    const estKey = C.estOf(st.comp, me); const estWon = estKey && out.est[estKey] === me;
    if (estWon) money(st, 'prize', Math.round(tvRef * 3 / 10000) * 10000, `Título: ${st.comp.est[estKey].name}`);
    const promo = (out.up[d] || []).includes(me) ? 'up' : (out.down[d] || []).includes(me) ? 'down' : null;
    const divChamp = out.champ[d] === me, cupChamp = out.champ.CDB === me;
    const contR = C.contReach(st.comp, me); const libChamp = out.champ.LIB === me, sulChamp = out.champ.SUL === me;
    st.contNext = contQualify(st, out);
    let titleBonus = 0;
    if (st.sponsor && st.sponsor.titleBonus && (divChamp || cupChamp || libChamp || sulChamp)) { titleBonus = st.sponsor.titleBonus; money(st, 'sponsor', titleBonus, `Bônus por título (${st.sponsor.brand.name})`); st.sponsor.earned += titleBonus; }
    let xp = Math.round(((met ? 150 : 40) + (divChamp ? (d === 'A' ? 300 : 120) : 0) + (cupChamp ? 250 : 0) + (libChamp ? 400 : sulChamp ? 200 : 0) + (promo === 'up' ? 200 : 0) + (estWon ? 80 : 0)) * xpMult(st));
    const promDone = checkPromises(st, { season: true, pos: myPos });
    if (d === 'A' && divChamp) unlockAch(st, 'champion');
    if (cupChamp) unlockAch(st, 'copa');
    if (libChamp) unlockAch(st, 'liberta');
    if (sulChamp) unlockAch(st, 'sula');
    if (promo === 'up') unlockAch(st, 'acesso');
    if (estWon) unlockAch(st, 'estadual');
    st.coach.xp += xp; st.coach.level = levelFromXp(st.coach.xp);
    st.board.conf = Math.max(20, Math.min(95, st.board.conf + (met ? 15 : -15) + (promo === 'up' ? 10 : promo === 'down' ? -10 : 0) + (libChamp ? 12 : sulChamp ? 6 : 0)));
    if (met) myc.wageCap = Math.round(myc.wageCap * 1.08 / 1000) * 1000;
    const pressure = !met && infra(st).pressure ? infra(st).pressure : 0; if (pressure) st.board.conf = Math.max(0, st.board.conf - pressure);
    let licPen = 0; const pv = st.coach.provisional; if (pv && pv.year === st.year && !hasLic(st, pv.need)) { licPen = 10; st.board.conf = Math.max(0, st.board.conf - 10); pushNews(st, 'club', `Sem a ${LIC[pv.need].name}, a CBF renova a licença provisória com multa e a diretoria se irrita (confiança −10).`); }
    const divIds = new Set(divClubs(st, d));
    const scorers = Object.values(st.players).filter(p => p.club && divIds.has(p.club)).sort((a, b) => b.g - a.g).slice(0, 3).map(p => ({ n: p.n, club: p.club, g: p.g }));
    const summary = { year: st.year, div: d, league: d === 'D' ? 'Série D' : C.DIV_NAME[d], pos: myPos, points: myRow.p, champion: out.champ[d] || null, champs: out.champ, met, target: st.board.target, prize, cupPrize, titleBonus, xp, scorers, promo, pressure, licPen, promises: promDone, cup: reach, cont: contR, contPrize: st.contEarned || 0, contNext: { L: st.contNext.L.includes(me), S: st.contNext.S.includes(me) }, est: estKey ? { name: st.comp.est[estKey].name, won: estWon, champ: out.est[estKey] || null } : null, up: out.up, down: out.down };
    st.history.push(summary);
    if (out.champ.A) pushNews(st, 'club', `${st.clubs[out.champ.A].name} é campeão brasileiro de ${st.year}.`);
    if (out.champ.CDB) pushNews(st, 'club', `${st.clubs[out.champ.CDB].name} é campeão da Copa do Brasil de ${st.year}.`);
    if (st.contNext.L.includes(me)) pushNews(st, 'club', `${myc.name} garante vaga na fase de grupos da Libertadores ${st.year + 1}.`);
    else if (st.contNext.S.includes(me)) pushNews(st, 'club', `${myc.name} garante vaga na fase de grupos da Sul-Americana ${st.year + 1}.`);
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
    if (st.infra && st.infra[id]) st.infra[id].ref = Math.round(st.infra[id].ref * Math.sqrt(k) / 1000) * 1000;
  }

  function nextSeason(st) {
    const out = st.lastOutcome || C.seasonOutcome(st.comp);
    // acesso e rebaixamento: 4 sobem e 4 descem entre cada série
    out.down.A.forEach(id => moveDiv(st, id, 'B')); out.up.B.forEach(id => moveDiv(st, id, 'A'));
    out.down.B.forEach(id => moveDiv(st, id, 'C')); out.up.C.forEach(id => moveDiv(st, id, 'B'));
    out.down.C.forEach(id => moveDiv(st, id, 'D')); out.up.D.forEach(id => moveDiv(st, id, 'C'));
    infraSeasonTurn(st, st.history[st.history.length - 1]);
    st.loanNews = endLoans(st);
    // contratos: um ano a menos; quem chega a zero renova (2 a 4 anos); no seu clube o salário acompanha a nota
    const rngC = rngFor(st, 'contracts', st.year);
    Object.values(st.players).forEach(p => { if (!p.club) return; p.contract = (p.contract || 2) - 1; if (p.contract <= 0) { p.contract = rngC.int(2, 4); if (p.club === st.coach.club) { const nw = Math.round(Math.max(p.wage, E.wageFor(p.ovr) * 0.9) / 1000) * 1000; if (nw > p.wage) pushNews(st, 'club', `${p.n} renova até ${st.year + p.contract} com salário de ${fmt(nw)} por semana.`); p.wage = nw; } } });
    const rng = rngFor(st, 'aging');
    st.year++;
    Object.values(st.players).forEach(p => {
      if (!p.club) return;
      p.age++;
      let d = 0;
      if (p.age <= 20) d = rng.int(1, 4); else if (p.age <= 23) d = rng.int(0, 2); else if (p.age <= 28) d = rng.int(-1, 1); else if (p.age <= 31) d = rng.int(-2, 0); else d = rng.int(-3, -1);
      const nv = Math.max(45, Math.min(p.age <= 23 ? Math.max(p.pot, p.ovr) : 95, p.ovr + d));
      bumpAt(p, nv - p.ovr);
      p.ovr = nv;
      p.cond = 100; p.inj = 0; p.sus = 0;
      if (p.age >= 36) { // aposenta e entra um garoto da base
        const club = st.clubs[p.club]; const np = E.genPlayer(rng, p.pos, club.base - 10 + rng.int(-2, 3), 17, club.id, st.nextId++);
        np.youth = true; st.players[np.id] = np; st.rosters[club.id] = st.rosters[club.id].map(id => id === p.id ? np.id : id); p.club = null;
        if (club.id === st.coach.club) pushNews(st, 'club', `${p.n} se aposenta. ${np.n}, 17 anos, sobe da base.`);
      }
    });
    st.market.neg = {}; st.market.offers = []; st.market.auction = null; st.market.feed = (st.market.feed || []).slice(0, 30);
    startSeason(st);
    st.lineup = { ...E.autoLineup(squadOf(st, st.coach.club), st.lineup.formation), ment: st.lineup.ment, takers: st.lineup.takers };
    const L = life(st); (L.raises || []).forEach(r => { const p = st.players[r.pid]; if (p && p.club === st.coach.club) p.wage += r.add; }); L.raises = [];
    if (st.coach.lic === 'PRO') st.board.conf = Math.min(100, st.board.conf + 5);
    checkLicense(st); L.presser = genPresser(st);
  }

  function restartAfterFire(st, newClub) {
    st.coach.club = newClub; st.fired = false; st.board.conf = 55; st.board.low = 0; st.morale = 55;
    splitSponsor(st, newClub); infra(st); st.sponsor = null; st.sponsorOffers = sponsorOffers(st);
    setTarget(st);
    st.lineup = { ...E.autoLineup(squadOf(st, newClub), '4-3-3'), ment: 'equilibrada' };
    genObjectives(st); pushNews(st, 'club', `${st.coach.name} assume o ${st.clubs[newClub].name}.`);
    if (st.coach.club && st.life) { checkLicense(st); st.life.promises = []; st.life.presser = null; st.life.event = null; }
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

  const api = { WEEKS, SEASON_WEEKS, isMid, CONT_PRIZE, USD, contGroups, WINDOWS, LEVELS, LEVEL_TITLES, UNLOCKS, ACH, TICKET, CUP_QUOTA, cupQuota, CAP_MAX, capAt, rngFor, hashSeed, levelFromXp, formationsFor, squadOf, wageBill, strength, windowOpen, windowInfo, strengthRanks, divClubs, targetFor, newCareer, startSeason, weekFixtures, userFixture, nextUserWeek, leagueKey, sortedTable, position, prepareUserMatch, suggestMent, sponsorOffers, signSponsor, sponsorPending, sponsorPerf, migrate, BRANDS, withB, finishRound, simWeek, askPrice, sellerAsk, disposition, interest, marketWage, buyTerms, signPlayer, loanTerms, loanIn, INTEREST_OK, mValue, prestige, loanFee, respondOffer, endLoans, aiMarketTick, marketList, wageRoom, makeOffer, acceptOffer, quickSell, auctionBid, auctionRivalTick, auctionClose, nextSeason, restartAfterFire, fireOffers, fmt, userSide, LIC, LIC_ORDER, COURSES, life, hasLic, licNeed, xpMult, studyOptions, startStudy, answerPresser, answerEvent, checkLicense, PRESETS, PRESET_COMP, compKind, savePreset, loadPreset, applyPresetFor, INFRA, PROSPECTS, TICKET_MULT, TICKET_NAME, BASE_MAX, PENEIRA_WEEK, SQUAD_MAX, infra, infraCost, infraStart, infraMaint, infraLabel, ctBonus, crowd, lojaInfo, idolOf, kitPrice, promoteProspect, releaseProspect, verbaInfo, askVerba };
  if (NODE) module.exports = api; else root.Game = api;
})(typeof window !== 'undefined' ? window : globalThis);
