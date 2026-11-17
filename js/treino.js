const treinoTela = { aba: 'hoje', grupo: '', equip: '', busca: '', wizard: null, previa: null, picker: null, escolha: '', criando: null, mesHist: hojeISO().slice(0, 7) };

function dadosTreino() {
  estado.treino = estado.treino || {};
  const t = estado.treino;
  t.meus = t.meus || [];
  t.fichas = t.fichas || [];
  t.sessoes = t.sessoes || [];
  t.corridas = t.corridas || [];
  t.videos = t.videos || {};
  if (!t.diasMeta) t.diasMeta = 3;
  return t;
}

const fmtSeg = (s) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
const fmtDur = (s) => textoMinutos(Math.max(1, Math.round(s / 60)));

function duracaoItem(i) {
  const e = exercicioPorId(i.ex);
  const trabalho = e?.tipo === 'tempo' ? (Number(i.seg) || 30) : (Number(i.reps) || 10) * 3.5;
  const series = Number(i.series) || 1;
  return series * trabalho + Math.max(0, series - 1) * (Number(i.descanso) || 0) + 35;
}
const duracaoFicha = (f) => f.itens.reduce((s, i) => s + duracaoItem(i), 0);
const textoCarga = (i, e) => (e?.tipo === 'tempo' ? `${i.series}× ${i.seg}s` : `${i.series}× ${i.reps}`);

function itemDe(exId, extra = {}) {
  const e = exercicioPorId(exId);
  const p = e?.padrao || { series: 3, reps: 12, descanso: 45 };
  return { id: novoId(), ex: exId, series: p.series, reps: p.reps || 12, seg: p.seg || 30, descanso: p.descanso, carga: '', ...extra };
}

function fichasDoDia(iso) {
  const d = paraData(iso).getDay();
  return dadosTreino().fichas.filter((f) => f.dias.includes(d));
}
const treinouNoDia = (iso) => dadosTreino().sessoes.some((s) => s.data === iso) || dadosTreino().corridas.some((c) => c.data === iso);

function treinosNaSemana(seg) {
  const fim = somarDias(seg, 6);
  const dias = new Set([...dadosTreino().sessoes, ...dadosTreino().corridas].filter((s) => s.data >= seg && s.data <= fim).map((s) => s.data));
  return dias.size;
}
function semanasSeguidasTreino() {
  const t = dadosTreino();
  let seg = segundaDaSemana(hojeISO());
  let n = treinosNaSemana(seg) >= t.diasMeta ? 1 : 0;
  for (let i = 0; i < 104; i++) {
    seg = somarDias(seg, -7);
    if (treinosNaSemana(seg) >= t.diasMeta) n++;
    else break;
  }
  return n;
}

function idYoutube(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : '';
}
const buscaYoutube = (e) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`como fazer ${e.nome} exercício em casa execução correta`)}`;

function htmlVideo(e, compacto = false) {
  const url = dadosTreino().videos[e.id] || e.video || '';
  const yt = idYoutube(url);
  if (yt) return `<div class="video-ex ${compacto ? 'compacto' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="Vídeo: ${esc(e.nome)}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  if (url) return `<a class="video-vazio" href="${esc(url)}" target="_blank" rel="noopener">${ic('play')}<b>Abrir o vídeo</b><small>link salvo</small></a>`;
  return `<a class="video-vazio" href="${buscaYoutube(e)}" target="_blank" rel="noopener">${ic('play')}<b>Ver como fazer no YouTube</b><small>Achou um vídeo bom? Cole o link no exercício e ele passa a aparecer aqui.</small></a>`;
}

function htmlTagEx(e) {
  const g = GRUPOS_TREINO[e.grupo] || { nome: e.grupo, cor: '#a5a3c8' };
  return `<span class="tag"><i style="background:${g.cor}"></i>${g.nome}</span>`;
}

PAGINAS.treino = {
  titulo: 'Treino',
  desenhar() {
    const t = dadosTreino();
    if (t.ativo) return htmlPlayer();
    const abas = [['hoje', 'sun', 'Hoje'], ['plano', 'list', 'Meu plano'], ['exercicios', 'gym', 'Exercícios'], ['corrida', 'flame', 'Corrida'], ['historico', 'chart', 'Histórico']];
    const conteudo = { hoje: htmlTreinoHoje, plano: htmlPlano, exercicios: htmlBiblioteca, corrida: htmlCorrida, historico: htmlHistTreino }[treinoTela.aba]();
    return `
    <div class="cab-pagina">
      <div><h1>Treino</h1><p>Seu plano de exercícios em casa, com séries, descanso cronometrado e corrida.</p></div>
      <div class="cab-acoes"><button class="btn" data-acao="treino-wizard">${ic('sparkle', 'p')} Monte seu treino</button></div>
    </div>
    <div class="segmento abas-treino">${abas.map(([id, i, n]) => `<button class="${treinoTela.aba === id ? 'ativo' : ''}" data-acao="treino-aba" data-a="${id}">${ic(i, 'p')} ${n}</button>`).join('')}</div>
    ${treinoTela.wizard ? htmlWizard() : ''}
    ${conteudo}`;
  },
};

ACOES['treino-aba'] = (el) => { treinoTela.aba = el.dataset.a; treinoTela.picker = null; desenhar(); };

function htmlTreinoHoje() {
  const t = dadosTreino();
  const hoje = hojeISO();
  const seg = segundaDaSemana(hoje);
  const feitosSemana = treinosNaSemana(seg);
  const mes = hoje.slice(0, 7);
  const minMes = t.sessoes.filter((s) => s.data.startsWith(mes)).reduce((a, s) => a + s.dur, 0) / 60
    + t.corridas.filter((c) => c.data.startsWith(mes)).reduce((a, c) => a + c.tempo, 0) / 60;
  const kmMes = t.corridas.filter((c) => c.data.startsWith(mes)).reduce((a, c) => a + c.km, 0);
  const deHoje = fichasDoDia(hoje);
  const feitaHoje = t.sessoes.filter((s) => s.data === hoje);

  if (!t.fichas.length) {
    return `<section class="card vazio-grande">
      <span class="selo c-vermelho">${ic('gym')}</span>
      <h2>Vamos montar seu treino?</h2>
      <p class="vazio">Escolha seu objetivo, quantos dias por semana e o tempo que tem. Eu sugiro os exercícios e você ajusta do seu jeito.</p>
      <div class="form-linha" style="justify-content:center">
        <button class="btn" data-acao="treino-wizard">${ic('sparkle', 'p')} Monte seu treino</button>
        <button class="btn sec" data-acao="ficha-nova">Montar do zero</button>
      </div>
    </section>`;
  }

  const semana = ORDEM_SEMANA.map((d, k) => {
    const iso = somarDias(seg, k);
    const fs = t.fichas.filter((f) => f.dias.includes(d));
    const ok = treinouNoDia(iso);
    return `<div class="dia-treino ${iso === hoje ? 'hoje' : ''} ${ok ? 'ok' : ''} ${!fs.length ? 'folga' : ''}">
      <small>${DIAS_SEMANA[d]}</small>
      <span class="bolinha-treino">${ok ? ic('check') : Number(iso.slice(8))}</span>
      <em>${fs.length ? esc(fs.map((f) => f.nome.replace(/^Treino /, '')).join(' + ')) : 'folga'}</em>
    </div>`;
  }).join('');

  const cardFicha = (f) => `<section class="card ficha-hoje">
      <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('gym')}</span> ${esc(f.nome)}
        <span class="dica" style="margin-left:auto;font-weight:600">${f.itens.length} exercícios · ~${fmtDur(duracaoFicha(f))}</span></h2>
      <div class="lista-rolavel ficha-resumo">
        ${f.itens.map((i, k) => { const e = exercicioPorId(i.ex); return e ? `<div class="item">
          <span class="num-ex">${k + 1}</span><span class="txt">${esc(e.nome)}<span class="sub">${textoCarga(i, e)}${i.carga ? ` · ${esc(i.carga)}` : ''} · descanso ${i.descanso}s</span></span>${htmlTagEx(e)}
          <button class="acao-item" data-acao="ex-ver" data-id="${e.id}" title="Como fazer">${ic('play', 'p')}</button></div>` : ''; }).join('')}
      </div>
      <div class="form-linha" style="justify-content:flex-end;margin-top:12px">
        <button class="btn" data-acao="treino-iniciar" data-id="${f.id}" ${f.itens.length ? '' : 'disabled'}>${ic('play', 'p')} Começar treino</button>
      </div>
    </section>`;

  const outras = t.fichas.filter((f) => !deHoje.includes(f));
  return `
  <div class="grade g4" style="margin-top:16px">
    <div class="card stat"><span class="selo c-vermelho">${ic('gym')}</span><div><b>${feitosSemana}/${t.diasMeta}</b><span>dias de treino na semana</span></div></div>
    <div class="card stat"><span class="selo c-amarelo">${ic('flame')}</span><div><b>${semanasSeguidasTreino()}</b><span>${semanasSeguidasTreino() === 1 ? 'semana cumprindo a meta' : 'semanas cumprindo a meta'}</span></div></div>
    <div class="card stat"><span class="selo c-violeta">${ic('clock')}</span><div><b>${textoMinutos(Math.round(minMes))}</b><span>treinando este mês</span></div></div>
    <div class="card stat"><span class="selo c-azul">${ic('flame')}</span><div><b>${fmtNum(kmMes)} km</b><span>corridos este mês</span></div></div>
  </div>
  <section class="card semana-treino-card"><div class="semana-treino">${semana}</div></section>
  ${feitaHoje.length ? `<div class="alerta convite">${ic('check')}<span><b>Treino de hoje feito!</b> ${feitaHoje.map((s) => `${esc(s.nome)} em ${fmtDur(s.dur)}`).join(', ')}.</span></div>` : ''}
  ${deHoje.length ? deHoje.map(cardFicha).join('') : `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('moon')}</span> Hoje é dia de descanso</h2>
    <p class="dica" style="margin:0 0 12px">Descansar também faz parte. Se quiser treinar mesmo assim, escolha uma ficha:</p>
    <div class="form-linha">${outras.map((f) => `<button class="btn sec" data-acao="treino-iniciar" data-id="${f.id}" ${f.itens.length ? '' : 'disabled'}>${ic('play', 'p')} ${esc(f.nome)}</button>`).join('')}
      <button class="btn sec" data-acao="treino-aba" data-a="corrida">${ic('flame', 'p')} Registrar corrida</button></div>
  </section>`}
  ${deHoje.length && outras.length ? `<p class="dica">Quer fazer outro hoje? ${outras.map((f) => `<a href="#" data-acao="treino-iniciar" data-id="${f.id}">${esc(f.nome)}</a>`).join(' · ')}</p>` : ''}`;
}

function htmlPlano() {
  const t = dadosTreino();
  return `
  <section class="card" style="margin-top:16px">
    <div class="form-linha" style="align-items:center">
      <label class="rotulo-select">Meta de dias por semana
        <select data-mudar="treino-meta">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${t.diasMeta === n ? 'selected' : ''}>${n} ${n === 1 ? 'dia' : 'dias'}</option>`).join('')}</select></label>
      <span class="espaco"></span>
      <button class="btn sec" data-acao="ficha-nova">${ic('plus', 'p')} Nova ficha</button>
    </div>
    <label class="rotulo-select" style="margin-top:10px">Ao salvar um treino ou corrida, marcar na Rotina
      <select data-mudar="treino-habito">${opcoesHabitos(t.habito || '')}</select></label>
    <p class="dica" style="margin:8px 0 0">Cada ficha é um treino (A, B, C…). Marque em quais dias da semana ela acontece e ajuste séries, repetições e descanso de cada exercício.</p>
  </section>
  ${t.fichas.length ? t.fichas.map(htmlFichaEdit).join('') : `<section class="card vazio-grande"><h2>Nenhuma ficha ainda</h2><p class="vazio">Use o "Monte seu treino" ou crie uma ficha do zero.</p></section>`}`;
}

function htmlFichaEdit(f) {
  const aberta = treinoTela.picker === f.id;
  return `<section class="card ficha-edit" ${ordem('|treino.fichas', f.id)}>
    <div class="barra-lista">
      ${alca()}
      <input class="titulo-edit pequeno" value="${esc(f.nome)}" data-digitar="ficha-nome" data-id="${f.id}" maxlength="40" aria-label="Nome da ficha">
      <span class="espaco"></span>
      <span class="dica">~${fmtDur(duracaoFicha(f))}</span>
      <button class="btn-mini" data-acao="treino-iniciar" data-id="${f.id}" ${f.itens.length ? '' : 'disabled'}>${ic('play', 'p')} Treinar</button>
      <button class="acao-item apagar" data-acao="ficha-del" data-id="${f.id}" title="Excluir ficha">${ic('trash', 'p')}</button>
    </div>
    <div class="dias-ficha">${ORDEM_SEMANA.map((d) => `<button class="chip ${f.dias.includes(d) ? 'ativo' : ''}" data-acao="ficha-dia" data-id="${f.id}" data-d="${d}">${DIAS_SEMANA[d]}</button>`).join('')}</div>
    <div class="tabela-ficha">
      <div class="linha-ficha cab"><span></span><span>Exercício</span><span>Séries</span><span>Reps / tempo</span><span>Descanso</span><span>Carga</span><span></span></div>
      ${f.itens.map((i) => { const e = exercicioPorId(i.ex); if (!e) return ''; return `<div class="linha-ficha" ${ordem(`|treino.fichas.${t_idx(f)}.itens`, i.id)}>
        ${alca()}
        <span class="nome-ex"><button class="link-ex" data-acao="ex-ver" data-id="${e.id}">${esc(e.nome)}</button>${htmlTagEx(e)}</span>
        <label><span class="rot-mob">Séries</span><input type="number" min="1" max="10" value="${i.series}" data-digitar="item-campo" data-f="${f.id}" data-id="${i.id}" data-c="series"></label>
        <label><span class="rot-mob">${e.tipo === 'tempo' ? 'Tempo (s)' : 'Repetições'}</span>${e.tipo === 'tempo'
          ? `<span class="com-unidade"><input type="number" min="5" max="600" step="5" value="${i.seg}" data-digitar="item-campo" data-f="${f.id}" data-id="${i.id}" data-c="seg"><i>s</i></span>`
          : `<input type="number" min="1" max="100" value="${i.reps}" data-digitar="item-campo" data-f="${f.id}" data-id="${i.id}" data-c="reps">`}</label>
        <label><span class="rot-mob">Descanso (s)</span><span class="com-unidade"><input type="number" min="0" max="300" step="5" value="${i.descanso}" data-digitar="item-campo" data-f="${f.id}" data-id="${i.id}" data-c="descanso"><i>s</i></span></label>
        <label><span class="rot-mob">Carga</span><input type="text" maxlength="20" value="${esc(i.carga || '')}" placeholder="—" data-digitar="item-campo" data-f="${f.id}" data-id="${i.id}" data-c="carga"></label>
        <button class="acao-item apagar" data-acao="item-del" data-f="${f.id}" data-id="${i.id}" title="Tirar da ficha">${ic('x', 'p')}</button>
      </div>`; }).join('')}
    </div>
    ${aberta ? htmlPicker(f) : `<button class="btn sec add-ex" data-acao="picker-abrir" data-id="${f.id}">${ic('plus', 'p')} Adicionar exercício</button>`}
  </section>`;
}
const t_idx = (f) => dadosTreino().fichas.indexOf(f);

function filtrarExercicios() {
  const b = treinoTela.busca.trim().toLowerCase();
  return todosExercicios().filter((e) => (!treinoTela.grupo || e.grupo === treinoTela.grupo)
    && (!treinoTela.equip || e.equip === treinoTela.equip)
    && (!b || `${e.nome} ${e.musculos || ''}`.toLowerCase().includes(b)));
}

function htmlFiltrosEx() {
  return `<div class="filtros-ex">
    <label class="busca-diario busca-ex">${ic('search', 'p')}
      <input type="search" placeholder="Buscar exercício ou músculo" value="${esc(treinoTela.busca)}" data-digitar="ex-busca" aria-label="Buscar exercício"></label>
    <select data-mudar="ex-equip" aria-label="Equipamento"><option value="">Qualquer equipamento</option>${Object.entries(EQUIPAMENTOS).map(([id, n]) => `<option value="${id}" ${treinoTela.equip === id ? 'selected' : ''}>${n}</option>`).join('')}</select>
  </div>
  <div class="chips">${[['', 'Todos'], ...Object.entries(GRUPOS_TREINO).map(([id, g]) => [id, g.nome])].map(([id, n]) => `<button class="chip ${treinoTela.grupo === id ? 'ativo' : ''}" data-acao="ex-grupo" data-g="${id}">${n}</button>`).join('')}</div>`;
}

function htmlPicker(f) {
  const lista = filtrarExercicios();
  const ja = new Set(f.itens.map((i) => i.ex));
  return `<div class="picker-ex">
    <div class="barra-lista"><b>Adicionar à ${esc(f.nome)}</b><span class="espaco"></span><button class="btn-mini" data-acao="picker-abrir" data-id="">Fechar</button></div>
    ${htmlFiltrosEx()}
    <div class="lista-rolavel picker-lista" id="picker-lista">${lista.map((e) => `<div class="item" data-nome-ex="${esc(e.nome.toLowerCase())}">
      <span class="txt">${esc(e.nome)}<span class="sub">${EQUIPAMENTOS[e.equip] || ''} · ${NIVEIS[e.nivel] || ''}</span></span>${htmlTagEx(e)}
      <button class="acao-item" data-acao="ex-ver" data-id="${e.id}" title="Como fazer">${ic('play', 'p')}</button>
      <button class="btn-mini" data-acao="item-add" data-f="${f.id}" data-ex="${e.id}">${ja.has(e.id) ? 'Adicionar de novo' : `${ic('plus', 'p')} Adicionar`}</button>
    </div>`).join('') || '<p class="vazio">Nenhum exercício com esses filtros.</p>'}</div>
  </div>`;
}

function htmlBiblioteca() {
  const lista = filtrarExercicios();
  const c = treinoTela.criando;
  return `
  <section class="card" style="margin-top:16px">
    <div class="barra-lista" style="margin-bottom:10px"><b>${todosExercicios().length} exercícios</b><span class="dica">· ${lista.length} com esses filtros</span><span class="espaco"></span>
      <button class="btn sec" data-acao="ex-criar">${ic('plus', 'p')} Criar exercício</button></div>
    ${c ? htmlCriarEx(c) : ''}
    ${htmlFiltrosEx()}
    <div class="grade-ex">${lista.map((e) => `<button class="card-ex" data-acao="ex-ver" data-id="${e.id}">
      <span class="topo-ex">${htmlTagEx(e)}${e.meu ? '<span class="tag">meu</span>' : ''}${dadosTreino().videos[e.id] || e.video ? `<span class="tem-video" title="Tem vídeo">${ic('play', 'p')}</span>` : ''}</span>
      <b>${esc(e.nome)}</b>
      <small>${esc(e.musculos || '')}</small>
      <small class="fraco">${EQUIPAMENTOS[e.equip] || ''} · ${NIVEIS[e.nivel] || ''} · ${e.tipo === 'tempo' ? `${e.padrao.series}× ${e.padrao.seg}s` : `${e.padrao.series}× ${e.padrao.reps}`}</small>
    </button>`).join('') || '<p class="vazio">Nenhum exercício com esses filtros.</p>'}</div>
  </section>`;
}

function htmlCriarEx(c) {
  return `<form class="criar-ex" data-form="ex-salvar">
    <div class="linha2">
      <label class="campo">Nome<input type="text" name="nome" maxlength="60" value="${esc(c.nome || '')}" data-precisa></label>
      <label class="campo">Grupo<select name="grupo">${Object.entries(GRUPOS_TREINO).map(([id, g]) => `<option value="${id}" ${c.grupo === id ? 'selected' : ''}>${g.nome}</option>`).join('')}</select></label>
    </div>
    <div class="linha3">
      <label class="campo">Equipamento<select name="equip">${Object.entries(EQUIPAMENTOS).map(([id, n]) => `<option value="${id}" ${c.equip === id ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo">Como conta<select name="tipo"><option value="reps" ${c.tipo !== 'tempo' ? 'selected' : ''}>Repetições</option><option value="tempo" ${c.tipo === 'tempo' ? 'selected' : ''}>Tempo (segundos)</option></select></label>
      <label class="campo">Nível<select name="nivel">${[1, 2, 3].map((n) => `<option value="${n}" ${Number(c.nivel || 1) === n ? 'selected' : ''}>${NIVEIS[n]}</option>`).join('')}</select></label>
    </div>
    <div class="linha3">
      <label class="campo">Séries<input type="number" name="series" min="1" max="10" value="${c.padrao?.series || 3}"></label>
      <label class="campo">Repetições ou segundos<input type="number" name="qtd" min="1" max="600" value="${c.padrao?.reps || c.padrao?.seg || 12}"></label>
      <label class="campo">Descanso (s)<input type="number" name="descanso" min="0" max="300" step="5" value="${c.padrao?.descanso ?? 45}"></label>
    </div>
    <label class="campo">Músculos trabalhados<input type="text" name="musculos" maxlength="80" value="${esc(c.musculos || '')}"></label>
    <label class="campo">Como fazer (um passo por linha)<textarea name="passos" rows="4">${esc((c.passos || []).join('\n'))}</textarea></label>
    <label class="campo">Link do vídeo (YouTube ou outro)<input type="url" name="video" value="${esc(dadosTreino().videos[c.id] || '')}"></label>
    <div class="form-linha" style="justify-content:flex-end">
      <button type="button" class="btn sec" data-acao="ex-criar-cancelar">Cancelar</button>
      <button class="btn">${c.id ? 'Salvar exercício' : 'Criar exercício'}</button>
    </div>
  </form>`;
}

ACOES['ex-criar'] = () => { treinoTela.criando = treinoTela.criando ? null : { grupo: treinoTela.grupo || 'abdomen', equip: 'nenhum', tipo: 'reps' }; desenhar(); };
ACOES['ex-criar-cancelar'] = () => { treinoTela.criando = null; desenhar(); };
FORMS['ex-salvar'] = (d) => {
  const t = dadosTreino();
  const qtd = Number(d.qtd) || 12;
  const dados = {
    nome: d.nome, grupo: d.grupo, equip: d.equip, nivel: Number(d.nivel) || 1, tipo: d.tipo, musculos: d.musculos,
    padrao: d.tipo === 'tempo' ? { series: Number(d.series) || 3, seg: qtd, descanso: Number(d.descanso) || 0 } : { series: Number(d.series) || 3, reps: qtd, descanso: Number(d.descanso) || 0 },
    passos: (d.passos || '').split('\n').map((x) => x.trim()).filter(Boolean), dica: '', meu: true,
  };
  let e = treinoTela.criando?.id ? t.meus.find((x) => x.id === treinoTela.criando.id) : null;
  if (e) Object.assign(e, dados);
  else { e = { id: 'meu-' + novoId(), ...dados }; t.meus.push(e); }
  if (d.video) t.videos[e.id] = d.video; else delete t.videos[e.id];
  treinoTela.criando = null;
  salvar(); desenhar();
  avisar(`Exercício "${e.nome}" salvo.`);
};

function abrirJanelaTreino(html) {
  let j = $('#janela-treino');
  if (!j) { j = document.createElement('dialog'); j.id = 'janela-treino'; j.className = 'janela janela-ex'; document.body.appendChild(j); }
  j.innerHTML = html;
  if (!j.open) j.showModal();
  melhorarSelects(j);
}
const fecharJanelaTreino = () => { const j = $('#janela-treino'); if (j?.open) j.close(); if (j) j.innerHTML = ''; };
ACOES['ex-fechar'] = fecharJanelaTreino;

ACOES['ex-ver'] = (el) => {
  const e = exercicioPorId(el.dataset.id);
  if (!e) return;
  const t = dadosTreino();
  abrirJanelaTreino(`<div class="ex-detalhe">
    <h2>${esc(e.nome)} <button type="button" class="btn-icone" data-acao="ex-fechar" aria-label="Fechar">${ic('x')}</button></h2>
    <div class="topo-ex">${htmlTagEx(e)}<span class="tag">${EQUIPAMENTOS[e.equip] || ''}</span><span class="tag">${NIVEIS[e.nivel] || ''}</span>${e.meu ? '<span class="tag">criado por você</span>' : ''}</div>
    ${htmlVideo(e)}
    <form class="form-linha link-video" data-form="ex-video" data-id="${e.id}">
      <input type="url" name="url" value="${esc(t.videos[e.id] || '')}" placeholder="Cole aqui o link de um vídeo (YouTube)" aria-label="Link do vídeo">
      <button class="btn sec">${t.videos[e.id] ? 'Trocar' : 'Salvar'} vídeo</button>
      ${t.videos[e.id] ? `<button type="button" class="btn-mini" data-acao="ex-video-tirar" data-id="${e.id}">Tirar</button>` : ''}
    </form>
    ${e.musculos ? `<p class="dica"><b>Trabalha:</b> ${esc(e.musculos)}</p>` : ''}
    ${e.passos?.length ? `<h3>Como fazer</h3><ol class="passos-ex">${e.passos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
    ${e.dica ? `<div class="alerta convite dica-ex">${ic('sparkle')}<span>${esc(e.dica)}</span></div>` : ''}
    <p class="dica">Sugestão: ${e.tipo === 'tempo' ? `${e.padrao.series} séries de ${e.padrao.seg} segundos` : `${e.padrao.series} séries de ${e.padrao.reps} repetições`}, ${e.padrao.descanso}s de descanso.</p>
    <div class="form-linha rodape-ex">
      ${e.meu ? `<button type="button" class="btn perigo" data-acao="ex-apagar" data-id="${e.id}">${ic('trash', 'p')} Excluir</button>
        <button type="button" class="btn sec" data-acao="ex-editar" data-id="${e.id}">${ic('edit', 'p')} Editar</button>` : ''}
      <span class="espaco"></span>
      ${t.fichas.length && !t.ativo ? `<select id="ex-para-ficha" aria-label="Ficha">${t.fichas.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select>
        <button type="button" class="btn" data-acao="ex-para-ficha" data-id="${e.id}">${ic('plus', 'p')} Pôr na ficha</button>` : ''}
    </div>
  </div>`);
};

FORMS['ex-video'] = (d, form) => {
  const t = dadosTreino();
  const id = form.dataset.id;
  if (d.url && !/^https?:\/\//.test(d.url)) { avisar('Cole um link completo, começando com https://'); return; }
  if (d.url) t.videos[id] = d.url; else delete t.videos[id];
  salvar();
  ACOES['ex-ver']({ dataset: { id } });
  desenharSeguro();
  avisar(d.url ? (idYoutube(d.url) ? 'Vídeo salvo. Agora ele aparece no exercício e durante o treino.' : 'Link salvo. Esse tipo de link abre numa nova aba.') : 'Vídeo removido.');
};
ACOES['ex-video-tirar'] = (el) => { delete dadosTreino().videos[el.dataset.id]; salvar(); ACOES['ex-ver'](el); desenharSeguro(); };
ACOES['ex-editar'] = (el) => {
  const e = exercicioPorId(el.dataset.id);
  fecharJanelaTreino();
  treinoTela.aba = 'exercicios';
  treinoTela.criando = { ...e };
  desenhar();
};
ACOES['ex-apagar'] = (el) => {
  const t = dadosTreino();
  if (!confirmarDuasVezes(`ex-${el.dataset.id}`, 'Clique de novo para excluir o exercício.')) return;
  t.meus = t.meus.filter((x) => x.id !== el.dataset.id);
  t.fichas.forEach((f) => { f.itens = f.itens.filter((i) => i.ex !== el.dataset.id); });
  delete t.videos[el.dataset.id];
  fecharJanelaTreino();
  salvar(); desenhar();
  avisar('Exercício excluído.');
};
ACOES['ex-para-ficha'] = (el) => {
  const f = dadosTreino().fichas.find((x) => x.id === $('#ex-para-ficha').value);
  if (!f) return;
  f.itens.push(itemDe(el.dataset.id));
  salvar(); fecharJanelaTreino(); desenhar();
  avisar(`Adicionado na ${f.nome}.`);
};

ACOES['ex-grupo'] = (el) => { treinoTela.grupo = el.dataset.g; desenhar(); };
MUDAR['ex-equip'] = (el) => { treinoTela.equip = el.value; desenhar(); };
DIGITAR['ex-busca'] = (el) => {
  treinoTela.busca = el.value;
  clearTimeout(DIGITAR['ex-busca'].t);
  DIGITAR['ex-busca'].t = setTimeout(() => {
    const pos = el.selectionStart;
    desenhar();
    const novo = $('.busca-ex input');
    if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); }
  }, 250);
};

MUDAR['treino-habito'] = (el) => { dadosTreino().habito = el.value; salvar(); avisar(el.value ? `Pronto: treinar vai marcar "${nomeHabito(el.value)}" sozinho.` : 'Treino não marca mais hábito.'); };
MUDAR['treino-meta'] = (el) => { dadosTreino().diasMeta = Number(el.value); salvar(); desenhar(); };
ACOES['ficha-nova'] = () => {
  const t = dadosTreino();
  const letra = String.fromCharCode(65 + t.fichas.length);
  const f = { id: novoId(), nome: `Treino ${letra}`, dias: [], itens: [] };
  t.fichas.push(f);
  treinoTela.aba = 'plano';
  treinoTela.picker = f.id;
  salvar(); desenhar();
};
DIGITAR['ficha-nome'] = (el) => { const f = dadosTreino().fichas.find((x) => x.id === el.dataset.id); if (f) { f.nome = el.value || 'Treino'; salvar(); } };
ACOES['ficha-dia'] = (el) => {
  const f = dadosTreino().fichas.find((x) => x.id === el.dataset.id);
  const d = Number(el.dataset.d);
  f.dias = f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d];
  salvar(); desenhar();
};
ACOES['ficha-del'] = (el) => {
  const t = dadosTreino();
  const f = t.fichas.find((x) => x.id === el.dataset.id);
  if (!confirmarDuasVezes(`ficha-${f.id}`, `Clique de novo para excluir a ${f.nome}.`)) return;
  const pos = t.fichas.indexOf(f);
  t.fichas.splice(pos, 1);
  salvar(); desenhar();
  avisar(`${f.nome} excluída.`, () => { t.fichas.splice(pos, 0, f); salvar(); desenhar(); });
};
DIGITAR['item-campo'] = (el) => {
  const f = dadosTreino().fichas.find((x) => x.id === el.dataset.f);
  const i = f?.itens.find((x) => x.id === el.dataset.id);
  if (!i) return;
  i[el.dataset.c] = el.dataset.c === 'carga' ? el.value : Math.max(0, Number(el.value) || 0);
  salvar();
};
ACOES['item-del'] = (el) => {
  const f = dadosTreino().fichas.find((x) => x.id === el.dataset.f);
  const pos = f.itens.findIndex((x) => x.id === el.dataset.id);
  const [i] = f.itens.splice(pos, 1);
  salvar(); desenhar();
  avisar('Exercício tirado da ficha.', () => { f.itens.splice(pos, 0, i); salvar(); desenhar(); });
};
ACOES['picker-abrir'] = (el) => { treinoTela.picker = el.dataset.id || null; desenhar(); };
ACOES['item-add'] = (el) => {
  const f = dadosTreino().fichas.find((x) => x.id === el.dataset.f);
  f.itens.push(itemDe(el.dataset.ex));
  const rol = $('#picker-lista')?.scrollTop || 0;
  salvar(); desenhar();
  const l = $('#picker-lista'); if (l) l.scrollTop = rol;
  avisar(`${exercicioPorId(el.dataset.ex).nome} adicionado.`);
};

const OBJETIVOS = {
  condicionamento: { nome: 'Emagrecer e condicionamento', texto: 'Mais repetições, descanso curto e cardio.', icone: 'flame' },
  forca: { nome: 'Força e tônus', texto: 'Séries mais pesadas, descanso maior.', icone: 'gym' },
  mobilidade: { nome: 'Flexibilidade e mobilidade', texto: 'Alongamentos e movimentos leves.', icone: 'leaf' },
  comecar: { nome: 'Começar do zero', texto: 'Treinos curtos e simples para criar o hábito.', icone: 'sparkle' },
};

ACOES['treino-wizard'] = () => {
  treinoTela.wizard = treinoTela.wizard ? null : { passo: 1, objetivo: 'condicionamento', nivel: 1, dias: [1, 3, 5], tempo: 30, equip: ['nenhum', 'cadeira', 'parede'], foco: [] };
  treinoTela.previa = null;
  desenhar();
  if (treinoTela.wizard) $('.wizard-treino')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function htmlWizard() {
  const w = treinoTela.wizard;
  const passos = ['Objetivo', 'Dias e tempo', 'O que você tem em casa', 'Sugestão'];
  const corpo = {
    1: `<h3>Qual é o seu objetivo?</h3>
      <div class="opcoes-wizard">${Object.entries(OBJETIVOS).map(([id, o]) => `<button class="opcao-wizard ${w.objetivo === id ? 'ativo' : ''}" data-acao="wz-set" data-k="objetivo" data-v="${id}"><span class="selo mini c-vermelho">${ic(o.icone)}</span><b>${o.nome}</b><small>${o.texto}</small></button>`).join('')}</div>
      <h3>Seu nível hoje</h3>
      <div class="segmento">${[1, 2, 3].map((n) => `<button class="${w.nivel === n ? 'ativo' : ''}" data-acao="wz-set" data-k="nivel" data-v="${n}">${NIVEIS[n]}</button>`).join('')}</div>`,
    2: `<h3>Quais dias da semana você quer treinar?</h3>
      <div class="chips">${ORDEM_SEMANA.map((d) => `<button class="chip ${w.dias.includes(d) ? 'ativo' : ''}" data-acao="wz-dia" data-d="${d}">${DIAS_SEMANA[d]}</button>`).join('')}</div>
      <p class="dica">${w.dias.length} ${w.dias.length === 1 ? 'dia' : 'dias'} por semana.</p>
      <h3>Quanto tempo por treino?</h3>
      <div class="segmento">${[15, 20, 30, 45, 60].map((n) => `<button class="${w.tempo === n ? 'ativo' : ''}" data-acao="wz-set" data-k="tempo" data-v="${n}">${n} min</button>`).join('')}</div>
      <h3>Quer dar mais atenção a alguma parte? <small class="dica">(opcional)</small></h3>
      <div class="chips">${['abdomen', 'pernas', 'gluteos', 'bracos', 'costas', 'ombros', 'peito', 'cardio'].map((g) => `<button class="chip ${w.foco.includes(g) ? 'ativo' : ''}" data-acao="wz-foco" data-g="${g}">${GRUPOS_TREINO[g].nome}</button>`).join('')}</div>`,
    3: `<h3>O que você tem em casa?</h3>
      <p class="dica">Só entram exercícios que dá para fazer com o que você marcar.</p>
      <div class="chips">${Object.entries(EQUIPAMENTOS).map(([id, n]) => `<button class="chip ${w.equip.includes(id) ? 'ativo' : ''}" data-acao="wz-equip" data-e="${id}" ${id === 'nenhum' ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      <p class="dica">Dica: uma garrafa de 2 litros cheia pesa uns 2 kg e funciona como halter. Uma mochila com livros também.</p>`,
    4: htmlPrevia(),
  }[w.passo];
  return `<section class="card wizard-treino">
    <div class="barra-lista"><h2 style="margin:0">${ic('sparkle', 'p')} Monte seu treino</h2><span class="espaco"></span><button class="btn-icone" data-acao="treino-wizard" aria-label="Fechar">${ic('x')}</button></div>
    <div class="passos-wizard">${passos.map((p, k) => `<span class="${w.passo === k + 1 ? 'ativo' : w.passo > k + 1 ? 'ok' : ''}"><i>${w.passo > k + 1 ? ic('check') : k + 1}</i>${p}</span>`).join('')}</div>
    ${corpo}
    <div class="form-linha rodape-wizard">
      ${w.passo > 1 ? '<button class="btn sec" data-acao="wz-passo" data-v="-1">Voltar</button>' : ''}
      <span class="espaco"></span>
      ${w.passo < 3 ? `<button class="btn" data-acao="wz-passo" data-v="1" ${w.passo === 2 && !w.dias.length ? 'disabled' : ''}>Continuar</button>` : ''}
      ${w.passo === 3 ? `<button class="btn" data-acao="wz-gerar">${ic('sparkle', 'p')} Ver sugestão</button>` : ''}
      ${w.passo === 4 ? `<button class="btn sec" data-acao="wz-gerar">${ic('reset', 'p')} Sugerir outros</button>
        ${dadosTreino().fichas.length ? '<button class="btn sec" data-acao="wz-usar" data-modo="somar">Somar às minhas fichas</button>' : ''}
        <button class="btn" data-acao="wz-usar" data-modo="trocar">${ic('check', 'p')} ${dadosTreino().fichas.length ? 'Trocar meu plano por este' : 'Usar este treino'}</button>` : ''}
    </div>
  </section>`;
}

ACOES['wz-set'] = (el) => { const w = treinoTela.wizard; w[el.dataset.k] = isNaN(el.dataset.v) ? el.dataset.v : Number(el.dataset.v); desenhar(); };
ACOES['wz-dia'] = (el) => { const w = treinoTela.wizard; const d = Number(el.dataset.d); w.dias = w.dias.includes(d) ? w.dias.filter((x) => x !== d) : [...w.dias, d]; desenhar(); };
ACOES['wz-foco'] = (el) => { const w = treinoTela.wizard; const g = el.dataset.g; w.foco = w.foco.includes(g) ? w.foco.filter((x) => x !== g) : [...w.foco, g]; desenhar(); };
ACOES['wz-equip'] = (el) => { const w = treinoTela.wizard; const e = el.dataset.e; w.equip = w.equip.includes(e) ? w.equip.filter((x) => x !== e) : [...w.equip, e]; desenhar(); };
ACOES['wz-passo'] = (el) => { treinoTela.wizard.passo += Number(el.dataset.v); desenhar(); };
ACOES['wz-gerar'] = () => { treinoTela.previa = gerarPlano(treinoTela.wizard); treinoTela.wizard.passo = 4; desenhar(); };
ACOES['wz-usar'] = (el) => {
  const t = dadosTreino();
  const novas = treinoTela.previa;
  if (el.dataset.modo === 'trocar' && t.fichas.length && !confirmarDuasVezes('wz-trocar', 'Clique de novo para trocar suas fichas atuais por estas.')) return;
  const antigas = t.fichas;
  const antigaMeta = t.diasMeta;
  t.fichas = el.dataset.modo === 'trocar' ? novas : [...t.fichas, ...novas];
  t.diasMeta = treinoTela.wizard.dias.length;
  treinoTela.wizard = null; treinoTela.previa = null; treinoTela.aba = 'hoje';
  salvar(); desenhar();
  avisar('Plano criado! Ajuste o que quiser em "Meu plano".', () => { t.fichas = antigas; t.diasMeta = antigaMeta; salvar(); desenhar(); });
};

function htmlPrevia() {
  const p = treinoTela.previa || [];
  return `<h3>Sua sugestão de treino</h3>
    <p class="dica">Você pode trocar, tirar e ajustar tudo depois em "Meu plano".</p>
    <div class="previa-fichas">${p.map((f) => `<div class="previa-ficha">
      <b>${esc(f.nome)}</b><small>${f.dias.map((d) => DIAS_SEMANA[d]).join(', ')} · ~${fmtDur(duracaoFicha(f))}</small>
      <ol>${f.itens.map((i) => { const e = exercicioPorId(i.ex); return `<li>${esc(e.nome)} <span class="fraco">${textoCarga(i, e)}</span></li>`; }).join('')}</ol>
    </div>`).join('')}</div>`;
}

function embaralhar(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function gerarPlano(w) {
  const ok = (e) => w.equip.includes(e.equip) && e.nivel <= Math.max(w.nivel, w.objetivo === 'comecar' ? 1 : w.nivel);
  const pool = (g) => embaralhar(EXERCICIOS.filter((e) => e.grupo === g && ok(e)));
  const dias = ORDEM_SEMANA.filter((d) => w.dias.includes(d));
  const n = dias.length;
  let modelos;
  if (w.objetivo === 'mobilidade') {
    modelos = [
      { nome: 'Mobilidade', grupos: ['alongamento', 'alongamento', 'alongamento', 'abdomen'] },
      { nome: 'Alongamento completo', grupos: ['alongamento', 'alongamento', 'alongamento', 'gluteos'] },
    ];
  } else if (n <= 2 || w.objetivo === 'comecar') {
    modelos = [
      { nome: 'Corpo todo', grupos: ['pernas', 'peito', 'costas', 'gluteos', 'abdomen', 'ombros', 'bracos', 'cardio'] },
      { nome: 'Corpo todo', grupos: ['gluteos', 'costas', 'pernas', 'ombros', 'abdomen', 'peito', 'cardio', 'bracos'] },
    ];
  } else {
    modelos = [
      { nome: 'Pernas e glúteos', grupos: ['pernas', 'gluteos', 'pernas', 'gluteos', 'abdomen', 'pernas', 'gluteos', 'abdomen'] },
      { nome: 'Superiores', grupos: ['peito', 'costas', 'ombros', 'bracos', 'costas', 'peito', 'abdomen', 'ombros'] },
      { nome: 'Cardio e abdômen', grupos: ['cardio', 'abdomen', 'cardio', 'abdomen', 'gluteos', 'cardio', 'abdomen', 'pernas'] },
    ];
    if (n >= 4) modelos.push({ nome: 'Glúteos e core', grupos: ['gluteos', 'abdomen', 'gluteos', 'costas', 'abdomen', 'gluteos', 'pernas', 'abdomen'] });
    if (n === 5) modelos.push({ nome: 'Corpo todo', grupos: ['pernas', 'peito', 'costas', 'gluteos', 'abdomen', 'ombros', 'cardio', 'bracos'] });
  }
  const qtdFichas = Math.min(n, modelos.length);
  const alvo = w.tempo * 60;
  const ajustar = (i, e) => {
    const base = { ...i };
    if (e.grupo === 'alongamento' || e.grupo === 'aquecimento') return base;
    if (w.objetivo === 'forca') { base.series = w.nivel === 1 ? 3 : 4; if (e.tipo === 'reps') base.reps = w.nivel === 3 ? 8 : 10; base.descanso = 60; }
    if (w.objetivo === 'condicionamento') { base.series = 3; if (e.tipo === 'reps') base.reps = 15; else base.seg = w.nivel === 1 ? 30 : 40; base.descanso = w.nivel === 1 ? 40 : 30; }
    if (w.objetivo === 'comecar' || w.nivel === 1) { base.series = Math.min(base.series, 3); if (e.tipo === 'tempo') base.seg = Math.min(base.seg, 30); }
    return base;
  };
  const fichas = Array.from({ length: qtdFichas }, (_, k) => {
    const m = modelos[k];
    const grupos = [...m.grupos];
    w.foco.forEach((g, j) => grupos.splice(1 + j * 2, 0, g));
    const usados = new Set();
    const pega = (g) => { const e = pool(g).find((x) => !usados.has(x.id)); if (e) usados.add(e.id); return e; };
    const itens = [];
    const aq = pool('aquecimento').slice(0, w.tempo >= 30 ? 2 : 1);
    aq.forEach((e) => { usados.add(e.id); itens.push(ajustar(itemDe(e.id), e)); });
    const finais = [];
    if (w.objetivo !== 'mobilidade') pool('alongamento').filter((e) => !usados.has(e.id)).slice(0, w.tempo >= 30 ? 2 : 1).forEach((e) => { usados.add(e.id); finais.push(itemDe(e.id)); });
    const tempoFixo = [...itens, ...finais].reduce((s, i) => s + duracaoItem(i), 0);
    let usado = tempoFixo;
    for (const g of [...grupos, ...grupos]) {
      const e = pega(g);
      if (!e) continue;
      const i = ajustar(itemDe(e.id), e);
      if (usado + duracaoItem(i) > alvo * 1.05 && itens.length > aq.length + 2) break;
      itens.push(i);
      usado += duracaoItem(i);
    }
    return { id: novoId(), nome: `Treino ${String.fromCharCode(65 + k)} · ${m.nome}`, dias: [], itens: [...itens, ...finais] };
  });
  dias.forEach((d, k) => fichas[k % qtdFichas].dias.push(d));
  return fichas;
}

function treinoAtivo() { return dadosTreino().ativo; }

ACOES['treino-iniciar'] = (el) => {
  const t = dadosTreino();
  const f = t.fichas.find((x) => x.id === el.dataset.id);
  if (!f?.itens.length) return;
  t.ativo = { fichaId: f.id, inicio: Date.now(), idx: 0, serie: 1, fase: 'pronto', faseIni: 0, faseFim: 0, feitas: {}, fim: 0 };
  salvar(); location.hash = 'treino'; desenhar();
  window.scrollTo(0, 0);
};

function itemAtual() {
  const a = treinoAtivo();
  const f = dadosTreino().fichas.find((x) => x.id === a?.fichaId);
  return { a, f, i: f?.itens[a.idx], e: f && exercicioPorId(f.itens[a.idx]?.ex) };
}

function htmlPlayer() {
  const { a, f, i, e } = itemAtual();
  if (!f || !i || !e) { dadosTreino().ativo = null; salvar(); return PAGINAS.treino.desenhar(); }
  if (a.fase === 'fim') return htmlFimTreino(a, f);
  const totalSeries = f.itens.reduce((s, x) => s + Number(x.series), 0);
  const feitas = Object.values(a.feitas).reduce((s, x) => s + x, 0);
  const prox = f.itens[a.idx + 1] && exercicioPorId(f.itens[a.idx + 1].ex);
  const series = Number(i.series);
  const tempo = e.tipo === 'tempo';
  const descanso = a.fase === 'descanso';
  const trabalhando = a.fase === 'trabalho';
  return `
  <div class="player-treino">
    <div class="player-topo">
      <div><small>${esc(f.nome)}</small><b id="tr-total">${fmtSeg((Date.now() - a.inicio) / 1000)}</b></div>
      <div class="progresso-treino"><span style="width:${Math.round((feitas / totalSeries) * 100)}%"></span></div>
      <button class="btn sec" data-acao="treino-encerrar">Encerrar</button>
    </div>
    <div class="player-corpo">
      <section class="card player-ex">
        <div class="topo-ex">${htmlTagEx(e)}<span class="tag">Exercício ${a.idx + 1} de ${f.itens.length}</span></div>
        <h2>${esc(e.nome)}</h2>
        ${htmlVideo(e, true)}
        ${e.passos?.length ? `<details class="passos-det"><summary>Como fazer</summary><ol class="passos-ex">${e.passos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>${e.dica ? `<p class="dica">${esc(e.dica)}</p>` : ''}</details>` : ''}
      </section>
      <section class="card player-acao ${descanso ? 'descansando' : ''}">
        <div class="series-dots">${Array.from({ length: series }, (_, k) => `<span class="${k < (a.feitas[i.id] || 0) ? 'ok' : k + 1 === a.serie && !descanso ? 'agora' : ''}">${k + 1}</span>`).join('')}</div>
        <p class="rot-fase">${descanso ? 'Descanso' : `Série ${Math.min(a.serie, series)} de ${series}`}</p>
        <div class="anel-treino">
          <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" fill="none" style="stroke:var(--card-2)" stroke-width="9"/>
            <circle id="tr-arco" cx="80" cy="80" r="70" fill="none" stroke="${descanso ? '#5fd6a4' : 'url(#gradTreino)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="440" stroke-dashoffset="${descanso || trabalhando ? 0 : 440}" transform="rotate(-90 80 80)"/>
            <defs><linearGradient id="gradTreino"><stop offset="0" style="stop-color:var(--destaque-2)"/><stop offset="1" stop-color="#f59ad8"/></linearGradient></defs></svg>
          <div class="anel-meio"><b id="tr-timer">${descanso || trabalhando ? fmtSeg((a.faseFim - Date.now()) / 1000) : tempo ? `${i.seg}s` : `${i.reps}`}</b>
            <span>${descanso ? 'respire' : tempo ? 'segundos' : 'repetições'}</span></div>
        </div>
        ${i.carga ? `<p class="dica" style="margin:0">Carga: <b>${esc(i.carga)}</b></p>` : ''}
        <div class="botoes-player">
          ${descanso ? `<button class="btn sec" data-acao="tr-mais" data-s="15">+15s</button><button class="btn" data-acao="tr-pular">Pular descanso ${ic('right', 'p')}</button>`
            : trabalhando ? `<button class="btn sec" data-acao="tr-pausar-tempo">Parar</button><button class="btn" data-acao="tr-serie">${ic('check', 'p')} Terminei</button>`
            : tempo ? `<button class="btn grande" data-acao="tr-comecar-tempo">${ic('play', 'p')} Começar ${i.seg}s</button><button class="btn sec" data-acao="tr-serie" title="Marcar como feita sem cronômetro">${ic('check', 'p')}</button>`
            : `<button class="btn grande" data-acao="tr-serie">${ic('check', 'p')} Série feita</button>`}
        </div>
        <div class="nav-player">
          <button class="btn-mini" data-acao="tr-ir" data-v="-1" ${a.idx === 0 ? 'disabled' : ''}>${ic('left', 'p')} Anterior</button>
          <span class="dica">${descanso && a.serie > series ? `A seguir: <b>${prox ? esc(prox.nome) : 'fim do treino'}</b>` : prox ? `Depois: ${esc(prox.nome)}` : 'Último exercício'}</span>
          <button class="btn-mini" data-acao="tr-ir" data-v="1">${a.idx === f.itens.length - 1 ? 'Finalizar' : 'Pular'} ${ic('right', 'p')}</button>
        </div>
      </section>
    </div>
  </div>`;
}

function htmlFimTreino(a, f) {
  const dur = ((a.fim || Date.now()) - a.inicio) / 1000;
  const feitas = Object.values(a.feitas).reduce((s, x) => s + x, 0);
  const total = f.itens.reduce((s, x) => s + Number(x.series), 0);
  return `<section class="card fim-treino">
    <span class="selo c-verde">${ic('check')}</span>
    <h1>Treino concluído!</h1>
    <div class="grade g3">
      <div class="card stat"><div><b>${fmtSeg(dur)}</b><span>duração</span></div></div>
      <div class="card stat"><div><b>${feitas}/${total}</b><span>séries feitas</span></div></div>
      <div class="card stat"><div><b>${Object.keys(a.feitas).length}</b><span>exercícios</span></div></div>
    </div>
    <h3>Como foi?</h3>
    <div class="humor-escolha">${[['5', 'Muito bom'], ['4', 'Bom'], ['3', 'Ok'], ['2', 'Pesado'], ['1', 'Muito pesado']].map(([v, n]) => `<button class="chip ${a.sentir === v ? 'ativo' : ''}" data-acao="tr-sentir" data-v="${v}">${n}</button>`).join('')}</div>
    <label class="campo" style="max-width:520px;margin:12px auto 0;text-align:left">Anotação (opcional)<input type="text" id="tr-obs" maxlength="140" value="${esc(a.obs || '')}"></label>
    <div class="form-linha" style="justify-content:center;margin-top:16px">
      <button class="btn sec" data-acao="tr-descartar">Descartar</button>
      <button class="btn" data-acao="tr-salvar">${ic('check', 'p')} Salvar treino</button>
    </div>
  </section>`;
}

function bip(fim = false) {
  try { tocarSom(fim); } catch { }
  try { navigator.vibrate?.(fim ? [200, 100, 200] : 150); } catch { }
}

function avancarSerie() {
  const { a, f, i } = itemAtual();
  a.feitas[i.id] = Math.min(Number(i.series), (a.feitas[i.id] || 0) + 1);
  a.serie++;
  const acabouEx = a.serie > Number(i.series);
  const ultimo = a.idx >= f.itens.length - 1;
  if (acabouEx && ultimo) { a.fase = 'fim'; a.fim = Date.now(); bip(true); }
  else if (Number(i.descanso) > 0) { a.fase = 'descanso'; a.faseIni = Date.now(); a.faseFim = Date.now() + Number(i.descanso) * 1000; }
  else proximoPasso();
  salvar(); desenhar();
}
function proximoPasso() {
  const { a, i } = itemAtual();
  if (a.serie > Number(i.series)) { a.idx++; a.serie = 1; }
  a.fase = 'pronto';
}

ACOES['tr-serie'] = avancarSerie;
ACOES['tr-comecar-tempo'] = () => { const { a, i } = itemAtual(); a.fase = 'trabalho'; a.faseIni = Date.now(); a.faseFim = Date.now() + Number(i.seg) * 1000; salvar(); desenhar(); };
ACOES['tr-pausar-tempo'] = () => { const { a } = itemAtual(); a.fase = 'pronto'; salvar(); desenhar(); };
ACOES['tr-pular'] = () => { proximoPasso(); salvar(); desenhar(); };
ACOES['tr-mais'] = (el) => { const { a } = itemAtual(); a.faseFim += Number(el.dataset.s) * 1000; salvar(); atualizarTreino(); };
ACOES['tr-ir'] = (el) => {
  const { a, f } = itemAtual();
  const v = Number(el.dataset.v);
  if (v > 0 && a.idx >= f.itens.length - 1) { a.fase = 'fim'; a.fim = Date.now(); }
  else { a.idx = Math.max(0, Math.min(f.itens.length - 1, a.idx + v)); a.serie = (a.feitas[f.itens[a.idx].id] || 0) + 1; a.fase = 'pronto'; }
  salvar(); desenhar();
};
ACOES['treino-encerrar'] = () => { const a = treinoAtivo(); a.fase = 'fim'; a.fim = Date.now(); salvar(); desenhar(); };
ACOES['tr-sentir'] = (el) => { treinoAtivo().sentir = el.dataset.v; treinoAtivo().obs = $('#tr-obs')?.value || ''; salvar(); desenhar(); };
ACOES['tr-descartar'] = () => {
  if (!confirmarDuasVezes('tr-descartar', 'Clique de novo para descartar este treino.')) return;
  dadosTreino().ativo = null; salvar(); desenhar();
};
ACOES['tr-salvar'] = () => {
  const t = dadosTreino();
  const a = t.ativo;
  const f = t.fichas.find((x) => x.id === a.fichaId);
  const dur = Math.round(((a.fim || Date.now()) - a.inicio) / 1000);
  t.sessoes.push({ id: novoId(), data: hojeISO(new Date(a.inicio)), fichaId: f?.id || '', nome: f?.nome || 'Treino', dur,
    series: Object.values(a.feitas).reduce((s, x) => s + x, 0), exercicios: Object.keys(a.feitas).length, sentir: a.sentir || '', obs: ($('#tr-obs')?.value || a.obs || '').trim() });
  t.ativo = null;
  treinoTela.aba = 'hoje';
  const marcou = marcarHabitoAuto(t.habito, hojeISO(new Date(a.inicio)));
  salvar(); desenhar();
  avisar(`Treino salvo: ${fmtDur(dur)}. Mandou bem!${marcou ? ` "${nomeHabito(t.habito)}" marcado na Rotina.` : ''}`);
};

function atualizarTreino() {
  const a = dadosTreino().ativo;
  if (!a || location.hash !== '#treino') return;
  const tot = $('#tr-total');
  if (tot && a.fase !== 'fim') tot.textContent = fmtSeg((Date.now() - a.inicio) / 1000);
  if (a.fase !== 'descanso' && a.fase !== 'trabalho') return;
  const resta = (a.faseFim - Date.now()) / 1000;
  const el = $('#tr-timer');
  if (el) el.textContent = fmtSeg(Math.ceil(resta));
  const arco = $('#tr-arco');
  if (arco) arco.setAttribute('stroke-dashoffset', String(440 * (1 - Math.max(0, resta) / Math.max(1, (a.faseFim - a.faseIni) / 1000))));
  const falta = Math.ceil(resta);
  if (a.fase === 'descanso' && falta >= 1 && falta <= 3 && a.ultimoBip !== `${a.faseFim}-${falta}`) { a.ultimoBip = `${a.faseFim}-${falta}`; bip(false); }
  if (resta <= 0) {
    bip(true);
    if (a.fase === 'trabalho') avancarSerie();
    else { proximoPasso(); salvar(); desenhar(); }
  }
}

const RITMOS = { corrida: 'Corrida', trote: 'Trote', caminhada: 'Caminhada', esteira: 'Esteira', intervalado: 'Intervalado', bike: 'Bicicleta' };
const paceDe = (c) => (c.km > 0 ? c.tempo / c.km : 0);
const textoPace = (s) => (s ? `${Math.floor(s / 60)}'${String(Math.round(s % 60)).padStart(2, '0')}"/km` : '—');

function htmlCorrida() {
  const t = dadosTreino();
  const cr = t.corridaAtiva;
  const lista = [...t.corridas].sort((a, b) => b.data.localeCompare(a.data));
  const mes = hojeISO().slice(0, 7);
  const doMes = t.corridas.filter((c) => c.data.startsWith(mes));
  const kmMes = doMes.reduce((a, c) => a + c.km, 0);
  const comPace = t.corridas.filter((c) => c.km >= 1 && c.tipo !== 'bike');
  const melhor = comPace.length ? Math.min(...comPace.map(paceDe)) : 0;
  const maior = t.corridas.length ? Math.max(...t.corridas.map((c) => c.km)) : 0;
  const semanas = Array.from({ length: 8 }, (_, k) => somarDias(segundaDaSemana(hojeISO()), (k - 7) * 7));
  const kmSem = semanas.map((s) => t.corridas.filter((c) => c.data >= s && c.data <= somarDias(s, 6)).reduce((a, c) => a + c.km, 0));
  const maxSem = Math.max(1, ...kmSem);
  const tempoCr = cr ? (cr.acum + (cr.inicio ? Date.now() - cr.inicio : 0)) / 1000 : 0;
  const pre = treinoTela.corridaPre || {};
  const h = Math.floor((pre.tempo || 0) / 3600), m = Math.floor(((pre.tempo || 0) % 3600) / 60), s = Math.round((pre.tempo || 0) % 60);
  return `
  <div class="grade g4" style="margin-top:16px">
    <div class="card stat"><span class="selo c-azul">${ic('flame')}</span><div><b>${fmtNum(kmMes)} km</b><span>este mês (${doMes.length} ${doMes.length === 1 ? 'vez' : 'vezes'})</span></div></div>
    <div class="card stat"><span class="selo c-verde">${ic('timer')}</span><div><b>${textoPace(melhor)}</b><span>melhor pace (1 km ou mais)</span></div></div>
    <div class="card stat"><span class="selo c-amarelo">${ic('target')}</span><div><b>${fmtNum(maior)} km</b><span>maior distância</span></div></div>
    <div class="card stat"><span class="selo c-violeta">${ic('clock')}</span><div><b>${textoMinutos(Math.round(t.corridas.reduce((a, c) => a + c.tempo, 0) / 60))}</b><span>no total</span></div></div>
  </div>
  <div class="grade-corrida">
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-azul">${ic('timer')}</span> Cronometrar agora</h2>
      <div class="crono-corrida"><b id="cr-tempo">${fmtSeg(tempoCr)}</b><span>${cr ? (cr.inicio ? 'correndo' : 'pausado') : 'pronto'}</span></div>
      <div class="form-linha" style="justify-content:center">
        <button class="btn" data-acao="cr-play">${cr?.inicio ? `${ic('pause', 'p')} Pausar` : `${ic('play', 'p')} ${cr ? 'Continuar' : 'Iniciar corrida'}`}</button>
        ${cr ? `<button class="btn sec" data-acao="cr-fim">${ic('check', 'p')} Terminei</button><button class="btn sec" data-acao="cr-zerar" title="Zerar">${ic('reset', 'p')}</button>` : ''}
      </div>
      <p class="dica" style="text-align:center">Ao terminar, o tempo vai para o formulário e você só coloca a distância.</p>
    </section>
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-azul">${ic('plus')}</span> Registrar corrida</h2>
      <form data-form="corrida-salvar" class="form-corrida">
        <div class="linha2">
          <label class="campo">Dia<input type="date" name="data" value="${pre.data || hojeISO()}" max="${hojeISO()}"></label>
          <label class="campo">Tipo<select name="tipo">${Object.entries(RITMOS).map(([id, n]) => `<option value="${id}" ${(pre.tipo || 'corrida') === id ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
        <div class="linha2">
          <label class="campo">Distância (km)<input type="text" inputmode="decimal" name="km" id="cr-km" value="${pre.km || ''}" placeholder="5,0" data-digitar="cr-calc"></label>
          <div class="campo"><span>Tempo</span><div class="tempo-hms">
            <input type="number" name="h" min="0" max="23" value="${h || ''}" placeholder="0" aria-label="Horas" data-digitar="cr-calc"><i>h</i>
            <input type="number" name="m" min="0" max="59" value="${m || ''}" placeholder="30" aria-label="Minutos" data-digitar="cr-calc"><i>min</i>
            <input type="number" name="s" min="0" max="59" value="${s || ''}" placeholder="00" aria-label="Segundos" data-digitar="cr-calc"><i>s</i></div></div>
        </div>
        <p class="pace-vivo" id="cr-pace">Pace: — · Velocidade: —</p>
        <div class="linha2">
          <label class="campo">Como se sentiu<select name="sentir"><option value="">—</option>${[['5', 'Muito bem'], ['4', 'Bem'], ['3', 'Ok'], ['2', g('Cansada', 'Cansado', 'Com pouca energia')], ['1', g('Muito cansada', 'Muito cansado', 'Sem energia')]].map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>
          <label class="campo">Local ou anotação<input type="text" name="obs" maxlength="80"></label>
        </div>
        <div class="form-linha" style="justify-content:flex-end"><button class="btn">${ic('check', 'p')} Salvar corrida</button></div>
      </form>
    </section>
  </div>
  <section class="card">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('chart')}</span> Quilômetros por semana</h2>
    <div class="barras-km">${kmSem.map((v, k) => `<div class="barra-km" title="${fmtNum(v)} km"><em>${v ? fmtNum(v) : ''}</em><span style="height:${Math.round((v / maxSem) * 100)}%"></span><small>${diaCurto(semanas[k])}</small></div>`).join('')}</div>
  </section>
  <section class="card">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('list')}</span> Suas corridas</h2>
    <div class="lista-rolavel" style="max-height:380px">${lista.map((c) => `<div class="item">
      <span class="txt">${fmtNum(c.km, 2)} km · ${fmtSeg(c.tempo)}<span class="sub">${dataCurta(c.data)} · ${RITMOS[c.tipo] || 'Corrida'} · ${c.tipo === 'bike' ? `${fmtNum(c.km / (c.tempo / 3600))} km/h` : textoPace(paceDe(c))}${c.obs ? ` · ${esc(c.obs)}` : ''}</span></span>
      <button class="acao-item apagar" data-acao="corrida-del" data-id="${c.id}" title="Apagar">${ic('trash', 'p')}</button></div>`).join('') || '<p class="vazio">Nenhuma corrida registrada ainda.</p>'}</div>
  </section>`;
}

function lerTempoForm(form) {
  const v = (n) => Number(form.querySelector(`[name=${n}]`)?.value) || 0;
  return v('h') * 3600 + v('m') * 60 + v('s');
}
DIGITAR['cr-calc'] = (el) => {
  const form = el.closest('form');
  const km = numero(form.querySelector('[name=km]').value) || 0;
  const seg = lerTempoForm(form);
  const p = $('#cr-pace');
  if (p) p.textContent = km > 0 && seg > 0 ? `Pace: ${textoPace(seg / km)} · Velocidade: ${fmtNum(km / (seg / 3600))} km/h` : 'Pace: — · Velocidade: —';
};
FORMS['corrida-salvar'] = (d, form) => {
  const km = numero(d.km);
  const tempo = lerTempoForm(form);
  if (!km || km <= 0) { avisar('Coloque a distância em km.'); return; }
  if (!tempo) { avisar('Coloque quanto tempo durou.'); return; }
  dadosTreino().corridas.push({ id: novoId(), data: d.data || hojeISO(), tipo: d.tipo, km, tempo, sentir: d.sentir, obs: d.obs });
  marcarHabitoAuto(dadosTreino().habito, d.data || hojeISO());
  treinoTela.corridaPre = null;
  salvar(); desenhar();
  avisar(`Corrida salva: ${fmtNum(km, 2)} km${d.tipo !== 'bike' ? ` a ${textoPace(tempo / km)}` : ''}.`);
};
ACOES['corrida-del'] = (el) => {
  const t = dadosTreino();
  const pos = t.corridas.findIndex((c) => c.id === el.dataset.id);
  const [c] = t.corridas.splice(pos, 1);
  salvar(); desenhar();
  avisar('Corrida apagada.', () => { t.corridas.splice(pos, 0, c); salvar(); desenhar(); });
};
ACOES['cr-play'] = () => {
  const t = dadosTreino();
  const cr = t.corridaAtiva || (t.corridaAtiva = { acum: 0, inicio: 0 });
  if (cr.inicio) { cr.acum += Date.now() - cr.inicio; cr.inicio = 0; } else cr.inicio = Date.now();
  salvar(); desenhar();
};
ACOES['cr-zerar'] = () => {
  if (!confirmarDuasVezes('cr-zerar', 'Clique de novo para zerar o cronômetro.')) return;
  dadosTreino().corridaAtiva = null; salvar(); desenhar();
};
ACOES['cr-fim'] = () => {
  const t = dadosTreino();
  const cr = t.corridaAtiva;
  const tempo = (cr.acum + (cr.inicio ? Date.now() - cr.inicio : 0)) / 1000;
  t.corridaAtiva = null;
  treinoTela.corridaPre = { tempo, data: hojeISO() };
  salvar(); desenhar();
  $('#cr-km')?.focus();
  avisar('Tempo anotado. Agora coloque a distância e salve.');
};
function atualizarCorrida() {
  const cr = estado.treino?.corridaAtiva;
  const el = $('#cr-tempo');
  if (cr?.inicio && el) el.textContent = fmtSeg((cr.acum + Date.now() - cr.inicio) / 1000);
}

function htmlHistTreino() {
  const t = dadosTreino();
  const m = treinoTela.mesHist;
  const [ano, mes] = m.split('-').map(Number);
  const primeiro = `${m}-01`;
  const ini = somarDias(primeiro, -((paraData(primeiro).getDay() + 6) % 7));
  const dias = Array.from({ length: 42 }, (_, k) => somarDias(ini, k));
  const sessoes = [...t.sessoes.map((s) => ({ ...s, tipoReg: 'treino' })), ...t.corridas.map((c) => ({ ...c, tipoReg: 'corrida', dur: c.tempo, nome: `${RITMOS[c.tipo] || 'Corrida'} ${fmtNum(c.km, 2)} km` }))]
    .sort((a, b) => b.data.localeCompare(a.data));
  const doMes = sessoes.filter((s) => s.data.startsWith(m));
  const sentirTxt = { 5: 'muito bom', 4: 'bom', 3: 'ok', 2: 'pesado', 1: 'muito pesado' };
  return `
  <div class="grade-hist-treino">
    <section class="card">
      <div class="barra-lista" style="margin-bottom:10px">
        <button class="btn-icone" data-acao="hist-mes" data-v="-1" aria-label="Mês anterior">${ic('left')}</button>
        <b style="flex:1;text-align:center">${MESES_LONGOS[mes - 1]} de ${ano}</b>
        <button class="btn-icone" data-acao="hist-mes" data-v="1" aria-label="Próximo mês">${ic('right')}</button>
      </div>
      <div class="cal-treino">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => `<small>${d}</small>`).join('')}
        ${dias.map((d) => { const tr = t.sessoes.some((s) => s.data === d); const co = t.corridas.some((c) => c.data === d);
          return `<span class="${d.slice(0, 7) !== m ? 'fora' : ''} ${d === hojeISO() ? 'hoje' : ''} ${tr ? 'tr' : ''} ${co ? 'co' : ''}" title="${tr ? 'treino ' : ''}${co ? 'corrida' : ''}">${Number(d.slice(8))}</span>`; }).join('')}</div>
      <p class="dica"><span class="leg tr"></span> treino <span class="leg co"></span> corrida · ${new Set(doMes.map((s) => s.data)).size} dias ativos no mês</p>
    </section>
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('list')}</span> Registros</h2>
      <div class="lista-rolavel" style="max-height:420px">${sessoes.slice(0, 80).map((s) => `<div class="item">
        <span class="txt">${esc(s.nome)}<span class="sub">${dataCurta(s.data)} · ${fmtSeg(s.dur)}${s.series ? ` · ${s.series} séries` : ''}${s.sentir ? ` · ${sentirTxt[s.sentir]}` : ''}${s.obs ? ` · ${esc(s.obs)}` : ''}</span></span>
        ${s.tipoReg === 'treino' ? `<button class="acao-item apagar" data-acao="sessao-del" data-id="${s.id}" title="Apagar">${ic('trash', 'p')}</button>` : `<button class="acao-item apagar" data-acao="corrida-del" data-id="${s.id}" title="Apagar">${ic('trash', 'p')}</button>`}
      </div>`).join('') || '<p class="vazio">Seus treinos e corridas aparecem aqui.</p>'}</div>
    </section>
  </div>`;
}
ACOES['hist-mes'] = (el) => {
  const [a, m] = treinoTela.mesHist.split('-').map(Number);
  const d = new Date(a, m - 1 + Number(el.dataset.v), 1);
  treinoTela.mesHist = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  desenhar();
};
ACOES['sessao-del'] = (el) => {
  const t = dadosTreino();
  const pos = t.sessoes.findIndex((s) => s.id === el.dataset.id);
  const [s] = t.sessoes.splice(pos, 1);
  salvar(); desenhar();
  avisar('Treino apagado.', () => { t.sessoes.splice(pos, 0, s); salvar(); desenhar(); });
};
