# Casa as estatísticas do SofaScore 2026 (sofa1..4.txt) com os elencos do jogo (Transfermarkt) e grava sofa_stats.json.
# Casamento: mesmo clube; nome normalizado igual, depois apelido contido, depois semelhança de texto com checagem de gols.
import json, re, unicodedata, difflib
from collections import defaultdict

F = ['minutesPlayed', 'goals', 'expectedGoals', 'shotsOnTarget', 'headedGoals', 'goalsFromOutsideTheBox', 'shotsFromOutsideTheBox',
     'successfulDribbles', 'keyPasses', 'bigChancesCreated', 'assists', 'accuratePasses', 'accuratePassesPercentage', 'accurateLongBalls',
     'accurateLongBallsPercentage', 'accurateCrosses', 'tackles', 'tacklesWon', 'interceptions', 'clearances', 'blockedShots',
     'aerialDuelsWon', 'aerialDuelsWonPercentage', 'saves', 'savedShotsFromInsideTheBox', 'goalsPrevented', 'highClaims',
     'successfulRunsOut', 'punches', 'penaltySave', 'penaltyFaced', 'appearances']
TEAM = {'Athletico': 'CAP', 'Atlético Mineiro': 'CAM', 'Bahia': 'BAH', 'Botafogo': 'BOT', 'Chapecoense': 'CHA', 'Corinthians': 'COR',
        'Coritiba': 'CFC', 'Cruzeiro': 'CRU', 'Flamengo': 'FLA', 'Fluminense': 'FLU', 'Grêmio': 'GRE', 'Internacional': 'INT',
        'Mirassol': 'MIR', 'Palmeiras': 'PAL', 'Red Bull Bragantino': 'RBB', 'Remo': 'REM', 'Santos': 'SAN', 'São Paulo': 'SAO',
        'Vasco da Gama': 'VAS', 'Vitória': 'VIT', 'América Mineiro': 'AME', 'Athletic Club': 'ATH', 'Atlético Goianiense': 'ACG',
        'Avaí': 'AVA', 'Botafogo-SP': 'BSP', 'CRB': 'CRB', 'Ceará': 'CEA', 'Criciúma': 'CRI', 'Cuiabá': 'CUI', 'Fortaleza': 'FOR',
        'Goiás': 'GOI', 'Grêmio Novorizontino': 'NOV', 'Juventude': 'JUV', 'Londrina': 'LON', 'Náutico': 'NAU', 'Operário-PR': 'OPE',
        'Ponte Preta': 'PON', 'Sport Recife': 'SPT', 'São Bernardo': 'SBE', 'Vila Nova FC': 'VIL', 'AO Itabaiana': 'ITA',
        'Amazonas FC': 'AMZ', 'Anápolis FC': 'ANA', 'Barra FC': 'BAR', 'Botafogo-PB': 'BPB', 'Brusque': 'BRU', 'Caxias': 'CAX',
        'Confiança': 'CON', 'Ferroviária': 'FER', 'Figueirense': 'FIG', 'Floresta': 'FLO', 'Guarani': 'GUA', 'Inter de Limeira': 'ITL',
        'Ituano': 'ITU', 'Maranhão AC': 'MAR', 'Maringá FC': 'MRG', 'Paysandu SC': 'PAY', 'Santa Cruz': 'STC', 'Volta Redonda': 'VRE',
        'Ypiranga FC': 'YPI'}
POSMAP = {'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB', 'DM': 'DM', 'CM': 'CM', 'AM': 'AM', 'LM': 'LW', 'RM': 'RW', 'LW': 'LW', 'RW': 'RW',
          'ST': 'ST', 'SS': 'ST', '?Meio-Campo': 'CM', '?Defensores': 'CB', '?Atacante': 'ST', '?Goleiro': 'GK', '?Meio-campo': 'CM', '?Defensor': 'CB'}

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', ' ', s).split()

clubs = json.load(open('../v3/clubs_final.json'))
bytm = {c['tm']: c['id'] for c in clubs}
div = {c['id']: c['div'] for c in clubs}
squads = defaultdict(list)
for f in ['sq1.txt', 'sq2.txt', 'sq3.txt', 'sq4a.txt', 'sq4b.txt']:
    cur = None
    for line in open('../v3/' + f):
        line = line.rstrip('\n')
        if not line: continue
        if line.startswith('@'): cur = bytm.get(int(line[1:].split('|')[1])); continue
        n, pos, age, vk, apps, g, a, mins = line.split('|')
        if cur: squads[cur].append(dict(n=n.strip(), pos=POSMAP.get(pos, 'CM'), age=int(age or 0), g=int(g), mins=int(mins), apps=int(apps)))

rows = []
for i in range(1, 5):
    for line in open('sofa%d.txt' % i):
        p = line.rstrip('\n').split('|')
        if len(p) < 4 + len(F): continue
        st = {}
        for k, v in zip(F, p[4:4 + len(F)]):
            if v != '': st[k] = float(v)
        rows.append(dict(div=p[0], team=p[1], club=TEAM[p[1]], name=p[3], stats=st))

def score(sn, tn):
    a, b = norm(sn), norm(tn)
    if a == b: return 1.0
    sa, sb = set(a), set(b)
    if sa and sb and (sa <= sb or sb <= sa): return 0.9  # "Pedro" x "Pedro Guilherme", "Gabriel Barbosa" x "Gabriel Barbosa Almeida"
    if a and b and a[-1] == b[-1] and a[0][:3] == b[0][:3]: return 0.85
    return difflib.SequenceMatcher(None, ' '.join(a), ' '.join(b)).ratio() * 0.8

out, used, unmatched = [], set(), []
byclub = defaultdict(list)
for r in rows: byclub[r['club']].append(r)
for cid, rs in byclub.items():
    sq = squads[cid]
    cand = []
    for ri, r in enumerate(rs):
        for pi, p in enumerate(sq):
            s = score(r['name'], p['n'])
            if s < 0.68: continue
            # goleiro só casa com goleiro (no SofaScore, goleiro é quem tem defesas)
            if (p['pos'] == 'GK') != (r['stats'].get('saves', 0) > 0 or 'goalsPrevented' in r['stats']): continue
            # nome de uma palavra só ("Gabriel", "Léo") contido em nome composto: vale menos se o clube tem mais de um com essa palavra
            tn = norm(p['n'])
            if len(tn) == 1 and len(norm(r['name'])) > 1 and sum(tn[0] in norm(x['name']) for x in rs) > 1: s -= 0.12
            # desempate entre homônimos: minutos e gols parecidos entre as duas fontes pesam pouco (os números do Transfermarkt às vezes são parciais)
            sm, tm = r['stats'].get('minutesPlayed', 0), p['mins']
            s -= 0.08 * min(1, abs(sm - tm) / max(sm, tm, 1))
            if r['stats'].get('goals', 0) > p['g'] + 2: s -= 0.04
            cand.append((s, ri, pi))
    cand.sort(reverse=True)
    rdone, pdone = set(), set()
    for s, ri, pi in cand:
        if ri in rdone or pi in pdone or s < 0.66: continue
        rdone.add(ri); pdone.add(pi)
        r, p = rs[ri], sq[pi]
        out.append(dict(club=cid, name=p['n'], age=p['age'], pos=p['pos'], div=div[cid], sofa=r['name'], score=round(s, 2), stats=r['stats']))
    for ri, r in enumerate(rs):
        if ri not in rdone: unmatched.append((cid, r['name'], int(r['stats'].get('minutesPlayed', 0))))

json.dump(out, open('sofa_stats.json', 'w'), ensure_ascii=False)
print('linhas SofaScore', len(rows), 'casadas', len(out), 'sem par', len(unmatched))
print('sem par com 450+ min:', len([u for u in unmatched if u[2] >= 450]))
print('casamentos não exatos:')
for o in out:
    if o['score'] < 0.9 or len(o['sofa']) > len(o['name']) + 8: print(' ', o['club'], o['sofa'], '->', o['name'], o['score'])
