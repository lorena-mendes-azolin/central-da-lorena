// =========================================================
// cursos.js — listas de MATÉRIAS / CURSOS (Faculdade, Estudos…)
// Cada matéria tem: tarefas (atividade, prova, trabalho…),
// caderno de aulas e uma parte "sobre" com texto, links e imagens.
// =========================================================

const STATUS_MATERIA = { cursando: 'Em andamento', afazer: 'Não começou', concluida: 'Concluída' };
const TIPOS_TAREFA = ['Atividade', 'Trabalho', 'Prova', 'Leitura', 'Aula', 'Outro'];
const COR_TIPO_TAREFA = { Atividade: '#9d86ff', Trabalho: '#6aaeff', Prova: '#f59ad8', Leitura: '#5fd6a4', Aula: '#62c9f5', Outro: '#a5a3c8' };
const cursosTela = { filtro: {}, aba: 'tarefas', mostrarFeitas: false, criando: false };

function plural(rotulo) {
  return rotulo === 'Matéria' ? 'matérias' : 'cursos';
}

// ---------- Página da lista (todas as matérias) ----------
function htmlCursos(l) {
  const f = cursosTela.filtro[l.id] || 'todas';
  const mats = l.materias.filter((m) => f === 'todas' || m.status === f);
  const hoje = hojeISO();
  const proximas = l.materias.flatMap((m) => m.tarefas.filter((t) => !t.feito).map((t) => ({ t, m })))
    .sort((a, b) => (a.t.data || '9999').localeCompare(b.t.data || '9999'));
  const rot = l.rotulo || 'Curso';

  return `
  ${htmlCabLista(l)}
  <div class="barra-lista">
    <div class="chips" style="margin:0">
      ${[['todas', 'Todas'], ['cursando', 'Em andamento'], ['afazer', 'Não começou'], ['concluida', 'Concluídas']].map(([id, nome]) =>
        `<button class="chip ${f === id ? 'ativo' : ''}" data-acao="cursos-filtro" data-lista="${l.id}" data-f="${id}">${nome}
          <b>${id === 'todas' ? l.materias.length : l.materias.filter((m) => m.status === id).length}</b></button>`).join('')}
    </div>
    <span class="espaco"></span>
    <label class="rotulo-select">Chamar de
      <select data-mudar="campo" data-ref="${l.id}" data-campo="rotulo" data-redesenhar="1">
        ${['Matéria', 'Curso'].map((r) => `<option ${rot === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select></label>
  </div>

  <div class="grade-cards">
    ${mats.map((m) => htmlCartaoMateria(l, m)).join('')}
    <form class="card cartao-novo" data-form="materia-nova" data-lista="${l.id}">
      <span class="selo c-violeta">${ic('plus')}</span>
      <input type="text" name="nome" placeholder="Nova ${rot.toLowerCase()}" maxlength="80" required aria-label="Nome">
      <input type="text" name="tag" placeholder="Período ou etiqueta (opcional)" maxlength="30" aria-label="Etiqueta">
      <button class="btn" type="submit">Adicionar</button>
    </form>
  </div>
  ${!l.materias.length ? `<p class="dica">Comece adicionando uma ${rot.toLowerCase()}. Depois clique nela para colocar as tarefas, provas e anotações das aulas.</p>` : ''}

  <h2 class="secao-titulo">${ic('check')} Próximas tarefas de todas as ${plural(rot)}</h2>
  <section class="card">
    ${proximas.length ? proximas.map(({ t, m }) => htmlTarefaMateria(l, m, t, true)).join('') : `<p class="vazio">Nenhuma tarefa pendente. Abra uma ${rot.toLowerCase()} para adicionar.</p>`}
  </section>`;
}

function htmlCartaoMateria(l, m) {
  const total = m.tarefas.length;
  const feitas = m.tarefas.filter((t) => t.feito).length;
  const prox = m.tarefas.filter((t) => !t.feito && t.data).sort((a, b) => a.data.localeCompare(b.data))[0];
  const capa = (m.anexos || []).find((a) => a.tipo === 'imagem');
  return `<a class="card cartao-materia" href="#lista-${l.id}--${m.id}">
    ${capa ? `<img class="capa" src="${capa.url}" alt="">` : ''}
    <div class="cm-topo"><b>${esc(m.nome)}</b><span class="status-materia st-m-${m.status}">${STATUS_MATERIA[m.status]}</span></div>
    ${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ''}
    <div class="cm-prog"><span>${feitas}/${total} tarefas</span><span class="prog"><i style="width:${total ? (feitas / total) * 100 : 0}%"></i></span></div>
    <div class="cm-prox">${prox ? `${ic('clock', 'p')} ${esc(prox.titulo)} · ${quandoFalta(prox.data).toLowerCase()}` : `<span style="color:var(--fraco)">Sem tarefas com data</span>`}</div>
  </a>`;
}

// Uma tarefa de matéria (na lista geral mostra também o nome da matéria)
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

// ---------- Página de dentro de uma matéria ----------
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

  return `
  ${htmlVoltar(l)}
  <div class="materia-cab">
    <div class="textos">
      <input class="titulo-edit" value="${esc(m.nome)}" data-digitar="campo" data-ref="${ref}" data-campo="nome" aria-label="Nome" maxlength="80">
      <input class="desc-edit" value="${esc(m.tag)}" placeholder="Período ou etiqueta" data-digitar="campo" data-ref="${ref}" data-campo="tag" aria-label="Etiqueta" maxlength="30">
    </div>
    <div class="segmento">
      ${Object.entries(STATUS_MATERIA).map(([id, nome]) => `<button class="${m.status === id ? 'ativo' : ''}" data-acao="materia-status" data-ref="${ref}" data-s="${id}">${nome}</button>`).join('')}
    </div>
  </div>

  <div class="barra-lista">
    <div class="segmento">
      <button class="${aba === 'tarefas' ? 'ativo' : ''}" data-acao="materia-aba" data-a="tarefas">${ic('check', 'p')} Tarefas e provas</button>
      <button class="${aba === 'caderno' ? 'ativo' : ''}" data-acao="materia-aba" data-a="caderno">${ic('notebook', 'p')} Caderno de aulas</button>
      <button class="${aba === 'sobre' ? 'ativo' : ''}" data-acao="materia-aba" data-a="sobre">${ic('note', 'p')} Sobre, links e imagens</button>
    </div>
    <span class="espaco"></span>
    <button class="btn-mini" data-acao="materia-del" data-lista="${l.id}" data-id="${m.id}">${ic('trash', 'p')} Excluir ${(l.rotulo || 'curso').toLowerCase()}</button>
  </div>

  ${aba === 'caderno' ? htmlCaderno(m, ref, 'Crie uma página para cada aula e anote o que aprendeu.') : ''}

  ${aba === 'sobre' ? `<section class="card">
    ${htmlEditor(ref, 'descricao', m.descricao, 'Professor, horários, como é a avaliação, materiais…')}
    <h3 class="sub-titulo">${ic('image', 'p')} Links e imagens</h3>
    ${htmlAnexos(m, ref)}
  </section>` : ''}

  ${aba === 'tarefas' ? `<section class="card">
    <form class="form-linha" data-form="tm-nova" data-ref="${ref}" style="margin-bottom:12px">
      <input type="text" name="titulo" id="tm-titulo" placeholder="Nova tarefa (ex.: Atividade 2, Prova A1…)" maxlength="120" required style="flex:3 1 220px">
      <select name="tipo" aria-label="Tipo">${TIPOS_TAREFA.map((t) => `<option>${t}</option>`).join('')}</select>
      <input type="date" name="data" aria-label="Data">
      <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
    </form>
    ${tarefas.map((t) => htmlTarefaMateria(l, m, t)).join('') || '<p class="vazio">Nenhuma tarefa pendente.</p>'}
    ${feitas ? `<button class="btn-mini" data-acao="tm-mostrar-feitas" style="margin-top:10px">${cursosTela.mostrarFeitas ? 'Esconder' : 'Mostrar'} concluídas (${feitas})</button>` : ''}
  </section>` : ''}`;
}

// ---------- Ações ----------
ACOES['cursos-filtro'] = (el) => { cursosTela.filtro[el.dataset.lista] = el.dataset.f; desenhar(); };

FORMS['materia-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  l.materias.push(materia(d.nome, 'cursando', d.tag || ''));
  salvar(); desenhar();
  avisar(l.rotulo === 'Matéria' ? 'Matéria adicionada. Clique nela para colocar tarefas e anotações.' : 'Curso adicionado. Clique nele para colocar tarefas e anotações.');
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
