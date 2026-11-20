const CHAVE = 'central-da-lorena-v3';

const AREAS = {
  Faculdade: '#f59ad8',
  Estudos: '#6aaeff',
  Trabalho: '#f7c56b',
  Casa: '#5fd6a4',
  Pessoal: '#9d86ff',
  Projetos: '#62c9f5',
};

const LEMBRETES = [
  { min: -1, nome: 'Sem aviso' },
  { min: 0, nome: 'Na hora' },
  { min: 15, nome: '15 min antes' },
  { min: 30, nome: '30 min antes' },
  { min: 60, nome: '1 hora antes' },
  { min: 1440, nome: '1 dia antes' },
];

const DURACOES = [15, 30, 45, 60, 90, 120, 180];

const STATUS = { afazer: 'A fazer', fazendo: 'Fazendo', feito: 'Feito' };

function g(fem, masc, neutro) {
  const x = typeof estado !== 'undefined' ? estado.config?.genero : 'n';
  return x === 'a' ? fem : x === 'o' ? masc : neutro;
}

const HUMORES = [
  { id: 'face1', nome: 'Ótimo' },
  { id: 'face2', nome: 'Bem' },
  { id: 'face3', nome: 'Normal' },
  { id: 'face4', nome: 'Pra baixo' },
  { id: 'face5', get nome() { return g('Cansada', 'Cansado', 'Sem energia'); } },
];

const ICONES_LISTA = ['list', 'cap', 'book', 'target', 'heart', 'star', 'bag', 'home', 'code', 'music', 'plane', 'cart',
  'film', 'coffee', 'leaf', 'gym', 'wallet', 'sparkle', 'paw', 'note', 'calendar', 'chat', 'sun', 'moon'];
const CORES_LISTA = ['#9d86ff', '#f59ad8', '#6aaeff', '#5fd6a4', '#f7c56b', '#ff8f8f', '#62c9f5', '#c99bff', '#ffb38a', '#8fe3cf', '#e3a6ff', '#a5a3c8'];

const it = (titulo, status = 'afazer', extra = {}) => ({ id: novoId(), titulo, status, data: '', tag: '', notas: '', ...extra });

const materia = (nome, status = 'afazer', tag = '', tarefas = []) => ({ id: novoId(), nome, status, tag, descricao: '', tarefas, notas: [] });
const tarefaMateria = (titulo, tipo = 'Atividade', data = '') => ({ id: novoId(), titulo, tipo, data, feito: false });

const MODELOS_CATEGORIA = {
  lugares: { nome: 'Lugares', icone: 'plane', falta: 'Quero ir', feito: 'Já fui' },
  filmes: { nome: 'Filmes', icone: 'film', falta: 'Quero ver', feito: 'Já vi' },
  series: { nome: 'Séries', icone: 'film', falta: 'Quero ver', feito: 'Já vi' },
  livros: { nome: 'Livros', icone: 'book', falta: 'Quero ler', feito: 'Já li' },
  receitas: { nome: 'Receitas', icone: 'coffee', falta: 'Quero fazer', feito: 'Já fiz' },
  outros: { nome: 'Outros', icone: 'star', falta: 'Quero fazer', feito: 'Já fiz' },
};
const categoria = (modelo, nome) => ({ id: novoId(), ...MODELOS_CATEGORIA[modelo], ...(nome ? { nome } : {}), itens: [] });

const listaColecoes = () => ({
  id: 'listas', tipo: 'colecoes', nome: 'Lista de listas', icone: 'star', cor: '#f7c56b', desc: 'Lugares, filmes, séries, livros, receitas…',
  categorias: [categoria('lugares'), categoria('filmes'), categoria('series'), categoria('livros'), categoria('receitas')],
});
const listaCompras = () => ({ id: 'compras', tipo: 'compras', nome: 'Compras', icone: 'cart', cor: '#ffb38a', desc: 'Para agora e a longo prazo', itens: [] });

// Conta nova começa só com esta lista de exemplo (dá para usar, renomear ou excluir)
const listaExemplo = () => ({
  id: 'exemplo', tipo: 'simples', nome: 'Minha lista', icone: 'list', cor: '#9d86ff', desc: 'Lista de exemplo: use, renomeie ou exclua', visao: 'lista', notas: [],
  itens: [it('Marque um item como feito'), it('Crie novas listas no + do menu (tem modelos prontos)'), it('Não vai usar esta lista? Exclua pelo lápis do menu')],
});

// Modelos prontos que aparecem em "Nova lista". Cada um cria uma cópia nova, com id próprio.
const semId = ({ id, ...resto }) => resto;
const MODELOS_LISTA = {
  estudos: { nome: 'Estudos', desc: 'Cursos com tarefas, provas e caderno de aulas.', icone: 'book', cor: '#6aaeff',
    criar: () => ({ tipo: 'cursos', nome: 'Estudos', icone: 'book', cor: '#6aaeff', desc: '', rotulo: 'Curso', materias: [] }) },
  metas: { nome: 'Metas', desc: 'Metas com descrição, prazo e etapas.', icone: 'target', cor: '#5fd6a4',
    criar: () => ({ tipo: 'metas', nome: 'Metas', icone: 'target', cor: '#5fd6a4', desc: '', metas: [] }) },
  colecoes: { nome: 'Lista de listas', desc: 'Lugares, filmes, séries, livros e receitas.', icone: 'star', cor: '#f7c56b',
    criar: () => semId(listaColecoes()) },
  compras: { nome: 'Compras', desc: 'Para agora e a longo prazo, com valores.', icone: 'cart', cor: '#ffb38a',
    criar: () => semId(listaCompras()) },
};

const TIPOS_LISTA = {
  simples: { nome: 'Lista simples', desc: 'Itens com status, data e etiqueta, em lista, quadro ou caderno.', icone: 'list' },
  cursos: { nome: 'Matérias ou cursos', desc: 'Cada matéria tem as suas tarefas, provas e caderno de aulas.', icone: 'cap' },
  metas: { nome: 'Metas', desc: 'Cada meta tem descrição, prazo e etapas.', icone: 'target' },
  colecoes: { nome: 'Coleção', desc: 'Filmes, lugares, livros… com "quero" e "já fiz" e favoritos.', icone: 'star' },
  compras: { nome: 'Compras', desc: 'Para agora e a longo prazo, com valores.', icone: 'cart' },
};

const PRIORIDADES = { alta: { nome: 'Alta', cor: '#ff7a8f' }, media: { nome: 'Média', cor: '#f7c56b' }, baixa: { nome: 'Baixa', cor: '#6aaeff' } };
const PESO_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
const REPETICOES = { '': 'Não repete', diario: 'Todo dia', uteis: 'Dias úteis (seg a sex)', semanal: 'Toda semana', mensal: 'Todo mês', anual: 'Todo ano' };
const CATEGORIAS_GASTO = [
  { id: 'mercado', nome: 'Mercado', cor: '#5fd6a4' },
  { id: 'alimentacao', nome: 'Comer fora', cor: '#f7c56b' },
  { id: 'transporte', nome: 'Transporte', cor: '#6aaeff' },
  { id: 'casa', nome: 'Casa e contas', cor: '#9d86ff' },
  { id: 'saude', nome: 'Saúde', cor: '#62c9f5' },
  { id: 'estudos', nome: 'Estudos', cor: '#f59ad8' },
  { id: 'lazer', nome: 'Lazer', cor: '#ff9f6b' },
  { id: 'compras', nome: 'Compras', cor: '#c792ea' },
  { id: 'outros', nome: 'Outros', cor: '#a5a3c8' },
];

const tarefa = (titulo, data, extra = {}) => ({
  id: novoId(), titulo, data, hora: '', duracao: 60, tipo: 'compromisso', area: 'Faculdade', lembrete: 1440, notas: '', feito: false, ...extra,
});

function dadosIniciais() {
  return {
    tarefas: [],
    listas: [listaExemplo()],
    habitos: [
      { id: 'h1', nome: 'Olhar a agenda do dia', grupo: 'Geral', dias: [] },
      { id: 'h2', nome: 'Beber água', grupo: 'Geral', dias: [] },
    ],
    medidas: [],
    financas: { lancamentos: [], recorrentes: [], contas: [], categorias: CATEGORIAS_GASTO.map((c) => ({ ...c })) },
    revisoes: {},
    lixeira: [],
    flashcards: { baralhos: [] },
    diario: {},
    avisados: {},
    config: { nome: '', genero: 'n', nomeEspaco: 'Minha Central', cidade: null, boasVindas: false, metaAgua: 8, resumoVisto: '', menu: 'mini', gruposHabito: ['Geral', 'Limpeza'], tema: 'violeta', aguaIntervalo: 0, aguaInicio: '08:00', aguaFim: '22:00', focoMateria: '', avisoContas: 1, modulos: {}, temColecoes: true },
  };
}

function completar(dados) {
  const base = dadosIniciais();
  const final = { ...base, ...dados, config: { ...base.config, ...(dados.config || {}) } };
  final.listas = (final.listas || []).map(migrarLista);
  final.habitos = (final.habitos || []).map((h) => ({ grupo: 'Geral', dias: [], meta: 0, ...h }));
  final.financas = { ...base.financas, ...(dados.financas || {}) };
  final.flashcards = { baralhos: [], simulados: [], ...(final.flashcards || {}) };
  // "Pago/pendente": lançamentos antigos ficam como pagos; repetições ganham a lista de datas pagas
  (final.financas.lancamentos || []).forEach((l) => { if (l.pago === undefined) l.pago = true; });
  (final.financas.recorrentes || []).forEach((r) => { if (!r.pagos) r.pagos = []; });
  (final.pets?.lista || []).forEach((p) => { if (!p.mostrar) p.mostrar = ['brincadeira']; });
  final.listas.filter((l) => l.tipo === 'cursos').forEach((l) => (l.materias || []).forEach((m) => migrarMateria(l, m)));
  if (!dados.config?.modulos) final.config.modulos = { flashcards: true, financas: true, revisao: true };
  if (dados.config && dados.config.boasVindas === undefined) {
    final.config.boasVindas = true;
    if (!dados.config.genero) final.config.genero = 'a';
    if (!dados.config.nomeEspaco) final.config.nomeEspaco = `Central da ${dados.config.nome || 'Lorena'}`;
    if (!dados.config.cidade) final.config.cidade = { nome: 'Curitiba', lat: -25.43, lon: -49.27 };
    if (!dados.config.nome) final.config.nome = 'Lorena';
  }

  if (!final.config.temColecoes) {
    if (!final.listas.some((l) => l.tipo === 'colecoes')) final.listas.push(listaColecoes());
    if (!final.listas.some((l) => l.tipo === 'compras')) final.listas.push(listaCompras());
    final.config.temColecoes = true;
  }
  return final;
}

// A aba "Sobre" virou páginas do Caderno, e as notas A1/A2/AF viraram itens do modo "Do meu jeito".
// Os ids são fixos para que dois aparelhos migrando ao mesmo tempo não dupliquem nada.
function migrarMateria(l, m) {
  m.notas = m.notas || [];
  const secoes = m.secoes || ((m.descricao || (m.anexos || []).length) ? [{ id: 'sobre', titulo: 'Sobre', html: m.descricao || '', anexos: m.anexos || [] }] : []);
  secoes.forEach((x) => {
    const id = 'sec-' + x.id;
    if (!(x.html || '').trim() && !(x.anexos || []).length && !(x.titulo || '').trim()) return;
    if (!m.notas.some((n) => n.id === id)) m.notas.push({ id, titulo: x.titulo || 'Sobre', html: x.html || '', anexos: x.anexos || [], criado: '2026-11-17', editado: '2026-11-17T12:00:00.000Z' });
  });
  if (m.secoes !== undefined || m.descricao || m.anexos) { delete m.secoes; delete m.descricao; delete m.anexos; }
  const usavaAv = m.notaModo === undefined ? l.rotulo === 'Matéria' : m.notaModo !== 'pontos';
  if (usavaAv) {
    const av = m.av || {};
    const r = { p1: 1, p2: 1, ...(l.regra || {}) };
    m.itensNota = m.itensNota || [];
    const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
    const vals = { a1: num(av.a1), a2: num(av.a2) };
    const nomes = { a1: 'A1', a2: 'A2' };
    const af = num(av.af);
    if (af !== null) {
      // A AF substitui a nota que mais ajudar, igual ao cálculo antigo
      const troca = vals.a1 === null ? 'a1' : vals.a2 === null ? 'a2' : (af * r.p1 + vals.a2 * r.p2 >= vals.a1 * r.p1 + af * r.p2 ? 'a1' : 'a2');
      if (vals[troca] === null || af > vals[troca]) { vals[troca] = af; nomes[troca] += ' (AF)'; }
    }
    [['a1', nomes.a1, r.p1], ['a2', nomes.a2, r.p2]].forEach(([k, nome, peso]) => {
      const v = vals[k];
      if (v === '' || v === undefined || v === null) return;
      if (!m.itensNota.some((i) => i.id === 'av-' + k)) m.itensNota.push({ id: 'av-' + k, nome, peso: String(peso), nota: String(v) });
    });
    if (m.itensNota.some((i) => i.id && i.id.startsWith('av-'))) m.calcModo = 'media';
  }
  if (m.notaModo !== 'pontos') m.notaModo = 'pontos';
}

function migrarLista(l) {
  if (l.tipo) return l;
  const statusMateria = { afazer: 'afazer', fazendo: 'cursando', feito: 'concluida' };
  if (l.id === 'faculdade' || l.id === 'estudos') {
    return {
      ...l, tipo: 'cursos', rotulo: l.id === 'faculdade' ? 'Matéria' : 'Curso',
      materias: (l.itens || []).map((i) => ({
        id: i.id, nome: i.titulo, status: statusMateria[i.status] || 'afazer', tag: i.tag || '',
        descricao: i.notas ? esc(i.notas) : '', notas: [],
        tarefas: i.data ? [tarefaMateria('Prova A1', 'Prova', i.data)] : [],
      })),
    };
  }
  if (l.id === 'metas') {
    return { ...l, tipo: 'metas', metas: (l.itens || []).map((i) => ({ id: i.id, titulo: i.titulo, descricao: i.notas ? esc(i.notas) : '', prazo: i.data || '', etapas: [], criado: hojeISO() })) };
  }
  return { ...l, tipo: 'simples', itens: l.itens || [], notas: l.notas || [] };
}

function contarLista(l) {
  if (l.tipo === 'cursos') {
    const t = l.materias.flatMap((m) => m.tarefas);
    return { total: t.length, feitos: t.filter((x) => x.feito).length, texto: `${l.materias.filter((m) => m.status === 'cursando').length} em andamento` };
  }
  if (l.tipo === 'metas') {
    const e = l.metas.flatMap((m) => m.etapas);
    return { total: e.length, feitos: e.filter((x) => x.feito).length, texto: `${l.metas.length} ${l.metas.length === 1 ? 'meta' : 'metas'}` };
  }
  if (l.tipo === 'colecoes') {
    const i = l.categorias.flatMap((c) => c.itens);
    return { total: i.length, feitos: i.filter((x) => x.feito).length, texto: `${i.filter((x) => !x.feito).length} na fila` };
  }
  if (l.tipo === 'compras') {
    return { total: l.itens.length, feitos: l.itens.filter((x) => x.comprado).length, texto: `${l.itens.filter((x) => !x.comprado).length} para comprar` };
  }
  return { total: l.itens.length, feitos: l.itens.filter((i) => i.status === 'feito').length };
}

function datasDaLista(l) {
  if (l.tipo === 'cursos') return l.materias.flatMap((m) => m.tarefas.filter((t) => !t.feito && t.data).map((t) => ({ titulo: `${t.titulo} · ${m.nome}`, data: t.data })));
  if (l.tipo === 'metas') return l.metas.filter((m) => m.prazo).map((m) => ({ titulo: `Prazo: ${m.titulo}`, data: m.prazo }));
  if (l.tipo === 'simples') return l.itens.filter((i) => i.status !== 'feito' && i.data).map((i) => ({ titulo: i.titulo, data: i.data }));
  return [];
}

function carregar() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) return completar(JSON.parse(salvo));
  } catch (e) {
    console.warn('Não consegui ler os dados salvos', e);
  }
  return dadosIniciais();
}

let estado = carregar();

let timerSalvar;
function gravarLocal() {
  timerSalvar = null;
  if (typeof gravarLocalSeguro === 'function') gravarLocalSeguro();
  else try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { }
  if (typeof salvarNuvem === 'function') salvarNuvem();
}

function salvar() {
  if (typeof marcarPendente === 'function') marcarPendente();
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(gravarLocal, 250);
}

const timerSalvarPendente = () => Boolean(timerSalvar);
function descarregarSalvar() {
  if (!timerSalvar) return;
  clearTimeout(timerSalvar);
  gravarLocal();
}

function registroDoDia(iso = hojeISO()) {
  if (!estado.diario[iso]) estado.diario[iso] = { habitos: [], agua: 0, pomodoros: 0, humor: '' };
  return estado.diario[iso];
}

function limparAntigos() {
  const limiteLixeira = new Date(Date.now() - 30 * 86400000).toISOString();
  estado.lixeira = (estado.lixeira || []).filter((x) => x.quando >= limiteLixeira);
  const limite = somarDias(hojeISO(), -120);

  Object.entries(estado.diario).forEach(([dia, r]) => {
    const vazio = !r.habitos?.length && !r.agua && !r.pomodoros && !r.humor && !r.sono && !r.texto && !r.bom?.some(Boolean) && !r.estudo;
    if (vazio && dia < hojeISO()) delete estado.diario[dia];
  });
  Object.keys(estado.avisados).forEach((k) => { if (k.slice(-10) < limite) delete estado.avisados[k]; });
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function valeNoDia(h, iso) {
  return h.meta > 0 || !h.dias?.length || h.dias.includes(paraData(iso).getDay());
}

function habitosDoDia(iso) {
  return estado.habitos.filter((h) => !h.meta && valeNoDia(h, iso));
}
function segundaDaSemana(iso) {
  return somarDias(iso, -((paraData(iso).getDay() + 6) % 7));
}

function feitosNaSemana(h, iso) {
  const ini = segundaDaSemana(iso);
  let n = 0;
  for (let i = 0; i < 7; i++) if (estado.diario[somarDias(ini, i)]?.habitos.includes(h.id)) n++;
  return n;
}
function feitosNoDia(iso, lista = habitosDoDia(iso)) {
  const r = estado.diario[iso];
  return r ? lista.filter((h) => valeNoDia(h, iso) && r.habitos.includes(h.id)).length : 0;
}
function feitoAtrasado(iso, id) {
  return !!estado.diario[iso]?.atrasados?.includes(id);
}
function atrasadosNoDia(iso, lista = habitosDoDia(iso)) {
  const r = estado.diario[iso];
  return r?.atrasados ? lista.filter((h) => r.habitos.includes(h.id) && r.atrasados.includes(h.id)).length : 0;
}
function gruposHabito() {
  const g = [...(estado.config.gruposHabito || ['Geral'])];
  estado.habitos.forEach((h) => { if (!g.includes(h.grupo)) g.push(h.grupo); });
  return g;
}
function textoDias(h) {
  if (h.meta > 0) return `${h.meta}x por semana`;
  if (!h.dias?.length || h.dias.length === 7) return 'Todo dia';
  const d = [...h.dias].sort((a, b) => ORDEM_SEMANA.indexOf(a) - ORDEM_SEMANA.indexOf(b));
  if (d.join() === '1,2,3,4,5') return 'Seg a Sex';
  if (d.join() === '6,0') return 'Fim de semana';
  return d.map((x) => DIAS_SEMANA[x]).join(', ');
}
