const comprasTela = { mostrarComprados: false, abertos: new Set(), cat: 'todas', criandoCat: false };
const CATS_COMPRA = ['Mercado', 'Casa', 'Roupas', 'Eletrônicos', 'Beleza', 'Presentes', 'Outros'];
const catsCompra = (l) => (l.categoriasCompra = l.categoriasCompra || [...CATS_COMPRA]);
const GRUPOS_COMPRA = {
  agora: { nome: 'Para agora', desc: 'Mercado e coisas do dia a dia', icone: 'cart', cor: 'c-azul' },
  longo: { nome: 'A longo prazo', desc: 'Coisas maiores, para ir juntando', icone: 'wallet', cor: 'c-amarelo' },
};

function valorNumero(v) {
  const n = parseFloat(String(v || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function mesCurto(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').replace(' de ', '/');
}

function dinheiro(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function htmlCompras(l) {
  const comprados = l.itens.filter((i) => i.comprado).length;
  const cats = catsCompra(l);
  if (comprasTela.cat !== 'todas' && !cats.includes(comprasTela.cat)) comprasTela.cat = 'todas';
  const filtro = comprasTela.cat;
  return `
  ${htmlCabLista(l)}
  <div class="carrossel">
    <button class="seta esq" data-acao="carrossel" data-d="-1" aria-label="Voltar">${ic('left', 'p')}</button>
    <div class="faixa">
      <button class="chip ${filtro === 'todas' ? 'ativo' : ''}" data-acao="compra-cat" data-c="todas">Todas <b>${l.itens.filter((i) => !i.comprado).length}</b></button>
      ${cats.map((c) => `<button class="chip ${filtro === c ? 'ativo' : ''}" data-acao="compra-cat" data-c="${esc(c)}" ${ordem(l.id + '|categoriasCompra', c, true)} data-pegar>${esc(c)} <b>${l.itens.filter((i) => !i.comprado && i.cat === c).length}</b></button>`).join('')}
    </div>
    <button class="seta dir" data-acao="carrossel" data-d="1" aria-label="Avançar">${ic('right', 'p')}</button>
    ${filtro !== 'todas' ? `<button class="chip" data-acao="compra-cat-del" data-c="${esc(filtro)}" title="Excluir categoria">${ic('trash', 'p')}</button>` : ''}
    ${comprasTela.criandoCat
      ? `<form class="form-chip" data-form="compra-cat-nova" data-lista="${l.id}"><input type="text" name="nome" id="compra-cat-nome" placeholder="Nome da categoria" maxlength="24"><button class="btn-mini" type="submit">Criar</button></form>`
      : `<button class="chip" data-acao="compra-cat-criar">${ic('plus', 'p')} Categoria</button>`}
  </div>
  <div class="barra-lista">
    <span class="dica" style="margin:0">${l.itens.length - comprados} para comprar · ${comprados} já ${comprados === 1 ? 'comprado' : 'comprados'}</span>
    <span class="espaco"></span>
    ${comprados ? `<button class="btn-mini" data-acao="compras-mostrar">${comprasTela.mostrarComprados ? 'Esconder' : 'Mostrar'} comprados</button>` : ''}
  </div>
  <div class="grade g2">
    ${Object.entries(GRUPOS_COMPRA).map(([id, g]) => {
      const todos = l.itens.filter((i) => i.prazo === id && (filtro === 'todas' || i.cat === filtro));
      const itens = todos.filter((i) => comprasTela.mostrarComprados || !i.comprado)
        .sort((a, b) => Number(a.comprado) - Number(b.comprado));
      const total = todos.filter((i) => !i.comprado).reduce((s, i) => s + valorNumero(i.valor), 0);
      return `<section class="card">
        <h2 class="card-titulo"><span class="selo mini ${g.cor}">${ic(g.icone)}</span> ${g.nome} <small>${total ? 'total ' + dinheiro(total) : g.desc}</small></h2>
        <form class="form-linha" data-form="compra-nova" data-lista="${l.id}" data-prazo="${id}" style="margin-bottom:10px">
          <input type="text" name="titulo" id="compra-${id}" placeholder="${filtro === 'todas' ? 'Adicionar item' : 'Adicionar em ' + esc(filtro)}" maxlength="100" data-precisa style="flex:3 1 160px">
          <input type="text" name="valor" placeholder="R$ (opcional)" inputmode="decimal" style="flex:1 1 90px" aria-label="Valor">
          <button class="btn" type="submit">${ic('plus', 'p')}</button>
        </form>
        <div class="lista-compras">
        ${itens.map((i) => {
          const ref = `${l.id}/${i.id}`;
          const aberto = comprasTela.abertos.has(i.id);
          const img = (i.anexos || []).find((a) => a.tipo === 'imagem');
          const link = (i.anexos || []).find((a) => a.tipo === 'link');
          const temDetalhe = i.notas || i.anexos?.length || i.mes;
          return `<div class="item-colecao ${i.comprado ? 'feito' : ''}" ${ordem(l.id + '|itens', i.id)}>
            <div class="ic-linha">
              ${alca()}
              <button class="check ${i.comprado ? 'on' : ''}" data-acao="compra-check" data-ref="${ref}" aria-label="Comprado">${i.comprado ? ic('check') : ''}</button>
              ${img ? `<img class="miniatura" src="${img.url}" alt="" data-acao="ver-imagem" data-src="${img.url}">` : ''}
              <input class="inline inline-t" value="${esc(i.titulo)}" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Item">
              ${i.cat && filtro === 'todas' ? `<span class="tag">${esc(i.cat)}</span>` : ''}
              ${i.mes ? `<span class="tag" title="Quando comprar">${ic('calendar', 'p')} ${mesCurto(i.mes)}</span>` : ''}
              ${link ? `<a class="acao-item" href="${esc(link.url)}" target="_blank" rel="noopener" title="Abrir link">${ic('link', 'p')}</a>` : ''}
              <input class="inline valor-edit" value="${esc(i.valor)}" placeholder="R$" data-mudar="campo" data-ref="${ref}" data-campo="valor" data-redesenhar="1" aria-label="Valor">
              <button class="btn-mini ${aberto ? 'ativo' : ''} ${temDetalhe ? 'tem' : ''}" data-acao="compra-abrir" data-id="${i.id}">${aberto ? 'Fechar' : 'Detalhes'}</button>
              <button class="acao-item apagar" data-acao="compra-del" data-lista="${l.id}" data-id="${i.id}" title="Apagar">${ic('trash', 'p')}</button>
            </div>
            ${aberto ? `<div class="ic-extra detalhes-compra">
              <div class="dc-linha">
                <label class="campo">Quando comprar (mês)
                  <input type="month" value="${i.mes || ''}" data-mudar="campo" data-ref="${ref}" data-campo="mes" data-redesenhar="1"></label>
                <label class="campo">Categoria
                  <select data-mudar="campo" data-ref="${ref}" data-campo="cat" data-redesenhar="1">
                    <option value="" ${!i.cat ? 'selected' : ''}>Sem categoria</option>
                    ${cats.map((c) => `<option ${i.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                  </select></label>
                <label class="campo">Valor
                  <input type="text" value="${esc(i.valor)}" inputmode="decimal" placeholder="R$" data-mudar="campo" data-ref="${ref}" data-campo="valor" data-redesenhar="1"></label>
              </div>
              <label class="campo">Notas
                <textarea data-digitar="campo" data-ref="${ref}" data-campo="notas">${esc(i.notas || '')}</textarea></label>
              <span class="rotulo-mini">Link da loja e fotos</span>
              ${htmlAnexos(i, ref)}
            </div>` : ''}
          </div>`;
        }).join('') || '<p class="vazio">Nada por aqui.</p>'}
        </div>
      </section>`;
    }).join('')}
  </div>`;
}

FORMS['compra-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  l.itens.unshift({ id: novoId(), titulo: d.titulo, prazo: form.dataset.prazo, valor: d.valor || '', comprado: false, notas: '', anexos: [], cat: comprasTela.cat === 'todas' ? '' : comprasTela.cat });
  salvar(); desenhar();
  $('#compra-' + form.dataset.prazo)?.focus();
};

ACOES['compra-check'] = (el) => {
  const i = acharRef(el.dataset.ref);
  i.comprado = !i.comprado;
  salvar(); desenhar();
  if (i.comprado) tocarSom(true);
};

ACOES['compras-mostrar'] = () => { comprasTela.mostrarComprados = !comprasTela.mostrarComprados; desenhar(); };

ACOES['compra-abrir'] = (el) => {
  const id = el.dataset.id;
  comprasTela.abertos.has(id) ? comprasTela.abertos.delete(id) : comprasTela.abertos.add(id);
  desenhar();
};

ACOES['compra-del'] = (el) => removerComDesfazer(acharLista(el.dataset.lista).itens, el.dataset.id, 'Item');

ACOES['compra-cat'] = (el) => { comprasTela.cat = el.dataset.c; desenhar(); };
ACOES['compra-cat-criar'] = () => { comprasTela.criandoCat = true; desenhar(); $('#compra-cat-nome')?.focus(); };
FORMS['compra-cat-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  const nome = d.nome || 'Nova categoria';
  if (!catsCompra(l).includes(nome)) catsCompra(l).push(nome);
  comprasTela.criandoCat = false;
  comprasTela.cat = nome;
  salvar(); desenhar();
};
ACOES['compra-cat-del'] = (el) => {
  const l = estado.listas.find((x) => x.tipo === 'compras' && catsCompra(x).includes(el.dataset.c));
  if (!l) return;
  l.categoriasCompra = catsCompra(l).filter((c) => c !== el.dataset.c);
  l.itens.forEach((i) => { if (i.cat === el.dataset.c) i.cat = ''; });
  comprasTela.cat = 'todas';
  salvar(); desenhar();
  avisar(`Categoria ${el.dataset.c} excluída.`);
};
