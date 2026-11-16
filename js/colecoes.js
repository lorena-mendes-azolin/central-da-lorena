const colecaoTela = { cat: {}, filtro: 'todos', abertos: new Set(), criandoCat: false };

function htmlItemColecao(l, cat, i, mostrarCategoria = false) {
  const ref = `${l.id}/${cat.id}/${i.id}`;
  const aberto = colecaoTela.abertos.has(i.id);
  const img = (i.anexos || []).find((a) => a.tipo === 'imagem');
  const temExtra = i.notas || i.anexos?.length;
  return `<div class="item-colecao ${i.feito ? 'feito' : ''}">
    <div class="ic-linha">
      <button class="check ${i.feito ? 'on' : ''}" data-acao="col-check" data-ref="${ref}" title="${i.feito ? cat.falta : cat.feito}">${i.feito ? ic('check') : ''}</button>
      ${img ? `<img class="miniatura" src="${img.url}" alt="" data-acao="ver-imagem" data-src="${img.url}">` : ''}
      <input class="inline inline-t" value="${esc(i.titulo)}" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Item">
      ${mostrarCategoria ? `<span class="tag">${ic(cat.icone, 'p')} ${esc(cat.nome)}</span>` : ''}
      <span class="tag">${esc(i.feito ? cat.feito : cat.falta)}</span>
      <button class="acao-item fav ${i.favorito ? 'on' : ''}" data-acao="col-fav" data-ref="${ref}" title="${i.favorito ? 'Tirar dos favoritos' : 'Favoritar'}">${ic('star', 'p')}</button>
      <button class="acao-item ${temExtra ? 'tem' : ''}" data-acao="col-abrir" data-id="${i.id}" title="Notas, links e imagens">${ic('note', 'p')}</button>
      <button class="acao-item apagar" data-acao="col-del" data-ref="${l.id}/${cat.id}" data-id="${i.id}" title="Apagar">${ic('trash', 'p')}</button>
    </div>
    ${aberto ? `<div class="ic-extra">
      <textarea placeholder="Notas" data-digitar="campo" data-ref="${ref}" data-campo="notas">${esc(i.notas || '')}</textarea>
      ${htmlAnexos(i, ref)}
    </div>` : ''}
  </div>`;
}

function htmlColecoes(l) {
  const verFav = colecaoTela.cat[l.id] === '__fav';
  const cat = verFav ? null : l.categorias.find((c) => c.id === colecaoTela.cat[l.id]) || l.categorias[0];
  const f = colecaoTela.filtro;
  const itens = cat ? cat.itens.filter((i) => f === 'todos' || (f === 'falta' && !i.feito) || (f === 'feito' && i.feito) || (f === 'fav' && i.favorito))
    .sort((a, b) => Number(a.feito) - Number(b.feito) || Number(b.favorito) - Number(a.favorito)) : [];
  const favoritos = l.categorias.flatMap((c) => c.itens.filter((i) => i.favorito).map((i) => ({ c, i })));

  return `
  ${htmlCabLista(l)}
  <div class="carrossel">
    <button class="seta esq" data-acao="carrossel" data-d="-1" aria-label="Voltar">${ic('left', 'p')}</button>
    <div class="faixa">
      <button class="chip chip-fav ${verFav ? 'ativo' : ''}" data-acao="col-cat" data-lista="${l.id}" data-id="__fav">${ic('star', 'p')} Favoritos <b>${favoritos.length}</b></button>
      ${l.categorias.map((c) => `<button class="chip ${cat && c.id === cat.id ? 'ativo' : ''}" data-acao="col-cat" data-lista="${l.id}" data-id="${c.id}">
        ${ic(c.icone, 'p')} ${esc(c.nome)} <b>${c.itens.filter((i) => !i.feito).length}</b></button>`).join('')}
    </div>
    <button class="seta dir" data-acao="carrossel" data-d="1" aria-label="Avançar">${ic('right', 'p')}</button>
    <button class="chip" data-acao="col-nova-cat">${ic('plus', 'p')} Categoria</button>
  </div>

  ${colecaoTela.criandoCat ? `<form class="card form-linha" data-form="col-cat-nova" data-lista="${l.id}" style="margin-bottom:14px">
    <input type="text" name="nome" id="cat-nome" placeholder="Nome da categoria" maxlength="30" style="flex:2 1 200px">
    <select name="modelo" aria-label="Tipo">
      ${Object.entries(MODELOS_CATEGORIA).map(([id, m]) => `<option value="${id}">${m.falta} / ${m.feito}</option>`).join('')}
    </select>
    <button class="btn" type="submit">Criar</button>
    <button class="btn sec" type="button" data-acao="col-nova-cat">Cancelar</button>
  </form>` : ''}

  ${verFav ? `<section class="card">
    <div class="barra-lista">
      <b class="cat-nome" style="font-size:18px">${ic('star', 'p')} Favoritos</b>
      <span class="espaco"></span>
      <button class="chip ${!colecaoTela.favCat ? 'ativo' : ''}" data-acao="col-fav-cat" data-c="">Todas</button>
      ${l.categorias.filter((c) => c.itens.some((i) => i.favorito)).map((c) => `<button class="chip ${colecaoTela.favCat === c.id ? 'ativo' : ''}" data-acao="col-fav-cat" data-c="${c.id}">${ic(c.icone, 'p')} ${esc(c.nome)} <b>${c.itens.filter((i) => i.favorito).length}</b></button>`).join('')}
    </div>
    ${favoritos.filter(({ c }) => !colecaoTela.favCat || c.id === colecaoTela.favCat).map(({ c, i }) => htmlItemColecao(l, c, i, !colecaoTela.favCat)).join('') || '<p class="vazio">Toque na estrelinha de qualquer item para ele aparecer aqui.</p>'}
  </section>` : cat ? `<section class="card">
    <div class="barra-lista">
      <input class="inline inline-t cat-nome" value="${esc(cat.nome)}" data-digitar="campo" data-ref="${l.id}/${cat.id}" data-campo="nome" aria-label="Nome da categoria" maxlength="30">
      <span class="espaco"></span>
      ${[['todos', 'Todos'], ['falta', cat.falta], ['feito', cat.feito], ['fav', 'Favoritos']].map(([id, nome]) =>
        `<button class="chip ${f === id ? 'ativo' : ''}" data-acao="col-filtro" data-f="${id}">${esc(nome)}</button>`).join('')}
      <button class="acao-item apagar" data-acao="col-cat-del" data-lista="${l.id}" data-id="${cat.id}" title="Excluir categoria">${ic('trash', 'p')}</button>
    </div>

    <form class="add-item" data-form="col-item" data-ref="${l.id}/${cat.id}" style="padding:4px 0 10px">
      <span style="color:var(--fraco);display:grid;place-items:center">${ic('plus')}</span>
      <input type="text" name="titulo" id="col-novo" placeholder="Adicionar em ${esc(cat.nome)} (Enter)" maxlength="120" data-precisa>
    </form>

    ${itens.map((i) => htmlItemColecao(l, cat, i)).join('') || `<p class="vazio">${f === 'todos' ? 'Nada aqui ainda. Escreva acima para adicionar.' : 'Nada neste filtro.'}</p>`}
  </section>` : '<p class="vazio">Crie uma categoria para começar.</p>'}`;
}

ACOES['col-cat'] = (el) => { colecaoTela.cat[el.dataset.lista] = el.dataset.id; colecaoTela.filtro = 'todos'; desenhar(); };
ACOES['col-filtro'] = (el) => { colecaoTela.filtro = el.dataset.f; desenhar(); };
ACOES['col-nova-cat'] = () => { colecaoTela.criandoCat = !colecaoTela.criandoCat; desenhar(); $('#cat-nome')?.focus(); };

FORMS['col-cat-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  const c = categoria(d.modelo, d.nome || 'Nova categoria');
  l.categorias.push(c);
  colecaoTela.cat[l.id] = c.id;
  colecaoTela.criandoCat = false;
  salvar(); desenhar();
};

ACOES['col-cat-del'] = (el) => {
  delete colecaoTela.cat[el.dataset.lista];
  removerComDesfazer(acharLista(el.dataset.lista).categorias, el.dataset.id, 'Categoria');
};

FORMS['col-item'] = (d, form) => {
  acharRef(form.dataset.ref).itens.unshift({ id: novoId(), titulo: d.titulo, feito: false, favorito: false, notas: '', anexos: [] });
  salvar(); desenhar();
  $('#col-novo')?.focus();
};

ACOES['col-check'] = (el) => {
  const i = acharRef(el.dataset.ref);
  i.feito = !i.feito;
  salvar(); desenhar();
  if (i.feito) tocarSom(true);
};

ACOES['col-fav'] = (el) => { const i = acharRef(el.dataset.ref); i.favorito = !i.favorito; salvar(); desenhar(); };

ACOES['col-abrir'] = (el) => {
  const id = el.dataset.id;
  colecaoTela.abertos.has(id) ? colecaoTela.abertos.delete(id) : colecaoTela.abertos.add(id);
  desenhar();
};

ACOES['col-del'] = (el) => removerComDesfazer(acharRef(el.dataset.ref).itens, el.dataset.id, 'Item');

ACOES['col-fav-cat'] = (el) => { colecaoTela.favCat = el.dataset.c; desenhar(); };
