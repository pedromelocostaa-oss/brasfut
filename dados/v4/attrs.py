# Escolha dos 2 atributos de cada jogador.
# Com estatística real de 2026 (sofa_stats.json, do SofaScore), cada atributo vira um percentil dentro da série e da família de posição
# (só entre jogadores com pelo menos MIN_MIN minutos); o jogador fica com os 2 de maior percentil.
# Sem estatística suficiente, os 2 saem do perfil típico da posição, puxados por gols e assistências reais do Transfermarkt.
import json, math, hashlib, os
from bisect import bisect_left, bisect_right

FAM = {'GK': 'GOL', 'CB': 'ZAG', 'RB': 'LAT', 'LB': 'LAT', 'DM': 'MEI', 'CM': 'MEI', 'AM': 'MEI', 'RW': 'ATA', 'LW': 'ATA', 'ST': 'ATA'}
POOL = {'GOL': ['ref', 'sai', 'pen', 'pes', 'col'], 'ZAG': ['des', 'int', 'aer', 'sbo', 'blo'], 'LAT': ['cru', 'des', 'dri', 'pas', 'int'],
        'MEI': ['pas', 'cri', 'des', 'dri', 'fin'], 'ATA': ['fin', 'cab', 'dri', 'cri', 'lon']}
ARCH = {
    'GK': {'ref': .35, 'col': .25, 'sai': .2, 'pes': .15, 'pen': .05},
    'CB': {'aer': .3, 'des': .25, 'int': .2, 'sbo': .15, 'blo': .1},
    'LB': {'cru': .3, 'des': .2, 'dri': .2, 'pas': .15, 'int': .15}, 'RB': {'cru': .3, 'des': .2, 'dri': .2, 'pas': .15, 'int': .15},
    'DM': {'des': .42, 'pas': .33, 'fin': .08, 'dri': .07, 'cri': .1}, 'CM': {'pas': .33, 'cri': .2, 'des': .2, 'dri': .15, 'fin': .12},
    'AM': {'cri': .35, 'pas': .22, 'dri': .22, 'fin': .16, 'des': .05},
    'ST': {'fin': .38, 'cab': .25, 'dri': .13, 'cri': .09, 'lon': .15}, 'LW': {'dri': .38, 'cri': .24, 'fin': .2, 'lon': .13, 'cab': .05},
    'RW': {'dri': .38, 'cri': .24, 'fin': .2, 'lon': .13, 'cab': .05},
}
EG = {'DM': .03, 'CM': .06, 'AM': .12, 'ST': .35, 'LW': .22, 'RW': .22}
EA = {'DM': .04, 'CM': .08, 'AM': .15, 'ST': .10, 'LW': .14, 'RW': .14, 'LB': .07, 'RB': .07}
MIN_MIN = 450

def rnd(*parts):
    h = hashlib.md5('|'.join(map(str, parts)).encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF * 2 - 1

def clamp(v, a, b): return max(a, min(b, v))

def g(s, k): return float(s.get(k) or 0)

# métrica de cada atributo a partir das estatísticas do SofaScore (por 90 minutos, salvo indicação).
# Cada métrica tem um campo obrigatório; sem ele (a Série C no SofaScore não traz desarmes, interceptações, xG etc.) a métrica fica de fora.
NEED = {'fin': 'goals', 'cab': 'aerialDuelsWon', 'dri': 'successfulDribbles', 'cri': 'keyPasses', 'lon': 'shotsFromOutsideTheBox',
        'pas': 'accuratePasses', 'des': 'tackles', 'int': 'interceptions', 'aer': 'aerialDuelsWon', 'sbo': 'accurateLongBalls',
        'blo': 'blockedShots', 'cru': 'accurateCrosses', 'ref': 'saves', 'col': 'goalsPrevented', 'sai': 'highClaims',
        'pes': 'accurateLongBalls', 'pen': 'penaltyFaced'}
def metrics(s):
    m = g(s, 'minutesPlayed')
    if m <= 0: return None
    p90 = lambda k: g(s, k) * 90 / m
    xg = s.get('expectedGoals')
    out = {
        'fin': p90('goals') * 0.6 + ((g(s, 'goals') - xg) * 90 / m if xg is not None else p90('goals') * 0.3) * 0.4 + 0.05 * p90('shotsOnTarget'),
        'cab': p90('headedGoals') * 3 + p90('aerialDuelsWon') * 0.15,
        'dri': p90('successfulDribbles'),
        'cri': p90('keyPasses') + 0.6 * p90('bigChancesCreated') + 0.6 * p90('assists'),
        'lon': p90('goalsFromOutsideTheBox') * 4 + p90('shotsFromOutsideTheBox') * 0.3,
        'pas': p90('accuratePasses') * (g(s, 'accuratePassesPercentage') or 75) / 100,
        'des': p90('tackles') + 0.5 * p90('tacklesWon'),
        'int': p90('interceptions'),
        'aer': p90('aerialDuelsWon') * (0.5 + (g(s, 'aerialDuelsWonPercentage') or 50) / 100),
        'sbo': p90('accurateLongBalls') + 0.02 * p90('accuratePasses'),
        'blo': p90('blockedShots') + 0.15 * p90('clearances'),
        'cru': p90('accurateCrosses'),
        'ref': p90('saves') + 0.5 * p90('savedShotsFromInsideTheBox'),
        'col': p90('goalsPrevented'),
        'sai': p90('highClaims') + p90('successfulRunsOut') + 0.5 * p90('punches'),
        'pes': p90('accurateLongBalls') * (0.5 + (g(s, 'accurateLongBallsPercentage') or 40) / 100),
        'pen': (g(s, 'penaltySave') / g(s, 'penaltyFaced')) if g(s, 'penaltyFaced') >= 2 else None,
    }
    for k, f in NEED.items():
        if f not in s: out[k] = None
    return out

def load_stats():
    path = os.path.join(os.path.dirname(__file__), 'sofa_stats.json')
    if not os.path.exists(path): return {}
    rows = json.load(open(path))  # [{club, name, age, pos, div, stats:{...}}] já casados com o elenco do jogo (match.py)
    return {(r['club'], r['name'], r['age']): r for r in rows}

STATS = load_stats()

# distribuições por série e família de posição para o percentil (estilo comparado com quem joga a mesma série)
DIST = {}
def build_dist():
    for r in STATS.values():
        st = r['stats']
        if g(st, 'minutesPlayed') < MIN_MIN: continue
        fam = FAM.get(r['pos'])
        if not fam: continue
        mt = metrics(st)
        for k in POOL[fam]:
            v = mt.get(k)
            if v is None: continue
            DIST.setdefault((r['div'], fam, k), []).append(v)
    for key in DIST: DIST[key].sort()
build_dist()

def pct(dv, fam, k, v):
    d = DIST.get((dv, fam, k))
    if not d or v is None or len(d) < 15: return None
    lo, hi = bisect_left(d, v), bisect_right(d, v)
    return (lo + hi) / 2 / len(d)

def value(ovr, p):  # percentil 0..1 -> valor do atributo
    return int(round(clamp(ovr + 12 * (p - 0.4), 30, 95)))

def pick_attrs(cid, name, pos, ovr, real, g90, a90, w):
    fam = FAM[pos]
    if real and g(real['stats'], 'minutesPlayed') >= MIN_MIN:
        mt = metrics(real['stats'])
        sc = []
        for k in POOL[fam]:
            p = pct(real['div'], fam, k, mt.get(k))
            if p is None: continue
            sc.append((p + 0.03 * ARCH[pos].get(k, 0) + 0.001 * rnd(cid, name, k), k, p))
        sc.sort(reverse=True)
        if len(sc) >= 3:  # com só 2 métricas medidas não há escolha de verdade (goleiros da Série C)
            (_, k1, p1), (_, k2, p2) = sc[0], sc[1]
            v1, v2 = value(ovr, p1), value(ovr, p2)
            if v2 > v1: v2 = v1
            return k1, v1, k2, v2, 1
    # estimado: perfil típico da posição, puxado por gols e assistências reais quando houver minutos
    arch = dict(ARCH[pos])
    if w > 0:
        if 'fin' in arch and pos in EG: arch['fin'] *= 1 + w * clamp((g90 - EG[pos]) * 6, -0.6, 2.5)
        if 'cri' in arch and pos in EA: arch['cri'] *= 1 + w * clamp((a90 - EA[pos]) * 8, -0.6, 2.5)
        if pos == 'CB' and g90 > 0.06: arch['aer'] *= 1 + w * 1.5
    keys = sorted(arch, key=lambda k: -arch[k] * math.exp(1.2 * rnd(cid, name, 'est', k)))
    k1, k2 = keys[0], keys[1]
    v1 = int(round(clamp(ovr + 3 + 2 * (rnd(cid, name, 'v1') + 1), 30, 95)))
    v2 = int(round(clamp(ovr + 1 + 1.5 * (rnd(cid, name, 'v2') + 1), 30, 95)))
    return k1, v1, k2, min(v1, v2), 0
