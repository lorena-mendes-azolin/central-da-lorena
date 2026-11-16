function paginaAtual() {
  const nome = location.hash.slice(1) || 'dashboard';
  if (nome.startsWith('lista-')) {
    const pag = paginaLista(nome.slice(6));
    if (pag) return { nome, ...pag };
  }
  return PAGINAS[nome] ? { nome, ...PAGINAS[nome] } : { nome: 'dashboard', ...PAGINAS.dashboard };
}

function desenhar() {
  const pag = paginaAtual();
  $('#conteudo').innerHTML = pag.desenhar();
  if (pag.depois) pag.depois();
  desenharMenu();
  atualizarCaminho();
  atualizarPomodoro();
  atualizarSino();
  $('#escolha-icone').hidden = true;
  if (!$('#painel-avisos').hidden) preencherAvisos();
  ajustarTrilhos(true);
  fecharMenuSelect();
  melhorarSelects();
}

function aplicarTema() {
  document.body.dataset.tema = estado.config.tema || 'violeta';
}

function ajustarTrilhos(centralizar) {
  $$('.carrossel').forEach((t) => {
    const f = t.querySelector('.faixa');
    if (centralizar) {
      const ativo = f.querySelector('.ativo');
      if (ativo) f.scrollLeft = ativo.offsetLeft - f.clientWidth / 2 + ativo.offsetWidth / 2;
    }
    t.classList.toggle('tem-esq', f.scrollLeft > 2);
    t.classList.toggle('tem-dir', f.scrollLeft + f.clientWidth < f.scrollWidth - 2);
  });
}
document.addEventListener('scroll', (e) => { if (e.target.classList?.contains('faixa')) ajustarTrilhos(); }, true);
window.addEventListener('resize', () => ajustarTrilhos());

document.addEventListener('wheel', (e) => {
  const f = e.target.closest('.carrossel .faixa');
  if (!f || f.scrollWidth <= f.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  e.preventDefault();
  f.scrollBy({ left: e.deltaY, behavior: 'instant' });
}, { passive: false });
ACOES.carrossel = (el) => {
  const f = el.closest('.carrossel').querySelector('.faixa');
  f.scrollBy({ left: Number(el.dataset.d) * f.clientWidth * 0.7, behavior: 'smooth' });
};

function desenharMenu() {
  const pag = paginaAtual();
  const atual = pag.nomeMenu || pag.nome;
  $('#nav-listas').innerHTML = estado.listas.map((l) => {
    const c = contarLista(l);
    const pend = l.tipo === 'cursos' || l.tipo === 'metas' ? 0 : c.total - c.feitos;
    return `<a href="#lista-${l.id}" data-pagina="lista-${l.id}" title="${esc(l.nome)}">
      <span class="selo mini" style="background:${l.cor}26;color:${l.cor}">${ic(l.icone)}</span><span>${esc(l.nome)}</span><em>${pend || ''}</em></a>`;
  }).join('');
  $$('.lateral a[data-pagina]').forEach((a) => a.classList.toggle('ativo', a.dataset.pagina === atual));

  const hoje = hojeISO();
  const n = estado.tarefas.filter((t) => !t.feito && t.data && t.data <= hoje).length;
  const b = $('#bolinha-agenda');
  b.hidden = !n;
  b.textContent = n;
}

function atualizarCaminho() {
  const pag = paginaAtual();
  $('#caminho').textContent = pag.titulo;
  if (!pomo.rodando) document.title = `${pag.titulo} · Central da Lorena`;
}

const telaPequena = () => window.matchMedia('(max-width: 860px)').matches;

function aplicarMenu() {
  const fixo = estado.config.menu === 'fixo';
  document.body.classList.toggle('menu-mini', !fixo);
  $('#txt-fixar').textContent = fixo ? 'Desafixar menu' : 'Fixar menu';
  $('#btn-fixar').title = fixo ? 'Desafixar (deixar o menu minimizado)' : 'Fixar o menu aberto';
}

ACOES['menu-fixar'] = () => {
  estado.config.menu = estado.config.menu === 'fixo' ? 'mini' : 'fixo';
  fecharMenu();
  aplicarMenu();
  salvar();
};

ACOES['abrir-menu'] = () => {
  if (telaPequena()) document.body.classList.toggle('menu-aberto');
  else ACOES['menu-fixar']();
};
ACOES['fechar-menu'] = () => fecharMenu();
function fecharMenu() { document.body.classList.remove('menu-aberto'); }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!e.target.closest('#escolha-icone') && !e.target.closest('[data-acao="icone-abrir"]')) $('#escolha-icone').hidden = true;
  if (!e.target.closest('#painel-avisos') && !e.target.closest('.sino')) $('#painel-avisos').hidden = true;
  if (el && ACOES[el.dataset.acao]) {
    e.preventDefault();
    ACOES[el.dataset.acao](el, e);
  }
  if (e.target.closest('.lateral a[data-pagina]')) fecharMenu();

  $('#dica-grafico').hidden = true;
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-mudar]');
  if (el && MUDAR[el.dataset.mudar]) MUDAR[el.dataset.mudar](el, e);
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-digitar]');
  if (el && DIGITAR[el.dataset.digitar]) DIGITAR[el.dataset.digitar](el, e);
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form || !FORMS[form.dataset.form]) return;
  e.preventDefault();

  const precisa = form.querySelector('[data-precisa]');
  if (precisa && !precisa.value.trim()) { precisa.focus(); return; }
  const dados = Object.fromEntries(new FormData(form));
  for (const k in dados) if (typeof dados[k] === 'string') dados[k] = dados[k].trim();
  FORMS[form.dataset.form](dados, form);
});

document.addEventListener('keydown', (e) => {

  if (e.key === 'Enter' && e.target.matches('.titulo-edit, .desc-edit, td .inline, .item-lista .inline')) e.target.blur();
  if (e.key === 'Escape') { $('#escolha-icone').hidden = true; $('#painel-avisos').hidden = true; fecharMenu(); }
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  desenhar();
});

ACOES.backup = () => {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-central-${hojeISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  avisar('Backup baixado. Guarde em um lugar seguro.');
};

$('#arquivo-backup').addEventListener('change', async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    if (!Array.isArray(dados.tarefas) || !Array.isArray(dados.listas)) throw new Error('arquivo inválido');
    const anterior = estado;
    estado = completar(dados);
    salvar(); aplicarMenu(); desenhar();
    avisar('Backup restaurado.', () => { estado = anterior; salvar(); aplicarMenu(); desenhar(); });
  } catch {
    avisar('Esse arquivo não parece um backup da Central.');
  }
  e.target.value = '';
});

let diaAberto = hojeISO();
let minutoAberto = new Date().getMinutes();
function aCadaSegundo() {
  const a = new Date();
  $('#relogio-topo').textContent =
    a.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' +
    a.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  passoPomodoro();

  if (a.getMinutes() !== minutoAberto) {
    minutoAberto = a.getMinutes();
    const linha = $('.agora-linha');
    if (linha) linha.style.top = ((a.getHours() - HORA_INICIO) + a.getMinutes() / 60) * ALTURA_HORA + 'px';
  }

  if (hojeISO() !== diaAberto) { diaAberto = hojeISO(); desenhar(); resumoDoDia(); }
}

async function iniciar() {
  const logada = await iniciarNuvem();
  if (!logada) return;
  limparAntigos();
  aplicarMenu();
  aplicarTema();
  $('#perfil-nome').textContent = estado.config.nome;
  $('#perfil-foto').textContent = estado.config.nome[0].toUpperCase();
  if (usuario) {
    $('#perfil-sub').textContent = usuario.email;
    $('#txt-sair').textContent = 'Sair';
    $('#btn-sair').title = 'Sair da conta';
  } else {
    $('#perfil-sub').textContent = 'modo local';
  }
  desenhar();
  aCadaSegundo();
  setInterval(aCadaSegundo, 1000);
  buscarClima();
  setInterval(buscarClima, 30 * 60000);
  verificarLembretes();
  setInterval(verificarLembretes, 20000);
  resumoDoDia();
}
iniciar();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
