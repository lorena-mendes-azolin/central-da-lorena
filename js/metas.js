const textoPrazo = (m) => (m.prazoMes ? mesAno(m.prazo) : dataCurta(m.prazo));
const guardadoMeta = (m) => (m.depositos || []).reduce((s, d) => s + d.valor, 0);
const alvoMeta = (m) => valorNumero(m.valorAlvo);

function progressoMeta(m) {
  if (m.etapas.length) return Math.round((m.etapas.filter((e) => e.feito).length / m.etapas.length) * 100);
  if (alvoMeta(m)) return Math.min(100, Math.round((guardadoMeta(m) / alvoMeta(m)) * 100));
  return 0;
}

function htmlMetas(l) {
  return `
  ${htmlCabLista(l)}
  <div class="grade-cards">
    ${l.metas.map((m) => {
      const pct = progressoMeta(m);
      const capa = (m.anexos || []).find((a) => a.tipo === 'imagem') || null;
      return `<a class="card cartao-materia" href="#lista-${l.id}--${m.id}" ${ordem(l.id + '|metas', m.id, true)} data-pegar>
        ${capa ? `<img class="capa" src="${capa.url}" alt="">` : ''}
        <div class="cm-topo"><b>${esc(m.titulo)}</b>${pct === 100 ? '<span class="status-materia st-m-concluida">Conquistada</span>' : ''}</div>
        <div class="cm-prog"><span>${pct}%</span><span class="prog"><i style="width:${pct}%"></i></span></div>
        <div class="cm-prox">${m.prazo ? `${ic('calendar', 'p')} até ${textoPrazo(m)} · ${quandoFalta(m.prazo).toLowerCase()}` : `<span style="color:var(--fraco)">Sem prazo</span>`}
          · ${m.etapas.length} ${m.etapas.length === 1 ? 'etapa' : 'etapas'}</div>
        ${alvoMeta(m) ? `<div class="cm-extra"><span>${ic('money', 'p')} ${dinheiro(guardadoMeta(m))} de ${dinheiro(alvoMeta(m))}</span></div>` : ''}
      </a>`;
    }).join('')}
    <form class="card cartao-novo" data-form="meta-nova" data-lista="${l.id}">
      <span class="selo c-verde">${ic('target')}</span>
      <input type="text" name="titulo" placeholder="Nome da meta (opcional)" maxlength="80" aria-label="Meta">
      <button class="btn" type="submit">Criar meta</button>
    </form>
  </div>
  ${!l.metas.length ? '<p class="dica">Crie uma meta e clique nela para descrever como você quer que seja, colocar imagens, prazo e as etapas para chegar lá.</p>' : ''}`;
}

function paginaMeta(l, idMeta) {
  const m = l.metas.find((x) => x.id === idMeta);
  if (!m) return null;
  return { titulo: `${l.nome} › ${m.titulo}`, nomeMenu: 'lista-' + l.id, desenhar: () => htmlMeta(l, m) };
}

function htmlMeta(l, m) {
  const ref = `${l.id}/${m.id}`;
  const pct = progressoMeta(m);
  return `
  ${htmlVoltar(l)}
  <div class="materia-cab">
    <div class="textos">
      <input class="titulo-edit" value="${esc(m.titulo)}" data-digitar="campo" data-ref="${ref}" data-campo="titulo" aria-label="Meta" maxlength="80">
      <div class="meta-info">
        <label>Prazo <input type="date" value="${m.prazo}" data-mudar="campo" data-ref="${ref}" data-campo="prazo" data-redesenhar="1" data-mes-ok="1" data-campo-mes="prazoMes" data-so-mes="${m.prazoMes ? 1 : 0}"></label>
        ${m.prazo ? `<span>${m.prazoMes ? 'até o fim do mês · ' : ''}${quandoFalta(m.prazo)}</span>` : ''}
      </div>
    </div>
    <button class="btn-mini" data-acao="meta-del" data-lista="${l.id}" data-id="${m.id}">${ic('trash', 'p')} Excluir meta</button>
  </div>

  <div class="progresso-lista"><span>Progresso</span><div class="prog"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>

  <div class="meta-layout">
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('note')}</span> Como eu quero que seja</h2>
      ${htmlEditor(ref, 'descricao', m.descricao, 'Descreva a sua meta…')}
      <h3 class="sub-titulo">${ic('image', 'p')} Links e imagens</h3>
      ${htmlAnexos(m, ref)}
    </section>

    <div style="display:grid;gap:16px;align-content:start">
    ${htmlDinheiroMeta(m, ref)}
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('check')}</span> Etapas <small>${m.etapas.filter((e) => e.feito).length}/${m.etapas.length}</small></h2>
      <div class="lista-rolavel" style="max-height:320px">
      ${m.etapas.map((e) => `<div class="item ${e.feito ? 'feito' : ''}" ${ordem(ref + '|etapas', e.id)}>
        ${alca()}
        <button class="check ${e.feito ? 'on' : ''}" data-acao="etapa-check" data-ref="${ref}/etapa/${e.id}" aria-label="Concluir">${e.feito ? ic('check') : ''}</button>
        <input class="inline inline-t txt" value="${esc(e.titulo)}" data-digitar="campo" data-ref="${ref}/etapa/${e.id}" data-campo="titulo" aria-label="Etapa">
        <button class="acao-item apagar" data-acao="etapa-del" data-ref="${ref}" data-id="${e.id}" title="Apagar etapa">${ic('trash', 'p')}</button>
      </div>`).join('') || '<p class="vazio">Divida a meta em passos menores.</p>'}
      </div>
      <form class="form-linha" data-form="etapa-nova" data-ref="${ref}" style="margin-top:10px">
        <input type="text" name="titulo" id="etapa-titulo" placeholder="Nova etapa" maxlength="100" data-precisa>
        <button class="btn" type="submit">${ic('plus', 'p')}</button>
      </form>
    </section>
    </div>
  </div>`;
}

function htmlDinheiroMeta(m, ref) {
  const alvo = alvoMeta(m);
  const guardado = guardadoMeta(m);
  const pct = alvo ? Math.min(100, (guardado / alvo) * 100) : 0;
  return `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('money')}</span> Dinheiro guardado</h2>
    <label class="campo">Quanto precisa juntar (opcional)
      <input type="text" inputmode="decimal" value="${esc(m.valorAlvo || '')}" placeholder="R$" data-mudar="campo" data-ref="${ref}" data-campo="valorAlvo" data-redesenhar="1"></label>
    ${alvo ? `<div class="dinheiro-meta">
      <b>${dinheiro(guardado)}</b><span>de ${dinheiro(alvo)} · faltam ${dinheiro(Math.max(0, alvo - guardado))}</span>
      <div class="prog"><i style="width:${pct}%;background:var(--amarelo)"></i></div>
    </div>
    <form class="form-linha" data-form="meta-deposito" data-ref="${ref}" style="margin-top:10px">
      <input type="text" name="valor" inputmode="decimal" placeholder="R$" data-precisa style="flex:1 1 100px" aria-label="Valor">
      <button class="btn" type="submit" name="op" value="mais">${ic('plus', 'p')} Guardar</button>
      <button class="btn sec" type="submit" name="op" value="menos" data-acao="meta-tirar">Tirar</button>
    </form>
    ${(m.depositos || []).length ? `<details class="historico"><summary>Histórico (${m.depositos.length})</summary>
      ${[...m.depositos].reverse().map((d) => `<div class="item"><span class="txt">${dataCurta(d.data)}</span>
        <b class="${d.valor >= 0 ? 'valor-entrada' : ''}">${d.valor >= 0 ? '+' : '−'} ${dinheiro(Math.abs(d.valor))}</b>
        <button class="acao-item apagar" data-acao="deposito-del" data-ref="${ref}" data-id="${d.id}" title="Apagar">${ic('trash', 'p')}</button></div>`).join('')}
    </details>` : ''}` : '<p class="dica">Coloque o valor para acompanhar quanto já juntou, como "Comprar minha casa – R$ X de R$ Y".</p>'}
  </section>`;
}

let tirarDinheiro = false;
ACOES['meta-tirar'] = (el) => {
  const campo = el.closest('form').querySelector('[name=valor]');
  if (!campo.value.trim()) return campo.focus();
  tirarDinheiro = true;
  el.closest('form').requestSubmit();
};
FORMS['meta-deposito'] = (d, form) => {
  const m = acharRef(form.dataset.ref);
  const v = valorNumero(d.valor);
  if (!v) { tirarDinheiro = false; return; }
  m.depositos = m.depositos || [];
  m.depositos.push({ id: novoId(), data: hojeISO(), valor: tirarDinheiro ? -v : v });
  avisar(tirarDinheiro ? `${dinheiro(v)} retirados.` : `${dinheiro(v)} guardados!`);
  if (!tirarDinheiro && alvoMeta(m) && guardadoMeta(m) >= alvoMeta(m)) { tocarSom(true); avisar('Você juntou todo o valor da meta!'); }
  tirarDinheiro = false;
  salvar(); desenhar();
};
ACOES['deposito-del'] = (el) => removerComDesfazer(acharRef(el.dataset.ref).depositos, el.dataset.id, 'Registro');

FORMS['meta-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  const m = { id: novoId(), titulo: d.titulo || 'Nova meta', descricao: '', prazo: '', etapas: [], anexos: [], criado: hojeISO() };
  l.metas.push(m);
  salvar(); desenhar();
  avisar('Meta criada. Clique nela quando quiser descrever, pôr prazo e etapas.');
};

ACOES['meta-del'] = (el) => {
  const l = acharLista(el.dataset.lista);
  location.hash = 'lista-' + l.id;
  removerComDesfazer(l.metas, el.dataset.id, 'Meta');
};

FORMS['etapa-nova'] = (d, form) => {
  acharRef(form.dataset.ref).etapas.push({ id: novoId(), titulo: d.titulo, feito: false });
  salvar(); desenhar();
  $('#etapa-titulo')?.focus();
};

ACOES['etapa-check'] = (el) => {
  const e = acharRef(el.dataset.ref);
  e.feito = !e.feito;
  e.feitoEm = e.feito ? hojeISO() : '';
  salvar(); desenhar();
  if (e.feito) tocarSom(true);
};

ACOES['etapa-del'] = (el) => removerComDesfazer(acharRef(el.dataset.ref).etapas, el.dataset.id, 'Etapa');
