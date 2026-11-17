const NUVEM_ATIVA = Boolean(SUPABASE_URL && SUPABASE_KEY && window.supabase);
const sb = NUVEM_ATIVA ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let usuario = null;
let versaoNuvem = '';
let salvandoNuvem = false;
let pendenteNuvem = false;
let timerNuvem;
let timerTentar;
let conflitosSeguidos = 0;
const CHAVE_PENDENTE = CHAVE + '-pendente';

const STATUS_NUVEM = {
  salvo: ['check', 'Salvo na nuvem'],
  salvando: ['cloud', 'Salvando…'],
  offline: ['cloud', 'Sem internet · salvo neste aparelho'],
  erro: ['alert', 'Não salvou na nuvem · tentando de novo'],
  local: ['save', 'Salvo neste navegador'],
};

function statusNuvem(tipo) {
  const el = $('#status-nuvem');
  if (!el) return;
  const [icone, texto] = STATUS_NUVEM[tipo];
  el.className = 'status-nuvem ' + tipo;
  el.innerHTML = `${ic(icone, 'p')}<span>${texto}</span>`;
  el.title = texto;
}

async function iniciarNuvem() {
  if (!NUVEM_ATIVA) { statusNuvem('local'); return true; }
  const { data } = await sb.auth.getSession();
  usuario = data.session?.user || null;
  if (!usuario) {
    location.href = 'login.html';
    return false;
  }
  const dono = localStorage.getItem(CHAVE + '-dono');
  if (dono && dono !== usuario.id) {
    estado = dadosIniciais();
    localStorage.removeItem(CHAVE_PENDENTE);
  }
  try { localStorage.setItem(CHAVE + '-dono', usuario.id); } catch { }
  await baixarDados();
  statusNuvem(navigator.onLine ? 'salvo' : 'offline');

  sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') location.href = 'login.html'; });
  window.addEventListener('focus', verificarOutroAparelho);
  ouvirOutrosAparelhos();
  setInterval(() => { if (document.visibilityState === 'visible') verificarOutroAparelho(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificarOutroAparelho(); });
  window.addEventListener('online', () => { statusNuvem('salvando'); enviarDados(); });
  window.addEventListener('offline', () => statusNuvem('offline'));
  return true;
}

const PARTES = ['listas', 'diario', 'treino', 'pets', 'flashcards', 'financas', 'jejum', 'appsEstudo'];
let partesOk = null;
const versoesPartes = {};
const enviadoPartes = {};
let enviadoPrincipal = '';

const ehFaltaTabela = (e) => /central_partes|42P01|PGRST205|does not exist/.test(`${e?.code} ${e?.message}`);

function separarEstado(est) {
  const principal = { ...est };
  const partes = {};
  PARTES.forEach((k) => { if (k in principal) { partes[k] = principal[k]; delete principal[k]; } });
  return { principal, partes };
}

let verificando = false;
async function verificarOutroAparelho() {
  if (!usuario || salvandoNuvem || pendenteNuvem || !navigator.onLine || verificando) return;
  verificando = true;
  try {
    const { data } = await sb.from('central_dados').select('atualizado_em').eq('user_id', usuario.id).maybeSingle();
    let mudou = data && !mesmaVersao(data.atualizado_em, versaoNuvem);
    if (!mudou && partesOk) {
      const r = await sb.from('central_partes').select('chave, atualizado_em').eq('user_id', usuario.id);
      mudou = (r.data || []).some((x) => !mesmaVersao(x.atualizado_em, versoesPartes[x.chave]));
    }
    if (mudou) await baixarDados(true);
  } catch { }
  verificando = false;
}

function ouvirOutrosAparelhos() {
  if (!sb.channel) return;
  try {
    sb.channel(`central-${usuario.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'central_dados', filter: `user_id=eq.${usuario.id}` }, (p) => {
        if (p.new?.atualizado_em && !mesmaVersao(p.new.atualizado_em, versaoNuvem)) verificarOutroAparelho();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'central_partes', filter: `user_id=eq.${usuario.id}` }, (p) => {
        if (p.new?.chave && !mesmaVersao(p.new.atualizado_em, versoesPartes[p.new.chave])) verificarOutroAparelho();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'central_diario', filter: `user_id=eq.${usuario.id}` }, (p) => {
        const r = p.new && p.new.dia ? p.new : null;
        const dia = r?.dia || p.old?.dia;
        if (!dia || diarioTimers[dia]) return;
        if (r) diarioMem[dia] = { bom: r.bom || ['', '', ''], texto: r.texto || '' };
        else delete diarioMem[dia];
        diarioStatus.listaPronta = false;
        if (['#bemestar', '#revisao'].includes(location.hash)) desenharSeguro();
      })
      .subscribe();
  } catch { }
}

async function baixarPartes() {
  const r = await sb.from('central_partes').select('chave, dados, atualizado_em').eq('user_id', usuario.id);
  if (r.error) {
    if (ehFaltaTabela(r.error)) { partesOk = false; return {}; }
    throw r.error;
  }
  partesOk = true;
  const out = {};
  (r.data || []).forEach((x) => { out[x.chave] = x; });
  return out;
}

async function baixarDados(soSeMudou = false) {
  const { data, error } = await sb.from('central_dados')
    .select('dados, atualizado_em').eq('user_id', usuario.id).maybeSingle();
  if (error) { if (!soSeMudou) avisar('Não consegui buscar seus dados na nuvem.'); return; }
  let partes = {};
  try { partes = await baixarPartes(); } catch { if (!soSeMudou) avisar('Não consegui buscar parte dos seus dados na nuvem.'); return; }
  if (!data && !Object.keys(partes).length) {
    if (localStorage.getItem(CHAVE_PENDENTE) !== usuario.id && !donoLocalProprio()) estado = dadosIniciais();
    await enviarDados();
    return;
  }
  const mudouPartes = Object.values(partes).some((x) => !mesmaVersao(x.atualizado_em, versoesPartes[x.chave]));
  if (soSeMudou && data && mesmaVersao(data.atualizado_em, versaoNuvem) && !mudouPartes) return;
  if (soSeMudou && (salvandoNuvem || pendenteNuvem)) return;
  versaoNuvem = data?.atualizado_em || '';
  const remoto = { ...(data?.dados || {}) };
  let precisaMigrar = false;
  PARTES.forEach((k) => {
    if (partes[k]) {
      remoto[k] = partes[k].dados;
      versoesPartes[k] = partes[k].atualizado_em;
      enviadoPartes[k] = JSON.stringify(partes[k].dados);
    } else if (partesOk && k in remoto) {
      precisaMigrar = true;
      delete versoesPartes[k];
      delete enviadoPartes[k];
    }
  });
  enviadoPrincipal = data && !precisaMigrar ? JSON.stringify(data.dados) : '';
  const tinhaPendente = !soSeMudou && localStorage.getItem(CHAVE_PENDENTE) === usuario.id;
  if (tinhaPendente) {
    const apagados = new Set([...(estado.lixeira || []), ...(remoto.lixeira || [])].map((x) => x.id));
    estado = completar(mesclar(estado, remoto, apagados));
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    salvarNuvem();
    return;
  }
  estado = completar(remoto);
  localStorage.setItem(CHAVE, JSON.stringify(estado));
  if (precisaMigrar) salvarNuvem();
  if (soSeMudou) {
    desenharSeguro();
    avisar('Sincronizado com o que você mudou em outro aparelho.');
  }
}

function donoLocalProprio() { return localStorage.getItem(CHAVE + '-dono') === usuario.id && estado.config.boasVindas; }

const mesmaVersao = (a, b) => Boolean(a && b) && new Date(a).getTime() === new Date(b).getTime();

function salvarNuvem() {
  if (!NUVEM_ATIVA || !usuario) return;
  clearTimeout(timerNuvem);
  pendenteNuvem = true;
  try { localStorage.setItem(CHAVE_PENDENTE, usuario.id); } catch { }
  statusNuvem(navigator.onLine ? 'salvando' : 'offline');
  timerNuvem = setTimeout(enviarDados, 1200);
}

async function enviarParte(chave, valor, agora, apagados, tentativas = 0) {
  const json = JSON.stringify(valor ?? null);
  if (enviadoPartes[chave] === json) return { ok: true };
  const versao = versoesPartes[chave];
  const linha = { user_id: usuario.id, chave, dados: valor ?? null, atualizado_em: agora };
  const resp = versao && tentativas < 2
    ? await sb.from('central_partes').update({ dados: valor ?? null, atualizado_em: agora }).eq('user_id', usuario.id).eq('chave', chave).eq('atualizado_em', versao).select('atualizado_em')
    : await sb.from('central_partes').upsert(linha, { onConflict: 'user_id,chave' }).select('atualizado_em');
  if (resp.error) return { erro: resp.error };
  if (!resp.data?.length) {
    const r = await sb.from('central_partes').select('dados, atualizado_em').eq('user_id', usuario.id).eq('chave', chave).maybeSingle();
    if (r.error) return { erro: r.error };
    if (r.data) {
      estado[chave] = mesclar(estado[chave], r.data.dados, apagados);
      versoesPartes[chave] = r.data.atualizado_em;
    } else delete versoesPartes[chave];
    return { conflito: true, ...(await enviarParte(chave, estado[chave], agora, apagados, tentativas + 1)) };
  }
  versoesPartes[chave] = resp.data[0].atualizado_em;
  enviadoPartes[chave] = JSON.stringify(valor ?? null);
  return { ok: true };
}

async function enviarDados() {
  if (!usuario) return;
  if (!navigator.onLine) { pendenteNuvem = true; statusNuvem('offline'); return; }
  if (salvandoNuvem) { pendenteNuvem = true; return; }
  clearTimeout(timerTentar);
  salvandoNuvem = true;
  pendenteNuvem = false;
  statusNuvem('salvando');
  const agora = new Date().toISOString();
  const falhou = () => {
    salvandoNuvem = false;
    pendenteNuvem = true;
    statusNuvem(navigator.onLine ? 'erro' : 'offline');
    timerTentar = setTimeout(enviarDados, 15000);
  };

  if (partesOk === null) {
    try { await baixarPartesSoVersoes(); } catch { return falhou(); }
  }
  let houveConflito = false;
  if (partesOk) {
    const apagados = new Set((estado.lixeira || []).map((x) => x.id));
    for (const chave of PARTES) {
      if (!(chave in estado)) continue;
      const r = await enviarParte(chave, estado[chave], agora, apagados);
      if (r.erro) return falhou();
      if (r.conflito) houveConflito = true;
    }
  }

  const corpo = partesOk ? separarEstado(estado).principal : estado;
  const jsonPrincipal = JSON.stringify(corpo);
  if (jsonPrincipal !== enviadoPrincipal || !versaoNuvem) {
    const condicional = versaoNuvem && conflitosSeguidos < 2;
    const resp = condicional
      ? await sb.from('central_dados').update({ dados: corpo, atualizado_em: agora }).eq('user_id', usuario.id).eq('atualizado_em', versaoNuvem).select('atualizado_em')
      : await sb.from('central_dados').upsert({ user_id: usuario.id, dados: corpo, atualizado_em: agora }).select('atualizado_em');
    if (resp.error) return falhou();
    if (!resp.data?.length) {
      conflitosSeguidos++;
      const { data } = await sb.from('central_dados').select('dados, atualizado_em').eq('user_id', usuario.id).maybeSingle();
      salvandoNuvem = false;
      if (data) {
        const apagados = new Set([...(estado.lixeira || []), ...(data.dados.lixeira || [])].map((x) => x.id));
        const remoto = { ...data.dados };
        if (partesOk) PARTES.forEach((k) => delete remoto[k]);
        estado = completar(mesclar(estado, remoto, apagados));
        versaoNuvem = data.atualizado_em;
        localStorage.setItem(CHAVE, JSON.stringify(estado));
        desenharSeguro();
        if (conflitosSeguidos === 1) avisar('Juntei com as mudanças feitas em outro aparelho.');
      } else {
        versaoNuvem = '';
      }
      return enviarDados();
    }
    versaoNuvem = resp.data[0].atualizado_em;
    enviadoPrincipal = jsonPrincipal;
  }
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { }
  if (houveConflito) { desenharSeguro(); avisar('Juntei com as mudanças feitas em outro aparelho.'); }

  conflitosSeguidos = 0;
  salvandoNuvem = false;
  if (!pendenteNuvem) { try { localStorage.removeItem(CHAVE_PENDENTE); } catch { } }
  statusNuvem(typeof diarioTimers !== 'undefined' && Object.keys(diarioTimers).length ? 'salvando' : 'salvo');
  if (pendenteNuvem) salvarNuvem();
}

async function baixarPartesSoVersoes() {
  const r = await sb.from('central_partes').select('chave, atualizado_em').eq('user_id', usuario.id);
  if (r.error) { if (ehFaltaTabela(r.error)) { partesOk = false; return; } throw r.error; }
  partesOk = true;
  (r.data || []).forEach((x) => { if (!versoesPartes[x.chave]) versoesPartes[x.chave] = x.atualizado_em; });
}

function eListaComId(a) {
  return Array.isArray(a) && a.every((x) => x && typeof x === 'object' && 'id' in x);
}

function mesclar(local, remoto, apagados) {
  if (Array.isArray(local) && Array.isArray(remoto)) {
    if (!(eListaComId(local) && eListaComId(remoto)) || (!local.length && !remoto.length)) return local;
    const saida = local.filter((x) => !apagados.has(x.id) || remoto.some((r) => r.id === x.id))
      .map((x) => {
        const r = remoto.find((y) => y.id === x.id);
        return r ? mesclar(x, r, apagados) : x;
      });
    remoto.forEach((r, i) => {
      if (!local.some((x) => x.id === r.id) && !apagados.has(r.id)) saida.splice(Math.min(i, saida.length), 0, r);
    });
    return saida;
  }
  if (local && remoto && typeof local === 'object' && typeof remoto === 'object' && !Array.isArray(local) && !Array.isArray(remoto)) {
    const saida = { ...remoto, ...local };
    Object.keys(remoto).forEach((k) => { if (k in local) saida[k] = mesclar(local[k], remoto[k], apagados); });
    return saida;
  }
  return local === undefined ? remoto : local;
}

async function sair() {
  clearTimeout(timerNuvem);
  if (pendenteNuvem) await enviarDados();
  await sb.auth.signOut();
  location.href = 'login.html';
}

ACOES.sair = () => { if (usuario) sair(); else location.href = 'login.html'; };
