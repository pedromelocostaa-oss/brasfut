import pathlib
d = pathlib.Path(__file__).parent
css = (d/'styles.css').read_text()
files = ('rosters.js', 'clubs.js', 'foreign.js', 'engine.js', 'comps.js', 'game.js', 'ui.js')
scripts = '\n'.join(f'<script>\n{(d/f).read_text()}\n</script>' for f in files)
html = f'''<title>Prancheta FC</title>
<meta name="description" content="Manager de futebol brasileiro: Séries A a D, Copa do Brasil, estaduais, Libertadores e Sul-Americana.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900&family=Atkinson+Hyperlegible:wght@400;700&display=swap">
<style>
{css}
</style>
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
{scripts}
'''
(d/'index.html').write_text(html)
print(len(html))
