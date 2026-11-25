const retroTela = { tipo: 'mes', mes: null, ano: null };

function periodoRetro() {
  const hoje = hojeISO();
  if (retroTela.tipo === 'ano') {
    const ano = retroTela.ano || Number(hoje.slice(0, 4));
    const fim = `${ano}-12-31` < hoje ? `${ano}-12-31` : hoje;
    return { ini: `${ano}-01-01`, fim, nome: String(ano), curto: `${ano}` };
  }
  const padrao = (() => { const d = paraData(hoje); return d.getDate() <= 5 ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : new Date(d.getFullYear(), d.getMonth(), 1); })();
  const m = retroTela.mes || `${padrao.getFullYear()}-${String(padrao.getMonth() + 1).padStart(2, '0')}`;
  const [a, mm] = m.split('-').map(Number);
  const ult = new Date(a, mm, 0).getDate();
  const fimMes = `${m}-${String(ult).padStart(2, '0')}`;
  return { ini: `${m}-01`, fim: fimMes < hoje ? fimMes : hoje, nome: `${MESES_LONGOS[mm - 1]} de ${a}`, curto: MESES_LONGOS[mm - 1].toLowerCase(), mes: m };
}

function diasEntre(ini, fim) {
  const r = [];
  for (let d = ini; d <= fim; d = somarDias(d, 1)) r.push(d);
  return r;
}

function dadosRetro() {
  const { ini, fim } = periodoRetro();
  const dias = diasEntre(ini, fim);
  const no = (d) => d && d >= ini && d <= fim;
  const r = { dias: dias.length };

  r.tarefas = estado.tarefas.filter((t) => t.feito && no(t.feitoEm || t.data)).length
    + estado.listas.filter((l) => l.tipo === 'cursos').flatMap((l) => l.materias.flatMap((m) => m.tarefas)).filter((t) => t.feito && no(t.feitoEm)).length;

  let possiveis = 0, feitos = 0, diasCompletos = 0;
  const contaHab = {};
  dias.forEach((d) => {
    const hs = habitosDoDia(d);
    const f = feitosNoDia(d);
    possiveis += hs.length; feitos += f;
    if (hs.length && f >= hs.length) diasCompletos++;
    (estado.diario[d]?.habitos || []).forEach((id) => { contaHab[id] = (contaHab[id] || 0) + 1; });
  });
  r.rotinaPct = possiveis ? Math.round((feitos / possiveis) * 100) : 0;
  r.diasCompletos = diasCompletos;
  r.habitosTop = Object.entries(contaHab).map(([id, n]) => [estado.habitos.find((h) => h.id === id)?.nome, n]).filter(([n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const aguas = dias.map((d) => estado.diario[d]?.agua || 0);
  r.aguaMedia = aguas.reduce((a, b) => a + b, 0) / (dias.length || 1);
  r.aguaMeta = aguas.filter((v) => v >= (estado.config.metaAgua || 8)).length;

  const humores = {};
  dias.forEach((d) => { const h = estado.diario[d]?.humor; if (h) humores[h] = (humores[h] || 0) + 1; });
  r.humores = humores;
  r.humorTop = Object.entries(humores).sort((a, b) => b[1] - a[1])[0]?.[0];

  const sonos = dias.map((d) => horasSono(estado.diario[d]?.sono)).filter(Boolean);
  r.sonoMedia = sonos.length ? sonos.reduce((a, b) => a + b, 0) / sonos.length : 0;

  r.pomodoros = dias.reduce((s, d) => s + (estado.diario[d]?.pomodoros || 0), 0);
  const estudo = {};
  dias.forEach((d) => Object.entries(estado.diario[d]?.estudo || {}).forEach(([ref, min]) => { estudo[ref] = (estudo[ref] || 0) + min; }));
  r.estudoMin = dias.reduce((s, d) => s + minutosEstudoDia(d), 0);
  // Aulas avulsas com tema digitado no Foco aparecem com o nome do tema
  dias.forEach((d) => (estado.diario[d]?.sessoes || []).forEach((x) => { if (!x.ref && x.tema) estudo['tema:' + x.tema] = (estudo['tema:' + x.tema] || 0) + (x.min || 0); }));
  const semMateria = r.estudoMin - Object.values(estudo).reduce((a, b) => a + b, 0);
  if (semMateria > 0) estudo[''] = semMateria;
  r.estudoTop = Object.entries(estudo).map(([ref, min]) => [ref.startsWith('tema:') ? ref.slice(5) : ref ? nomeMateria(ref) || 'Outros' : 'Sem matéria', min]).sort((a, b) => b[1] - a[1]).slice(0, 3);

  r.melhorDia = melhorDiaSemana(dias);

  const colecoes = {};
  estado.listas.filter((l) => l.tipo === 'colecoes').forEach((l) => l.categorias.forEach((c) => {
    const n = c.itens.filter((i) => i.feito && no(i.feitoEm)).length;
    if (n) colecoes[c.nome] = (colecoes[c.nome] || 0) + n;
  }));
  r.colecoes = colecoes;
  r.etapas = estado.listas.filter((l) => l.tipo === 'metas').flatMap((l) => l.metas.flatMap((m) => m.etapas)).filter((e) => e.feito && no(e.feitoEm)).length;

  if (temModulo('treino')) {
    const t = estado.treino || {};
    const ses = (t.sessoes || []).filter((s) => no(s.data));
    const cor = (t.corridas || []).filter((c) => no(c.data));
    r.treinos = ses.length;
    r.treinoMin = Math.round((ses.reduce((a, s) => a + s.dur, 0) + cor.reduce((a, c) => a + c.tempo, 0)) / 60);
    r.km = cor.reduce((a, c) => a + c.km, 0);
    r.corridas = cor.length;
    r.diasAtivos = new Set([...ses, ...cor].map((x) => x.data)).size;
  }
  if (temModulo('jejum')) {
    const cs = (estado.jejum?.ciclos || []).filter((c) => no(diaDoCiclo(c)));
    r.jejuns = cs.length;
    r.jejunsOk = cs.filter(cicloCompleto).length;
    r.jejumMedia = cs.length ? cs.reduce((a, c) => a + horasCiclo(c), 0) / cs.length : 0;
  }
  if (temModulo('apps')) {
    r.apps = (estado.appsEstudo?.lista || []).map((a) => [a.nome, dias.reduce((s, d) => s + feitosApp(d, a.id), 0), a.unidade || 'lições', a.cor]).filter(([, n]) => n);
  }
  if (temModulo('pets')) {
    const at = (estado.pets?.atividades || []).filter((a) => no(a.data));
    r.passeios = at.filter((a) => a.tipo === 'passeio').length;
    r.brincadeiras = at.filter((a) => a.tipo === 'brincadeira').length;
  }
  return r;
}


PAGINAS.retrospectiva = {
  titulo: 'Retrospectiva',
  async depois() {
    const { ini, fim } = periodoRetro();
    const a = await carregarListaDiario();
    const b = await carregarDiario(ini, fim);
    if ((a || b) && location.hash === '#retrospectiva') desenharSeguro();
  },
  desenhar() {
    const p = periodoRetro();
    const r = dadosRetro();
    const humorNome = r.humorTop ? HUMORES.find((h) => h.id === r.humorTop)?.nome : '';
    const destaques = [
      r.tarefas && ['check', 'c-violeta', r.tarefas, r.tarefas === 1 ? 'tarefa concluída' : 'tarefas concluídas'],
      r.rotinaPct && ['repeat', 'c-verde', `${r.rotinaPct}%`, 'da rotina cumprida'],
      r.estudoMin && ['book', 'c-azul', textoMinutos(r.estudoMin), 'de estudo'],
      r.treinoMin && ['gym', 'c-vermelho', textoMinutos(r.treinoMin), 'de treino'],
      r.km && ['flame', 'c-amarelo', `${fmtNum(r.km)} km`, 'corridos'],
      r.melhorDia && ['flag', 'c-rosa', r.melhorDia.nome, `seu melhor dia · ${r.melhorDia.pct}% cumprido`],
      r.jejunsOk && ['timer', 'c-verde', r.jejunsOk, r.jejunsOk === 1 ? 'jejum completo' : 'jejuns completos'],
      r.pomodoros && ['timer', 'c-rosa', r.pomodoros, r.pomodoros === 1 ? 'ciclo de foco' : 'ciclos de foco'],
    ].filter(Boolean);
    const card = (icone, cor, titulo, corpo) => `<section class="card retro-card"><h2 class="card-titulo"><span class="selo mini ${cor}">${ic(icone)}</span> ${titulo}</h2>${corpo}</section>`;
    const linhas = (arr, fmt) => `<div class="retro-linhas">${arr.map(([n, v, ...x]) => `<div><span>${esc(n)}</span><b>${fmt(v, ...x)}</b></div>`).join('')}</div>`;
    const totHum = Object.values(r.humores).reduce((a, b) => a + b, 0);
    const cards = [
      card('repeat', 'c-verde', 'Rotina', `<p class="retro-num">${r.rotinaPct}%</p><p class="dica">${r.diasCompletos} ${r.diasCompletos === 1 ? 'dia' : 'dias'} com tudo feito</p>${r.habitosTop.length ? `<p class="retro-sub">Mais feitos</p>${linhas(r.habitosTop, (v) => `${v}×`)}` : ''}`),
      totHum ? card('heart', 'c-amarelo', 'Humor', `<p class="retro-num">${esc(humorNome || '')}</p><p class="dica">o que mais apareceu</p>
        <div class="retro-humor">${HUMORES.map((h) => `<div title="${h.nome}: ${r.humores[h.id] || 0}"><svg><use href="#i-${h.id}"/></svg><span style="height:${Math.round(((r.humores[h.id] || 0) / totHum) * 100)}%"></span><small>${r.humores[h.id] || 0}</small></div>`).join('')}</div>`) : '',
      card('drop', 'c-azul', 'Água e sono', `<div class="retro-duplo"><div><p class="retro-num">${fmtNum(r.aguaMedia)}</p><p class="dica">copos por dia · meta batida em ${r.aguaMeta} ${r.aguaMeta === 1 ? 'dia' : 'dias'}</p></div>
        <div><p class="retro-num">${r.sonoMedia ? textoHoras(r.sonoMedia) : '—'}</p><p class="dica">de sono, em média</p></div></div>`),
      (r.estudoMin || r.pomodoros) ? card('book', 'c-azul', 'Estudos', `<p class="retro-num">${textoMinutos(r.estudoMin)}</p><p class="dica">${r.pomodoros} ${r.pomodoros === 1 ? 'ciclo' : 'ciclos'} de foco</p>${r.estudoTop.length ? `<p class="retro-sub">Mais estudado</p>${linhas(r.estudoTop, (v) => textoMinutos(v))}` : ''}`) : '',
      r.apps?.length ? card('code', 'c-azul', 'Apps de estudo', linhas(r.apps.map(([n, v, u]) => [n, v, u]), (v, u) => `${v} ${esc(u)}`)) : '',
      (r.treinos || r.corridas) ? card('gym', 'c-vermelho', 'Treino', `<div class="retro-duplo"><div><p class="retro-num">${r.treinos}</p><p class="dica">${r.treinos === 1 ? 'treino' : 'treinos'} · ${textoMinutos(r.treinoMin)}</p></div>
        <div><p class="retro-num">${fmtNum(r.km)} km</p><p class="dica">em ${r.corridas} ${r.corridas === 1 ? 'corrida' : 'corridas'}</p></div></div><p class="dica">${r.diasAtivos} ${r.diasAtivos === 1 ? 'dia ativo' : 'dias ativos'}</p>`) : '',
      r.jejuns ? card('timer', 'c-verde', 'Jejum', `<p class="retro-num">${r.jejunsOk}/${r.jejuns}</p><p class="dica">ciclos completos · média de ${fmtHoras(r.jejumMedia)}</p>`) : '',
      (r.passeios || r.brincadeiras) ? card('paw', 'c-amarelo', 'Pets', `<div class="retro-duplo"><div><p class="retro-num">${r.passeios}</p><p class="dica">passeios</p></div><div><p class="retro-num">${r.brincadeiras}</p><p class="dica">brincadeiras</p></div></div>`) : '',
      (Object.keys(r.colecoes).length || r.etapas) ? card('star', 'c-amarelo', 'Conquistas', `${Object.keys(r.colecoes).length ? linhas(Object.entries(r.colecoes), (v) => `${v} ${v === 1 ? 'item' : 'itens'}`) : ''}${r.etapas ? `<p class="dica">${r.etapas} ${r.etapas === 1 ? 'etapa de meta concluída' : 'etapas de metas concluídas'}</p>` : ''}`) : '',
    ].filter(Boolean);
    const hoje = hojeISO();
    const anoAtual = Number(hoje.slice(0, 4));
    return `
    <div class="cab-pagina">
      <div><h1>Retrospectiva</h1><p>Um resumo de tudo o que você fez.</p></div>
      <div class="segmento"><button class="${retroTela.tipo === 'mes' ? 'ativo' : ''}" data-acao="retro-tipo" data-t="mes">Mês</button><button class="${retroTela.tipo === 'ano' ? 'ativo' : ''}" data-acao="retro-tipo" data-t="ano">Ano</button></div>
    </div>
    <section class="card retro-capa">
      <div class="retro-nav">
        <button class="btn-icone" data-acao="retro-mover" data-v="-1" aria-label="Anterior">${ic('left')}</button>
        <div><small>${esc(estado.config.nome || '')}${estado.config.nome ? ', este foi seu' : 'Seu'} ${retroTela.tipo === 'ano' ? 'ano' : 'mês'}</small><h2>${p.nome}</h2></div>
        <button class="btn-icone" data-acao="retro-mover" data-v="1" aria-label="Próximo" ${(retroTela.tipo === 'ano' ? (retroTela.ano || anoAtual) >= anoAtual : (p.mes || '') >= hoje.slice(0, 7)) ? 'disabled' : ''}>${ic('right')}</button>
      </div>
      ${destaques.length ? `<div class="retro-destaques">${destaques.map(([i, c, v, t]) => `<div><span class="selo ${c}">${ic(i)}</span><b>${v}</b><small>${t}</small></div>`).join('')}</div>`
        : '<p class="dica" style="text-align:center">Ainda não tem registros nesse período.</p>'}
      ${destaques.length ? `<div style="text-align:center;margin-top:14px"><button class="btn sec" data-acao="retro-copiar">${ic('save', 'p')} Copiar resumo</button></div>` : ''}
    </section>
    <div class="grade-retro">${cards.join('')}</div>`;
  },
};

ACOES['retro-tipo'] = (el) => { retroTela.tipo = el.dataset.t; desenhar(); };
ACOES['retro-mover'] = (el) => {
  const v = Number(el.dataset.v);
  const p = periodoRetro();
  if (retroTela.tipo === 'ano') retroTela.ano = Number(p.ini.slice(0, 4)) + v;
  else { const [a, m] = p.mes.split('-').map(Number); const d = new Date(a, m - 1 + v, 1); retroTela.mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  desenhar();
};
ACOES['retro-copiar'] = async () => {
  const p = periodoRetro();
  const r = dadosRetro();
  const linhas = [`Minha retrospectiva · ${p.nome}`,
    r.tarefas && `✅ ${r.tarefas} tarefas concluídas`, r.rotinaPct && `🔁 ${r.rotinaPct}% da rotina cumprida`,
    r.estudoMin && `📚 ${textoMinutos(r.estudoMin)} de estudo`, r.treinos && `💪 ${r.treinos} treinos`, r.km && `🏃 ${fmtNum(r.km)} km corridos`,
    r.jejunsOk && `⏱️ ${r.jejunsOk} jejuns completos`, r.melhorDia && `🏆 Melhor dia: ${r.melhorDia.nome} (${r.melhorDia.pct}% cumprido)`,
    ...(r.apps || []).map(([n, v, u]) => `📱 ${v} ${u} no ${n}`)].filter(Boolean);
  try { await navigator.clipboard.writeText(linhas.join('\n')); avisar('Resumo copiado. É só colar onde quiser.'); }
  catch { avisar('Não consegui copiar automaticamente.'); }
};
