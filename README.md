# Brasfut

Jogo de técnico de futebol brasileiro, no navegador, com clubes e jogadores reais das Séries A, B, C e D de 2026.

- 156 clubes, 4.165 jogadores
- Séries A a D, 27 estaduais, Copa do Brasil, Libertadores e Sul-Americana
- Atributos de 1.000 jogadores tirados das estatísticas reais de 2026
- Carreira longa: estrutura do clube, base, mercado, vida do técnico

Planejamento completo em [PLANO.md](PLANO.md).

## Rodar

```bash
cd jogo && python3 build.py
```

Abra `jogo/index.html` no navegador.

## Fontes dos dados

Transfermarkt (elencos e estatísticas de 2026), SofaScore (estatísticas por jogador das Séries A, B e C, usadas para os atributos) e Wikipédia (clubes, estádios e capacidades).
