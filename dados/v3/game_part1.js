/* Prancheta FC: regras da carreira (sem DOM). Depende de Engine e Comps. */
(function (root) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const E = NODE ? require('./engine.js') : root.Engine;
  const C = NODE ? require('./comps.js') : root.Comps;

  const WEEKS = C.WEEKS; // 58 semanas por temporada
  const WINDOWS = [[0, 13], [30, 37]]; // semanas (base 0) com janela aberta
  const LEVELS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
  const LEVEL_TITLES = ['Estagiário', 'Auxiliar', 'Interino', 'Efetivado', 'Professor', 'Estrategista', 'Comandante', 'Mestre', 'Lenda', 'Lenda', 'Lenda'];
  const UNLOCKS = { 2: ['5-3-2', 'Análise do rival'], 3: ['3-5-2'], 4: ['4-1-4-1'], 5: ['3-4-3'] };
  const TICKET = 45;
  // cota de TV relativa entre séries e chance de jogar em casa numa semana (calendário de 58 semanas)
  const DIV_TV = { A: 1, B: 0.45, C: 0.2, D: 0.08 };
  const HOME_SHARE = { A: 0.43, B: 0.40, C: 0.30, D: 0.17 };
  const CUP_PRIZE = [1, 1.5, 2, 3, 4, 6, 9, 14]; // semanas de cota de TV por fase alcançada na Copa do Brasil

  const ACH = {
    first_win: ['Primeira vitória', 'Vença uma partida'],
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

  function squadOf(st, clubId) { return st.rosters[clubId].map(id => st.players[id]); }
  function wageBill(st, clubId) { return squadOf(st, clubId).reduce((a, p) => a + p.wage, 0); }
  function strength(st, clubId) { return E.teamStrength(squadOf(st, clubId)); }
  function windowOpen(w) { return WINDOWS.some(([a, b]) => w >= a && w <= b); }
  function windowInfo(w) {
    for (const [a, b] of WINDOWS) { if (w >= a && w <= b) return { open: true, closesIn: b - w + 1 }; if (w < a) return { open: false, opensIn: a - w }; }
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
    st.nextId = id;
    // escala de "base" (economia, ingresso): a Série A vai de 68 a 79 pela força; as outras séries seguem a mesma régua
    const sOf = {}; Object.keys(st.clubs).forEach(cid => sOf[cid] = strength(st, cid));
    const aS = Object.keys(st.clubs).filter(cid => st.clubs[cid].div === 'A').map(cid => sOf[cid]);
    const sMin = Math.min(...aS), sMax = Math.max(...aS);
    Object.values(st.clubs).forEach(c => { c.base = Math.round(Math.max(40, Math.min(85, 68 + (sOf[c.id] - sMin) / Math.max(1, sMax - sMin) * 11))); setEconomy(st, c); });
    splitSponsor(st, clubId);
    startSeason(st);
    st.lineup = { ...E.autoLineup(squadOf(st, clubId), '4-3-3'), ment: 'equilibrada' };
    st.sponsor = null; st.sponsorOffers = sponsorOffers(st);
    pushNews(st, 'club', `${coachName} é o novo técnico do ${st.clubs[clubId].name}. Meta da diretoria: ${st.board.target.label.charAt(0).toLowerCase() + st.board.target.label.slice(1)}.`);
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
    const clubs = {}; Object.values(st.clubs).forEach(c => clubs[c.id] = { id: c.id, div: c.div, uf: c.uf });
    const sm = {}; Object.keys(st.clubs).forEach(id => sm[id] = strength(st, id));
    st.comp = C.buildSeason({ clubs, str: id => sm[id], rng });
    st.results = [];
    st.round = 0; st.seasonOver = false;
    setTarget(st);
    Object.values(st.players).forEach(p => { p.g = 0; p.a = 0; p.apps = 0; p.rsum = 0; p.yc = 0; });
    genObjectives(st);
  }
  function setTarget(st) {
    const me = st.coach.club, d = st.clubs[me].div; let rank;
    if (d === 'D') { const key = C.leagueKey(st.comp, me); rank = Object.keys(st.comp.tables[key]).sort((a, b) => strength(st, b) - strength(st, a)).indexOf(me) + 1; }
    else rank = strengthRanks(st, d).indexOf(me) + 1;
    st.board.target = { ...targetFor(rank, d), div: d }; st.board.rankStrength = rank; st.board.low = 0;
  }

