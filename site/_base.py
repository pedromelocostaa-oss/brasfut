CSS = """
:root{color-scheme:light;--quadro:#E9EEEA;--sup:#F8FAF8;--tinta:#10201A;--tinta2:#4D5F56;--linha:#C7D2CB;--ima:#2350C8;--gram:#22744A}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--quadro:#0D1512;--sup:#15201B;--tinta:#E6EEE9;--tinta2:#9DB0A6;--linha:#2A3A32;--ima:#5B83F2;--gram:#1B5E3B;color-scheme:dark}}
:root[data-theme=dark]{--quadro:#0D1512;--sup:#15201B;--tinta:#E6EEE9;--tinta2:#9DB0A6;--linha:#2A3A32;--ima:#5B83F2;--gram:#1B5E3B;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--quadro);color:var(--tinta);font:17px/1.65 'Atkinson Hyperlegible','Segoe UI',system-ui,sans-serif}
.topo{background:var(--gram);color:#fff;padding:28px 16px}
.topo .in{max-width:760px;margin:0 auto}
.marca{font-family:'Big Shoulders Display','Arial Narrow',sans-serif;font-weight:900;font-size:30px;text-transform:uppercase;letter-spacing:.02em;text-decoration:none;color:#fff;display:inline-block}
.marca i{font-style:normal;color:#E8B400}
main{max-width:760px;margin:0 auto;padding:32px 16px 72px}
h1{font-family:'Big Shoulders Display','Arial Narrow',sans-serif;font-weight:900;font-size:clamp(34px,7vw,52px);line-height:1;text-transform:uppercase;margin:0 0 6px;text-wrap:balance}
h2{font-family:'Big Shoulders Display','Arial Narrow',sans-serif;font-weight:800;font-size:26px;text-transform:uppercase;margin:36px 0 8px;letter-spacing:.01em}
h3{font-size:18px;margin:22px 0 4px}
p,li{margin:10px 0}
ul{padding-left:20px}
a{color:var(--ima)}
.data{color:var(--tinta2);font-size:14px;margin:0 0 24px}
.caixa{background:var(--sup);border:1px solid var(--linha);border-radius:14px;padding:16px 18px;margin:20px 0}
.caixa.destaque{border-color:var(--gram);border-width:2px}
table{border-collapse:collapse;width:100%;font-size:16px;margin:14px 0}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--linha);vertical-align:top}
th{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--tinta2)}
.rodape{border-top:1px solid var(--linha);margin-top:48px;padding-top:20px;font-size:15px;color:var(--tinta2)}
.rodape a{margin-right:16px}
code{background:var(--sup);border:1px solid var(--linha);border-radius:5px;padding:1px 5px;font-size:.9em}
"""

def pagina(titulo, desc, corpo):
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titulo} · Prancheta FC</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#22744A">
<link rel="icon" href="icone-192.png" sizes="192x192">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Atkinson+Hyperlegible:wght@400;700&display=swap">
<style>{CSS}</style>
</head>
<body>
<header class="topo"><div class="in"><a class="marca" href="./">PRAN<i>CHETA</i> FC</a></div></header>
<main>
{corpo}
<div class="rodape">
  <a href="./">Jogar</a><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos de uso</a><a href="suporte.html">Suporte</a>
  <p>Prancheta FC. Jogo independente, sem vínculo com a CBF, com a Conmebol, com clubes, ligas ou jogadores.</p>
</div>
</main>
</body>
</html>
"""
