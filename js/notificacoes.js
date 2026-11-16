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
  if (estado.config.resumoVisto === hoje) return;
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
