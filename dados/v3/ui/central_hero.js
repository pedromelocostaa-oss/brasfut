      const fx = G.userFixture(S);
      if (fx) {
        const ms = G.strength(S, me()), os = G.strength(S, fx.opp);
        const leftIsMe = fx.mt.h === me(); const pct = Math.max(15, Math.min(85, 50 + (ms - os) * 4));
        const lvl = S.coach.level; const oc = club(fx.opp);
        const exp = E.aiMentality(os - ms, !fx.home);
        const scout = lvl >= 2 ? `<div class="scout"><b>Análise do rival:</b> ${oc.formation}, deve vir ${E.MENT[exp].label.toLowerCase()}.</div>` : `<div class="scout">Análise do rival libera no nível 2.</div>`;
        const issues = S.lineup.slots.map(id => S.players[id]).filter(p => !p || p.club !== me() || p.inj > 0 || p.sus > 0).length;
        const first = S.round === 0 && S.year === 2026 && !S.tipSeen;
        let tieInfo = '';
        if (fx.mt.tie && fx.mt.leg === 2) { const t = T.tieRef(S.comp, fx.mt.tie); if (t && t.g[0]) { const mine = t.a === me() ? t.g[0][0] : t.g[0][1], their = t.a === me() ? t.g[0][1] : t.g[0][0]; tieInfo = `<div class="scout"><b>Jogo de ida:</b> ${club(me()).name} ${mine} × ${their} ${club(fx.opp).name}. ${mine > their ? 'Empate classifica.' : mine < their ? `Precisa vencer por ${their - mine + 1} gols ou por ${their - mine} para levar aos pênaltis.` : 'Quem vencer passa; empate vai para os pênaltis.'}</div>`; } }
        else if (fx.mt.tie && (fx.mt.comp === 'CDB' || fx.mt.comp === 'EST')) tieInfo = `<div class="scout">Jogo único${fx.neutral ? ' em campo neutro' : ''}: empate vai para os pênaltis.</div>`;
        c1 += `<section class="hero" aria-label="Próximo jogo"><div class="inner">
          <div class="row between"><span class="eyebrow">${esc(fx.label)} · ${S.year}</span><span class="tag" style="background:rgba(0,0,0,.3);color:#fff">${fx.neutral ? 'Campo neutro' : fx.isHome ? 'Em casa' : 'Fora de casa'}</span></div>
          <div class="vs"><div class="t">${badge(fx.h, 'lg')}<b>${esc(club(fx.h).name)}</b></div><div class="x">×</div><div class="t">${badge(fx.a, 'lg')}<b>${esc(club(fx.a).name)}</b></div></div>
          <div><div class="eyebrow" style="margin-bottom:4px">Força dos titulares${hint(FORCA_TIP)}</div><div class="forca"><span>${Math.round(leftIsMe ? ms : os)}</span><span class="track"><i style="width:${leftIsMe ? pct : 100 - pct}%"></i><em style="flex:1"></em></span><span>${Math.round(leftIsMe ? os : ms)}</span></div></div>
          ${tieInfo}
          ${scout}
          ${postureLine()}
          ${tiredLine()}
          ${issues ? `<div class="scout"><b>${issues} ${plural(issues, 'titular fora', 'titulares fora')}</b> (lesão, suspensão ou venda): o auxiliar escala substituto se você não mexer.</div>` : ''}
          ${pend ? `<button class="btn gold big block" data-act="play" aria-disabled="true" style="opacity:.6" ${tipA('Assine uma das propostas de patrocínio acima para liberar o jogo.')}>Assine um patrocínio para jogar</button>` : `<div class="${first ? 'coachmark' : ''}">${first ? '<div class="tip">Seu time já está escalado. No intervalo, o jogo para e você escolhe a postura.</div>' : ''}<button class="btn gold big block" data-act="play" ${tipA('Começa a partida. O jogo para no intervalo, em gol sofrido, na reta final e em lesão para você decidir.')}>Jogar</button></div>`}
          <button class="btn block" style="background:rgba(0,0,0,.25);border-color:transparent;color:#fff" data-act="go" data-v="elenco" ${tipA('Abre o Elenco para mexer em formação, titulares, banco e postura.')}>Ajustar escalação</button>
        </div></section>`;
        c1 += `<section class="card"><div class="head"><h2>Objetivos do jogo${hint(OBJ_TIP)}</h2><span class="xp">+${S.objectives.length * 20} XP</span></div>
          ${S.objectives.map(o => `<div class="obj"><span class="box"></span><span class="t">${esc(o.txt)}</span><span class="xp">+${o.xp}</span></div>`).join('')}
          <p class="tiny muted" style="margin:8px 0 0">Cada objetivo cumprido também paga um bônus em dinheiro.</p></section>`;
      } else {
        const nx = G.nextUserWeek(S, S.round + 1);
        c1 += `<section class="hero" aria-label="Semana sem jogo"><div class="inner">
          <div class="row between"><span class="eyebrow">Semana ${S.round + 1} de ${G.WEEKS} · ${S.year}</span><span class="tag" style="background:rgba(0,0,0,.3);color:#fff">Sem jogo</span></div>
          <p style="margin:6px 0 0;font-size:17px">${esc(club(me()).name)} não joga nesta semana.</p>
          ${nx ? `<div class="scout"><b>Próximo jogo:</b> ${esc(nx.fx.label)}, ${nx.fx.neutral ? 'em campo neutro' : nx.fx.isHome ? 'em casa' : 'fora'}, contra o ${esc(club(nx.fx.opp).name)}, na semana ${nx.w + 1}.</div>` : `<div class="scout">Seu time não tem mais jogos nesta temporada. Os outros campeonatos seguem até a semana ${G.WEEKS}.</div>`}
          <button class="btn gold big block" data-act="skipWeek" ${pend ? 'aria-disabled="true" style="opacity:.6"' : ''} ${tipA('Joga a semana dos outros clubes. Salários, cota de TV e patrocínio entram normalmente.')}>Avançar uma semana</button>
          ${nx && nx.w > S.round + 1 ? `<button class="btn block" style="background:rgba(0,0,0,.25);border-color:transparent;color:#fff" data-act="skipTo" ${tipA('Simula todas as semanas até o próximo jogo do seu time.')}>Avançar até o próximo jogo (${nx.w - S.round} semanas)</button>` : ''}
          ${!nx ? `<button class="btn block" style="background:rgba(0,0,0,.25);border-color:transparent;color:#fff" data-act="skipTo" ${tipA('Simula as semanas restantes e mostra o fim da temporada.')}>Simular até o fim da temporada</button>` : ''}
        </div></section>`;
      }
    }
