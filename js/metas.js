// =========================================================
// metas.js — listas de METAS
// Cada meta tem uma página só dela: descrição completa (com
// links e imagens), prazo e etapas. O progresso vem das etapas.
// =========================================================

function progressoMeta(m) {
  return m.etapas.length ? Math.round((m.etapas.filter((e) => e.feito).length / m.etapas.length) * 100) : 0;
}

// ---------- Página da lista (todas as metas) ----------
function htmlMetas(l) {
  return `
  ${htmlCabLista(l)}
  <div class="grade-cards">
    ${l.metas.map((m) => {
      const pct = progressoMeta(m);
      const capa = (m.anexos || []).find((a) => a.tipo === 'imagem') || null;
      return `<a class="card cartao-materia" href="#lista-${l.id}--${m.id}">
        ${capa ? `<img class="capa" src="${capa.url}" alt="">` : ''}
        <div class="cm-topo"><b>${esc(m.titulo)}</b>${pct === 100 ? '<span class="status-materia st-m-concluida">Conquistada</span>' : ''}</div>
        <div class="cm-prog"><span>${pct}%</span><span class="prog"><i style="width:${pct}%"></i></span></div>
        <div class="cm-prox">${m.prazo ? `${ic('calendar', 'p')} até ${dataCurta(m.prazo)} · ${quandoFalta(m.prazo).toLowerCase()}` : `<span style="color:var(--fraco)">Sem prazo</span>`}
          · ${m.etapas.length} ${m.etapas.length === 1 ? 'etapa' : 'etapas'}</div>
      </a>`;
    }).join('')}
    <form class="card cartao-novo" data-form="meta-nova" data-lista="${l.id}">
      <span class="selo c-verde">${ic('target')}</span>
      <input type="text" name="titulo" placeholder="Nova meta (ex.: Comprar minha casa)" maxlength="80" required aria-label="Meta">
      <button class="btn" type="submit">Criar meta</button>
    </form>
  </div>
  ${!l.metas.length ? '<p class="dica">Crie uma meta e clique nela para descrever como você quer que seja, colocar imagens, prazo e as etapas para chegar lá.</p>' : ''}`;
}

// ---------- Página de dentro de uma meta ----------
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
        <label>Prazo <input type="date" value="${m.prazo}" data-mudar="campo" data-ref="${ref}" data-campo="prazo" data-redesenhar="1"></label>
        ${m.prazo ? `<span>${quandoFalta(m.prazo)}</span>` : ''}
      </div>
    </div>
    <button class="btn-mini" data-acao="meta-del" data-lista="${l.id}" data-id="${m.id}">${ic('trash', 'p')} Excluir meta</button>
  </div>

  <div class="progresso-lista"><span>Progresso</span><div class="prog"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>

  <div class="meta-layout">
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('note')}</span> Como eu quero que seja</h2>
      ${htmlEditor(ref, 'descricao', m.descricao, 'Descreva a sua meta com detalhes: como vai ser, por que ela importa, quanto custa…')}
      <h3 class="sub-titulo">${ic('image', 'p')} Links e imagens</h3>
      ${htmlAnexos(m, ref)}
    </section>

    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('check')}</span> Etapas <small>${m.etapas.filter((e) => e.feito).length}/${m.etapas.length}</small></h2>
      ${m.etapas.map((e) => `<div class="item ${e.feito ? 'feito' : ''}">
        <button class="check ${e.feito ? 'on' : ''}" data-acao="etapa-check" data-ref="${ref}/etapa/${e.id}" aria-label="Concluir">${e.feito ? ic('check') : ''}</button>
        <input class="inline inline-t txt" value="${esc(e.titulo)}" data-digitar="campo" data-ref="${ref}/etapa/${e.id}" data-campo="titulo" aria-label="Etapa">
        <button class="acao-item apagar" data-acao="etapa-del" data-ref="${ref}" data-id="${e.id}" title="Apagar etapa">${ic('trash', 'p')}</button>
      </div>`).join('') || '<p class="vazio">Divida a meta em passos menores.</p>'}
      <form class="form-linha" data-form="etapa-nova" data-ref="${ref}" style="margin-top:10px">
        <input type="text" name="titulo" id="etapa-titulo" placeholder="Nova etapa" maxlength="100" required>
        <button class="btn" type="submit">${ic('plus', 'p')}</button>
      </form>
    </section>
  </div>`;
}

// ---------- Ações ----------
FORMS['meta-nova'] = (d, form) => {
  const l = acharLista(form.dataset.lista);
  const m = { id: novoId(), titulo: d.titulo, descricao: '', prazo: '', etapas: [], anexos: [], criado: hojeISO() };
  l.metas.push(m);
  salvar();
  location.hash = `lista-${l.id}--${m.id}`;
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
  salvar(); desenhar();
  if (e.feito) tocarSom(true);
};

ACOES['etapa-del'] = (el) => removerComDesfazer(acharRef(el.dataset.ref).etapas, el.dataset.id, 'Etapa');
