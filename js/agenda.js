// =========================================================
// agenda.js — calendário (dia / semana / mês) e tarefas
// =========================================================

const HORA_INICIO = 6;    // primeira hora da grade
const HORA_FIM = 24;      // última hora (exclusiva)
const ALTURA_HORA = 48;   // pixels por hora (igual ao .celula no CSS)

const agendaTela = {
  ref: hojeISO(),          // dia de referência do que está na tela
  filtro: 'semana',        // filtro da lista da direita
  editando: null,          // tarefa aberta na janela
  arrastando: null,        // tarefa sendo arrastada
};

function visaoAgenda() {
  return estado.config.visaoAgenda || 'mes';
}

// ---------- Uma tarefa em lista (usado aqui, no Dashboard e no sininho) ----------
function htmlTarefa(t) {
  const hoje = hojeISO();
  const atrasado = !t.feito && t.data && t.data < hoje;
  const cor = AREAS[t.area] || AREAS.Pessoal;
  const partes = [];
  if (t.data) partes.push(`${dataCurta(t.data)} · ${quandoFalta(t.data)}`);
  else partes.push('sem data');
  if (t.hora) partes.push(`${ic('clock')} ${t.hora}`);
  if (t.lembrete >= 0 && !t.feito) partes.push(`${ic('bell')} ${LEMBRETES.find((l) => l.min === t.lembrete)?.nome.toLowerCase()}`);
  return `<div class="item ${t.feito ? 'feito' : ''} ${atrasado ? 'atrasado' : ''}">
    <span class="barra-cor" style="background:${cor}"></span>
    <button class="check ${t.feito ? 'on' : ''}" data-acao="tarefa-toggle" data-id="${t.id}" aria-label="Concluir">${t.feito ? ic('check') : ''}</button>
    <span class="txt">${esc(t.titulo)}
      <span class="sub">${atrasado ? 'atrasada · ' : ''}${partes.join(' · ')}</span></span>
    <button class="acao-item" data-acao="tarefa-abrir" data-id="${t.id}" title="Editar">${ic('edit', 'p')}</button>
    <button class="acao-item apagar" data-acao="tarefa-del" data-id="${t.id}" title="Apagar">${ic('trash', 'p')}</button>
  </div>`;
}

// ---------- Página ----------
PAGINAS.agenda = {
  titulo: 'Agenda',
  desenhar() {
    const hoje = hojeISO();
    const f = agendaTela.filtro;
    const filtros = {
      hoje: ['Hoje', (t) => !t.feito && t.data === hoje],
      semana: ['Próximos 7 dias', (t) => !t.feito && t.data >= hoje && t.data <= somarDias(hoje, 7)],
      atrasadas: ['Atrasadas', (t) => !t.feito && t.data && t.data < hoje],
      semdata: ['Sem data', (t) => !t.feito && !t.data],
      feitas: ['Feitas', (t) => t.feito],
    };
    const lista = estado.tarefas.filter(filtros[f][1])
      .sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999') || porHora(a, b));
    const v = visaoAgenda();

    return `
    <div class="cab-pagina">
      <div><h1>Agenda</h1><p>Clique num dia ou horário para criar. Arraste uma tarefa para mudar de dia.</p></div>
      <div class="cab-acoes"><button class="btn" data-acao="tarefa-nova">${ic('plus', 'p')} Nova tarefa</button></div>
    </div>
    ${htmlPedirNotificacao()}

    <div class="agenda-layout">
      <section class="card">
        <div class="agenda-barra">
          <h2>${tituloPeriodo()}</h2>
          <div class="segmento">
            ${[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([id, nome]) =>
              `<button class="${v === id ? 'ativo' : ''}" data-acao="ag-visao" data-v="${id}">${nome}</button>`).join('')}
          </div>
          <button class="btn-mini" data-acao="ag-hoje">Hoje</button>
          <div class="nav-setas">
            <button class="btn-icone" data-acao="ag-mover" data-n="-1" aria-label="Anterior">${ic('left')}</button>
            <button class="btn-icone" data-acao="ag-mover" data-n="1" aria-label="Próximo">${ic('right')}</button>
          </div>
        </div>
        ${v === 'mes' ? htmlMes() : htmlHoras(v === 'semana' ? 7 : 1)}
      </section>

      <section class="card lista-agenda">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('list')}</span> Tarefas</h2>
        <div class="chips">
          ${Object.entries(filtros).map(([id, [nome, fn]]) =>
            `<button class="chip ${f === id ? 'ativo' : ''}" data-acao="agenda-filtro" data-f="${id}">${nome} <b>${estado.tarefas.filter(fn).length}</b></button>`).join('')}
        </div>
        <div class="itens-agenda">${lista.length ? lista.map(htmlTarefa).join('') : '<p class="vazio">Nada por aqui.</p>'}</div>
      </section>
    </div>`;
  },
  depois: rolarParaHora,
};

function tituloPeriodo() {
  const v = visaoAgenda();
  const d = paraData(agendaTela.ref);
  if (v === 'mes') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  if (v === 'dia') return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const ini = inicioSemana(agendaTela.ref);
  const fim = somarDias(ini, 6);
  const fmt = (iso, o) => paraData(iso).toLocaleDateString('pt-BR', o);
  return `${fmt(ini, { day: 'numeric', month: 'short' })} – ${fmt(fim, { day: 'numeric', month: 'short', year: 'numeric' })}`.replace(/\./g, '');
}

// Segunda-feira da semana de uma data
function inicioSemana(iso) {
  return somarDias(iso, -((paraData(iso).getDay() + 6) % 7));
}

function tarefasDoDia(iso) {
  return estado.tarefas.filter((t) => t.data === iso).sort(porHora);
}

function htmlMiniTarefa(t) {
  const cor = AREAS[t.area] || AREAS.Pessoal;
  return `<div class="mini-tarefa ${t.feito ? 'feito' : ''}" style="border-color:${cor}" draggable="true"
    data-arrastar-tarefa="${t.id}" data-acao="tarefa-abrir" data-id="${t.id}" title="${esc(t.titulo)}">${t.hora ? t.hora + ' ' : ''}${esc(t.titulo)}</div>`;
}

// ---------- Visão do mês ----------
function htmlMes() {
  const primeiro = agendaTela.ref.slice(0, 8) + '01';
  const inicio = inicioSemana(primeiro);
  const mesAtual = agendaTela.ref.slice(0, 7);
  const hoje = hojeISO();
  let html = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => `<div class="mes-dsem">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const iso = somarDias(inicio, i);
    const itens = tarefasDoDia(iso);
    html += `<div class="mes-dia ${iso.slice(0, 7) !== mesAtual ? 'fora' : ''} ${iso === hoje ? 'hoje' : ''}"
        data-acao="ag-abrir-dia" data-dia="${iso}" data-soltar-dia="${iso}">
      <div class="num">${Number(iso.slice(8))}
        <button class="add-dia" data-acao="tarefa-nova" data-dia="${iso}" title="Nova tarefa neste dia">${ic('plus')}</button></div>
      ${itens.slice(0, 3).map(htmlMiniTarefa).join('')}
      ${itens.length > 3 ? `<span class="mais">+${itens.length - 3} mais</span>` : ''}
    </div>`;
  }
  return `<div class="mes">${html}</div>`;
}

// ---------- Visão de semana / dia (grade de horários) ----------
function htmlHoras(qtdDias) {
  const inicio = qtdDias === 7 ? inicioSemana(agendaTela.ref) : agendaTela.ref;
  const dias = Array.from({ length: qtdDias }, (_, i) => somarDias(inicio, i));
  const hoje = hojeISO();
  const colunas = `56px repeat(${qtdDias}, minmax(0, 1fr))`;
  const horas = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const agora = new Date();
  const topoAgora = ((agora.getHours() - HORA_INICIO) + agora.getMinutes() / 60) * ALTURA_HORA;

  return `<div class="horas">
    <div class="horas-cab" style="grid-template-columns:${colunas}">
      <div></div>
      ${dias.map((d) => `<div class="${d === hoje ? 'hoje' : ''}" data-acao="ag-abrir-dia" data-dia="${d}">
        ${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<b>${Number(d.slice(8))}</b></div>`).join('')}
    </div>
    <div class="dia-todo" style="grid-template-columns:${colunas}">
      <div>dia<br>todo</div>
      ${dias.map((d) => `<div data-soltar-dia="${d}" data-soltar-hora="">${tarefasDoDia(d).filter((t) => !t.hora).map(htmlMiniTarefa).join('')}</div>`).join('')}
    </div>
    <div class="horas-corpo" id="horas-corpo" style="grid-template-columns:${colunas}">
      <div>${horas.map((h) => `<div class="rotulo-hora">${String(h).padStart(2, '0')}:00</div>`).join('')}</div>
      ${dias.map((d) => `<div class="col-hora" data-soltar-dia="${d}">
        ${horas.map((h) => `<div class="celula" data-acao="tarefa-nova" data-dia="${d}" data-hora="${String(h).padStart(2, '0')}:00" data-soltar-dia="${d}" data-soltar-hora="${String(h).padStart(2, '0')}:00"></div>`).join('')}
        ${tarefasDoDia(d).filter((t) => t.hora).map(htmlEvento).join('')}
        ${d === hoje && topoAgora >= 0 ? `<div class="agora-linha" style="top:${topoAgora}px"></div>` : ''}
      </div>`).join('')}
    </div>
  </div>`;
}

function htmlEvento(t) {
  const [h, m] = t.hora.split(':').map(Number);
  const topo = Math.max(0, (h - HORA_INICIO + m / 60) * ALTURA_HORA);
  const altura = Math.max(24, ((t.duracao || 60) / 60) * ALTURA_HORA - 3);
  const cor = AREAS[t.area] || AREAS.Pessoal;
  const fim = new Date(2000, 0, 1, h, m + (t.duracao || 60));
  return `<div class="evento ${t.feito ? 'feito' : ''}" style="top:${topo}px;height:${altura}px;background:${cor}2e;border-color:${cor}"
    draggable="true" data-arrastar-tarefa="${t.id}" data-acao="tarefa-abrir" data-id="${t.id}">
    ${esc(t.titulo)}<small>${t.hora} – ${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}</small></div>`;
}

// Ao abrir semana/dia, rola até a hora atual (ou 7h)
function rolarParaHora() {
  const corpo = $('#horas-corpo');
  if (!corpo) return;
  const h = Math.max(HORA_INICIO + 1, new Date().getHours() - 1);
  corpo.scrollTop = (h - HORA_INICIO) * ALTURA_HORA;
}

// ---------- Janela de criar / editar ----------
function abrirJanela(t) {
  agendaTela.editando = t?.id || null;
  const v = t || { titulo: '', data: agendaTela.ref, hora: '', duracao: 60, tipo: 'tarefa', area: 'Pessoal', lembrete: 15, notas: '' };
  const j = $('#janela-tarefa');
  j.innerHTML = `<form data-form="tarefa-salvar" method="dialog">
    <h2>${t ? 'Editar tarefa' : 'Nova tarefa'}
      <button type="button" class="btn-icone" data-acao="fechar-janela" aria-label="Fechar">${ic('x')}</button></h2>
    <label class="campo">O que é?<input type="text" name="titulo" id="j-titulo" value="${esc(v.titulo)}" maxlength="120" required></label>
    <div class="tipo-escolha">
      <label><input type="radio" name="tipo" value="tarefa" ${v.tipo === 'tarefa' ? 'checked' : ''}><span>${ic('check', 'p')} Tarefa</span></label>
      <label><input type="radio" name="tipo" value="compromisso" ${v.tipo === 'compromisso' ? 'checked' : ''}><span>${ic('calendar', 'p')} Compromisso</span></label>
    </div>
    <div class="linha2">
      <label class="campo">Data<input type="date" name="data" id="j-data" value="${v.data}"></label>
      <label class="campo">Hora (opcional)<input type="time" name="hora" id="j-hora" value="${v.hora}"></label>
    </div>
    <div class="linha2">
      <label class="campo">Duração
        <select name="duracao" id="j-duracao">${DURACOES.map((d) => `<option value="${d}" ${Number(v.duracao) === d ? 'selected' : ''}>${d < 60 ? d + ' min' : d / 60 + (d === 60 ? ' hora' : ' horas')}</option>`).join('')}</select></label>
      <label class="campo">Área
        <select name="area" id="j-area">${Object.keys(AREAS).map((a) => `<option ${v.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
    </div>
    <label class="campo">Avisar
      <select name="lembrete" id="j-lembrete">${LEMBRETES.map((l) => `<option value="${l.min}" ${v.lembrete === l.min ? 'selected' : ''}>${l.nome}</option>`).join('')}</select></label>
    <label class="campo">Anotações<textarea name="notas" id="j-notas" placeholder="Detalhes, links, endereço…">${esc(v.notas || '')}</textarea></label>
    <div class="rodape-janela">
      ${t ? `<button type="button" class="btn perigo" data-acao="tarefa-del" data-id="${t.id}">${ic('trash', 'p')} Excluir</button>` : ''}
      <button type="button" class="btn sec" data-acao="fechar-janela">Cancelar</button>
      <button type="submit" class="btn">${t ? 'Salvar' : 'Adicionar'}</button>
    </div>
    <p class="dica" style="margin:0">Sem hora marcada, o aviso usa 8h do dia como referência.</p>
  </form>`;
  j.showModal();
  setTimeout(() => $('#j-titulo').focus(), 30);
}

function fecharJanela() {
  const j = $('#janela-tarefa');
  if (j.open) j.close();
  agendaTela.editando = null;
}

// ---------- Ações ----------
ACOES['tarefa-nova'] = (el) => {
  const base = { titulo: '', data: el.dataset.dia || agendaTela.ref, hora: el.dataset.hora || '', duracao: 60, tipo: 'tarefa', area: 'Pessoal', lembrete: el.dataset.hora ? 15 : 0, notas: '' };
  abrirJanela(null);
  $('#j-data').value = base.data;
  $('#j-hora').value = base.hora;
  $('#j-lembrete').value = base.lembrete;
};

ACOES['tarefa-abrir'] = (el) => {
  const t = estado.tarefas.find((x) => x.id === el.dataset.id);
  if (t) abrirJanela(t);
};

ACOES['fechar-janela'] = () => fecharJanela();

FORMS['tarefa-salvar'] = (d) => {
  const dados = {
    titulo: d.titulo, data: d.data || '', hora: d.hora || '', duracao: Number(d.duracao) || 60,
    tipo: d.tipo || 'tarefa', area: d.area, lembrete: Number(d.lembrete), notas: d.notas || '',
  };
  const ed = estado.tarefas.find((t) => t.id === agendaTela.editando);
  if (ed) {
    Object.assign(ed, dados);
    Object.keys(estado.avisados).forEach((k) => { if (k.startsWith(ed.id + '|')) delete estado.avisados[k]; }); // aviso pode tocar de novo
    avisar('Tarefa atualizada.');
  } else {
    estado.tarefas.push({ id: novoId(), ...dados, feito: false });
    avisar(dados.lembrete >= 0 && dados.data ? 'Tarefa adicionada, com aviso marcado.' : 'Tarefa adicionada.');
  }
  if (dados.data) agendaTela.ref = dados.data;
  fecharJanela();
  salvar(); desenhar();
  verificarLembretes();
};

ACOES['tarefa-toggle'] = (el) => {
  const t = estado.tarefas.find((x) => x.id === el.dataset.id);
  if (!t) return;
  t.feito = !t.feito;
  t.feitoEm = t.feito ? hojeISO() : ''; // usado nos gráficos
  salvar(); desenhar();
  if (t.feito) { tocarSom(true); avisar('Tarefa concluída!', () => { t.feito = false; t.feitoEm = ''; salvar(); desenhar(); }); }
};

ACOES['tarefa-del'] = (el) => {
  fecharJanela();
  removerComDesfazer(estado.tarefas, el.dataset.id, 'Tarefa');
};

ACOES['agenda-filtro'] = (el) => { agendaTela.filtro = el.dataset.f; desenhar(); };

ACOES['ag-visao'] = (el) => { estado.config.visaoAgenda = el.dataset.v; salvar(); desenhar(); };

ACOES['ag-hoje'] = () => { agendaTela.ref = hojeISO(); desenhar(); };

ACOES['ag-abrir-dia'] = (el) => {
  agendaTela.ref = el.dataset.dia;
  estado.config.visaoAgenda = 'dia';
  salvar(); desenhar();
};

ACOES['ag-mover'] = (el) => {
  const n = Number(el.dataset.n);
  const v = visaoAgenda();
  if (v === 'mes') {
    const d = paraData(agendaTela.ref);
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    agendaTela.ref = hojeISO(d);
  } else {
    agendaTela.ref = somarDias(agendaTela.ref, n * (v === 'semana' ? 7 : 1));
  }
  desenhar();
};

// ---------- Arrastar tarefas no calendário ----------
document.addEventListener('dragstart', (e) => {
  const el = e.target.closest('[data-arrastar-tarefa]');
  if (!el) return;
  agendaTela.arrastando = el.dataset.arrastarTarefa;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', agendaTela.arrastando);
});

document.addEventListener('dragover', (e) => {
  if (!agendaTela.arrastando) return;
  const alvo = e.target.closest('[data-soltar-dia]');
  if (!alvo) return;
  e.preventDefault();
  $$('.sobre').forEach((x) => x !== alvo && x.classList.remove('sobre'));
  (alvo.closest('.mes-dia') || alvo).classList.add('sobre');
});

document.addEventListener('drop', (e) => {
  if (!agendaTela.arrastando) return;
  const alvo = e.target.closest('[data-soltar-dia]');
  if (!alvo) return;
  e.preventDefault();
  const t = estado.tarefas.find((x) => x.id === agendaTela.arrastando);
  if (t) {
    t.data = alvo.dataset.soltarDia;
    if ('soltarHora' in alvo.dataset) t.hora = alvo.dataset.soltarHora; // na grade de horas também muda a hora
    Object.keys(estado.avisados).forEach((k) => { if (k.startsWith(t.id + '|')) delete estado.avisados[k]; });
    salvar(); desenhar();
    avisar(`Movida para ${dataCurta(t.data)}${t.hora ? ' às ' + t.hora : ''}.`);
  }
  agendaTela.arrastando = null;
});

document.addEventListener('dragend', () => {
  agendaTela.arrastando = null;
  $$('.sobre').forEach((x) => x.classList.remove('sobre'));
});
