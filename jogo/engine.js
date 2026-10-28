/* Prancheta FC: motor do jogo (puro, sem DOM). Roda no navegador e no Node para testes. */
(function (root) {
  'use strict';

  // ---------- aleatoriedade com semente (mulberry32) ----------
  function makeRng(seed) {
    let t = seed >>> 0;
    const r = function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.gauss = (m, s) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.weighted = (items, wfn) => { const ws = items.map(wfn); const tot = ws.reduce((a, b) => a + b, 0); let x = r() * tot; for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i]; } return items[items.length - 1]; };
    r.state = () => t;
    return r;
  }

  // ---------- clubes reais da Série A 2026 (forca base = placeholder ate a base de dados real) ----------
  const CLUBS = [
    ['FLA', 'Flamengo', 'Rio de Janeiro', '#C8102E', '#111111', 79, 0.98, 66000],
    ['PAL', 'Palmeiras', 'São Paulo', '#006437', '#FFFFFF', 79, 0.92, 43000],
    ['BOT', 'Botafogo', 'Rio de Janeiro', '#111111', '#FFFFFF', 76, 0.72, 44000],
    ['CRU', 'Cruzeiro', 'Belo Horizonte', '#1D4E9E', '#FFFFFF', 76, 0.85, 61000],
    ['CAM', 'Atlético-MG', 'Belo Horizonte', '#111111', '#FFFFFF', 75, 0.86, 46000],
    ['FLU', 'Fluminense', 'Rio de Janeiro', '#7A0026', '#00613C', 75, 0.74, 66000],
    ['SAO', 'São Paulo', 'São Paulo', '#E2001A', '#FFFFFF', 75, 0.88, 66000],
    ['INT', 'Internacional', 'Porto Alegre', '#D50000', '#FFFFFF', 74, 0.82, 50000],
    ['COR', 'Corinthians', 'São Paulo', '#FFFFFF', '#111111', 74, 0.95, 49000],
    ['BAH', 'Bahia', 'Salvador', '#0B4EA2', '#E30613', 74, 0.80, 48000],
    ['SAN', 'Santos', 'Santos', '#FFFFFF', '#111111', 74, 0.70, 16000],
    ['GRE', 'Grêmio', 'Porto Alegre', '#0D80BF', '#111111', 73, 0.80, 55000],
    ['VAS', 'Vasco da Gama', 'Rio de Janeiro', '#111111', '#FFFFFF', 73, 0.84, 21000],
    ['RBB', 'Bragantino', 'Bragança Paulista', '#FFFFFF', '#D0021B', 72, 0.40, 17000],
    ['CAP', 'Athletico Paranaense', 'Curitiba', '#C8102E', '#111111', 71, 0.66, 42000],
    ['MIR', 'Mirassol', 'Mirassol', '#F2C500', '#0B7A3B', 71, 0.38, 15000],
    ['VIT', 'Vitória', 'Salvador', '#D50000', '#111111', 70, 0.66, 35000],
    ['CFC', 'Coritiba', 'Curitiba', '#00593B', '#FFFFFF', 70, 0.60, 40000],
    ['CHA', 'Chapecoense', 'Chapecó', '#0B8A3E', '#FFFFFF', 68, 0.50, 20000],
    ['REM', 'Remo', 'Belém', '#0B1F4B', '#FFFFFF', 68, 0.72, 44000],
  ].map(([id, name, city, c1, c2, base, fan, cap]) => ({ id, name, city, c1, c2, base, fan, cap, div: 'A' }));
  // base de clubes das Séries A a D (clubs.js). Sem ela, fica a lista da Série A acima.
  const DB = (typeof root !== 'undefined' && root.CLUB_DB) || (typeof globalThis !== 'undefined' && globalThis.CLUB_DB) || (typeof module !== 'undefined' && module.exports ? (() => { try { return require('./clubs.js'); } catch (e) { return null; } })() : null);
  if (DB && DB.length) {
    const old = Object.fromEntries(CLUBS.map(c => [c.id, c]));
    CLUBS.length = 0;
    DB.forEach(([id, name, city, uf, div, c1, c2, cap, fan, stadium]) => CLUBS.push({ id, name, city, uf, div, c1, c2, cap, fan, stadium, base: old[id] ? old[id].base : 60 }));
  }
  // clubes estrangeiros das copas continentais (foreign.js): série "X", não jogam campeonatos brasileiros
  const FOREIGN = (typeof root !== 'undefined' && root.FOREIGN) || (typeof globalThis !== 'undefined' && globalThis.FOREIGN) || (typeof module !== 'undefined' && module.exports ? (() => { try { return require('./foreign.js'); } catch (e) { return null; } })() : null);
  const FCLUBS = FOREIGN ? FOREIGN.DB.map(([id, name, city, country, div, c1, c2, cap, fan, stadium, alt]) => ({ id, name, city, uf: country, country, div: 'X', c1, c2, cap, fan, stadium, alt: alt || 0, base: 60 })) : [];
  // ---------- atributos: cada família de posição tem 5; cada jogador tem os 2 em que é melhor ----------
  const FAM = { GK: 'GOL', CB: 'ZAG', RB: 'LAT', LB: 'LAT', DM: 'MEI', CM: 'MEI', AM: 'MEI', RW: 'ATA', LW: 'ATA', ST: 'ATA' };
  const FAM_NAME = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', MEI: 'Meio-campo', ATA: 'Atacante' };
  const POOL = { GOL: ['ref', 'sai', 'pen', 'pes', 'col'], ZAG: ['des', 'int', 'aer', 'sbo', 'blo'], LAT: ['cru', 'des', 'dri', 'pas', 'int'], MEI: ['pas', 'cri', 'des', 'dri', 'fin'], ATA: ['fin', 'cab', 'dri', 'cri', 'lon'] };
  const ATTR_NAME = { ref: 'Reflexo', sai: 'Saída do gol', pen: 'Pênaltis', pes: 'Jogo com os pés', col: 'Colocação', des: 'Desarme', int: 'Interceptação', aer: 'Jogo aéreo', sbo: 'Saída de bola', blo: 'Bloqueio', cru: 'Cruzamento', dri: 'Drible', pas: 'Passe', cri: 'Criação', fin: 'Finalização', cab: 'Cabeceio', lon: 'Chute de longe' };
  const ATTR_SHORT = { ref: 'REF', sai: 'SAÍ', pen: 'PEN', pes: 'PÉS', col: 'COL', des: 'DES', int: 'INT', aer: 'AÉR', sbo: 'SBO', blo: 'BLO', cru: 'CRU', dri: 'DRI', pas: 'PAS', cri: 'CRI', fin: 'FIN', cab: 'CAB', lon: 'LON' };
  // o que cada atributo faz na partida (texto da ficha e das dicas)
  const ATTR_TIP = {
    ref: 'Segura mais chutes de perto. Pesa na força do goleiro.',
    sai: 'Sai bem do gol em cruzamentos e bolas longas: reduz gols de cabeça do rival.',
    pen: 'Defende mais pênaltis.',
    pes: 'Joga com os pés na saída de bola: ajuda um pouco o meio-campo.',
    col: 'Bem posicionado: reduz gols de chute de fora da área.',
    des: 'Toma a bola no corpo a corpo: fortalece a defesa.',
    int: 'Lê o passe e corta antes: fortalece a defesa.',
    aer: 'Ganha as bolas pelo alto: reduz gols de cabeça do rival e marca em bola parada.',
    sbo: 'Sai jogando desde a defesa: fortalece o meio-campo.',
    blo: 'Se joga na frente dos chutes: reduz gols de fora da área do rival.',
    cru: 'Cruza bem: dá mais assistências para gols de cabeça.',
    dri: 'Passa pelo marcador: o time cria mais chances.',
    pas: 'Passe certo e jogo organizado: fortalece o meio-campo e dá assistências.',
    cri: 'Último passe e visão de jogo: mais assistências e mais chances criadas.',
    fin: 'Converte mais as chances dentro da área.',
    cab: 'Mais gols de cabeça.',
    lon: 'Mais gols de fora da área.',
  };
  // perfil típico por posição, usado quando não há estatística real do jogador
  const ARCH = {
    GK: { ref: 0.35, col: 0.25, sai: 0.2, pes: 0.15, pen: 0.05 },
    CB: { aer: 0.3, des: 0.25, int: 0.2, sbo: 0.15, blo: 0.1 },
    LB: { cru: 0.3, des: 0.2, dri: 0.2, pas: 0.15, int: 0.15 }, RB: { cru: 0.3, des: 0.2, dri: 0.2, pas: 0.15, int: 0.15 },
    DM: { des: 0.42, pas: 0.33, fin: 0.08, dri: 0.07, cri: 0.1 }, CM: { pas: 0.33, cri: 0.2, des: 0.2, dri: 0.15, fin: 0.12 }, AM: { cri: 0.35, pas: 0.22, dri: 0.22, fin: 0.16, des: 0.05 },
    ST: { fin: 0.38, cab: 0.25, dri: 0.13, cri: 0.09, lon: 0.15 }, LW: { dri: 0.38, cri: 0.24, fin: 0.2, lon: 0.13, cab: 0.05 }, RW: { dri: 0.38, cri: 0.24, fin: 0.2, lon: 0.13, cab: 0.05 },
  };
  // saves antigos: os 2 atributos fixos viram chaves do sistema novo
  const LEGACY = { GK: ['ref', 'sai'], CB: ['des', 'aer'], LB: ['des', 'int'], RB: ['des', 'int'], DM: ['pas', 'dri'], CM: ['pas', 'dri'], AM: ['pas', 'dri'], LW: ['dri', 'fin'], RW: ['dri', 'fin'], ST: ['dri', 'fin'] };
  function normAt(p) { if (Array.isArray(p.at)) { const k = LEGACY[p.pos] || ['pas', 'dri']; p.at = { [k[0]]: p.at[0], [k[1]]: p.at[1] }; p.atEst = true; } return p; }
  // valor de um atributo: o do jogador, ou abaixo da nota quando não é o forte dele
  function av(p, k) { const v = p.at && p.at[k]; return v != null ? v : p.ovr - (POOL[FAM[p.pos]] && POOL[FAM[p.pos]].includes(k) ? 6 : 14); }
  function atBonus(p, k) { const v = p && p.at && p.at[k]; return v != null ? v - p.ovr : 0; }

  // ---------- posicoes, setores e encaixe ----------
  const POS = ['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'ST', 'LW'];
  const POS_PT = { GK: 'GOL', RB: 'LD', CB: 'ZAG', LB: 'LE', DM: 'VOL', CM: 'MC', AM: 'MEI', RW: 'PD', ST: 'CA', LW: 'PE' };
  const POS_NAME = { GK: 'Goleiro', RB: 'Lateral-direito', CB: 'Zagueiro', LB: 'Lateral-esquerdo', DM: 'Volante', CM: 'Meio-campista', AM: 'Meia', RW: 'Ponta-direita', ST: 'Centroavante', LW: 'Ponta-esquerda' };
  const GROUP = { GK: 'G', RB: 'D', CB: 'D', LB: 'D', DM: 'M', CM: 'M', AM: 'M', RW: 'A', ST: 'A', LW: 'A' };
  // contribuicao (DEF, MEI, ATA)
  const W = { GK: [0, 0, 0], CB: [1, 0, 0], RB: [0.75, 0.15, 0.1], LB: [0.75, 0.15, 0.1], DM: [0.5, 0.5, 0], CM: [0.1, 0.8, 0.1], AM: [0, 0.5, 0.5], RW: [0, 0.25, 0.75], LW: [0, 0.25, 0.75], ST: [0, 0, 1] };
  const NEED = [4, 3, 3];

  // coordenadas no campo (x 0-100 da esquerda, y 0-100 do proprio gol ao ataque)
  const FORMATIONS = {
    '4-3-3': { lvl: 1, slots: [['GK', 50, 6], ['RB', 84, 26], ['CB', 62, 20], ['CB', 38, 20], ['LB', 16, 26], ['DM', 50, 40], ['CM', 70, 52], ['CM', 30, 52], ['RW', 82, 76], ['ST', 50, 84], ['LW', 18, 76]], txt: 'Pontas abertos e um centroavante. Ataque largo.' },
    '4-4-2': { lvl: 1, slots: [['GK', 50, 6], ['RB', 84, 26], ['CB', 62, 20], ['CB', 38, 20], ['LB', 16, 26], ['DM', 38, 44], ['CM', 62, 44], ['CM', 80, 58], ['AM', 20, 58], ['ST', 62, 82], ['ST', 38, 82]], txt: 'A clássica: duas linhas de quatro e dupla de ataque.' },
    '4-2-3-1': { lvl: 1, slots: [['GK', 50, 6], ['RB', 84, 26], ['CB', 62, 20], ['CB', 38, 20], ['LB', 16, 26], ['DM', 62, 40], ['DM', 38, 40], ['RW', 82, 66], ['AM', 50, 64], ['LW', 18, 66], ['ST', 50, 84]], txt: 'Dois volantes protegem a zaga; o meia comanda o ataque.' },
    '5-3-2': { lvl: 2, slots: [['GK', 50, 6], ['RB', 88, 32], ['CB', 68, 18], ['CB', 50, 16], ['CB', 32, 18], ['LB', 12, 32], ['DM', 50, 42], ['CM', 70, 54], ['CM', 30, 54], ['ST', 62, 82], ['ST', 38, 82]], txt: 'Cinco atrás e saída rápida. Feita para segurar resultado.' },
    '3-5-2': { lvl: 3, slots: [['GK', 50, 6], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20], ['RB', 88, 50], ['LB', 12, 50], ['DM', 50, 40], ['CM', 66, 56], ['AM', 34, 60], ['ST', 62, 82], ['ST', 38, 82]], txt: 'Alas sobem e o meio fica povoado. Arriscada pelos lados.' },
    '4-1-4-1': { lvl: 4, slots: [['GK', 50, 6], ['RB', 84, 26], ['CB', 62, 20], ['CB', 38, 20], ['LB', 16, 26], ['DM', 50, 38], ['RW', 84, 60], ['CM', 62, 56], ['CM', 38, 56], ['LW', 16, 60], ['ST', 50, 84]], txt: 'Meio compacto com um volante de cobertura. Controla a posse.' },
    '3-4-3': { lvl: 5, slots: [['GK', 50, 6], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20], ['RB', 86, 48], ['DM', 60, 44], ['CM', 40, 44], ['LB', 14, 48], ['RW', 80, 78], ['ST', 50, 86], ['LW', 20, 78]], txt: 'Três na frente e alas abertos. Pressiona, mas expõe a zaga.' },
  };

  function fitFactor(slot, natural) {
    if (slot === natural) return 1;
    if (GROUP[slot] === GROUP[natural]) return 0.92;
    if (GROUP[slot] === 'G' || GROUP[natural] === 'G') return 0.4;
    return 0.75;
  }

  // ---------- posturas (calibradas por simulacao: ver documento de design) ----------
  const MENT_KEYS = ['retranca', 'defensiva', 'equilibrada', 'ofensiva', 'pressao'];
  const MENT = {
    retranca: { label: 'Retranca', pace: 0.62, tilt: -0.08, expose: 0.92, counter: 1.12, tired: 1, cards: 1.25, cond: 0.9, txt: 'Todos atrás da linha da bola. Corta o ritmo do jogo: ideal para segurar resultado.' },
    defensiva: { label: 'Defensiva', pace: 0.84, tilt: -0.05, expose: 0.96, counter: 1.22, tired: 1, cards: 1.1, cond: 0.95, txt: 'Linhas baixas e saída rápida. Pune quem se expõe no contra-ataque.' },
    equilibrada: { label: 'Equilibrada', pace: 1, tilt: 0, expose: 1, counter: 1, tired: 1, cards: 1, cond: 1, txt: 'O jogo fica do tamanho dos elencos.' },
    ofensiva: { label: 'Ofensiva', pace: 1.10, tilt: 0.06, expose: 1.10, counter: 1, tired: 0.95, cards: 1, cond: 1.08, txt: 'Laterais sobem e o time vai para cima. Mais gols a favor e contra.' },
    pressao: { label: 'Pressão total', pace: 1.20, tilt: 0.11, expose: 1.20, counter: 1, tired: 0.85, cards: 1.45, cond: 1.3, txt: 'Marcação no campo todo. Abre retranca, mas cansa depois dos 65\' e expõe a defesa.' },
  };
  const SIEGE = { 'pressao|retranca': 0.07, 'pressao|defensiva': 0.02, 'ofensiva|retranca': 0.03 };
  const P = { baseChances: 9.6, possExp: 2.7, attExp: 2.05, baseXg: 0.112, home: 1.13, away: 0.90, coverPen: 0.35, lateAmp: 2.0, convAdj: 4, penRate: 0.13, fkRate: 0.45 };

  const PERSONAS = {
    motivador: { label: 'Motivador', txt: 'Levanta o time nos momentos difíceis.', match: 'Perdendo no 2º tempo, o time cria 10% mais chances.' },
    tatico: { label: 'Tático', txt: 'Estuda cada adversário.', match: 'Meio-campo rende 3% a mais.' },
    disciplinador: { label: 'Disciplinador', txt: 'Regras claras, cobrança firme.', match: '25% menos cartões e rival com 3% menos chances.' },
    revelador: { label: 'Revelador', txt: 'Aposta na base.', match: 'Jogadores de até 23 anos rendem +2 e evoluem mais rápido.' },
    carismatico: { label: 'Carismático', txt: 'Torcida na mão.', match: 'Mando de campo mais forte e 10% mais público.' },
  };

  // ---------- geracao de elencos (nomes gerados: elencos reais entram com a base de dados) ----------
  const FIRST = ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'João', 'Rafael', 'Gustavo', 'Felipe', 'Bruno', 'Thiago', 'Vitor', 'Caio', 'Diego', 'Rodrigo', 'Leonardo', 'Henrique', 'Arthur', 'Davi', 'Enzo', 'Igor', 'Kaique', 'Luan', 'Marcos', 'Nathan', 'Otávio', 'Renan', 'Samuel', 'Wesley', 'Yago', 'Alan', 'Breno', 'Cauã', 'Danilo', 'Erick', 'Fabrício', 'Hugo', 'Ítalo', 'Jean', 'Kauan', 'Lorran', 'Murilo', 'Nicolas', 'Paulo', 'Ruan', 'Talles', 'Vinícius', 'William', 'André', 'Eduardo', 'Raul'];
  const LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Martins', 'Rocha', 'Barbosa', 'Gomes', 'Teixeira', 'Moreira', 'Cardoso', 'Mendes', 'Freitas', 'Nunes', 'Moura', 'Batista', 'Pinto', 'Campos', 'Vieira', 'Monteiro', 'Duarte', 'Farias', 'Sales', 'Bezerra', 'Cunha', 'Dias', 'Ramos', 'Paiva', 'Lopes', 'Brito'];
  const NICK = ['Biel', 'Kaká', 'Juninho', 'Dudu', 'Guga', 'Pedrinho', 'Netinho', 'Tiquinho', 'Zé Rafael', 'Marquinhos', 'Luizão', 'Fabinho', 'Paulinho', 'Rony', 'Vitinho', 'Tchê', 'Gabigol', 'Léo', 'Nenê', 'Cacá', 'Tuca', 'Nandinho', 'Kiko', 'Lelê', 'Tavinho', 'Duda', 'Bruninho'];
  const SQUAD_TEMPLATE = [['GK', 3], ['CB', 4], ['RB', 2], ['LB', 2], ['DM', 2], ['CM', 3], ['AM', 2], ['RW', 2], ['LW', 2], ['ST', 3]];

  function wageFor(ovr) { return Math.round(6000 * Math.pow(1.17, ovr - 55) / 1000) * 1000; } // por rodada
  function valueFor(ovr, age, pos) {
    const am = age <= 20 ? 1.5 : age <= 23 ? 1.25 : age <= 27 ? 1 : age <= 30 ? 0.8 : age <= 33 ? 0.55 : 0.3;
    const pm = pos === 'GK' ? 0.82 : 1;
    const v = 15000 * Math.pow(1.24, ovr - 45) * am * pm;
    return Math.max(20000, Math.round(v / 10000) * 10000);
  }

  function genPlayer(rng, pos, ovr, age, clubId, id) {
    const name = rng() < 0.18 ? rng.pick(NICK) + (rng() < 0.5 ? '' : ' ' + rng.pick(LAST)) : rng.pick(FIRST) + ' ' + rng.pick(LAST);
    const pot = age <= 21 ? Math.min(92, ovr + rng.int(4, 16)) : ovr;
    return { id, n: name, pos, age, ovr: Math.round(ovr), pot: Math.round(pot), at: estAttrs(rng, pos, Math.round(ovr)), atEst: true, cond: 100, inj: 0, sus: 0, yc: 0, club: clubId, wage: wageFor(ovr), g: 0, a: 0, apps: 0, rsum: 0, listed: false, contract: rng.int(1, 4) };
  }

  // jogador real: [nome, posição, idade, nota, atributo 1, valor 1, atributo 2, valor 2, gols, assistências, jogos em 2026, fonte]
  // fonte 1 = atributos escolhidos por estatística real de 2026; 0 = estimados pelo jogo
  function realPlayer(rng, row, clubId, id) {
    let n, pos, age, ovr, at, g26, a26, j26, src;
    if (typeof row[4] === 'string') { let k1, v1, k2, v2; [n, pos, age, ovr, k1, v1, k2, v2, g26, a26, j26, src] = row; at = { [k1]: v1, [k2]: v2 }; }
    else { let a1, a2; [n, pos, age, ovr, a1, a2, g26, a26, j26] = row; at = a1 != null ? [a1, a2] : null; src = 0; }
    const pot = age <= 21 ? Math.min(92, ovr + rng.int(3, 10)) : ovr;
    const p = { id, n, pos, age, real: true, ovr, pot, at: at || estAttrs(rng, pos, ovr), atEst: !src, s26: j26 != null ? [j26, g26, a26] : null, cond: 100, inj: 0, sus: 0, yc: 0, club: clubId, wage: wageFor(ovr), g: 0, a: 0, apps: 0, rsum: 0, listed: false, contract: rng.int(1, 4) };
    return normAt(p);
  }
  // atributos estimados: sorteia 2 do perfil típico da posição; o primeiro fica um pouco acima do segundo
  function estAttrs(rng, pos, ovr) {
    const arch = ARCH[pos] || ARCH.CM; const keys = Object.keys(arch);
    const k1 = rng.weighted(keys, k => arch[k]); const k2 = rng.weighted(keys.filter(k => k !== k1), k => arch[k]);
    const c = v => Math.max(30, Math.min(95, Math.round(v)));
    return { [k1]: c(ovr + 3 + rng() * 4), [k2]: c(ovr + 1 + rng() * 3) };
  }

  function genSquad(rng, club, startId) {
    const out = []; let id = startId;
    SQUAD_TEMPLATE.forEach(([pos, n]) => {
      for (let i = 0; i < n; i++) {
        let ovr, age;
        if (i === 0) { ovr = rng.gauss(club.base + 2.5, 2.2); age = rng.int(23, 31); }
        else if (i === 1) { ovr = rng.gauss(club.base - 2.5, 2.5); age = rng.int(21, 33); }
        else { ovr = rng.gauss(club.base - 9, 3); age = rng.int(17, 21); }
        ovr = Math.max(48, Math.min(90, ovr));
        out.push(genPlayer(rng, pos, ovr, age, club.id, id++));
      }
    });
    return out;
  }

  // ---------- calendario (pontos corridos, turno e returno) ----------
  function roundRobin(ids, rng) {
    const teams = ids.slice(); for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]]; }
    const n = teams.length, rounds = [];
    let arr = teams.slice();
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        games.push(r % 2 === 0 ? (i === 0 ? [a, b] : [b, a]) : (i === 0 ? [b, a] : [a, b]));
      }
      rounds.push(games);
      arr = [arr[0], arr[n - 1]].concat(arr.slice(1, n - 1));
    }
    const second = rounds.map(g => g.map(([h, a]) => [a, h]));
    return rounds.concat(second);
  }

  // ---------- forca do time ----------
  function effRating(p, slot, ctx) {
    if (!p) return 30;
    const c = p.condLive != null ? p.condLive : p.cond;
    let r = p.ovr * (0.8 + 0.2 * c / 100) * fitFactor(slot, p.pos);
    if (ctx.persona === 'revelador' && p.age <= 23) r += 2;
    if (p.unhappy > 0) r -= 2; // insatisfeito rende menos
    if (ctx.morale != null) r += (ctx.morale - 50) / 25; // -2 a +2
    return r;
  }

  // quanto cada ponto de atributo acima da nota soma em cada setor [defesa, meio, ataque]
  const SECT = { des: [0.25, 0, 0], int: [0.25, 0, 0], aer: [0.18, 0, 0], blo: [0.18, 0, 0], sbo: [0, 0.2, 0], cru: [0, 0, 0.15], pas: [0, 0.25, 0], cri: [0, 0.1, 0.15], dri: [0, 0.05, 0.2], fin: [0, 0, 0.1], cab: [0, 0, 0.05], lon: [0, 0, 0.1], pes: [0, 0.03, 0] };
  const GKW = { ref: 0.3, col: 0.2, sai: 0.12, pes: 0.05, pen: 0 };
  function sectors(xi, ctx) {
    let gk = 40; const tot = [0, 0, 0], ws = [0, 0, 0]; let midX = 0;
    const sp = { aer: 0, blo: 0, sai: 0, col: 0, pen: 0 };
    xi.forEach(({ slot, p }) => {
      const e = effRating(p, slot, ctx);
      // atributos só contam no grupo de posição de origem (fora dele, vale só a nota)
      const own = p && p.at && GROUP[slot] === GROUP[p.pos];
      if (slot === 'GK') {
        gk = e; if (own) Object.keys(p.at).forEach(k => { const d = p.at[k] - p.ovr; gk += (GKW[k] || 0) * d; if (k === 'pes') midX += 0.03 * d; if (sp[k] != null) sp[k] = Math.max(sp[k], d); });
        return;
      }
      const adj = [0, 0, 0];
      if (own) Object.keys(p.at).forEach(k => { const d = p.at[k] - p.ovr; const w = SECT[k]; if (w) for (let i = 0; i < 3; i++) adj[i] += w[i] * d; if ((k === 'aer' || k === 'blo') && sp[k] != null) sp[k] = Math.max(sp[k], d); });
      for (let i = 0; i < 3; i++) { tot[i] += W[slot][i] * (e + adj[i]); ws[i] += W[slot][i]; }
    });
    const out = [0, 1, 2].map(i => {
      const avg = ws[i] ? tot[i] / ws[i] : 40; const c = ws[i] / NEED[i];
      const f = c < 1 ? 1 - P.coverPen * Math.pow(1 - c, 2) : 1 + 0.06 * Math.log(c);
      return avg * f;
    });
    out[1] += midX;
    if (ctx.persona === 'tatico') out[1] *= 1.03;
    return { gk, def: out[0], mid: out[1], att: out[2], sp };
  }

  // ---------- partida, minuto a minuto ----------
  function rates(m, minute) {
    const H = m.side[0], A = m.side[1];
    const sH = H.sec, sA = A.sec;
    const pe = P.possExp; const sh = Math.pow(sH.mid, pe) / (Math.pow(sH.mid, pe) + Math.pow(sA.mid, pe));
    const amp = minute > 65 ? P.lateAmp : 1; const dev = v => 1 + (v - 1) * amp;
    const mh = MENT[H.ment], ma = MENT[A.ment];
    const pace = Math.sqrt(dev(mh.pace) * dev(ma.pace));
    let t = (mh.tilt - ma.tilt + (SIEGE[H.ment + '|' + A.ment] || 0) - (SIEGE[A.ment + '|' + H.ment] || 0)) * amp;
    t = Math.max(-0.6, Math.min(0.6, t));
    // altitude: quem joga em casa acima de 2.500 m tem vantagem extra sobre quem vem de baixo
    const hf = m.neutral ? 1 : (H.persona === 'carismatico' ? P.home * 1.04 : P.home) * (H.alt || 1), af = m.neutral ? 1 : P.away;
    // pressão da torcida: estádio cheio empurra o mandante (neutro com 60% de ocupação)
    const crowdF = m.neutral || H.crowd == null ? 1 : 1 + 0.06 * (H.crowd - 0.6);
    let lh = (H.ana || 1) * P.baseChances * Math.sqrt(2 * sh) * Math.pow(sH.att / sA.def, P.attExp) * hf * crowdF * pace * (1 + t);
    let la = (A.ana || 1) * P.baseChances * Math.sqrt(2 * (1 - sh)) * Math.pow(sA.att / sH.def, P.attExp) * af * pace * (1 - t);
    let xh = P.baseXg * Math.pow(75 / sA.gk, 1) * ma.expose, xa = P.baseXg * Math.pow(75 / sH.gk, 1) * mh.expose;
    if (ma.expose > 1) xh *= mh.counter; if (mh.expose > 1) xa *= ma.counter;
    if (minute > 65) { lh *= mh.tired; la *= ma.tired; }
    // personalidades
    const diff = m.score[0] - m.score[1];
    if (H.persona === 'motivador' && minute > 45 && diff < 0) lh *= 1.10;
    if (A.persona === 'motivador' && minute > 45 && diff > 0) la *= 1.10;
    if (H.persona === 'disciplinador') la *= 0.97; if (A.persona === 'disciplinador') lh *= 0.97;
    // expulsoes
    lh *= Math.pow(0.85, H.reds) * Math.pow(1.08, A.reds); la *= Math.pow(0.85, A.reds) * Math.pow(1.08, H.reds);
    return { lh, la, xh, xa, sh };
  }

  function lineupFrom(club, players, lineup) {
    // lineup: { formation, slots:[pid], bench:[pid], corridor, ment }
    const f = FORMATIONS[lineup.formation];
    return f.slots.map(([slot], i) => ({ slot, p: players[lineup.slots[i]] || null, x: f.slots[i][1], y: f.slots[i][2] }));
  }

  function newMatch(opts) {
    // opts: { home:{club, xi, bench, ment, corridor, persona, morale, human}, away:{...}, rng, neutral }
    const mk = s => ({ club: s.club, crowd: s.crowd ?? null, alt: s.alt || 1, takers: s.takers || null, fit: s.fit || 1, ana: s.ana || 1, spBonus: s.spBonus || 0, xi: s.xi.map(o => ({ ...o })), bench: s.bench.slice(), ment: s.ment || 'equilibrada', persona: s.persona || null, morale: s.morale ?? 50, human: !!s.human, reds: 0, subs: 0, windows: 0, sec: null, shots: 0, xg: 0, onTarget: 0, poss: 0, cards: [], events: [], playedIds: new Set() });
    const m = { minute: 0, score: [0, 0], side: [mk(opts.home), mk(opts.away)], rng: opts.rng, neutral: !!opts.neutral, events: [], done: false, possAcc: 0, extra: [opts.rng.int(1, 3), opts.rng.int(2, 6)], half: 1 };
    m.side.forEach(s => { s.xi.forEach(o => { if (o.p) { s.playedIds.add(o.p.id); o.p.condLive = o.p.cond; } }); s.bench.forEach(p => { if (p) p.condLive = p.cond; }); recalc(m, s); });
    return m;
  }

  // capitão em campo dá liderança: +3 de moral efetiva no jogo
  // capitão em campo: liderança de até +3 de moral no jogo, conforme nota e experiência; cartões caem 8%
  function capBonus(p) { return p ? Math.max(0, Math.min(3, (TAKER.cap(p) - 74) / 4)) : 0; }
  function recalc(m, s) { const cap = takerOf(s, 'cap'); s.capBonus = cap ? capBonus(cap.p) : 0; s.capOn = s.capBonus > 0; s.sec = sectors(s.xi.filter(o => o.p), { persona: s.persona, morale: (s.morale ?? 50) + s.capBonus }); }

  const OUT_MISS = [['save', 0.45], ['wide', 0.33], ['post', 0.08], ['block', 0.14]];

  // tipo de finalização: chance comum, cabeçada ou chute de fora (prob., multiplicador de qualidade)
  const SHOT = { normal: [0.62, 1.12], cabeca: [0.2, 0.95], fora: [0.18, 0.6] };
  const SHOT_KEYS = Object.keys(SHOT);
  // atributo que pesa em cada tipo, por família (o melhor dos dois vale)
  function shotVal(p, type) {
    if (type === 'cabeca') return Math.max(av(p, 'cab'), av(p, 'aer'));
    if (type === 'fora') return Math.max(av(p, 'lon'), av(p, 'fin') - 3);
    return Math.max(av(p, 'fin'), av(p, 'dri') - 3);
  }
  function pickScorer(rng, s, type = 'normal') {
    const cands = s.xi.filter(o => o.p && o.slot !== 'GK');
    return rng.weighted(cands, o => {
      const p = o.p; const w = W[o.slot]; const zag = FAM[p.pos] === 'ZAG';
      const base = type === 'cabeca' ? w[2] * 2.2 + (zag ? 0.9 : 0) + w[1] * 0.4 + 0.1 : type === 'fora' ? w[2] * 1.6 + w[1] * 1.6 + 0.1 : w[2] * 3 + w[1] * 0.8 + 0.15;
      const own = GROUP[o.slot] === GROUP[p.pos];
      return base * Math.pow(p.ovr / 70, 3) * (own ? Math.exp(0.06 * (shotVal(p, type) - p.ovr)) : 0.75);
    });
  }
  function pickAssist(rng, s, scorer, type = 'normal') {
    const cands = s.xi.filter(o => o.p && o.slot !== 'GK' && o !== scorer);
    return rng.weighted(cands, o => {
      const p = o.p; const w = W[o.slot]; const own = GROUP[o.slot] === GROUP[p.pos];
      const v = type === 'cabeca' ? Math.max(av(p, 'cru'), av(p, 'cri') - 1, av(p, 'pas') - 3) : Math.max(av(p, 'cri'), av(p, 'pas') - 2, av(p, 'dri') - 3);
      const base = (w[1] * 2 + w[2] + 0.2) + (type === 'cabeca' && FAM[p.pos] === 'LAT' ? 0.8 : 0);
      return base * Math.pow(p.ovr / 70, 2) * (own ? Math.exp(0.06 * (v - p.ovr)) : 0.75);
    });
  }

  // ---------- bola parada e capitão ----------
  // valor de cobrança de cada jogador (goleiro não cobra)
  const TAKER = {
    pen: p => Math.max(av(p, 'fin'), av(p, 'lon') - 2),
    fk: p => Math.max(av(p, 'lon'), av(p, 'cri') - 3, av(p, 'pas') - 4),
    ck: p => Math.max(av(p, 'cru'), av(p, 'cri') - 2, av(p, 'pas') - 3),
    cap: p => p.ovr + Math.min(6, Math.max(0, p.age - 24)) * 0.8,
  };
  function bestTaker(players, kind) { let b = null, bv = -1; players.forEach(p => { if (!p || p.pos === 'GK' && kind !== 'cap') return; const v = TAKER[kind](p); if (v > bv) { bv = v; b = p; } }); return b; }
  // cobrador em campo: o escolhido, ou o melhor que estiver jogando
  function takerOf(s, kind) {
    const on = s.xi.filter(o => o.p && (kind === 'cap' || o.slot !== 'GK'));
    const want = s.takers && s.takers[kind]; const pref = want && on.find(o => o.p.id === want);
    if (pref) return pref;
    const b = bestTaker(on.map(o => o.p), kind); return b ? on.find(o => o.p === b) : null;
  }

  // avanca um minuto; devolve eventos do minuto
  function step(m) {
    if (m.done) return [];
    m.minute++;
    const rng = m.rng, minute = m.minute, ev = [];
    // cansaco dentro do jogo: quem esta em campo perde condicao a cada minuto
    m.side.forEach(s => { const k = 0.24 * MENT[s.ment].cond * (s.fit || 1); s.xi.forEach(o => { if (o.p) o.p.condLive = Math.max(1, o.p.condLive - k); }); if (minute % 5 === 0) recalc(m, s); });
    const r = rates(m, minute);
    m.possAcc += r.sh;
    const late = 1 + 0.25 * (minute > 75);
    [[0, r.lh, r.xh], [1, r.la, r.xa]].forEach(([si, lam, xg]) => {
      if (rng() < lam / 90 * late / 1.0625) {
        const s = m.side[si], o = m.side[1 - si];
        const type = rng.weighted(SHOT_KEYS, k => SHOT[k][0]);
        let q = xg * (0.35 + rng() * 1.3) * SHOT[type][1];
        const scorer = pickScorer(rng, s, type);
        // atributo do finalizador muda a chance de virar gol; a defesa e o goleiro rivais respondem
        const sp = scorer.p; const ownS = GROUP[scorer.slot] === GROUP[sp.pos];
        q *= Math.max(0.82, Math.min(1.25, 1 + 0.012 * ((ownS ? shotVal(sp, type) : sp.ovr - 10) - sp.ovr + P.convAdj)));
        const dsp = o.sec.sp || {};
        if (type === 'cabeca') q *= 1 - 0.015 * Math.max(0, dsp.aer || 0) - 0.01 * Math.max(0, dsp.sai || 0);
        // parte das cabeçadas nasce de escanteio: o cobrador muda a qualidade do cruzamento
        const ck = type === 'cabeca' && rng() < 0.4 ? takerOf(s, 'ck') : null;
        if (ck) q *= Math.max(0.85, Math.min(1.2, 1 + 0.012 * (TAKER.ck(ck.p) + (s.spBonus || 0) - 75)));
        if (type === 'fora') q *= 1 - 0.012 * Math.max(0, dsp.blo || 0) - 0.012 * Math.max(0, dsp.col || 0);
        s.shots++; s.xg += q;
        if (rng() < q) {
          m.score[si]++; s.onTarget++;
          const assist = ck && ck !== scorer ? ck : rng() < (type === 'fora' ? 0.45 : 0.75) ? pickAssist(rng, s, scorer, type) : null;
          let kind;
          const counter = type === 'normal' && MENT[s.ment].counter > 1 && MENT[o.ment].expose > 1 && rng() < 0.6;
          if (counter) kind = 'contra-ataque';
          else if (ck) kind = 'escanteio';
          else if (type === 'cabeca') kind = 'de cabeça';
          else if (type === 'fora') kind = 'chute de fora';
          else kind = rng.pick(['jogada trabalhada', 'jogada trabalhada', 'tabela', 'erro da defesa']);
          scorer.p._g = (scorer.p._g || 0) + 1; if (assist) assist.p._a = (assist.p._a || 0) + 1;
          ev.push({ t: 'goal', side: si, min: minute, p: scorer.p.id, pn: scorer.p.n, a: assist ? assist.p.id : null, an: assist ? assist.p.n : null, kind, type, xg: q, score: m.score.slice() });
        } else {
          const kind = rng.weighted(OUT_MISS, x => x[1])[0];
          if (kind === 'save') s.onTarget++;
          if (q > 0.16 || kind === 'post' || rng() < 0.35) ev.push({ t: 'chance', side: si, min: minute, p: scorer.p.id, pn: scorer.p.n, kind, xg: q, gk: o.xi[0].p ? o.xi[0].p.n : 'o goleiro' });
        }
      }
    });
    // bola parada: pênalti e falta direta
    m.side.forEach((s, si) => {
      const o = m.side[1 - si]; const gkO = o.xi.find(x => x.slot === 'GK' && x.p); const gk = gkO ? gkO.p : null;
      const push = Math.pow(Math.max(0.5, s.sec.att / Math.max(1, o.sec.def)), 1.5) * (minute > 65 ? 1.1 : 1) * Math.pow(0.85, s.reds) * (m.neutral ? 1 : si === 0 ? 1.1 : 0.9);
      if (rng() < P.penRate / 90 * push) {
        const tk = takerOf(s, 'pen'); if (!tk) return;
        const conv = Math.max(0.55, Math.min(0.9, 0.77 + 0.008 * (TAKER.pen(tk.p) + (s.spBonus || 0) - 82) - 0.015 * Math.max(0, atBonus(gk, 'pen'))));
        s.shots++; s.xg += conv; s.onTarget++;
        if (rng() < conv) { m.score[si]++; tk.p._g = (tk.p._g || 0) + 1; ev.push({ t: 'goal', side: si, min: minute, p: tk.p.id, pn: tk.p.n, a: null, an: null, kind: 'pênalti', type: 'pen', xg: conv, score: m.score.slice() }); }
        else { const saved = rng() < 0.7; if (!saved) s.onTarget--; tk.p._pmiss = 1; if (saved && gk) gk._psv = (gk._psv || 0) + 1; ev.push({ t: 'penmiss', side: si, min: minute, p: tk.p.id, pn: tk.p.n, saved, gk: gk ? gk.n : 'o goleiro', gkid: gk ? gk.id : null }); }
      } else if (rng() < P.fkRate / 90 * push) {
        const tk = takerOf(s, 'fk'); if (!tk) return;
        const q = 0.07 * Math.max(0.5, Math.min(1.8, 1 + 0.03 * (TAKER.fk(tk.p) + (s.spBonus || 0) - 75))) * (1 - 0.012 * Math.max(0, (o.sec.sp || {}).col || 0));
        s.shots++; s.xg += q;
        if (rng() < q) { m.score[si]++; s.onTarget++; tk.p._g = (tk.p._g || 0) + 1; ev.push({ t: 'goal', side: si, min: minute, p: tk.p.id, pn: tk.p.n, a: null, an: null, kind: 'falta direta', type: 'fk', xg: q, score: m.score.slice() }); }
        else if (rng() < 0.5) ev.push({ t: 'chance', side: si, min: minute, p: tk.p.id, pn: tk.p.n, kind: rng() < 0.55 ? 'save' : 'wide', xg: q, gk: gk ? gk.n : 'o goleiro', fk: true });
      }
    });
    // cartoes
    m.side.forEach((s, si) => {
      let rate = 2.1 / 90 * MENT[s.ment].cards * (s.persona === 'disciplinador' ? 0.75 : 1) * (s.capOn ? 0.92 : 1);
      if (rng() < rate) {
        const o = rng.weighted(s.xi.filter(x => x.p && x.slot !== 'GK'), x => W[x.slot][0] + 0.4 * W[x.slot][1] + 0.2);
        o.p._yc = (o.p._yc || 0) + 1;
        if (o.p._yc >= 2 || rng() < 0.04) {
          s.reds++; ev.push({ t: 'red', side: si, min: minute, p: o.p.id, pn: o.p.n });
          o.p._red = true; o.p = null; recalc(m, s);
        } else ev.push({ t: 'yellow', side: si, min: minute, p: o.p.id, pn: o.p.n });
      }
      // lesao
      if (rng() < 0.10 / 90) {
        const o = rng.pick(s.xi.filter(x => x.p));
        o.p._inj = rng.int(1, 4);
        ev.push({ t: 'injury', side: si, min: minute, p: o.p.id, pn: o.p.n, rounds: o.p._inj });
        if (!s.human) autoSubInjured(m, s, o); else o.p._hurt = true;
      }
    });
    if (minute === 45) { ev.push({ t: 'ht', min: 45, score: m.score.slice() }); m.half = 2; }
    if (minute >= 90) { m.done = true; ev.push({ t: 'ft', min: 90, score: m.score.slice() }); }
    ev.forEach(e => m.events.push(e));
    return ev;
  }

  function autoSubInjured(m, s, slotObj) {
    const idx = s.bench.findIndex(p => p && !p._red && GROUP[p.pos] === GROUP[slotObj.slot]) >= 0 ? s.bench.findIndex(p => p && GROUP[p.pos] === GROUP[slotObj.slot]) : s.bench.findIndex(p => p);
    if (idx >= 0 && s.subs < 5) { const inP = s.bench[idx]; s.bench.splice(idx, 1); slotObj.p = inP; s.subs++; s.playedIds.add(inP.id); }
    recalc(m, s);
  }

  function substitute(m, si, slotIndex, benchIndex) {
    const s = m.side[si]; if (s.subs >= 5) return false;
    const o = s.xi[slotIndex]; const inP = s.bench[benchIndex]; if (!o || !inP) return false;
    const outP = o.p; o.p = inP; s.bench.splice(benchIndex, 1); if (outP) s.bench.push(Object.assign(outP, { _off: true }));
    s.subs++; s.playedIds.add(inP.id); recalc(m, s); return true;
  }

  // IA: postura e trocas
  function aiMentality(strengthDiff, isHome) {
    // strengthDiff = minha forca - rival
    if (strengthDiff >= 4) return 'ofensiva';
    if (strengthDiff <= -5) return isHome ? 'equilibrada' : 'defensiva';
    if (strengthDiff <= -2) return isHome ? 'equilibrada' : 'defensiva';
    return 'equilibrada';
  }
  function aiInGame(m, si) {
    const s = m.side[si]; if (s.human) return;
    const diff = m.score[si] - m.score[1 - si];
    if (m.minute === 60 || m.minute === 75) {
      if (diff < 0) s.ment = diff <= -2 && m.minute >= 75 ? 'equilibrada' : 'pressao';
      else if (diff === 1 && m.minute >= 75) s.ment = 'retranca';
      else if (diff === 1) s.ment = 'defensiva';
      // troca o mais cansado
      if (s.subs < 5) {
        const tired = s.xi.map((o, i) => [o, i]).filter(([o]) => o.p && o.slot !== 'GK').sort((a, b) => a[0].p.cond - b[0].p.cond)[0];
        if (tired) { const bi = s.bench.findIndex(p => p && GROUP[p.pos] === GROUP[tired[0].slot] && !p._off); if (bi >= 0) substitute(m, si, tired[1], bi); }
      }
    }
  }

  // Auxiliar do tecnico humano: so troca por cansaco ou lesao, nunca mexe na postura.
  function assistInGame(m, si) {
    const s = m.side[si]; if (!s.human || s.assist === false || s.subs >= 5) return [];
    const evs = [];
    const doSub = (i, why) => {
      const o = s.xi[i]; const grp = GROUP[o.slot];
      let bi = s.bench.findIndex(p => p && !p._off && GROUP[p.pos] === grp);
      if (bi < 0 && o.p && o.p._hurt) bi = s.bench.findIndex(p => p && !p._off && GROUP[p.pos] !== 'G');
      if (bi < 0) return;
      const out = o.p, inn = s.bench[bi];
      if (substitute(m, si, i, bi)) { s.autoSubs = (s.autoSubs || 0) + 1; if (out) delete out._hurt; evs.push({ t: 'sub', side: si, min: m.minute, out: out ? out.n : '', in: inn.n, auto: why }); }
    };
    s.xi.forEach((o, i) => { if (o.p && o.p._hurt && s.subs < 5) doSub(i, 'lesão'); });
    if ((m.minute === 62 || m.minute === 74 || m.minute === 82) && (s.autoSubs || 0) < 3 && m.minute - (s.lastManual || -99) > 8) {
      const t = s.xi.map((o, i) => [o, i]).filter(([o]) => o.p && o.slot !== 'GK' && o.p.condLive < 70).sort((a, b) => a[0].p.condLive - b[0].p.condLive)[0];
      if (t) doSub(t[1], 'cansaço');
    }
    return evs;
  }

  function playFull(m) { while (!m.done) { aiInGame(m, 0); aiInGame(m, 1); step(m); } return m; }

  // ---------- escalacao automatica ----------
  function autoLineup(squad, formation) {
    const f = FORMATIONS[formation]; const used = new Set(); const slots = [];
    const avail = squad.filter(p => p.inj <= 0 && p.sus <= 0);
    // preencher os slots mais "exigentes" primeiro
    const order = f.slots.map((s, i) => i).sort((a, b) => (f.slots[a][0] === 'GK' ? -1 : 0) - (f.slots[b][0] === 'GK' ? -1 : 0));
    order.forEach(i => {
      const slot = f.slots[i][0];
      let best = null, bv = -1;
      avail.forEach(p => { if (used.has(p.id)) return; const v = effRating(p, slot, {}); if (v > bv) { bv = v; best = p; } });
      slots[i] = best ? best.id : null; if (best) used.add(best.id);
    });
    const bench = avail.filter(p => !used.has(p.id)).sort((a, b) => b.ovr * (0.8 + 0.2 * b.cond / 100) - a.ovr * (0.8 + 0.2 * a.cond / 100));
    // banco: 1 goleiro + 8 melhores de linha
    const gk = bench.find(p => p.pos === 'GK'); const rest = bench.filter(p => p !== gk).slice(0, 8);
    return { formation, slots, bench: (gk ? [gk.id] : []).concat(rest.map(p => p.id)) };
  }

  function teamStrength(squad) {
    const top = squad.filter(p => p.inj <= 0).map(p => p.ovr).sort((a, b) => b - a).slice(0, 11);
    return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
  }

  // nota do jogador na partida (4.0 a 10.0)
  function matchRating(rng, p, slot, side, m, si) {
    const gf = m.score[si], ga = m.score[1 - si];
    let r = 6.2 + (gf > ga ? 0.45 : gf < ga ? -0.4 : 0) + (p._g || 0) * 1.0 + (p._a || 0) * 0.6;
    if (GROUP[slot] === 'D' || slot === 'GK') r += ga === 0 ? 0.6 : -0.25 * Math.max(0, ga - 1);
    r += (rng() - 0.5) * 1.1 + (p.ovr - 72) * 0.03;
    if (p._red) r -= 1.5;
    if (p._psv) r += 0.8 * p._psv; if (p._pmiss) r -= 0.5;
    return Math.max(4, Math.min(10, Math.round(r * 10) / 10));
  }

  const api = { FCLUBS, FOREIGN, makeRng, assistInGame, realPlayer, estAttrs, normAt, av, atBonus, FAM, FAM_NAME, POOL, ATTR_NAME, ATTR_SHORT, ATTR_TIP, ARCH, SHOT, TAKER, bestTaker, takerOf, capBonus, CLUBS, POS, POS_PT, POS_NAME, GROUP, W, FORMATIONS, MENT, MENT_KEYS, PERSONAS, P, fitFactor, wageFor, valueFor, genPlayer, genSquad, roundRobin, effRating, sectors, rates, lineupFrom, newMatch, step, substitute, aiMentality, aiInGame, playFull, autoLineup, teamStrength, matchRating, recalc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);

