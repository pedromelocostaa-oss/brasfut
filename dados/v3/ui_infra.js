  // ---------- estrutura do clube: CT, base, estádio e loja ----------
  const dec = (v, n = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
  const INFRA_TIP = {
    ct: 'Centro de Treinamento. Cada nível acima do 1 recupera mais condição por semana, aumenta a chance de evolução dos jovens e encurta lesões. Tem manutenção semanal.',
    base: `Categorias de base. Em cada peneira (início da temporada e semana ${G.PENEIRA_WEEK + 1}) chegam garotos de 16 e 17 anos. Nível maior traz mais garotos, nota inicial maior e potencial mais preciso.`,
    estadio: 'Estádio. O preço do ingresso muda o público e a renda. Casa cheia empurra o time. Ampliação soma lugares e só rende se o estádio costuma lotar.',
    loja: 'Loja oficial. Vende camisas toda semana conforme a torcida, a fase do time e a animação com a camisa. Sem estoque, a venda se perde.',
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
    const list = inf.prospects.map(p => `<div class="prow" style="cursor:default">${ovr(p.ovr)}<span class="who"><b>${esc(p.n)}</b><span>${posLbl(p.pos)} · ${p.age} anos · potencial <b>${p.potLo}${p.potHi > p.potLo ? '–' + p.potHi : ''}</b> ${attrMini(p)}</span></span><span class="row nowrap" style="gap:4px">${U.relConfirm === p.id ? `<button class="btn danger" data-act="release" data-pid="${p.id}">Confirmar</button><button class="btn ghost" data-act="relCancel">Voltar</button>` : `<button class="btn primary" data-act="promote" data-pid="${p.id}" ${tipA('Leva o garoto para o elenco profissional com salário de formação (60% do normal). Ele passa a jogar e pode evoluir em campo.')}>Subir</button><button class="btn ghost" data-act="relAsk" data-pid="${p.id}" ${tipA('Libera a vaga na base. Não tem volta.')}>Dispensar</button>`}</span></div>`).join('');
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
    const hy = Math.round((inf.hype - 1) * 100);
    const lots = li.lots.map(o => `<button class="btn" data-act="buyStock" data-v="${o.weeks}" ${tipA(`Encomenda ${o.n.toLocaleString('pt-BR')} camisas, cerca de ${o.weeks} semanas de venda${o.disc ? `, com ${o.disc}% de desconto` : ''}. Paga agora.`)}><span><b>${o.weeks} sem.</b> · ${fmt(o.cost)}${o.disc ? ` <span class="tag good">−${o.disc}%</span>` : ''}</span></button>`).join('');
    return infraCard('loja',
      `<span>Camisa${hint('Preço de venda e custo de cada camisa. O lucro é a diferença.')}</span><b class="num">R$ ${li.price} <span class="muted">· custo R$ ${Math.round(li.unit)}</span></b>`
      + `<span>Procura${hint('Camisas que a torcida compraria por semana agora. Sobe com vitórias, títulos e camisa nova; cai com derrotas.')}</span><b class="num">${li.demand.toLocaleString('pt-BR')}/sem. ${hy ? `<span class="${hy > 0 ? 'pos-c' : 'neg-c'}">${hy > 0 ? '+' : ''}${hy}%</span>` : ''}</b>`
      + `<span>Estoque</span><b class="num ${li.weeksLeft < 1 ? 'neg-c' : ''}">${inf.stock.toLocaleString('pt-BR')} ${li.demand ? `(≈ ${li.weeksLeft >= 20 ? '20+' : dec(li.weeksLeft)} sem.)` : ''}</b>`
      + `<span>Última semana</span><b class="num">${inf.sold.toLocaleString('pt-BR')} vendidas · ${fmt(inf.salesWk)}</b>`
      + (inf.missed > 0 ? `<span class="neg-c">Vendas perdidas</span><b class="num neg-c">${inf.missed.toLocaleString('pt-BR')} sem estoque</b>` : '')
      + `<span>Pontos de venda${hint('Cada nível aumenta a procura em 35% do nível 1.')}</span>${cmp('×' + dec(1 + 0.35 * (l - 1), 2), to && '×' + dec(1 + 0.35 * (to - 1), 2))}`
      + `<span>Manutenção</span>${cmp(fmt(maintOf('loja', l)) + '/sem.', to && fmt(maintOf('loja', to)) + '/sem.')}`,
      `<div class="eyebrow" style="margin-top:14px">Encomendar camisas${hint('Lotes maiores saem mais baratos. Sobra de estoque no fim da temporada é liquidada por 60% do custo.')}</div>
       <div class="lots">${lots}</div>
       <label class="toggle" style="margin-top:12px"><input type="checkbox" data-act="lojaAuto" ${inf.auto ? 'checked' : ''}><span><b>Reposição automática</b><span class="small muted">Quando o estoque baixa de 1,5 semana, o gerente encomenda 4 semanas pagando 8% a mais por camisa.</span></span></label>`);
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
    const low = !inf.auto && li.weeksLeft < 1.5;
    const lines = [];
    if (inf.build) lines.push(buildBar(null)); else lines.push(`<p class="small muted" style="margin:0">Nenhuma obra em andamento.</p>`);
    if (np) lines.push(`<div class="row between small" style="margin-top:8px"><span><b>${np} ${plural(np, 'garoto', 'garotos')}</b> na base</span><button class="btn ghost" data-act="goInfra" data-v="inf-base">Ver base</button></div>`);
    if (low) lines.push(`<div class="notice warn small row between" style="margin-top:8px"><span><b>Loja:</b> estoque para ${dec(li.weeksLeft)} semana.</span><button class="btn" data-act="goInfra" data-v="inf-loja">Encomendar</button></div>`);
    return `<section class="card"><div class="head"><h2>Estrutura${hint('Obras, base e loja do clube. Tudo fica em Clube > Estrutura.')}</h2><button class="btn ghost" data-act="goInfra" ${tipA('Abre CT, base, estádio e loja.')}>Abrir</button></div>${lines.join('')}</section>`;
  }
  function sheetVerba() {
    const vi = G.verbaInfo(S); const r = U.sheet.res;
    const opts = vi.opts.map(o => `<div class="verba"><div class="row between"><b>${o.name} · ${fmt(o.amount)}</b><span class="tag ${o.chance >= 0.7 ? 'good' : o.chance >= 0.4 ? 'gold' : 'bad'}">${Math.round(o.chance * 100)}% de chance</span></div>
      <p class="small muted" style="margin:4px 0 8px">${o.press ? `Se aprovar e você não cumprir a meta, a confiança cai mais ${o.press} no fim da temporada.` : 'Sem cobrança extra no fim da temporada.'} Se a diretoria negar, a confiança cai ${o.fail}.</p>
      <button class="btn ${o.chance >= 0.5 ? 'primary' : ''} block" data-act="askVerba" data-k="${o.k}" ${!vi.open || vi.used ? 'disabled' : ''}>Pedir verba ${o.name.toLowerCase()}</button></div>`).join('');
    return `<div class="row between" style="margin-bottom:12px"><h2 class="disp" style="font-size:28px;text-transform:uppercase;line-height:1">Verba da diretoria</h2><button class="btn" data-act="closeSheet">Fechar</button></div>
      ${r ? `<div class="notice ${r.approved ? 'good' : 'bad'}" style="margin-bottom:12px">${r.approved ? `<b>Aprovado!</b> ${fmt(r.amount)} entraram no caixa.${r.press ? ` A cobrança da meta aumentou (${r.press} de confiança em jogo).` : ''}` : `<b>Negado.</b> A confiança caiu ${r.fail}.`}</div>` : ''}
      <p class="small" style="margin:0 0 12px">Um pedido por janela de transferências. A chance depende da confiança da diretoria, hoje em <b>${Math.round(S.board.conf)}</b>.${!vi.open ? ' <b>A janela está fechada.</b>' : vi.used && !r ? ' <b>Você já pediu nesta janela.</b>' : ''}${vi.pressure ? ` Cobrança extra acumulada: ${vi.pressure}.` : ''}</p>
      <div class="stack" style="gap:12px">${opts}</div>`;
  }

