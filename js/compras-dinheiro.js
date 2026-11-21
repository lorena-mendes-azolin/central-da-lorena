// Compras + dinheiro: histórico de preço, lançar em Finanças (questionário) e juntar dinheiro / ligar a metas.
// Usa funções de compras.js (linkCompra, valorNumero, precoBR, dinheiro, redesenharCompra) e de financas.js (fin, nomeCat).

const FORMAS_PAGAMENTO = { pix: 'Pix', debito: 'Débito', dinheiro: 'Dinheiro', credito: 'Cartão de crédito', boleto: 'Boleto' };
const diaMesBR = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// ================= Histórico de preço =================
const historicoPrecos = {}; // id do item -> { carregando, linhas, em }

async function carregarHistoricoPreco(listaId, itemId) {
  if (!usuario || typeof sb === 'undefined') return;
  const h = historicoPrecos[itemId];
  if (h && (h.carregando || Date.now() - h.em < 5 * 60_000)) return;
  historicoPrecos[itemId] = { carregando: true, linhas: h?.linhas || [], em: Date.now() };
  const { data, error } = await sb.from('compras_precos_historico').select('dia, preco, situacao')
    .eq('user_id', usuario.id).eq('lista_id', listaId).eq('item_id', itemId).order('dia').limit(180);
  historicoPrecos[itemId] = { carregando: false, linhas: error ? [] : data || [], em: Date.now() };
  redesenharCompra();
}

function htmlHistoricoPreco(i) {
  if (!linkCompra(i)) return '';
  const h = historicoPrecos[i.id];
  const comPreco = (h?.linhas || []).filter((r) => r.preco !== null);
  let corpo;
  if (!usuario) corpo = '<p class="dica">Entre com a sua conta para ver o histórico.</p>';
  else if (h?.carregando && !comPreco.length) corpo = '<p class="dica">Carregando…</p>';
  else if (comPreco.length < 2) corpo = `<p class="dica">O gráfico aparece depois de ${comPreco.length ? 'mais um dia' : 'alguns dias'} de conferência. O robô confere uma vez por dia.</p>`;
  else corpo = graficoPrecoSvg(h.linhas);
  return `<div class="campo dc-historico"><span>${ic('chart', 'p')} Histórico de preço</span>${corpo}</div>`;
}

function graficoPrecoSvg(linhas) {
  const pts = linhas.filter((r) => r.preco !== null).map((r) => ({ dia: r.dia, v: Number(r.preco), esg: r.situacao === 'esgotado' }));
  const L = 340, A = 120, mx = 10, cima = 14, baixo = 24;
  const vs = pts.map((p) => p.v);
  const menor = Math.min(...vs), maior = Math.max(...vs);
  let min = menor, max = maior;
  if (max - min < 0.01) { min -= 1; max += 1; }
  const x = (k) => mx + (k * (L - 2 * mx)) / (pts.length - 1);
  const y = (v) => cima + ((max - v) * (A - cima - baixo)) / (max - min);
  const linha = pts.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${linha} L${x(pts.length - 1).toFixed(1)},${A - baixo} L${x(0).toFixed(1)},${A - baixo} Z`;
  const dif = pts[pts.length - 1].v - pts[0].v;
  const kMenor = vs.lastIndexOf(menor);
  return `<svg class="grafico-preco" viewBox="0 0 ${L} ${A}" role="img" aria-label="Preço de ${dinheiro(pts[0].v)} em ${diaMesBR(pts[0].dia)} para ${dinheiro(pts[pts.length - 1].v)} em ${diaMesBR(pts[pts.length - 1].dia)}">
      <line class="gp-guia" x1="${mx}" x2="${L - mx}" y1="${y(menor).toFixed(1)}" y2="${y(menor).toFixed(1)}"/>
      <path class="gp-area" d="${area}"/>
      <path class="gp-linha" d="${linha}"/>
      ${pts.map((p, k) => `<circle class="${p.esg ? 'gp-esg' : ''}" cx="${x(k).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${k === pts.length - 1 ? 4 : 2.6}"><title>${diaMesBR(p.dia)}: ${dinheiro(p.v)}${p.esg ? ' (esgotado)' : ''}</title></circle>`).join('')}
      <text class="gp-txt" x="${mx}" y="${A - 6}">${diaMesBR(pts[0].dia)}</text>
      <text class="gp-txt" x="${L - mx}" y="${A - 6}" text-anchor="end">${diaMesBR(pts[pts.length - 1].dia)}</text>
    </svg>
    <div class="gp-resumo">
      <span>Menor: <b>${dinheiro(menor)}</b> (${diaMesBR(pts[kMenor].dia)})</span>
      <span>Maior: <b>${dinheiro(maior)}</b></span>
      <span class="${dif < 0 ? 'baixou' : dif > 0 ? 'subiu' : ''}">${Math.abs(dif) < 0.01 ? 'Sem mudança no período' : `${dif < 0 ? '↓' : '↑'} ${dinheiro(Math.abs(dif))} desde ${diaMesBR(pts[0].dia)}`}</span>
    </div>`;
}

// ================= Lançar em Finanças =================
const pagTela = { ref: '', marcar: true };
const temFinancas = () => typeof temModulo === 'function' && temModulo('financas') && !!estado.financas;

function categoriaCompraPadrao() {
  const cats = fin().categorias || [];
  return (cats.find((c) => /compra/i.test(c.nome || '')) || cats.find((c) => c.id === 'outros') || cats[0] || { id: 'outros' }).id;
}

function janelaPagamento() {
  let j = $('#janela-pagamento');
  if (!j) {
    j = document.createElement('dialog');
    j.id = 'janela-pagamento';
    j.className = 'janela janela-pagamento';
    j.addEventListener('click', (e) => { if (e.target === j) j.close(); });
    document.body.appendChild(j);
  }
  return j;
}

function abrirPagamento(ref, marcar) {
  const i = acharRef(ref);
  if (!i) return;
  pagTela.ref = ref; pagTela.marcar = marcar;
  const j = janelaPagamento();
  j.innerHTML = htmlPagamento(i);
  if (!j.open) j.showModal();
  melhorarSelects(j); melhorarDatas(j);
  atualizarPagamento(j.querySelector('form'));
}

function htmlPagamento(i) {
  const total = valorNumero(i.valor);
  const hoje = hojeISO();
  const radios = (nome, opcoes, marcado) => `<div class="pag-opcoes">${Object.entries(opcoes).map(([v, t]) => `<label><input type="radio" name="${nome}" value="${v}" ${v === marcado ? 'checked' : ''} data-mudar="pag-forma"><span>${t}</span></label>`).join('')}</div>`;
  return `<form class="form-pag" data-form="compra-lancar" data-ref="${pagTela.ref}">
    <h2>${pagTela.marcar ? 'Comprou?' : 'Lançar em Finanças'} <button type="button" class="btn-icone" data-acao="pag-fechar" aria-label="Fechar">${ic('x')}</button></h2>
    <p class="dica" style="margin:-6px 0 0">Conte como foi o pagamento para lançar certinho em Finanças.</p>
    <div class="linha2">
      <label class="campo">Descrição<input type="text" name="desc" value="${esc(i.titulo)}" maxlength="80"></label>
      <label class="campo">Valor total<input type="text" name="valor" inputmode="decimal" value="${total ? precoBR(total) : ''}" placeholder="R$" data-digitar="pag-conta"></label>
    </div>
    <div class="campo"><span>Como pagou?</span>${radios('forma', FORMAS_PAGAMENTO, 'pix')}</div>
    <div class="so-credito" hidden>
      <div class="campo"><span>No cartão foi</span>${radios('credito', { vista: 'À vista (1x)', parcelado: 'Parcelado' }, 'vista')}</div>
      <div class="linha2 so-parcelado" hidden>
        <label class="campo">Nº de parcelas<input type="number" name="parcelas" min="2" max="48" value="3" data-digitar="pag-conta"></label>
        <label class="campo">Valor de cada parcela<input type="text" name="parcela" inputmode="decimal" data-digitar="pag-conta" aria-describedby="pag-conta"></label>
      </div>
      <p class="dica so-parcelado" id="pag-conta" hidden></p>
      <label class="campo" style="margin-top:10px"><span>Vencimento da fatura<span class="so-parcelado" hidden> (1ª parcela)</span></span><input type="date" name="dataFatura" value="${hoje}"></label>
    </div>
    <label class="campo so-boleto" hidden>Vencimento do boleto<input type="date" name="dataBoleto" value="${hoje}"></label>
    <label class="campo so-avista">Data da compra<input type="date" name="data" value="${hoje}"></label>
    <div class="linha2">
      <label class="campo">Situação<select name="situacao" id="pag-situacao"><option value="pago">Já paguei</option><option value="pendente">Ainda vou pagar</option></select></label>
      <label class="campo">Categoria<select name="cat">${(fin().categorias || []).map((c) => `<option value="${c.id}" ${c.id === categoriaCompraPadrao() ? 'selected' : ''}>${esc(nomeCat(c))}</option>`).join('')}</select></label>
    </div>
    <label class="check-linha"><input type="checkbox" name="marcar" ${pagTela.marcar || i.comprado ? 'checked' : ''}> Marcar como comprado</label>
    <div class="rodape-janela">
      ${pagTela.marcar && !i.comprado ? '<button type="button" class="btn sec" data-acao="pag-so-marcar" style="margin-right:auto">Só marcar, sem lançar</button>' : '<button type="button" class="btn sec" data-acao="pag-fechar" style="margin-right:auto">Cancelar</button>'}
      <button class="btn" type="submit">${ic('check', 'p')} Lançar em Finanças</button>
    </div>
  </form>`;
}

// Mostra/esconde as partes do questionário conforme a forma de pagamento
function atualizarPagamento(form, mudouForma = false) {
  if (!form) return;
  const forma = form.querySelector('[name=forma]:checked')?.value || 'pix';
  const parcelado = forma === 'credito' && form.querySelector('[name=credito]:checked')?.value === 'parcelado';
  form.querySelectorAll('.so-credito').forEach((el) => { el.hidden = forma !== 'credito'; });
  form.querySelectorAll('.so-boleto').forEach((el) => { el.hidden = forma !== 'boleto'; });
  form.querySelectorAll('.so-avista').forEach((el) => { el.hidden = forma === 'credito' || forma === 'boleto'; });
  form.querySelectorAll('.so-parcelado').forEach((el) => { el.hidden = !parcelado; });
  if (mudouForma) { // cartão e boleto normalmente ainda vão ser pagos
    const sel = form.querySelector('#pag-situacao');
    sel.value = forma === 'credito' || forma === 'boleto' ? 'pendente' : 'pago';
    if (typeof rotuloSelect === 'function') rotuloSelect(sel);
  }
  contaParcelas(form);
}
function contaParcelas(form) {
  const total = valorNumero(form.querySelector('[name=valor]').value);
  const n = Math.min(48, Math.max(2, Number(form.querySelector('[name=parcelas]').value) || 2));
  const campo = form.querySelector('[name=parcela]');
  const auto = total ? Math.round((total / n) * 100) / 100 : 0;
  campo.placeholder = auto ? precoBR(auto) : 'R$';
  const parcela = valorNumero(campo.value) || auto;
  const info = form.querySelector('#pag-conta');
  if (info) info.textContent = parcela ? `${n}x de ${dinheiro(parcela)} = ${dinheiro(parcela * n)}${valorNumero(campo.value) && total && Math.abs(parcela * n - total) >= 0.01 ? ` (com juros: ${dinheiro(parcela * n - total)} a mais)` : ''}` : '';
}
MUDAR['pag-forma'] = (el) => atualizarPagamento(el.closest('form'), el.name === 'forma');
DIGITAR['pag-conta'] = (el) => contaParcelas(el.closest('form'));
ACOES['pag-fechar'] = () => $('#janela-pagamento')?.close();

function marcarComprado(ref) {
  const i = acharRef(ref);
  if (!i || i.comprado) return;
  i.comprado = true;
  i.compradoEm = hojeISO();
  tocarSom(true);
  marcarVinculo(listaDoRef(ref)?.habito);
}
ACOES['pag-so-marcar'] = () => {
  marcarComprado(pagTela.ref);
  $('#janela-pagamento')?.close();
  salvar(); desenhar(); redesenharCompra();
};

FORMS['compra-lancar'] = (d, form) => {
  const ref = form.dataset.ref;
  const i = acharRef(ref);
  if (!i) return;
  const total = valorNumero(d.valor);
  if (!total) { avisar('Coloque o valor.'); form.querySelector('[name=valor]').focus(); return; }
  const forma = FORMAS_PAGAMENTO[d.forma] ? d.forma : 'pix';
  const pago = d.situacao === 'pago';
  const base = { desc: d.desc || i.titulo || 'Compra', tipo: 'saida', cat: d.cat || 'outros', pagamento: forma, compra: ref };
  const fs = fin();
  let texto;
  if (forma === 'credito' && d.credito === 'parcelado') {
    const n = Math.min(48, Math.max(2, Number(d.parcelas) || 2));
    const parcela = valorNumero(d.parcela) || Math.round((total / n) * 100) / 100;
    const inicio = d.dataFatura || hojeISO();
    const r = { id: novoId(), ...base, valor: parcela, freq: 'parcelas', parcelas: n, inicio, pulados: [], pagos: pago ? [inicio] : [] };
    fs.recorrentes = fs.recorrentes || [];
    fs.recorrentes.push(r);
    i.lancado = { tipo: 'regra', id: r.id, forma, parcelas: n, parcela, total: parcela * n, em: hojeISO() };
    texto = `${n}x de ${dinheiro(parcela)} no cartão`;
  } else {
    const data = forma === 'credito' ? d.dataFatura : forma === 'boleto' ? d.dataBoleto : d.data;
    const l = { id: novoId(), ...base, valor: total, data: data || hojeISO(), pago };
    fs.lancamentos.push(l);
    i.lancado = { tipo: 'lanc', id: l.id, forma, total, data: l.data, em: hojeISO() };
    texto = `${dinheiro(total)} no ${forma === 'credito' ? 'cartão' : FORMAS_PAGAMENTO[forma].toLowerCase()}`;
  }
  if (d.marcar) marcarComprado(ref);
  $('#janela-pagamento')?.close();
  salvar(); desenhar(); redesenharCompra();
  avisar(`Lançado em Finanças: ${texto}.`);
};

// Existe ainda em Finanças? (pode ter sido apagado lá)
function lancamentoDaCompra(i) {
  if (!i.lancado || !estado.financas) return null;
  const lista = i.lancado.tipo === 'regra' ? fin().recorrentes || [] : fin().lancamentos || [];
  return lista.find((x) => x.id === i.lancado.id) || null;
}

function htmlLancadoCompra(l, i) {
  if (!temFinancas()) return '';
  const ref = `${l.id}/${i.id}`;
  const lanc = lancamentoDaCompra(i);
  if (lanc) {
    const x = i.lancado;
    const como = x.tipo === 'regra' ? `${x.parcelas}x de ${dinheiro(x.parcela)} no cartão` : `${dinheiro(x.total)} · ${FORMAS_PAGAMENTO[x.forma] || ''}`;
    return `<div class="dc-lancado">${ic('check', 'p')}<span>Lançado em Finanças: <b>${como}</b></span><a class="btn-mini" href="#financas">Ver</a></div>`;
  }
  return `<button type="button" class="btn sec" data-acao="compra-lancar-abrir" data-ref="${ref}">${ic('money', 'p')} Lançar em Finanças</button>`;
}
ACOES['compra-lancar-abrir'] = (el) => abrirPagamento(el.dataset.ref, false);

// ================= Juntar dinheiro / metas =================
function metasDisponiveis() {
  return estado.listas.filter((l) => l.tipo === 'metas').flatMap((l) => (l.metas || []).map((m) => ({ ref: `${l.id}/${m.id}`, nome: m.titulo || 'Meta', lista: l.nome, m })));
}
const metaDoItem = (i) => (i.meta ? metasDisponiveis().find((x) => x.ref === i.meta) || null : null);

function itensDaMeta(refMeta) {
  return estado.listas.filter((l) => l.tipo === 'compras')
    .flatMap((l) => l.itens.filter((i) => i.meta === refMeta).map((i) => ({ l, i })));
}

function htmlJuntarCompra(l, i) {
  if (i.comprado) return '';
  const ref = `${l.id}/${i.id}`;
  const metas = metasDisponiveis();
  const meta = metaDoItem(i);
  const valor = valorCompra(i);
  let corpo = '';
  if (meta) {
    const alvo = alvoMeta(meta.m), guardado = guardadoMeta(meta.m);
    const itens = itensDaMeta(meta.ref);
    const somaItens = itens.reduce((s, x) => s + valorCompra(x.i), 0);
    const alvoUsado = alvo || somaItens;
    const pct = alvoUsado ? Math.min(100, (guardado / alvoUsado) * 100) : 0;
    corpo = `<div class="dc-juntar-meta">
      <div class="dinheiro-meta"><b>${dinheiro(guardado)}</b><span>de ${dinheiro(alvoUsado)} · faltam ${dinheiro(Math.max(0, alvoUsado - guardado))}</span>
        <div class="prog"><i style="width:${pct}%;background:var(--amarelo)"></i></div></div>
      <p class="dica" style="margin:6px 0 0">${itens.length > 1 ? `${itens.length} itens nessa meta somam ${dinheiro(somaItens)}.` : 'O dinheiro é guardado na própria meta.'} <a href="#lista-${meta.ref.replace('/', '--')}">Abrir a meta</a></p>
    </div>`;
  } else if (valor) {
    const guardado = valorNumero(i.guardado);
    const pct = Math.min(100, (guardado / valor) * 100);
    corpo = `<div class="dc-juntar-livre">
      <label class="campo">Já guardei<input type="text" inputmode="decimal" value="${esc(i.guardado || '')}" placeholder="R$ 0,00" data-mudar="campo" data-ref="${ref}" data-campo="guardado" data-redesenhar="1"></label>
      ${guardado ? `<div class="dinheiro-meta"><span>${guardado >= valor ? 'Você já juntou o valor todo!' : `Faltam <b>${dinheiro(valor - guardado)}</b>`}</span><div class="prog"><i style="width:${pct}%;background:var(--amarelo)"></i></div></div>` : ''}
    </div>`;
  }
  return `<div class="campo dc-juntar"><span>${ic('target', 'p')} Juntar dinheiro</span>
    ${metas.length ? `<select data-mudar="compra-meta" data-ref="${ref}" aria-label="Ligar a uma meta">
      <option value="">Sem meta (guardar aqui mesmo)</option>
      ${metas.map((x) => `<option value="${x.ref}" ${i.meta === x.ref ? 'selected' : ''}>Meta: ${esc(x.nome)}${metas.some((y) => y.lista !== x.lista) ? ` (${esc(x.lista)})` : ''}</option>`).join('')}
    </select>` : ''}
    ${corpo || '<p class="dica" style="margin:0">Coloque o valor do item para acompanhar quanto falta.</p>'}
  </div>`;
}
MUDAR['compra-meta'] = (el) => {
  const i = acharRef(el.dataset.ref);
  if (!i) return;
  i.meta = el.value;
  salvar(); desenhar(); redesenharCompra();
  if (el.value) avisar('Item ligado à meta. Ele aparece lá, junto com o total.');
};

// Pedacinho na linha do item: "falta R$ X" ou o nome da meta
function htmlTagJuntar(i) {
  if (i.comprado) return '';
  const meta = metaDoItem(i);
  if (meta) return `<span class="tag tag-meta" title="Ligado à meta ${esc(meta.nome)}">${ic('target', 'p')} ${esc(meta.nome)}</span>`;
  const valor = valorCompra(i), guardado = valorNumero(i.guardado);
  if (guardado && valor) return `<span class="tag tag-meta" title="Já guardou ${dinheiro(guardado)}">${guardado >= valor ? 'juntou tudo' : 'falta ' + dinheiro(valor - guardado)}</span>`;
  return '';
}

// Seção dentro da página da meta (metas.js chama)
function htmlItensDaMeta(m, refMeta) {
  const itens = itensDaMeta(refMeta);
  if (!itens.length) return '';
  const soma = itens.reduce((s, x) => s + (x.i.comprado ? 0 : valorCompra(x.i)), 0);
  const alvo = alvoMeta(m);
  return `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('cart')}</span> Itens de Compras <small>${itens.length}</small></h2>
    <div class="lista-rolavel" style="max-height:300px">
    ${itens.map(({ l, i }) => {
      const foto = fotoCompra(i);
      return `<div class="item ${i.comprado ? 'feito' : ''}">
        <button class="miniatura-compra ${foto ? '' : 'vazia'}" data-acao="compra-ver" data-lista="${l.id}" data-id="${i.id}" aria-label="Ver detalhes">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ic('cart', 'p')}</button>
        <span class="txt">${esc(i.titulo)}${i.comprado ? '<span class="sub">comprado</span>' : ''}</span>
        <b>${valorCompra(i) ? (faixaCompra(i) ? 'a partir de ' : '') + dinheiro(valorCompra(i)) : '—'}</b>
        <button class="acao-item apagar" data-acao="meta-item-tirar" data-ref="${l.id}/${i.id}" title="Tirar da meta">${ic('x', 'p')}</button>
      </div>`;
    }).join('')}
    </div>
    <div class="dc-rodape" style="margin-top:10px">
      <span>Falta comprar: <b>${dinheiro(soma)}</b></span>
      <span class="espaco"></span>
      ${soma && Math.abs(soma - alvo) >= 0.01 ? `<button class="btn-mini" data-acao="meta-usar-total" data-ref="${refMeta}" data-v="${soma.toFixed(2)}">Usar ${dinheiro(soma)} como valor da meta</button>` : ''}
    </div>
  </section>`;
}
ACOES['meta-item-tirar'] = (el) => { const i = acharRef(el.dataset.ref); if (i) { i.meta = ''; salvar(); desenhar(); } };
ACOES['meta-usar-total'] = (el) => {
  const m = acharRef(el.dataset.ref);
  if (!m) return;
  m.valorAlvo = precoBR(Number(el.dataset.v));
  salvar(); desenhar();
  avisar(`Valor da meta: ${dinheiro(Number(el.dataset.v))}.`);
};
