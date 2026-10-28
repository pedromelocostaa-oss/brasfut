import unicodedata, re
def norm(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    stop = {'fc','ec','sc','ac','aa','ad','ao','ce','cr','clube','esporte','futebol','de','do','da','e','club','sport','atletico','fe','saf','rc','ga','gе','se','sd','cn','if','fr','dc','bra','cfc'}
    return [w for w in s.split() if w and w not in stop]
wiki = [l.rstrip('\n').split('|') for l in open('wiki_clubs.txt')]
tm = [l.rstrip('\n').split('|') for l in open('tm_clubs_colors.txt')]
DIV = {'BRA1':'A','BRA2':'B','BRA3':'C','BRA4':'D'}
MANUAL = {  # nome na Wikipedia -> id do Transfermarkt
 'Atlético Mineiro':330, 'Athletico Paranaense':679, 'Botafogo':537, 'Botafogo-SP':9030, 'Botafogo-PB':17964, 'Athletic':64918, 'Atlético Goianiense':15172,
 'America':9138, 'América de Natal':1751, 'América Mineiro':2863, 'Operário-PR':27214, 'Operário-MS':32386, 'Operário VG':60520, 'Brasil de Pelotas':10560,
 'Atlético Cearense':27837, 'Atlético de Alagoinhas':25229, 'Portuguesa':10247, 'Portuguesa-RJ':52517, 'Sampaio Corrêa':3319, 'Sampaio Corrêa-RJ':40120,
 'Fluminense':2462, 'Fluminense-PI':87817, 'Barra-SC':52519, 'Inter de Limeira':308, 'Internacional':6600, 'São José-RS':7535, 'São Joseense':80647,
 'Gazin Porto Velho':72477, 'Tirol':94170, 'Serra Branca':65479, 'Decisão Goiana':76155, 'Democrata GV':3364, 'GAS':87822, 'Rio Branco-ES':30489, 'Vitória-ES':32934,
 'Vitória':2125, 'Santa Catarina':36963, 'Nacional-AM':22782, 'Maracanã-CE':22352, 'Primavera-MT':98845, 'Real Noroeste':36478, 'Ferroviário':11931, 'Ferroviária':15882,
 'Porto-BA':121518, 'Capital-DF':38023, 'ABECAT':115027, 'CSE':52513, 'IAPE':87160, 'Imperatriz':23778, 'Guaporé':87821, 'Humaitá':60741, 'Independência':32612,
 'Maguary':103697, 'Laguna':108000, 'São Luiz':27355, 'São Raimundo-RR':73574, 'Ypiranga de Erechim':16869, 'Caxias':9141, 'Santos':221, 'Grêmio':210, 'Red Bull Bragantino':8793,
 'Guarany de Bagé':24903, 'Sport':8718, 'Velo Clube':32037, 'XV de Piracicaba':55335, 'Noroeste':15047, 'Betim Futebol':98702,
}
tmby = {int(t[1]): t for t in tm}
out = []; miss = []
for w in wiki:
    div, name = w[0], w[1]
    if name in MANUAL: t = tmby[MANUAL[name]]
    else:
        cands = [t for t in tm if DIV[t[0]] == div]
        nw = set(norm(name)); best = None; bs = 0
        for t in cands:
            sc = len(nw & set(norm(t[2]))) / max(1, len(nw))
            if sc > bs: bs, best = sc, t
        if bs < 0.99: miss.append((div, name, best[2] if best else None, bs)); continue
        t = best
    if DIV[t[0]] != div: miss.append((div, name, 'DIV MISMATCH ' + t[2], 0)); continue
    out.append((w, t))
used = [t[1] for _, t in out]
dups = {u for u in used if used.count(u) > 1}
print('ok', len(out), 'faltam', len(miss), 'dup', dups)
for m in miss: print('  ', m)
left = [t[2] + ' ' + t[1] for t in tm if t[1] not in used]
print('TM sem par:', left)
import json; json.dump([[w, t] for w, t in out], open('club_pairs.json', 'w'), ensure_ascii=False)
