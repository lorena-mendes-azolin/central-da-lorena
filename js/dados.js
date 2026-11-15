// =========================================================
// dados.js — onde tudo fica guardado
// Modo local: no navegador (localStorage).
// Com login: também no Supabase (veja nuvem.js).
// =========================================================

const CHAVE = 'central-da-lorena-v3';

// Áreas das tarefas da agenda (cada uma com uma cor)
const AREAS = {
  Faculdade: '#f59ad8',
  Estudos: '#6aaeff',
  Trabalho: '#f7c56b',
  Casa: '#5fd6a4',
  Pessoal: '#9d86ff',
  Projetos: '#62c9f5',
};

// Quando avisar (minutos antes)
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

// Rostinhos do humor (desenhos no index.html)
const HUMORES = [
  { id: 'face1', nome: 'Ótimo' },
  { id: 'face2', nome: 'Bem' },
  { id: 'face3', nome: 'Normal' },
  { id: 'face4', nome: 'Pra baixo' },
  { id: 'face5', nome: 'Cansada' },
];

// Ícones e cores que dá para escolher nas listas
const ICONES_LISTA = ['list', 'cap', 'book', 'target', 'heart', 'star', 'bag', 'home', 'code', 'music', 'plane', 'cart',
  'film', 'coffee', 'leaf', 'gym', 'wallet', 'sparkle', 'paw', 'note', 'calendar', 'chat', 'sun', 'moon'];
const CORES_LISTA = ['#9d86ff', '#f59ad8', '#6aaeff', '#5fd6a4', '#f7c56b', '#ff8f8f', '#62c9f5', '#c99bff', '#ffb38a', '#8fe3cf', '#e3a6ff', '#a5a3c8'];

// Item de lista (função para não repetir código)
const it = (titulo, status = 'afazer', extra = {}) => ({ id: novoId(), titulo, status, data: '', tag: '', notas: '', ...extra });

// Matéria/curso (listas do tipo "cursos") e as tarefas dentro dela
const materia = (nome, status = 'afazer', tag = '', tarefas = []) => ({ id: novoId(), nome, status, tag, descricao: '', tarefas, notas: [] });
const tarefaMateria = (titulo, tipo = 'Atividade', data = '') => ({ id: novoId(), titulo, tipo, data, feito: false });

// Modelos de categoria da "Lista de listas" (o que aparece em "falta" e "já fiz")
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

// Tipos de lista que dá para criar
const TIPOS_LISTA = {
  simples: { nome: 'Lista simples', desc: 'Itens com status, data e etiqueta, em lista, quadro ou caderno.', icone: 'list' },
  cursos: { nome: 'Matérias ou cursos', desc: 'Cada matéria tem as suas tarefas, provas e caderno de aulas.', icone: 'cap' },
  metas: { nome: 'Metas', desc: 'Cada meta tem descrição, prazo e etapas.', icone: 'target' },
  colecoes: { nome: 'Coleção', desc: 'Filmes, lugares, livros… com "quero" e "já fiz" e favoritos.', icone: 'star' },
  compras: { nome: 'Compras', desc: 'Para agora e a longo prazo, com valores.', icone: 'cart' },
};

// Tarefa da agenda
const tarefa = (titulo, data, extra = {}) => ({
  id: novoId(), titulo, data, hora: '', duracao: 60, tipo: 'compromisso', area: 'Faculdade', lembrete: 1440, notas: '', feito: false, ...extra,
});

// Como o site começa na primeira vez: só as datas da faculdade
function dadosIniciais() {
  return {
    tarefas: [
      tarefa('Fazer rematrícula para 2027', '2026-11-18', { tipo: 'tarefa', lembrete: 0, notas: 'Período de rematrícula: 18/11/2026 a 14/02/2027.' }),
      tarefa('Notas das disciplinas de Outubro', '2026-11-23', { lembrete: -1 }),
      tarefa('Prova A1 – começa o período', '2026-11-27', { notas: 'Prova A1 das disciplinas de Novembro e Dezembro, de 27 a 30/11.' }),
      tarefa('Prova A1 – último dia', '2026-11-30'),
      tarefa('Recurso da Prova A1 (se precisar)', '2026-12-01', { lembrete: 0 }),
      tarefa('Notas de Novembro e Dezembro', '2026-12-07', { lembrete: -1 }),
      tarefa('Prova AF (só se reprovar)', '2026-12-11', { notas: 'Prova AF de 11 a 12/12. Recurso até 13/12, notas em 21/12.' }),
      tarefa('Último dia das Atividades Complementares', '2026-12-14', { tipo: 'tarefa' }),
      tarefa('Fim do semestre', '2026-12-19', { lembrete: -1 }),
    ],
    listas: [
      {
        id: 'faculdade', tipo: 'cursos', nome: 'Faculdade', icone: 'cap', cor: '#f59ad8', desc: 'ADS · Universidade Positivo · 1º período',
        rotulo: 'Matéria',
        materias: [
          materia('Modelagem de Banco de Dados', 'cursando', 'Nov/Dez', [tarefaMateria('Prova A1', 'Prova', '2026-11-27')]),
          materia('Meio Ambiente e Cuidados de Saúde', 'cursando', 'Novembro', [tarefaMateria('Prova A1', 'Prova', '2026-11-27')]),
        ],
      },
      { id: 'estudos', tipo: 'cursos', nome: 'Estudos', icone: 'book', cor: '#6aaeff', desc: '', rotulo: 'Curso', materias: [] },
      { id: 'metas', tipo: 'metas', nome: 'Metas', icone: 'target', cor: '#5fd6a4', desc: '', metas: [] },
      listaColecoes(),
      listaCompras(),
    ],
    habitos: [
      { id: 'h1', nome: 'Olhar a agenda do dia' },
      { id: 'h2', nome: 'Estudar 30 minutos' },
    ],
    diario: {},     // um registro por dia: hábitos feitos, água, pomodoros e humor
    avisados: {},   // lembretes já mostrados (para não repetir)
    config: { nome: 'Lorena', metaAgua: 8, resumoVisto: '', menu: 'mini' },
  };
}

// Junta dados salvos com o padrão (para campos novos não ficarem vazios)
function completar(dados) {
  const base = dadosIniciais();
  const final = { ...base, ...dados, config: { ...base.config, ...(dados.config || {}) } };
  final.listas = (final.listas || []).map(migrarLista);
  // listas novas que ainda não existiam
  if (!final.config.temColecoes) {
    if (!final.listas.some((l) => l.tipo === 'colecoes')) final.listas.push(listaColecoes());
    if (!final.listas.some((l) => l.tipo === 'compras')) final.listas.push(listaCompras());
    final.config.temColecoes = true;
  }
  return final;
}

// Converte listas da versão anterior (só itens) para os tipos novos
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

// Quanto falta / quanto já foi feito numa lista (para o menu e o Dashboard)
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

// Datas futuras de uma lista (aparecem nas Próximas datas do Dashboard)
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

// Salva (espera um pouquinho para juntar várias mudanças em uma só)
let timerSalvar;
function salvar() {
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) {
      avisar('Não consegui salvar. Faça um backup!');
    }
    if (typeof salvarNuvem === 'function') salvarNuvem(); // envia pro Supabase (se tiver login)
  }, 250);
}

function registroDoDia(iso = hojeISO()) {
  if (!estado.diario[iso]) estado.diario[iso] = { habitos: [], agua: 0, pomodoros: 0, humor: '' };
  return estado.diario[iso];
}

// Apaga registros com mais de 120 dias para não pesar
function limparAntigos() {
  const limite = somarDias(hojeISO(), -120);
  Object.keys(estado.diario).forEach((dia) => { if (dia < limite) delete estado.diario[dia]; });
  Object.keys(estado.avisados).forEach((k) => { if (k.slice(-10) < limite) delete estado.avisados[k]; });
}
