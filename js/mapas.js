// Mapas mentais (aba "Mapas" dos Flashcards).
// Cada mapa guarda as bolhas numa lista simples (cada uma sabe quem é o "pai"), e não numa árvore aninhada:
// assim a mescla da nuvem junta item por item quando PC e celular editam o mesmo mapa.
// m = { id, titulo, ref, criado, nos: [{ id, pai, texto, tipo, nota, recolhido }] } — a bolha sem pai é o centro.

const TIPOS_NO = {
  topico: { nome: 'Tópico', icone: '', vazio: 'Anotações (opcional)…' },
  resumo: { nome: 'Resumo', icone: 'note', vazio: 'Escreva o resumo aqui…' },
  curiosidade: { nome: 'Curiosidade', icone: 'sparkle', vazio: 'Conte a curiosidade…' },
  exemplo: { nome: 'Exemplo', icone: 'target', vazio: 'Descreva o exemplo…' },
};
const CORES_RAMO = ['#8f7bff', '#5fd6a4', '#f59ad8', '#6aaeff', '#f7c56b', '#ff7a8f', '#62c9f5'];
const mapaTela = { aberto: null, sel: null, criando: false };

function mapas() {
  estado.flashcards = estado.flashcards || { baralhos: [] };
  estado.flashcards.mapas = estado.flashcards.mapas || [];
  return estado.flashcards.mapas;
}
const acharMapa = (id) => mapas().find((m) => m.id === id);
const raizMapa = (m) => m.nos.find((n) => !n.pai);
const filhosNo = (m, id) => m.nos.filter((n) => n.pai === id);
function descendentes(m, id) {
  const saida = [];
  const pilha = [id];
  while (pilha.length) {
    const p = pilha.pop();
    m.nos.forEach((n) => { if (n.pai === p) { saida.push(n); pilha.push(n.id); } });
  }
  return saida;
}
function mapaAtual() {
  const m = acharMapa(mapaTela.aberto);
  if (!m) return null;
  if (!m.nos.find((n) => !n.pai)) m.nos.unshift({ id: novoId(), pai: '', texto: m.titulo || 'Mapa', tipo: 'topico', nota: '' });
  return m;
}
function noSelecionado(m) {
  return m.nos.find((n) => n.id === mapaTela.sel) || raizMapa(m);
}
function temTextoNota(html) {
  return !!String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || /<img/i.test(html || '');
}

// ---------- Tela: lista de mapas ----------
function htmlMapas() {
  const m = mapaAtual();
  if (m) return htmlMapaAberto(m);
  mapaTela.aberto = null;
  const lista = mapas();
  const grupos = todasMaterias().map((g) => ({ nome: g.lista.nome, itens: lista.filter((x) => x.ref?.startsWith(g.lista.id + '/') && acharRef(x.ref)) }))
    .filter((g) => g.itens.length);
  const soltos = lista.filter((x) => !x.ref || !acharRef(x.ref));
  if (soltos.length) grupos.push({ nome: grupos.length ? 'Outros' : 'Seus mapas', itens: soltos });

  return `
  <div class="cab-pagina">
    <div><h1>Mapas mentais</h1><p>Organize uma aula ou matéria em temas, com resumos, curiosidades e exemplos.</p></div>
    <div class="cab-acoes">${htmlAbasFlash()}<button class="btn" data-acao="mapa-novo">${ic('plus', 'p')} Novo mapa</button></div>
  </div>

  ${mapaTela.criando ? `<form class="card form-linha" data-form="mapa-criar" style="margin-bottom:16px">
    <label class="campo" style="flex:2 1 220px">Matéria ou curso<select name="ref">${opcoesMaterias()}</select></label>
    <label class="campo" style="flex:2 1 220px">Título central<input type="text" name="titulo" id="mapa-titulo-novo" maxlength="80" placeholder="Usa o nome da matéria se ficar vazio"></label>
    <button class="btn" type="submit" style="align-self:end">Criar</button>
    <button class="btn sec" type="button" data-acao="mapa-novo" style="align-self:end">Cancelar</button>
  </form>` : ''}

  ${!lista.length ? `<section class="card vazio-grande">
    <span class="selo c-violeta">${ic('board')}</span>
    <h2>Nenhum mapa ainda</h2>
    <p class="vazio">Coloque o assunto no centro, os temas das aulas em volta e, dentro de cada tema, resumos, curiosidades e exemplos.</p>
    <button class="btn" data-acao="mapa-novo">${ic('plus', 'p')} Criar o primeiro mapa</button>
  </section>` : grupos.map((g) => `<section class="card mapas-grupo">
    <h2 class="card-titulo">${esc(g.nome)} <small>${g.itens.length}</small></h2>
    <div class="mapas-grade">${g.itens.map((x) => {
      const temas = filhosNo(x, raizMapa(x)?.id).length;
      const itens = Math.max(0, x.nos.length - 1);
      return `<button class="baralho" data-acao="mapa-abrir" data-id="${x.id}">
        <span class="selo mini c-violeta">${ic('board')}</span>
        <span class="meio"><b>${esc(x.titulo || 'Sem título')}</b><small>${temas} ${temas === 1 ? 'tema' : 'temas'} · ${itens} ${itens === 1 ? 'item' : 'itens'}</small></span>
      </button>`;
    }).join('')}</div>
  </section>`).join('')}`;
}

// ---------- Tela: mapa aberto ----------
function htmlMapaAberto(m) {
  const raiz = raizMapa(m);
  const sel = noSelecionado(m);
  mapaTela.sel = sel.id;
  const temRecolhido = filhosNo(m, raiz.id).some((n) => n.recolhido);
  return `<a class="voltar" href="#flashcards" data-acao="mapa-fechar">${ic('left', 'p')} Voltar aos mapas</a>
  <div class="barra-lista mapa-barra">
    <label class="rotulo-select">Matéria
      <select data-mudar="mapa-ref" data-id="${m.id}">${opcoesMaterias(m.ref)}</select></label>
    <span class="espaco"></span>
    ${filhosNo(m, raiz.id).some((n) => filhosNo(m, n.id).length) ? `<button class="btn-mini" data-acao="mapa-recolher-tudo">${temRecolhido ? 'Abrir todos os temas' : 'Recolher os temas'}</button>` : ''}
    <button class="acao-item apagar" data-acao="mapa-del" data-id="${m.id}" title="Excluir mapa">${ic('trash', 'p')}</button>
  </div>
  <div class="mapa-layout">
    <section class="card mapa-area">
      <div class="mapa-arvore">${htmlRamo(m, raiz, 0, '')}</div>
    </section>
    ${htmlPainelNo(m, sel)}
  </div>
  <p class="dica mapa-dica">Clique numa bolha para editar. Atalhos: <kbd>Tab</kbd> item dentro · <kbd>Enter</kbd> item ao lado · <kbd>Delete</kbd> apagar · setas para andar.</p>`;
}

function htmlRamo(m, no, nivel, cor) {
  const filhos = filhosNo(m, no.id);
  const tipo = TIPOS_NO[no.tipo] || TIPOS_NO.topico;
  const escondidos = no.recolhido ? descendentes(m, no.id).length : 0;
  return `<div class="mm-ramo nivel-${Math.min(nivel, 3)}" ${cor ? `style="--cor:${cor}"` : ''}>
    <div class="mm-no-caixa">
      <button class="mm-no tipo-${TIPOS_NO[no.tipo] ? no.tipo : 'topico'} ${no.id === mapaTela.sel ? 'sel' : ''}" data-acao="mapa-sel" data-id="${no.id}" ${nivel ? `title="${tipo.nome}"` : ''}>
        ${nivel && tipo.icone ? ic(tipo.icone, 'p') : ''}<span>${no.texto ? esc(no.texto) : '<i class="mm-sem">sem título</i>'}</span>
        ${temTextoNota(no.nota) && nivel ? '<b class="mm-tem-nota" title="Tem anotação"></b>' : ''}
      </button>
      ${filhos.length && nivel ? `<button class="mm-recolher" data-acao="mapa-recolher" data-id="${no.id}" title="${no.recolhido ? 'Mostrar' : 'Esconder'} o que tem dentro">${no.recolhido ? `+${escondidos}` : '−'}</button>` : ''}
    </div>
    ${filhos.length && !no.recolhido ? `<div class="mm-filhos">${filhos.map((f, i) => htmlRamo(m, f, nivel + 1, nivel === 0 ? CORES_RAMO[i % CORES_RAMO.length] : cor)).join('')}</div>` : ''}
  </div>`;
}

function htmlPainelNo(m, no) {
  const eRaiz = !no.pai;
  const tipo = TIPOS_NO[no.tipo] ? no.tipo : 'topico';
  const editor = htmlEditor(`${m.id}/${no.id}`, 'nota', no.nota, eRaiz ? 'Anotações gerais do mapa (opcional)…' : TIPOS_NO[tipo].vazio)
    .replace('data-digitar="editor"', 'data-digitar="mapa-nota"');
  return `<aside class="card mapa-painel">
    ${eRaiz ? '<span class="rotulo-mini">Título central</span>'
      : `<div class="mm-tipos" role="group" aria-label="Tipo do item">${Object.entries(TIPOS_NO).map(([k, t]) =>
        `<button class="${k === tipo ? 'ativo' : ''}" data-acao="mapa-tipo" data-t="${k}">${t.icone ? ic(t.icone, 'p') : ''}${t.nome}</button>`).join('')}</div>`}
    <textarea class="titulo-edit pequeno titulo-quebra mm-titulo" rows="1" maxlength="120" data-digitar="mapa-texto" data-id="${no.id}"
      placeholder="${eRaiz ? 'Assunto do mapa' : 'Título curto'}" aria-label="Título do item">${esc(no.texto || '')}</textarea>
    <div class="mm-nota">${editor}</div>
    <div class="mm-botoes">
      <button class="btn sec" data-acao="mapa-filho">${ic('plus', 'p')} ${eRaiz ? 'Novo tema' : 'Item dentro'}</button>
      ${eRaiz ? '' : `<button class="btn sec" data-acao="mapa-irmao">${ic('plus', 'p')} Item ao lado</button>
      <button class="acao-item apagar" data-acao="mapa-no-del" title="Apagar este item">${ic('trash', 'p')}</button>`}
    </div>
  </aside>`;
}

// Redesenha sem perder a rolagem do mapa e devolve o foco para a bolha (para os atalhos funcionarem)
function redesenharMapa(focarTitulo) {
  const area = $('.mapa-area');
  const x = area ? area.scrollLeft : 0;
  const y = area ? area.scrollTop : 0;
  desenhar();
  const nova = $('.mapa-area');
  if (nova) { nova.scrollLeft = x; nova.scrollTop = y; }
  const sel = $('.mm-no.sel');
  if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (focarTitulo) {
    const t = $('.mm-titulo');
    if (t) { t.focus(); t.select(); }
  } else if (sel) sel.focus({ preventScroll: true });
}

function novoNo(m, pai, depoisDe) {
  const n = { id: novoId(), pai, texto: '', tipo: 'topico', nota: '' };
  const i = depoisDe ? m.nos.findIndex((x) => x.id === depoisDe.id) : -1;
  if (i >= 0) {
    // entra logo depois do irmão (e de tudo que está dentro dele)
    const dentro = new Set(descendentes(m, depoisDe.id).map((x) => x.id));
    let fim = i;
    m.nos.forEach((x, k) => { if (dentro.has(x.id)) fim = Math.max(fim, k); });
    m.nos.splice(fim + 1, 0, n);
  } else m.nos.push(n);
  mapaTela.sel = n.id;
  salvar();
  redesenharMapa(true);
}

function apagarNo(m, no) {
  if (!no.pai) return;
  const ids = new Set([no.id, ...descendentes(m, no.id).map((x) => x.id)]);
  const tirados = m.nos.map((x, i) => ({ x, i })).filter((p) => ids.has(p.x.id));
  const irmaos = filhosNo(m, no.pai);
  const pos = irmaos.findIndex((x) => x.id === no.id);
  m.nos = m.nos.filter((x) => !ids.has(x.id));
  mapaTela.sel = (irmaos[pos + 1] || irmaos[pos - 1] || { id: no.pai }).id;
  salvar();
  redesenharMapa();
  const extra = tirados.length - 1;
  avisar(`Item apagado${extra ? ` (com ${extra} ${extra === 1 ? 'item' : 'itens'} dentro)` : ''}`, () => {
    const atual = acharMapa(m.id);
    if (!atual) return;
    tirados.forEach((p) => atual.nos.splice(Math.min(p.i, atual.nos.length), 0, p.x));
    mapaTela.sel = no.id;
    salvar(); redesenharMapa();
  });
}

// ---------- Ações ----------
ACOES['mapa-novo'] = () => { mapaTela.criando = !mapaTela.criando; desenhar(); $('#mapa-titulo-novo')?.focus(); };
FORMS['mapa-criar'] = (d) => {
  const titulo = d.titulo || nomeMateria(d.ref) || 'Novo mapa';
  const raiz = { id: novoId(), pai: '', texto: titulo, tipo: 'topico', nota: '' };
  const m = { id: novoId(), titulo, ref: d.ref || '', criado: hojeISO(), nos: [raiz] };
  mapas().push(m);
  mapaTela.criando = false;
  mapaTela.aberto = m.id;
  mapaTela.sel = raiz.id;
  salvar(); window.scrollTo(0, 0); redesenharMapa();
};
ACOES['mapa-abrir'] = (el) => { mapaTela.aberto = el.dataset.id; mapaTela.sel = null; window.scrollTo(0, 0); redesenharMapa(); };
ACOES['mapa-fechar'] = () => { mapaTela.aberto = null; mapaTela.sel = null; desenhar(); window.scrollTo(0, 0); };
ACOES['mapa-del'] = (el) => { mapaTela.aberto = null; removerComDesfazer(mapas(), el.dataset.id, 'Mapa'); };
MUDAR['mapa-ref'] = (el) => { const m = acharMapa(el.dataset.id); if (m) { m.ref = el.value; salvar(); } };

ACOES['mapa-sel'] = (el) => {
  const m = mapaAtual();
  if (!m) return;
  if (mapaTela.sel === el.dataset.id) { const t = $('.mm-titulo'); if (t) { t.focus(); t.select(); } return; } // 2º clique: editar
  mapaTela.sel = el.dataset.id;
  redesenharMapa();
};
ACOES['mapa-filho'] = () => {
  const m = mapaAtual();
  if (!m) return;
  const no = noSelecionado(m);
  no.recolhido = false;
  novoNo(m, no.id);
};
ACOES['mapa-irmao'] = () => {
  const m = mapaAtual();
  if (!m) return;
  const no = noSelecionado(m);
  if (!no.pai) { novoNo(m, no.id); return; }
  novoNo(m, no.pai, no);
};
ACOES['mapa-no-del'] = () => { const m = mapaAtual(); if (m) apagarNo(m, noSelecionado(m)); };
ACOES['mapa-tipo'] = (el) => {
  const m = mapaAtual();
  if (!m) return;
  noSelecionado(m).tipo = el.dataset.t;
  salvar(); redesenharMapa();
};
ACOES['mapa-recolher'] = (el) => {
  const m = mapaAtual();
  const no = m?.nos.find((x) => x.id === el.dataset.id);
  if (!no) return;
  no.recolhido = !no.recolhido;
  if (no.recolhido && descendentes(m, no.id).some((x) => x.id === mapaTela.sel)) mapaTela.sel = no.id;
  salvar(); redesenharMapa();
};
ACOES['mapa-recolher-tudo'] = () => {
  const m = mapaAtual();
  if (!m) return;
  const temas = filhosNo(m, raizMapa(m).id).filter((n) => filhosNo(m, n.id).length);
  const recolher = !temas.some((n) => n.recolhido);
  if (recolher) {
    temas.forEach((n) => { n.recolhido = true; });
    const s = m.nos.find((x) => x.id === mapaTela.sel);
    const tema = temas.find((t) => s && descendentes(m, t.id).some((x) => x.id === s.id));
    if (tema) mapaTela.sel = tema.id;
  } else m.nos.forEach((n) => { n.recolhido = false; });
  salvar(); redesenharMapa();
};

DIGITAR['mapa-texto'] = (el) => {
  const m = mapaAtual();
  const no = m?.nos.find((x) => x.id === el.dataset.id);
  if (!no) return;
  no.texto = el.value.replace(/\n/g, ' ');
  if (!no.pai) m.titulo = no.texto;
  const span = $(`.mm-no[data-id="${no.id}"] span`);
  if (span) span.innerHTML = no.texto ? esc(no.texto) : '<i class="mm-sem">sem título</i>';
  salvar();
};
DIGITAR['mapa-nota'] = (el) => {
  const [idMapa, idNo] = el.dataset.ref.split('/');
  const no = acharMapa(idMapa)?.nos.find((x) => x.id === idNo);
  if (!no) return;
  if (el.querySelector('a[href]')) marcarLinksEditor(el);
  no.nota = el.innerHTML;
  const btn = $(`.mm-no[data-id="${idNo}"]`);
  if (btn && no.pai) {
    const tem = temTextoNota(no.nota);
    const ponto = btn.querySelector('.mm-tem-nota');
    if (tem && !ponto) btn.insertAdjacentHTML('beforeend', '<b class="mm-tem-nota" title="Tem anotação"></b>');
    if (!tem && ponto) ponto.remove();
  }
  salvar();
};

// Atalhos de teclado: só valem com o foco no mapa (não atrapalham quem está digitando)
document.addEventListener('keydown', (e) => {
  if (location.hash !== '#flashcards' || flashTela.aba !== 'mapas' || !mapaTela.aberto) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const alvo = e.target;
  if (alvo.closest('input, textarea, select, [contenteditable="true"]')) {
    if ((e.key === 'Escape' || e.key === 'Enter') && alvo.matches('.mm-titulo')) {
      // Enter/Esc terminam a edição e o foco volta para a bolha: aí Enter de novo já cria o próximo item
      setTimeout(() => { alvo.blur(); $('.mm-no.sel')?.focus({ preventScroll: true }); }, 0);
    }
    return;
  }
  if (alvo !== document.body && !alvo.closest('.mapa-area')) return;
  const m = mapaAtual();
  if (!m) return;
  const no = noSelecionado(m);
  const irmaos = no.pai ? filhosNo(m, no.pai) : [no];
  const pos = irmaos.findIndex((x) => x.id === no.id);
  const ir = (n) => { if (n) { mapaTela.sel = n.id; redesenharMapa(); } };
  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ACOES['mapa-filho'](); }
  else if (e.key === 'Enter') { e.preventDefault(); ACOES['mapa-irmao'](); }
  else if (e.key === 'Delete') { e.preventDefault(); apagarNo(m, no); }
  else if (e.key === 'F2') { e.preventDefault(); const t = $('.mm-titulo'); if (t) { t.focus(); t.select(); } }
  else if (e.key === 'ArrowDown') { e.preventDefault(); ir(irmaos[pos + 1]); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ir(irmaos[pos - 1]); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(m.nos.find((x) => x.id === no.pai)); }
  else if (e.key === 'ArrowRight') {
    e.preventDefault();
    const f = filhosNo(m, no.id)[0];
    if (f) { no.recolhido = false; ir(f); }
  }
});
