const finTela = { mes: hojeISO().slice(0, 7), aba: 'mes', tipo: 'saida', editandoCats: false, repetir: '' };
const REPETE_GASTO = { '': 'Não repete', mensal: 'Todo mês', varios: 'Mais de uma vez no mês', semanal: 'Toda semana', parcelas: 'Parcelado' };

const fin = () => estado.financas;
const catGasto = (id) => fin().categorias.find((c) => c.id === id) || { id: 'outros', nome: 'Outros', cor: '#a5a3c8' };
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
  if (ym < iniYm) return [];
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
    valor: r.valor, tipo: r.tipo, cat: r.cat, data: d,
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
    const regras = fin().recorrentes || [];
    const entradas = doMes.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
    const saidas = doMes.filter((l) => l.tipo !== 'entrada').reduce((s, l) => s + l.valor, 0);
    const porCat = {};
    doMes.filter((l) => l.tipo !== 'entrada').forEach((l) => { porCat[l.cat] = (porCat[l.cat] || 0) + l.valor; });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const maiorCat = cats[0]?.[1] || 1;
    const contasPendentes = fin().contas.filter((c) => !c.pagas?.[ym]);
    const aPagar = contasPendentes.reduce((s, c) => s + c.valor, 0);

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

    <div class="grade g4">
      <div class="card stat"><span class="selo c-verde">${ic('plus')}</span><div><b>${dinheiro(entradas)}</b><span>entradas</span></div></div>
      <div class="card stat"><span class="selo c-vermelho">${ic('wallet')}</span><div><b>${dinheiro(saidas)}</b><span>gastos</span></div></div>
      <div class="card stat"><span class="selo c-violeta">${ic('money')}</span><div><b style="color:${entradas - saidas < 0 ? 'var(--vermelho)' : 'inherit'}">${dinheiro(entradas - saidas)}</b><span>saldo do mês</span></div></div>
      <div class="card stat"><span class="selo c-amarelo">${ic('calendar')}</span><div><b>${dinheiro(aPagar)}</b><span>${contasPendentes.length} ${contasPendentes.length === 1 ? 'conta a pagar' : 'contas a pagar'}</span></div></div>
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
          ${finTela.tipo === 'saida' ? `<select name="cat" aria-label="Categoria">${fin().categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select>` : ''}
          <input type="date" name="data" value="${ym === hojeISO().slice(0, 7) ? hojeISO() : ym + '-01'}" aria-label="Data" style="max-width:160px">
          <select name="repetir" data-mudar="fin-repetir" aria-label="Repetição">${Object.entries(REPETE_GASTO).map(([id, n]) => `<option value="${id}" ${finTela.repetir === id ? 'selected' : ''}>${n}</option>`).join('')}</select>
          ${finTela.repetir === 'parcelas' ? `<label class="rotulo-select">Parcelas<input type="number" name="parcelas" min="2" max="72" value="10" style="width:76px"></label>` : ''}
          ${finTela.repetir === 'varios' ? `<label class="rotulo-select">Dias do mês<input type="text" name="dias" placeholder="5, 20" style="width:110px"></label>` : ''}
          <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
        </form>
        ${finTela.repetir === 'parcelas' ? '<p class="dica" style="margin:6px 0 0">Coloque o valor de cada parcela. A primeira cai na data escolhida e as outras no mesmo dia dos meses seguintes.</p>' : ''}
        ${finTela.repetir === 'varios' ? '<p class="dica" style="margin:6px 0 0">Ex.: salário dia 5 e dia 20. Separe os dias por vírgula.</p>' : ''}

        <h3 class="sub-titulo">Lançamentos do mês</h3>
        <div class="lancamentos">
          ${Object.entries(porDia).map(([d, ls]) => `<div class="dia-lanc">${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '')}</div>
            ${ls.map((l) => {
              const c = catGasto(l.cat);
              return `<div class="item">
                <span class="barra-cor" style="background:${l.tipo === 'entrada' ? 'var(--verde)' : c.cor}"></span>
                <span class="txt">${esc(l.desc)}<span class="sub">${l.tipo === 'entrada' ? 'entrada' : esc(c.nome)}${l.conta ? ' · conta fixa' : ''}${l.regra ? ` · ${ic('repeat', 'p')} ${regraDe(l)?.freq === 'parcelas' ? 'parcela' : 'repete'}` : ''}</span></span>
                <b class="${l.tipo === 'entrada' ? 'valor-entrada' : ''}">${l.tipo === 'entrada' ? '+' : '−'} ${dinheiro(l.valor)}</b>
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
              <input class="inline inline-t" value="${esc(c.nome)}" data-digitar="cat-nome" data-id="${c.id}" aria-label="Nome">
              ${c.id !== 'outros' ? `<button class="acao-item apagar" data-acao="cat-del" data-id="${c.id}" title="Apagar">${ic('trash', 'p')}</button>` : ''}</div>`).join('')}
            <form class="form-linha" data-form="cat-nova" style="margin-top:8px"><input type="text" name="nome" placeholder="Nova categoria" maxlength="30" data-precisa><button class="btn sec" type="submit">${ic('plus', 'p')}</button></form>
          </div>` : cats.length ? `<div class="barras-h dinheiro">
            ${cats.map(([id, v]) => {
              const c = catGasto(id);
              return `<div class="barra-h" data-dica="${esc(c.nome)} · ${dinheiro(v)} (${Math.round((v / saidas) * 100)}%)">
                <span class="nome">${esc(c.nome)}</span>
                <span class="trilho"><i style="width:${Math.max(2, (v / maiorCat) * 100)}%;background:${c.cor}"></i></span>
                <span class="valor">${dinheiro(v)}</span></div>`;
            }).join('')}
          </div>` : '<p class="vazio">Os gastos do mês aparecem aqui separados por categoria.</p>'}
        </section>

        <section class="card">
          <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('calendar')}</span> Contas de ${nomeMes(ym).split(' ')[0].toLowerCase()} <a href="#" data-acao="fin-aba" data-a="contas">Ver todas</a></h2>
          ${fin().contas.map((c) => htmlConta(c, ym, true)).join('') || '<p class="vazio">Cadastre aluguel, internet, celular… em Contas fixas.</p>'}
        </section>

        <section class="card">
          <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('repeat')}</span> Repetições e parcelas</h2>
          ${regras.map((r) => `<div class="item">
            <span class="barra-cor" style="background:${r.tipo === 'entrada' ? 'var(--verde)' : catGasto(r.cat).cor}"></span>
            <span class="txt">${esc(r.desc)}<span class="sub">${textoRegra(r)}</span></span>
            <b class="${r.tipo === 'entrada' ? 'valor-entrada' : ''}">${dinheiro(r.valor)}</b>
            <button class="acao-item apagar" data-acao="regra-del" data-id="${r.id}" title="Parar de repetir">${ic('trash', 'p')}</button>
          </div>`).join('') || '<p class="vazio">Ao adicionar um lançamento, escolha "Todo mês", "Toda semana" ou "Parcelado" para ele aparecer aqui.</p>'}
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
      <span class="sub">dia ${c.dia} · ${esc(catGasto(c.cat).nome)}</span></span>
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
      <select name="cat" aria-label="Categoria">${fin().categorias.map((c) => `<option value="${c.id}" ${c.id === 'casa' ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>
      <button class="btn" type="submit">${ic('plus', 'p')} Adicionar conta</button>
    </form>
    ${contas.map((c) => htmlConta(c, ym)).join('') || '<p class="vazio">Nenhuma conta fixa ainda.</p>'}
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
ACOES['fin-tipo'] = (el) => { finTela.tipo = el.dataset.t; desenhar(); $('#gasto-desc')?.focus(); };
ACOES['fin-mes'] = (el) => { const n = Number(el.dataset.n); finTela.mes = n ? somarMes(finTela.mes, n) : hojeISO().slice(0, 7); desenhar(); };
ACOES['fin-cats'] = () => { finTela.editandoCats = !finTela.editandoCats; desenhar(); };

const regraDe = (l) => (fin().recorrentes || []).find((r) => r.id === l.regra);
MUDAR['fin-repetir'] = (el) => {
  finTela.repetir = el.value;

  const f = el.closest('form');
  const desc = f.desc.value, valor = f.valor.value, data = f.data.value;
  desenhar();
  const n = $('form[data-form="gasto-novo"]');
  n.desc.value = desc; n.valor.value = valor; n.data.value = data;
};

FORMS['gasto-novo'] = (d) => {
  const valor = valorNumero(d.valor);
  if (!valor) { avisar('Coloque o valor.'); return; }
  const base = { desc: d.desc, valor, tipo: finTela.tipo, cat: finTela.tipo === 'entrada' ? '' : d.cat || 'outros' };
  const data = d.data || hojeISO();
  const freq = d.repetir || '';
  if (!freq) {
    fin().lancamentos.push({ id: novoId(), ...base, data });
  } else {
    const r = { id: novoId(), ...base, freq, inicio: data, pulados: [] };
    if (freq === 'parcelas') r.parcelas = Math.min(72, Math.max(2, Number(d.parcelas) || 2));
    if (freq === 'varios') {
      r.dias = [...new Set((d.dias || '').split(/[,; ]+/).map(Number).filter((x) => x >= 1 && x <= 31))].sort((a, b) => a - b);
      if (r.dias.length < 1) { avisar('Coloque os dias do mês, por exemplo: 5, 20.'); return; }
      r.inicio = data.slice(0, 8) + '01';
    }
    fin().recorrentes = fin().recorrentes || [];
    fin().recorrentes.push(r);
    avisar(freq === 'parcelas' ? `Parcelado em ${r.parcelas}x de ${dinheiro(valor)} (total ${dinheiro(valor * r.parcelas)}).` : `Vai repetir ${textoRegra(r)}.`);
  }
  salvar(); desenhar();
  $('#gasto-desc')?.focus();
};

ACOES['regra-del'] = (el) => {
  const r = fin().recorrentes.find((x) => x.id === el.dataset.id);
  removerComDesfazer(fin().recorrentes, el.dataset.id, r?.freq === 'parcelas' ? 'Parcelamento' : 'Repetição');
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
  return fin().contas.filter((c) => !c.pagas?.[ym]).map((c) => ({ titulo: `Conta: ${c.nome} · ${dinheiro(c.valor)}`, data: vencimento(c, ym), cor: '#f7c56b' }));
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
}
