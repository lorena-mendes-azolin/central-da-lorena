const comprasTela = { mostrarComprados: false, abertos: new Set(), cat: 'todas', criandoCat: false };
const CATS_COMPRA = ['Mercado', 'Casa', 'Roupas', 'Eletrônicos', 'Beleza', 'Presentes', 'Outros'];
const catsCompra = (l) => (l.categoriasCompra = l.categoriasCompra || [...CATS_COMPRA]);
const GRUPOS_COMPRA = {
  agora: { nome: 'Para agora', desc: 'Mercado e coisas do dia a dia', icone: 'cart', cor: 'c-azul' },
  longo: { nome: 'A longo prazo', desc: 'Coisas maiores, para ir juntando', icone: 'wallet', cor: 'c-amarelo' },
};

const ORDENS_COMPRA = {
  manual: 'Minha ordem',
  recentes: 'Mais recentes',
  antigos: 'Mais antigos',
  maior: 'Maior valor',
  menor: 'Menor valor',
  az: 'A → Z',
  za: 'Z → A',
  mes: 'Mês de compra',
};
// Data de inclusão: usa "criado" (itens novos) ou tira do começo do id (feito com Date.now)
function criadoCompra(i) {
  if (i.criado) return i.criado;
  const t = parseInt(String(i.id || '').slice(0, 8), 36);
  return t > 1.4e12 && t < 4e12 ? t : 0;
}
function ordenarItensCompra(itens, modo) {
  const nome = (i) => String(i.titulo || '');
  const regras = {
    recentes: (a, b) => criadoCompra(b) - criadoCompra(a),
    antigos: (a, b) => criadoCompra(a) - criadoCompra(b),
    maior: (a, b) => valorNumero(b.valor) - valorNumero(a.valor),
    // sem valor vai para o fim
    menor: (a, b) => (valorNumero(a.valor) || Infinity) - (valorNumero(b.valor) || Infinity),
    az: (a, b) => nome(a).localeCompare(nome(b), 'pt-BR', { sensitivity: 'base' }),
    za: (a, b) => nome(b).localeCompare(nome(a), 'pt-BR', { sensitivity: 'base' }),
    mes: (a, b) => (a.mes || '9999').localeCompare(b.mes || '9999'),
  };
  const regra = regras[modo];
  // comprados sempre no fim; dentro de cada parte, a regra escolhida
  return [...itens].sort((a, b) => (Number(a.comprado) - Number(b.comprado)) || (regra ? regra(a, b) : 0));
}

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
  const modo = ORDENS_COMPRA[l.ordenarCompras] ? l.ordenarCompras : 'manual';
  const manual = modo === 'manual';
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
    <label class="ordenar-compras"><span>Ordenar</span>
      <select data-mudar="compras-ordenar" data-lista="${l.id}" aria-label="Ordenar itens">
        ${Object.entries(ORDENS_COMPRA).map(([v, t]) => `<option value="${v}" ${v === modo ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </label>
  </div>
  <div class="grade g2">
    ${Object.entries(GRUPOS_COMPRA).map(([id, g]) => {
      const todos = l.itens.filter((i) => i.prazo === id && (filtro === 'todas' || i.cat === filtro));
      const itens = ordenarItensCompra(todos.filter((i) => comprasTela.mostrarComprados || !i.comprado), modo);
      const total = todos.filter((i) => !i.comprado).reduce((s, i) => s + valorNumero(i.valor), 0);
      return `<section class="card">
        <h2 class="card-titulo"><span class="selo mini ${g.cor}">${ic(g.icone)}</span> ${g.nome} <small>${total ? 'total ' + dinheiro(total) : g.desc}</small></h2>
        <form class="form-linha" data-form="compra-nova" data-lista="${l.id}" data-prazo="${id}" style="margin-bottom:10px">
          <input type="text" name="titulo" id="compra-${id}" placeholder="${filtro === 'todas' ? 'Adicionar item ou colar link' : 'Adicionar em ' + esc(filtro)}" maxlength="100" data-precisa style="flex:3 1 160px">
          <input type="text" name="valor" placeholder="R$ (opcional)" inputmode="decimal" style="flex:1 1 90px" aria-label="Valor">
          <button class="btn" type="submit">${ic('plus', 'p')}</button>
        </form>
        <div class="lista-compras">
        ${itens.map((i) => {
          const ref = `${l.id}/${i.id}`;
          const foto = fotoCompra(i);
          const link = linkCompra(i);
          return `<div class="item-colecao item-compra ${i.comprado ? 'feito' : ''}" ${manual ? ordem(l.id + '|itens', i.id) : ''}>
            <div class="ic-linha">
              ${manual ? alca() : ''}
              <button class="check ${i.comprado ? 'on' : ''}" data-acao="compra-check" data-ref="${ref}" aria-label="Comprado">${i.comprado ? ic('check') : ''}</button>
              <button class="miniatura-compra ${foto ? '' : 'vazia'}" data-acao="compra-ver" data-lista="${l.id}" data-id="${i.id}" aria-label="Ver detalhes">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ic(link ? 'link' : 'cart', 'p')}</button>
              <input class="inline inline-t" value="${esc(i.titulo)}" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Item">
              ${i.cat && filtro === 'todas' ? `<span class="tag">${esc(i.cat)}</span>` : ''}
              ${i.mes ? `<span class="tag" title="Quando comprar">${ic('calendar', 'p')} ${mesCurto(i.mes)}</span>` : ''}
              ${link ? `<a class="acao-item" href="${esc(link)}" target="_blank" rel="noopener" title="Abrir na loja">${ic('link', 'p')}</a>` : ''}
              <input class="inline valor-edit" value="${esc(i.valor)}" placeholder="R$" data-mudar="campo" data-ref="${ref}" data-campo="valor" data-redesenhar="1" aria-label="Valor">
              <button class="btn-mini ${i.notas || link || foto || i.mes ? 'tem' : ''}" data-acao="compra-ver" data-lista="${l.id}" data-id="${i.id}">Ver detalhes</button>
              <button class="acao-item apagar" data-acao="compra-del" data-lista="${l.id}" data-id="${i.id}" title="Apagar">${ic('trash', 'p')}</button>
            </div>
          </div>`;
        }).join('') || '<p class="vazio">Nada por aqui.</p>'}
        </div>
      </section>`;
    }).join('')}
  </div>`;
}

const ehLink = (t) => /^(https?:\/\/|www\.)\S+$/i.test((t || '').trim()) || /^[\w-]+(\.[\w-]+)+\/\S*$/.test((t || '').trim());
const fotoCompra = (i) => i.foto || (i.anexos || []).find((a) => a.tipo === 'imagem')?.url || '';
const linkCompra = (i) => i.link || (i.anexos || []).find((a) => a.tipo === 'link')?.url || '';

FORMS['compra-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  const link = ehLink(d.titulo) ? corrigirLink(d.titulo) : '';
  const item = { id: novoId(), titulo: link ? BUSCANDO : d.titulo, prazo: form.dataset.prazo, valor: d.valor || '', comprado: false, criado: Date.now(), notas: '', anexos: [], cat: comprasTela.cat === 'todas' ? '' : comprasTela.cat, link, foto: '' };
  l.itens.unshift(item);
  salvar(); desenhar();
  $('#compra-' + form.dataset.prazo)?.focus();
  if (link) buscarPrevia(l.id, item.id, true);
};

const previaTela = { buscando: new Set() };
const BUSCANDO = 'Buscando…';
async function buscarPreviaRef(ref, novo, redesenhar, comPreco) {
  const i = acharRef(ref);
  const url = i && linkCompra(i);
  if (!url) return;
  const fim = () => { salvar(); desenhar(); redesenhar(); };
  if (!usuario) {
    if (i.titulo === BUSCANDO || i.titulo === 'Buscando produto…') i.titulo = dominio(url);
    fim();
    avisar('Para puxar a foto do link, entre com a sua conta (precisa da nuvem).');
    return;
  }
  previaTela.buscando.add(i.id);
  redesenhar();
  let r = null;
  try {
    const { data, error } = await sb.functions.invoke('previa-link', { body: { url } });
    if (error) throw error;
    r = data;
  } catch { r = { erro: 'sem conexão' }; }
  previaTela.buscando.delete(i.id);
  const atual = acharRef(ref);
  if (!atual) return;
  if (r?.erro || (!r?.foto && !r?.titulo)) {
    if (atual.titulo === BUSCANDO || atual.titulo === 'Buscando produto…') atual.titulo = dominio(url);
    fim();
    avisar('Esse site não deixou ler a página. Você pode colocar a foto à mão em "Ver detalhes".');
    return;
  }
  if (r.foto) atual.foto = r.foto;
  if (r.titulo && (novo || !atual.titulo || atual.titulo === BUSCANDO || atual.titulo === 'Buscando produto…' || ehLink(atual.titulo))) atual.titulo = r.titulo;
  if (comPreco && r.preco && (!atual.valor || novo)) atual.valor = Number(r.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (r.loja) atual.loja = r.loja;
  if (r.url) atual.link = r.url;
  fim();
  avisar(r.foto ? 'Foto e informações adicionadas. Dá para editar tudo em "Ver detalhes".' : 'Peguei o nome, mas o site não mostrou a foto.');
}
const buscarPrevia = (listaId, itemId, novo = false) => buscarPreviaRef(`${listaId}/${itemId}`, novo, redesenharCompra, true);

const compraAberta = { lista: '', id: '' };
function htmlDetalheCompra() {
  const l = acharLista(compraAberta.lista);
  const i = l?.itens.find((x) => x.id === compraAberta.id);
  if (!i) return '';
  const ref = `${l.id}/${i.id}`;
  const foto = fotoCompra(i);
  const link = linkCompra(i);
  const fotos = [i.foto, ...(i.anexos || []).filter((a) => a.tipo === 'imagem').map((a) => a.url)].filter(Boolean);
  const buscando = previaTela.buscando.has(i.id);
  const cats = catsCompra(l);
  return `<div class="detalhe-compra">
    <button type="button" class="btn-icone fechar-dc" data-acao="compra-fechar" aria-label="Fechar">${ic('x')}</button>
    <div class="dc-foto ${foto ? '' : 'vazia'}">
      ${buscando ? `<div class="dc-carregando"><span class="girando"></span>Buscando foto e preço…</div>` : foto ? `<img src="${esc(foto)}" alt="" data-acao="ver-imagem" data-src="${esc(foto)}">` : `<div class="dc-sem-foto">${ic('image')}<span>Sem foto ainda</span></div>`}
      <label class="btn-mini dc-trocar">${ic('image', 'p')} ${foto ? 'Trocar foto' : 'Colocar foto'}<input type="file" accept="image/*" data-mudar="compra-foto" data-ref="${ref}" hidden></label>
    </div>
    ${fotos.length > 1 ? `<div class="dc-galeria">${fotos.map((f) => `<button class="${f === foto ? 'on' : ''}" data-acao="compra-foto-principal" data-ref="${ref}" data-src="${esc(f)}"><img src="${esc(f)}" alt=""></button>`).join('')}</div>` : ''}
    <div class="dc-corpo">
      ${i.loja || link ? `<span class="dc-loja">${ic('cart', 'p')} ${esc(i.loja || dominio(link))}</span>` : ''}
      <textarea class="dc-titulo" rows="2" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Nome do produto">${esc(i.titulo)}</textarea>
      <div class="dc-preco"><span>R$</span><input type="text" inputmode="decimal" value="${esc(String(i.valor || '').replace(/^R\$\s*/, ''))}" placeholder="0,00" data-mudar="campo" data-ref="${ref}" data-campo="valor" data-redesenhar="1" aria-label="Valor"></div>
      <div class="dc-link">
        <input type="url" value="${esc(link)}" placeholder="Cole o link do produto" data-mudar="compra-link" data-ref="${ref}" aria-label="Link do produto">
        ${link ? `<button class="btn-mini" data-acao="compra-previa" data-lista="${l.id}" data-id="${i.id}" ${buscando ? 'disabled' : ''}>${ic('reset', 'p')} Atualizar foto e preço</button>` : ''}
      </div>
      ${link ? `<a class="btn dc-abrir" href="${esc(link)}" target="_blank" rel="noopener">${ic('right', 'p')} Abrir na loja</a>` : ''}
      <div class="dc-grade">
        <div class="campo"><span>Quando comprar</span>
          <div class="segmento">${Object.entries(GRUPOS_COMPRA).map(([id, g]) => `<button class="${i.prazo === id ? 'ativo' : ''}" data-acao="compra-prazo" data-ref="${ref}" data-v="${id}">${g.nome}</button>`).join('')}</div></div>
        <label class="campo">Mês (opcional)<input type="month" value="${i.mes || ''}" data-mudar="campo" data-ref="${ref}" data-campo="mes" data-redesenhar="1"></label>
      </div>
      <div class="campo"><span>Categoria</span>
        <div class="chips">${['', ...cats].map((c) => `<button class="chip ${(i.cat || '') === c ? 'ativo' : ''}" data-acao="compra-cat-item" data-ref="${ref}" data-v="${esc(c)}">${c ? esc(c) : 'Sem categoria'}</button>`).join('')}</div></div>
      <label class="campo">Notas<textarea rows="3" data-digitar="campo" data-ref="${ref}" data-campo="notas" placeholder="Tamanho, cor, onde está mais barato…">${esc(i.notas || '')}</textarea></label>
      <div class="dc-rodape">
        <button class="btn sec perigo-texto" data-acao="compra-del-dc" data-lista="${l.id}" data-id="${i.id}">${ic('trash', 'p')} Excluir</button>
        <span class="espaco"></span>
        <button class="btn ${i.comprado ? 'sec' : ''}" data-acao="compra-check" data-ref="${ref}">${ic('check', 'p')} ${i.comprado ? 'Desmarcar comprado' : 'Marcar como comprado'}</button>
      </div>
    </div>
  </div>`;
}

function janelaCompra() {
  let j = $('#janela-compra');
  if (!j) {
    j = document.createElement('dialog');
    j.id = 'janela-compra';
    j.className = 'janela janela-compra';
    j.addEventListener('close', () => { compraAberta.id = ''; });
    j.addEventListener('click', (e) => { if (e.target === j) j.close(); });
    document.body.appendChild(j);
  }
  return j;
}
function redesenharCompra() {
  const j = $('#janela-compra');
  if (!j?.open || !compraAberta.id) return;
  const foco = document.activeElement && j.contains(document.activeElement) ? document.activeElement : null;
  if (foco && (foco.tagName === 'TEXTAREA' || (foco.tagName === 'INPUT' && foco.type !== 'file'))) return;
  const rolagem = j.scrollTop;
  j.innerHTML = htmlDetalheCompra();
  melhorarSelects(j); melhorarDatas(j);
  j.scrollTop = rolagem;
}
ACOES['compra-ver'] = (el) => {
  compraAberta.lista = el.dataset.lista; compraAberta.id = el.dataset.id;
  const j = janelaCompra();
  j.innerHTML = htmlDetalheCompra();
  if (!j.open) j.showModal();
  melhorarSelects(j); melhorarDatas(j);
  j.scrollTop = 0;
};
ACOES['compra-fechar'] = () => $('#janela-compra')?.close();
ACOES['compra-previa'] = (el) => buscarPrevia(el.dataset.lista, el.dataset.id);
MUDAR['compra-link'] = (el) => {
  const i = acharRef(el.dataset.ref);
  const url = el.value.trim() ? corrigirLink(el.value) : '';
  const mudou = url !== (i.link || '');
  i.link = url;
  salvar(); desenhar();
  const [lid, iid] = el.dataset.ref.split('/');
  if (url && mudou) buscarPrevia(lid, iid); else redesenharCompra();
};
MUDAR['compra-foto'] = async (el) => {
  const i = acharRef(el.dataset.ref);
  const arq = el.files[0];
  if (!arq) return;
  try { i.foto = await lerImagem(arq); salvar(); desenhar(); redesenharCompra(); }
  catch { avisar('Não consegui abrir essa imagem.'); }
};
ACOES['compra-foto-principal'] = (el) => { const i = acharRef(el.dataset.ref); i.foto = el.dataset.src; salvar(); desenhar(); redesenharCompra(); };
ACOES['compra-prazo'] = (el) => { const i = acharRef(el.dataset.ref); i.prazo = el.dataset.v; salvar(); desenhar(); redesenharCompra(); };
ACOES['compra-cat-item'] = (el) => { const i = acharRef(el.dataset.ref); i.cat = el.dataset.v; salvar(); desenhar(); redesenharCompra(); };
ACOES['compra-del-dc'] = (el) => { $('#janela-compra')?.close(); removerComDesfazer(acharLista(el.dataset.lista).itens, el.dataset.id, 'Item'); };

ACOES['compra-check'] = (el) => {
  const i = acharRef(el.dataset.ref);
  i.comprado = !i.comprado;
  salvar(); desenhar(); redesenharCompra();
  if (i.comprado) { tocarSom(true); marcarVinculo(listaDoRef(el.dataset.ref)?.habito); }
};

MUDAR['compras-ordenar'] = (el) => {
  const l = acharLista(el.dataset.lista);
  if (!l) return;
  l.ordenarCompras = el.value;
  salvar(); desenhar();
};

ACOES['compras-mostrar'] =() => { comprasTela.mostrarComprados = !comprasTela.mostrarComprados; desenhar(); };


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
