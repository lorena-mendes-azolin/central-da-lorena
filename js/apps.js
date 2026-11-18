const appsTela = { criando: null };
const UNIDADES_APP = ['lições', 'unidades', 'aulas', 'exercícios', 'capítulos', 'minutos', 'XP'];
const CORES_APP = ['#9b8cff', '#5fd6a4', '#f7c56b', '#f59ad8', '#8fd3ff', '#ff9f7a', '#ff7a8a', '#7ad7d0'];
const SUGESTOES_APP = [
  { nome: 'Coddy', link: 'https://coddy.tech', unidade: 'lições', cor: '#9b8cff', assunto: 'Programação' },
  { nome: 'Airlearn', link: 'https://airlearn.com', unidade: 'lições', cor: '#5fd6a4', assunto: 'Inglês' },
  { nome: 'Duolingo', link: 'https://www.duolingo.com', unidade: 'lições', cor: '#7ad7d0', assunto: 'Idiomas' },
  { nome: 'freeCodeCamp', link: 'https://www.freecodecamp.org', unidade: 'exercícios', cor: '#8fd3ff', assunto: 'Programação' },
  { nome: 'Khan Academy', link: 'https://pt.khanacademy.org', unidade: 'aulas', cor: '#f7c56b', assunto: 'Matemática' },
  { nome: 'Alura', link: 'https://www.alura.com.br', unidade: 'aulas', cor: '#ff9f7a', assunto: 'Tecnologia' },
];

function dadosApps() {
  estado.appsEstudo = estado.appsEstudo || { lista: [] };
  return estado.appsEstudo.lista;
}
const feitosApp = (iso, id) => estado.diario[iso]?.apps?.[id] || 0;

function sequenciaApp(a) {
  let d = hojeISO();
  if (!feitosApp(d, a.id)) d = somarDias(d, -1);
  let n = 0;
  while (feitosApp(d, a.id) > 0 && n < 3650) { n++; d = somarDias(d, -1); }
  return n;
}
function totalApp(a) {
  return Object.values(estado.diario).reduce((s, r) => s + (r?.apps?.[a.id] || 0), 0);
}

PAGINAS.apps = {
  titulo: 'Apps de estudo',
  desenhar() {
    const lista = dadosApps();
    const hoje = hojeISO();
    const metaOk = lista.filter((a) => feitosApp(hoje, a.id) >= (a.meta || 1)).length;
    return `
    <div class="cab-pagina">
      <div><h1>Apps de estudo</h1><p>${lista.length ? `${metaOk} de ${lista.length} ${lista.length === 1 ? 'meta batida' : 'metas batidas'} hoje.` : 'Junte aqui os apps e sites que você usa para estudar e acompanhe seu progresso diário.'}</p></div>
      <div class="cab-acoes"><button class="btn" data-acao="app-novo">${ic('plus', 'p')} Adicionar app</button></div>
    </div>
    ${appsTela.criando ? htmlFormApp(appsTela.criando) : ''}
    ${!lista.length && !appsTela.criando ? htmlSugestoesApp() : ''}
    ${lista.length ? `<section class="card lista-apps">${lista.map(htmlLinhaApp).join('')}</section>` : ''}
    ${lista.length ? htmlSemanaApps(lista) : ''}`;
  },
};

function htmlSugestoesApp() {
  const ja = new Set(dadosApps().map((a) => a.nome.toLowerCase()));
  const ocultas = estado.appsEstudo.ocultas || [];
  return `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('sparkle')}</span> Comece por um destes
      ${ocultas.length ? `<a href="#" data-acao="app-sug-mostrar" style="margin-left:auto">Mostrar ${ocultas.length} ${ocultas.length === 1 ? 'escondido' : 'escondidos'}</a>` : ''}</h2>
    <div class="sugestoes-app">${SUGESTOES_APP.filter((s) => !ja.has(s.nome.toLowerCase()) && !ocultas.includes(s.nome)).map((s) => `<div class="sugestao-app-caixa">
      <button class="sugestao-app" data-acao="app-sugestao" data-nome="${esc(s.nome)}">
      <span class="avatar-app" style="background:${s.cor}26;color:${s.cor}">${esc(s.nome[0])}</span><b>${esc(s.nome)}</b><small>${esc(s.assunto)}</small></button>
      <button class="tirar-sugestao" data-acao="app-sug-tirar" data-nome="${esc(s.nome)}" title="Não mostrar ${esc(s.nome)}" aria-label="Não mostrar ${esc(s.nome)}">${ic('x', 'p')}</button></div>`).join('')}
      <button class="sugestao-app" data-acao="app-novo"><span class="avatar-app">${ic('plus', 'p')}</span><b>Outro</b><small>qualquer app ou site</small></button></div>
  </section>`;
}

function htmlFormApp(a) {
  return `<form class="card" data-form="app-salvar" style="margin-bottom:16px">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('code')}</span> ${a.id ? 'Editar app' : 'Novo app de estudo'}</h2>
    <div class="linha3">
      <label class="campo">Nome<input type="text" name="nome" maxlength="30" value="${esc(a.nome || '')}" data-precisa></label>
      <label class="campo">O que estuda nele<input type="text" name="assunto" maxlength="40" value="${esc(a.assunto || '')}"></label>
      <label class="campo">Link<input type="url" name="link" value="${esc(a.link || '')}" placeholder="https://"></label>
    </div>
    <div class="linha3">
      <label class="campo">Conta em<select name="unidade">${UNIDADES_APP.map((u) => `<option ${(a.unidade || 'lições') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <label class="campo">Meta por dia<input type="number" name="meta" min="1" max="500" value="${a.meta || 3}"></label>
      <label class="campo">Ligar a uma matéria ou curso (opcional)<select name="ref">${opcoesMaterias(a.ref || '')}</select></label>
    </div>
    <div class="linha2">
      <label class="campo">Cada ${esc(a.unidade || 'lição')} vale quantos minutos de estudo? (opcional)<input type="number" name="minLicao" min="0" max="240" value="${a.minLicao || ''}" placeholder="0"></label>
      <label class="campo">Ao bater a meta do dia, marcar na Rotina<select name="habito">${opcoesHabitos(a.habito || '')}</select></label>
    </div>
    <p class="dica" style="margin:-4px 0 10px">Com uma matéria ou curso ligado e os minutos preenchidos, cada ${esc(a.unidade || 'lição')} soma tempo de estudo em "Notas e estudo".</p>
    <div class="cores-app">${CORES_APP.map((c) => `<label><input type="radio" name="cor" value="${c}" ${(a.cor || CORES_APP[0]) === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>
    ${a.id ? `<input type="hidden" name="id" value="${a.id}">` : ''}
    <div class="form-linha" style="justify-content:flex-end">
      <button type="button" class="btn sec" data-acao="app-cancelar">Cancelar</button>
      <button class="btn">${a.id ? 'Salvar' : 'Adicionar'}</button>
    </div>
  </form>`;
}

function htmlLinhaApp(a) {
  const n = feitosApp(hojeISO(), a.id);
  const meta = a.meta || 1;
  const ok = n >= meta;
  return `<div class="linha-app ${ok ? 'meta-ok' : ''}" style="--cor-app:${a.cor}" ${ordem('|appsEstudo.lista', a.id)}>
    ${alca()}
    <button class="abrir-linha-app" data-acao="app-abrir" data-id="${a.id}">
      <span class="avatar-app" style="background:${a.cor}26;color:${a.cor}">${esc(a.nome[0] || '?')}</span>
      <span class="nome-app"><b>${esc(a.nome)}</b><small>${esc(a.assunto || (a.ref ? nomeMateria(a.ref) : ''))}</small></span>
    </button>
    <span class="progresso-app" title="${n} de ${meta} ${esc(a.unidade || 'lições')} hoje"><span style="width:${Math.min(100, Math.round((n / meta) * 100))}%;background:${a.cor}"></span></span>
    <span class="conta-app">${ok ? ic('check', 'p') : ''}${n}/${meta}</span>
    <button class="btn-redondo" data-acao="app-mais" data-id="${a.id}" data-v="1" aria-label="Mais uma" style="background:${a.cor};color:#13122a;border:0">+</button>
    <button class="acao-item" data-acao="app-abrir" data-id="${a.id}" aria-label="Abrir detalhes">${ic('right', 'p')}</button>
  </div>`;
}

const appAberto = { id: '' };
function redesenharApp() {
  const j = $('#janela-app');
  const a = dadosApps().find((x) => x.id === appAberto.id);
  if (!j?.open || !a) return;
  j.innerHTML = `<button type="button" class="btn-icone fechar-dc" data-acao="app-fechar" aria-label="Fechar">${ic('x')}</button>${htmlCardApp(a, true)}`;
}
ACOES['app-abrir'] = (el) => {
  appAberto.id = el.dataset.id;
  let j = $('#janela-app');
  if (!j) {
    j = document.createElement('dialog');
    j.id = 'janela-app';
    j.className = 'janela janela-app';
    j.addEventListener('click', (e) => { if (e.target === j) j.close(); });
    document.body.appendChild(j);
  }
  if (!j.open) j.showModal();
  redesenharApp();
};
ACOES['app-fechar'] = () => $('#janela-app')?.close();

function htmlCardApp(a, naJanela = false) {
  const hoje = hojeISO();
  const n = feitosApp(hoje, a.id);
  const meta = a.meta || 1;
  const pct = Math.min(1, n / meta);
  const seq = sequenciaApp(a);
  const dias = Array.from({ length: 7 }, (_, k) => somarDias(hoje, k - 6));
  const maxDia = Math.max(meta, ...dias.map((d) => feitosApp(d, a.id)));
  return `<section class="card card-app ${n >= meta ? 'meta-ok' : ''}" style="--cor-app:${a.cor}">
    <div class="topo-app">
      <span class="avatar-app" style="background:${a.cor}26;color:${a.cor}">${esc(a.nome[0] || '?')}</span>
      <div class="nome-app"><b>${esc(a.nome)}</b><small>${esc(a.assunto || (a.ref ? nomeMateria(a.ref) : ''))}</small></div>
      <span class="espaco"></span>
      <button class="acao-item" data-acao="app-editar" data-id="${a.id}" title="Editar">${ic('edit', 'p')}</button>
      <button class="acao-item apagar" data-acao="app-del" data-id="${a.id}" title="Remover">${ic('trash', 'p')}</button>
    </div>
    <div class="meio-app">
      <div class="anel-app">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" style="stroke:var(--card-2)" stroke-width="10"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="${a.cor}" stroke-width="10" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="${314 * (1 - pct)}" transform="rotate(-90 60 60)"/></svg>
        <div><b>${n}</b><small>de ${meta} ${esc(a.unidade || 'lições')}</small></div>
      </div>
      <div class="contador-app">
        <button class="btn-redondo" data-acao="app-mais" data-id="${a.id}" data-v="-1" aria-label="Menos uma" ${n ? '' : 'disabled'}>−</button>
        <button class="btn-redondo grande" data-acao="app-mais" data-id="${a.id}" data-v="1" aria-label="Mais uma" style="background:${a.cor}">+</button>
      </div>
    </div>
    <p class="status-app">${n >= meta ? `${ic('check', 'p')} Meta de hoje batida!` : `Faltam ${meta - n} ${esc(a.unidade || 'lições')} hoje`}</p>
    <div class="info-app">
      <span title="Dias seguidos estudando">${ic('flame', 'p')} ${seq} ${seq === 1 ? 'dia' : 'dias'}</span>
      <span title="Total registrado">${ic('chart', 'p')} ${totalApp(a)} no total</span>
    </div>
    <div class="mini-semana-app">${dias.map((d) => { const v = feitosApp(d, a.id); return `<div title="${dataCurta(d)}: ${v}"><span style="height:${Math.round((v / maxDia) * 100)}%;background:${v >= meta ? a.cor : `${a.cor}80`}"></span><small>${DIAS_SEMANA[paraData(d).getDay()][0]}</small></div>`; }).join('')}</div>
    ${a.link ? `<a class="btn abrir-app" href="${esc(a.link)}" target="_blank" rel="noopener" style="background:${a.cor}">${ic('right', 'p')} Abrir ${esc(a.nome)}</a>` : `<button class="btn sec abrir-app" data-acao="app-editar" data-id="${a.id}">Adicionar link</button>`}
  </section>`;
}

function htmlSemanaApps(lista) {
  const hoje = hojeISO();
  const dias = Array.from({ length: 14 }, (_, k) => somarDias(hoje, k - 13));
  return `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('calendar')}</span> Últimos 14 dias</h2>
    <div class="tabela-apps"><div class="linha-apps cab"><span></span>${dias.map((d) => `<small class="${d === hoje ? 'hoje' : ''}">${Number(d.slice(8))}</small>`).join('')}</div>
    ${lista.map((a) => `<div class="linha-apps"><span>${esc(a.nome)}</span>${dias.map((d) => { const v = feitosApp(d, a.id); return `<i class="${v >= (a.meta || 1) ? 'ok' : v ? 'meio' : ''}" style="--cor-app:${a.cor}" title="${dataCurta(d)}: ${v} ${esc(a.unidade || '')}">${v || ''}</i>`; }).join('')}</div>`).join('')}</div>
  </section>`;
}

ACOES['app-novo'] = () => { appsTela.criando = appsTela.criando ? null : {}; desenhar(); };
ACOES['app-cancelar'] = () => { appsTela.criando = null; desenhar(); };
ACOES['app-sugestao'] = (el) => { appsTela.criando = { ...SUGESTOES_APP.find((s) => s.nome === el.dataset.nome), meta: 3 }; desenhar(); };
ACOES['app-editar'] = (el) => { $('#janela-app')?.close(); appsTela.criando = { ...dadosApps().find((a) => a.id === el.dataset.id) }; desenhar(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
FORMS['app-salvar'] = (d) => {
  if (d.link && !/^https?:\/\//.test(d.link)) d.link = `https://${d.link}`;
  const lista = dadosApps();
  const dados = { nome: d.nome, assunto: d.assunto, link: d.link, unidade: d.unidade, meta: Number(d.meta) || 1, ref: d.ref || '', cor: d.cor || CORES_APP[0], minLicao: Number(d.minLicao) || 0, habito: d.habito || '' };
  const a = d.id && lista.find((x) => x.id === d.id);
  if (a) Object.assign(a, dados); else lista.push({ id: novoId(), ...dados });
  appsTela.criando = null;
  salvar(); desenhar();
  avisar(`${dados.nome} salvo.`);
};
ACOES['app-del'] = (el) => {
  $('#janela-app')?.close();
  const lista = dadosApps();
  const a = lista.find((x) => x.id === el.dataset.id);
  if (!confirmarDuasVezes(`app-${a.id}`, `Clique de novo para remover ${a.nome}.`)) return;
  const pos = lista.indexOf(a);
  lista.splice(pos, 1);
  salvar(); desenhar();
  avisar(`${a.nome} removido. O histórico fica guardado.`, () => { lista.splice(pos, 0, a); salvar(); desenhar(); });
};
ACOES['app-mais'] = (el) => {
  const a = dadosApps().find((x) => x.id === el.dataset.id);
  const reg = registroDoDia(hojeISO());
  reg.apps = reg.apps || {};
  const antes = reg.apps[a.id] || 0;
  reg.apps[a.id] = Math.max(0, antes + Number(el.dataset.v));
  const dif = reg.apps[a.id] - antes;
  if (dif && a.ref && a.minLicao && acharRef(a.ref)) {
    reg.estudo = reg.estudo || {};
    reg.estudo[a.ref] = Math.max(0, (reg.estudo[a.ref] || 0) + dif * a.minLicao);
  }
  let marcou = false;
  if (antes < (a.meta || 1) && reg.apps[a.id] >= (a.meta || 1)) marcou = marcarHabitoAuto(a.habito);
  salvar(); desenhar(); redesenharApp();
  if (antes < (a.meta || 1) && reg.apps[a.id] >= (a.meta || 1)) { tocarSom(true); avisar(`Meta do ${a.nome} batida hoje!${marcou ? ` "${nomeHabito(a.habito)}" marcado na Rotina.` : ''}`); }
};

ACOES['app-sug-tirar'] = (el) => {
  dadosApps();
  const o = estado.appsEstudo.ocultas = estado.appsEstudo.ocultas || [];
  if (!o.includes(el.dataset.nome)) o.push(el.dataset.nome);
  salvar(); desenhar();
  avisar(`${el.dataset.nome} não aparece mais nas sugestões.`, () => { estado.appsEstudo.ocultas = o.filter((x) => x !== el.dataset.nome); salvar(); desenhar(); });
};
ACOES['app-sug-mostrar'] = () => { estado.appsEstudo.ocultas = []; salvar(); desenhar(); };
