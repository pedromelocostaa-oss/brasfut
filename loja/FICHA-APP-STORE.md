# Ficha do Prancheta FC para a App Store

Tudo aqui é para copiar e colar no App Store Connect. Os limites de caractere são os da Apple
e os textos já estão dentro deles.

## Identificação

| Campo | Valor |
|---|---|
| Bundle ID | `br.com.prancheta.fc` |
| Nome na loja (30) | `Prancheta FC` |
| Subtítulo (30) | `Seja técnico no Brasileirão` |
| Categoria principal | Jogos > Esportes |
| Categoria secundária | Jogos > Simulação |
| Idioma principal | Português (Brasil) |
| Preço do app | Grátis (com compras dentro do app) |

## Palavras-chave (100 caracteres, separadas por vírgula, sem espaço)

```
futebol,técnico,brasileirão,manager,treinador,série a,escalação,time,libertadores,carreira
```

98 caracteres. Não repita palavra que já está no nome ou no subtítulo: a Apple indexa os dois
junto com as palavras-chave, e repetir desperdiça espaço.

## Descrição

```
Você é o técnico. Escolhe o time, escala, decide a postura no intervalo, contrata, vende e
responde à diretoria quando o resultado não vem.

São os 156 clubes das Séries A, B, C e D de 2026, com elenco de verdade e os jogadores que
estão lá hoje. Comece no clube que você quiser: pegar um time da Série D e subir é o caminho
mais longo; pegar um grande é cobrança desde a primeira rodada.

O QUE VOCÊ FAZ

- Escala o time arrastando os jogadores no campo
- Escolhe a postura e mexe no intervalo, quando o jogo para e pergunta
- Contrata e vende na janela de transferências, negociando valor, luvas e salário
- Cuida do caixa: folha salarial, cota de TV, bilheteria e a loja do clube
- Constrói: estádio, centro de treinamento, base, departamento médico
- Responde à coletiva de imprensa, e a promessa que você faz a diretoria cobra depois

O CALENDÁRIO DE VERDADE

A temporada tem data real, de janeiro a novembro. Estadual, Brasileirão, Copa do Brasil,
Libertadores e Sul-Americana, cada um na sua época. O dinheiro é mensal, e em dezembro o
clube paga duas folhas, porque o décimo terceiro existe.

SEM PEGADINHA

Não tem caixa de recompensa, pacote surpresa nem sorteio de jogador. Não dá para comprar
jogador nem vantagem com dinheiro real. Quem não paga nada não joga em desvantagem nenhuma.
Não tem anúncio e o jogo não coleta nenhum dado seu.

Funciona sem internet.

GRÁTIS E PAGO

O campeonato estadual e o primeiro turno do Brasileirão são grátis para sempre, em qualquer
carreira. Depois disso, o Passe de Técnico libera temporadas sem limite, Libertadores,
Sul-Americana e a troca de clube.

Prancheta FC é um jogo independente, sem vínculo com a CBF, a Conmebol, clubes ou atletas.
```

## Novidades desta versão (primeira publicação)

```
Primeira versão. As Séries A, B, C e D de 2026, Copa do Brasil, estaduais, Libertadores e
Sul-Americana, com elenco e calendário de verdade.
```

## Compras dentro do app

| Nome | Tipo | Preço | ID |
|---|---|---|---|
| Passe de Técnico | Não consumível | R$ 49,90 | `br.com.prancheta.fc.passe` |
| Prancheta FC Mensal | Assinatura renovável | R$ 12,90/mês | `br.com.prancheta.fc.mensal` |

Descrição do passe, para a ficha da compra:
```
Libera temporadas sem limite, Libertadores e Sul-Americana, trocar de clube e várias carreiras
salvas. Pagamento único, não renova.
```

## Classificação etária

O questionário da Apple, respondido para este jogo:

| Pergunta | Resposta |
|---|---|
| Violência de desenho ou fantasia | Nenhuma |
| Violência realista | Nenhuma |
| Violência sexual ou nudez | Nenhuma |
| Profanidade ou humor vulgar | Nenhuma |
| Álcool, tabaco ou drogas | Nenhuma |
| Temas adultos ou sugestivos | Nenhuma |
| Terror ou medo | Nenhuma |
| Jogo de azar simulado | **Nenhuma** |
| Apostas e azar com dinheiro real | **Não** |
| Conteúdo gerado por usuário | Não |
| Acesso irrestrito à web | Não |

Resultado esperado: **4+**.

Atenção a duas armadilhas:

1. **Não marque a categoria "Kids" (Crianças).** Ela é opcional e, se você entrar nela, passa a
   valer um conjunto de regras bem mais pesado: nenhum dado de dispositivo pode ir para terceiro
   sem consentimento dos pais, todo anúncio precisa de revisão humana, e toda compra e todo link
   externo precisam de parental gate. Classificação 4+ já cobre o que a gente precisa.
2. **Negociação de jogador não é jogo de azar.** Se a revisão perguntar, a resposta é que não há
   mecânica aleatória paga: nenhum item do jogo entrega resultado sorteado em troca de dinheiro.

## Privacidade do app (App Privacy)

Resposta ao questionário: **"Data Not Collected"** em tudo.

Isso é verdade e dá para sustentar: o jogo não faz nenhuma chamada de rede além de carregar duas
fontes de letra. Não existe conta, servidor, análise de uso, rastreador nem anúncio. A carreira
fica no armazenamento do próprio aparelho.

| Campo | Valor |
|---|---|
| URL da política de privacidade | `https://<endereço do site>/privacidade.html` |
| URL de suporte | `https://<endereço do site>/suporte.html` |
| URL de marketing | opcional, pode deixar em branco |

## Capturas de tela

Dois conjuntos, porque a Apple pede um por família de aparelho.

| Pasta | Arquivos | Tamanho | Slot na ficha |
|---|---|---|---|
| `loja/capturas/` | `iphone-*.png` | **1206 x 2622** | iPhone com Dynamic Island (tela média) |
| `loja/capturas-ipad/` | `ipad-*.png` | **2048 x 2732** | iPad, tela de 13 pol. |

O prefixo no nome do arquivo não é enfeite: os dois conjuntos tinham o mesmo nome,
o navegador salvou como "1-escolha (1).png" no Downloads e o arquivo errado acabou
sendo arrastado para o slot errado, voltando com "as dimensões do arquivo são inválidas".

Seis telas em cada: escolha do clube, central, elenco, tabela da Série A, estrutura
do clube e partida em andamento (essa no escuro).

O slot do iPhone também aceita 1179 x 2556, e o do iPad também aceita 2064 x 2752.
**Não use 1320 x 2868**: era a medida do slot de 6,9 polegadas, a Apple reorganizou
os slots e o envio volta com "as dimensões do arquivo são inválidas".

Para regerar, os scripts estão no diretório de trabalho da sessão (`ipad.js` e
`iphone.js`): sobem o jogo em `http://127.0.0.1:8784`, carregam um save pronto no
localStorage e tiram as telas com o Playwright.

## Informações para a revisão

Campo "Notes" da submissão:

```
O jogo não exige conta nem login. É só abrir e jogar.

O campeonato estadual e o primeiro turno do Brasileirão são gratuitos. O Passe de Técnico
libera o restante.

Não há mecânica de azar de nenhum tipo: nenhuma caixa de recompensa, pacote aleatório ou
sorteio, pago ou gratuito.

Nomes de clubes e de atletas aparecem em uso referencial, para simular o futebol brasileiro.
O jogo é independente e não afirma vínculo, patrocínio ou licença de nenhuma entidade.
```

Conta de teste: não é necessária, o app não tem login.
