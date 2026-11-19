const finTela = { mes: hojeISO().slice(0, 7), aba: 'mes', tipo: 'saida', editandoCats: false, repetir: '', cat: '', situacao: '' };
const REPETE_GASTO = { '': 'Não repete', mensal: 'Todo mês', varios: 'Mais de uma vez no mês', semanal: 'Toda semana', parcelas: 'Parcelado' };

const fin = () => estado.financas;
const catGasto = (id) => fin().categorias.find((c) => c.id === id) || { id: 'outros', nome: 'Outros', cor: '#a5a3c8' };
// Categoria com nome apagado não pode deixar buraco na tela
const nomeCat = (c) => (c?.nome || '').trim() || (c?.id === 'outros' ? 'Outros' : 'Sem nome');
const nomeMes = (ym) => {
  const [a, m] = ym.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase()) + ' de ' + a;
};
const somarMes = (ym, n) => {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const ultimoDiaMes = (ym) => { const [a, m] = ym.split('-').map(Number); return new Date(a, m, 0).getDate(); };
const diaNoMes = (ym, dia) => `${ym}-${String(Math.min(dia, ultimoDiaMes(ym))).padStart(2, '0')}`;
const mesesEntre = (a, b) => { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };

function ocorrenciasNoMes(r, ym) {
  const iniYm = r.inicio.slice(0, 7);
  if (ym < iniYm || (r.fim && ym > r.fim)) return [];
  const k = mesesEntre(iniYm, ym);
  let datas = [];
  if (r.freq === 'mensal') datas = [diaNoMes(ym, Number(r.inicio.slice(8)))];
  if (r.freq === 'parcelas') { if (k >= r.parcelas) return []; datas = [diaNoMes(ym, Number(r.inicio.slice(8)))]; }
  if (r.freq === 'varios') datas = [...new Set(r.dias.map((d) => diaNoMes(ym, d)))];
  if (r.freq === 'semanal') {
    for (let d = r.inicio; d.slice(0, 7) <= ym; d = somarDias(d, 7)) if (d.startsWith(ym)) datas.push(d);
  }
  return datas.filter((d) => d >= r.inicio && !(r.pulados || []).includes(d)).map((d) => ({
    id: `${r.id}|${d}`, regra: r.id, desc: r.freq === 'parcelas' ? `${r.desc} (${k + 1}/${r.parcelas})` : r.desc,
    valor: r.valor, tipo: r.tipo, cat: r.cat, data: d, pago: (r.pagos || []).includes(d),
  }));
}

function lancamentosDoMes(ym) {
  return [
    ...fin().lancamentos.filter((l) => l.data.startsWith(ym)),
    ...(fin().recorrentes || []).flatMap((r) => ocorrenciasNoMes(r, ym)),
  ];
}
function lancamentosEntre(ini, fim) {
  const meses = [...new Set([ini.slice(0, 7), fim.slice(0, 7)])];
  return meses.flatMap(lancamentosDoMes).filter((l) => l.data >= ini && l.data <= fim);
}
// Lançamentos antigos (antes de existir "pago") contam como pagos; repetições usam a lista r.pagos
const estaPago = (l) => (l.regra ? !!l.pago : l.pago !== false);

function situacaoLanc(l) {
  if (estaPago(l)) return null;
  if (l.tipo === 'entrada') return { txt: 'A receber', classe: '' };
  const n = diasAte(l.data);
  if (n < 0) return { txt: `Atrasado ${-n} ${n === -1 ? 'dia' : 'dias'}`, classe: 'ruim' };
  if (n === 0) return { txt: 'Vence hoje', classe: 'atencao' };
  if (n <= 3) return { txt: `Vence em ${n} ${n === 1 ? 'dia' : 'dias'}`, classe: 'atencao' };
  return { txt: 'Pendente', classe: '' };
}

function textoRegra(r) {
  if (r.freq === 'mensal') return `todo dia ${Number(r.inicio.slice(8))}`;
  if (r.freq === 'varios') return `dias ${r.dias.join(', ')} de cada mês`;
  if (r.freq === 'semanal') return `toda ${DIAS_SEMANA[paraData(r.inicio).getDay()].toLowerCase()}`;
  const fimYm = somarMes(r.inicio.slice(0, 7), r.parcelas - 1);
  return `${r.parcelas}x · termina em ${mesCurto(fimYm)}`;
}

function vencimento(conta, ym) {
  const [a, m] = ym.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return `${ym}-${String(Math.min(conta.dia, ultimo)).padStart(2, '0')}`;
}
function situacaoConta(conta, ym = hojeISO().slice(0, 7)) {
  if (conta.pagas?.[ym]) return { txt: 'Paga', classe: 'ok' };
  const venc = vencimento(conta, ym);
  const n = diasAte(venc);
  if (n < 0) return { txt: `Atrasada ${-n} ${n === -1 ? 'dia' : 'dias'}`, classe: 'ruim', venc };
  if (n === 0) return { txt: 'Vence hoje', classe: 'atencao', venc };
  if (n <= 3) return { txt: `Vence em ${n} ${n === 1 ? 'dia' : 'dias'}`, classe: 'atencao', venc };
  return { txt: `Vence dia ${Number(venc.slice(8))}`, classe: '', venc };
}

PAGINAS.financas = {
  titulo: 'Finanças',
  desenhar() {
    const ym = finTela.mes;
    const doMes = lancamentosDoMes(ym).sort((a, b) => b.data.localeCompare(a.data));
    const regras = (fin().recorrentes || []).filter((r) => !r.fim || r.fim >= ym);
    const soma = (ls) => ls.reduce((s, l) => s + l.valor, 0);
    const ents = doMes.filter((l) => l.tipo === 'entrada');
    const gastos = doMes.filter((l) => l.tipo !== 'entrada');
    const recebido = soma(ents.filter(estaPago));
    const aReceber = soma(ents) - recebido;
    const pago = soma(gastos.filter(estaPago));
    const gastosPendentes = gastos.filter((l) => !estaPago(l));
    const saidas = soma(gastos);
    const porCat = {};
    doMes.filter((l) => l.tipo !== 'entrada').forEach((l) => { porCat[l.cat] = (porCat[l.cat] || 0) + l.valor; });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const maiorCat = cats[0]?.[1] || 1;
    const contasPendentes = fin().contas.filter((c) => !c.pagas?.[ym]);
    const aPagar = soma(gastosPendentes) + contasPendentes.reduce((s, c) => s + c.valor, 0);
    const qtdAPagar = gastosPendentes.length + contasPendentes.length;
    const saldo = recebido - pago;
    const previsto = pago + aPagar;
    const sobraPrevista = recebido + aReceber - previsto;
    const vermelho = (v) => (v < 0 ? 'style="color:var(--vermelho)"' : '');
    const situacaoPadrao = finTela.situacao || (finTela.repetir ? 'pendente' : 'pago');

    const porDia = {};
    doMes.forEach((l) => { (porDia[l.data] = porDia[l.data] || []).push(l); });

    return `
    <div class="cab-pagina">
      <div><h1>Finanças</h1><p>Para onde o dinheiro está indo e as contas que vencem no mês.</p></div>
      <div class="segmento">
        <button class="${finTela.aba === 'mes' ? 'ativo' : ''}" data-acao="fin-aba" data-a="mes">${ic('wallet', 'p')} Gastos do mês</button>
        <button class="${finTela.aba === 'contas' ? 'ativo' : ''}" data-acao="fin-aba" data-a="contas">${ic('calendar', 'p')} Contas fixas${contasPendentes.length ? ` <b class="bolinha">${contasPendentes.length}</b>` : ''}</button>
      </div>
    </div>

    <div class="barra-mes">
      <button class="btn-icone" data-acao="fin-mes" data-n="-1" aria-label="Mês anterior">${ic('left')}</button>
      <h2>${nomeMes(ym)}</h2>
      <button class="btn-icone" data-acao="fin-mes" data-n="1" aria-label="Próximo mês">${ic('right')}</button>
      ${ym !== hojeISO().slice(0, 7) ? `<button class="btn-mini" data-acao="fin-mes" data-n="0">Este mês</button>` : ''}
    </div>

    <div class="grade fin-stats">
      <div class="card stat" data-dica="Entradas já recebidas"><span class="selo c-verde">${ic('plus')}</span><div><b>${dinheiro(recebido)}</b><span>recebido</span>${aReceber ? `<small>${dinheiro(aReceber)} a receber</small>` : ''}</div></div>
      <div class="card stat" data-dica="Gastos marcados como pagos"><span class="selo c-vermelho">${ic('wallet')}</span><div><b>${dinheiro(pago)}</b><span>já pago</span></div></div>
      <div class="card stat" data-dica="O que entrou menos o que já foi pago"><span class="selo c-violeta">${ic('money')}</span><div><b ${vermelho(saldo)}>${dinheiro(saldo)}</b><span>saldo do mês</span></div></div>
      <div class="card stat" data-dica="Gastos pendentes e contas fixas não pagas"><span class="selo c-amarelo">${ic('calendar')}</span><div><b>${dinheiro(aPagar)}</b><span>${qtdAPagar} a pagar</span></div></div>
      <div class="card stat" data-dica="Tudo o que vai sair no mês (pago + a pagar)"><span class="selo c-rosa">${ic('chart')}</span><div><b>${dinheiro(previsto)}</b><span>gasto previsto</span><small>sobra <i ${vermelho(sobraPrevista)}>${dinheiro(sobraPrevista)}</i></small></div></div>
    </div>

    ${finTela.aba === 'mes' ? `<div class="fin-layout">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('plus')}</span> Novo lançamento</h2>
        <form class="form-gasto" data-form="gasto-novo">
          <div class="segmento">
            <button type="button" class="${finTela.tipo === 'saida' ? 'ativo' : ''}" data-acao="fin-tipo" data-t="saida">Gasto</button>
            <button type="button" class="${finTela.tipo === 'entrada' ? 'ativo' : ''}" data-acao="fin-tipo" data-t="entrada">Entrada</button>
          </div>
          <input type="text" name="desc" placeholder="${finTela.tipo === 'entrada' ? 'De onde veio' : 'Com o que gastou'}" maxlength="80" data-precisa id="gasto-desc">
          <input type="text" name="valor" placeholder="R$" inputmode="decimal" style="max-width:130px" aria-label="Valor">
          ${finTela.tipo === 'saida' ? `<select name="cat" aria-label="Categoria">${fin().categorias.map((c) => `<option value="${c.id}" ${finTela.cat === c.id ? 'selected' : ''}>${esc(nomeCat(c))}</option>`).join('')}</select>` : ''}
          <input type="date" name="data" value="${ym === hojeISO().slice(0, 7) ? hojeISO() : ym + '-01'}" aria-label="Data" style="max-width:160px">
          <select name="repetir" data-mudar="fin-repetir" aria-label="Repetição">${Object.entries(REPETE_GASTO).map(([id, n]) => `<option value="${id}" ${finTela.repetir === id ? 'selected' : ''}>${n}</option>`).join('')}</select>
          ${finTela.repetir === 'parcelas' ? `<label class="rotulo-select">Parcelas<input type="number" name="parcelas" min="2" max="72" value="10" style="width:76px"></label>` : ''}
          ${finTela.repetir === 'varios' ? `<label class="rotulo-select">Dias do mês<input type="text" name="dias" placeholder="5, 20" style="width:110px"></label>` : ''}
          <select name="situacao" data-mudar="fin-situacao" aria-label="Situação">
            <option value="pago" ${situacaoPadrao === 'pago' ? 'selected' : ''}>${finTela.tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}</option>
            <option value="pendente" ${situacaoPadrao === 'pendente' ? 'selected' : ''}>${finTela.tipo === 'entrada' ? 'A receber' : 'Pendente'}</option>
          </select>
          <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
        </form>
        ${finTela.repetir === 'parcelas' ? '<p class="dica" style="margin:6px 0 0">Coloque o valor de cada parcela. A primeira cai na data escolhida e as outras no mesmo dia dos meses seguintes.</p>' : ''}
        ${finTela.repetir === 'varios' ? '<p class="dica" style="margin:6px 0 0">Ex.: salário dia 5 e dia 20. Separe os dias por vírgula.</p>' : ''}
        ${finTela.repetir ? '<p class="dica" style="margin:6px 0 0">A situação vale só para a primeira vez. As próximas entram como pendentes: é só marcar o quadradinho quando pagar.</p>' : ''}

        <h3 class="sub-titulo">Lançamentos do mês</h3>
        <div class="lancamentos">
          ${Object.entries(porDia).map(([d, ls]) => `<div class="dia-lanc">${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '')}</div>
            ${ls.map((l) => {
              const c = catGasto(l.cat);
              const ok = estaPago(l);
              const sit = situacaoLanc(l);
              const quem = l.tipo === 'entrada' ? 'recebido' : 'pago';
              return `<div class="item lanc ${ok ? '' : 'pendente'}">
                <button class="check ${ok ? 'on' : ''}" data-acao="lanc-pagar" data-id="${l.id}" title="${ok ? `Marcar como não ${quem}` : `Marcar como ${quem}`}">${ok ? ic('check') : ''}</button>
                <span class="barra-cor" style="background:${l.tipo === 'entrada' ? 'var(--verde)' : c.cor}"></span>
                <span class="txt clicavel" data-acao="lanc-editar" data-id="${l.id}" title="Editar">${esc(l.desc || nomeCat(c))}<span class="sub">${l.tipo === 'entrada' ? 'entrada' : esc(nomeCat(c))}${l.conta ? ' · conta fixa' : ''}${l.regra ? ` · ${ic('repeat', 'p')} ${regraDe(l)?.freq === 'parcelas' ? 'parcela' : 'repete'}` : ''}${sit ? ` <span class="situacao ${sit.classe}">${sit.txt}</span>` : ''}</span></span>
                <b class="${l.tipo === 'entrada' ? 'valor-entrada' : ''}">${l.tipo === 'entrada' ? '+' : '−'} ${dinheiro(l.valor)}</b>
                <button class="acao-item" data-acao="lanc-editar" data-id="${l.id}" title="Editar">${ic('edit', 'p')}</button>
                <button class="acao-item apagar" data-acao="gasto-del" data-id="${l.id}" title="${l.regra ? 'Tirar só deste mês' : 'Apagar'}">${ic('trash', 'p')}</button>
              </div>`;
            }).join('')}`).join('') || '<p class="vazio">Nenhum lançamento neste mês.</p>'}
        </div>
      </section>

      <div style="display:grid;gap:16px;align-content:start">
        <section class="card">
          <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('chart')}</span> Gastos por categoria
            <a href="#" data-acao="fin-cats">${finTela.editandoCats ? 'Pronto' : 'Editar categorias'}</a></h2>
          ${finTela.editandoCats ? `<div class="cats-edit">
            ${fin().categorias.map((c) => `<div class="item"><input type="color" value="${c.cor}" data-mudar="cat-cor" data-id="${c.id}" aria-label="Cor">
              <input class="inline inline-t" value="${esc(c.nome)}" placeholder="Sem nome" data-digitar="cat-nome" data-id="${c.id}" aria-label="Nome">
              ${c.id !== 'outros' ? `<button class="acao-item apagar" data-acao="cat-del" data-id="${c.id}" title="Apagar">${ic('trash', 'p')}</button>` : ''}</div>`).join('')}
            <form class="form-linha" data-form="cat-nova" style="margin-top:8px"><input type="text" name="nome" placeholder="Nova categoria" maxlength="30" data-precisa><button class="btn sec" type="submit">${ic('plus', 'p')}</button></form>
          </div>` : cats.length ? `<div class="barras-h dinheiro fin-rolavel">
            ${cats.map(([id, v]) => {
              const c = catGasto(id);
              return `<div class="barra-h" data-dica="${esc(nomeCat(c))} · ${dinheiro(v)} (${Math.round((v / saidas) * 100)}%)">
                <span class="nome">${esc(nomeCat(c))}</span>
                <span class="trilho"><i style="width:${Math.max(2, (v / maiorCat) * 100)}%;background:${c.cor}"></i></span>
                <span class="valor">${dinheiro(v)}</span></div>`;
            }).join('')}
          </div>` : '<p class="vazio">Os gastos do mês aparecem aqui separados por categoria.</p>'}
        </section>

        <section class="card">
          <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('calendar')}</span> Contas de ${nomeMes(ym).split(' ')[0].toLowerCase()} <a href="#" data-acao="fin-aba" data-a="contas">Ver todas</a></h2>
          <div class="fin-rolavel">${fin().contas.map((c) => htmlConta(c, ym, true)).join('') || '<p class="vazio">Cadastre aluguel, internet, celular… em Contas fixas.</p>'}</div>
        </section>

        <section class="card">
          <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('repeat')}</span> Repetições e parcelas</h2>
          <div class="fin-rolavel">${regras.map((r) => `<div class="item">
            <span class="barra-cor" style="background:${r.tipo === 'entrada' ? 'var(--verde)' : catGasto(r.cat).cor}"></span>
            <span class="txt">${esc(r.desc)}<span class="sub">${textoRegra(r)}</span></span>
            <b class="${r.tipo === 'entrada' ? 'valor-entrada' : ''}">${dinheiro(r.valor)}</b>
            <button class="acao-item" data-acao="regra-editar" data-id="${r.id}" title="Editar todas">${ic('edit', 'p')}</button>
            <button class="acao-item apagar" data-acao="regra-del" data-id="${r.id}" title="Parar de repetir">${ic('trash', 'p')}</button>
          </div>`).join('') || '<p class="vazio">Ao adicionar um lançamento, escolha "Todo mês", "Toda semana" ou "Parcelado" para ele aparecer aqui.</p>'}</div>
        </section>
      </div>
    </div>` : htmlContas(ym)}`;
  },
};

function htmlConta(c, ym, compacto = false) {
  const s = situacaoConta(c, ym);
  const paga = !!c.pagas?.[ym];
  return `<div class="item conta ${paga ? 'feito' : ''}">
    <button class="check ${paga ? 'on' : ''}" data-acao="conta-pagar" data-id="${c.id}" title="${paga ? 'Desmarcar' : 'Marcar como paga'}">${paga ? ic('check') : ''}</button>
    <span class="txt">${compacto ? esc(c.nome) : `<input class="inline inline-t" value="${esc(c.nome)}" data-digitar="conta-campo" data-id="${c.id}" data-campo="nome" aria-label="Nome">`}
      <span class="sub">dia ${c.dia} · ${esc(nomeCat(catGasto(c.cat)))}</span></span>
    <span class="situacao ${s.classe}">${s.txt}</span>
    <b>${dinheiro(c.valor)}</b>
    ${compacto ? '' : `<button class="acao-item apagar" data-acao="conta-del" data-id="${c.id}" title="Apagar conta">${ic('trash', 'p')}</button>`}
  </div>`;
}

function htmlContas(ym) {
  const contas = [...fin().contas].sort((a, b) => a.dia - b.dia);
  const total = contas.reduce((s, c) => s + c.valor, 0);
  return `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('calendar')}</span> Contas fixas <small>total por mês: ${dinheiro(total)}</small></h2>
    <form class="form-gasto" data-form="conta-nova" style="margin-bottom:14px">
      <input type="text" name="nome" placeholder="Nome da conta" maxlength="60" data-precisa id="conta-nome">
      <input type="text" name="valor" placeholder="R$" inputmode="decimal" style="max-width:130px" aria-label="Valor">
      <label class="rotulo-select">Vence dia<input type="number" name="dia" min="1" max="31" value="10" style="width:76px"></label>
      <select name="cat" aria-label="Categoria">${fin().categorias.map((c) => `<option value="${c.id}" ${c.id === 'casa' ? 'selected' : ''}>${esc(nomeCat(c))}</option>`).join('')}</select>
      <button class="btn" type="submit">${ic('plus', 'p')} Adicionar conta</button>
    </form>
    <div class="fin-rolavel" style="max-height:440px">${contas.map((c) => htmlConta(c, ym)).join('') || '<p class="vazio">Nenhuma conta fixa ainda.</p>'}</div>
    <div class="form-linha" style="margin-top:14px;justify-content:flex-start">
      <label class="rotulo-select">Avisar
        <select data-mudar="cfg-contas">
          ${[[0, 'só no dia'], [1, '1 dia antes'], [2, '2 dias antes'], [3, '3 dias antes'], [5, '5 dias antes']].map(([v, n]) => `<option value="${v}" ${Number(estado.config.avisoContas) === v ? 'selected' : ''}>${n}</option>`).join('')}
        </select></label>
    </div>
    <p class="dica">Ao marcar uma conta como paga, ela entra sozinha nos gastos do mês.</p>
  </section>`;
}

ACOES['fin-aba'] = (el) => { finTela.aba = el.dataset.a; desenhar(); };
// Redesenha a página sem perder o que já foi digitado/escolhido no "Novo lançamento"
function redesenharFormGasto(mudanca) {
  const f = $('form[data-form="gasto-novo"]');
  const vals = f ? Object.fromEntries(new FormData(f)) : {};
  if (vals.cat) finTela.cat = vals.cat;
  mudanca();
  desenhar();
  const n = $('form[data-form="gasto-novo"]');
  if (!n) return;
  Object.entries(vals).forEach(([k, v]) => {
    if (k === 'repetir' || k === 'situacao') return; // esses vêm do finTela
    const campo = n.elements[k];
    if (!campo || !v) return;
    if (campo.tagName === 'SELECT') {
      if (![...campo.options].some((o) => o.value === v)) return;
      campo.value = v;
      rotuloSelect(campo);
    } else {
      campo.value = v;
      if (campo.type === 'date') rotuloData(campo);
    }
  });
}

ACOES['fin-tipo'] = (el) => { redesenharFormGasto(() => { finTela.tipo = el.dataset.t; }); $('#gasto-desc')?.focus(); };
ACOES['fin-mes'] = (el) => { const n = Number(el.dataset.n); finTela.mes = n ? somarMes(finTela.mes, n) : hojeISO().slice(0, 7); desenhar(); };
ACOES['fin-cats'] = () => { finTela.editandoCats = !finTela.editandoCats; desenhar(); };

const regraDe = (l) => (fin().recorrentes || []).find((r) => r.id === l.regra);
MUDAR['fin-repetir'] = (el) => redesenharFormGasto(() => { finTela.repetir = el.value; });
MUDAR['fin-situacao'] = (el) => { finTela.situacao = el.value; };

ACOES['lanc-pagar'] = (el) => {
  const id = el.dataset.id;
  if (id.includes('|')) {
    const [idRegra, data] = id.split('|');
    const r = fin().recorrentes.find((x) => x.id === idRegra);
    if (!r) return;
    r.pagos = r.pagos || [];
    const ja = r.pagos.includes(data);
    r.pagos = ja ? r.pagos.filter((x) => x !== data) : [...r.pagos, data];
    if (!ja) tocarSom(true);
  } else {
    const l = fin().lancamentos.find((x) => x.id === id);
    if (!l) return;
    if (l.conta) { // veio de conta fixa: desmarcar = conta volta a ficar pendente
      const c = fin().contas.find((x) => x.id === l.conta);
      if (c?.pagas) delete c.pagas[l.data.slice(0, 7)];
      fin().lancamentos = fin().lancamentos.filter((x) => x.id !== l.id);
    } else {
      l.pago = !estaPago(l);
      if (l.pago) tocarSom(true);
    }
  }
  salvar(); desenhar();
};

FORMS['gasto-novo'] = (d) => {
  const valor = valorNumero(d.valor);
  if (!valor) { avisar('Coloque o valor.'); return; }
  const base = { desc: d.desc, valor, tipo: finTela.tipo, cat: finTela.tipo === 'entrada' ? '' : d.cat || 'outros' };
  const data = d.data || hojeISO();
  const freq = d.repetir || '';
  const pago = d.situacao !== 'pendente';
  if (d.cat) finTela.cat = d.cat;
  if (!freq) {
    fin().lancamentos.push({ id: novoId(), ...base, data, pago });
  } else {
    const r = { id: novoId(), ...base, freq, inicio: data, pulados: [], pagos: [] };
    if (freq === 'parcelas') r.parcelas = Math.min(72, Math.max(2, Number(d.parcelas) || 2));
    if (freq === 'varios') {
      r.dias = [...new Set((d.dias || '').split(/[,; ]+/).map(Number).filter((x) => x >= 1 && x <= 31))].sort((a, b) => a - b);
      if (r.dias.length < 1) { avisar('Coloque os dias do mês, por exemplo: 5, 20.'); return; }
      r.inicio = data.slice(0, 8) + '01';
    }
    if (pago) r.pagos = ocorrenciasNoMes(r, data.slice(0, 7)).slice(0, 1).map((o) => o.data);
    fin().recorrentes = fin().recorrentes || [];
    fin().recorrentes.push(r);
    avisar(freq === 'parcelas' ? `Parcelado em ${r.parcelas}x de ${dinheiro(valor)} (total ${dinheiro(valor * r.parcelas)}).` : `Vai repetir ${textoRegra(r)}.`);
  }
  finTela.repetir = '';
  finTela.situacao = '';
  salvar(); desenhar();
  $('#gasto-desc')?.focus();
};

ACOES['regra-del'] = (el) => {
  const r = fin().recorrentes.find((x) => x.id === el.dataset.id);
  if (!r) return;
  const ym = finTela.mes;
  // Se já apareceu em meses anteriores, só para daqui pra frente (os meses passados continuam no histórico)
  if (r.inicio.slice(0, 7) < ym) {
    const antes = r.fim;
    r.fim = somarMes(ym, -1);
    salvar(); desenhar();
    avisar(`Não repete mais a partir de ${nomeMes(ym).toLowerCase()}.`, () => { if (antes) r.fim = antes; else delete r.fim; salvar(); desenhar(); });
    return;
  }
  removerComDesfazer(fin().recorrentes, el.dataset.id, r.freq === 'parcelas' ? 'Parcelamento' : 'Repetição');
};

ACOES['gasto-del'] = (el) => {

  if (el.dataset.id.includes('|')) {
    const [idRegra, data] = el.dataset.id.split('|');
    const r = fin().recorrentes.find((x) => x.id === idRegra);
    r.pulados = [...(r.pulados || []), data];
    salvar(); desenhar();
    avisar('Tirado só deste mês.', () => { r.pulados = r.pulados.filter((x) => x !== data); salvar(); desenhar(); });
    return;
  }
  const l = fin().lancamentos.find((x) => x.id === el.dataset.id);
  if (l?.conta) { const c = fin().contas.find((x) => x.id === l.conta); if (c?.pagas) delete c.pagas[l.data.slice(0, 7)]; }
  removerComDesfazer(fin().lancamentos, el.dataset.id, 'Lançamento');
};

FORMS['cat-nova'] = (d) => {
  const cores = ['#ff9f6b', '#5fd6a4', '#6aaeff', '#f59ad8', '#f7c56b', '#9d86ff'];
  fin().categorias.splice(fin().categorias.length - 1, 0, { id: novoId(), nome: d.nome, cor: cores[fin().categorias.length % cores.length] });
  salvar(); desenhar();
};
DIGITAR['cat-nome'] = (el) => { catGasto(el.dataset.id).nome = el.value; salvar(); };
MUDAR['cat-cor'] = (el) => { catGasto(el.dataset.id).cor = el.value; salvar(); desenhar(); };
ACOES['cat-del'] = (el) => {
  fin().lancamentos.forEach((l) => { if (l.cat === el.dataset.id) l.cat = 'outros'; });
  fin().contas.forEach((c) => { if (c.cat === el.dataset.id) c.cat = 'outros'; });
  (fin().recorrentes || []).forEach((r) => { if (r.cat === el.dataset.id) r.cat = 'outros'; });
  removerComDesfazer(fin().categorias, el.dataset.id, 'Categoria');
};

FORMS['conta-nova'] = (d) => {
  fin().contas.push({ id: novoId(), nome: d.nome, valor: valorNumero(d.valor), dia: Math.min(31, Math.max(1, Number(d.dia) || 10)), cat: d.cat || 'casa', pagas: {} });
  salvar(); desenhar();
  $('#conta-nome')?.focus();
};
DIGITAR['conta-campo'] = (el) => { fin().contas.find((x) => x.id === el.dataset.id)[el.dataset.campo] = el.value; salvar(); };
ACOES['conta-del'] = (el) => removerComDesfazer(fin().contas, el.dataset.id, 'Conta');
MUDAR['cfg-contas'] = (el) => { estado.config.avisoContas = Number(el.value); salvar(); };

ACOES['conta-pagar'] = (el) => {
  const c = fin().contas.find((x) => x.id === el.dataset.id);
  const ym = finTela.mes;
  c.pagas = c.pagas || {};
  if (c.pagas[ym]) {
    fin().lancamentos = fin().lancamentos.filter((l) => l.id !== c.pagas[ym]);
    delete c.pagas[ym];
  } else {
    const data = ym === hojeISO().slice(0, 7) ? hojeISO() : vencimento(c, ym);
    const l = { id: novoId(), desc: c.nome, valor: c.valor, tipo: 'saida', cat: c.cat, data, conta: c.id };
    fin().lancamentos.push(l);
    c.pagas[ym] = l.id;
    tocarSom(true);
  }
  salvar(); desenhar();
};

function datasDasContas() {
  const ym = hojeISO().slice(0, 7);
  return [
    ...fin().contas.filter((c) => !c.pagas?.[ym]).map((c) => ({ titulo: `Conta: ${c.nome} · ${dinheiro(c.valor)}`, data: vencimento(c, ym), cor: '#f7c56b' })),
    ...gastosPendentesDoMes(ym).map((l) => ({ titulo: `A pagar: ${l.desc || nomeCat(catGasto(l.cat))} · ${dinheiro(l.valor)}`, data: l.data, cor: '#f7c56b' })),
  ];
}
function gastosPendentesDoMes(ym) {
  return lancamentosDoMes(ym).filter((l) => l.tipo !== 'entrada' && !l.conta && !estaPago(l));
}

function verificarContas() {
  const hoje = hojeISO();
  const ym = hoje.slice(0, 7);
  const antes = Number(estado.config.avisoContas) || 0;
  fin().contas.forEach((c) => {
    if (c.pagas?.[ym]) return;
    const n = diasAte(vencimento(c, ym));
    if (n < 0 || (n > antes && n !== 0)) return;
    const chave = `conta|${c.id}|${hoje}`;
    if (estado.avisados[chave]) return;
    estado.avisados[chave] = true;
    salvar();
    notificar(n === 0 ? `Conta vence hoje: ${c.nome}` : `Conta vence em ${n} ${n === 1 ? 'dia' : 'dias'}: ${c.nome}`, dinheiro(c.valor));
  });
  gastosPendentesDoMes(ym).forEach((l) => {
    const n = diasAte(l.data);
    if (n < 0 || (n > antes && n !== 0)) return;
    const chave = `gasto|${l.id}|${hoje}`;
    if (estado.avisados[chave]) return;
    estado.avisados[chave] = true;
    salvar();
    const nome = l.desc || nomeCat(catGasto(l.cat));
    notificar(n === 0 ? `Vence hoje: ${nome}` : `Vence em ${n} ${n === 1 ? 'dia' : 'dias'}: ${nome}`, dinheiro(l.valor));
  });
}

// ---------- Editar lançamento (avulso, ou repetição/parcela: só este ou todos) ----------
function acharLanc(id) {
  if (id.includes('|')) {
    const [idRegra, data] = id.split('|');
    const r = (fin().recorrentes || []).find((x) => x.id === idRegra);
    if (!r) return null;
    const occ = ocorrenciasNoMes(r, data.slice(0, 7)).find((o) => o.data === data)
      || { id, regra: r.id, desc: r.desc, valor: r.valor, tipo: r.tipo, cat: r.cat, data, pago: (r.pagos || []).includes(data) };
    return { l: occ, r };
  }
  const l = fin().lancamentos.find((x) => x.id === id);
  return l ? { l, r: null } : null;
}

function abrirEdicaoLanc(id, soTodos = false) {
  const achado = acharLanc(id);
  if (!achado) return;
  const { l, r } = achado;
  finTela.editId = id;
  const entrada = l.tipo === 'entrada';
  const nomeTipo = r?.freq === 'parcelas' ? 'parcelas' : 'vezes';
  const linhaExtra = `
      ${entrada ? '' : `<label class="campo">Data<input type="date" name="data" value="${l.data}"></label>`}
      ${soTodos ? '' : `<label class="campo">Situação
        <select name="situacao">
          <option value="pago" ${estaPago(l) ? 'selected' : ''}>${entrada ? 'Já recebi' : 'Já paguei'}</option>
          <option value="pendente" ${estaPago(l) ? '' : 'selected'}>${entrada ? 'A receber' : 'Pendente'}</option>
        </select></label>`}
      ${r?.freq === 'parcelas' ? `<label class="campo campo-todos">Nº de parcelas<input type="number" name="parcelas" min="2" max="72" value="${r.parcelas}"></label>` : ''}
`;
  const j = $('#janela-tarefa');
  j.innerHTML = `<form data-form="lanc-salvar" method="dialog" class="${soTodos ? 'escopo-todos' : ''}">
    <h2>Editar ${entrada ? 'entrada' : 'gasto'} <button type="button" class="btn-icone" data-acao="fechar-janela" aria-label="Fechar">${ic('x')}</button></h2>
    ${r && !soTodos ? `<div class="tipo-escolha">
      <label><input type="radio" name="escopo" value="este" checked><span>Só este</span></label>
      <label><input type="radio" name="escopo" value="todos"><span>Todas as ${nomeTipo}</span></label>
    </div>` : `<input type="hidden" name="escopo" value="${r ? 'todos' : 'este'}">`}
    <label class="campo">Descrição<input type="text" name="desc" value="${esc(r && soTodos ? r.desc : l.desc)}" maxlength="80"></label>
    <div class="linha2">
      <label class="campo">Valor<input type="text" name="valor" value="${String(l.valor).replace('.', ',')}" inputmode="decimal"></label>
      ${entrada ? `<label class="campo">Data<input type="date" name="data" value="${l.data}"></label>` : `<label class="campo">Categoria
        <select name="cat">${fin().categorias.map((c) => `<option value="${c.id}" ${l.cat === c.id ? 'selected' : ''}>${esc(nomeCat(c))}</option>`).join('')}</select></label>`}
    </div>
    ${linhaExtra.trim() ? `<div class="linha-auto">${linhaExtra}</div>` : ''}
    ${r ? `<p class="dica" style="margin:0">${soTodos ? 'Vale para todas as vezes, inclusive os meses que já passaram.' : '"Só este" muda apenas este mês. "Todas" muda descrição, valor, categoria e dia em todos os meses (a situação continua valendo só para este).'}</p>` : ''}
    <div class="rodape-janela">
      ${soTodos ? '' : `<button type="button" class="btn perigo" data-acao="lanc-excluir" data-id="${id}">${ic('trash', 'p')} ${r ? 'Tirar deste mês' : 'Excluir'}</button>`}
      <button type="button" class="btn sec" data-acao="fechar-janela">Cancelar</button>
      <button type="submit" class="btn">Salvar</button>
    </div>
  </form>`;
  // Ao trocar entre "só este" e "todas", a descrição troca entre a da parcela (3/10) e a geral
  j.querySelectorAll('input[name=escopo]').forEach((rad) => rad.addEventListener('change', () => {
    const campo = j.querySelector('[name=desc]');
    if (rad.value === 'todos' && campo.value === l.desc) campo.value = r.desc;
    if (rad.value === 'este' && campo.value === r.desc) campo.value = l.desc;
    j.querySelector('form').classList.toggle('escopo-todos', rad.value === 'todos');
  }));
  j.showModal();
  melhorarSelects(j);
  melhorarDatas(j);
}

ACOES['lanc-editar'] = (el) => abrirEdicaoLanc(el.dataset.id);
ACOES['regra-editar'] = (el) => {
  const r = (fin().recorrentes || []).find((x) => x.id === el.dataset.id);
  if (!r) return;
  // abre pela primeira vez que aparece no mês da tela (ou a primeira de todas)
  const occ = ocorrenciasNoMes(r, finTela.mes)[0];
  abrirEdicaoLanc(occ ? occ.id : `${r.id}|${r.inicio}`, true);
};
ACOES['lanc-excluir'] = (el) => { fecharJanela(); ACOES['gasto-del'](el); };

FORMS['lanc-salvar'] = (d) => {
  const achado = acharLanc(finTela.editId || '');
  if (!achado) { fecharJanela(); return; }
  const { l, r } = achado;
  const valor = valorNumero(d.valor);
  if (!valor) { avisar('Coloque o valor.'); return; }
  const novo = { desc: d.desc, valor, cat: l.tipo === 'entrada' ? '' : d.cat || l.cat || 'outros', data: d.data || l.data };
  const pago = d.situacao ? d.situacao !== 'pendente' : null;

  if (!r) {
    Object.assign(l, novo);
    if (pago !== null) l.pago = pago;
    if (l.conta) { // conta fixa paga: se mudou de mês, a marcação acompanha
      const c = fin().contas.find((x) => x.id === l.conta);
      if (c?.pagas) { Object.keys(c.pagas).forEach((m) => { if (c.pagas[m] === l.id) delete c.pagas[m]; }); c.pagas[l.data.slice(0, 7)] = l.id; }
    }
  } else if (d.escopo === 'todos') {
    const desloc = Math.round((paraData(novo.data) - paraData(l.data)) / 86400000);
    Object.assign(r, { desc: novo.desc, valor: novo.valor, cat: novo.cat });
    if (desloc) {
      if (r.freq === 'varios') {
        const velho = Number(l.data.slice(8)), dia = Number(novo.data.slice(8));
        r.dias = [...new Set(r.dias.map((x) => (x === velho ? dia : x)))].sort((a, b) => a - b);
      } else {
        const mover = (x) => somarDias(x, desloc);
        r.inicio = mover(r.inicio);
        r.pagos = (r.pagos || []).map(mover);
        r.pulados = (r.pulados || []).map(mover);
      }
    }
    if (r.freq === 'parcelas' && d.parcelas) r.parcelas = Math.min(72, Math.max(2, Number(d.parcelas) || r.parcelas));
    if (pago !== null) {
      const dataOcc = desloc && r.freq !== 'varios' ? somarDias(l.data, desloc) : novo.data;
      r.pagos = (r.pagos || []).filter((x) => x !== dataOcc);
      if (pago) r.pagos.push(dataOcc);
    }
  } else {
    // Só este: tira a ocorrência da repetição e cria um lançamento avulso no lugar
    r.pulados = [...new Set([...(r.pulados || []), l.data])];
    r.pagos = (r.pagos || []).filter((x) => x !== l.data);
    fin().lancamentos.push({ id: novoId(), ...novo, tipo: l.tipo, pago: pago === null ? estaPago(l) : pago });
  }
  fecharJanela();
  salvar(); desenhar();
  avisar('Lançamento atualizado.');
};
