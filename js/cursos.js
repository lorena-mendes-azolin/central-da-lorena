const STATUS_MATERIA = { cursando: 'Em andamento', afazer: 'Não começou', concluida: 'Concluída' };
const TIPOS_TAREFA = ['Atividade', 'Trabalho', 'Prova', 'Leitura', 'Aula', 'Outro'];
const COR_TIPO_TAREFA = { Atividade: '#9d86ff', Trabalho: '#6aaeff', Prova: '#f59ad8', Leitura: '#5fd6a4', Aula: '#62c9f5', Outro: '#a5a3c8' };
const cursosTela = { filtro: {}, aba: 'tarefas', mostrarFeitas: false, criando: false, vista: {}, cadDono: {} };

function palavras(rotulo) {
  return rotulo === 'Matéria'
    ? { nome: 'matéria', plural: 'matérias', um: 'uma', nova: 'Nova', todos: 'Todas', todasMin: 'todas', concluidos: 'Concluídas', concluido: 'Concluída', nela: 'nela', adicionado: 'adicionada' }
    : { nome: 'curso', plural: 'cursos', um: 'um', nova: 'Novo', todos: 'Todos', todasMin: 'todos', concluidos: 'Concluídos', concluido: 'Concluído', nela: 'nele', adicionado: 'adicionado' };
}

function regraNotas(l) { return { media: 6, p1: 1, p2: 1, ...(l.regra || {}) }; }
const fmtNota = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function calcNotas(l, m) {
  const r = regraNotas(l);
  const av = m.av || {};
  const num = (v) => (v === '' || v === undefined ? null : numero(v));
  const a1 = num(av.a1), a2 = num(av.a2), af = num(av.af);
  const P = r.p1 + r.p2;
  const res = { media: null, texto: 'Coloque as notas para ver quanto falta.', tom: '' };
  if (a1 === null && a2 === null) return res;
  if (a1 === null || a2 === null) {
    const tem = a1 !== null ? a1 : a2;
    const pTem = a1 !== null ? r.p1 : r.p2;
    const pFalta = a1 !== null ? r.p2 : r.p1;
    const falta = a1 !== null ? 'A2' : 'A1';
    const precisa = (r.media * P - tem * pTem) / pFalta;
    res.media = tem;
    if (precisa <= 0) Object.assign(res, { texto: `Média garantida! Qualquer nota na ${falta} já passa.`, tom: 'ok' });
    else if (precisa > 10) Object.assign(res, { texto: `Mesmo com 10 na ${falta} não fecha ${fmtNota(r.media)}. A AF pode salvar.`, tom: 'ruim' });
    else Object.assign(res, { texto: `Você precisa de ${fmtNota(Math.ceil(precisa * 10) / 10)} na ${falta} para passar direto.`, tom: precisa > 7 ? 'atencao' : '' });
    return res;
  }
  const media = (a1 * r.p1 + a2 * r.p2) / P;
  res.media = media;
  if (media >= r.media) return Object.assign(res, { texto: `Aprovada com média ${fmtNota(media)}!`, tom: 'ok' });
  if (af !== null) {
    const final = Math.max(media, (af * r.p1 + a2 * r.p2) / P, (a1 * r.p1 + af * r.p2) / P);
    res.media = final;
    return Object.assign(res, final >= r.media
      ? { texto: `Aprovada na AF com média ${fmtNota(final)}!`, tom: 'ok' }
      : { texto: `Média final ${fmtNota(final)}, abaixo de ${fmtNota(r.media)}.`, tom: 'ruim' });
  }
  const precisa = Math.min((r.media * P - a2 * r.p2) / r.p1, (r.media * P - a1 * r.p1) / r.p2);
  return Object.assign(res, precisa > 10
    ? { texto: `Média ${fmtNota(media)}. Mesmo com 10 na AF não chega a ${fmtNota(r.media)}.`, tom: 'ruim' }
    : { texto: `Média ${fmtNota(media)}. Você precisa de ${fmtNota(Math.ceil(precisa * 10) / 10)} na AF (ela substitui a menor nota).`, tom: 'atencao' });
}

function minutosEstudo(ref, desde = '') {
  return Object.entries(estado.diario).reduce((s, [d, r]) => s + (d >= desde ? (r.estudo?.[ref] || 0) : 0), 0);
}
function textoMinutos(min) {
  if (!min) return '0 min';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

function nomeStatus(l, s) {
  return s === 'concluida' ? palavras(l.rotulo).concluido : STATUS_MATERIA[s];
}

function htmlCursos(l) {
  const f = cursosTela.filtro[l.id] || 'todas';
  const mats = l.materias.filter((m) => f === 'todas' || m.status === f);
  const proximas = l.materias.flatMap((m) => m.tarefas.filter((t) => !t.feito).map((t) => ({ t, m })))
    .sort((a, b) => (a.t.data || '9999').localeCompare(b.t.data || '9999'));
  const rot = l.rotulo || 'Curso';
  const p = palavras(rot);
  const vista = cursosTela.vista[l.id] || 'cards';

  const topo = `${htmlCabLista(l)}
  <div class="barra-lista">
    <div class="segmento">
      <button class="${vista === 'cards' ? 'ativo' : ''}" data-acao="cursos-vista" data-lista="${l.id}" data-v="cards">${ic('grid', 'p')} ${rot === 'Matéria' ? 'Matérias' : 'Cursos'}</button>
      <button class="${vista === 'caderno' ? 'ativo' : ''}" data-acao="cursos-vista" data-lista="${l.id}" data-v="caderno">${ic('notebook', 'p')} Caderno</button>
    </div>
    <span class="espaco"></span>
    <label class="rotulo-select">Chamar de
      <select data-mudar="campo" data-ref="${l.id}" data-campo="rotulo" data-redesenhar="1">
        ${['Matéria', 'Curso'].map((r) => `<option ${rot === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select></label>
  </div>`;

  if (vista === 'caderno') {
    const donoId = cursosTela.cadDono[l.id] || 'geral';
    const m = l.materias.find((x) => x.id === donoId);
    const dono = m || l;
    const ref = m ? `${l.id}/${m.id}` : l.id;
    return `${topo}
    <div class="chips">
      <button class="chip ${!m ? 'ativo' : ''}" data-acao="cursos-cad-dono" data-lista="${l.id}" data-id="geral">${ic('notebook', 'p')} Geral <b>${(l.notas || []).length}</b></button>
      ${l.materias.map((x) => `<button class="chip ${m && m.id === x.id ? 'ativo' : ''}" data-acao="cursos-cad-dono" data-lista="${l.id}" data-id="${x.id}">${esc(x.nome)} <b>${(x.notas || []).length}</b></button>`).join('')}
    </div>
    ${htmlCaderno(dono, ref, m ? `Crie uma página para cada aula de ${esc(m.nome)}.` : `Anotações que valem para ${p.todasMin} ${p.plural === 'matérias' ? 'as' : 'os'} ${p.plural}.`)}`;
  }

  return `${topo}
  <div class="chips">
    ${[['todas', p.todos], ['cursando', 'Em andamento'], ['afazer', 'Não começou'], ['concluida', p.concluidos]].map(([id, nome]) =>
      `<button class="chip ${f === id ? 'ativo' : ''}" data-acao="cursos-filtro" data-lista="${l.id}" data-f="${id}">${nome}
        <b>${id === 'todas' ? l.materias.length : l.materias.filter((m) => m.status === id).length}</b></button>`).join('')}
  </div>

  <div class="grade-cards">
    ${mats.map((m) => htmlCartaoMateria(l, m)).join('')}
    <form class="card cartao-novo" data-form="materia-nova" data-lista="${l.id}">
      <span class="selo c-violeta">${ic('plus')}</span>
      <input type="text" name="nome" placeholder="${p.nova} ${p.nome}" maxlength="80" aria-label="Nome">
      <input type="text" name="tag" placeholder="Etiqueta (opcional)" maxlength="30" aria-label="Etiqueta">
      <button class="btn" type="submit">Adicionar</button>
    </form>
  </div>
  ${!l.materias.length ? `<p class="dica">Comece adicionando ${p.um} ${p.nome}. Depois clique ${p.nela} para colocar as tarefas, provas e anotações das aulas.</p>` : ''}

  <h2 class="secao-titulo">${ic('check')} Próximas tarefas de ${p.todasMin} ${p.plural === 'matérias' ? 'as' : 'os'} ${p.plural}</h2>
  <section class="card">
    ${proximas.length ? proximas.map(({ t, m }) => htmlTarefaMateria(l, m, t, true)).join('') : `<p class="vazio">Nenhuma tarefa pendente. Abra ${p.um} ${p.nome} para adicionar.</p>`}
  </section>`;
}

function htmlCartaoMateria(l, m) {
  const total = m.tarefas.length;
  const feitas = m.tarefas.filter((t) => t.feito).length;
  const prox = m.tarefas.filter((t) => !t.feito && t.data).sort((a, b) => a.data.localeCompare(b.data))[0];
  const capa = (m.anexos || []).find((a) => a.tipo === 'imagem');
  const notas = calcNotas(l, m);
  const minutos = minutosEstudo(`${l.id}/${m.id}`);
  return `<a class="card cartao-materia" href="#lista-${l.id}--${m.id}">
    ${capa ? `<img class="capa" src="${capa.url}" alt="">` : ''}
    <div class="cm-topo"><b>${esc(m.nome)}</b><span class="status-materia st-m-${m.status}">${nomeStatus(l, m.status)}</span></div>
    ${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ''}
    <div class="cm-prog"><span>${feitas}/${total} tarefas</span><span class="prog"><i style="width:${total ? (feitas / total) * 100 : 0}%"></i></span></div>
    <div class="cm-prox">${prox ? `${ic('clock', 'p')} ${esc(prox.titulo)} · ${quandoFalta(prox.data).toLowerCase()}` : `<span style="color:var(--fraco)">Sem tarefas com data</span>`}</div>
    ${notas.media !== null || minutos ? `<div class="cm-extra">
      ${notas.media !== null ? `<span class="nota-chip ${notas.tom}">${ic('star', 'p')} média ${fmtNota(notas.media)}</span>` : ''}
      ${minutos ? `<span>${ic('timer', 'p')} ${textoMinutos(minutos)} estudadas</span>` : ''}
    </div>` : ''}
  </a>`;
}

function htmlTarefaMateria(l, m, t, mostrarMateria = false) {
  const atrasada = !t.feito && t.data && t.data < hojeISO();
  const ref = `${l.id}/${m.id}/tarefa/${t.id}`;
  return `<div class="item ${t.feito ? 'feito' : ''} ${atrasada ? 'atrasado' : ''}">
    <button class="check ${t.feito ? 'on' : ''}" data-acao="tm-check" data-ref="${ref}" aria-label="Concluir">${t.feito ? ic('check') : ''}</button>
    <span class="txt">${mostrarMateria ? esc(t.titulo) : `<input class="inline inline-t" value="${esc(t.titulo)}" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Tarefa">`}
      <span class="sub">${mostrarMateria ? `<a href="#lista-${l.id}--${m.id}">${esc(m.nome)}</a> · ` : ''}${t.data ? `${dataCurta(t.data)} · ${quandoFalta(t.data).toLowerCase()}` : 'sem data'}${atrasada ? ' · atrasada' : ''}</span></span>
    <span class="tag"><i style="background:${COR_TIPO_TAREFA[t.tipo] || '#a5a3c8'}"></i>${esc(t.tipo)}</span>
    ${mostrarMateria ? '' : `<input type="date" class="data-tarefa" value="${t.data}" data-mudar="campo" data-ref="${ref}" data-campo="data" data-redesenhar="1" aria-label="Data">`}
    <button class="acao-item apagar" data-acao="tm-del" data-lista="${l.id}" data-materia="${m.id}" data-id="${t.id}" title="Apagar tarefa">${ic('trash', 'p')}</button>
  </div>`;
}

function paginaMateria(l, idMateria) {
  const m = l.materias.find((x) => x.id === idMateria);
  if (!m) return null;
  return { titulo: `${l.nome} › ${m.nome}`, nomeMenu: 'lista-' + l.id, desenhar: () => htmlMateria(l, m) };
}

function htmlMateria(l, m) {
  const ref = `${l.id}/${m.id}`;
  const aba = cursosTela.aba;
  const tarefas = m.tarefas.filter((t) => cursosTela.mostrarFeitas || !t.feito)
    .sort((a, b) => Number(a.feito) - Number(b.feito) || (a.data || '9999').localeCompare(b.data || '9999'));
  const feitas = m.tarefas.filter((t) => t.feito).length;
  const nCartas = baralhos().filter((b) => b.ref === ref).reduce((s, b) => s + b.cards.length, 0);

  return `
  ${htmlVoltar(l)}
  <div class="materia-cab">
    <div class="textos">
      <input class="titulo-edit" value="${esc(m.nome)}" data-digitar="campo" data-ref="${ref}" data-campo="nome" aria-label="Nome" maxlength="80">
      <input class="desc-edit" value="${esc(m.tag)}" placeholder="Etiqueta" data-digitar="campo" data-ref="${ref}" data-campo="tag" aria-label="Etiqueta" maxlength="30">
    </div>
    <div class="segmento">
      ${Object.keys(STATUS_MATERIA).map((id) => `<button class="${m.status === id ? 'ativo' : ''}" data-acao="materia-status" data-ref="${ref}" data-s="${id}">${nomeStatus(l, id)}</button>`).join('')}
    </div>
  </div>

  <div class="barra-lista">
    <div class="segmento">
      <button class="${aba === 'tarefas' ? 'ativo' : ''}" data-acao="materia-aba" data-a="tarefas">${ic('check', 'p')} Tarefas e provas</button>
      <button class="${aba === 'caderno' ? 'ativo' : ''}" data-acao="materia-aba" data-a="caderno">${ic('notebook', 'p')} Caderno de aulas</button>
      <button class="${aba === 'notas' ? 'ativo' : ''}" data-acao="materia-aba" data-a="notas">${ic('star', 'p')} Notas e estudo</button>
      <button class="${aba === 'sobre' ? 'ativo' : ''}" data-acao="materia-aba" data-a="sobre">${ic('note', 'p')} Sobre, links e imagens</button>
    </div>
    <span class="espaco"></span>
    <button class="btn-mini" data-acao="flash-da-materia" data-ref="${ref}">${ic('layers', 'p')} Flashcards${nCartas ? ` (${nCartas})` : ''}</button>
    <button class="btn-mini" data-acao="materia-del" data-lista="${l.id}" data-id="${m.id}">${ic('trash', 'p')} Excluir ${(l.rotulo || 'curso').toLowerCase()}</button>
  </div>

  ${aba === 'caderno' ? htmlCaderno(m, ref, 'Crie uma página para cada aula e anote o que aprendeu.') : ''}

  ${aba === 'notas' ? htmlNotasEstudo(l, m, ref) : ''}

  ${aba === 'sobre' ? `<section class="card">
    ${htmlEditor(ref, 'descricao', m.descricao, 'Escreva aqui…')}
    <h3 class="sub-titulo">${ic('image', 'p')} Links e imagens</h3>
    ${htmlAnexos(m, ref)}
  </section>` : ''}

  ${aba === 'tarefas' ? `<section class="card">
    <form class="form-linha" data-form="tm-nova" data-ref="${ref}" style="margin-bottom:12px">
      <input type="text" name="titulo" id="tm-titulo" placeholder="Nova tarefa" maxlength="120" data-precisa style="flex:3 1 220px">
      <select name="tipo" aria-label="Tipo">${TIPOS_TAREFA.map((t) => `<option>${t}</option>`).join('')}</select>
      <input type="date" name="data" aria-label="Data">
      <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
    </form>
    ${tarefas.map((t) => htmlTarefaMateria(l, m, t)).join('') || '<p class="vazio">Nenhuma tarefa pendente.</p>'}
    ${feitas ? `<button class="btn-mini" data-acao="tm-mostrar-feitas" style="margin-top:10px">${cursosTela.mostrarFeitas ? 'Esconder' : 'Mostrar'} concluídas (${feitas})</button>` : ''}
  </section>` : ''}`;
}

function htmlNotasEstudo(l, m, ref) {
  const r = regraNotas(l);
  const av = m.av || {};
  const res = calcNotas(l, m);
  const semana = segundaDaSemana(hojeISO());
  const focando = estado.config.focoMateria === ref;
  return `<div class="grade g2">
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('star')}</span> Notas</h2>
      <div class="notas-grade">
        ${[['a1', 'A1'], ['a2', 'A2'], ['af', 'AF (substitutiva)']].map(([k, n]) => `<label class="campo">${n}
          <input type="text" inputmode="decimal" value="${esc(av[k] ?? '')}" placeholder="—" data-mudar="nota" data-ref="${ref}" data-k="${k}"></label>`).join('')}
      </div>
      <div class="resultado-nota ${res.tom}">
        ${res.media !== null ? `<b>${fmtNota(res.media)}</b>` : ''}<span>${res.texto}</span>
      </div>
      <details class="regra">
        <summary>Regra de cálculo: média ${fmtNota(r.media)} · pesos ${r.p1} e ${r.p2}</summary>
        <div class="notas-grade">
          <label class="campo">Média para passar<input type="text" inputmode="decimal" value="${fmtNota(r.media)}" data-mudar="regra" data-lista="${l.id}" data-k="media"></label>
          <label class="campo">Peso da A1<input type="number" min="1" max="10" value="${r.p1}" data-mudar="regra" data-lista="${l.id}" data-k="p1"></label>
          <label class="campo">Peso da A2<input type="number" min="1" max="10" value="${r.p2}" data-mudar="regra" data-lista="${l.id}" data-k="p2"></label>
        </div>
        <p class="dica">Vale para todas as ${palavras(l.rotulo).plural} de ${esc(l.nome)}. A AF entra no lugar da nota que mais ajudar.</p>
      </details>
    </section>

    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('timer')}</span> Tempo de estudo</h2>
      <div class="cal-numeros" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><b>${textoMinutos(minutosEstudo(ref, semana))}</b><span>nesta semana</span></div>
        <div><b>${textoMinutos(minutosEstudo(ref))}</b><span>no total</span></div>
      </div>
      <form class="form-linha" data-form="estudo-manual" data-ref="${ref}" style="margin-top:14px">
        <input type="number" name="min" min="1" max="600" placeholder="Minutos" data-precisa style="flex:1 1 110px">
        <input type="date" name="data" value="${hojeISO()}" style="flex:1 1 140px" aria-label="Dia">
        <button class="btn sec" type="submit">${ic('plus', 'p')} Registrar tempo</button>
      </form>
      <button class="btn ${focando ? 'sec' : ''}" data-acao="estudar-com-foco" data-ref="${ref}" style="margin-top:12px">${ic('play', 'p')} ${focando ? 'O Foco já está nesta matéria' : 'Estudar com o Foco'}</button>
      <p class="dica">Cada ciclo de Foco completo com esta matéria escolhida soma o tempo aqui sozinho.</p>
    </section>
  </div>`;
}

MUDAR.nota = (el) => {
  const m = acharRef(el.dataset.ref);
  m.av = m.av || {};
  const v = el.value.trim();
  if (v !== '' && (numero(v) === null || numero(v) < 0 || numero(v) > 10)) { avisar('A nota vai de 0 a 10.'); el.value = m.av[el.dataset.k] || ''; return; }
  m.av[el.dataset.k] = v;
  salvar(); desenhar();
};
MUDAR.regra = (el) => {
  const l = acharLista(el.dataset.lista);
  l.regra = { ...regraNotas(l), [el.dataset.k]: numero(el.value) || (el.dataset.k === 'media' ? 6 : 1) };
  salvar(); desenhar();
};
FORMS['estudo-manual'] = (d, form) => {
  const reg = registroDoDia(d.data || hojeISO());
  reg.estudo = reg.estudo || {};
  reg.estudo[form.dataset.ref] = (reg.estudo[form.dataset.ref] || 0) + Number(d.min);
  salvar(); desenhar();
  avisar(`${d.min} min registrados.`);
};
ACOES['estudar-com-foco'] = (el) => {
  estado.config.focoMateria = el.dataset.ref;
  salvar();
  location.hash = 'dashboard';
  avisar('Foco ligado a esta matéria. É só clicar em Começar.');
};

ACOES['cursos-vista'] = (el) => { cursosTela.vista[el.dataset.lista] = el.dataset.v; desenhar(); };
ACOES['cursos-cad-dono'] = (el) => { cursosTela.cadDono[el.dataset.lista] = el.dataset.id; desenhar(); };
ACOES['cursos-filtro'] = (el) => { cursosTela.filtro[el.dataset.lista] = el.dataset.f; desenhar(); };

FORMS['materia-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  const p = palavras(l.rotulo);
  l.materias.push(materia(d.nome || `${p.nova} ${p.nome}`, 'cursando', d.tag || ''));
  salvar(); desenhar();
  avisar(`${p.nome[0].toUpperCase() + p.nome.slice(1)} ${p.adicionado}. Clique ${p.nela} para editar e colocar tarefas.`);
};

ACOES['materia-status'] = (el) => { acharRef(el.dataset.ref).status = el.dataset.s; salvar(); desenhar(); };
ACOES['materia-aba'] = (el) => { cursosTela.aba = el.dataset.a; desenhar(); };
ACOES['tm-mostrar-feitas'] = () => { cursosTela.mostrarFeitas = !cursosTela.mostrarFeitas; desenhar(); };

ACOES['materia-del'] = (el) => {
  const l = acharLista(el.dataset.lista);
  location.hash = 'lista-' + l.id;
  removerComDesfazer(l.materias, el.dataset.id, l.rotulo || 'Curso');
};

FORMS['tm-nova'] = (d, form) => {
  const m = acharRef(form.dataset.ref);
  m.tarefas.push(tarefaMateria(d.titulo, d.tipo, d.data || ''));
  salvar(); desenhar();
  $('#tm-titulo')?.focus();
};

ACOES['tm-check'] = (el) => {
  const t = acharRef(el.dataset.ref);
  t.feito = !t.feito;
  t.feitoEm = t.feito ? hojeISO() : '';
  salvar(); desenhar();
  if (t.feito) { tocarSom(true); avisar('Tarefa concluída!'); }
};

ACOES['tm-del'] = (el) => {
  const m = acharLista(el.dataset.lista).materias.find((x) => x.id === el.dataset.materia);
  removerComDesfazer(m.tarefas, el.dataset.id, 'Tarefa');
};
