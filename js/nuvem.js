const NUVEM_ATIVA = Boolean(SUPABASE_URL && SUPABASE_KEY && window.supabase);
const sb = NUVEM_ATIVA ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let usuario = null;
let versaoNuvem = '';
let salvandoNuvem = false;
let pendenteNuvem = false;
let timerNuvem;
let timerTentar;

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
  await baixarDados();
  statusNuvem(navigator.onLine ? 'salvo' : 'offline');

  sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') location.href = 'login.html'; });
  window.addEventListener('focus', verificarOutroAparelho);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificarOutroAparelho(); });
  window.addEventListener('online', () => { statusNuvem('salvando'); enviarDados(); });
  window.addEventListener('offline', () => statusNuvem('offline'));
  return true;
}

function verificarOutroAparelho() {
  if (!usuario || salvandoNuvem || pendenteNuvem || !navigator.onLine) return;
  baixarDados(true);
}

async function baixarDados(soSeMudou = false) {
  const { data, error } = await sb.from('central_dados')
    .select('dados, atualizado_em').eq('user_id', usuario.id).maybeSingle();
  if (error) { if (!soSeMudou) avisar('Não consegui buscar seus dados na nuvem.'); return; }
  if (!data) { await enviarDados(); return; }
  if (soSeMudou && mesmaVersao(data.atualizado_em, versaoNuvem)) return;
  if (soSeMudou && (salvandoNuvem || pendenteNuvem)) return;
  versaoNuvem = data.atualizado_em;
  estado = completar(data.dados);
  localStorage.setItem(CHAVE, JSON.stringify(estado));
  if (soSeMudou) {
    desenhar();
    avisar('Atualizado com o que você mudou em outro aparelho.');
  }
}

const mesmaVersao = (a, b) => Boolean(a && b) && new Date(a).getTime() === new Date(b).getTime();

function salvarNuvem() {
  if (!NUVEM_ATIVA || !usuario) return;
  clearTimeout(timerNuvem);
  pendenteNuvem = true;
  statusNuvem(navigator.onLine ? 'salvando' : 'offline');
  timerNuvem = setTimeout(enviarDados, 1200);
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
  const tabela = sb.from('central_dados');
  const resp = versaoNuvem
    ? await tabela.update({ dados: estado, atualizado_em: agora }).eq('user_id', usuario.id).eq('atualizado_em', versaoNuvem).select('atualizado_em')
    : await tabela.upsert({ user_id: usuario.id, dados: estado, atualizado_em: agora }).select('atualizado_em');

  if (resp.error) {
    salvandoNuvem = false;
    pendenteNuvem = true;
    statusNuvem(navigator.onLine ? 'erro' : 'offline');
    timerTentar = setTimeout(enviarDados, 15000);
    return;
  }

  if (!resp.data?.length) {
    const { data } = await tabela.select('dados, atualizado_em').eq('user_id', usuario.id).maybeSingle();
    salvandoNuvem = false;
    if (data) {
      const apagados = new Set([...(estado.lixeira || []), ...(data.dados.lixeira || [])].map((x) => x.id));
      estado = completar(mesclar(estado, data.dados, apagados));
      versaoNuvem = data.atualizado_em;
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      desenhar();
      avisar('Juntei com as mudanças feitas em outro aparelho.');
    } else {
      versaoNuvem = '';
    }
    return enviarDados();
  }

  versaoNuvem = resp.data[0].atualizado_em;
  salvandoNuvem = false;
  statusNuvem('salvo');
  if (pendenteNuvem) salvarNuvem();
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
