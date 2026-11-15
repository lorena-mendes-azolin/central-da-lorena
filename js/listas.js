// =========================================================
// listas.js — o "esqueleto" das listas do menu lateral
//   • encontra listas e itens (acharLista / acharRef)
//   • escolhe qual página desenhar para cada tipo de lista
//   • cria listas novas (perguntando o tipo)
//   • lista SIMPLES (lista / quadro / caderno)
// Os outros tipos ficam em: cursos.js, metas.js, colecoes.js, compras.js
// =========================================================

const listaTela = { filtro: 'todos', notasAbertas: new Set(), arrastando: null };
const ORDEM_STATUS = ['afazer', 'fazendo', 'feito'];

function acharLista(id) {
  return estado.listas.find((l) => l.id === id);
}

// "faculdade/abc/tarefa/xyz" -> o objeto da tarefa xyz da matéria abc
function acharRef(ref) {
  if (!ref) return null;
  const [idLista, ...resto] = ref.split('/');
  let obj = acharLista(idLista);
  for (let i = 0; obj && i < resto.length; i++) {
    const seg = resto[i];
    if (seg === 'nota') { obj = (obj.notas || []).find((n) => n.id === resto[++i]); continue; }
    if (seg === 'tarefa') { obj = (obj.tarefas || []).find((t) => t.id === resto[++i]); continue; }
    if (seg === 'etapa') { obj = (obj.etapas || []).find((t) => t.id === resto[++i]); continue; }
    const filhos = obj.materias || obj.metas || obj.categorias || obj.itens || [];
    obj = filhos.find((x) => x.id === seg);
  }
  return obj || null;
}

// Página de uma lista: #lista-<id> ou #lista-<id>--<item> (página de dentro)
function paginaLista(endereco) {
  const [idLista, idItem] = endereco.split('--');
  const l = acharLista(idLista);
  if (!l) return null;
  if (idItem && l.tipo === 'cursos') return paginaMateria(l, idItem);
  if (idItem && l.tipo === 'metas') return paginaMeta(l, idItem);
  const desenhos = { cursos: htmlCursos, metas: htmlMetas, colecoes: htmlColecoes, compras: htmlCompras };
  return { titulo: l.nome, nomeMenu: 'lista-' + l.id, desenhar: () => (desenhos[l.tipo] || htmlSimples)(l) };
}

// Cabeçalho comum (ícone + nome + descrição editáveis)
function htmlCabLista(l, extra = '') {
  return `<div class="lista-cab">
    <button class="lista-icone" style="background:${l.cor}26;color:${l.cor}" data-acao="icone-abrir" data-id="${l.id}" title="Trocar ícone e cor">${ic(l.icone)}</button>
    <div class="textos">
      <input class="titulo-edit" value="${esc(l.nome)}" data-digitar="lista-nome" data-id="${l.id}" aria-label="Nome da lista" maxlength="40">
      <input class="desc-edit" value="${esc(l.desc)}" placeholder="Adicionar uma descrição" data-digitar="lista-desc" data-id="${l.id}" aria-label="Descrição" maxlength="120">
    </div>
    ${extra}
    <button class="btn-mini" data-acao="lista-excluir" data-id="${l.id}" title="Excluir esta lista">${ic('trash', 'p')} Excluir lista</button>
  </div>`;
}

// Link de "voltar" nas páginas de dentro
function htmlVoltar(l) {
  return `<a class="voltar" href="#lista-${l.id}">${ic('left', 'p')} ${esc(l.nome)}</a>`;
}

// =========================================================
// Lista SIMPLES
// =========================================================
function htmlSimples(l) {
  const f = listaTela.filtro;
  const itens = l.itens.filter((i) => f === 'todos' || (f === 'pendentes' ? i.status !== 'feito' : i.status === 'feito'));
  const feitos = l.itens.filter((i) => i.status === 'feito').length;
  const pct = l.itens.length ? Math.round((feitos / l.itens.length) * 100) : 0;

  return `
  ${htmlCabLista(l)}
  <div class="barra-lista">
    <div class="segmento">
      <button class="${l.visao === 'lista' ? 'ativo' : ''}" data-acao="lista-visao" data-id="${l.id}" data-v="lista">${ic('rows', 'p')} Lista</button>
      <button class="${l.visao === 'quadro' ? 'ativo' : ''}" data-acao="lista-visao" data-id="${l.id}" data-v="quadro">${ic('board', 'p')} Quadro</button>
      <button class="${l.visao === 'caderno' ? 'ativo' : ''}" data-acao="lista-visao" data-id="${l.id}" data-v="caderno">${ic('notebook', 'p')} Caderno</button>
    </div>
    <span class="espaco"></span>
    ${l.visao === 'lista' ? ['todos', 'pendentes', 'feitos'].map((x) =>
      `<button class="chip ${f === x ? 'ativo' : ''}" data-acao="lista-filtro" data-f="${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join('') : ''}
  </div>

  ${l.visao === 'caderno' ? htmlCaderno(l, l.id) : `
  <div class="progresso-lista"><span>${feitos} de ${l.itens.length} feitos</span><div class="prog"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>
  ${l.visao === 'quadro' ? htmlQuadro(l) : `
    <div class="tabela-lista">
      ${itens.map((i) => htmlItemLista(l, i)).join('') || '<p class="vazio" style="padding:14px 16px;margin:0">Nenhum item ainda. Escreva abaixo para adicionar.</p>'}
      <form class="add-item" data-form="item-novo" data-lista="${l.id}">
        <span style="color:var(--fraco);display:grid;place-items:center">${ic('plus')}</span>
        <input type="text" name="titulo" id="item-novo-${l.id}" placeholder="Novo item (Enter para adicionar)" maxlength="140" required>
      </form>
    </div>
    <p class="dica">Clique no status para mudar · o ícone de anotação abre notas, links e imagens do item.</p>`}`}`;
}

function htmlItemLista(l, i) {
  const aberta = listaTela.notasAbertas.has(i.id);
  const temExtra = i.notas || i.anexos?.length;
  return `<div class="item-lista ${i.status === 'feito' ? 'feito' : ''}">
    <button class="check ${i.status === 'feito' ? 'on' : ''}" data-acao="item-check" data-lista="${l.id}" data-id="${i.id}" aria-label="Concluir">${i.status === 'feito' ? ic('check') : ''}</button>
    <input class="inline inline-t" value="${esc(i.titulo)}" data-digitar="item-campo" data-campo="titulo" data-lista="${l.id}" data-id="${i.id}" aria-label="Título">
    <button class="status st-${i.status}" data-acao="item-status" data-lista="${l.id}" data-id="${i.id}">${STATUS[i.status]}</button>
    <input type="date" value="${i.data}" data-mudar="item-data" data-lista="${l.id}" data-id="${i.id}" aria-label="Data">
    <input class="inline tag-edit" value="${esc(i.tag)}" placeholder="etiqueta" data-digitar="item-campo" data-campo="tag" data-lista="${l.id}" data-id="${i.id}" aria-label="Etiqueta">
    <span class="acoes">
      <button class="acao-item ${temExtra ? 'tem' : ''}" data-acao="item-notas" data-id="${i.id}" title="Notas, links e imagens">${ic('note', 'p')}</button>
      <button class="acao-item apagar" data-acao="item-del" data-lista="${l.id}" data-id="${i.id}" title="Apagar item">${ic('trash', 'p')}</button>
    </span>
    ${aberta ? `<div class="notas-item">
      <textarea placeholder="Anotações…" data-digitar="item-campo" data-campo="notas" data-lista="${l.id}" data-id="${i.id}">${esc(i.notas)}</textarea>
      ${htmlAnexos(i, `${l.id}/${i.id}`)}
    </div>` : ''}
  </div>`;
}

function htmlQuadro(l) {
  return `<div class="quadro">
    ${ORDEM_STATUS.map((st) => {
      const itens = l.itens.filter((i) => i.status === st);
      return `<div class="coluna" data-coluna="${st}" data-lista="${l.id}">
        <h3><span class="status st-${st}">${STATUS[st]}</span> <span style="color:var(--fraco)">${itens.length}</span></h3>
        ${itens.map((i) => `<div class="cartao" draggable="true" data-arrastar="${i.id}">
          ${(i.anexos || []).find((a) => a.tipo === 'imagem') ? `<img class="capa" src="${i.anexos.find((a) => a.tipo === 'imagem').url}" alt="">` : ''}
          <div class="topo-c"><span>${esc(i.titulo)}</span>
            <button class="acao-item apagar" data-acao="item-del" data-lista="${l.id}" data-id="${i.id}" title="Apagar item">${ic('trash', 'p')}</button></div>
          <div class="meta">
            ${i.tag ? `<span class="tag">${esc(i.tag)}</span>` : ''}
            ${i.data ? `<span>${dataCurta(i.data)}</span>` : ''}
            <button class="btn-mini" style="padding:2px 8px;margin-left:auto" data-acao="item-status" data-lista="${l.id}" data-id="${i.id}" title="Avançar status">${ic('right', 'p')}</button>
          </div>
        </div>`).join('')}
        <form data-form="item-novo" data-lista="${l.id}" data-status="${st}">
          <input type="text" name="titulo" class="inline" placeholder="+ Novo item" maxlength="140" required>
        </form>
      </div>`;
    }).join('')}
  </div>
  <p class="dica">Arraste os cartões entre as colunas, ou use a seta para avançar.</p>`;
}

function itemDe(el) {
  const l = acharLista(el.dataset.lista);
  return [l, l?.itens?.find((i) => i.id === el.dataset.id)];
}

FORMS['item-novo'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  l.itens.push(it(d.titulo, form.dataset.status || 'afazer'));
  salvar(); desenhar();
  const campo = form.dataset.status ? $(`form[data-status="${form.dataset.status}"] input`) : $(`#item-novo-${l.id}`);
  campo?.focus();
};

ACOES['item-check'] = (el) => {
  const [, i] = itemDe(el);
  i.status = i.status === 'feito' ? 'afazer' : 'feito';
  salvar(); desenhar();
  if (i.status === 'feito') tocarSom(true);
};

ACOES['item-status'] = (el) => {
  const [, i] = itemDe(el);
  i.status = ORDEM_STATUS[(ORDEM_STATUS.indexOf(i.status) + 1) % 3];
  salvar(); desenhar();
  if (i.status === 'feito') tocarSom(true);
};

ACOES['item-notas'] = (el) => {
  const id = el.dataset.id;
  listaTela.notasAbertas.has(id) ? listaTela.notasAbertas.delete(id) : listaTela.notasAbertas.add(id);
  desenhar();
};

ACOES['item-del'] = (el) => removerComDesfazer(acharLista(el.dataset.lista).itens, el.dataset.id, 'Item');

DIGITAR['item-campo'] = (el) => {
  const [, i] = itemDe(el);
  if (i) { i[el.dataset.campo] = el.value; salvar(); }
};

MUDAR['item-data'] = (el) => {
  const [, i] = itemDe(el);
  i.data = el.value;
  salvar();
};

// Arrastar cartões no quadro
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest('[data-arrastar]');
  if (!c) return;
  listaTela.arrastando = c.dataset.arrastar;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', listaTela.arrastando);
});
document.addEventListener('dragover', (e) => {
  const col = e.target.closest('[data-coluna]');
  if (!col || !listaTela.arrastando) return;
  e.preventDefault();
  $$('.coluna.sobre').forEach((c) => c !== col && c.classList.remove('sobre'));
  col.classList.add('sobre');
});
document.addEventListener('drop', (e) => {
  const col = e.target.closest('[data-coluna]');
  if (!col || !listaTela.arrastando) return;
  e.preventDefault();
  const i = acharLista(col.dataset.lista)?.itens.find((x) => x.id === listaTela.arrastando);
  if (i) {
    i.status = col.dataset.coluna;
    salvar(); desenhar();
    if (i.status === 'feito') tocarSom(true);
  }
  listaTela.arrastando = null;
});
document.addEventListener('dragend', () => { listaTela.arrastando = null; $$('.coluna.sobre').forEach((c) => c.classList.remove('sobre')); });

// =========================================================
// Ações de todas as listas
// =========================================================

// Criar lista: abre a janela perguntando o tipo
ACOES['lista-nova'] = () => {
  fecharMenu();
  const j = $('#janela-tarefa');
  j.innerHTML = `<form data-form="lista-criar" method="dialog">
    <h2>Nova lista <button type="button" class="btn-icone" data-acao="fechar-janela" aria-label="Fechar">${ic('x')}</button></h2>
    <label class="campo">Nome<input type="text" name="nome" id="nova-lista-nome" placeholder="Ex.: Inglês, Viagem, Treinos…" maxlength="40" required></label>
    <div class="campo">Que tipo de lista?</div>
    <div class="tipos-lista">
      ${Object.entries(TIPOS_LISTA).map(([id, t], k) => `<label>
        <input type="radio" name="tipo" value="${id}" ${k === 0 ? 'checked' : ''}>
        <span>${ic(t.icone)}<b>${t.nome}</b><small>${t.desc}</small></span></label>`).join('')}
    </div>
    <div class="rodape-janela">
      <button type="button" class="btn sec" data-acao="fechar-janela">Cancelar</button>
      <button type="submit" class="btn">Criar lista</button>
    </div>
  </form>`;
  j.showModal();
  setTimeout(() => $('#nova-lista-nome').focus(), 30);
};

FORMS['lista-criar'] = (d) => {
  const id = novoId();
  const n = estado.listas.length;
  const base = { id, nome: d.nome, icone: TIPOS_LISTA[d.tipo].icone, cor: CORES_LISTA[n % CORES_LISTA.length], desc: '', tipo: d.tipo };
  const extras = {
    simples: { visao: 'lista', itens: [], notas: [] },
    cursos: { rotulo: 'Curso', materias: [] },
    metas: { metas: [] },
    colecoes: { categorias: [categoria('outros', 'Geral')] },
    compras: { itens: [] },
  };
  estado.listas.push({ ...base, ...extras[d.tipo] });
  fecharJanela();
  salvar();
  location.hash = 'lista-' + id;
};

ACOES['lista-excluir'] = (el) => {
  const i = estado.listas.findIndex((l) => l.id === el.dataset.id);
  if (i < 0) return;
  const [removida] = estado.listas.splice(i, 1);
  salvar();
  location.hash = 'dashboard';
  avisar(`Lista "${removida.nome}" excluída`, () => {
    estado.listas.splice(i, 0, removida); salvar(); location.hash = 'lista-' + removida.id; desenhar();
  });
};

ACOES['lista-visao'] = (el) => { acharLista(el.dataset.id).visao = el.dataset.v; salvar(); desenhar(); };
ACOES['lista-filtro'] = (el) => { listaTela.filtro = el.dataset.f; desenhar(); };

DIGITAR['lista-nome'] = (el) => {
  acharLista(el.dataset.id).nome = el.value.trim() || 'Sem nome';
  salvar(); desenharMenu(); atualizarCaminho();
};
DIGITAR['lista-desc'] = (el) => { acharLista(el.dataset.id).desc = el.value; salvar(); };

// Campo de texto genérico de qualquer objeto: data-ref + data-campo
DIGITAR.campo = (el) => {
  const obj = acharRef(el.dataset.ref);
  if (obj) { obj[el.dataset.campo] = el.value; salvar(); }
};
MUDAR.campo = (el) => {
  const obj = acharRef(el.dataset.ref);
  if (!obj) return;
  obj[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value;
  salvar();
  if (el.dataset.redesenhar) desenhar();
};

// Escolher ícone e cor da lista
ACOES['icone-abrir'] = (el) => {
  const l = acharLista(el.dataset.id);
  const caixa = $('#escolha-icone');
  const r = el.getBoundingClientRect();
  caixa.innerHTML = `
    <p>Ícone</p>
    <div class="grade-ic">${ICONES_LISTA.map((n) => `<button class="${l.icone === n ? 'on' : ''}" data-acao="icone-escolher" data-id="${l.id}" data-ic="${n}" aria-label="${n}">${ic(n)}</button>`).join('')}</div>
    <p>Cor</p>
    <div class="grade-cor">${CORES_LISTA.map((c) => `<button class="${l.cor === c ? 'on' : ''}" style="background:${c}" data-acao="cor-escolher" data-id="${l.id}" data-cor="${c}" aria-label="cor ${c}"></button>`).join('')}</div>`;
  caixa.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 316)) + 'px';
  caixa.style.top = (r.bottom + 8) + 'px';
  caixa.hidden = false;
};

ACOES['icone-escolher'] = (el) => {
  acharLista(el.dataset.id).icone = el.dataset.ic;
  salvar(); desenhar();
  ACOES['icone-abrir']($('.lista-icone'));
};

ACOES['cor-escolher'] = (el) => {
  acharLista(el.dataset.id).cor = el.dataset.cor;
  salvar(); desenhar();
  ACOES['icone-abrir']($('.lista-icone'));
};
