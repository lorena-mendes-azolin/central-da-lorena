const comprasTela = { mostrarComprados: false, abertos: new Set(), cat: 'todas', criandoCat: false, selecionando: '', selecionados: new Set() };
const CATS_COMPRA = ['Mercado', 'Casa', 'Roupas', 'Eletrônicos', 'Beleza', 'Presentes', 'Outros'];
const catsCompra = (l) => (l.categoriasCompra = l.categoriasCompra || [...CATS_COMPRA]);
const GRUPOS_COMPRA = {
  agora: { nome: 'Para agora', desc: 'O que quero comprar logo', icone: 'cart', cor: 'c-azul' },
  longo: { nome: 'A longo prazo', desc: 'Coisas maiores, para planejar e juntar dinheiro', icone: 'wallet', cor: 'c-amarelo' },
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
    maior: (a, b) => valorCompra(b) - valorCompra(a),
    // sem valor vai para o fim
    menor: (a, b) => (valorCompra(a) || Infinity) - (valorCompra(b) || Infinity),
    az: (a, b) => nome(a).localeCompare(nome(b), 'pt-BR', { sensitivity: 'base' }),
    za: (a, b) => nome(b).localeCompare(nome(a), 'pt-BR', { sensitivity: 'base' }),
    mes: (a, b) => (a.mes || '9999').localeCompare(b.mes || '9999'),
  };
  const regra = regras[modo];
  // comprados sempre no fim; dentro de cada parte, a regra escolhida
  return [...itens].sort((a, b) => (Number(a.comprado) - Number(b.comprado)) || (Number(!!b.prioridade) - Number(!!a.prioridade)) || (regra ? regra(a, b) : 0));
}

// ---------- Robô de preços (função "precos" no Supabase + tabela compras_precos) ----------
const precosTela = { lidoEm: 0, conferindo: false };
const precoBR = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataHoraCurta = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Lê o que o robô encontrou e aplica nos itens (só resultados mais novos que o último aplicado)
async function lerPrecosCompras() {
  if (!usuario || typeof sb === 'undefined') return;
  precosTela.lidoEm = Date.now();
  const { data, error } = await sb.from('compras_precos').select('lista_id, item_id, link, preco, situacao, verificado_em').eq('user_id', usuario.id);
  if (error || !data) return;
  let mudou = false;
  for (const r of data) {
    const i = acharLista(r.lista_id)?.itens?.find((x) => x.id === r.item_id);
    if (!i || i.comprado || linkCompra(i) !== r.link) continue;
    if (i.precoConferido && new Date(i.precoConferido) >= new Date(r.verificado_em)) continue;
    i.precoConferido = r.verificado_em;
    i.precoSituacao = r.situacao;
    i.esgotado = r.situacao === 'esgotado';
    if (r.preco !== null && r.situacao !== 'falhou') {
      const novo = Number(r.preco);
      const atual = valorNumero(i.valor);
      if (Math.abs(novo - atual) >= 0.01) {
        if (atual) { i.valorAntes = i.valor; i.precoMudouEm = r.verificado_em; }
        i.valor = precoBR(novo);
        i.valorRobo = i.valor;
      }
    }
    mudou = true;
  }
  if (mudou) { salvar(); desenhar(); redesenharCompra(); }
}

ACOES['compras-conferir'] = async () => {
  if (!usuario) { avisar('Para conferir os preços, entre com a sua conta (precisa da nuvem).'); return; }
  if (precosTela.conferindo) return;
  precosTela.conferindo = true; desenhar();
  avisar('Conferindo os preços nas lojas… pode levar até 1 minuto.');
  let r = null;
  try {
    const { data, error } = await sb.functions.invoke('precos', { body: {} });
    if (error) throw error;
    r = data;
  } catch { r = { erro: 'sem conexão' }; }
  precosTela.conferindo = false;
  await lerPrecosCompras();
  desenhar();
  if (r?.erro) { avisar('Não consegui conferir agora. Tente de novo daqui a pouco.'); return; }
  if (!r.conferidos) { avisar('Os preços já foram conferidos há poucos minutos.'); return; }
  const partes = [`${r.ok} atualizado${r.ok === 1 ? '' : 's'}`];
  if (r.esgotados) partes.push(`${r.esgotados} esgotado${r.esgotados === 1 ? '' : 's'}`);
  if (r.falharam) partes.push(`${r.falharam} sem resposta da loja`);
  avisar('Preços conferidos: ' + partes.join(' · ') + '.');
};

// Aviso da bolinha: vermelha = esgotado, verde = preço baixou, amarela = preço subiu. Sem aviso, sem bolinha.
function avisoCompra(i) {
  if (i.comprado) return null;
  if (i.esgotado) return { tipo: 'esgotado', texto: 'Produto esgotado' };
  if (i.valorAntes && i.valor === i.valorRobo) {
    const antes = valorNumero(i.valorAntes), agora = valorNumero(i.valor);
    if (antes && agora && Math.abs(antes - agora) >= 0.01) {
      return agora < antes
        ? { tipo: 'baixou', texto: `Preço baixou: era ${dinheiro(antes)}` }
        : { tipo: 'subiu', texto: `Preço subiu: era ${dinheiro(antes)}` };
    }
  }
  return null;
}

// Pedacinho "era R$ X" com setinha
function htmlPrecoAntes(i) {
  if (!i.valorAntes || i.valor !== i.valorRobo) return ''; // se você editou o valor à mão, some
  const antes = valorNumero(i.valorAntes);
  const agora = valorNumero(i.valor);
  if (!antes || !agora || Math.abs(antes - agora) < 0.01) return '';
  const baixou = agora < antes;
  return `<span class="preco-antes ${baixou ? 'baixou' : 'subiu'}" title="${baixou ? 'Baixou' : 'Subiu'} ${dinheiro(Math.abs(antes - agora))}${i.precoMudouEm ? ' em ' + dataHoraCurta(i.precoMudouEm) : ''}">${baixou ? '↓' : '↑'} <s>${dinheiro(antes)}</s></span>`;
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
  if (usuario && Date.now() - precosTela.lidoEm > 5 * 60_000) { precosTela.lidoEm = Date.now(); setTimeout(lerPrecosCompras, 800); }
  const temLink = l.itens.some((i) => !i.comprado && linkCompra(i));
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
  <div class="barra-lista barra-compras">
    <label class="ordenar-compras"><span>Ordenar</span>
      <select data-mudar="compras-ordenar" data-lista="${l.id}" aria-label="Ordenar itens">
        ${Object.entries(ORDENS_COMPRA).map(([v, t]) => `<option value="${v}" ${v === modo ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </label>
    ${temLink ? `<button class="btn-mini" data-acao="compras-conferir" ${precosTela.conferindo ? 'disabled' : ''} title="O site confere sozinho uma vez por dia">${precosTela.conferindo ? '<span class="girando mini"></span> Conferindo…' : ic('reset', 'p') + ' Conferir preços agora'}</button>` : ''}
    <span class="espaco"></span>
    <span class="dica" style="margin:0">${l.itens.length - comprados} para comprar · ${comprados} já ${comprados === 1 ? 'comprado' : 'comprados'}</span>
    ${comprados ? `<button class="btn-mini" data-acao="compras-mostrar">${comprasTela.mostrarComprados ? 'Esconder' : 'Mostrar'} comprados</button>` : ''}
  </div>
  <div class="grade g2">
    ${Object.entries(GRUPOS_COMPRA).map(([id, g]) => {
      const todos = l.itens.filter((i) => i.prazo === id && (filtro === 'todas' || i.cat === filtro));
      const itens = ordenarItensCompra(todos.filter((i) => comprasTela.mostrarComprados || !i.comprado), modo);
      const total = todos.filter((i) => !i.comprado).reduce((s, i) => s + valorCompra(i), 0);
      const sel = comprasTela.selecionando === id;
      const qtdSel = itens.filter((i) => comprasTela.selecionados.has(i.id)).length;
      return `<section class="card ${sel ? 'selecionando' : ''}">
        <h2 class="card-titulo"><span class="selo mini ${g.cor}">${ic(g.icone)}</span> ${g.nome} <small>${total ? 'total ' + dinheiro(total) : g.desc}</small>
          ${itens.length ? `<button class="acao-item apagar lixeira-card ${sel ? 'on' : ''}" data-acao="compras-selecionar" data-g="${id}" title="Apagar itens" aria-label="Escolher itens para apagar">${ic('trash', 'p')}</button>` : ''}</h2>
        ${sel ? `<div class="barra-selecao">
          <span>${qtdSel ? `<b>${qtdSel}</b> ${qtdSel === 1 ? 'selecionado' : 'selecionados'}` : 'Toque nos itens que quer apagar'}</span>
          <button class="btn-mini" data-acao="compras-sel-todos">${qtdSel === itens.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
          <span class="espaco"></span>
          <button class="btn-mini" data-acao="compras-sel-cancelar">Cancelar</button>
          <button class="btn-mini perigo-btn" data-acao="compras-sel-apagar" data-lista="${l.id}" ${qtdSel ? '' : 'disabled'}>${ic('trash', 'p')} Apagar${qtdSel ? ` (${qtdSel})` : ''}</button>
        </div>` : ''}
        <form class="form-linha" data-form="compra-nova" data-lista="${l.id}" data-prazo="${id}" style="margin-bottom:10px">
          <input type="text" name="titulo" id="compra-${id}" placeholder="${filtro === 'todas' ? 'Adicionar item ou colar link' : 'Adicionar em ' + esc(filtro)}" maxlength="100" data-precisa style="flex:3 1 160px">
          <input type="text" name="valor" placeholder="R$ (opcional)" inputmode="decimal" style="flex:1 1 90px" aria-label="Valor">
          <button class="btn" type="submit">${ic('plus', 'p')}</button>
        </form>
        <div class="lista-compras" data-ids="${sel ? itens.map((i) => i.id).join(',') : ''}">
        ${itens.map((i) => {
          const ref = `${l.id}/${i.id}`;
          const foto = fotoCompra(i);
          const link = linkCompra(i);
          const aviso = avisoCompra(i);
          const faixa = faixaCompra(i);
          const tags = [
            i.cat && filtro === 'todas' ? `<span class="tag">${esc(i.cat)}</span>` : '',
            i.mes ? `<span class="tag" title="Quando comprar">${ic('calendar', 'p')} ${mesCurto(i.mes)}</span>` : '',
            htmlTagJuntar(i),
          ].join('');
          const marcado = sel && comprasTela.selecionados.has(i.id);
          return `<div class="item-colecao item-compra ${i.comprado ? 'feito' : ''} ${marcado ? 'marcado' : ''}" ${manual && !sel ? ordem(l.id + '|itens', i.id) : ''} ${sel ? `data-acao="compra-sel" data-id="${i.id}"` : ''}>
            <div class="ic-linha">
              ${manual && !sel ? alca() : ''}
              ${sel
                ? `<span class="check sel ${marcado ? 'on' : ''}" aria-hidden="true">${marcado ? ic('check') : ''}</span>`
                : `<button class="check ${i.comprado ? 'on' : ''}" data-acao="compra-check" data-ref="${ref}" aria-label="Comprado">${i.comprado ? ic('check') : ''}</button>`}
              <button class="estrela-compra ${i.prioridade ? 'on' : ''}" data-acao="compra-prioridade" data-ref="${ref}" title="${i.prioridade ? 'Tirar da prioridade' : 'Marcar como prioridade'}" aria-pressed="${!!i.prioridade}" aria-label="Prioridade">${ic('star', 'p')}</button>
              <button class="miniatura-compra ${foto ? '' : 'vazia'} ${i.esgotado && !i.comprado ? 'esgotado' : ''} ${aviso ? 'aviso aviso-' + aviso.tipo : ''}" data-acao="compra-ver" data-lista="${l.id}" data-id="${i.id}" aria-label="Ver detalhes${aviso ? ' (' + aviso.texto + ')' : ''}" ${aviso ? `title="${aviso.texto}"` : ''}>${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ic(link ? 'link' : 'cart', 'p')}</button>
              <div class="ic-nome">
                <textarea class="inline inline-t titulo-quebra" rows="1" maxlength="100" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Item">${esc(i.titulo)}</textarea>
                ${tags ? `<div class="ic-tags">${tags}</div>` : ''}
              </div>
              ${faixa
                ? `<button class="valor-faixa" data-acao="compra-ver" data-lista="${l.id}" data-id="${i.id}" title="${faixa.n} opções: de ${dinheiro(faixa.min)} a ${dinheiro(faixa.max)} · média ${dinheiro(faixa.media)}"><small>a partir de</small><b>${precoBR(faixa.min)}</b></button>`
                : `<input class="inline valor-edit" value="${esc(i.valor)}" placeholder="R$" data-mudar="campo" data-ref="${ref}" data-campo="valor" data-redesenhar="1" aria-label="Valor">`}
              <button class="btn-mini ver-detalhes ${aviso ? 'aviso aviso-' + aviso.tipo : ''}" data-acao="compra-ver" data-lista="${l.id}" data-id="${i.id}" ${aviso ? `title="${aviso.texto}" aria-label="Ver detalhes (${aviso.texto})"` : ''}>Ver detalhes</button>
              ${htmlLinkLinha(i, ref)}
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
    avisar('A loja bloqueou a leitura automática agora (Amazon e Mercado Livre fazem isso às vezes). Coloque a foto à mão em "Ver detalhes" ou tente "Atualizar foto e preço" mais tarde.');
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
      ${i.esgotado && !i.comprado ? `<div class="dc-esgotado"><span class="ponto-esgotado"></span><div><b>Produto esgotado</b><small>A loja mostrou sem estoque${i.precoConferido ? ' em ' + dataHoraCurta(i.precoConferido) : ''}. A foto fica guardada.</small></div></div>` : ''}
      ${i.loja || link ? `<span class="dc-loja">${ic('cart', 'p')} ${esc(i.loja || dominio(link))}</span>` : ''}
      <textarea class="dc-titulo" rows="2" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Nome do produto">${esc(i.titulo)}</textarea>
      <div class="dc-preco"><span>R$</span><input type="text" inputmode="decimal" value="${esc(String(i.valor || '').replace(/^R\$\s*/, ''))}" placeholder="0,00" data-mudar="campo" data-ref="${ref}" data-campo="valor" data-redesenhar="1" aria-label="Valor">${htmlPrecoAntes(i)}</div>
      ${link && i.precoConferido ? `<p class="dc-conferido">${i.precoSituacao === 'falhou' ? `${ic('alert', 'p')} A loja bloqueou a leitura automática na última tentativa (${dataHoraCurta(i.precoConferido)}). Amazon e Mercado Livre fazem isso às vezes; o robô tenta de novo amanhã. O valor acima é o último conhecido.` : `${ic('check', 'p')} Preço conferido na loja em ${dataHoraCurta(i.precoConferido)}${htmlPrecoAntes(i) ? ' · antes era ' + dinheiro(valorNumero(i.valorAntes)) : ''}`}</p>` : ''}
      <div class="dc-link">
        <input type="url" value="${esc(link)}" placeholder="Cole o link do produto" data-mudar="compra-link" data-ref="${ref}" aria-label="Link do produto">
        ${link ? `<button class="btn-mini" data-acao="compra-previa" data-lista="${l.id}" data-id="${i.id}" ${buscando ? 'disabled' : ''}>${ic('reset', 'p')} Atualizar foto e preço</button>` : ''}
      </div>
      ${htmlLinksExtras(l, i)}
      ${link ? `<a class="btn dc-abrir" href="${esc(link)}" target="_blank" rel="noopener">${ic('right', 'p')} Abrir na loja</a>` : ''}
      ${htmlHistoricoPreco(i)}
      <div class="dc-grade">
        <div class="campo"><span>Quando comprar</span>
          <div class="segmento">${Object.entries(GRUPOS_COMPRA).map(([id, g]) => `<button class="${i.prazo === id ? 'ativo' : ''}" data-acao="compra-prazo" data-ref="${ref}" data-v="${id}">${g.nome}</button>`).join('')}</div></div>
        <label class="campo">Mês (opcional)<input type="month" value="${i.mes || ''}" data-mudar="campo" data-ref="${ref}" data-campo="mes" data-redesenhar="1"></label>
      </div>
      <div class="campo"><span>Categoria</span>
        <div class="chips">${['', ...cats].map((c) => `<button class="chip ${(i.cat || '') === c ? 'ativo' : ''}" data-acao="compra-cat-item" data-ref="${ref}" data-v="${esc(c)}">${c ? esc(c) : 'Sem categoria'}</button>`).join('')}</div></div>
      ${htmlJuntarCompra(l, i)}
      ${htmlLancadoCompra(l, i)}
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
  carregarHistoricoPreco(el.dataset.lista, el.dataset.id);
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
  let url = el.value.trim() ? corrigirLink(el.value) : '';
  if (!url && i.linksExtras?.length) { url = i.linksExtras.shift().url; } // o próximo link vira o principal
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
  if (!i) return;
  // Ao marcar como comprado, pergunta como pagou (com opção de só marcar)
  if (!i.comprado && temFinancas() && !lancamentoDaCompra(i)) { abrirPagamento(el.dataset.ref, true); return; }
  if (i.comprado) {
    i.comprado = false;
    if (lancamentoDaCompra(i)) avisar('Desmarcado. O gasto continua em Finanças; apague lá se precisar.');
  } else marcarComprado(el.dataset.ref);
  salvar(); desenhar(); redesenharCompra();
};

MUDAR['compras-ordenar'] = (el) => {
  const l = acharLista(el.dataset.lista);
  if (!l) return;
  l.ordenarCompras = el.value;
  salvar(); desenhar();
};

ACOES['compra-prioridade'] = (el) => {
  const i = acharRef(el.dataset.ref);
  if (!i) return;
  i.prioridade = !i.prioridade;
  salvar(); desenhar(); redesenharCompra();
};

// ---------- Apagar vários (lixeira no topo do card) ----------
ACOES['compras-selecionar'] = (el) => {
  comprasTela.selecionando = comprasTela.selecionando === el.dataset.g ? '' : el.dataset.g;
  comprasTela.selecionados = new Set();
  desenhar();
};
ACOES['compras-sel-cancelar'] = () => { comprasTela.selecionando = ''; comprasTela.selecionados = new Set(); desenhar(); };
ACOES['compra-sel'] = (el) => {
  const id = el.dataset.id;
  if (comprasTela.selecionados.has(id)) comprasTela.selecionados.delete(id); else comprasTela.selecionados.add(id);
  desenhar();
};
ACOES['compras-sel-todos'] = (el) => {
  const ids = (el.closest('.card').querySelector('.lista-compras')?.dataset.ids || '').split(',').filter(Boolean);
  const todos = ids.every((id) => comprasTela.selecionados.has(id));
  comprasTela.selecionados = new Set(todos ? [] : ids);
  desenhar();
};
ACOES['compras-sel-apagar'] = (el) => {
  const l = acharLista(el.dataset.lista);
  const ids = [...comprasTela.selecionados];
  if (!l || !ids.length) return;
  comprasTela.selecionando = ''; comprasTela.selecionados = new Set();
  removerVariosComDesfazer(l.itens, ids, 'Item');
};
// Igual a removerComDesfazer (utils.js), mas para vários de uma vez, com um "Desfazer" só
function removerVariosComDesfazer(lista, ids, nome = 'Item') {
  const caminho = caminhoDe(lista);
  const quando = new Date().toISOString();
  const tirados = [];
  ids.forEach((id) => {
    const pos = lista.findIndex((x) => x.id === id);
    if (pos < 0) return;
    const [item] = lista.splice(pos, 1);
    tirados.push({ pos, item, registro: { id: item.id, tipo: nome, nome: nomeDoItem(item), quando, pos, caminho, item } });
  });
  if (!tirados.length) return;
  estado.lixeira = estado.lixeira || [];
  if (caminho) estado.lixeira.unshift(...tirados.map((t) => t.registro).reverse());
  salvar(); desenhar();
  const n = tirados.length;
  avisar(n === 1 ? `${nome} foi para a lixeira` : `${n} itens foram para a lixeira`, () => {
    const regs = new Set(tirados.map((t) => t.registro));
    estado.lixeira = estado.lixeira.filter((x) => !regs.has(x));
    [...tirados].reverse().forEach((t) => lista.splice(t.pos, 0, t.item));
    salvar(); desenhar();
  });
}

ACOES['compras-mostrar'] = () => { comprasTela.mostrarComprados = !comprasTela.mostrarComprados; desenhar(); };


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

// Nome do item é um campo de várias linhas (para caber inteiro); Enter só confirma, não quebra linha
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches?.('.item-compra textarea.inline-t')) { e.preventDefault(); e.target.blur(); }
});

// ---------- Vários links por item (ex.: 3 modelos diferentes) ----------
// i.link é o principal (foto e preço automático vêm dele); os outros ficam em i.linksExtras = [{ id, url, nome }]
const linksExtrasCompra = (i) => (i.linksExtras || []).filter((x) => x && x.url);
function todosLinksCompra(i) {
  const principal = linkCompra(i);
  return [...(principal ? [{ id: '', url: principal, nome: i.loja || '' }] : []), ...linksExtrasCompra(i)];
}

function htmlLinkLinha(i, ref) {
  const ls = todosLinksCompra(i);
  if (!ls.length) return '<span class="acao-item sem-link" aria-hidden="true"></span>';
  if (ls.length === 1) return `<a class="acao-item abrir-loja" href="${esc(ls[0].url)}" target="_blank" rel="noopener" title="Abrir na loja" aria-label="Abrir ${esc(i.titulo)} na loja">${ic('link', 'p')}</a>`;
  return `<button class="acao-item abrir-loja varios" data-acao="compra-links-menu" data-ref="${ref}" title="${ls.length} links" aria-haspopup="menu" aria-label="${ls.length} links de ${esc(i.titulo)}">${ic('link', 'p')}<b>${ls.length}</b></button>`;
}

let menuLinksAberto = null;
function fecharMenuLinks() { menuLinksAberto?.menu.remove(); menuLinksAberto = null; }
ACOES['compra-links-menu'] = (el) => {
  const jaEra = menuLinksAberto?.dono === el;
  fecharMenuLinks();
  if (jaEra) return;
  const i = acharRef(el.dataset.ref);
  if (!i) return;
  const m = document.createElement('div');
  m.className = 'sel-menu menu-links';
  m.setAttribute('role', 'menu');
  m.innerHTML = todosLinksCompra(i).map((x, k) => {
    const nome = x.nome || dominio(x.url);
    return `<a role="menuitem" href="${esc(x.url)}" target="_blank" rel="noopener">${ic('link', 'p')}<span><b>${esc(nome)}</b>${x.nome ? `<small>${esc(dominio(x.url))}</small>` : ''}${k === 0 ? '<small>principal</small>' : ''}</span></a>`;
  }).join('');
  document.body.appendChild(m);
  const r = el.getBoundingClientRect();
  const alto = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
  m.style.top = (r.bottom + 6 + alto > innerHeight ? Math.max(8, r.top - alto - 6) : r.bottom + 6) + 'px';
  menuLinksAberto = { menu: m, dono: el };
  m.querySelector('a')?.focus();
};
document.addEventListener('click', (e) => {
  if (!menuLinksAberto) return;
  if (e.target.closest('.menu-links a')) { setTimeout(fecharMenuLinks, 0); return; }
  if (!e.target.closest('.menu-links') && !e.target.closest('[data-acao="compra-links-menu"]')) fecharMenuLinks();
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuLinksAberto) fecharMenuLinks(); });
window.addEventListener('resize', fecharMenuLinks);
document.addEventListener('scroll', () => fecharMenuLinks(), true);

function htmlLinksExtras(l, i) {
  const ref = `${l.id}/${i.id}`;
  const extras = i.linksExtras || [];
  if (!linkCompra(i) && !extras.length) return '';
  const faixa = faixaCompra(i);
  return `<div class="dc-links-extras">
    ${extras.length ? `<div class="dc-faixa">${faixa
      ? `${ic('chart', 'p')}<span><b>${faixa.n} opções:</b> de ${dinheiro(faixa.min)} a ${dinheiro(faixa.max)} · média <b>${dinheiro(faixa.media)}</b></span>`
      : `${ic('chart', 'p')}<span>Coloque o preço de cada link para ver a faixa de preço e a média.</span>`}</div>` : ''}
    ${extras.map((x) => `<div class="dc-link-extra">
      <a class="acao-item abrir-loja" href="${esc(x.url)}" target="_blank" rel="noopener" title="Abrir este link">${ic('link', 'p')}</a>
      <input type="text" value="${esc(x.nome || '')}" placeholder="${esc(dominio(x.url))}" maxlength="40" data-mudar="compra-link-extra" data-campo="nome" data-ref="${ref}" data-id="${x.id}" aria-label="Nome deste link (ex.: modelo prata)">
      <input type="url" value="${esc(x.url)}" data-mudar="compra-link-extra" data-campo="url" data-ref="${ref}" data-id="${x.id}" aria-label="Endereço do link">
      <input type="text" class="preco-extra" inputmode="decimal" value="${esc(x.valor || '')}" placeholder="R$" data-mudar="compra-link-extra" data-campo="valor" data-ref="${ref}" data-id="${x.id}" aria-label="Preço neste link">
      <button type="button" class="acao-item apagar" data-acao="compra-link-extra-del" data-ref="${ref}" data-id="${x.id}" title="Tirar este link">${ic('x', 'p')}</button>
    </div>`).join('')}
    <form class="form-linha" data-form="compra-link-extra" data-ref="${ref}">
      <input type="text" name="url" id="link-extra-novo" placeholder="Adicionar outro link (outro modelo, outra loja…)" data-precisa>
      <button class="btn-mini" type="submit">${ic('plus', 'p')} Link</button>
    </form>
    ${extras.length ? '<p class="dica" style="margin:0">Dê um nome e o preço de cada link. A foto e o preço automático (robô) vêm do primeiro link; o valor grande acima é o do link principal.</p>' : ''}
  </div>`;
}
FORMS['compra-link-extra'] = (d, form) => {
  const i = acharRef(form.dataset.ref);
  if (!i || !d.url) return;
  const url = corrigirLink(d.url);
  if (!linkCompra(i)) { // ainda não tinha link: vira o principal e puxa foto/preço
    i.link = url;
    salvar(); desenhar();
    const [lid, iid] = form.dataset.ref.split('/');
    buscarPrevia(lid, iid);
    return;
  }
  i.linksExtras = i.linksExtras || [];
  i.linksExtras.push({ id: novoId(), url, nome: '' });
  document.activeElement?.blur(); // a janela só se redesenha sem campo em foco
  salvar(); desenhar(); redesenharCompra();
  $('#link-extra-novo')?.focus();
};
MUDAR['compra-link-extra'] = (el) => {
  const i = acharRef(el.dataset.ref);
  const x = i?.linksExtras?.find((y) => y.id === el.dataset.id);
  if (!x) return;
  if (el.dataset.campo === 'url') {
    if (!el.value.trim()) { i.linksExtras = i.linksExtras.filter((y) => y !== x); }
    else x.url = corrigirLink(el.value);
  } else if (el.dataset.campo === 'valor') {
    x.valor = el.value.trim();
    salvar(); desenhar();
    document.activeElement === el && el.blur();
    redesenharCompra(); // atualiza a faixa de preço
    return;
  } else x.nome = el.value.trim();
  salvar(); desenhar(); // o campo já mostra o valor novo; não redesenha a janela para não tirar o foco
  if (el.dataset.campo === 'url' && !el.value.trim()) { document.activeElement?.blur(); redesenharCompra(); }
};
ACOES['compra-link-extra-del'] = (el) => {
  const i = acharRef(el.dataset.ref);
  if (!i?.linksExtras) return;
  i.linksExtras = i.linksExtras.filter((y) => y.id !== el.dataset.id);
  salvar(); desenhar(); redesenharCompra();
};

// Faixa de preço quando há vários links com preço: a linha mostra "a partir de" (o menor)
function precosCompra(i) {
  return [valorNumero(i.valor), ...linksExtrasCompra(i).map((x) => valorNumero(x.valor))].filter((v) => v > 0);
}
function faixaCompra(i) {
  if (!linksExtrasCompra(i).some((x) => valorNumero(x.valor) > 0)) return null;
  const ps = precosCompra(i);
  if (ps.length < 2) return null;
  return { n: ps.length, min: Math.min(...ps), max: Math.max(...ps), media: ps.reduce((a, b) => a + b, 0) / ps.length };
}
// Valor usado em totais, ordenação e "quanto falta": o "a partir de" quando existe, senão o preço do item
const valorCompra = (i) => faixaCompra(i)?.min ?? valorNumero(i.valor);
