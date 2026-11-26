// Save na nuvem da Prancheta. Login por email e senha e sincronizacao da
// carreira com o Supabase. Sem DOM: so transporte e sessao, para rodar no
// Node e ser testado sem navegador. A tela decide QUANDO sincronizar; aqui
// so tem cadastrar, entrar, sair e subir/baixar a carreira.
(function (root) {
  'use strict';

  // A chave anon e publica de proposito: quem protege os dados e o RLS no banco,
  // nao o segredo da chave. Cada um so le e escreve a propria carreira.
  const URL = 'https://jyncmnjhcfznznggcxef.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bmNtbmpoY2Z6bnpuZ2djeGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NTUzNzYsImV4cCI6MjExMTIzMTM3Nn0.s2roaFeUBbKxdatLoI8-ZD3DezGP851W1MouSzHv9xk';
  const AUTH = URL + '/auth/v1';
  const REST = URL + '/rest/v1';
  const FUNCS = URL + '/functions/v1';
  const CHAVE_SESSAO = 'prancheta.sessao';

  // localStorage no navegador; objeto na memoria no Node, para os testes.
  const mem = {};
  function lsGet(k) { try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return k in mem ? mem[k] : null; } }
  function lsSet(k, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }
  function lsDel(k) { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); else delete mem[k]; } catch (e) { delete mem[k]; } }

  function sessao() { try { return JSON.parse(lsGet(CHAVE_SESSAO) || 'null'); } catch (e) { return null; } }
  function guardaSessao(d) {
    const antes = sessao();
    const s = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expira_em: Date.now() + (d.expires_in || 3600) * 1000,
      user: d.user ? { id: d.user.id, email: d.user.email } : (antes && antes.user)
    };
    lsSet(CHAVE_SESSAO, JSON.stringify(s));
    return s;
  }

  function h(extra) { return Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, extra || {}); }

  function msgErro(cod) {
    const c = String(cod || '').toLowerCase();
    if (/em_uso|already|registered|been taken|exist/.test(c)) return 'Esse email ja tem conta. Tente entrar.';
    if (/senha_curta|password|weak/.test(c)) return 'A senha precisa de pelo menos 6 letras ou numeros.';
    if (/email_invalido|email_address_invalid|invalid.*email/.test(c)) return 'Esse email nao parece valido.';
    if (/invalid_grant|invalid.*login|invalid.*credential/.test(c)) return 'Email ou senha errados.';
    if (/not.*confirm/.test(c)) return 'Essa conta ainda nao foi confirmada.';
    if (/rede|network|fetch|conex/.test(c)) return 'Sem conexao agora. Tente de novo.';
    return 'Nao deu para conectar agora. Tente de novo.';
  }

  async function pega(url, opt) {
    try { return await fetch(url, opt); } catch (e) { return { ok: false, status: 0, _rede: true, json: async () => ({}) }; }
  }

  function estaLogado() { const s = sessao(); return !!(s && s.refresh_token); }
  function usuario() { const s = sessao(); return (s && s.user) || null; }
  function configurada() { return !!URL && !!KEY && URL.indexOf('http') === 0; }

  async function cadastrar(email, senha) {
    email = (email || '').trim().toLowerCase();
    const r = await pega(FUNCS + '/cadastrar', { method: 'POST', headers: h(), body: JSON.stringify({ email, senha }) });
    if (r._rede) return { erro: msgErro('rede') };
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { erro: msgErro(d.erro) };
    return entrar(email, senha);
  }

  async function entrar(email, senha) {
    email = (email || '').trim().toLowerCase();
    const r = await pega(AUTH + '/token?grant_type=password', { method: 'POST', headers: h(), body: JSON.stringify({ email, password: senha }) });
    if (r._rede) return { erro: msgErro('rede') };
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) return { erro: msgErro(d.error_code || d.msg || d.error_description) };
    guardaSessao(d);
    return { ok: true, user: usuario() };
  }

  async function sair() {
    const s = sessao();
    lsDel(CHAVE_SESSAO);
    if (s && s.access_token) { try { await fetch(AUTH + '/logout', { method: 'POST', headers: h({ Authorization: 'Bearer ' + s.access_token }) }); } catch (e) { } }
    return { ok: true };
  }

  // Devolve um access_token valido, renovando pelo refresh_token quando vence.
  // Se o refresh falhar, a sessao caiu: limpa e devolve null (precisa entrar de novo).
  async function token() {
    const s = sessao();
    if (!s || !s.refresh_token) return null;
    if (s.access_token && Date.now() < s.expira_em - 60000) return s.access_token;
    const r = await pega(AUTH + '/token?grant_type=refresh_token', { method: 'POST', headers: h(), body: JSON.stringify({ refresh_token: s.refresh_token }) });
    if (r._rede) return s.access_token || null;
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) { lsDel(CHAVE_SESSAO); return null; }
    guardaSessao(d);
    return d.access_token;
  }

  // Le a carreira guardada na nuvem. Devolve a linha ({dados, jogado_em, ...}) ou null.
  async function baixarSave() {
    const t = await token();
    if (!t) return null;
    const r = await pega(REST + '/saves?select=*', { headers: h({ Authorization: 'Bearer ' + t }) });
    if (r._rede || !r.ok) return null;
    const arr = await r.json().catch(() => []);
    return (arr && arr[0]) || null;
  }

  // Grava (ou sobrescreve) a carreira na nuvem. meta: {clube, temporada, resumo, plano, jogado_em}.
  async function subirSave(dados, meta) {
    const u = usuario();
    const t = await token();
    if (!u || !t) return { erro: 'Entre na conta para salvar.' };
    const corpo = Object.assign({ user_id: u.id, dados: dados }, meta || {});
    const r = await pega(REST + '/saves', {
      method: 'POST',
      headers: h({ Authorization: 'Bearer ' + t, Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(corpo)
    });
    if (r._rede) return { erro: msgErro('rede') };
    if (!r.ok) { const d = await r.json().catch(() => ({})); return { erro: msgErro(d.message || d.code) }; }
    return { ok: true };
  }

  const api = { configurada, estaLogado, usuario, cadastrar, entrar, sair, token, baixarSave, subirSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Nuvem = api;
})(typeof self !== 'undefined' ? self : this);
