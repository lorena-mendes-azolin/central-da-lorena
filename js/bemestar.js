const bemTela = { dia: null };

function horasSono(s) {
  if (!s?.deitou || !s?.acordou) return 0;
  const [h1, m1] = s.deitou.split(':').map(Number);
  const [h2, m2] = s.acordou.split(':').map(Number);
  let min = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (min <= 0) min += 24 * 60;
  return min / 60;
}
function textoHoras(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}
const numero = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtNum = (n, casas = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

PAGINAS.bemestar = {
  titulo: 'Bem-estar',
  desenhar() {
    const hoje = hojeISO();
    const dia = bemTela.dia || hoje;
    const reg = registroDoDia(dia);
    reg.bom = reg.bom || ['', '', ''];
    const c = estado.config;

    const dias14 = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i - 13));
    const sonos = dias14.map((d) => horasSono(estado.diario[d]?.sono));
    const comSono = sonos.filter(Boolean);
    const mediaSono = comSono.length ? comSono.reduce((a, b) => a + b, 0) / comSono.length : 0;
    const maxSono = Math.max(10, ...sonos);

    const anteriores = Object.entries(estado.diario)
      .filter(([d, r]) => d !== dia && (r.bom?.some(Boolean) || r.texto))
      .sort((a, b) => b[0].localeCompare(a[0])).slice(0, 20);

    const aguaHoje = registroDoDia(hoje).agua;

    return `
    <div class="cab-pagina">
      <div><h1>Bem-estar</h1><p>Diário, sono e água. Pequenos registros que mostram como você está.</p></div>
    </div>

    <div class="grade g3">
      <div class="card stat"><span class="selo c-amarelo">${ic('sparkle')}</span>
        <div><b>${Object.values(estado.diario).filter((r) => r.bom?.some(Boolean)).length}</b><span>dias com coisas boas</span></div></div>
      <div class="card stat"><span class="selo c-violeta">${ic('bed')}</span>
        <div><b>${mediaSono ? textoHoras(mediaSono) : '—'}</b><span>sono médio (14 dias)</span></div></div>
      <div class="card stat"><span class="selo c-azul">${ic('drop')}</span>
        <div><b>${aguaHoje}/${c.metaAgua}</b><span>copos de água hoje</span></div></div>
    </div>

    <div class="grade g2">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('sparkle')}</span> Diário
          <span class="nav-mes">
            <button class="acao-item" data-acao="bem-dia" data-d="-1" aria-label="Dia anterior">${ic('left', 'p')}</button>
            <span>${dia === hoje ? 'Hoje' : dia === somarDias(hoje, -1) ? 'Ontem' : dataCurta(dia)}</span>
            <button class="acao-item" data-acao="bem-dia" data-d="1" aria-label="Próximo dia" ${dia >= hoje ? 'disabled' : ''}>${ic('right', 'p')}</button>
          </span></h2>
        <span class="rotulo-mini">3 coisas boas do dia</span>
        <div class="coisas-boas">
          ${[0, 1, 2].map((i) => `<label><span>${i + 1}</span><input type="text" value="${esc(reg.bom[i] || '')}" maxlength="140" data-digitar="bem-bom" data-dia="${dia}" data-i="${i}" aria-label="Coisa boa ${i + 1}"></label>`).join('')}
        </div>
        <span class="rotulo-mini">Como foi o dia</span>
        <textarea class="texto-dia" data-digitar="bem-texto" data-dia="${dia}" aria-label="Como foi o dia">${esc(reg.texto || '')}</textarea>
        <div class="humores pequeno">
          ${HUMORES.map((x) => `<button class="humor ${reg.humor === x.id ? 'on' : ''}" data-acao="bem-humor" data-dia="${dia}" data-h="${x.id}" title="${x.nome}" style="${reg.humor === x.id ? 'color:var(--amarelo)' : ''}"><svg><use href="#i-${x.id}"/></svg></button>`).join('')}
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('note')}</span> Dias anteriores</h2>
        <div class="diarios">
          ${anteriores.map(([d, r]) => `<button class="diario-item" data-acao="bem-ir" data-dia="${d}">
            <b>${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')}
              ${r.humor ? `<svg class="ic" style="color:var(--amarelo)"><use href="#i-${r.humor}"/></svg>` : ''}</b>
            ${(r.bom || []).filter(Boolean).map((b) => `<span>${ic('sparkle', 'p')} ${esc(b)}</span>`).join('')}
            ${r.texto ? `<small>${esc(r.texto.slice(0, 120))}${r.texto.length > 120 ? '…' : ''}</small>` : ''}
          </button>`).join('') || '<p class="vazio">Os dias que você escrever aparecem aqui.</p>'}
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('bed')}</span> Sono <small>meta: 8h</small></h2>
        <div class="dc-linha">
          <label class="campo">Dormi às<input type="time" value="${reg.sono?.deitou || ''}" data-mudar="bem-sono" data-dia="${dia}" data-campo="deitou"></label>
          <label class="campo">Acordei às<input type="time" value="${reg.sono?.acordou || ''}" data-mudar="bem-sono" data-dia="${dia}" data-campo="acordou"></label>
          <label class="campo">${dia === hoje ? 'Dormiu esta noite' : 'Dormiu na noite de ' + somarDias(dia, -1).slice(8) + '/' + somarDias(dia, -1).slice(5, 7)}<div class="sono-total">${ic('bed', 'p')}<b>${horasSono(reg.sono) ? textoHoras(horasSono(reg.sono)) : '—'}</b></div></label>
        </div>
        <div class="grafico-colunas sono" style="margin-top:16px">
          <div class="linha-meta" style="bottom:${(8 / maxSono) * 100}%"><span>8h</span></div>
          ${dias14.map((d, i) => `<div class="col ${sonos[i] ? '' : 'zero'} ${sonos[i] && sonos[i] < 6 ? 'pouco' : ''}" data-dica="${dataCurta(d)} · ${sonos[i] ? textoHoras(sonos[i]) : 'sem registro'}">
            <i style="height:${Math.max(sonos[i] ? 3 : 1, (sonos[i] / maxSono) * 100)}%"></i></div>`).join('')}
        </div>
        <div class="eixo-x">${dias14.map((d, i) => `<span>${i % 2 ? '' : Number(d.slice(8))}</span>`).join('')}</div>
        <p class="dica">O sono fica no dia em que você acordou. Barras rosas: menos de 6 horas.</p>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('drop')}</span> Água</h2>
        <div class="agua-total" style="margin-bottom:12px"><b>${(aguaHoje * 0.25).toFixed(2).replace('.', ',')} L</b><span>${aguaHoje} de ${c.metaAgua} copos hoje</span></div>
        <div class="copos" style="margin-bottom:16px">${Array.from({ length: c.metaAgua }, (_, i) => `<button class="copo ${i < aguaHoje ? 'cheio' : ''}" data-acao="agua" data-i="${i}" aria-label="copo ${i + 1}"></button>`).join('')}</div>
        <span class="rotulo-mini" style="margin-bottom:8px">Lembrete</span>
        <div class="dc-linha">
          <label class="campo">Lembrar a cada
            <select data-mudar="cfg-agua-lembrete" data-campo="aguaIntervalo">
              ${[[0, 'Desligado'], [1, '1 hora'], [1.5, '1h30'], [2, '2 horas'], [3, '3 horas']].map(([v, n]) => `<option value="${v}" ${Number(c.aguaIntervalo) === v ? 'selected' : ''}>${n}</option>`).join('')}
            </select></label>
          <label class="campo">Das<input type="time" value="${c.aguaInicio}" data-mudar="cfg-agua-lembrete" data-campo="aguaInicio"></label>
          <label class="campo">Até<input type="time" value="${c.aguaFim}" data-mudar="cfg-agua-lembrete" data-campo="aguaFim"></label>
          <label class="campo">Meta (copos de 250 ml)<input type="number" min="1" max="20" value="${c.metaAgua}" data-mudar="cfg-num" data-campo="metaAgua"></label>
        </div>
        <p class="dica">O aviso aparece enquanto o site estiver aberto (pode ficar minimizado). Para de avisar quando você bate a meta do dia.</p>
      </section>
    </div>`;
  },
};

ACOES['bem-dia'] = (el) => {
  const d = somarDias(bemTela.dia || hojeISO(), Number(el.dataset.d));
  bemTela.dia = d > hojeISO() ? hojeISO() : d;
  desenhar();
};
ACOES['bem-ir'] = (el) => { bemTela.dia = el.dataset.dia; desenhar(); window.scrollTo(0, 0); };
ACOES['bem-humor'] = (el) => {
  const r = registroDoDia(el.dataset.dia);
  r.humor = r.humor === el.dataset.h ? '' : el.dataset.h;
  salvar(); desenhar();
};

DIGITAR['bem-bom'] = (el) => {
  const r = registroDoDia(el.dataset.dia);
  r.bom = r.bom || ['', '', ''];
  r.bom[Number(el.dataset.i)] = el.value;
  salvar();
};
DIGITAR['bem-texto'] = (el) => { registroDoDia(el.dataset.dia).texto = el.value; salvar(); };

MUDAR['bem-sono'] = (el) => {
  const r = registroDoDia(el.dataset.dia);
  r.sono = { ...(r.sono || {}), [el.dataset.campo]: el.value };
  salvar(); desenhar();
};

MUDAR['cfg-agua-lembrete'] = (el) => {
  estado.config[el.dataset.campo] = el.dataset.campo === 'aguaIntervalo' ? Number(el.value) : el.value;
  salvar();
  if (el.dataset.campo === 'aguaIntervalo') avisar(Number(el.value) ? 'Lembrete de água ligado.' : 'Lembrete de água desligado.');
};

function verificarAgua() {
  const c = estado.config;
  const intervalo = Number(c.aguaIntervalo);
  if (!intervalo) return;
  const hoje = hojeISO();
  if (registroDoDia(hoje).agua >= c.metaAgua) return;
  const agora = new Date();
  const min = agora.getHours() * 60 + agora.getMinutes();
  const [hi, mi] = c.aguaInicio.split(':').map(Number);
  const [hf, mf] = c.aguaFim.split(':').map(Number);
  const ini = hi * 60 + mi, fim = hf * 60 + mf;
  if (min < ini || min > fim) return;
  const slot = Math.floor((min - ini) / (intervalo * 60));
  if (slot < 1) return;
  const chave = `agua|${hoje}|${slot}`;
  if (estado.avisados[chave]) return;
  estado.avisados[chave] = true;
  salvar();
  const reg = registroDoDia(hoje);
  notificar('Hora de beber água', `Você tomou ${reg.agua} de ${c.metaAgua} copos hoje.`);
}
