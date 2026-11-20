// verDiario começa falso: a lista "Seus dias" abre sempre embaçada, como saldo de banco
const bemTela = { dia: null, mes: hojeISO().slice(0, 7), busca: '', sono: null, verDiario: false };
const diaCurto = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
const diaSemanaCurto = (iso) => DIAS_SEMANA[paraData(iso).getDay()].toLowerCase();

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
  async depois() {
    const dia = bemTela.dia || hojeISO();
    const a = await carregarListaDiario();
    const b = await carregarDiario(dia, dia);
    const m = bemTela.mes;
    const c = await carregarDiario(`${m}-01`, `${m}-31`);
    if ((a || b || c) && location.hash === '#bemestar') desenharSeguro();
    filtrarDiario();
  },
  desenhar() {
    const hoje = hojeISO();
    const dia = bemTela.dia || hoje;
    const reg = registroDoDia(dia);
    const c = estado.config;

    const dias14 = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i - 13));
    const sonos = dias14.map((d) => horasSono(estado.diario[d]?.sono));
    const comSono = sonos.filter(Boolean);
    const mediaSono = comSono.length ? comSono.reduce((a, b) => a + b, 0) / comSono.length : 0;
    const maxSono = Math.max(10, ...sonos);

    const anteriores = diariosComConteudo().filter(([d]) => d.startsWith(bemTela.mes));
    const [anoLista, mesLista] = bemTela.mes.split('-').map(Number);
    const nomeMesLista = `${MESES_LONGOS[mesLista - 1]} de ${anoLista}`;
    const diarioDia = lerDiario(dia);
    const noiteSono = bemTela.sono || hoje;
    const regSono = registroDoDia(noiteSono);

    const aguaHoje = registroDoDia(hoje).agua;

    return `
    <div class="cab-pagina">
      <div><h1>Bem-estar</h1><p>Diário, sono${temModulo('jejum') ? ', água e jejum' : ' e água'}. Pequenos registros que mostram como você está.</p></div>
    </div>

    <div class="grade g3">
      <div class="card stat"><span class="selo c-amarelo">${ic('sparkle')}</span>
        <div><b>${diariosComConteudo().length}</b><span>dias no diário</span></div></div>
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
        ${dia !== hoje ? `<button class="voltar" data-acao="bem-ir" data-dia="${hoje}" style="background:none;border:0;padding:0;cursor:pointer">${ic('left', 'p')} Voltar para hoje</button>` : ''}
        <span class="rotulo-mini">3 coisas boas do dia</span>
        <div class="coisas-boas">
          ${[0, 1, 2].map((i) => `<label><span>${i + 1}</span><input type="text" value="${esc(diarioDia.bom[i] || '')}" maxlength="140" data-digitar="bem-bom" data-dia="${dia}" data-i="${i}" aria-label="Coisa boa ${i + 1}"></label>`).join('')}
        </div>
        <span class="rotulo-mini">Como foi o dia</span>
        <textarea class="texto-dia" data-digitar="bem-texto" data-dia="${dia}" aria-label="Como foi o dia">${esc(diarioDia.texto || '')}</textarea>
        <div class="humores pequeno">
          ${HUMORES.map((x) => `<button class="humor ${reg.humor === x.id ? 'on' : ''}" data-acao="bem-humor" data-dia="${dia}" data-h="${x.id}" title="${x.nome}" style="${reg.humor === x.id ? 'color:var(--amarelo)' : ''}"><svg><use href="#i-${x.id}"/></svg></button>`).join('')}
        </div>
        <div class="salvar-linha">
          <p class="dica" style="margin:0">O diário também salva sozinho enquanto você escreve.</p>
          <button class="btn" data-acao="diario-salvar" data-dia="${dia}">${ic('check', 'p')} Salvar dia</button>
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('note')}</span> Seus dias
          <span class="nav-mes">
            <button class="acao-item" data-acao="bem-mes" data-d="-1" aria-label="Mês anterior">${ic('left', 'p')}</button>
            <span>${nomeMesLista}</span>
            <button class="acao-item" data-acao="bem-mes" data-d="1" aria-label="Próximo mês" ${bemTela.mes >= hoje.slice(0, 7) ? 'disabled' : ''}>${ic('right', 'p')}</button>
            <button class="acao-item olho-diario" data-acao="bem-olho" aria-pressed="${bemTela.verDiario}" title="${bemTela.verDiario ? 'Esconder o texto' : 'Mostrar o texto'}" aria-label="${bemTela.verDiario ? 'Esconder o texto do diário' : 'Mostrar o texto do diário'}">${ic(bemTela.verDiario ? 'eye' : 'eyeoff', 'p')}</button>
          </span></h2>
        <div class="busca-diario">
          ${ic('note', 'p')}
          <input type="search" id="busca-diario" placeholder="Buscar no diário" value="${esc(bemTela.busca)}" data-digitar="bem-busca" aria-label="Buscar no diário">
          <small id="conta-diario">${anteriores.length} ${anteriores.length === 1 ? 'dia' : 'dias'}</small>
        </div>
        <div class="diarios ${bemTela.verDiario ? '' : 'embacado'}">
          ${anteriores.map(([d, r]) => `<button class="diario-item ${d === dia ? 'ativo' : ''}" data-acao="bem-ir" data-dia="${d}" data-busca="${esc(((r.bom || []).join(' ') + ' ' + (r.texto || '')).toLowerCase())}">
            <b>${d === hoje ? 'Hoje · ' : ''}${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')}
              ${estado.diario[d]?.humor ? `<svg class="ic" style="color:var(--amarelo)"><use href="#i-${estado.diario[d].humor}"/></svg>` : ''}</b>
            ${(r.bom || []).filter(Boolean).map((b) => `<span>${ic('sparkle', 'p')} ${esc(b)}</span>`).join('')}
            ${r.texto ? `<small>${esc(r.texto.slice(0, 120))}${r.texto.length > 120 ? '…' : ''}</small>` : ''}
          </button>`).join('') || `<p class="vazio">${usaTabelaDiario() && !diarioStatus.listaPronta ? 'Carregando…' : (bemTela.mes === hoje.slice(0, 7) ? 'Os dias que você escrever aparecem aqui.' : 'Nada escrito neste mês.')}</p>`}
          <p class="vazio" id="busca-vazia" hidden>Nada encontrado neste mês.</p>
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('bed')}</span> Sono
          <span class="nav-mes">
            <button class="acao-item" data-acao="sono-dia" data-d="-1" aria-label="Noite anterior">${ic('left', 'p')}</button>
            <span>${noiteSono === hoje ? 'Esta noite' : 'Noite de ' + diaCurto(somarDias(noiteSono, -1)) + ' para ' + diaCurto(noiteSono)}</span>
            <button class="acao-item" data-acao="sono-dia" data-d="1" aria-label="Próxima noite" ${noiteSono >= hoje ? 'disabled' : ''}>${ic('right', 'p')}</button>
          </span></h2>
        <p class="noite-legenda">${ic('moon', 'p')} Dormiu ${diaSemanaCurto(somarDias(noiteSono, -1))} ${diaCurto(somarDias(noiteSono, -1))} e acordou ${diaSemanaCurto(noiteSono)} ${diaCurto(noiteSono)}</p>
        <div class="dc-linha">
          <label class="campo">Dormi às<input type="time" value="${regSono.sono?.deitou || ''}" data-mudar="bem-sono" data-dia="${noiteSono}" data-campo="deitou"></label>
          <label class="campo">Acordei às<input type="time" value="${regSono.sono?.acordou || ''}" data-mudar="bem-sono" data-dia="${noiteSono}" data-campo="acordou"></label>
          <label class="campo">Total<div class="sono-total">${ic('bed', 'p')}<b>${horasSono(regSono.sono) ? textoHoras(horasSono(regSono.sono)) : '—'}</b></div></label>
        </div>
        <div class="grafico-colunas sono" style="margin-top:16px">
          <div class="linha-meta" style="bottom:${(8 / maxSono) * 100}%"><span>8h</span></div>
          ${dias14.map((d, i) => `<div class="col ${sonos[i] ? '' : 'zero'} ${sonos[i] && sonos[i] < 6 ? 'pouco' : ''} ${d === noiteSono ? 'escolhida' : ''}" data-acao="sono-ir" data-dia="${d}" data-dica="Noite de ${diaCurto(somarDias(d, -1))} para ${diaCurto(d)} · ${sonos[i] ? textoHoras(sonos[i]) : 'sem registro'} · clique para editar">
            <i style="height:${Math.max(sonos[i] ? 3 : 1, (sonos[i] / maxSono) * 100)}%"></i></div>`).join('')}
        </div>
        <div class="eixo-x">${dias14.map((d, i) => `<span>${i % 2 ? '' : Number(d.slice(8))}</span>`).join('')}</div>
        <p class="dica">Use as setas ou clique numa barra para preencher outra noite. Barras rosas: menos de 6 horas.</p>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('drop')}</span> Água</h2>
        <div class="agua-total" style="margin-bottom:12px"><b>${(aguaHoje * 0.25).toFixed(2).replace('.', ',')} L</b><span>${aguaHoje} de ${c.metaAgua} copos hoje</span></div>
        <div class="copos" style="margin-bottom:16px">${Array.from({ length: c.metaAgua }, (_, i) => `<button class="copo ${i < aguaHoje ? 'cheio' : ''}" data-acao="agua" data-i="${i}" aria-label="copo ${i + 1}"></button>`).join('')}</div>
        <form data-form="agua-config">
        <span class="rotulo-mini" style="margin-bottom:8px">Meta e lembrete</span>
        <div class="dc-linha">
          <label class="campo">Lembrar a cada
            <select name="aguaIntervalo">
              ${[[0, 'Desligado'], [1, '1 hora'], [1.5, '1h30'], [2, '2 horas'], [3, '3 horas']].map(([v, n]) => `<option value="${v}" ${Number(c.aguaIntervalo) === v ? 'selected' : ''}>${n}</option>`).join('')}
            </select></label>
          <label class="campo">Das<input type="time" name="aguaInicio" value="${c.aguaInicio}"></label>
          <label class="campo">Até<input type="time" name="aguaFim" value="${c.aguaFim}"></label>
          <label class="campo">Meta (copos de 250 ml)<input type="number" name="metaAgua" min="1" max="20" value="${c.metaAgua}"></label>
        </div>
        <div class="salvar-linha">
          <p class="dica" style="margin:0">O aviso aparece enquanto o site estiver aberto (pode ficar minimizado). Para de avisar quando você bate a meta do dia.</p>
          <button class="btn" type="submit">${ic('check', 'p')} Salvar alterações</button>
        </div>
        </form>
      </section>
    </div>
    ${htmlJejum()}`;
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

DIGITAR['bem-bom'] = (el) => escreverDiario(el.dataset.dia, 'bom', el.value, Number(el.dataset.i));
DIGITAR['bem-texto'] = (el) => escreverDiario(el.dataset.dia, 'texto', el.value);

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

ACOES['bem-mes'] = (el) => {
  const [a, m] = bemTela.mes.split('-').map(Number);
  const d = new Date(a, m - 1 + Number(el.dataset.d), 1);
  const novo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (novo > hojeISO().slice(0, 7)) return;
  bemTela.mes = novo;
  desenhar();
};

function filtrarDiario() {
  const termo = bemTela.busca.trim().toLowerCase();
  let n = 0;
  $$('.diarios .diario-item').forEach((el) => {
    const ok = !termo || el.dataset.busca.includes(termo);
    el.hidden = !ok;
    if (ok) n++;
  });
  const conta = $('#conta-diario');
  if (conta) conta.textContent = `${n} ${n === 1 ? 'dia' : 'dias'}`;
  const vazio = $('#busca-vazia');
  if (vazio) vazio.hidden = !(termo && n === 0);
}
ACOES['bem-olho'] = () => { bemTela.verDiario = !bemTela.verDiario; desenhar(); };
DIGITAR['bem-busca'] = (el) => { bemTela.busca = el.value; filtrarDiario(); };

FORMS['agua-config'] = (d) => {
  const c = estado.config;
  c.aguaIntervalo = Number(d.aguaIntervalo) || 0;
  if (d.aguaInicio) c.aguaInicio = d.aguaInicio;
  if (d.aguaFim) c.aguaFim = d.aguaFim;
  c.metaAgua = Math.min(20, Math.max(1, Number(d.metaAgua) || c.metaAgua));
  salvar(); desenhar();
  avisar(`Salvo! Meta de ${c.metaAgua} copos${c.aguaIntervalo ? ` e lembrete a cada ${c.aguaIntervalo === 1.5 ? '1h30' : c.aguaIntervalo + (c.aguaIntervalo === 1 ? ' hora' : ' horas')}` : ', lembrete desligado'}.`);
};

ACOES['sono-dia'] = (el) => {
  const d = somarDias(bemTela.sono || hojeISO(), Number(el.dataset.d));
  bemTela.sono = d >= hojeISO() ? null : d;
  desenhar();
};
ACOES['sono-ir'] = (el) => { bemTela.sono = el.dataset.dia === hojeISO() ? null : el.dataset.dia; desenhar(); };

ACOES['diario-salvar'] = async (el) => {
  const dia = el.dataset.dia;
  $$('[data-digitar="bem-bom"]').forEach((i) => escreverDiario(dia, 'bom', i.value, Number(i.dataset.i)));
  const t = $('[data-digitar="bem-texto"]');
  if (t) escreverDiario(dia, 'texto', t.value);
  if (usaTabelaDiario()) {
    clearTimeout(diarioTimers[dia]);
    await enviarDiario(dia);
  } else {
    clearTimeout(timerSalvar);
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    if (typeof salvarNuvem === 'function') salvarNuvem();
  }
  tocarSom(true);
  avisar(`Dia ${dia === hojeISO() ? 'de hoje' : diaCurto(dia)} salvo!`);
  desenharSeguro();
};
