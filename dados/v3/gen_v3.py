# Gera clubs.js e rosters.js (Series A a D 2026) a partir dos dados coletados no Transfermarkt e na Wikipedia.
import json, math, hashlib, re, sys
from statistics import median
clubs = json.load(open('clubs_final.json'))
bytm = {c['tm']: c for c in clubs}
POSMAP = {'GK':'GK','CB':'CB','LB':'LB','RB':'RB','DM':'DM','CM':'CM','AM':'AM','LM':'LW','RM':'RW','LW':'LW','RW':'RW','ST':'ST','SS':'ST',
          '?Meio-Campo':'CM','?Defensores':'CB','?Atacante':'ST','?Goleiro':'GK','?Meio-campo':'CM','?Defensor':'CB'}
GROUP = {'GK':'G','CB':'D','LB':'D','RB':'D','DM':'M','CM':'M','AM':'M','LW':'A','RW':'A','ST':'A'}
DIVDEF = {'A': 400, 'B': 120, 'C': 50, 'D': 25}
squads = {}
for f in ['sq1.txt', 'sq2.txt', 'sq3.txt', 'sq4a.txt', 'sq4b.txt']:
    cur = None
    for line in open(f):
        line = line.rstrip('\n')
        if not line: continue
        if line.startswith('@'):
            comp, tmid = line[1:].split('|')[:2]; cur = int(tmid); squads.setdefault(cur, []); continue
        n, pos, age, vk, apps, g, a, mins = line.split('|')
        squads[cur].append(dict(n=n.strip(), pos=pos, age=int(age or 0), vk=int(vk or 0), apps=int(apps), g=int(g), a=int(a), mins=int(mins)))
missing = [c['name'] for c in clubs if c['tm'] not in squads]
if missing: sys.exit('sem elenco: %s' % missing)
def rnd(*parts):  # ruido deterministico em [-1, 1]
    h = hashlib.md5('|'.join(map(str, parts)).encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF * 2 - 1
def clamp(v, a, b): return max(a, min(b, v))
unknown_pos = set(); total = 0; out = {}; stats_cov = [0, 0]
for c in clubs:
    rows = squads[c['tm']]
    known = [p['vk'] for p in rows if p['vk'] > 0]
    imp = median(known) * 0.45 if len(known) >= 5 else DIVDEF[c['div']]
    imp = max(10, imp)
    # pequeno ajuste de clube nas séries sem valores de mercado: quem caiu da série de cima é um pouco mais forte, quem subiu um pouco mais fraco
    prior = {'AMZ': 1.5, 'FER': 1.5, 'PAY': 1.5, 'VRE': 1.5, 'BAR': -0.5, 'ITL': -0.5, 'MAR': -0.5, 'STC': -0.5, 'CSA': 1.5, 'ABC': 1.5, 'RET': 1.5, 'TOM': 1.5}.get(c['id'], 0)
    maxmin = max([p['mins'] for p in rows] + [0])
    res = []; seen = set()
    for p in rows:
        k = (p['n'], p['pos'], p['age'])
        if k in seen: continue
        seen.add(k)
        pos = POSMAP.get(p['pos'])
        if not pos: unknown_pos.add(p['pos']); pos = 'CM'
        age = p['age'] or 24
        vk = p['vk'] if p['vk'] > 0 else imp
        r = 70 + 9 * math.log10(max(vk, 10) / 1000)
        if age <= 21: r -= (22 - age) * 1.2
        elif age >= 30 and p['vk'] > 0: r += min(8, age - 29)
        if pos == 'GK': r += 2
        r += prior
        if maxmin > 0: r += clamp(2.5 * (p['mins'] / maxmin - 0.35), -1.0, 1.6)
        ovr = int(round(clamp(r, 45, 89)))
        # atributos (2 por posicao), ajustados pelos numeros reais da temporada 2026
        grp = GROUP[pos]; mins = p['mins']; w = min(1.0, mins / 900) if mins else 0
        g90 = p['g'] * 90 / mins if mins else 0; a90 = p['a'] * 90 / mins if mins else 0
        n1 = rnd(c['id'], p['n'], 'a') * 3.5; n2 = rnd(c['id'], p['n'], 'b') * 3.5
        if grp == 'G':   # reflexo, saida do gol
            a1 = ovr + n1 - max(0, age - 32) * 0.8 + (1 if age <= 26 else 0)
            a2 = ovr + n2 + clamp((age - 27) * 0.5, -3, 4)
        elif grp == 'D':  # desarme, cabeceio
            b1, b2 = {'CB': (1, 3), 'LB': (-1, -5), 'RB': (-1, -5)}[pos]
            a1 = ovr + b1 + n1
            a2 = ovr + b2 + n2 + w * clamp(g90 * 45 - 1.5, -2, 7)
        elif grp == 'M':  # passe, drible
            b1, b2 = {'DM': (0, -5), 'CM': (2, -2), 'AM': (2, 3)}[pos]
            ea = {'DM': 0.04, 'CM': 0.08, 'AM': 0.15}[pos]; eg = {'DM': 0.03, 'CM': 0.06, 'AM': 0.12}[pos]
            a1 = ovr + b1 + n1 + w * clamp((a90 - ea) * 30, -5, 8)
            a2 = ovr + b2 + n2 + w * clamp((g90 - eg) * 15 + (a90 - ea) * 8, -3, 5)
        else:             # drible, chute
            b1, b2 = {'ST': (-4, 4), 'LW': (5, -3), 'RW': (5, -3)}[pos]
            eg = {'ST': 0.35, 'LW': 0.22, 'RW': 0.22}[pos]; ea = {'ST': 0.10, 'LW': 0.14, 'RW': 0.14}[pos]
            a1 = ovr + b1 + n1 + w * clamp((a90 - ea) * 20, -4, 5)
            a2 = ovr + b2 + n2 + w * clamp((g90 - eg) * 25, -7, 9)
        if mins: stats_cov[0] += 1
        stats_cov[1] += 1
        res.append([p['n'], pos, age, ovr, int(round(clamp(a1, 30, 95))), int(round(clamp(a2, 30, 95))), p['g'], p['a'], p['apps']])
    res.sort(key=lambda x: (-x[3]))
    # elenco do jogo: ate 40 jogadores (os de maior nota), garantindo pelo menos 3 goleiros quando houver
    gks = [x for x in res if x[1] == 'GK'][:3]; others = [x for x in res if x[1] != 'GK']
    keep = gks + others[:40 - len(gks)]
    out[c['id']] = keep; total += len(keep)
print('jogadores', total, 'clubes', len(out), 'posicoes desconhecidas', unknown_pos, 'com minutos em 2026: %d de %d' % tuple(stats_cov))
small = {k: len(v) for k, v in out.items() if len(v) < 22}
print('elencos com menos de 22:', small)
meta = {'src': 'Transfermarkt (elenco atual e estatísticas da temporada 2026) e Wikipédia (clubes, estádios e capacidades)', 'asof': '2026-10-03', 'players': total}
with open('../../rosters.js', 'w') as f:
    f.write('/* Elencos reais das Séries A, B, C e D 2026. Fonte: Transfermarkt (coletado em 2026-10-03). Linha: [nome, posição, idade, nota, atributo 1, atributo 2, gols, assistências, jogos em 2026]. Notas e atributos são estimativas do jogo. */\n')
    f.write('(function (root) { const R = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('const M = ' + json.dumps(meta, ensure_ascii=False) + ';\n')
    f.write("if (typeof module !== 'undefined' && module.exports) module.exports = { REAL: R, META: M }; else { root.REAL_ROSTERS = R; root.REAL_META = M; } })(typeof window !== 'undefined' ? window : globalThis);\n")
cdb = [[c['id'], c['name'], c['city'], c['uf'], c['div'], c['c1'], c['c2'], c['cap'], c['fan'], c['stadium']] for c in clubs]
with open('../../clubs.js', 'w') as f:
    f.write('/* Clubes das Séries A a D 2026: [sigla, nome, cidade, UF, série, cor 1, cor 2, capacidade do estádio, torcida 0-1 (estimativa), estádio]. Fonte: Wikipédia (participantes 2026); cores das Séries B a D tiradas dos escudos quando não conhecidas. */\n')
    f.write('(function (root) { const C = ' + json.dumps(cdb, ensure_ascii=False, separators=(',', ':')) + ";\nif (typeof module !== 'undefined' && module.exports) module.exports = C; else root.CLUB_DB = C; })(typeof window !== 'undefined' ? window : globalThis);\n")
print('ok')
