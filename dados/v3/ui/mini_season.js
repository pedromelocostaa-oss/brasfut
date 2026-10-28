  function miniTable() {
    const key = G.leagueKey(S); const t = G.sortedTable(S, key); if (!t.length) return '';
    const n = t.length; const myPos = (t.find(r => r.id === me()) || {}).pos || 1;
    const show = n <= 8 ? null : new Set([1, 2, 3, 4, myPos - 1, myPos, myPos + 1].filter(x => x >= 1 && x <= n));
    let prev = 0;
    const rows = t.filter(r => !show || show.has(r.pos)).map(r => { const gap = r.pos - prev > 1 ? `<tr><td colspan="4" class="muted" style="text-align:center;padding:2px">···</td></tr>` : ''; prev = r.pos; return gap + `<tr class="${r.id === me() ? 'me' : ''} ${zoneOf(key, r.pos, n)}"><td class="pos">${r.pos}</td><td><span class="cl">${badge(r.id, 'sm')}${esc(club(r.id).name)}</span></td><td>${r.j}</td><td class="pts">${r.p}</td></tr>`; }).join('');
    return `<section class="card"><div class="head"><h2>${esc(keyName(key))}${hint(TABELA_TIP)}</h2><button class="btn ghost" data-act="go" data-v="tabela" ${tipA('Abre as tabelas completas, o estadual e a Copa do Brasil.')}>Completa</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Clube</th><th>J</th><th>P</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function seasonCard() {
    const h = S.history[S.history.length - 1];
    if (!h) return '';
    const nextDiv = h.promo === 'up' ? { B: 'A', C: 'B', D: 'C' }[h.div] : h.promo === 'down' ? { A: 'B', B: 'C', C: 'D' }[h.div] : h.div;
    const champ = id => id ? `${badge(id, 'sm')} <span>${esc(club(id).name)}</span>` : '<span class="muted">–</span>';
    const cupTxt = h.cup ? (h.cup.champion ? '<b>Campeão!</b>' : `Parou na ${h.cup.name.toLowerCase()}`) : 'Não disputou';
    const estTxt = h.est ? (h.est.won ? `<b>Campeão ${esc(h.est.name)}!</b>` : `${esc(h.est.name)}: campeão ${h.est.champ ? esc(club(h.est.champ).name) : '–'}`) : '–';
    return `<section class="card stack reveal">
      <div class="eyebrow">Temporada ${h.year} encerrada</div>
      <div class="row">${badge(me(), 'lg')}<div><div class="disp" style="font-size:56px;font-weight:900;line-height:1">${h.pos}º</div><div class="muted">${h.div === 'D' ? 'no grupo da Série D' : 'na ' + esc(h.league)} · ${h.points} pontos</div></div></div>
      ${h.promo === 'up' ? `<div class="notice good"><b>Acesso!</b> Em ${h.year + 1} o ${esc(club(me()).name)} joga a ${DIVN[nextDiv]}.</div>` : h.promo === 'down' ? `<div class="notice bad"><b>Rebaixado.</b> Em ${h.year + 1} o ${esc(club(me()).name)} joga a ${DIVN[nextDiv]}.</div>` : ''}
      <div class="notice ${h.met ? 'good' : 'bad'}"><b>${h.met ? 'Meta cumprida' : 'Meta não cumprida'}:</b> ${esc(h.target.label)}.${h.met ? ' A diretoria aumentou o teto da folha em 8%.' : ''}</div>
      <div class="fin small"><span>Copa do Brasil</span><b>${cupTxt}</b><span>Estadual</span><b>${estTxt}</b></div>
      <div><div class="eyebrow">Campeões de ${h.year}</div><div class="champs">${[['Série A', h.champs.A], ['Série B', h.champs.B], ['Série C', h.champs.C], ['Série D', h.champs.D], ['Copa do Brasil', h.champs.CDB]].map(([l, id]) => `<div><span class="muted">${l}</span>${champ(id)}</div>`).join('')}</div></div>
      <div><div class="eyebrow">Artilheiros da ${esc(h.league)}</div><ol class="small" style="margin:6px 0 0;padding-left:20px">${h.scorers.map(s => `<li>${esc(s.n)} (${esc(club(s.club).name)}): ${s.g} gols</li>`).join('')}</ol></div>
      <div class="small">Premiação: <b>${fmt(h.prize + (h.cupPrize || 0))}</b>${h.titleBonus ? ` · Bônus de título do patrocinador: <b>${fmt(h.titleBonus)}</b>` : ''} · XP da temporada: <b>+${h.xp}</b></div>
      ${G.sponsorPending(S) ? '<div class="notice info small">O contrato de patrocínio terminou. As novas propostas aparecem na Central quando a temporada começar.</div>' : ''}
      <button class="btn primary big block" data-act="nextSeason" ${tipA('Aplica acessos e rebaixamentos, envelhece o elenco e começa um novo ano com estaduais, Copa do Brasil e Brasileirão.')}>Começar temporada ${h.year + 1}${nextDiv !== h.div ? ' na ' + DIVN[nextDiv] : ''}</button>
    </section>`;
  }

