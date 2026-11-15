// =========================================================
// nuvem.js — login e dados no Supabase
// Se o config.js estiver vazio, nada daqui roda (modo local).
// =========================================================

const NUVEM_ATIVA = Boolean(SUPABASE_URL && SUPABASE_KEY && window.supabase);
const sb = NUVEM_ATIVA ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let usuario = null;          // quem está logado
let ultimaVersaoNuvem = '';  // data da última versão que veio/foi pra nuvem
let salvandoNuvem = false;
let pendenteNuvem = false;   // tem mudança esperando para subir

// Chamado ao abrir o site: confere o login e baixa os dados
async function iniciarNuvem() {
  if (!NUVEM_ATIVA) return true;
  const { data } = await sb.auth.getSession();
  usuario = data.session?.user || null;
  if (!usuario) {
    location.href = 'login.html';
    return false;
  }
  await baixarDados();

  // sessão expirou ou saiu em outra aba
  sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') location.href = 'login.html'; });

  // voltou para a aba: confere se mudou algo em outro aparelho
  window.addEventListener('focus', () => { if (!salvandoNuvem && !pendenteNuvem) baixarDados(true); });
  return true;
}

async function baixarDados(soSeMudou = false) {
  const { data, error } = await sb.from('central_dados')
    .select('dados, atualizado_em').eq('user_id', usuario.id).maybeSingle();
  if (error) { avisar('Não consegui buscar seus dados na nuvem 😕'); return; }

  if (!data) {
    // primeira vez: sobe o que já existe neste navegador
    await enviarDados();
    return;
  }
  if (soSeMudou && new Date(data.atualizado_em).getTime() === new Date(ultimaVersaoNuvem).getTime()) return;
  ultimaVersaoNuvem = data.atualizado_em;
  estado = completar(data.dados);
  localStorage.setItem(CHAVE, JSON.stringify(estado));
  if (soSeMudou) desenhar();
}

// Envia para a nuvem (o salvar() do dados.js chama isto)
let timerNuvem;
function salvarNuvem() {
  if (!NUVEM_ATIVA || !usuario) return;
  clearTimeout(timerNuvem);
  pendenteNuvem = true;
  timerNuvem = setTimeout(enviarDados, 1200); // junta várias mudanças em um envio só
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
