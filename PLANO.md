# Brasfut: planejamento completo

Documento vivo. Atualizar junto com o código.
Última revisão: 27 de outubro de 2026.

---

## 1. O que é

Jogo de técnico de futebol brasileiro, para rodar no navegador hoje e virar aplicativo na App Store e na Google Play depois.

- **Público:** crianças e adolescentes, mais quem jogou Brasfoot e Elifoot na infância.
- **Referência:** Brasileirinho FC. A meta é ser melhor que ele, não igual.
- **Princípio:** simples de entender, difícil de dominar. Nenhum número aparece sem uma frase em português explicando a troca.
- **Telas:** celular, tablet e computador, com o mesmo código.

### O que o Brasileirinho ensinou

Levantamos 37 telas do concorrente. Três padrões se repetem em todas e viram regra nossa:

1. **Toda decisão mexe em pelo menos duas moedas.** Dinheiro, tempo e humor da torcida. Nunca só dinheiro.
2. **O jogo avisa quando a compra não vale.** "Ampliar só aumenta o público quando o estádio enche." "Hoje já sobram vagas." Isso constrói confiança e economiza arrependimento.
3. **Nenhum número solto.** Sempre tem uma frase antes do controle dizendo o que a escolha custa.

### O que não vamos copiar

| Item | Motivo |
|---|---|
| Cassino, caça-níquel, roleta e corrida de galgos | Jogo de azar simulado. Bloqueia a categoria infantil nas lojas e é indefensável para o nosso público. |
| Estoque da loja | Nossa simulação mostrou ganho de 0,2% a 0,7% da receita por 5 a 14 cliques. A variação de demanda na temporada é de só 6% a 11%, pequena demais para a aposta valer. Só volta se aumentarmos a variação de propósito. |
| Modo Jogador (criar um garoto de 15 anos) | É outro jogo dentro do mesmo app. Dobra o escopo. Fica para depois do app no ar. |

---

## 2. Onde estamos hoje

Código em `jogo/`, 4.645 linhas. Versão 12 publicada.

| Arquivo | Linhas | Toca a tela? |
|---|---|---|
| `engine.js` | 532 | não |
| `comps.js` | 317 | não |
| `game.js` | 1.694 | não |
| `ui.js` | 1.529 | sim |
| `styles.css` | 554 | - |

**2.543 linhas de regra pura, sem DOM.** Isso migra para qualquer casca de aplicativo sem reescrever nada.

### Já funciona

- **Motor de partida:** chances por minuto, xG, três tipos de finalização, bola parada, pênaltis, cartões, lesões, substituições, cinco mentalidades, cinco personalidades de técnico, pressão da torcida.
- **Competições:** Séries A, B, C e D de 2026 com 156 clubes e 4.165 jogadores reais, 27 estaduais, Copa do Brasil com as cotas reais da CBF.
- **Atributos:** cinco por família de posição, dois por jogador. **1.000 jogadores das Séries A, B e C têm os dois pontos fortes tirados das estatísticas reais de 2026 do SofaScore**, comparando com quem joga na mesma posição e na mesma série. O resto é estimado pelo perfil da posição.
- **Carreira:** meta da diretoria, confiança, demissão, XP, níveis, conquistas, acesso e rebaixamento, virada de temporada.
- **Estrutura:** CT, categorias de base com peneira, estádio com preço de ingresso e três ampliações, loja sem estoque com ídolo e momentos.
- **Vida do técnico:** licenças B, A e Pró, cursos, coletivas com promessas, eventos.
- **Mercado:** comprar, vender, empréstimo simples e com compra obrigatória, propostas recebidas com motivos, venda rápida, leilão, e os clubes da IA negociando entre si.
- **Patrocínio:** quatro tipos de contrato com empresas reais citadas por nome.
- **Extras:** times salvos, cobradores de bola parada, capitão, verba da diretoria.

### Pronto e não publicado

**Libertadores e Sul-Americana.** Grupos reais do sorteio de 2026, 15 datas de meio de semana, playoff, mata-mata, prêmios da CONMEBOL convertidos a R$ 5,30 por dólar, vagas para o ano seguinte, sorteio por potes de 2027 em diante, efeito de altitude e aba própria na tabela. Testado em duas temporadas seguidas sem erro.

**Falta:** coletar os elencos dos 51 clubes estrangeiros no Transfermarkt. A coleta parou em 7 de 51 e o robô já está escrito.

### Onde já somos melhores

- **Atributos com fonte.** O Neymar deles tem passe 91. O nosso tem finalização 90 e drible 89, tirado do que ele fez em campo em 2026.
- **Séries C e D completas** com 156 clubes, contra os 20 por série do concorrente em algumas telas.

---

## 3. A decisão que trava tudo: calendário por data

**Este é o único item que precisa ser decidido antes de qualquer função nova.**

### O problema

Nosso calendário é por semana. São 73 datas (58 semanas mais 15 de meio de semana) e o dinheiro anda a cada data: cota de TV por semana, folha por semana, bilheteria por jogo.

O Brasileirinho roda por data real, e **a economia inteira dele é mensal**:

- salário pago no dia 1º
- cota mensal de TV, patrocínio e sócios
- campanha de marketing de 30 dias
- preço do ingresso trocado a cada 30 dias
- obra de 46 dias, de 90 dias, de 2,5 anos
- contrato de patrocínio de 24 ou 33 meses
- olheiro que entrega em 150 dias
- parcelamento em 6×, 12×, 4 anos, 8 anos
- negócio pessoal que dá resultado todo dia 1º

Quase toda função que queremos copiar está amarrada em dias e meses. Se insistirmos em semanas, cada uma delas chega traduzida errado e o jogo fica incoerente.

### O que muda

| Arquivo | Mudança |
|---|---|
| `comps.js` | Cada entrada do calendário ganha uma data real. Primeira rodada em janeiro, última em dezembro. |
| `game.js` | Dinheiro passa de semanal para mensal. Fechamento no dia 1º. Janelas por data. Contratos em meses. Obras em dias. |
| `ui.js` | Todo lugar que diz "semana 14 de 58" passa a dizer "sáb, 17 jan 2026" e "em 16 dias". |

**Custo:** [Estimativa] é o maior refactor do projeto. Dois a três dias de trabalho concentrado, com risco de quebrar coisa que hoje funciona.

**Por que agora:** fazer depois de construir dez funções novas em cima de semanas custa três vezes mais. O refactor é uma vez só.

**Decisão do Pedro:** converter agora, ou assumir que vamos adaptar cada função do concorrente para semanas e perder a coerência.

---

## 4. Tudo que vamos construir

Dez frentes. Dentro de cada uma, as funções em ordem de impacto.

### Frente A: Fundação

| # | Função | Observação |
|---|---|---|
| A1 | Repositório no GitHub | Feito |
| A2 | Calendário por data real e dinheiro mensal | Ver seção 3 |
| A3 | Três humores separados: diretoria, torcida, elenco | Hoje temos moral do elenco e confiança da diretoria. Falta a torcida como número próprio. Quase toda função nova encosta nele. |
| A4 | Torcida que cresce com títulos, até +80% de público | Hoje `fan` é constante para sempre. Vira variável de carreira. |
| A5 | Base de preços por clube | Uma constante por clube escala toda a economia. O concorrente usa uma, e conferimos 25 preços que são múltiplos limpos dela. |
| A6 | Caixa do clube fixo no topo de toda tela | Você nunca precisa lembrar quanto tem. |

### Frente B: Diretoria e dinheiro

| # | Função | O que muda no jogo |
|---|---|---|
| B1 | **Meta negociada** com três saídas: aceitar, prometer mais, pedir menos | Aceitar trava a cobrança até o fim do ano. Prometer mais dá +5 de confiança e +5% no teto da folha, mas pesa se falhar. Pedir menos exige confiança alta. Não responder deixa a meta subindo junto com o elenco. |
| B2 | Reunião de meio de temporada | Reavaliação por turno |
| B3 | **Pedidos com trava visível:** mais teto para a folha, aumento do técnico, verba para reforços | Cada um mostra a regra e o seu número atual. Você sabe exatamente o que falta. |
| B4 | **Preço do ingresso em cinco faixas** com efeito assimétrico | Popular dá +1 de torcida por jogo em casa, até +3 no mês. Caro tira 1 **só quando você perde em casa**. Cobrar caro é de graça enquanto você vence. |
| B5 | **Campanhas de marketing**, uma por vez, 30 dias | Sócio-torcedor faz o quadro crescer. Camisa nova faz a loja vender 30% a mais. Clube na escola dá torcida na hora e não devolve dinheiro nenhum. |
| B6 | Sócios como linha de receita | Terceira perna da cota mensal, junto com TV e patrocínio |
| B7 | Conselho de torcedores | A torcida pede reunião quando tem problema de verdade |
| B8 | Caixa inicial como escolha de risco | Enxuto com diretoria paciente, padrão, ou ambicioso que cobra mais a cada derrota |

### Frente C: Estádio

| # | Função | O que muda no jogo |
|---|---|---|
| C1 | **Melhorias com pontos de estrutura** | Cadeiras, mosaico, anel de LED, fogos, telão, refletores. Cada uma aparece na arquibancada. Fogos valem só pela temporada, então é gasto que volta. |
| C2 | **Caldeirão** | Gols esperados a mais em casa, e **só liga com as três coisas juntas**: estádio cheio, torcida feliz e estrutura. Dinheiro sozinho não compra. |
| C3 | **Ampliação por anéis e lados** | Doze obras em três anéis de quatro lados. Cada obra fecha parte da arquibancada e você perde bilheteria enquanto dura. |
| C4 | Parcelamento com a parcela mostrada como % da receita do mês | É o jeito de ensinar finanças sem planilha |
| C5 | **Arena nova** | Estádio próprio, o dobro por lugar, anos de obra, muda na inauguração com festa |
| C6 | **Naming rights** | Marca paga por mês mais luvas. Estádio tradicional custa 2 pontos de humor na assinatura, uma vez só. Os jogos antigos ficam com o nome da época. |
| C7 | Estacionamento, cinco níveis | Receita derivada do público. Só vira dinheiro depois que você encheu o estádio. |

### Frente D: CT, base e saúde

| # | Função | O que muda no jogo |
|---|---|---|
| D1 | **Foco de treino**, cinco opções | Equilibrado, técnico, finalização, tático, físico. Vale pelos dias em que ficou ativo e quem não é o alvo cresce menos. |
| D2 | **Comissão técnica paga** | Analista por mês libera relatório do técnico de qualquer clube. Hoje isso é desbloqueio de nível no nosso jogo. |
| D3 | **Sub-20 estadual** | Catorze jogos contra as bases do estado, com tabela. Quem joga evolui mais. Tira a base de ser loteria. |
| D4 | **Treino de posição** | Quatro vagas, 40 dias, taxa por jogador. Tira o desconto de improvisado, que o nosso motor já calcula. Até 23 anos é mais rápido, dos 30 em diante mais lento, goleiro não treina. |
| D5 | **Potencial que fica mais preciso a cada mês na base** | Hoje a faixa depende do nível da base. Passa a depender do tempo. Premia paciência. |
| D6 | Relatório da base | Custo no ano, crias no elenco, valor dos crias, vendas. Responde se a base se paga. |
| D7 | **Departamento médico com macas** | Capacidade limitada. Com tudo ocupado, a próxima lesão volta 15% mais tarde. Ampliar dá mais maca e lesão mais curta. |

### Frente E: Loja

| # | Função | O que muda no jogo |
|---|---|---|
| E1 | **Preço em três faixas** | Popular, normal, premium, cada um com efeito na torcida |
| E2 | **Terceira camisa** | Editor com treze padrões e duas cores. Uma por temporada, com custo de produção. As vendas sobem no lançamento e **o time estreia a camisa no jogo seguinte**. Criar, gastar, ver vender e ver em campo. |
| E3 | Mais vendidos da semana e camisas por jogador | Liga o elenco à loja. Vender o craque passa a doer de um jeito visível. |
| E4 | Craques do elenco como multiplicador | Melhor que o nosso ídolo único: conta quantos, então vender um não derruba tudo |
| E5 | Quiosque que vira loja | Obra, vende mais, manutenção sobe |

### Frente F: Elenco e partida

| # | Função | O que muda no jogo |
|---|---|---|
| F1 | **Três cobradores em ordem** por pênalti, falta e escanteio | Bate o primeiro que estiver em campo. Se sair, vai o segundo. Hoje temos um só. |
| F2 | **Nota de cobrança que muda com o aproveitamento** | Quem erra vai caindo, quem converte sobe. Hoje a nossa é fixa. |
| F3 | Mapa de onde ele bateu na carreira | Puro sabor, e criança adora |
| F4 | Banco e reservas separados, com a ordem valendo como fila de substituição | Resolve o problema de quem não quer microgerenciar |
| F5 | Auxiliar que faz até três trocas entre 58' e 85' | Dá para ser preguiçoso e o time não desanda |
| F6 | **Números de camisa**, em lista e em cabide | Zero mecânica, puro pertencimento |
| F7 | Estatísticas da temporada em seis painéis | Jogos, artilheiros, assistências, notas, evolução, disciplina. Com corte de 15 minutos para contar jogo e ganhar nota. |
| F8 | Trocas sugeridas e deixar a IA escalar | Porta de entrada para quem abriu o jogo pela primeira vez |

### Frente G: Mercado

| # | Função | O que muda no jogo |
|---|---|---|
| G1 | **Olheiro** | Busca paga que entrega em 150 dias e traz os cinco de maior teto de evolução. Dois trabalhos ao mesmo tempo. Você contrata hoje pensando na janela que vem. |
| G2 | **Etiquetas de disposição** | Intocável, só sai por proposta alta, negociável, e rival pede 20% a mais. Mostra antes de você perder tempo. |
| G3 | Etiqueta de homônimo | Detalhe de quem usou o próprio produto |
| G4 | Favoritos, até 30 | Lista de alvos que atravessa as janelas |
| G5 | **Diagnóstico "caro para o nível"** | Marca quem ganha fora da curva. Diz onde cortar, em vez de só listar. |
| G6 | Contratos por ano com renovação e vencimento à vista | "Nenhum vence em 2026, doze vencem em 2027" |

### Frente H: Vida do técnico

| # | Função | O que muda no jogo |
|---|---|---|
| H1 | **Patrimônio separado do caixa do clube** | O salário cai na sua conta todo dia 1º. Você nunca gasta dinheiro do clube com você. |
| H2 | **Cotas do clube** | Você investe no clube onde trabalha. Cada cota vale 1% da receita anual e o dinheiro entra no caixa. Quatro efeitos: diretoria mais tolerante, dividendos se fechar no azul, valor que sobe com acesso e cai com rebaixamento, e venda limitada na saída. É a melhor ideia da pesquisa inteira. |
| H3 | **Negócios pessoais** | Escolinha, loja de artigos esportivos, restaurante. Resultado no dia 1º, e a gestão cai 3 pontos por mês sem cuidado. Gancho de volta. |
| H4 | Ranking de técnicos | Mistura você e a IA, com pontos, aproveitamento e títulos |
| H5 | Técnicos livres | Quando um clube da IA demite, contrata dessa lista |
| H6 | Casa do técnico | Sair do aluguel como progressão pessoal |
| H7 | Clube social **sem jogo de azar** | Velha, damas, Lig 4 e ranking contra outros técnicos. Sem cassino e sem galgos. |

### Frente I: Apresentação

| # | Função | O que muda no jogo |
|---|---|---|
| I1 | **Escudos dos clubes** | Depende da documentação de direitos. Ver seção 7. |
| I2 | **Mapa do clube** | Navegação por lugar em vez de aba. Estádio, loja, CT, sede, museu, departamento médico, sala de imprensa, sua casa, estacionamento. Com hora, clima e as pendências marcadas nos prédios. Para criança isso pesa muito. |
| I3 | **"Para resolver"** | Todas as pendências com prazo num lugar só, na central |
| I4 | Estrelas e ATA/MEI/DEF na escolha do clube | Seletor de dificuldade sem chamar de dificuldade |
| I5 | Ver o elenco antes de assumir | Provar o clube antes de se comprometer |
| I6 | Prova social na entrada | "6.099 carreiras começaram por aqui" |

### Frente J: Social

| # | Função | Observação |
|---|---|---|
| J1 | Liga com amigos | Cada amigo comanda um clube do mesmo campeonato. Já temos a tela de prévia. Depende de servidor. |
| J2 | X1 | Partida avulsa contra outro técnico |
| J3 | Comunidade | Canal fora do jogo |

---

## 5. Ordem de construção

Princípio: terminar o que está começado, depois fundação, depois conteúdo por impacto, e a casca do app por último.

| Fase | Conteúdo | Por que nesta ordem |
|---|---|---|
| **0** | Fechar Libertadores e Sul-Americana e publicar | Já está pronto e testado. Falta só a coleta dos elencos. |
| **1** | Frente A completa | Fundação. Tudo depois depende disso. |
| **2** | Frente B (diretoria e dinheiro) | Bloco mais rico. Muda a carreira inteira e usa toda a fundação. |
| **3** | Frente C (estádio) | Maior ralo de dinheiro do jogo. Dá para onde gastar o que a fase 2 fez entrar. |
| **4** | Frente D (CT, base e saúde) | Dá sentido à base, que hoje é loteria. |
| **5** | Frente F (elenco e partida) | Melhora o que a pessoa toca todo jogo. |
| **6** | Frente E (loja) | A terceira camisa sozinha vale a fase. |
| **7** | Frente G (mercado) | Nosso mercado já é bom. Isso é refino. |
| **8** | Frente H (vida do técnico) | Camada que prende quem já jogou uma temporada. |
| **9** | Frente I (apresentação) | Fazer depois do conteúdo, para não desenhar tela que vai mudar. |
| **10** | Aplicativo: conta, save na nuvem, assinatura, lojas | Ver seção 6. |
| **11** | Frente J (social) | Depende de servidor, que a fase 10 já terá construído. |

Essa ordem não é sagrada. Se você quiser puxar a terceira camisa ou o mapa para frente porque é o que mais encanta criança, eu concordo e a gente troca.

---

## 6. Aplicativo e monetização

### A parte técnica

**Boa notícia:** 2.543 das 4.645 linhas são regra pura, sem tela. Isso roda em qualquer casca sem reescrever.

[Inferência] Com Capacitor dá para empacotar o que já existe para iOS e Android sem refazer a interface, que já funciona em 390px de largura. Não é a única opção, mas é a que aproveita o que temos. As alternativas (React Native, Flutter) exigem reescrever as 1.529 linhas de interface.

**O que não migra:** o save. Hoje é `localStorage` com a chave `prancheta.v1`. Aplicativo com assinatura precisa de:

- conta e login
- carreira salva no servidor, para o jogador trocar de aparelho
- validação da compra junto à loja
- [Não verificado] consentimento dos pais, se o app for declarado para crianças

Todo o estado do jogo é um objeto JSON só, então trocar a camada de save continua barato mesmo daqui a meses. Por isso a fase 10 pode esperar.

### A parte do dinheiro

Sua ideia: jogar o estadual de graça, depois assinatura de R$ 30 por mês.

Antes de fechar nisso, quatro pontos.

**1. O estadual é curto.** São 11 das 58 semanas. [Estimativa] 30 a 60 minutos de jogo. Você cobra antes da criança ter investido alguma coisa.

**2. Quem paga não é quem joga.** Criança não tem cartão. Convencer o pai exige que o filho já esteja preso ao jogo. Uma hora é pouco para isso.

**3. R$ 30 por mês é caro para o segmento.** [Não verificado] Não consigo confirmar os valores de assinatura de jogo mobile no Brasil hoje sem pesquisar. [Não verificado] A loja fica com uma parte da assinatura, comumente citada em 30% caindo para 15% depois de um ano, então R$ 30 viram uns R$ 21.

**4. O Brasileirinho monetiza largura, não tempo.** O jogo brasileiro inteiro é grátis para sempre. Você paga para destravar o resto do mundo e virar apoiador. Isso converte menos gente, mas não expulsa ninguém.

**Quatro desenhos possíveis:**

| Modelo | Como funciona | A favor | Contra |
|---|---|---|---|
| **A. Paywall no estadual** | sua ideia | Converte cedo, receita rápida | Cobra antes de prender. Alto risco de abandono. |
| **B. Uma temporada inteira grátis** | paga a partir de 2027 | [Estimativa] 4 a 8 horas antes de cobrar. A criança passa por acesso, mercado e título. | Demora mais para a primeira receita |
| **C. Brasil grátis, resto pago** | modelo do concorrente | Nunca expulsa ninguém. Comunidade cresce. | Exige construir "o resto do mundo", que é muito trabalho |
| **D. Compra única** | destrava tudo, uma vez | [Inferência] Pai prefere pagar uma vez a assinar. Menos cancelamento e menos estorno. | Sem receita recorrente |

**Minha recomendação:** testar B ou D antes de A. Mas é a sua chamada, e dá para mudar depois do app no ar.

**Decidido em 27/10/2026: modelo A.** Fica registrado que eu recomendei outro. O desenho do paywall tem que compensar o ponto fraco do A, que é cobrar antes de prender. Duas ideias para a fase 10: estender o grátis até o fim do primeiro turno da Série A em vez de parar no estadual, e deixar a carreira salva visível na tela de pagamento, para o pai ver o que o filho construiu.

**Outra linha de receita que o concorrente já usa:** publicidade de marca dentro do jogo, declarada. A proposta de patrocínio "hoov" vem marcada como parceiro pagante. Isso tem implicação regulatória séria para público infantil, na seção 7.

---

## 7. Conformidade e direitos

Nada aqui está verificado. São os pontos que precisam de resposta antes do app, não depois.

### Público infantil

- [Não verificado] A categoria Kids da App Store tem regras próprias sobre publicidade de terceiros e coleta de dados.
- [Não verificado] A LGPD exige consentimento dos pais para tratar dado de criança.
- [Não verificado] A Resolução 163/2014 do CONANDA trata como abusiva a publicidade dirigida a criança. Isso afeta diretamente a ideia de vender presença de marca dentro do jogo.
- [Não verificado] O ECA Digital (Lei 15.211/2025) traz obrigações para plataformas com público menor de idade.

**Decisão que muda o produto:** o app vai ser declarado para crianças nas lojas, ou para público geral? A resposta muda cadastro, publicidade, assinatura e as próprias regras do jogo.

### Marcas e imagem

O concorrente usa logo de patrocinador (hoov, Bradesco, Sadia, Mercado Livre, Samsung), escudo de clube e foto de jogador. Tem "Parceiros do jogo" e "Créditos das imagens" no rodapé.

Nós combinamos o contrário: nome da empresa escrito, sem logo e sem a cor da marca.

Você disse que tem permissão para os escudos. A pergunta que muda o projeto:

**A permissão cobre escudo, nome de clube, nome e foto de jogador, e logo de patrocinador? E vale para distribuição paga em loja de aplicativo?**

[Inferência] Jogo grátis no navegador e app pago em loja são situações diferentes. A loja pode pedir prova antes de aprovar.

Se a resposta for parcial, dá para desenhar o app usando só o que está coberto. Melhor saber agora.

---

## 8. Decisões em aberto

### Já decididas (27 de outubro de 2026)

| # | Decisão | Resposta do Pedro |
|---|---|---|
| 1 | Calendário | Converter para data real e dinheiro mensal. Decisão delegada a mim; eu escolhi converter. |
| 2 | Monetização | **Modelo A**: estadual grátis, depois assinatura. Eu recomendei B ou D e ele escolheu testar o A. A decisão é reversível antes da fase 10. |
| 4 | Direitos de imagem | Tudo real: marca, escudo, nome de jogador. Ver a ressalva abaixo. |

**Ressalva que eu registro aqui porque ela não foi respondida:** "tudo real" cobre escudo e nome de clube e de jogador, que é o que a permissão dele alcança. Não cobre automaticamente logo de patrocinador de terceiro (Bradesco, Sadia, Mercado Livre, Samsung) nem foto de jogador de agência, que são direitos de outros donos. Eu não baixo nem desenho logo de marca; eu embuto o arquivo que o Pedro mandar.

### Ainda em aberto

| # | Decisão | Trava o quê |
|---|---|---|
| 3 | App declarado para crianças ou público geral | Cadastro, publicidade, assinatura |
| 5 | Ordem das fases: segue a da seção 5 ou puxa alguma coisa para frente | O que eu começo depois da fase 0 |

---

## 9. Como trabalhamos

- Uma fase por vez, com teste e publicação no fim de cada uma.
- Nada entra sem simulação. Toda regra de economia é conferida com temporada simulada antes de ir para a tela.
- Afirmação sem fonte vem marcada com [Inferência], [Especulação] ou [Não verificado].
- O que não dá para verificar, eu digo que não dá.
