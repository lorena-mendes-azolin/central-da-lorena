const revTela = { semana: null };

function semanaDaRevisao() {
  return revTela.semana || segundaDaSemana(hojeISO());
}

PAGINAS.revisao = {
  titulo: 'Revisão da semana',
  async depois() {
    const ini = semanaDaRevisao();
    if (await carregarDiario(ini, somarDias(ini, 6)) && location.hash === '#revisao') desenharSeguro();
  },
  desenhar() {
    const ini = semanaDaRevisao();
    const fim = somarDias(ini, 6);
    const dias = Array.from({ length: 7 }, (_, i) => somarDias(ini, i));
    const hoje = hojeISO();
    const naSemana = (d) => d && d >= ini && d <= fim;
    const rev = estado.revisoes[ini] || {};

    const feitas = estado.tarefas.filter((t) => t.feito && naSemana(t.feitoEm || t.data));
    const feitasMat = estado.listas.filter((l) => l.tipo === 'cursos')
      .flatMap((l) => l.materias.flatMap((m) => m.tarefas.filter((t) => t.feito && naSemana(t.feitoEm)).map((t) => ({ ...t, materia: m.nome }))));
    const paraTras = estado.tarefas.filter((t) => !t.feito && naSemana(t.data) && t.data < hoje);

    const diasPassados = dias.filter((d) => d <= hoje);
    const possiveis = diasPassados.reduce((s, d) => s + habitosDoDia(d).length, 0);
    const pctRotina = possiveis ? Math.round((diasPassados.reduce((s, d) => s + feitosNoDia(d), 0) / possiveis) * 100) : 0;
    const porHabito = estado.habitos.map((h) => {
      const valem = diasPassados.filter((d) => valeNoDia(h, d));
      const n = valem.filter((d) => estado.diario[d]?.habitos.includes(h.id)).length;
      const esperado = h.meta > 0 ? h.meta : valem.length;
      return { nome: h.nome, pct: esperado ? Math.min(1, n / esperado) : 0, n, esperado };
    }).filter((h) => h.esperado);
    const melhor = [...porHabito].sort((a, b) => b.pct - a.pct)[0];
    const pior = [...porHabito].sort((a, b) => a.pct - b.pct)[0];

    const estudo = {};
    dias.forEach((d) => Object.entries(estado.diario[d]?.estudo || {}).forEach(([ref, min]) => { estudo[ref] = (estudo[ref] || 0) + min; }));
    const totalEstudo = dias.reduce((s, d) => s + minutosEstudoDia(d), 0);
    const semMateria = totalEstudo - Object.values(estudo).reduce((a, b) => a + b, 0);
    if (semMateria > 0) estudo[''] = semMateria;
    const melhorDia = melhorDiaSemana(dias);

    const regs = dias.map((d) => estado.diario[d] || {});
    const mediaAgua = regs.reduce((s, r) => s + (r.agua || 0), 0) / Math.max(1, diasPassados.length);
    const sonos = regs.map((r) => horasSono(r.sono)).filter(Boolean);
    const mediaSono = sonos.length ? sonos.reduce((a, b) => a + b, 0) / sonos.length : 0;
    const coisasBoas = dias.flatMap((d) => (lerDiario(d).bom || []).filter(Boolean).map((b) => ({ d, b })));
    const focos = regs.reduce((s, r) => s + (r.pomodoros || 0), 0);

    const atual = ini === segundaDaSemana(hoje);

    return `
    <div class="cab-pagina">
      <div><h1>Revisão da semana</h1><p>Olhe para trás com carinho e escolha o foco da próxima semana.</p></div>
    </div>
    <div class="barra-mes">
      <button class="btn-icone" data-acao="rev-semana" data-n="-1" aria-label="Semana anterior">${ic('left')}</button>
      <h2>${ini.slice(8)}/${ini.slice(5, 7)} a ${fim.slice(8)}/${fim.slice(5, 7)}${atual ? ' · esta semana' : ''}</h2>
      <button class="btn-icone" data-acao="rev-semana" data-n="1" aria-label="Próxima semana" ${atual ? 'disabled' : ''}>${ic('right')}</button>
    </div>

    <div class="grade g4">
      <div class="card stat"><span class="selo c-verde">${ic('check')}</span><div><b>${feitas.length + feitasMat.length}</b><span>tarefas concluídas</span></div></div>
      <div class="card stat"><span class="selo c-violeta">${ic('repeat')}</span><div><b>${pctRotina}%</b><span>da rotina cumprida</span></div></div>
      <div class="card stat"><span class="selo c-rosa">${ic('timer')}</span><div><b>${textoMinutos(totalEstudo)}</b><span>de estudo · ${focos} ${focos === 1 ? 'ciclo' : 'ciclos'} de foco</span></div></div>
      <div class="card stat"><span class="selo c-amarelo">${ic('flag')}</span><div><b>${melhorDia ? melhorDia.nome : '—'}</b><span>${melhorDia ? `melhor dia · ${melhorDia.pct}% do previsto feito` : 'melhor dia (ainda sem dados)'}</span></div></div>
    </div>

    <div class="grade g2">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('check')}</span> O que você fez</h2>
        <div class="lista-rolavel" style="max-height:300px">
          ${[...feitas.map((t) => `<div class="item feito"><span class="check on">${ic('check')}</span><span class="txt">${esc(t.titulo)}</span></div>`),
            ...feitasMat.map((t) => `<div class="item feito"><span class="check on">${ic('check')}</span><span class="txt">${esc(t.titulo)}<span class="sub">${esc(t.materia)}</span></span></div>`)].join('')
            || '<p class="vazio">Nenhuma tarefa concluída nesta semana.</p>'}
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('alert')}</span> Ficou para trás
          ${paraTras.length ? `<a href="#" data-acao="rev-adiar-todas">Passar todas para a próxima semana</a>` : ''}</h2>
        ${paraTras.map((t) => `<div class="item atrasado">
          <span class="txt">${esc(t.titulo)}<span class="sub">era para ${dataCurta(t.data)}</span></span>
          <button class="btn-mini" data-acao="tarefa-hoje" data-id="${t.id}">Hoje</button>
          <button class="btn-mini" data-acao="rev-adiar" data-id="${t.id}">Próx. semana</button>
          <button class="acao-item apagar" data-acao="tarefa-del" data-id="${t.id}" title="Apagar">${ic('trash', 'p')}</button>
        </div>`).join('') || '<p class="vazio">Nada atrasado. Muito bem!</p>'}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('repeat')}</span> Rotina e corpo</h2>
        <div class="cal-numeros" style="margin-bottom:14px">
          <div><b>${mediaSono ? textoHoras(mediaSono) : '—'}</b><span>sono médio</span></div>
          <div><b>${fmtNum(mediaAgua)}</b><span>copos de água por dia</span></div>
          <div><b>${coisasBoas.length}</b><span>coisas boas anotadas</span></div>
        </div>
        ${melhor ? `<p style="margin:0 0 6px">${ic('flame', 'p')} Mais constante: <b>${esc(melhor.nome)}</b> (${Math.min(melhor.n, melhor.esperado)} de ${melhor.esperado}${melhor.n > melhor.esperado ? ', passou da meta' : ''})</p>` : ''}
        ${pior && pior !== melhor && pior.pct < 1 ? `<p style="margin:0 0 6px">${ic('alert', 'p')} Precisa de atenção: <b>${esc(pior.nome)}</b> (${pior.n} de ${pior.esperado})</p>` : ''}
        <div class="semana-humor" style="margin-top:14px">
          ${dias.map((d) => { const hm = estado.diario[d]?.humor; return `<div>${hm ? `<svg class="ic" style="color:var(--amarelo)"><use href="#i-${hm}"/></svg>` : '<span class="ponto"></span>'}${DIAS_SEMANA[paraData(d).getDay()]}</div>`; }).join('')}
        </div>
        ${totalEstudo ? `<h3 class="sub-titulo">Estudo por matéria</h3>
          ${Object.entries(estudo).sort((a, b) => b[1] - a[1]).map(([ref, min]) => `<div class="item"><span class="txt">${esc(ref ? nomeMateria(ref) || 'Matéria apagada' : 'Sem matéria')}</span><b>${textoMinutos(min)}</b></div>`).join('')}` : ''}
        ${coisasBoas.length ? `<h3 class="sub-titulo">Coisas boas da semana</h3>
          ${coisasBoas.map((c) => `<p class="coisa-boa">${ic('sparkle', 'p')} ${esc(c.b)} <small>${DIAS_SEMANA[paraData(c.d).getDay()]}</small></p>`).join('')}` : ''}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('note')}</span> Reflexão</h2>
        ${[['certo', 'O que deu certo?'], ['melhorar', 'O que posso melhorar?'], ['foco', 'Qual o meu foco para a próxima semana?']].map(([k, n]) => `<label class="campo" style="margin-bottom:12px">${n}
          <textarea data-digitar="rev-campo" data-semana="${ini}" data-k="${k}" rows="3">${esc(rev[k] || '')}</textarea></label>`).join('')}
        ${atual ? '' : ''}
      </section>
    </div>`;
  },
};

ACOES['rev-semana'] = (el) => {
  const n = somarDias(semanaDaRevisao(), Number(el.dataset.n) * 7);
  revTela.semana = n > segundaDaSemana(hojeISO()) ? null : n;
  desenhar();
};
DIGITAR['rev-campo'] = (el) => {
  estado.revisoes[el.dataset.semana] = { ...(estado.revisoes[el.dataset.semana] || {}), [el.dataset.k]: el.value };
  salvar();
};
function adiarUmaSemana(t) {

  const seg = somarDias(segundaDaSemana(hojeISO()), 7);
  t.data = somarDias(seg, (paraData(t.data).getDay() + 6) % 7);
}
ACOES['rev-adiar'] = (el) => {
  const t = estado.tarefas.find((x) => x.id === el.dataset.id);
  adiarUmaSemana(t);
  salvar(); desenhar();
  avisar(`Passada para ${dataCurta(t.data)}.`);
};
ACOES['rev-adiar-todas'] = () => {
  const ini = semanaDaRevisao();
  const hoje = hojeISO();
  const lista = estado.tarefas.filter((t) => !t.feito && t.data >= ini && t.data <= somarDias(ini, 6) && t.data < hoje);
  lista.forEach(adiarUmaSemana);
  salvar(); desenhar();
  avisar(`${lista.length} ${lista.length === 1 ? 'tarefa passada' : 'tarefas passadas'} para a próxima semana.`);
};
