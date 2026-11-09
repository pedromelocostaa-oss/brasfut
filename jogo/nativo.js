// Camada nativa do Prancheta FC. Dentro do app (Capacitor) liga splash, barra de status,
// vibração de verdade, botão voltar do Android e salvamento ao sair. No navegador tudo vira
// função vazia, então o mesmo arquivo roda nos dois lugares sem mudar nada.
(() => {
  if (typeof window === 'undefined') return; // roda só no navegador; as simulações em Node ignoram
  const Cap = window.Capacitor;
  const nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const P = (nativo && Cap.Plugins) || {};
  const plataforma = nativo ? Cap.getPlatform() : 'web';
  const nada = () => {};
  const tenta = (f) => { try { const r = f(); if (r && r.catch) r.catch(nada); } catch (e) { /* plugin ausente: segue */ } };

  // Vibração. No iPhone o navigator.vibrate não existe, então sem isso o gol não dá retorno nenhum.
  // IMPACT: leve, médio, pesado. NOTIFICATION: sucesso, aviso, erro.
  const IMPACTO = { leve: 'LIGHT', medio: 'MEDIUM', pesado: 'HEAVY' };
  function vibrar(tipo = 'medio') {
    if (!nativo || !P.Haptics) { try { navigator.vibrate && navigator.vibrate(tipo === 'pesado' ? [60, 40, 90] : 30); } catch (e) { /* sem vibração */ } return; }
    tenta(() => P.Haptics.impact({ style: IMPACTO[tipo] || 'MEDIUM' }));
  }
  function aviso(tipo = 'SUCCESS') {
    if (!nativo || !P.Haptics) return vibrar('medio');
    tenta(() => P.Haptics.notification({ type: tipo }));
  }

  // Barra de status acompanha o tema do jogo
  function barra(escuro) {
    if (!nativo || !P.StatusBar) return;
    tenta(() => P.StatusBar.setStyle({ style: escuro ? 'DARK' : 'LIGHT' }));
    if (plataforma === 'android') tenta(() => P.StatusBar.setBackgroundColor({ color: escuro ? '#0D1512' : '#E9EEEA' }));
  }
  function temaEscuro() {
    const raiz = document.documentElement.getAttribute('data-theme');
    if (raiz === 'dark') return true;
    if (raiz === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  let voltar = null;   // o jogo registra o que fazer no botão voltar
  let saindo = null;   // o jogo registra o que salvar quando o app vai para segundo plano
  let pronto = false;

  const api = {
    nativo, plataforma,
    vibrar, aviso,
    gol: () => aviso('SUCCESS'),
    levouGol: () => aviso('ERROR'),
    toque: () => vibrar('leve'),
    // chamado pelo jogo assim que a primeira tela aparece: tira o splash
    pronto() {
      if (pronto) return; pronto = true;
      barra(temaEscuro());
      if (nativo && P.SplashScreen) tenta(() => P.SplashScreen.hide({ fadeOutDuration: 250 }));
    },
    aoVoltar(fn) { voltar = fn; },
    aoSair(fn) { saindo = fn; },
  };
  window.__nat = api;

  if (!nativo) return;

  // Botão voltar do Android: fecha o painel aberto, volta para a Central, e só então sai do app.
  if (P.App) {
    tenta(() => P.App.addListener('backButton', () => {
      const tratou = voltar && voltar();
      if (!tratou) tenta(() => P.App.exitApp());
    }));
    // app foi para segundo plano: salva na hora, porque o sistema pode matar o processo
    tenta(() => P.App.addListener('appStateChange', (st) => { if (!st.isActive && saindo) saindo(); }));
    tenta(() => P.App.addListener('pause', () => { if (saindo) saindo(); }));
  }

  // tema do sistema mudou com o app aberto
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const ouve = () => barra(temaEscuro());
    mq.addEventListener ? mq.addEventListener('change', ouve) : mq.addListener(ouve);
  }
})();
