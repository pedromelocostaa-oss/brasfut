  function pushNews(st, type, txt) { st.news.unshift({ y: st.year, r: st.round + 1, type, txt }); if (st.news.length > 80) st.news.length = 80; }
  // ---------- patrocinio (marcas ficticias do prototipo) ----------
  // empresas reais citadas so pelo nome (sem logo, sem cores da marca) como patrocinadoras no prototipo.
  // Fora da lista de proposito: casas de apostas, bebida alcoolica e tabaco.
  // art: artigo usado nas frases ("fecha com o Itaú", "com a Samsung").
  const BRANDS = [
    ['itau', 'Itaú', 'o', 'Banco'], ['bradesco', 'Bradesco', 'o', 'Banco'], ['bb', 'Banco do Brasil', 'o', 'Banco'], ['caixa', 'Caixa', 'a', 'Banco'],
    ['santander', 'Santander', 'o', 'Banco'], ['nubank', 'Nubank', 'o', 'Banco digital'], ['picpay', 'PicPay', 'o', 'Pagamentos'],
    ['cocacola', 'Coca-Cola', 'a', 'Bebidas'], ['guarana', 'Guaraná Antarctica', 'o', 'Bebidas'], ['pepsi', 'Pepsi', 'a', 'Bebidas'], ['gatorade', 'Gatorade', 'o', 'Bebidas'],
    ['sadia', 'Sadia', 'a', 'Alimentos'], ['seara', 'Seara', 'a', 'Alimentos'], ['nestle', 'Nestlé', 'a', 'Alimentos'], ['piracanjuba', 'Piracanjuba', 'a', 'Alimentos'],
    ['samsung', 'Samsung', 'a', 'Tecnologia'], ['motorola', 'Motorola', 'a', 'Tecnologia'],
    ['vivo', 'Vivo', 'a', 'Telefonia'], ['claro', 'Claro', 'a', 'Telefonia'], ['tim', 'TIM', 'a', 'Telefonia'],
    ['mercadolivre', 'Mercado Livre', 'o', 'Varejo'], ['magalu', 'Magalu', 'o', 'Varejo'], ['casasbahia', 'Casas Bahia', 'a', 'Varejo'], ['renner', 'Renner', 'a', 'Moda'],
    ['natura', 'Natura', 'a', 'Beleza'], ['boticario', 'Boticário', 'o', 'Beleza'], ['ype', 'Ypê', 'a', 'Limpeza'],
    ['petrobras', 'Petrobras', 'a', 'Energia'], ['ipiranga', 'Ipiranga', 'a', 'Combustível'],
    ['latam', 'LATAM', 'a', 'Aviação'], ['gol', 'Gol', 'a', 'Aviação'], ['azul', 'Azul', 'a', 'Aviação'],
    ['unimed', 'Unimed', 'a', 'Saúde'], ['localiza', 'Localiza', 'a', 'Aluguel de carros'], ['fiat', 'Fiat', 'a', 'Automóveis'], ['ifood', 'iFood', 'o', 'Delivery'],
  ].map(([id, name, art, cat]) => ({ id, name, art, cat }));
  const withB = b => `${b.art || 'a'} ${b.name}`;
  // valores em multiplos da base de patrocinio do clube (40% da cota antiga). Cada tipo tem um perfil de risco:
  // longo = seguro e com luvas na assinatura; alto = mais dinheiro agora, renovação depende do desempenho;
  // vitoria = paga mais para quem ganha muito; titulo = aposta alta, só para os favoritos.
  const SPONSOR_KINDS = {
    longo: { label: 'Contrato longo', rounds: 3 * WEEKS, per: 0.95, signing: 3, pitch: (b, c) => `Parceria de três temporadas: ${b} paga luvas na assinatura e não mexe no valor, aconteça o que acontecer.` },
    alto: { label: 'Valor alto', rounds: WEEKS, per: 1.0, pitch: (b, c) => `Uma temporada só, pagando mais. Na renovação, o valor acompanha a campanha do ${c}.` },
    vitoria: { label: 'Bônus por vitória', rounds: 2 * WEEKS, per: 0.65, win: 0.8, pitch: (b, c) => `Fixo menor e um extra a cada vitória do ${c}. Rende mais para quem ganha muito.` },
    titulo: { label: 'Bônus por título', rounds: 2 * WEEKS, per: 0.85, title: 20, pitch: (b, c) => `Se o ${c} ganhar a sua série ou a Copa do Brasil, ${b} paga um bônus grande no fim da temporada.` },
  };
  function sponsorPerf(st) {
    // campanha atual (ou a última) contra o lugar esperado pelo elenco (ranking de força):
    // cada posição acima vale +2%, abaixo −2%, entre −15% e +15%. Na média, um time que rende o que o elenco vale fica em 0%.
    if (st.round === 0 && !(st.history || []).length) return 1;
    const exp = st.board && st.board.rankStrength; if (!exp) return 1;
    const pos = st.round > 0 ? position(st) : st.history[st.history.length - 1].pos;
    return Math.max(0.85, Math.min(1.15, 1 + (exp - pos) * 0.02));
  }
  function sponsorOffers(st) {
    const c = st.clubs[st.coach.club]; const rng = rngFor(st, 'sponsor', st.year, st.round, c.id);
    const base = (c.sponsorBase || Math.round((c.tv || 0) * 0.4 / 1000) * 1000) * sponsorPerf(st);
    const rank = strengthRanks(st, c.div).indexOf(c.id) + 1;
    const kinds = ['longo', rank <= 4 ? 'titulo' : 'vitoria', 'alto'];
    const pool = BRANDS.slice(); const pick = () => pool.splice(Math.floor(rng() * pool.length), 1)[0];
    return kinds.map(k => {
      const K = SPONSOR_KINDS[k]; const b = pick(); const vary = 0.96 + rng() * 0.08;
      const per = Math.round(base * K.per * vary / 1000) * 1000;
      return { kind: k, label: K.label, brand: b, per, rounds: K.rounds, total: per * K.rounds,
        signing: K.signing ? Math.round(base * K.signing * vary / 10000) * 10000 : 0,
        winBonus: K.win ? Math.round(base * K.win * vary / 1000) * 1000 : 0,
        titleBonus: K.title ? Math.round(base * K.title * vary / 10000) * 10000 : 0,
        pitch: K.pitch(withB(b), c.name) };
    });
  }
  function signSponsor(st, i) {
    const o = (st.sponsorOffers || [])[i]; if (!o) return null;
    st.sponsor = { ...o, left: o.rounds, since: { y: st.year, r: st.round + 1 }, earned: 0 };
    st.sponsorOffers = [];
    if (o.signing) { money(st, 'sponsor', o.signing, `Luvas do patrocínio (${o.brand.name})`); st.sponsor.earned += o.signing; }
    pushNews(st, 'club', `${st.clubs[st.coach.club].name} fecha com ${withB(o.brand)}: ${fmt(o.per)} por rodada${o.signing ? ` e ${fmt(o.signing)} de luvas` : ''}${o.winBonus ? ` e ${fmt(o.winBonus)} por vitória` : ''}${o.titleBonus ? ` e ${fmt(o.titleBonus)} se for campeão` : ''}.`);
    return st.sponsor;
  }
  function migrate(st) {
    // marcas antigas (ficticias) viram empresas da lista atual, mantendo os valores do contrato
    const known = b => b && BRANDS.some(x => x.id === b.id);
    if ((st.sponsorOffers || []).some(o => !known(o.brand))) st.sponsorOffers = sponsorOffers(st);
    if (st.sponsor && !known(st.sponsor.brand)) { st.sponsor.brand = BRANDS[hashSeed(st.sponsor.brand.id || 'x') % BRANDS.length]; st.sponsor.pitch = SPONSOR_KINDS[st.sponsor.kind].pitch(withB(st.sponsor.brand), st.clubs[st.coach.club].name); }
    return st;
  }
  function sponsorPending(st) { return !st.sponsor && (st.sponsorOffers || []).length > 0; }

