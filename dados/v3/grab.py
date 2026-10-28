# Recupera do historico da sessao (jsonl) o texto de uma saida do navegador entre "#MARCA" e "#END".
import json, sys
J = '/root/.claude/projects/-home-claude/fe5f6ccd-f37d-542a-928a-5c5376500787.jsonl'
mark, out = sys.argv[1], sys.argv[2]
found = None
for line in open(J):
    try: d = json.loads(line)
    except Exception: continue
    cont = (d.get('message') or {}).get('content')
    if not isinstance(cont, list): continue
    for b in cont:
        if isinstance(b, dict) and b.get('type') == 'tool_result':
            c = b.get('content'); txt = c if isinstance(c, str) else ''.join(x.get('text', '') for x in c if isinstance(x, dict))
            i = txt.find('#' + mark + '\n')
            if i >= 0 and '#END' in txt[i:]: found = txt[i:]
if not found: sys.exit('marca nao encontrada: ' + mark)
body = found[len(mark) + 2:found.index('#END')]
end = found[found.index('#END'):].split('\n')[0]
lines = [l for l in body.split('\n') if l.strip()]
open(out, 'w').write('\n'.join(lines) + '\n')
print(len(lines), 'linhas;', end)
