function opcoesCategoria(atual) {
  return gruposHabito().map((g) => `<option ${atual === g ? 'selected' : ''}>${esc(g)}</option>`).join('')
    + '<option value="__nova" data-especial="1">+ Nova categoria…</option>';
}

const rotinaTela = { grupo: 'todos', editando: null, criandoGrupo: false, mes: 0 };

function sequencia(h) {
  if (h.meta > 0) return semanasSeguidas(h);
  let dia = hojeISO();
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (valeNoDia(h, dia)) {
      const feito = estado.diario[dia]?.habitos.includes(h.id);
      if (feito) n++;
      else if (dia !== hojeISO()) break;
    }
    dia = somarDias(dia, -1);
  }
  return n;
}

function semanasSeguidas(h) {
  let seg = segundaDaSemana(hojeISO());
  let n = 0;
  if (feitosNaSemana(h, seg) >= h.meta) n++;
  seg = somarDias(seg, -7);
  while (n < 200 && feitosNaSemana(h, seg) >= h.meta) { n++; seg = somarDias(seg, -7); }
  return n;
}

function htmlLinhaHabito(h, dias, hoje) {
  const seq = sequencia(h);
  const editando = rotinaTela.editando === h.id;
  return `<tr class="${editando ? 'editando' : ''}">
    <td>
      <input class="inline inline-t" value="${esc(h.nome)}" data-digitar="habito-nome" data-id="${h.id}" aria-label="Nome do hábito">
      <button class="dias-hab" data-acao="habito-editar" data-id="${h.id}" title="Escolher dias e grupo">${ic('calendar', 'p')} ${textoDias(h)}</button>
    </td>
    ${dias.map((d) => {
      if (!valeNoDia(h, d)) return `<td><span class="nao-dia" title="Não é dia deste hábito"></span></td>`;
      const on = estado.diario[d]?.habitos.includes(h.id);
      return `<td><button class="bola ${on ? 'on' : ''} ${d === hoje ? 'hoje' : ''}" data-acao="habito-dia" data-id="${h.id}" data-dia="${d}" aria-label="Marcar ${dataCurta(d)}">${on ? ic('check') : ''}</button></td>`;
    }).join('')}
    <td>${h.meta > 0 ? `<span class="meta-sem ${feitosNaSemana(h, hoje) >= h.meta ? 'ok' : ''}" title="Feitos nesta semana">${feitosNaSemana(h, hoje)}/${h.meta} sem.</span>` : ''}
      ${seq ? `<span class="fogo" title="${h.meta > 0 ? 'semanas seguidas batendo a meta' : 'dias seguidos'}">${ic('flame')} ${seq}${h.meta > 0 ? ' sem' : ''}</span>` : h.meta > 0 ? '' : '<span style="color:var(--fraco)">—</span>'}</td>
    <td><button class="acao-item apagar" data-acao="habito-del" data-id="${h.id}" title="Apagar hábito">${ic('trash', 'p')}</button></td>
  </tr>
  ${editando ? `<tr class="linha-edicao"><td colspan="${dias.length + 3}">
    <div class="edicao-habito">
      <span class="rotulo-mini">Frequência</span>
      <div class="segmento">
        <button class="${!h.meta ? 'ativo' : ''}" data-acao="habito-modo" data-id="${h.id}" data-m="0">Dias certos</button>
        <button class="${h.meta ? 'ativo' : ''}" data-acao="habito-modo" data-id="${h.id}" data-m="3">Vezes por semana</button>
      </div>
      ${h.meta ? `<select data-mudar="habito-meta" data-id="${h.id}" aria-label="Vezes por semana">
          ${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${h.meta === n ? 'selected' : ''}>${n}x por semana</option>`).join('')}
        </select>`
        : `<div class="dias-semana">
          ${ORDEM_SEMANA.map((d) => `<button class="dia-chip ${!h.dias.length || h.dias.includes(d) ? 'on' : ''}" data-acao="habito-semana" data-id="${h.id}" data-d="${d}">${DIAS_SEMANA[d]}</button>`).join('')}
        </div>
        <button class="btn-mini" data-acao="habito-todo-dia" data-id="${h.id}">Todo dia</button>`}
      <span class="rotulo-mini">Categoria</span>
      <select data-mudar="habito-grupo" data-id="${h.id}" aria-label="Categoria">
        ${opcoesCategoria(h.grupo)}
      </select>
      <button class="btn" data-acao="habito-editar" data-id="${h.id}">${ic('check', 'p')} Pronto</button>
    </div>
  </td></tr>` : ''}`;
}

function htmlCalendarioRotina(hoje) {
  const base = paraData(hoje);
  base.setDate(1);
  base.setMonth(base.getMonth() + rotinaTela.mes);
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const nDias = new Date(ano, mes + 1, 0).getDate();
  const vazios = (new Date(ano, mes, 1).getDay() + 6) % 7;
  const iso = (d) => `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const passados = [];
  const celulas = [];
  for (let i = 0; i < vazios; i++) celulas.push('<div class="cal-vazio"></div>');
  for (let d = 1; d <= nDias; d++) {
    const dia = iso(d);
    const lista = habitosDoDia(dia);
    const futuro = dia > hoje;
    const pct = lista.length && !futuro ? feitosNoDia(dia, lista) / lista.length : 0;
    if (!futuro && lista.length) passados.push({ dia, pct });
    celulas.push(`<div class="cal-dia ${futuro ? 'futuro' : ''} ${dia === hoje ? 'hoje' : ''}"
      style="${pct ? `background:rgba(95,214,164,${0.15 + pct * 0.75});color:${pct > 0.6 ? '#10251c' : 'var(--texto)'}` : ''}"
      data-dica="${dataCurta(dia)} · ${futuro ? 'ainda não chegou' : lista.length ? `${feitosNoDia(dia, lista)} de ${lista.length} hábitos (${Math.round(pct * 100)}%)` : 'sem hábitos neste dia'}">${d}</div>`);
  }

  const completos = passados.filter((p) => p.pct === 1).length;
  const media = passados.length ? Math.round((passados.reduce((s, p) => s + p.pct, 0) / passados.length) * 100) : 0;

  const porSemana = {};
  passados.forEach((p) => { const w = paraData(p.dia).getDay(); (porSemana[w] = porSemana[w] || []).push(p.pct); });
  const melhor = Object.entries(porSemana).map(([w, v]) => [w, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1])[0];
  const nomeMes = base.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase()) + ' de ' + ano;

  return `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('calendar')}</span> Mês da rotina
      <span class="nav-mes">
        <button class="acao-item" data-acao="rotina-mes" data-d="-1" aria-label="Mês anterior">${ic('left', 'p')}</button>
        <span>${nomeMes}</span>
        <button class="acao-item" data-acao="rotina-mes" data-d="1" aria-label="Próximo mês" ${rotinaTela.mes >= 0 ? 'disabled' : ''}>${ic('right', 'p')}</button>
      </span></h2>
    <div class="cal-rotina">
      <div>
        <div class="cal-grade cal-cab">${ORDEM_SEMANA.map((d) => `<span>${DIAS_SEMANA[d].slice(0, 3)}</span>`).join('')}</div>
        <div class="cal-grade">${celulas.join('')}</div>
      </div>
      <div class="cal-lado">
        <p class="dica" style="margin-top:0">Cada quadradinho é um dia. A cor mostra quanto da rotina daquele dia você cumpriu: quanto mais verde, mais hábitos feitos. Passe o mouse para ver os números.</p>
        <div class="legenda-cal"><span>0%</span><i></i><span>100%</span></div>
        <div class="cal-numeros">
          <div><b>${media}%</b><span>média do mês</span></div>
          <div><b>${completos}</b><span>${completos === 1 ? 'dia completo' : 'dias completos'}</span></div>
          <div><b>${melhor && melhor[1] > 0 ? DIAS_SEMANA[melhor[0]] : '—'}</b><span>seu melhor dia</span></div>
        </div>
      </div>
    </div>
  </section>`;
}

PAGINAS.rotina = {
  titulo: 'Rotina diária',
  desenhar() {
    const hoje = hojeISO();
    const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6));
    const deHoje = habitosDoDia(hoje);
    const feitosHoje = feitosNoDia(hoje);
    const maiorSeq = Math.max(0, ...estado.habitos.map(sequencia));
    const possiveis = dias.reduce((s, d) => s + habitosDoDia(d).length, 0);
    const pctSemana = possiveis ? Math.round((dias.reduce((s, d) => s + feitosNoDia(d), 0) / possiveis) * 100) : 0;
    const grupos = gruposHabito();
    if (rotinaTela.grupo !== 'todos' && !grupos.includes(rotinaTela.grupo)) rotinaTela.grupo = 'todos';
    const gruposMostrar = rotinaTela.grupo === 'todos' ? grupos : [rotinaTela.grupo];

    const corpo = gruposMostrar.map((g) => {
      const hs = estado.habitos.filter((h) => h.grupo === g);
      if (!hs.length) return rotinaTela.grupo === 'todos' ? '' : `<tr><td colspan="${dias.length + 3}" class="vazio">Nenhum hábito em ${esc(g)} ainda.</td></tr>`;
      const hj = hs.filter((h) => !h.meta && valeNoDia(h, hoje));
      return `${rotinaTela.grupo === 'todos' ? `<tr class="grupo-linha"><td colspan="${dias.length + 3}">${esc(g)} <small>${feitosNoDia(hoje, hj)}/${hj.length} hoje</small></td></tr>` : ''}
        ${hs.map((h) => htmlLinhaHabito(h, dias, hoje)).join('')}`;
    }).join('');

    return `
    <div class="cab-pagina">
      <div><h1>Rotina diária</h1><p>Marque o que fez em cada dia. Tudo recomeça sozinho no dia seguinte.</p></div>
    </div>

    <div class="grade g3">
      <div class="card stat"><span class="selo c-verde">${ic('check')}</span>
        <div><b>${feitosHoje}/${deHoje.length}</b><span>feitos hoje</span></div></div>
      <div class="card stat"><span class="selo c-amarelo">${ic('flame')}</span>
        <div><b>${maiorSeq} ${maiorSeq === 1 ? 'dia' : 'dias'}</b><span>maior sequência atual</span></div></div>
      <div class="card stat"><span class="selo c-violeta">${ic('repeat')}</span>
        <div><b>${pctSemana}%</b><span>da rotina nos últimos 7 dias</span></div></div>
    </div>

    <section class="card" style="margin-bottom:16px">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('repeat')}</span> Meus hábitos</h2>
      <div class="chips">
        <button class="chip ${rotinaTela.grupo === 'todos' ? 'ativo' : ''}" data-acao="rotina-grupo" data-g="todos">Todos <b>${estado.habitos.length}</b></button>
        ${grupos.map((g) => `<button class="chip ${rotinaTela.grupo === g ? 'ativo' : ''}" data-acao="rotina-grupo" data-g="${esc(g)}">${esc(g)} <b>${estado.habitos.filter((h) => h.grupo === g).length}</b></button>`).join('')}
        ${rotinaTela.criandoGrupo
          ? `<form class="form-chip" data-form="grupo-novo"><input type="text" name="nome" id="grupo-nome" placeholder="Nome da categoria" maxlength="24"><button class="btn-mini" type="submit">Criar</button></form>`
          : `<button class="chip" data-acao="grupo-criar">${ic('plus', 'p')} Nova categoria</button>`}
        ${rotinaTela.grupo !== 'todos' && rotinaTela.grupo !== 'Geral' ? `<button class="chip" data-acao="grupo-del" data-g="${esc(rotinaTela.grupo)}" title="Excluir categoria (os hábitos vão para Geral)">${ic('trash', 'p')}</button>` : ''}
      </div>

      ${estado.habitos.length ? `<div class="tabela-rolavel">
        <table class="habitos">
          <thead><tr><th>Hábito</th>
            ${dias.map((d) => `<th class="${d === hoje ? 'hoje-col' : ''}">${DIAS_SEMANA[paraData(d).getDay()]}<br>${Number(d.slice(8))}</th>`).join('')}
            <th>Sequência</th><th></th></tr></thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>` : '<p class="vazio">Nenhum hábito ainda. Adicione o primeiro abaixo.</p>'}

      <form class="novo-habito" data-form="habito-novo">
        <input type="text" name="nome" id="habito-nome" placeholder="Novo hábito" maxlength="60" data-precisa>
        <select name="grupo" aria-label="Categoria" data-mudar="habito-cat-form">
          ${opcoesCategoria(rotinaTela.grupo === 'todos' ? 'Geral' : rotinaTela.grupo)}
        </select>
        <select name="meta" aria-label="Frequência">
          <option value="0">Nos dias marcados</option>
          ${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}">${n}x por semana</option>`).join('')}
        </select>
        <div class="dias-semana" title="Deixe todos desmarcados para todo dia">
          ${ORDEM_SEMANA.map((d) => `<label class="dia-chip"><input type="checkbox" name="d${d}" value="${d}">${DIAS_SEMANA[d]}</label>`).join('')}
        </div>
        <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
      </form>
      <p class="dica">Sem dias marcados, o hábito vale todos os dias. Os de "vezes por semana" podem ser feitos em qualquer dia e contam na semana.</p>
    </section>

    ${htmlCalendarioRotina(hoje)}`;
  },
};

function marcarHabito(id, dia) {
  const reg = registroDoDia(dia);
  const on = reg.habitos.includes(id);
  reg.habitos = on ? reg.habitos.filter((x) => x !== id) : [...reg.habitos, id];
  salvar(); desenhar();
  if (!on && dia === hojeISO() && feitosNoDia(dia) === habitosDoDia(dia).length) {
    tocarSom(true);
    avisar('Rotina de hoje completa!');
  }
}

ACOES['habito-dia'] = (el) => marcarHabito(el.dataset.id, el.dataset.dia);
ACOES['habito-hoje'] = (el) => marcarHabito(el.dataset.id, hojeISO());
ACOES['rotina-grupo'] = (el) => { rotinaTela.grupo = el.dataset.g; desenhar(); };
ACOES['rotina-mes'] = (el) => { rotinaTela.mes = Math.min(0, rotinaTela.mes + Number(el.dataset.d)); desenhar(); };
ACOES['habito-editar'] = (el) => { rotinaTela.editando = rotinaTela.editando === el.dataset.id ? null : el.dataset.id; desenhar(); };

ACOES['habito-semana'] = (el) => {
  const h = estado.habitos.find((x) => x.id === el.dataset.id);
  const d = Number(el.dataset.d);
  let dias = h.dias.length ? [...h.dias] : [0, 1, 2, 3, 4, 5, 6];
  dias = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d];
  if (!dias.length) return avisar('O hábito precisa valer em pelo menos um dia.');
  h.dias = dias.length === 7 ? [] : dias;
  salvar(); desenhar();
};
ACOES['habito-todo-dia'] = (el) => { estado.habitos.find((x) => x.id === el.dataset.id).dias = []; salvar(); desenhar(); };
MUDAR['habito-grupo'] = (el) => {
  if (el.value === '__nova') return ACOES['grupo-criar']();
  estado.habitos.find((x) => x.id === el.dataset.id).grupo = el.value; salvar(); desenhar();
};
MUDAR['habito-cat-form'] = (el) => { if (el.value === '__nova') ACOES['grupo-criar'](); };
MUDAR['habito-meta'] = (el) => { estado.habitos.find((x) => x.id === el.dataset.id).meta = Number(el.value); salvar(); desenhar(); };
ACOES['habito-modo'] = (el) => { estado.habitos.find((x) => x.id === el.dataset.id).meta = Number(el.dataset.m); salvar(); desenhar(); };

ACOES['grupo-criar'] = () => { rotinaTela.criandoGrupo = true; desenhar(); $('#grupo-nome')?.scrollIntoView({ block: 'center' }); $('#grupo-nome')?.focus(); };
FORMS['grupo-novo'] = (d) => {
  rotinaTela.criandoGrupo = false;
  const nome = d.nome || 'Nova categoria';
  if (!estado.config.gruposHabito.includes(nome)) estado.config.gruposHabito.push(nome);
  rotinaTela.grupo = nome;
  salvar(); desenhar();
};
ACOES['grupo-del'] = (el) => {
  const g = el.dataset.g;
  estado.habitos.forEach((h) => { if (h.grupo === g) h.grupo = 'Geral'; });
  estado.config.gruposHabito = estado.config.gruposHabito.filter((x) => x !== g);
  rotinaTela.grupo = 'todos';
  salvar(); desenhar();
  avisar(`Categoria ${g} excluída. Os hábitos foram para Geral.`);
};

DIGITAR['habito-nome'] = (el) => {
  const h = estado.habitos.find((x) => x.id === el.dataset.id);
  if (h) { h.nome = el.value.trim(); salvar(); }
};

FORMS['habito-novo'] = (d) => {
  const dias = [0, 1, 2, 3, 4, 5, 6].filter((x) => d['d' + x] !== undefined);
  const grupo = d.grupo && d.grupo !== '__nova' ? d.grupo : 'Geral';
  estado.habitos.push({ id: novoId(), nome: d.nome, grupo, dias: dias.length === 7 ? [] : dias, meta: Number(d.meta) || 0 });
  salvar(); desenhar();
  $('#habito-nome')?.focus();
};

ACOES['habito-del'] = (el) => removerComDesfazer(estado.habitos, el.dataset.id, 'Hábito');
