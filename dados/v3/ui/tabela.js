  function vTabela() {
    const SC = S.comp; const myDiv = club(me()).div; const myKey = G.leagueKey(S);
    const tb = U.tb || (U.tb = { v: 'liga' });
    const estKey = T.estOf(SC, me());
    const tabs = [['liga', DIVN[myDiv]], ['est', 'Estadual'], ['cdb', 'Copa do Brasil'], ['outras', 'Outras séries']];
    let body = '';
    if (tb.v === 'liga') body = divView(myDiv, myDiv === 'D' ? (tb.g || myKey) : null);
    else if (tb.v === 'outras') {
      const d = tb.d && tb.d !== myDiv ? tb.d : ['A', 'B', 'C', 'D'].find(x => x !== myDiv);
      body = `<div class="chips">${['A', 'B', 'C', 'D'].filter(x => x !== myDiv).map(x => `<button class="chip" data-act="tbDiv" data-v="${x}" aria-pressed="${x === d}">${DIVN[x]}</button>`).join('')}</div>` + divView(d, d === 'D' ? (tb.g && tb.gd === 'D' ? tb.g : 'D1') : null);
    } else if (tb.v === 'est') {
      const key = tb.e && SC.est[tb.e] ? tb.e : estKey;
      const opts = Object.keys(SC.est).sort((a, b) => SC.est[a].name.localeCompare(SC.est[b].name)).map(k => `<option value="${k}" ${k === key ? 'selected' : ''}>${esc(SC.est[k].name)}</option>`).join('');
      const e = SC.est[key];
      body = `<section class="card row between" style="gap:10px"><span class="small muted">Estaduais com os clubes das quatro séries; estados com mais de 8 clubes têm uma segunda divisão.</span><label class="sr" for="est-sel">Escolher estadual</label><select id="est-sel" class="txt" data-change="estSel" style="max-width:260px">${opts}</select></section>`
        + tableCard(key, e.name)
        + (e.final ? tiesCard('Final', [e.final], { note: 'jogo único' }) : '')
        + gamesCard('Resultados da semana', (S.results || []).filter(g => g.key === key || (g.comp === 'EST' && SC.est[key].ids.includes(g.h))), true);
    } else body = cupView();
    return `<div class="stack" style="max-width:980px;margin:0 auto">
      <div class="seg wide" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="tbTab" data-v="${k}" aria-pressed="${tb.v === k}">${l}</button>`).join('')}</div>
      ${body}</div>`;
  }
  function divView(d, gkey) {
    const SC = S.comp; let out = '';
    const now = G.weekFixtures(S);
    if (d === 'A' || d === 'B') {
      out += tableCard(d, `${DIVN[d]} ${S.year}`);
      out += `<div class="grid g2">${gamesCard('Resultados da última semana', (S.results || []).filter(g => g.comp === d), true)}${gamesCard('Jogos desta semana', now.filter(g => g.comp === d), false)}</div>`;
    } else if (d === 'C') {
      if (SC.cf) out += tiesCard('Série C · final', [SC.cf], { note: 'ida e volta' });
      if (SC.cq) out += `<div class="grid g2">${tableCard('CQA')}${tableCard('CQB')}</div>`;
      out += tableCard('C', `Série C ${S.year} · 1ª fase`);
      out += `<div class="grid g2">${gamesCard('Resultados da última semana', (S.results || []).filter(g => g.comp === 'C'), true)}${gamesCard('Jogos desta semana', now.filter(g => g.comp === 'C'), false)}</div>`;
    } else {
      const key = gkey || 'D1';
      out += `<section class="card"><div class="head"><h2>Série D ${S.year}${hint('96 clubes em 16 grupos regionais de 6. Os 4 primeiros de cada grupo vão ao mata-mata de ida e volta; os 4 semifinalistas sobem para a Série C.')}</h2></div><div class="chips">${SC.dgroups.map(k => `<button class="chip" data-act="tbGroup" data-v="${k}" aria-pressed="${k === key}">Grupo ${k.slice(1)}</button>`).join('')}</div></section>`;
      out += tableCard(key);
      for (let i = SC.dko.length - 1; i >= 0; i--) out += tiesCard('Série D · ' + T.D_KO[i].name, SC.dko[i], { note: 'ida e volta' });
      out += gamesCard('Resultados da última semana', (S.results || []).filter(g => g.comp === 'D' && (g.key === key || !g.key)), true);
    }
    return out;
  }
  function cupView() {
    const SC = S.comp; let out = `<section class="card"><div class="head"><h2>Copa do Brasil ${S.year}${hint('Séries B, C e as 56 melhores da D começam na 1ª fase, em jogo único na casa do mais fraco. A Série A entra nos 16 avos. Dos 16 avos à semifinal é ida e volta; a final é jogo único em campo neutro. Empate no placar total vai para os pênaltis.')}</h2></div>`;
    const reach = T.cupReach(SC, me());
    out += `<p class="small" style="margin:0">${reach ? (reach.champion ? '<b>Seu time é campeão!</b>' : reach.out ? `Seu time parou na ${reach.name.toLowerCase()}.` : `Seu time está na ${reach.name.toLowerCase()}.`) : club(me()).div === 'A' ? 'Seu time entra nos 16 avos de final.' : 'Seu time não está nesta edição.'}</p></section>`;
    for (let i = SC.cup.length - 1; i >= 0; i--) if (SC.cup[i]) out += tiesCard(T.CUP[i].name, SC.cup[i], { note: T.CUP[i].legs === 2 ? 'ida e volta' : T.CUP[i].neutral ? 'jogo único, campo neutro' : 'jogo único' });
    return out;
  }

