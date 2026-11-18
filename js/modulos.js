const MODULOS = [
  { id: 'treino', nome: 'Treino', icone: 'gym', cor: 'c-vermelho', pagina: 'treino', novo: true,
    texto: 'Monte seu treino em casa com mais de 80 exercícios, séries, repetições, descanso, cronômetro guiado e registro de corrida com pace.' },
  { id: 'pets', nome: 'Pets', icone: 'paw', cor: 'c-amarelo', pagina: 'pets', novo: true,
    texto: 'Passeios e brincadeiras da semana, cardápio de cada dia, peso, vacinas e lembretes dos seus bichinhos.' },
  { id: 'apps', nome: 'Apps de estudo', icone: 'code', cor: 'c-azul', pagina: 'apps', novo: true,
    texto: 'Os apps e sites que você usa para estudar (Coddy, Airlearn…), com meta diária de lições, sequência e atalho para abrir.' },
  { id: 'jejum', nome: 'Jejum', icone: 'timer', cor: 'c-verde', pagina: 'bemestar', novo: true,
    texto: 'Fica dentro de Bem-estar: escolha o protocolo (16:8, 14:10…), acompanhe o tempo, registre como se sentiu e veja o relatório nos Gráficos.' },
  { id: 'flashcards', nome: 'Flashcards', icone: 'layers', cor: 'c-violeta', pagina: 'flashcards',
    texto: 'Cartas de pergunta e resposta por matéria, com revisão espaçada.' },
  { id: 'financas', nome: 'Finanças', icone: 'money', cor: 'c-verde', pagina: 'financas',
    texto: 'Gastos por categoria, parcelas, contas fixas com aviso de vencimento.' },
  { id: 'revisao', nome: 'Revisão da semana', icone: 'review', cor: 'c-rosa', pagina: 'revisao',
    texto: 'Todo domingo: o que você fez, o que ficou para trás e o foco da próxima semana.' },
];

const temModulo = (id) => !!estado.config.modulos?.[id];

function aplicarModulos() {
  $$('.lateral [data-modulo]').forEach((a) => { a.hidden = !temModulo(a.dataset.modulo); });
}

PAGINAS.modulos = {
  titulo: 'Adicionar módulos',
  desenhar() {
    const ativos = MODULOS.filter((m) => temModulo(m.id));
    const card = (m) => {
      const on = temModulo(m.id);
      return `<section class="card modulo-card ${on ? 'on' : ''}">
        <div class="modulo-topo"><span class="selo ${m.cor}">${ic(m.icone)}</span>
          ${m.novo && !on ? '<span class="tag-novo">novo</span>' : ''}
          ${on ? `<span class="modulo-ok">${ic('check', 'p')} Adicionado</span>` : ''}</div>
        <h2>${m.nome}</h2>
        <p>${m.texto}</p>
        <div class="modulo-botoes">
          ${on ? `<a class="btn sec" href="#${m.pagina}">Abrir</a>
            <button class="btn sec" data-acao="modulo-tirar" data-id="${m.id}">Remover do menu</button>`
            : `<button class="btn" data-acao="modulo-por" data-id="${m.id}">${ic('plus', 'p')} Adicionar</button>`}
        </div>
      </section>`;
    };
    return `
    <div class="cab-pagina">
      <div><h1>Adicionar módulos</h1><p>Escolha o que faz sentido para a sua rotina. Remover só esconde do menu: nada é apagado, e se adicionar de novo está tudo lá.</p></div>
    </div>
    <p class="dica">${ativos.length} de ${MODULOS.length} módulos no seu menu.</p>
    <div class="grade-modulos">${MODULOS.map(card).join('')}</div>`;
  },
};

ACOES['modulo-por'] = (el) => {
  estado.config.modulos = { ...(estado.config.modulos || {}), [el.dataset.id]: true };
  salvar(); aplicarModulos(); desenhar();
  const m = MODULOS.find((x) => x.id === el.dataset.id);
  avisar(`${m.nome} adicionado ao menu.`);
};
ACOES['modulo-tirar'] = (el) => {
  estado.config.modulos = { ...(estado.config.modulos || {}), [el.dataset.id]: false };
  salvar(); aplicarModulos(); desenhar();
  const m = MODULOS.find((x) => x.id === el.dataset.id);
  avisar(`${m.nome} saiu do menu. Seus dados continuam guardados.`, () => ACOES['modulo-por'](el));
};

function opcoesHabitos(atual = '') {
  return `<option value="">Não marcar nenhum</option>${estado.habitos.filter((h) => !h.meta || true).map((h) => `<option value="${h.id}" ${atual === h.id ? 'selected' : ''}>${esc(h.nome)}</option>`).join('')}`;
}
function marcarHabitoAuto(id, dia = hojeISO()) {
  if (!id || !estado.habitos.some((h) => h.id === id)) return false;
  const reg = registroDoDia(dia);
  if (reg.habitos.includes(id)) return false;
  reg.habitos.push(id);
  return true;
}
// Vincular qualquer coisa a um hábito da Rotina (sempre opcional).
// alvo: 'ref:<ref>' (listas, matérias, metas), 'flash:<id>', 'jejum' ou 'foco'.
function alvoVinculo(alvo) {
  if (alvo === 'jejum') return [dadosJejum(), 'habito'];
  if (alvo === 'foco') return [estado.config, 'focoHabito'];
  if (alvo.startsWith('flash:')) return [baralhos().find((b) => b.id === alvo.slice(6)), 'habito'];
  if (alvo.startsWith('ref:')) return [acharRef(alvo.slice(4)), 'habito'];
  return [null, 'habito'];
}
function htmlVinculo(alvo, texto, herdado = '') {
  const [obj, campo] = alvoVinculo(alvo);
  if (!obj) return '';
  const atual = obj[campo] || '';
  return `<label class="vinculo-hab ${atual ? 'ligado' : ''}" title="${esc(texto)}">${ic('repeat', 'p')}<span>${esc(texto)}</span>
    <select data-mudar="vinc-hab" data-alvo="${esc(alvo)}" aria-label="Hábito vinculado">
      <option value="">${herdado ? `Usar o da lista (${esc(nomeHabito(herdado))})` : 'Vincular a um hábito…'}</option>
      ${estado.habitos.map((h) => `<option value="${h.id}" ${atual === h.id ? 'selected' : ''}>${esc(h.nome)}</option>`).join('')}
    </select></label>`;
}
MUDAR['vinc-hab'] = (el) => {
  const [obj, campo] = alvoVinculo(el.dataset.alvo);
  if (!obj) return;
  obj[campo] = el.value;
  salvar(); desenhar();
  avisar(el.value ? `Vinculado a "${nomeHabito(el.value)}".` : 'Vínculo removido.');
};
// Marca e avisa (uma vez por dia).
function marcarVinculo(id, dia = hojeISO()) {
  if (marcarHabitoAuto(id, dia)) {
    salvar();
    setTimeout(() => { avisar(`"${nomeHabito(id)}" marcado na Rotina.`); if (location.hash === '#rotina' || location.hash === '#dashboard' || !location.hash) desenhar(); }, 1400);
    return true;
  }
  return false;
}
const listaDoRef = (ref) => acharLista(String(ref).split('/')[0]);

const nomeHabito = (id) => estado.habitos.find((h) => h.id === id)?.nome || '';

function blocosDosModulos() {
  const hoje = hojeISO();
  const b = {};
  if (temModulo('treino')) {
    const t = dadosTreino();
    const fs = fichasDoDia(hoje);
    const feito = t.sessoes.filter((s) => s.data === hoje);
    b.treino = `<section class="card coluna">
      <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('gym')}</span> Treino de hoje <a href="#treino">${treinosNaSemana(segundaDaSemana(hoje))}/${t.diasMeta} na semana</a></h2>
      <div class="centro bloco-mod">
        ${t.ativo ? `<p><b>Treino em andamento</b></p><a class="btn" href="#treino">${ic('play', 'p')} Continuar</a>`
          : feito.length ? `<span class="selo c-verde grande">${ic('check')}</span><p><b>Treino feito!</b><br><span class="dica">${feito.map((s) => `${esc(s.nome)} · ${fmtDur(s.dur)}`).join('<br>')}</span></p>`
          : !t.fichas.length ? `<p class="dica">Você ainda não montou seu treino.</p><a class="btn" href="#treino" data-acao="treino-wizard-ir">${ic('sparkle', 'p')} Monte seu treino</a>`
          : fs.length ? `${fs.map((f) => `<p><b>${esc(f.nome)}</b><br><span class="dica">${f.itens.length} exercícios · ~${fmtDur(duracaoFicha(f))}</span></p>
            <button class="btn" data-acao="treino-iniciar" data-id="${f.id}">${ic('play', 'p')} Começar</button>`).join('')}`
          : `<span class="selo c-azul grande">${ic('moon')}</span><p><b>Dia de descanso</b><br><span class="dica">Aproveite para alongar.</span></p>`}
      </div>
    </section>`;
  }
  if (temModulo('jejum')) {
    const j = dadosJejum();
    const at = j.ativo;
    const h = at ? (Date.now() - at.inicio) / 3600000 : 0;
    const meta = at ? at.metaH : j.metaH;
    b.jejum = `<section class="card coluna">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('timer')}</span> Jejum <a href="#bemestar">${meta}:${24 - meta}</a></h2>
      <div class="centro bloco-mod">
        <div class="anel-jejum pequeno">
          <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" fill="none" style="stroke:var(--card-2)" stroke-width="10"/>
            <circle id="jj-arco" cx="80" cy="80" r="70" fill="none" stroke="#5fd6a4" stroke-width="10" stroke-linecap="round" stroke-dasharray="440" stroke-dashoffset="${440 * (1 - (at ? Math.min(1, h / meta) : 0))}" transform="rotate(-90 80 80)"/></svg>
          <div class="anel-meio"><b id="jj-tempo">${at ? fmtHoras(h) : `${meta}h`}</b><span id="jj-sub">${at ? (h >= meta ? 'meta cumprida!' : `faltam ${fmtHoras(meta - h)}`) : 'pronto para começar'}</span></div>
        </div>
        ${at ? `<a class="btn sec" href="#bemestar">Encerrar no Bem-estar</a>` : `<button class="btn" data-acao="jj-comecar">${ic('play', 'p')} Comecei agora</button>`}
      </div>
    </section>`;
  }
  if (temModulo('pets')) {
    const d = dadosPets();
    const seg = segundaDaSemana(hoje);
    b.pets = `<section class="card coluna">
      <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('paw')}</span> Pets <a href="#pets">Abrir</a></h2>
      ${d.lista.length ? `<div class="lista-rolavel">${d.lista.map((p) => {
        const sem = d.atividades.filter((a) => a.petId === p.id && a.data >= seg);
        const tipo = mostraPet(p, 'passeio') ? 'passeio' : mostraPet(p, 'brincadeira') ? 'brincadeira' : '';
        const cardHoje = p.cardapio?.[paraData(hoje).getDay()] ? `hoje: ${esc(p.cardapio[paraData(hoje).getDay()])}` : '';
        if (!tipo) return `<div class="item"><span class="txt">${esc(p.nome)}<span class="sub">${cardHoje || 'Sem atividades acompanhadas'}</span></span></div>`;
        const n = sem.filter((a) => a.tipo === tipo).length;
        const meta = tipo === 'passeio' ? (p.meta ?? 7) : (p.metaBrincar ?? 5);
        const feitoHoje = d.atividades.some((a) => a.petId === p.id && a.data === hoje && a.tipo === tipo);
        const rot = tipo === 'passeio' ? ['passeios', 'Passeou', 'Passeei'] : ['brincadeiras', 'Brincou', 'Brincou agora'];
        return `<div class="item">
          <span class="txt">${esc(p.nome)}<span class="sub">${n}/${meta} ${rot[0]} na semana${cardHoje ? ' · ' + cardHoje : ''}</span></span>
          <button class="btn-mini ${feitoHoje ? 'ativo' : ''}" data-acao="pet-rapido" data-t="${tipo}" data-pet="${p.id}">${ic(feitoHoje ? 'check' : (tipo === 'passeio' ? 'paw' : 'star'), 'p')} ${feitoHoje ? rot[1] : rot[2]}</button></div>`;
      }).join('')}</div>` : `<div class="centro bloco-mod"><p class="dica">Nenhum pet cadastrado.</p><a class="btn" href="#pets">${ic('plus', 'p')} Adicionar pet</a></div>`}
    </section>`;
  }
  if (temModulo('apps')) {
    const lista = dadosApps();
    b.apps = `<section class="card coluna">
      <h2 class="card-titulo"><span class="selo mini c-azul">${ic('code')}</span> Apps de estudo <a href="#apps">Abrir</a></h2>
      ${lista.length ? `<div class="lista-rolavel">${lista.map((a) => { const n = feitosApp(hoje, a.id); const ok = n >= (a.meta || 1); return `<div class="item app-dash">
        <span class="avatar-app mini" style="background:${a.cor}26;color:${a.cor}">${esc(a.nome[0])}</span>
        <span class="txt">${esc(a.nome)}<span class="sub">${n}/${a.meta} ${esc(a.unidade || 'lições')}${ok ? ' · meta batida!' : ''}</span></span>
        ${a.link ? `<a class="acao-item" href="${esc(a.link)}" target="_blank" rel="noopener" title="Abrir ${esc(a.nome)}">${ic('right', 'p')}</a>` : ''}
        <button class="btn-redondo" style="background:${a.cor};color:#13122a;border:0" data-acao="app-mais" data-id="${a.id}" data-v="1" aria-label="Mais uma">+</button></div>`; }).join('')}</div>`
        : `<div class="centro bloco-mod"><p class="dica">Nenhum app adicionado.</p><a class="btn" href="#apps">${ic('plus', 'p')} Adicionar app</a></div>`}
    </section>`;
  }
  return b;
}

ACOES['treino-wizard-ir'] = () => {
  treinoTela.aba = 'hoje';
  treinoTela.previa = null;
  treinoTela.wizard = { passo: 1, objetivo: 'condicionamento', nivel: 1, dias: [1, 3, 5], tempo: 30, equip: ['nenhum', 'cadeira', 'parede'], foco: [] };
  location.hash = 'treino';
  setTimeout(() => $('.wizard-treino')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
};
