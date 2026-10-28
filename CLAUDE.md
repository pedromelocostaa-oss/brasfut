# Brasfut

Jogo de técnico de futebol brasileiro. Leia `PLANO.md` antes de começar qualquer coisa.

## Estrutura

```
jogo/        código do jogo
  engine.js    motor de partida, atributos, bola parada (sem DOM)
  comps.js     calendário, tabelas, mata-mata (sem DOM)
  game.js      regras de carreira, economia, mercado, estrutura (sem DOM)
  ui.js        interface (único arquivo com DOM)
  styles.css   estilos
  rosters.js   elencos reais, gerado por dados/v4/gen_v4.py
  clubs.js     clubes das Séries A a D, gerado por dados/v4/gen_v4.py
  foreign.js   clubes da Libertadores e Sul-Americana, gerado por dados/v5/gen_v5.py
  build.py     junta tudo num index.html
  index.html   saída do build, é o que vai publicado

dados/       pipeline de dados (Transfermarkt, SofaScore, Wikipédia)
testes/      testes de motor e carreira
```

## Como rodar

```bash
cd jogo && python3 build.py          # gera index.html
node -e "require('./game.js')"       # confere que carrega
```

Os três arquivos de regra (`engine.js`, `comps.js`, `game.js`) rodam no Node sem navegador. Use isso para simular temporadas antes de mexer na tela.

## Convenções

- **Português do Brasil** em tudo: comentário, texto de tela, nome de variável nova quando fizer sentido.
- **Sem travessão longo** em texto de tela.
- **Nenhum número sem frase.** Todo controle vem com uma linha dizendo o que a escolha custa.
- **Toda decisão mexe em pelo menos duas moedas:** dinheiro, tempo e humor da torcida.
- **Avise quando a compra não vale.** Se a obra não traz retorno hoje, o jogo diz isso antes de o jogador gastar.
- Preços do clube saem de uma constante por clube, não de número solto.

## Antes de publicar

1. `python3 build.py`
2. Simular pelo menos uma temporada completa no Node e conferir gols por jogo, vitórias do mandante e caixa dos clubes.
3. Testar as telas em 390px, 820px e 1440px, no claro e no escuro.
4. Publicar no mesmo artifact, sem criar link novo.

## Não fazer

- Jogo de azar de qualquer tipo. O público é infantil.
- Reproduzir escudo, logo de marca ou foto sem confirmação de direito.
- Marcar como verificado o que não foi verificado.
