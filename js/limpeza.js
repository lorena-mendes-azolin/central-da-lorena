// Espaço no navegador e limpeza guiada.
// O navegador guarda uns 5 milhões de caracteres por site. Tudo também vai para a nuvem;
// isto é só para a cópia local não encher.
const LIMITE_LOCAL = 5_000_000;
const limpTela = { sel: new Set(), paginas: new Set(), diario: '1a', backup: true, ocupado: false };

function espacoUsado() {
  let total = 0;
  try {
    for (let k = 0; k < localStorage.length; k++) {
      const chave = localStorage.key(k);
      total += chave.length + (localStorage.getItem(chave) || '').length;
    }
  } catch { }
  return total;
}
const pctEspaco = () => Math.min(100, Math.round((espacoUsado() / LIMITE_LOCAL) * 100));
const tamanho = (x) => { try { return JSON.stringify(x)?.length || 0; } catch { return 0; } };
function fmtTam(n) {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${Math.round(n / 1000)} KB`;
  return `${(n / 1_000_000).toFixed(1).replace('.', ',')} MB`;
}

function htmlBarraEspaco() {
  const usado = espacoUsado();
  const pct = Math.min(100, Math.round((usado / LIMITE_LOCAL) * 100));
  return `<div class="barra-espaco ${pct >= 80 ? 'cheia' : ''}"><i style="width:${Math.max(pct, 1)}%"></i></div>
    <p class="dica" style="margin:6px 0 12px">${fmtTam(usado)} de uns 5 MB (${pct}%). ${pct >= 80 ? '<b>Está quase cheio.</b> ' : ''}Seus dados também ficam na nuvem; isto é só a cópia guardada neste aparelho.</p>`;
}

function htmlAvisoEspaco() {
  if (pctEspaco() < 80) return '';
  return `<a class="alerta convite" href="#limpeza">${ic('trash')}<span><b>O espaço do navegador está quase cheio.</b> Veja sugestões do que dá para limpar.</span><span class="btn">Liberar espaço</span></a>`;
}

// Gravação local que nunca quebra o resto do site quando o espaço acaba.
let avisouCheio = 0;
function gravarLocalSeguro() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch {
    if (Date.now() - avisouCheio > 60000) {
      avisouCheio = Date.now();
      avisar('O espaço do navegador encheu. Seus dados seguem indo para a nuvem; abra Configurações → Liberar espaço.');
    }
    return false;
  }
}

// ---------- Sugestões ----------
function cortePorMeses(meses) {
  const d = paraData(hojeISO());
  d.setMonth(d.getMonth() - meses);
  return hojeISO(d);
}
function corteDiario() {
  if (limpTela.diario === '6m') return cortePorMeses(6);
  if (limpTela.diario === 'ano') return `${hojeISO().slice(0, 4)}-01-01`;
  return cortePorMeses(12);
}
const nomeCorteDiario = { '6m': 'há mais de 6 meses', '1a': 'há mais de 1 ano', ano: `de antes de ${hojeISO().slice(0, 4)}` };

function imagensEmbutidas() {
  let n = 0, tam = 0;
  const visitar = (obj, chave) => {
    if (chave === 'lixeira' || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach((x) => visitar(x)); return; }
    Object.entries(obj).forEach(([k, v]) => {
      if (typeof v === 'string' && v.includes('data:image')) {
        const achados = v.match(/data:image[^"')\s]+/g) || [];
        n += achados.length; tam += achados.reduce((s, x) => s + x.length, 0);
      } else if (v && typeof v === 'object') visitar(v, k);
    });
  };
  visitar(estado);
  return { n, tam };
}

function itensCompras() {
  return estado.listas.filter((l) => l.tipo === 'compras').flatMap((l) => (l.itens || []).filter((i) => i.comprado).map((i) => ({ l, i })));
}
function itensColecoes() {
  return estado.listas.filter((l) => Array.isArray(l.categorias)).flatMap((l) => l.categorias.flatMap((c) => (c.itens || []).filter((i) => i.feito).map((i) => ({ l, c, i }))));
}
function itensListas() {
  return estado.listas.filter((l) => l.tipo !== 'compras' && !Array.isArray(l.categorias) && Array.isArray(l.itens)).flatMap((l) => l.itens.filter((i) => i.status === 'feito' || i.feito === true).map((i) => ({ l, i })));
}
function tarefasAntigas() {
  const corte = cortePorMeses(6);
  return estado.tarefas.filter((t) => t.feito && (t.feitoEm || t.data || '9999') < corte);
}
function paginasAntigas() {
  const corte = cortePorMeses(6);
  const achadas = [];
  estado.listas.forEach((l) => (l.materias || []).forEach((m) => (m.notas || []).forEach((n) => {
    const quando = (n.editado || n.criado || '').slice(0, 10);
    if (quando && quando < corte) achadas.push({ l, m, n, quando, tam: tamanho(n) });
  })));
  return achadas.sort((a, b) => b.tam - a.tam).slice(0, 30);
}
function diasDiario() {
  const corte = corteDiario();
  return Object.keys(estado.diario || {}).filter((d) => d < corte);
}

function sugestoesLimpeza() {
  const img = imagensEmbutidas();
  const compras = itensCompras();
  const cols = itensColecoes();
  const listas = itensListas();
  const tarefas = tarefasAntigas();
  const dias = diasDiario();
  const lixo = estado.lixeira || [];
  const s = [];
  if (img.n && NUVEM_ATIVA && usuario) s.push({ id: 'imagens', icone: 'image', cor: 'c-verde', titulo: 'Mover imagens para a nuvem', texto: `${img.n} ${img.n === 1 ? 'imagem guardada' : 'imagens guardadas'} dentro do texto. Elas vão para o armazenamento da nuvem e <b>nada é apagado</b>.`, tam: img.tam, seguro: true });
  if (compras.length) s.push({ id: 'compras', icone: 'cart', cor: 'c-azul', titulo: 'Compras já compradas', texto: `${compras.length} ${compras.length === 1 ? 'item marcado' : 'itens marcados'} como comprado, com foto, link e notas.`, tam: tamanho(compras.map((x) => x.i)) });
  if (cols.length) s.push({ id: 'colecoes', icone: 'star', cor: 'c-rosa', titulo: 'Lista das listas: já feitos ou vistos', texto: `${cols.length} ${cols.length === 1 ? 'item' : 'itens'} (receitas feitas, lugares visitados, vídeos vistos…), com capa e imagens.`, tam: tamanho(cols.map((x) => x.i)) });
  if (listas.length) s.push({ id: 'listas', icone: 'check', cor: 'c-violeta', titulo: 'Itens concluídos nas outras listas', texto: `${listas.length} ${listas.length === 1 ? 'item concluído' : 'itens concluídos'}.`, tam: tamanho(listas.map((x) => x.i)) });
  if (tarefas.length) s.push({ id: 'tarefas', icone: 'calendar', cor: 'c-amarelo', titulo: 'Tarefas concluídas há mais de 6 meses', texto: `${tarefas.length} ${tarefas.length === 1 ? 'tarefa' : 'tarefas'} da agenda.`, tam: tamanho(tarefas) });
  s.push({ id: 'diario', icone: 'sparkle', cor: 'c-amarelo', titulo: 'Diário e registros do dia antigos', texto: `${dias.length} ${dias.length === 1 ? 'dia' : 'dias'} ${nomeCorteDiario[limpTela.diario]}: hábitos marcados, água, humor e o texto do diário. Gráficos e sequências desses dias somem.`, tam: tamanho(dias.map((d) => estado.diario[d])), vazio: !dias.length, escolha: true });
  if (lixo.length) s.push({ id: 'lixeira', icone: 'trash', cor: 'c-violeta', titulo: 'Esvaziar a lixeira', texto: `${lixo.length} ${lixo.length === 1 ? 'item apagado' : 'itens apagados'} nos últimos 30 dias.`, tam: tamanho(lixo) });
  return s;
}

PAGINAS.limpeza = {
  titulo: 'Liberar espaço',
  nomeMenu: 'configuracoes',
  desenhar() {
    const sug = sugestoesLimpeza();
    const pags = paginasAntigas();
    [...limpTela.sel].forEach((id) => { if (!sug.some((x) => x.id === id && !x.vazio)) limpTela.sel.delete(id); });
    [...limpTela.paginas].forEach((id) => { if (!pags.some((p) => p.n.id === id)) limpTela.paginas.delete(id); });
    const total = sug.filter((x) => limpTela.sel.has(x.id)).reduce((t, x) => t + x.tam, 0) + pags.filter((p) => limpTela.paginas.has(p.n.id)).reduce((t, p) => t + p.tam, 0);
    const algo = limpTela.sel.size || limpTela.paginas.size;
    const apaga = [...limpTela.sel].some((id) => id !== 'imagens') || limpTela.paginas.size;
    return `
    <a class="voltar" href="#configuracoes">${ic('left', 'p')} Configurações</a>
    <div class="cab-pagina"><div><h1>Liberar espaço</h1><p>Escolha o que limpar. O tamanho mostra quanto cada coisa ocupa neste aparelho.</p></div></div>
    <div class="pagina-limpeza">
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-azul">${ic('save')}</span> Espaço usado</h2>
      ${htmlBarraEspaco()}
    </section>

    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('sparkle')}</span> Sugestões</h2>
      <div class="lista-limpeza">
        ${sug.map((x) => `<div class="item-limpeza ${limpTela.sel.has(x.id) ? 'on' : ''} ${x.vazio ? 'vazio' : ''}">
          <button class="check ${limpTela.sel.has(x.id) ? 'on' : ''}" data-acao="limp-marcar" data-id="${x.id}" ${x.vazio ? 'disabled' : ''} aria-label="Selecionar">${limpTela.sel.has(x.id) ? ic('check') : ''}</button>
          <span class="selo mini ${x.cor}">${ic(x.icone)}</span>
          <div class="txt-limpeza"><b>${x.titulo}${x.seguro ? ' <span class="tag">sem perder nada</span>' : ''}</b><small>${x.texto}</small>
            ${x.escolha ? `<div class="segmento mini-seg">${Object.entries({ '6m': 'Mais de 6 meses', '1a': 'Mais de 1 ano', ano: `Antes de ${hojeISO().slice(0, 4)}` }).map(([k, t]) => `<button class="${limpTela.diario === k ? 'ativo' : ''}" data-acao="limp-diario" data-v="${k}">${t}</button>`).join('')}</div>` : ''}
          </div>
          <span class="tam-limpeza">${x.vazio ? '—' : fmtTam(x.tam)}</span>
        </div>`).join('')}
      </div>
    </section>

    ${pags.length ? `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('note')}</span> Páginas do caderno sem mexer há mais de 6 meses</h2>
      <p class="dica" style="margin:0 0 10px">As maiores primeiro. Marque só as que não precisa mais.</p>
      <div class="lista-limpeza lista-rolavel" style="max-height:360px">
        ${pags.map((p) => `<div class="item-limpeza ${limpTela.paginas.has(p.n.id) ? 'on' : ''}">
          <button class="check ${limpTela.paginas.has(p.n.id) ? 'on' : ''}" data-acao="limp-pagina" data-id="${p.n.id}" aria-label="Selecionar">${limpTela.paginas.has(p.n.id) ? ic('check') : ''}</button>
          <div class="txt-limpeza"><b>${esc(p.n.titulo || 'Sem título')}</b><small>${esc(p.m.nome)} · ${esc(p.l.nome)} · ${dataCurta(p.quando)}</small></div>
          <span class="tam-limpeza">${fmtTam(p.tam)}</span>
        </div>`).join('')}
      </div>
    </section>` : ''}

    <section class="card rodape-limpeza">
      <div class="txt-limpeza"><b>${algo ? `Vai liberar uns ${fmtTam(total)}` : 'Nada selecionado'}</b>
        <small>${apaga ? 'O que for apagado não vai para a lixeira (senão não liberaria espaço). O histórico na nuvem guarda uma cópia por 30 dias.' : 'Selecione acima o que quer limpar.'}</small></div>
      ${apaga ? `<label class="opcao-check"><input type="checkbox" data-mudar="limp-backup" ${limpTela.backup ? 'checked' : ''}> Baixar um backup antes</label>` : ''}
      <button class="btn ${apaga ? 'perigo' : ''}" data-acao="limp-executar" ${algo && !limpTela.ocupado ? '' : 'disabled'}>${limpTela.ocupado ? 'Limpando…' : algo && !apaga ? `${ic('upload', 'p')} Mover imagens` : `${ic('trash', 'p')} Limpar selecionados`}</button>
    </section>
    </div>`;
  },
};

ACOES['limp-marcar'] = (el) => { const id = el.dataset.id; limpTela.sel.has(id) ? limpTela.sel.delete(id) : limpTela.sel.add(id); desenhar(); };
ACOES['limp-pagina'] = (el) => { const id = el.dataset.id; limpTela.paginas.has(id) ? limpTela.paginas.delete(id) : limpTela.paginas.add(id); desenhar(); };
ACOES['limp-diario'] = (el) => { limpTela.diario = el.dataset.v; desenhar(); };
MUDAR['limp-backup'] = (el) => { limpTela.backup = el.checked; };

ACOES['limp-executar'] = async () => {
  const apaga = [...limpTela.sel].some((id) => id !== 'imagens') || limpTela.paginas.size;
  if (apaga && !confirmarDuasVezes('limpeza', 'Clique de novo para confirmar a limpeza.')) return;
  limpTela.ocupado = true; desenhar();
  const antes = espacoUsado();
  try {
    if (apaga && limpTela.backup) await ACOES.backup();
    const s = limpTela.sel;
    if (s.has('imagens')) await migrarImagens();
    if (s.has('compras')) estado.listas.filter((l) => l.tipo === 'compras').forEach((l) => { l.itens = l.itens.filter((i) => !i.comprado); });
    if (s.has('colecoes')) estado.listas.filter((l) => Array.isArray(l.categorias)).forEach((l) => l.categorias.forEach((c) => { c.itens = (c.itens || []).filter((i) => !i.feito); }));
    if (s.has('listas')) estado.listas.filter((l) => l.tipo !== 'compras' && !Array.isArray(l.categorias) && Array.isArray(l.itens)).forEach((l) => { l.itens = l.itens.filter((i) => !(i.status === 'feito' || i.feito === true)); });
    if (s.has('tarefas')) { const fora = new Set(tarefasAntigas().map((t) => t.id)); estado.tarefas = estado.tarefas.filter((t) => !fora.has(t.id)); }
    if (s.has('diario')) {
      const corte = corteDiario();
      Object.keys(estado.diario || {}).forEach((d) => { if (d < corte) delete estado.diario[d]; });
      if (typeof diarioMem !== 'undefined') Object.keys(diarioMem).forEach((d) => { if (d < corte) delete diarioMem[d]; });
      if (typeof usaTabelaDiario === 'function' && usaTabelaDiario()) {
        const { error } = await sb.from('central_diario').delete().eq('user_id', usuario.id).lt('dia', corte);
        if (error) avisar('Não consegui apagar os textos antigos do diário na nuvem. O resto foi limpo.');
      }
    }
    if (s.has('lixeira')) estado.lixeira = [];
    if (limpTela.paginas.size) estado.listas.forEach((l) => (l.materias || []).forEach((m) => { m.notas = (m.notas || []).filter((n) => !limpTela.paginas.has(n.id)); }));
    limpTela.sel.clear(); limpTela.paginas.clear();
    salvar();
    if (typeof descarregarSalvar === 'function') descarregarSalvar();
    const liberado = Math.max(0, antes - espacoUsado());
    avisar(liberado ? `Pronto! Liberou uns ${fmtTam(liberado)}.` : 'Pronto!');
  } finally {
    limpTela.ocupado = false;
    desenhar();
  }
};
