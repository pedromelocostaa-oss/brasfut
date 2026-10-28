# Gera foreign.js: clubes estrangeiros da Libertadores e da Sul-Americana 2026, grupos reais e elencos (Transfermarkt).
# Elencos: data/v5/fsq.txt no mesmo formato dos elencos brasileiros ("@ID|tmid|nome", depois nome|pos|idade|valor mil €|jogos|gols|assist.|minutos).
# Estádio: data/v5/fstadium.txt ("ID|estádio|capacidade"). Sem esses arquivos o clube entra sem elenco (o jogo não publica assim).
import json, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'v4'))
from foreign_meta import CLUBS, LIB, SUL
from attrs import pick_attrs
HERE = os.path.dirname(__file__)
POSMAP = {'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB', 'DM': 'DM', 'CM': 'CM', 'AM': 'AM', 'LM': 'LW', 'RM': 'RW', 'LW': 'LW', 'RW': 'RW', 'ST': 'ST', 'SS': 'ST'}

def clamp(v, a, b): return max(a, min(b, v))

squads, stad = {}, {}
p = os.path.join(HERE, 'fsq.txt')
if os.path.exists(p):
    cur = None
    for line in open(p):
        line = line.rstrip('\n')
        if not line: continue
        if line.startswith('@'): cur = line[1:].split('|')[0]; squads[cur] = []; continue
        n, pos, age, vk, apps, g, a, mins = line.split('|')
        squads[cur].append(dict(n=n.strip(), pos=pos, age=int(age or 0), vk=int(vk or 0), apps=int(apps or 0), g=int(g or 0), a=int(a or 0), mins=int(mins or 0)))
p = os.path.join(HERE, 'fstadium.txt')
if os.path.exists(p):
    for line in open(p):
        if line.strip():
            cid, name, cap = line.rstrip('\n').split('|'); stad[cid] = (name, int(cap or 0))

out, db, missing = {}, [], []
for cid, name, city, country, c1, c2, fan, alt, _q in CLUBS:
    rows = squads.get(cid, [])
    if not rows: missing.append(cid)
    known = sorted(r['vk'] for r in rows if r['vk'] > 0)
    imp = max(25, known[len(known) // 2] * 0.45) if len(known) >= 5 else 150
    maxmin = max([r['mins'] for r in rows] + [0])
    res, seen = [], set()
    for r in rows:
        k = (r['n'], r['pos'], r['age'])
        if k in seen: continue
        seen.add(k)
        pos = POSMAP.get(r['pos'], 'CM'); age = r['age'] or 24
        vk = r['vk'] if r['vk'] > 0 else imp
        # mesma régua dos brasileiros: valor de mercado do Transfermarkt vira nota, com idade e minutos
        x = 70 + 9 * math.log10(max(vk, 10) / 1000)
        if age <= 21: x -= (22 - age) * 1.2
        elif age >= 30 and r['vk'] > 0: x += min(8, age - 29)
        if pos == 'GK': x += 2
        if maxmin > 0: x += clamp(2.5 * (r['mins'] / maxmin - 0.35), -1.0, 1.6)
        ovr = int(round(clamp(x, 45, 89)))
        mins = r['mins']; g90 = r['g'] * 90 / mins if mins else 0; a90 = r['a'] * 90 / mins if mins else 0
        k1, v1, k2, v2, src = pick_attrs(cid, r['n'], pos, ovr, None, g90, a90, min(1.0, mins / 900) if mins else 0)
        res.append([r['n'], pos, age, ovr, k1, v1, k2, v2, r['g'], r['a'], r['apps'], src])
    res.sort(key=lambda x: -x[3])
    gks = [x for x in res if x[1] == 'GK'][:3]; others = [x for x in res if x[1] != 'GK']
    out[cid] = gks + others[:36 - len(gks)]
    sname, cap = stad.get(cid, ('', 0))
    db.append([cid, name, city, country, 'X', c1, c2, cap or 30000, fan, sname, alt])

with open(os.path.join(HERE, '..', '..', 'foreign.js'), 'w') as f:
    f.write('/* Clubes estrangeiros da Libertadores e da Sul-Americana 2026. Grupos: sorteio real de 2026. Elencos: Transfermarkt. '
            'Clube: [sigla, nome, cidade, país, "X", cor 1, cor 2, capacidade, torcida 0-1, estádio, altitude aproximada em metros]. '
            'Jogador: mesmo formato de rosters.js (atributos estimados). Cores, torcida e altitude são estimativas do jogo. */\n')
    f.write('(function (root) { const DB = ' + json.dumps(db, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('const R = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write('const G = ' + json.dumps({'LIB': LIB, 'SUL': SUL}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    f.write("const api = { DB, R, G2026: G };\nif (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FOREIGN = api; })(typeof window !== 'undefined' ? window : globalThis);\n")
print('clubes', len(db), 'jogadores', sum(len(v) for v in out.values()), 'sem elenco:', len(missing))
