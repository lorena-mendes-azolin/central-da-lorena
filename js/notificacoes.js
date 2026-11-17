const PODE_NOTIFICAR = 'Notification' in window && location.protocol !== 'file:';

function htmlPedirNotificacao() {
  if (location.protocol === 'file:') {
    return `<div class="alerta">${ic('bell')}<span>Os avisos aparecem aqui dentro do site. Para receber também a notificação do Windows, abra pelo <b>Live Server</b> do VS Code.</span></div>`;
  }
  if (!('Notification' in window) || Notification.permission !== 'default') return '';
  return `<div class="alerta">${ic('bell')}<span>Quer receber os avisos das tarefas como notificação no ${/Android|iPhone|iPad/.test(navigator.userAgent) ? 'celular' : 'computador'}?</span>
    <button class="btn" data-acao="permitir-notif">Ativar</button></div>`;
}

ACOES['permitir-notif'] = async () => {
  const r = await Notification.requestPermission();
  desenhar();
  if (r === 'granted') notificar('Notificações ativadas', 'Você vai receber os avisos das tarefas no horário escolhido.');
};

function notificar(titulo, corpo) {
  if (PODE_NOTIFICAR && Notification.permission === 'granted') mostrarNotificacao(titulo, corpo);
  avisar(`${titulo} · ${corpo}`);
  tocarSom();
}

async function mostrarNotificacao(titulo, corpo) {
  const opcoes = { body: corpo, tag: titulo, icon: 'icons/icone-192.png', badge: 'icons/icone-192.png', vibrate: [120, 60, 120] };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(titulo, opcoes);
    else new Notification(titulo, opcoes);
  } catch {
    try { new Notification(titulo, opcoes); } catch { }
  }
}

let audio;
function tocarSom(ok = false) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notas = ok ? [784, 1047] : [880, 698, 880];
    notas.forEach((freq, k) => {
      const o = audio.createOscillator(), g = audio.createGain();
      const t = audio.currentTime + k * 0.13;
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.25);
    });
  } catch {  }
}

function momentoDoAviso(t) {
  const [h, m] = (t.hora || '08:00').split(':').map(Number);
  const d = paraData(t.data);
  d.setHours(h, m, 0, 0);
  return new Date(d.getTime() - t.lembrete * 60000);
}

function textoQuando(t) {
  const n = diasAte(t.data);
  const dia = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : dataCurta(t.data);
  return t.hora ? `${dia} às ${t.hora}` : dia;
}

function verificarLembretes() {
  const agora = Date.now();
  let mudou = false;
  for (const t of estado.tarefas) {
    if (t.feito || !t.data || t.lembrete < 0) continue;
    const chave = `${t.id}|${t.data}`;
    if (estado.avisados[chave]) continue;
    const quando = momentoDoAviso(t).getTime();
    if (agora < quando) continue;
    estado.avisados[chave] = true;
    mudou = true;
    if (agora - quando < 6 * 3600000) notificar(t.titulo, textoQuando(t));
  }
  if (mudou) salvar();
  verificarAgua();
  verificarContas();
  atualizarSino();
}

function resumoDoDia() {
  const hoje = hojeISO();
  if (estado.config.resumoVisto === hoje || precisaBoasVindas()) return;
  estado.config.resumoVisto = hoje;
  salvar();
  const n = estado.tarefas.filter((t) => !t.feito && t.data === hoje).length;
  const atrasadas = estado.tarefas.filter((t) => !t.feito && t.data && t.data < hoje).length;
  const partes = [n ? `${n} ${n > 1 ? 'tarefas' : 'tarefa'} para hoje` : 'Nenhuma tarefa para hoje'];
  if (atrasadas) partes.push(`${atrasadas} ${atrasadas > 1 ? 'atrasadas' : 'atrasada'}`);
  setTimeout(() => notificar('Seu dia', partes.join(' · ')), 1200);
}

function proximosAvisos() {
  const agora = Date.now();
  const limite = agora + 48 * 3600000;
  return estado.tarefas
    .filter((t) => !t.feito && t.data && t.lembrete >= 0)
    .map((t) => ({ t, quando: momentoDoAviso(t).getTime() }))
    .filter((x) => x.quando > agora && x.quando < limite)
    .sort((a, b) => a.quando - b.quando);
}

function atualizarSino() {
  const hoje = hojeISO();
  const n = estado.tarefas.filter((t) => !t.feito && t.data && t.data <= hoje).length;
  const b = $('#sino-num');
  b.hidden = !n;
  b.textContent = n;
}

ACOES['abrir-avisos'] = () => {
  const p = $('#painel-avisos');
  if (!p.hidden) { p.hidden = true; return; }
  preencherAvisos();
  p.hidden = false;
};

function preencherAvisos() {
  const p = $('#painel-avisos');
  const hoje = hojeISO();
  const pendentes = estado.tarefas.filter((t) => !t.feito && t.data && t.data <= hoje).sort((a, b) => a.data.localeCompare(b.data) || porHora(a, b));
  const prox = proximosAvisos();
  p.innerHTML = `
    <h3>Para hoje e atrasadas</h3>
    ${pendentes.map(htmlTarefa).join('') || '<p class="vazio">Tudo em dia.</p>'}
    <h3 style="margin-top:14px">Próximos avisos (48 horas)</h3>
    ${prox.map(({ t, quando }) => `<div class="item"><span class="selo mini c-violeta">${ic('bell')}</span><span class="txt">${esc(t.titulo)}
      <span class="sub">aviso ${new Date(quando).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · ${textoQuando(t)}</span></span></div>`).join('')
      || '<p class="vazio">Nenhum aviso nas próximas 48 horas.</p>'}
    ${PODE_NOTIFICAR && Notification.permission !== 'granted' ? '<button class="btn" data-acao="permitir-notif" style="margin-top:10px">Ativar notificações do computador</button>' : ''}`;
}

const pushTela = { estado: null, ocupado: false };
const pushSuportado = () => NUVEM_ATIVA && typeof VAPID_PUBLICA !== 'undefined' && VAPID_PUBLICA && 'serviceWorker' in navigator && 'PushManager' in window && location.protocol === 'https:';

function chaveVapid(b64) {
  const p = '='.repeat((4 - (b64.length % 4)) % 4);
  const bruto = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

async function conferirPush() {
  if (!pushSuportado() || !usuario) { pushTela.estado = 'indisponivel'; setTimeout(() => { if (location.hash === '#configuracoes') desenharSeguro(); }, 0); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    pushTela.estado = sub ? 'ativo' : Notification.permission === 'denied' ? 'bloqueado' : 'inativo';
  } catch { pushTela.estado = 'inativo'; }
  if (location.hash === '#configuracoes') desenharSeguro();
}

function htmlPush() {
  if (pushTela.estado === null) { conferirPush(); return '<p class="dica" style="margin:0">Verificando…</p>'; }
  if (pushTela.estado === 'indisponivel') {
    return `<p class="dica" style="margin:0">${location.protocol !== 'https:' ? 'Funciona no site publicado (endereço com https), não no Live Server.' : !usuario ? 'Entre na sua conta para ativar.' : 'Este navegador não aceita esse tipo de aviso.'}
      ${/iPhone|iPad/.test(navigator.userAgent) ? ' No iPhone, primeiro instale o site na tela inicial (Compartilhar › Adicionar à Tela de Início) e abra por lá.' : ''}</p>`;
  }
  if (pushTela.estado === 'bloqueado') return '<p class="dica" style="margin:0">As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador (cadeado ao lado do endereço) e volte aqui.</p>';
  return pushTela.estado === 'ativo'
    ? `<p style="margin:0 0 12px"><b>Ativado neste aparelho.</b> Os lembretes das tarefas chegam mesmo com o site fechado.</p>
      <div class="form-linha"><button class="btn sec" data-acao="push-teste" ${pushTela.ocupado ? 'disabled' : ''}>${ic('bell', 'p')} Mandar um teste</button>
      <button class="btn sec" data-acao="push-desativar" ${pushTela.ocupado ? 'disabled' : ''}>Desativar neste aparelho</button></div>`
    : `<p style="margin:0 0 12px">Receba os lembretes das tarefas, aniversários e cuidados dos pets mesmo com o site fechado. Ative em cada aparelho (celular e computador).</p>
      <button class="btn" data-acao="push-ativar" ${pushTela.ocupado ? 'disabled' : ''}>${ic('bell', 'p')} Ativar neste aparelho</button>`;
}

ACOES['push-ativar'] = async () => {
  pushTela.ocupado = true; desenhar();
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { pushTela.estado = perm === 'denied' ? 'bloqueado' : 'inativo'; return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(VAPID_PUBLICA) });
    const json = sub.toJSON();
    const { error } = await sb.from('push_inscricoes').upsert({ endpoint: json.endpoint, user_id: usuario.id, inscricao: json, aparelho: navigator.userAgent.slice(0, 120) });
    if (error) { await sub.unsubscribe(); avisar(/push_inscricoes|PGRST205|42P01/.test(`${error.code} ${error.message}`) ? 'Falta rodar o supabase.sql para ativar esse aviso.' : 'Não consegui ativar agora.'); pushTela.estado = 'inativo'; return; }
    pushTela.estado = 'ativo';
    avisar('Pronto! Os lembretes vão chegar mesmo com o site fechado.');
  } catch { avisar('Não consegui ativar neste aparelho.'); }
  finally { pushTela.ocupado = false; desenhar(); }
};
ACOES['push-desativar'] = async () => {
  pushTela.ocupado = true; desenhar();
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await sb.from('push_inscricoes').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
    pushTela.estado = 'inativo';
    avisar('Avisos com o site fechado desativados neste aparelho.');
  } catch { avisar('Não consegui desativar agora.'); }
  finally { pushTela.ocupado = false; desenhar(); }
};
ACOES['push-teste'] = async () => {
  pushTela.ocupado = true; desenhar();
  try {
    const { data, error } = await sb.functions.invoke('lembretes', { body: { teste: true } });
    if (error) throw error;
    avisar(data?.enviados ? 'Teste enviado! Deve chegar em alguns segundos.' : 'Nenhum aparelho recebeu. Tente desativar e ativar de novo.');
  } catch { avisar('A função de avisos ainda não está publicada no Supabase.'); }
  finally { pushTela.ocupado = false; desenhar(); }
};
