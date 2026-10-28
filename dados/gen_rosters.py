"""Gera rosters.js a partir de data/tm_squads.txt (Transfermarkt, 2026-10-02).
Nota do jogador = estimativa do protótipo a partir do valor de mercado e da idade."""
import math, json, pathlib, sys
d = pathlib.Path(__file__).parent
A, B, YOUNG, OLD, OLDCAP, GKB = (float(x) for x in (sys.argv[1:7] if len(sys.argv) > 6 else (70, 9, 1.2, 1.0, 8, 2)))
def ovr(vk, age, pos):
    v = max(vk, 40) * 1000
    r = A + B * math.log10(v / 1e6)
    if age <= 21: r -= (22 - age) * YOUNG
    if age >= 30: r += min(OLDCAP, (age - 29) * OLD)
    if pos == 'GK': r += GKB
    return int(round(max(48, min(89, r))))
real = {}
for fname in ('tm_squads.txt', 'tm_extras.txt'):
    cur = None
    for line in open(d / fname, encoding='utf-8'):
        line = line.rstrip('\n')
        if line.startswith('## '): cur = line[3:]; real.setdefault(cur, []); continue
        if line.startswith('#') or not line.strip(): continue
        n, pos, age, vk = line.split('|')
        real[cur].append([n, pos, int(age), ovr(int(vk), int(age), pos), None, int(vk)])
meta = {'src': 'Transfermarkt, plantel detalhado da temporada 2026', 'asof': '2026-10-02', 'note': 'Notas estimadas pelo protótipo a partir do valor de mercado e da idade.'}
js = '/* Elencos reais da Série A 2026. Fonte: Transfermarkt (plantel detalhado, temporada 2026), coletado em 2026-10-02.\n   Elenco completo de cada clube. Nota = estimativa do protótipo (valor de mercado + idade). */\n'
js += '(function (root) {\n  const REAL = ' + json.dumps(real, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += '  const REAL_META = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
js += "  if (typeof module !== 'undefined' && module.exports) module.exports = { REAL, REAL_META }; else { root.REAL_ROSTERS = REAL; root.REAL_META = REAL_META; }\n})(typeof window !== 'undefined' ? window : globalThis);\n"
(d.parent / 'rosters.js').write_text(js, encoding='utf-8')
print('ok', sum(len(v) for v in real.values()))
