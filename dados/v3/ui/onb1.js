    if (o.step === 1) {
      const tmp = window.__preview || (window.__preview = G.newCareer(20261003, 'FLA', 'x', 'motivador'));
      const d = o.div || 'A'; const n = G.divClubs(tmp, d).length;
      return `<div class="onb stack">
        <div class="row between"><span class="brand">Pran<i>cheta</i> FC</span><span class="tag">Protótipo · temporada 2026</span></div>
        ${U.oldSave ? '<div class="notice warn small">Sua carreira anterior era de uma versão antiga do jogo, sem as Séries B, C e D, e não pôde ser carregada. Comece uma nova.</div>' : ''}
        <h1>Escolha<br>o seu <i>clube</i>${hint('O número é a força: média das 11 maiores notas do elenco. Favorito tem meta alta e diretoria impaciente; azarão tem meta menor e mais paciência.')}</h1>
        <p class="muted" style="max-width:62ch">Os 156 clubes das Séries A, B, C e D de 2026. O número é a força dos titulares e o rótulo diz o papel do clube na série. Começar por baixo e subir de série é o caminho mais longo; na Série A a cobrança é maior.</p>
        <div class="seg wide" role="tablist">${['A', 'B', 'C', 'D'].map(x => `<button role="tab" data-act="onbDiv" data-v="${x}" aria-pressed="${d === x}">${DIVN[x]} <span class="muted">${G.divClubs(tmp, x).length}</span></button>`).join('')}</div>
        <label class="sr" for="club-q">Buscar clube</label><input id="club-q" class="txt" placeholder="Buscar clube, cidade ou estado" value="${esc(o.q || '')}" autocomplete="off">
        <div class="club-grid">${clubCards()}</div>
        <div class="row" style="gap:10px">${crestMultiBtn('btn')}<span class="small muted">${Object.keys(CRESTS).length ? `${Object.keys(CRESTS).length} de ${E.CLUBS.length} escudos carregados.` : 'Tem os arquivos oficiais dos escudos? Carregue aqui ou depois em Clube.'}</span></div>
        <p class="tiny muted">Elencos reais e completos das Séries A, B, C e D de 2026 (Transfermarkt, 3 de outubro de 2026); clubes, estádios e capacidades da Wikipédia. Notas e atributos são estimativas do protótipo a partir do valor de mercado, da idade, dos minutos jogados e dos gols e assistências de 2026. Elencos com menos de 23 jogadores são completados com garotos da base de nomes gerados, e os que surgem nas temporadas seguintes também são fictícios.</p>
      </div>`;
    }
