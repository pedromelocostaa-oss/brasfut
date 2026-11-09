import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _base import pagina

HOJE = "9 de novembro de 2026"
CONTATO = "pedromelocostaa@gmail.com"
OUT = pathlib.Path(__file__).parent.parent / 'app'

priv = f"""
<h1>Política de privacidade</h1>
<p class="data">Última atualização: {HOJE}</p>

<div class="caixa destaque">
<p style="margin:0"><b>O resumo em uma frase:</b> o Prancheta FC roda inteiro no seu aparelho. Não criamos conta, não pedimos cadastro, não temos servidor que guarde o que você joga, e não mandamos nada seu para lugar nenhum.</p>
</div>

<h2>O que não coletamos</h2>
<p>Não coletamos nome, e-mail, telefone, endereço, data de nascimento, localização, lista de contatos, fotos, identificador de propaganda nem dado nenhum sobre você ou sobre quem usa o jogo.</p>
<p>Não usamos ferramenta de análise de uso, não usamos rastreador, não usamos cookie de publicidade e não exibimos anúncios.</p>

<h2>O que fica guardado, e onde</h2>
<p>A sua carreira (clube, elenco, resultados, dinheiro, estrutura, conquistas) é salva no armazenamento do próprio aparelho: no navegador, no espaço do site; no aplicativo, no espaço do aplicativo.</p>
<p>Esses dados <b>não saem do aparelho</b> e nós não temos acesso a eles.</p>
<p>Se você enviar uma imagem de escudo para personalizar um clube, essa imagem é processada e guardada apenas no seu aparelho. Ela não é enviada para nenhum servidor.</p>

<h2>A única conexão externa</h2>
<p>O jogo carrega duas fontes de letra do serviço Google Fonts, em <code>fonts.googleapis.com</code> e <code>fonts.gstatic.com</code>. Para entregar o arquivo, esse serviço recebe o endereço IP do aparelho, como acontece em qualquer acesso a um site. Nós não enviamos nenhuma outra informação junto, e não recebemos nada de volta além do arquivo da fonte.</p>
<p>Depois do primeiro carregamento, o jogo funciona sem internet.</p>

<h2>Crianças e adolescentes</h2>
<p>O jogo é apropriado para crianças e não coleta dados de ninguém, de qualquer idade. Como não há cadastro, não há informação de criança para tratar, armazenar ou compartilhar.</p>
<p>Se e quando passarmos a oferecer conta e salvamento na nuvem, esta política será atualizada antes, e o consentimento de quem exerce a guarda será pedido conforme a Lei 13.709/2018 (LGPD) e a Lei 15.211/2025.</p>

<h2>Compras</h2>
<p>Quando você compra o Passe de Técnico, o pagamento é processado pela App Store, pelo Google Play ou pelo meio de pagamento indicado no site. <b>Nós não vemos e não guardamos número de cartão, chave Pix nem dado bancário.</b> Quem trata esses dados é a loja ou o processador de pagamento, segundo a política de privacidade de cada um.</p>

<h2>Como apagar tudo</h2>
<table>
<tr><th>Onde</th><th>Como</th></tr>
<tr><td>Navegador</td><td>Limpar os dados do site nas configurações do navegador</td></tr>
<tr><td>App instalado</td><td>Desinstalar o aplicativo</td></tr>
</table>
<p>Em qualquer um dos dois casos a carreira é apagada do aparelho e não fica cópia em lugar nenhum, porque nunca existiu cópia fora dele.</p>

<h2>Seus direitos</h2>
<p>A LGPD garante acesso, correção, portabilidade e eliminação dos seus dados pessoais. Como não tratamos dado pessoal nenhum, não há o que acessar, corrigir ou eliminar do nosso lado. Ainda assim, se você tiver qualquer dúvida, escreva para <a href="mailto:{CONTATO}">{CONTATO}</a>.</p>

<h2>Mudanças nesta política</h2>
<p>Se o jogo passar a tratar algum dado, esta página muda antes, com a data de atualização no topo.</p>
"""

termos = f"""
<h1>Termos de uso</h1>
<p class="data">Última atualização: {HOJE}</p>

<h2>1. O que é o Prancheta FC</h2>
<p>O Prancheta FC é um jogo de simulação em que você assume o papel de técnico de futebol. É um jogo independente, feito por uma pessoa física, <b>sem qualquer vínculo, patrocínio, licença ou aprovação da CBF, da Conmebol, de federações estaduais, de ligas, de clubes ou de atletas</b>.</p>

<h2>2. Quem pode usar</h2>
<p>O jogo é apropriado para crianças. Se você tem menos de 18 anos, use com o conhecimento de quem é responsável por você, principalmente antes de qualquer compra.</p>

<h2>3. O que é grátis e o que é pago</h2>
<table>
<tr><th>Parte</th><th>Preço</th></tr>
<tr><td>Campeonato estadual e primeiro turno do Brasileirão, em qualquer carreira</td><td>Grátis, para sempre</td></tr>
<tr><td>Passe de Técnico: temporadas sem limite, Libertadores e Sul-Americana, trocar de clube, várias carreiras</td><td>R$ 49,90, pagamento único</td></tr>
<tr><td>Mesmo conteúdo, cobrado mês a mês</td><td>R$ 12,90 por mês</td></tr>
</table>
<p>Itens cosméticos (uniforme alternativo, tema visual, aparência do técnico) são opcionais e <b>não mudam nada dentro de uma partida</b>. Quem não compra não joga em desvantagem.</p>
<p>O jogo não tem caixa de recompensa aleatória, pacote surpresa, sorteio de jogador nem qualquer mecânica de azar. Não é possível comprar jogador, dinheiro ou vantagem dentro do jogo com dinheiro real.</p>

<h2>4. Pagamento, arrependimento e reembolso</h2>
<p>Compras feitas na App Store ou no Google Play são processadas por eles e seguem as regras de reembolso de cada loja.</p>
<p>Em compras feitas pelo site, o artigo 49 do Código de Defesa do Consumidor garante o direito de arrependimento em até <b>7 dias corridos</b> a contar da compra, com devolução integral do valor. Basta escrever para <a href="mailto:{CONTATO}">{CONTATO}</a>.</p>
<p>A assinatura mensal pode ser cancelada a qualquer momento e vale até o fim do período já pago.</p>

<h2>5. A sua carreira fica com você</h2>
<p>A carreira é salva no seu aparelho. Isso quer dizer que ela depende do aparelho: se você desinstalar o jogo, limpar os dados do navegador ou trocar de celular, a carreira se perde. Não temos cópia dela e não conseguimos recuperá-la.</p>

<h2>6. Nomes, escudos e jogadores</h2>
<p>Nomes de clubes, escudos, nomes de atletas e nomes de competições que aparecem no jogo pertencem aos seus respectivos titulares. O uso aqui é referencial, para simular o futebol brasileiro, e não indica associação, patrocínio ou aval de ninguém.</p>
<p>Se você é titular de um desses direitos e quer que removamos algo, escreva para <a href="mailto:{CONTATO}">{CONTATO}</a> e nós retiramos.</p>

<h2>7. O que você não pode fazer</h2>
<ul>
<li>Vender, alugar ou redistribuir o jogo como se fosse seu</li>
<li>Modificar o jogo para burlar o pagamento ou para prejudicar outras pessoas</li>
<li>Usar o nome ou a identidade visual do Prancheta FC para se passar por nós</li>
</ul>

<h2>8. Sem garantia de funcionamento perfeito</h2>
<p>O jogo é oferecido no estado em que se encontra. Fazemos o possível para que funcione bem, mas não prometemos que ele estará livre de erro ou disponível o tempo todo. Isso não afasta os direitos que o Código de Defesa do Consumidor garante a você.</p>

<h2>9. Mudanças</h2>
<p>Estes termos podem mudar. Mudança relevante é avisada dentro do jogo. Preço já pago em compra única não muda depois.</p>

<h2>10. Lei aplicável</h2>
<p>Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do consumidor para qualquer questão.</p>
"""

suporte = f"""
<h1>Suporte</h1>
<p class="data">Última atualização: {HOJE}</p>

<p>Achou um erro, tem uma dúvida ou quer sugerir alguma coisa? Escreva para <a href="mailto:{CONTATO}">{CONTATO}</a>. Respondemos em até 3 dias úteis.</p>

<h2>Perguntas que chegam sempre</h2>

<h3>Perdi a minha carreira. Dá para recuperar?</h3>
<p>Não. A carreira é salva só no seu aparelho e nós não temos cópia dela. Desinstalar o app ou limpar os dados do navegador apaga a carreira de vez.</p>

<h3>Dá para jogar sem internet?</h3>
<p>Sim. Depois que o jogo abre uma vez, ele funciona offline.</p>

<h3>O jogo é de graça?</h3>
<p>O estadual e o primeiro turno do Brasileirão são grátis para sempre. Depois disso o Passe de Técnico libera o resto: R$ 49,90 uma vez, ou R$ 12,90 por mês.</p>

<h3>Comprei e não liberou</h3>
<p>Se a compra foi na App Store ou no Google Play, abra o jogo conectado à mesma conta que comprou e use a opção de restaurar compras. Se não resolver, escreva para a gente com o recibo da loja.</p>

<h3>Tem anúncio ou coleta de dados?</h3>
<p>Não tem anúncio e não coletamos nenhum dado. Veja a <a href="privacidade.html">política de privacidade</a>.</p>

<h3>Tem caixa de recompensa ou sorteio?</h3>
<p>Não, e não vai ter. O jogo é para criança e não tem nenhuma mecânica de azar.</p>

<h3>Meu clube não está no jogo</h3>
<p>Estão os 156 clubes das Séries A, B, C e D de 2026, mais os clubes da Libertadores e da Sul-Americana. Se o seu time estiver fora dessas competições, ele ainda não está no jogo.</p>
"""

for nome, titulo, desc, corpo in [
    ('privacidade.html', 'Política de privacidade', 'O Prancheta FC roda no seu aparelho e não coleta dado nenhum.', priv),
    ('termos.html', 'Termos de uso', 'Termos de uso do Prancheta FC: o que é grátis, o que é pago e quais são os seus direitos.', termos),
    ('suporte.html', 'Suporte', 'Dúvidas, erros e contato do Prancheta FC.', suporte),
]:
    (OUT / nome).write_text(pagina(titulo, desc, corpo))
    print(nome, len((OUT / nome).read_text()), 'bytes')
