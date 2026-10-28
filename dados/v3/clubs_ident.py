# Identidade dos 156 clubes: sigla, nome curto, cores, cidade, UF, divisao, capacidade e torcida (estimada).
import json, re, colorsys
pairs = json.load(open('club_pairs.json'))
# Serie A: identidade ja usada no jogo (engine.js)
A = {330:('CAM','Atlético-MG','#111111','#FFFFFF',0.86), 614:('FLA','Flamengo','#C8102E','#111111',0.98), 1023:('PAL','Palmeiras','#006437','#FFFFFF',0.92),
 537:('BOT','Botafogo','#111111','#FFFFFF',0.72), 609:('CRU','Cruzeiro','#1D4E9E','#FFFFFF',0.85), 2462:('FLU','Fluminense','#7A0026','#00613C',0.74),
 585:('SAO','São Paulo','#E2001A','#FFFFFF',0.88), 6600:('INT','Internacional','#D50000','#FFFFFF',0.82), 199:('COR','Corinthians','#FFFFFF','#111111',0.95),
 10010:('BAH','Bahia','#0B4EA2','#E30613',0.80), 221:('SAN','Santos','#FFFFFF','#111111',0.70), 210:('GRE','Grêmio','#0D80BF','#111111',0.80),
 978:('VAS','Vasco da Gama','#111111','#FFFFFF',0.84), 8793:('RBB','Bragantino','#FFFFFF','#D0021B',0.40), 679:('CAP','Athletico Paranaense','#C8102E','#111111',0.66),
 3876:('MIR','Mirassol','#F2C500','#0B7A3B',0.38), 2125:('VIT','Vitória','#D50000','#111111',0.66), 776:('CFC','Coritiba','#00593B','#FFFFFF',0.60),
 17776:('CHA','Chapecoense','#0B8A3E','#FFFFFF',0.50), 10997:('REM','Remo','#0B1F4B','#FFFFFF',0.72)}
# Demais: sigla, nome exibido (None = nome da Wikipedia), cores conhecidas (None = tiradas do escudo), torcida
O = {
 2863:('AME','América-MG','#0F7A3D','#111111',.55), 64918:('ATH','Athletic',None,None,.30), 15172:('ACG','Atlético-GO','#C8102E','#111111',.50), 2035:('AVA','Avaí','#1450B4','#FFFFFF',.60),
 9030:('BSP','Botafogo-SP','#D0021B','#111111',.45), 2029:('CEA','Ceará','#111111','#FFFFFF',.80), 11449:('CRB','CRB','#D0021B','#FFFFFF',.60), 7178:('CRI','Criciúma','#F2C500','#111111',.60),
 28022:('CUI','Cuiabá','#0B7A3B','#F2C500',.45), 10870:('FOR','Fortaleza','#1450B4','#E30613',.85), 3197:('GOI','Goiás','#0B5D1E','#FFFFFF',.60), 10492:('JUV','Juventude','#0B8A3E','#FFFFFF',.55),
 1693:('LON','Londrina','#1E90D6','#FFFFFF',.45), 2646:('NAU','Náutico','#E30613','#FFFFFF',.65), 37474:('NOV','Novorizontino','#F2C500','#111111',.30), 27214:('OPE','Operário-PR','#111111','#FFFFFF',.45),
 1134:('PON','Ponte Preta','#111111','#FFFFFF',.55), 16439:('SBE','São Bernardo','#F2C500','#111111',.25), 8718:('SPT','Sport','#D0021B','#111111',.80), 5677:('VIL','Vila Nova','#C8102E','#FFFFFF',.60),
 87727:('AMZ','Amazonas','#F2C500','#111111',.40), 17568:('ANA','Anápolis','#E30613','#FFFFFF',.30), 52519:('BAR','Barra-SC','#1F4FB0','#FFFFFF',.25), 17964:('BPB','Botafogo-PB','#111111','#FFFFFF',.50),
 14390:('BRU','Brusque','#F2C500','#0B8A3E',.30), 9141:('CAX','Caxias','#8C1D40','#FFFFFF',.45), 3280:('CON','Confiança','#1450B4','#FFFFFF',.45), 15882:('FER','Ferroviária','#7A1E1E','#FFFFFF',.35),
 4064:('FIG','Figueirense','#111111','#FFFFFF',.55), 65477:('FLO','Floresta','#5BA82E','#FFFFFF',.30), 1755:('GUA','Guarani','#0B6E4F','#FFFFFF',.55), 308:('ITL','Inter de Limeira','#111111','#FFFFFF',.35),
 8547:('ITA','Itabaiana','#E30613','#1F4FB0',.35), 4773:('ITU','Ituano','#D0021B','#111111',.30), 34293:('MAR','Maranhão','#D0021B','#1F3B73',.35), 33003:('MRG','Maringá',None,None,.30),
 6347:('PAY','Paysandu','#1E90D6','#FFFFFF',.75), 1785:('STC','Santa Cruz','#111111','#D0021B',.70), 4176:('VRE','Volta Redonda',None,None,.30), 16869:('YPI','Ypiranga-RS','#0B8A3E','#F2C500',.30),
 7209:('ABC','ABC','#111111','#FFFFFF',.60), 115027:('ABE','ABECAT',None,None,.20), 45176:('AGS','Água Santa',None,None,.20), 27642:('AGM','Águia de Marabá',None,None,.25), 62794:('ALT','Altos',None,None,.25),
 9138:('ARJ','America-RJ','#D0021B','#FFFFFF',.30), 1751:('AMN','América-RN','#D0021B','#FFFFFF',.50), 25209:('APA','Aparecidense',None,None,.20), 32639:('ARA','Araguaína',None,None,.20), 20092:('ASA','ASA',None,None,.35),
 27837:('ACE','Atlético Cearense',None,None,.20), 25229:('AAL','Atlético de Alagoinhas',None,None,.25), 85931:('AZU','Azuriz',None,None,.15), 98702:('BET','Betim',None,None,.15),
 10560:('BRP','Brasil de Pelotas','#D0021B','#111111',.50), 3973:('BSE','Brasiliense','#F2C500','#0B7A3B',.35), 66492:('BLU','Blumenau',None,None,.20), 38023:('CDF','Capital-DF',None,None,.15),
 12279:('CEI','Ceilândia',None,None,.25), 21409:('CEN','Central',None,None,.35), 16837:('CIA','Cianorte',None,None,.20), 12602:('CRC','CRAC',None,None,.25), 18545:('CSA','CSA','#1F3B73','#FFFFFF',.60),
 52513:('CSE','CSE',None,None,.20), 76155:('DEC','Decisão Goiana',None,None,.15), 3364:('DEM','Democrata GV','#111111','#FFFFFF',.30), 28621:('CAS','FC Cascavel',None,None,.25),
 11931:('FRR','Ferroviário','#111111','#D0021B',.45), 87817:('FPI','Fluminense-PI',None,None,.20), 69424:('GAL','Galvez',None,None,.20), 7014:('GAM','Gama','#0B7A3B','#FFFFFF',.40), 87822:('GAS','GAS',None,None,.15),
 72477:('GPV','Gazin Porto Velho',None,None,.15), 8567:('GTB','Goiatuba',None,None,.15), 87821:('GPE','Guaporé',None,None,.15), 24903:('GBA','Guarany de Bagé',None,None,.30), 60741:('HUM','Humaitá',None,None,.15),
 87160:('IAP','IAPE',None,None,.15), 39555:('IGU','Iguatu',None,None,.20), 23778:('IMP','Imperatriz',None,None,.25), 32612:('IND','Independência',None,None,.20), 25296:('INH','Inhumas',None,None,.15),
 36962:('IVI','Ivinhema',None,None,.15), 33050:('JAC','Jacuipense',None,None,.20), 3330:('JEC','Joinville','#D0021B','#111111',.50), 32991:('JUA','Juazeirense',None,None,.25), 56341:('LAG','Lagarto',None,None,.20),
 108000:('LGN','Laguna',None,None,.15), 21599:('LUV','Luverdense',None,None,.20), 4907:('MAD','Madureira','#F2C500','#1F3B9E',.30), 103697:('MAG','Maguary',None,None,.15), 94182:('MNR','Manauara',None,None,.20),
 46022:('MAN','Manaus',None,None,.30), 22352:('MCE','Maracanã-CE',None,None,.15), 4759:('MDI','Marcílio Dias',None,None,.30), 63296:('MCA','Maricá',None,None,.15), 11900:('MIX','Mixto','#111111','#FFFFFF',.30),
 119625:('MRR','Monte Roraima',None,None,.15), 12009:('MOT','Moto Club','#D0021B','#111111',.45), 22782:('NAC','Nacional-AM',None,None,.30), 15047:('NOR','Noroeste','#D0021B','#FFFFFF',.35),
 16108:('NIG','Nova Iguaçu',None,None,.25), 32386:('OMS','Operário-MS','#111111','#FFFFFF',.35), 60520:('OVG','Operário VG',None,None,.20), 53471:('ORA','Oratório',None,None,.15), 41872:('PAR','Parnahyba',None,None,.20),
 64925:('PIA','Piauí',None,None,.20), 121518:('POR','Porto-BA',None,None,.15), 10247:('LUS','Portuguesa','#D0021B','#0B7A3B',.50), 52517:('PRJ','Portuguesa-RJ',None,None,.20), 73407:('POU','Pouso Alegre',None,None,.25),
 98845:('PRI','Primavera-MT',None,None,.15), 36478:('RNO','Real Noroeste',None,None,.15), 76156:('RET','Retrô',None,None,.20), 30489:('RBE','Rio Branco-ES','#111111','#FFFFFF',.30), 3319:('SAM','Sampaio Corrêa','#F2C500','#0B8A3E',.60),
 40120:('SRJ','Sampaio Corrêa-RJ',None,None,.15), 36963:('SCC','Santa Catarina',None,None,.15), 7535:('SJO','São José-RS',None,None,.25), 80647:('SJS','São Joseense',None,None,.15), 27355:('SLU','São Luiz',None,None,.25),
 73574:('SRA','São Raimundo-RR',None,None,.15), 7816:('SER','Sergipe',None,None,.35), 65479:('SBR','Serra Branca',None,None,.15), 18236:('SOU','Sousa',None,None,.25), 94170:('TIR','Tirol',None,None,.15),
 27242:('TOC','Tocantinópolis',None,None,.15), 3234:('TOM','Tombense','#D0021B','#FFFFFF',.20), 36012:('TRE','Trem',None,None,.15), 11086:('TRZ','Treze','#111111','#FFFFFF',.45), 20803:('TUN','Tuna Luso',None,None,.30),
 8825:('UBE','Uberlândia','#0B7A3B','#FFFFFF',.40), 28199:('URO','União Rondonópolis',None,None,.20), 32037:('VEL','Velo Clube','#D0021B','#0B7A3B',.25), 32934:('VES','Vitória-ES',None,None,.20), 55335:('XVP','XV de Piracicaba','#111111','#FFFFFF',.40),
}
def hx(c): return '#%02X%02X%02X' % tuple(min(255, max(0, v)) for v in c)
def kind(c):
    r, g, b = [v / 255 for v in c]; h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l > 0.78 and s < 0.35: return 'w'
    if l < 0.2: return 'k'
    if s < 0.18: return 'g'
    return 'c'
def dist(a, b): return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5
def from_crest(spec):
    bins = []
    for part in spec.split(';'):
        if ':' not in part: continue
        rgb, n = part.split(':'); bins.append((tuple(int(v) for v in rgb.split(',')), int(n)))
    if not bins: return '#2350C8', '#FFFFFF'
    top = bins[0][1]
    chrom = [b for b in bins if kind(b[0]) == 'c' and b[1] >= 0.25 * top]
    blk = [b for b in bins if kind(b[0]) == 'k']
    c1 = chrom[0][0] if chrom else (blk[0][0] if blk else bins[0][0])
    rest = [b[0] for b in bins if dist(b[0], c1) > 120]
    c2 = rest[0] if rest else ((255, 255, 255) if kind(c1) != 'w' else (17, 17, 17))
    # deixa a cor mais "limpa"
    def clean(c):
        k = kind(c)
        if k == 'w': return (255, 255, 255)
        if k == 'k': return (17, 17, 17)
        return c
    return hx(clean(c1)), hx(clean(c2))
cols = {int(l.split('|')[1]): l.rstrip('\n').split('|')[4] for l in open('tm_clubs_colors.txt')}
out = []; seen = set()
for w, t in pairs:
    tmid = int(t[1]); div, wname, city, uf, stadium, cap = w
    cap = int(re.sub(r'\D', '', cap) or 5000)
    if tmid in A: sig, name, c1, c2, fan = A[tmid]
    else:
        sig, name, c1, c2, fan = O[tmid]
        if not c1: c1, c2 = from_crest(cols[tmid])
    assert sig not in seen, sig; seen.add(sig)
    out.append({'id': sig, 'name': name or wname, 'wiki': wname, 'city': city, 'uf': uf, 'div': div, 'cap': cap, 'stadium': re.sub(r'\[.*?\]', '', stadium), 'fan': fan, 'c1': c1, 'c2': c2, 'tm': tmid, 'tmName': t[2]})
json.dump(out, open('clubs_final.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'clubes;', sum(1 for c in out if c['tm'] not in A and not O[c['tm']][2]), 'com cores do escudo')
from collections import Counter; print(Counter(c['uf'] for c in out).most_common())
