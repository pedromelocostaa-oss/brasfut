const E = require('./engine.js');
function season(seed){
  const rng = E.makeRng(seed);
  const players = {}; const squads = {}; let id=1;
  const REAL=require("./rosters.js").REAL; E.CLUBS.forEach(c=>{ const s=REAL[c.id].map(r=>E.realPlayer(rng,r,c.id,id++)); s.forEach(p=>players[p.id]=p); squads[c.id]=s; });
  const fixtures = E.roundRobin(E.CLUBS.map(c=>c.id), rng);
  const table = {}; E.CLUBS.forEach(c=>table[c.id]={pts:0,gf:0,ga:0,w:0,d:0,l:0});
  let goals=0, games=0, hw=0, dr=0, shots=0;
  fixtures.forEach(round=>round.forEach(([h,a])=>{
    const sh=E.teamStrength(squads[h]), sa=E.teamStrength(squads[a]);
    const lh=E.autoLineup(squads[h],'4-3-3'), la=E.autoLineup(squads[a],'4-3-3');
    const mk=(club,lu,ment)=>({club, xi:E.lineupFrom(club,players,lu), bench:lu.bench.map(i=>players[i]), ment});
    const m=E.newMatch({home:mk(h,lh,E.aiMentality(sh-sa,true)), away:mk(a,la,E.aiMentality(sa-sh,false)), rng});
    E.playFull(m);
    const [gh,ga]=m.score; goals+=gh+ga; games++; shots+=m.side[0].shots+m.side[1].shots;
    if(gh>ga){hw++; table[h].pts+=3; table[h].w++; table[a].l++;} else if(gh===ga){dr++; table[h].pts++; table[a].pts++; table[h].d++; table[a].d++;} else {table[a].pts+=3; table[a].w++; table[h].l++;}
    table[h].gf+=gh; table[h].ga+=ga; table[a].gf+=ga; table[a].ga+=gh;
    // reset temp fields
    Object.values(players).forEach(p=>{delete p._g; delete p._a; delete p._yc; delete p._red; delete p._inj; delete p._hurt; delete p._off;});
  }));
  const ranked = Object.entries(table).sort((a,b)=>b[1].pts-a[1].pts);
  return {goals:goals/games, hw:hw/games, dr:dr/games, aw:1-(hw+dr)/games, shots:shots/games, ranked};
}
let agg={goals:0,hw:0,dr:0,aw:0,shots:0}; const champ={}; const top4={}; const rel={}; const pts=[]; const N=40;
for(let s=1;s<=N;s++){ const r=season(1000+s); ['goals','hw','dr','aw','shots'].forEach(k=>agg[k]+=r[k]/N);
  champ[r.ranked[0][0]]=(champ[r.ranked[0][0]]||0)+1; r.ranked.slice(0,4).forEach(([c])=>top4[c]=(top4[c]||0)+1); r.ranked.slice(16).forEach(([c])=>rel[c]=(rel[c]||0)+1);
  pts.push([r.ranked[0][1].pts, r.ranked[16][1].pts]); }
console.log('por jogo: gols %s | mandante %s empate %s visitante %s | finalizacoes %s', agg.goals.toFixed(2), (agg.hw*100).toFixed(1), (agg.dr*100).toFixed(1), (agg.aw*100).toFixed(1), agg.shots.toFixed(1));
console.log('campeoes em %d temporadas:', N, Object.entries(champ).sort((a,b)=>b[1]-a[1]).map(([c,n])=>c+':'+n).join(' '));
console.log('top4:', Object.entries(top4).sort((a,b)=>b[1]-a[1]).map(([c,n])=>c+':'+n).join(' '));
console.log('rebaixados:', Object.entries(rel).sort((a,b)=>b[1]-a[1]).map(([c,n])=>c+':'+n).join(' '));
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log('pontos do campeao (media) %s | pontos do 17o (media) %s', avg(pts.map(p=>p[0])).toFixed(1), avg(pts.map(p=>p[1])).toFixed(1));
