const INTERVALOS = [0, 1, 2, 4, 8, 16];
const flashTela = { baralho: null, estudo: null, criando: false };

function baralhos() {
  estado.flashcards = estado.flashcards || { baralhos: [] };
  return estado.flashcards.baralhos;
}
const paraRevisar = (b) => b.cards.filter((c) => !c.proxima || c.proxima <= hojeISO());

function todasMaterias() {
  return estado.listas.filter((l) => l.tipo === 'cursos')
    .map((l) => ({ lista: l, materias: l.materias }));
}
function nomeMateria(ref) {
  const m = acharRef(ref);
  return m ? m.nome : '';
}
function opcoesMaterias(atual = '') {
  return `<option value="">Sem matéria (nome livre)</option>
    ${todasMaterias().filter((g) => g.materias.length).map((g) => `<optgroup label="${esc(g.lista.nome)}">
      ${g.materias.map((m) => `<option value="${g.lista.id}/${m.id}" ${atual === `${g.lista.id}/${m.id}` ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}
    </optgroup>`).join('')}`;
}

function htmlBaralhoItem(b) {
  const rev = paraRevisar(b).length;
  return `<button class="baralho ${flashTela.baralho === b.id ? 'ativo' : ''}" data-acao="flash-abrir" data-id="${b.id}">
    <span class="selo mini c-violeta">${ic('layers')}</span>
    <span class="meio"><b>${esc(b.nome)}</b><small>${b.cards.length} ${b.cards.length === 1 ? 'carta' : 'cartas'}</small></span>
    ${rev ? `<em title="Para revisar hoje">${rev}</em>` : ''}
  </button>`;
}

PAGINAS.flashcards = {
  titulo: 'Flashcards',
  desenhar() {
    const lista = baralhos();
    if (flashTela.estudo) return htmlEstudo();
    const b = lista.find((x) => x.id === flashTela.baralho) || lista[0];
    if (b) flashTela.baralho = b.id;
    const totalRev = lista.reduce((s, x) => s + paraRevisar(x).length, 0);

    const grupos = todasMaterias().map((g) => ({ nome: g.lista.nome, itens: lista.filter((x) => x.ref?.startsWith(g.lista.id + '/')) }))
      .filter((g) => g.itens.length);
    const soltos = lista.filter((x) => !x.ref || !acharRef(x.ref));
    if (soltos.length) grupos.push({ nome: 'Outros', itens: soltos });

    return `
    <div class="cab-pagina">
      <div><h1>Flashcards</h1><p>${totalRev ? `${totalRev} ${totalRev === 1 ? 'carta para revisar' : 'cartas para revisar'} hoje.` : 'Crie cartas com pergunta e resposta e revise um pouquinho por dia.'}</p></div>
      <div class="cab-acoes"><button class="btn" data-acao="flash-novo">${ic('plus', 'p')} Novo baralho</button></div>
    </div>

    ${flashTela.criando ? `<form class="card form-linha" data-form="flash-baralho" style="margin-bottom:16px">
      <label class="campo" style="flex:2 1 220px">Matéria ou curso<select name="ref">${opcoesMaterias()}</select></label>
      <label class="campo" style="flex:2 1 220px">Nome do baralho<input type="text" name="nome" id="flash-nome" maxlength="60" placeholder="Usa o nome da matéria se ficar vazio"></label>
      <button class="btn" type="submit" style="align-self:end">Criar</button>
      <button class="btn sec" type="button" data-acao="flash-novo" style="align-self:end">Cancelar</button>
    </form>` : ''}

    ${!lista.length ? `<section class="card vazio-grande">
      <span class="selo c-violeta">${ic('layers')}</span>
      <h2>Nenhum baralho ainda</h2>
      <p class="vazio">Crie um baralho para uma matéria da faculdade, um curso ou qualquer assunto.</p>
      <button class="btn" data-acao="flash-novo">${ic('plus', 'p')} Criar o primeiro baralho</button>
    </section>` : `<div class="flash-layout">
      <aside class="card baralhos">
        ${grupos.map((g) => `<div class="grupo-mini">${esc(g.nome)}</div>${g.itens.map(htmlBaralhoItem).join('')}`).join('')}
      </aside>
      ${b ? htmlBaralho(b) : ''}
    </div>`}`;
  },
};

function htmlBaralho(b) {
  const rev = paraRevisar(b).length;
  return `<section class="card">
    <div class="barra-lista" style="margin-bottom:14px">
      <input class="titulo-edit pequeno" value="${esc(b.nome)}" data-digitar="flash-campo" data-id="${b.id}" data-campo="nome" aria-label="Nome do baralho" maxlength="60">
      <span class="espaco"></span>
      <button class="btn" data-acao="flash-estudar" data-id="${b.id}" ${rev ? '' : 'disabled'}>${ic('play', 'p')} Revisar ${rev ? `(${rev})` : ''}</button>
      <button class="btn sec" data-acao="flash-estudar" data-id="${b.id}" data-todos="1" ${b.cards.length ? '' : 'disabled'}>Estudar todas</button>
      <button class="acao-item apagar" data-acao="flash-del" data-id="${b.id}" title="Excluir baralho">${ic('trash', 'p')}</button>
    </div>
    <div class="linha-materia">
      <label class="rotulo-select">Matéria
        <select data-mudar="flash-ref" data-id="${b.id}">${opcoesMaterias(b.ref)}</select></label>
      ${b.ref && acharRef(b.ref) ? `<a class="btn-mini" href="#lista-${b.ref.replace('/', '--')}">${ic('right', 'p')} Abrir ${esc(nomeMateria(b.ref))}</a>` : ''}
    </div>

    <form class="nova-carta" data-form="flash-carta" data-id="${b.id}">
      <textarea name="frente" id="carta-frente" placeholder="Frente: pergunta" data-precisa rows="2"></textarea>
      <textarea name="verso" placeholder="Verso: resposta" rows="2"></textarea>
      <button class="btn" type="submit">${ic('plus', 'p')} Adicionar carta</button>
    </form>

    <div class="cartas">
      ${b.cards.map((c) => `<div class="carta-linha">
        <textarea data-digitar="carta-campo" data-baralho="${b.id}" data-id="${c.id}" data-campo="frente" rows="2" aria-label="Frente">${esc(c.frente)}</textarea>
        <textarea data-digitar="carta-campo" data-baralho="${b.id}" data-id="${c.id}" data-campo="verso" rows="2" aria-label="Verso">${esc(c.verso)}</textarea>
        <span class="caixa" title="Nível: quanto maior, melhor você sabe">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= (c.caixa || 1) ? 'on' : ''}"></i>`).join('')}</span>
        <button class="acao-item apagar" data-acao="carta-del" data-baralho="${b.id}" data-id="${c.id}" title="Apagar carta">${ic('trash', 'p')}</button>
      </div>`).join('') || '<p class="vazio">Nenhuma carta. Escreva a pergunta e a resposta acima.</p>'}
    </div>
  </section>`;
}

function htmlEstudo() {
  const e = flashTela.estudo;
  const b = baralhos().find((x) => x.id === e.baralho);
  if (!b) { flashTela.estudo = null; return PAGINAS.flashcards.desenhar(); }
  if (!e.fila.length) {
    return `<section class="card estudo fim">
      <span class="selo c-verde">${ic('check')}</span>
      <h2>Revisão concluída</h2>
      <p>${e.acertos} ${e.acertos === 1 ? 'acerto' : 'acertos'} · ${e.erros} ${e.erros === 1 ? 'erro' : 'erros'}</p>
      <button class="btn" data-acao="flash-sair">Voltar ao baralho</button>
    </section>`;
  }
  const c = b.cards.find((x) => x.id === e.fila[0]);
  const feitas = e.total - e.fila.length;
  return `<div class="estudo-topo">
      <button class="btn-mini" data-acao="flash-sair">${ic('left', 'p')} Sair</button>
      <b>${esc(b.nome)}</b>
      <span>${feitas} de ${e.total}</span>
    </div>
    <div class="prog" style="margin-bottom:18px"><i style="width:${(feitas / e.total) * 100}%"></i></div>
    <section class="card estudo ${e.virada ? 'virada' : ''}" data-acao="${e.virada ? '' : 'flash-virar'}">
      <small>${e.virada ? 'Resposta' : 'Pergunta'}</small>
      <div class="frente">${esc(c.frente).replace(/\n/g, '<br>')}</div>
      ${e.virada ? `<div class="verso">${esc(c.verso || '(sem resposta)').replace(/\n/g, '<br>')}</div>` : '<p class="dica">Clique ou aperte espaço para ver a resposta</p>'}
    </section>
    ${e.virada ? `<div class="botoes estudo-botoes">
      <button class="btn perigo" data-acao="flash-resposta" data-ok="0">${ic('x', 'p')} Errei <kbd>1</kbd></button>
      <button class="btn" data-acao="flash-resposta" data-ok="1">${ic('check', 'p')} Acertei <kbd>2</kbd></button>
    </div>` : ''}`;
}

ACOES['flash-novo'] = () => { flashTela.criando = !flashTela.criando; desenhar(); $('#flash-nome')?.focus(); };
ACOES['flash-abrir'] = (el) => { flashTela.baralho = el.dataset.id; desenhar(); };

function criarBaralho(ref, nome) {
  const b = { id: novoId(), nome: nome || nomeMateria(ref) || 'Novo baralho', ref: ref || '', cards: [] };
  baralhos().push(b);
  flashTela.baralho = b.id;
  return b;
}

FORMS['flash-baralho'] = (d) => {
  criarBaralho(d.ref, d.nome);
  flashTela.criando = false;
  salvar(); desenhar();
  $('#carta-frente')?.focus();
};

ACOES['flash-da-materia'] = (el) => {
  const ref = el.dataset.ref;
  const b = baralhos().find((x) => x.ref === ref) || criarBaralho(ref);
  flashTela.baralho = b.id;
  salvar();
  location.hash = 'flashcards';
};

DIGITAR['flash-campo'] = (el) => {
  const b = baralhos().find((x) => x.id === el.dataset.id);
  b[el.dataset.campo] = el.value;
  salvar();
};
MUDAR['flash-ref'] = (el) => {
  const b = baralhos().find((x) => x.id === el.dataset.id);
  b.ref = el.value;
  salvar(); desenhar();
};
ACOES['flash-del'] = (el) => { flashTela.baralho = null; removerComDesfazer(baralhos(), el.dataset.id, 'Baralho'); };

FORMS['flash-carta'] = (d, form) => {
  const b = baralhos().find((x) => x.id === form.dataset.id);
  b.cards.unshift({ id: novoId(), frente: d.frente, verso: d.verso || '', caixa: 1, proxima: '' });
  salvar(); desenhar();
  $('#carta-frente')?.focus();
};
DIGITAR['carta-campo'] = (el) => {
  const c = baralhos().find((x) => x.id === el.dataset.baralho).cards.find((x) => x.id === el.dataset.id);
  c[el.dataset.campo] = el.value;
  salvar();
};
ACOES['carta-del'] = (el) => removerComDesfazer(baralhos().find((x) => x.id === el.dataset.baralho).cards, el.dataset.id, 'Carta');

ACOES['flash-estudar'] = (el) => {
  const b = baralhos().find((x) => x.id === el.dataset.id);
  const cartas = el.dataset.todos ? b.cards : paraRevisar(b);
  const fila = cartas.map((c) => c.id).sort(() => Math.random() - 0.5);
  flashTela.estudo = { baralho: b.id, fila, total: fila.length, virada: false, acertos: 0, erros: 0 };
  desenhar();
};
ACOES['flash-virar'] = () => { if (flashTela.estudo) { flashTela.estudo.virada = true; desenhar(); } };
ACOES['flash-sair'] = () => { flashTela.estudo = null; desenhar(); };

ACOES['flash-resposta'] = (el) => {
  const e = flashTela.estudo;
  const b = baralhos().find((x) => x.id === e.baralho);
  const id = e.fila.shift();
  const c = b.cards.find((x) => x.id === id);
  if (el.dataset.ok === '1') {
    e.acertos++;
    c.caixa = Math.min(5, (c.caixa || 1) + 1);
    c.proxima = somarDias(hojeISO(), INTERVALOS[c.caixa]);
  } else {
    e.erros++;
    c.caixa = 1;
    c.proxima = hojeISO();
    e.fila.push(id);
  }
  e.virada = false;
  salvar(); desenhar();
};

document.addEventListener('keydown', (e) => {
  if (!flashTela.estudo || location.hash !== '#flashcards' || e.target.matches('input, textarea')) return;
  if (e.key === ' ' && !flashTela.estudo.virada) { e.preventDefault(); ACOES['flash-virar'](); }
  if (flashTela.estudo.virada && (e.key === '1' || e.key === '2')) ACOES['flash-resposta']({ dataset: { ok: e.key === '2' ? '1' : '0' } });
});
