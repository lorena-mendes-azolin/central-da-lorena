const colecaoTela = { cat: {}, filtro: 'todos', abertos: new Set(), criandoCat: false };

function htmlItemColecao(l, cat, i, mostrarCategoria = false) {
  const ref = `${l.id}/${cat.id}/${i.id}`;
  const foto = fotoCompra(i);
  const link = linkCompra(i);
  return `<div class="item-colecao ${i.feito ? 'feito' : ''}" ${mostrarCategoria ? '' : ordem(`${l.id}/${cat.id}|itens`, i.id)}>
    <div class="ic-linha">
      ${mostrarCategoria ? '' : alca()}
      <button class="check ${i.feito ? 'on' : ''}" data-acao="col-check" data-ref="${ref}" title="${i.feito ? cat.falta : cat.feito}">${i.feito ? ic('check') : ''}</button>
      <button class="miniatura-compra ${foto ? '' : 'vazia'}" data-acao="col-ver" data-ref="${ref}" aria-label="Ver detalhes">${previaTela.buscando.has(i.id) ? '<span class="girando mini"></span>' : foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ic(link ? 'link' : cat.icone, 'p')}</button>
      <input class="inline inline-t" value="${esc(i.titulo)}" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Item">
      ${mostrarCategoria ? `<span class="tag">${ic(cat.icone, 'p')} ${esc(cat.nome)}</span>` : ''}
      <span class="tag">${esc(i.feito ? cat.feito : cat.falta)}</span>
      ${link ? `<a class="acao-item" href="${esc(link)}" target="_blank" rel="noopener" title="Abrir link">${ic('link', 'p')}</a>` : ''}
      <button class="acao-item fav ${i.favorito ? 'on' : ''}" data-acao="col-fav" data-ref="${ref}" title="${i.favorito ? 'Tirar dos favoritos' : 'Favoritar'}">${ic('star', 'p')}</button>
      <button class="btn-mini ${i.notas || i.anexos?.length || foto || link ? 'tem' : ''}" data-acao="col-ver" data-ref="${ref}">Ver detalhes</button>
      <button class="acao-item apagar" data-acao="col-del" data-ref="${l.id}/${cat.id}" data-id="${i.id}" title="Apagar">${ic('trash', 'p')}</button>
    </div>
  </div>`;
}

const colAberto = { ref: '' };
function htmlDetalheColecao() {
  const [lid, cid] = colAberto.ref.split('/');
  const l = acharLista(lid);
  const cat = l?.categorias.find((c) => c.id === cid);
  const i = acharRef(colAberto.ref);
  if (!i || !cat) return '';
  const ref = colAberto.ref;
  const foto = fotoCompra(i);
  const link = linkCompra(i);
  const fotos = [i.foto, ...(i.anexos || []).filter((a) => a.tipo === 'imagem').map((a) => a.url)].filter(Boolean);
  const buscando = previaTela.buscando.has(i.id);
  return `<div class="detalhe-compra">
    <button type="button" class="btn-icone fechar-dc" data-acao="col-fechar" aria-label="Fechar">${ic('x')}</button>
    <div class="dc-foto ${foto ? '' : 'vazia'}">
      ${buscando ? `<div class="dc-carregando"><span class="girando"></span>Buscando a capa…</div>` : foto ? `<img src="${esc(foto)}" alt="" data-acao="ver-imagem" data-src="${esc(foto)}">` : `<div class="dc-sem-foto">${ic(cat.icone)}<span>Sem capa ainda</span></div>`}
      <label class="btn-mini dc-trocar">${ic('image', 'p')} ${foto ? 'Trocar capa' : 'Colocar capa'}<input type="file" accept="image/*" data-mudar="col-foto" data-ref="${ref}" hidden></label>
    </div>
    ${fotos.length > 1 ? `<div class="dc-galeria">${fotos.map((f) => `<button class="${f === foto ? 'on' : ''}" data-acao="col-foto-principal" data-ref="${ref}" data-src="${esc(f)}"><img src="${esc(f)}" alt=""></button>`).join('')}</div>` : ''}
    <div class="dc-corpo">
      <span class="dc-loja">${ic(cat.icone, 'p')} ${esc(cat.nome)}${i.loja ? ` · ${esc(i.loja)}` : ''}</span>
      <textarea class="dc-titulo" rows="2" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Nome">${esc(i.titulo)}</textarea>
      <div class="form-linha">
        <div class="segmento">
          <button class="${!i.feito ? 'ativo' : ''}" data-acao="col-status" data-ref="${ref}" data-v="0">${esc(cat.falta)}</button>
          <button class="${i.feito ? 'ativo' : ''}" data-acao="col-status" data-ref="${ref}" data-v="1">${esc(cat.feito)}</button>
        </div>
        <button class="btn-mini ${i.favorito ? 'ativo' : ''}" data-acao="col-fav" data-ref="${ref}">${ic('star', 'p')} ${i.favorito ? 'Favorito' : 'Favoritar'}</button>
      </div>
      <div class="dc-link">
        <input type="url" value="${esc(link)}" placeholder="Cole o link (Instagram, YouTube, site, receita…)" data-mudar="col-link" data-ref="${ref}" aria-label="Link">
        ${link ? `<button class="btn-mini" data-acao="col-previa" data-ref="${ref}" ${buscando ? 'disabled' : ''}>${ic('reset', 'p')} Atualizar capa</button>` : ''}
      </div>
      ${link ? `<a class="btn dc-abrir" href="${esc(link)}" target="_blank" rel="noopener">${ic('right', 'p')} Abrir link</a>` : ''}
      <label class="campo">Notas<textarea rows="4" data-digitar="campo" data-ref="${ref}" data-campo="notas" placeholder="Ingredientes, endereço, por que quer ver…">${esc(i.notas || '')}</textarea></label>
      <div class="campo"><span>Mais imagens e links</span>${htmlAnexos(i, ref)}</div>
      <div class="dc-rodape">
        <button class="btn sec perigo-texto" data-acao="col-del-dc" data-ref="${l.id}/${cat.id}" data-id="${i.id}">${ic('trash', 'p')} Excluir</button>
      </div>
    </div>
  </div>`;
}
function janelaColecao() {
  let j = $('#janela-colecao');
  if (!j) {
    j = document.createElement('dialog');
    j.id = 'janela-colecao';
    j.className = 'janela janela-compra';
    j.addEventListener('close', () => { colAberto.ref = ''; });
    j.addEventListener('click', (e) => { if (e.target === j) j.close(); });
    document.body.appendChild(j);
  }
  return j;
}
function redesenharColecao() {
  const j = $('#janela-colecao');
  if (!j?.open || !colAberto.ref) return;
  const foco = document.activeElement && j.contains(document.activeElement) ? document.activeElement : null;
  if (foco && (foco.tagName === 'TEXTAREA' || (foco.tagName === 'INPUT' && foco.type !== 'file'))) return;
  const rolagem = j.scrollTop;
  j.innerHTML = htmlDetalheColecao();
  j.scrollTop = rolagem;
}
ACOES['col-ver'] = (el) => {
  colAberto.ref = el.dataset.ref;
  const j = janelaColecao();
  j.innerHTML = htmlDetalheColecao();
  if (!j.open) j.showModal();
  j.scrollTop = 0;
};
ACOES['col-fechar'] = () => $('#janela-colecao')?.close();
ACOES['col-previa'] = (el) => buscarPreviaRef(el.dataset.ref, false, redesenharColecao, false);
ACOES['col-status'] = (el) => { const i = acharRef(el.dataset.ref); const antes = i.feito; i.feito = el.dataset.v === '1'; i.feitoEm = i.feito ? hojeISO() : ''; salvar(); desenhar(); redesenharColecao(); if (i.feito && !antes) marcarVinculo(listaDoRef(el.dataset.ref)?.habito); };
MUDAR['col-link'] = (el) => {
  const i = acharRef(el.dataset.ref);
  const url = el.value.trim() ? corrigirLink(el.value) : '';
  const mudou = url !== (i.link || '');
  i.link = url;
  salvar(); desenhar();
  if (url && mudou) buscarPreviaRef(el.dataset.ref, false, redesenharColecao, false); else redesenharColecao();
};
MUDAR['col-foto'] = async (el) => {
  const i = acharRef(el.dataset.ref);
  const arq = el.files[0];
  if (!arq) return;
  try { i.foto = await lerImagem(arq); salvar(); desenhar(); redesenharColecao(); }
  catch { avisar('Não consegui abrir essa imagem.'); }
};
ACOES['col-foto-principal'] = (el) => { const i = acharRef(el.dataset.ref); i.foto = el.dataset.src; salvar(); desenhar(); redesenharColecao(); };
ACOES['col-del-dc'] = (el) => { $('#janela-colecao')?.close(); removerComDesfazer(acharRef(el.dataset.ref).itens, el.dataset.id, 'Item'); };

function htmlColecoes(l) {
  const verFav = colecaoTela.cat[l.id] === '__fav';
  const cat = verFav ? null : l.categorias.find((c) => c.id === colecaoTela.cat[l.id]) || l.categorias[0];
  const f = colecaoTela.filtro;
  const itens = cat ? cat.itens.filter((i) => f === 'todos' || (f === 'falta' && !i.feito) || (f === 'feito' && i.feito) || (f === 'fav' && i.favorito))
    .sort((a, b) => Number(a.feito) - Number(b.feito)) : [];
  const favoritos = l.categorias.flatMap((c) => c.itens.filter((i) => i.favorito).map((i) => ({ c, i })));

  return `
  ${htmlCabLista(l)}
  <div class="carrossel">
    <button class="seta esq" data-acao="carrossel" data-d="-1" aria-label="Voltar">${ic('left', 'p')}</button>
    <div class="faixa">
      <button class="chip chip-fav ${verFav ? 'ativo' : ''}" data-acao="col-cat" data-lista="${l.id}" data-id="__fav">${ic('star', 'p')} Favoritos <b>${favoritos.length}</b></button>
      ${l.categorias.map((c) => `<button class="chip ${cat && c.id === cat.id ? 'ativo' : ''}" data-acao="col-cat" data-lista="${l.id}" data-id="${c.id}" ${ordem(l.id + '|categorias', c.id, true)} data-pegar>
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
      <input type="text" name="titulo" id="col-novo" placeholder="Adicionar em ${esc(cat.nome)} ou colar um link (Enter)" maxlength="500" data-precisa>
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
  const link = ehLink(d.titulo) ? corrigirLink(d.titulo) : '';
  const item = { id: novoId(), titulo: link ? BUSCANDO : d.titulo, feito: false, favorito: false, notas: '', anexos: [], link, foto: '' };
  acharRef(form.dataset.ref).itens.unshift(item);
  salvar(); desenhar();
  $('#col-novo')?.focus();
  if (link) buscarPreviaRef(`${form.dataset.ref}/${item.id}`, true, redesenharColecao, false);
};

ACOES['col-check'] = (el) => {
  const i = acharRef(el.dataset.ref);
  i.feito = !i.feito;
  i.feitoEm = i.feito ? hojeISO() : '';
  salvar(); desenhar(); redesenharColecao();
  if (i.feito) { tocarSom(true); marcarVinculo(listaDoRef(el.dataset.ref)?.habito); }
};

ACOES['col-fav'] = (el) => { const i = acharRef(el.dataset.ref); i.favorito = !i.favorito; salvar(); desenhar(); redesenharColecao(); };


ACOES['col-del'] = (el) => removerComDesfazer(acharRef(el.dataset.ref).itens, el.dataset.id, 'Item');

ACOES['col-fav-cat'] = (el) => { colecaoTela.favCat = el.dataset.c; desenhar(); };
