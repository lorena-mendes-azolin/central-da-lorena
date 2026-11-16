const NUVEM_ATIVA = Boolean(SUPABASE_URL && SUPABASE_KEY && window.supabase);
const sb = NUVEM_ATIVA ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let usuario = null;
let ultimaVersaoNuvem = '';
let salvandoNuvem = false;
let pendenteNuvem = false;

async function iniciarNuvem() {
  if (!NUVEM_ATIVA) return true;
  const { data } = await sb.auth.getSession();
  usuario = data.session?.user || null;
  if (!usuario) {
    location.href = 'login.html';
    return false;
  }
  await baixarDados();

  sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') location.href = 'login.html'; });

  window.addEventListener('focus', () => { if (!salvandoNuvem && !pendenteNuvem) baixarDados(true); });
  return true;
}

async function baixarDados(soSeMudou = false) {
  const { data, error } = await sb.from('central_dados')
    .select('dados, atualizado_em').eq('user_id', usuario.id).maybeSingle();
  if (error) { avisar('Não consegui buscar seus dados na nuvem 😕'); return; }

  if (!data) {

    await enviarDados();
    return;
  }
  if (soSeMudou && new Date(data.atualizado_em).getTime() === new Date(ultimaVersaoNuvem).getTime()) return;
  ultimaVersaoNuvem = data.atualizado_em;
  estado = completar(data.dados);
  localStorage.setItem(CHAVE, JSON.stringify(estado));
  if (soSeMudou) desenhar();
}

let timerNuvem;
function salvarNuvem() {
  if (!NUVEM_ATIVA || !usuario) return;
  clearTimeout(timerNuvem);
  pendenteNuvem = true;
  timerNuvem = setTimeout(enviarDados, 1200);
}

async function enviarDados() {
  salvandoNuvem = true;
  pendenteNuvem = false;
  const agora = new Date().toISOString();
  const { error } = await sb.from('central_dados')
    .upsert({ user_id: usuario.id, dados: estado, atualizado_em: agora });
  salvandoNuvem = false;
  if (error) { avisar('Não consegui salvar na nuvem 😕 (fica salvo neste navegador)'); return; }
  ultimaVersaoNuvem = agora;
}

async function sair() {
  clearTimeout(timerNuvem);
  await enviarDados();
  await sb.auth.signOut();
  location.href = 'login.html';
}

ACOES.sair = () => { if (usuario) sair(); else location.href = 'login.html'; };
