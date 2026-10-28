globalThis.REAL_ROSTERS = require('./rosters.js').REAL;
const E=require('./engine.js'), G=require('./game.js');
function run(clubId, seed){
  const st=G.newCareer(seed, clubId, 'Pedro Costa', 'motivador');
  const c=st.clubs[clubId];
  const cash0=c.cash, wb=G.wageBill(st,clubId);
  let rep, achs=new Set(), offers=0, evo=0;
  // tenta uma contratacao na rodada 1
  const target=G.marketList(st,{pos:'ST'}).find(p=>G.askPrice(st,p)<c.cash*0.5 && E.wageFor(p.ovr)<G.wageRoom(st) && p.ovr>G.strength(st,clubId));
  let buyLog='';
  if(target){ const ask=G.askPrice(st,target); let r=G.makeOffer(st,target.id,Math.round(ask*0.8/10000)*10000); buyLog+=r.status+' '; if(r.status==='counter'){ r=G.makeOffer(st,target.id,r.counter); buyLog+=r.status; } else if(r.status==='rejected'){ r=G.makeOffer(st,target.id,ask); buyLog+=r.status; } }
  while(!st.seasonOver && !st.fired){
    st.lineup={...E.autoLineup(G.squadOf(st,clubId),st.lineup.formation), ment:st.lineup.ment};
    const m=G.prepareUserMatch(st);
    m.startXI=m.side[m.userSide].xi.map(o=>o.p).filter(Boolean);
    while(!m.done){ E.aiInGame(m,1-m.userSide); E.step(m); }
    rep=G.finishRound(st,m);
    rep.achievements.forEach(a=>achs.add(a)); offers+=rep.offers||0; evo+=rep.evolutions.length;
  }
  return {clubId, pos:rep&&rep.season?rep.season.pos:G.position(st), target:st.board.target.pos, fired:st.fired, round:st.round, conf:st.board.conf, cash0, cash:c.cash, wb, xp:st.coach.xp, lvl:st.coach.level, achs:[...achs].join(','), evo, buyLog, champ: rep.season? st.clubs[rep.season.champion].id:''};
}
for(const [club,seed] of [['FLA',1],['SAN',2],['BAH',3],['REM',4],['CHA',5],['CRU',6]]){
  const r=run(club,seed);
  console.log(`${r.clubId}: pos ${r.pos} (meta ${r.target}) demitido=${r.fired} rodada ${r.round} conf ${r.conf} | caixa ${G.fmt(r.cash0)} -> ${G.fmt(r.cash)} (folha/rod ${G.fmt(r.wb)}) | XP ${r.xp} nivel ${r.lvl} | evolucoes ${r.evo} | compra: ${r.buyLog} | campeao ${r.champ}\n   conquistas: ${r.achs}`);
}
