PAGINAS.dashboard = {
  titulo: 'Dashboard',
  desenhar() {
    const hoje = hojeISO();
    const reg = registroDoDia();
    const agora = new Date();
    const h = agora.getHours();
    const oi = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

    const deHoje = estado.tarefas.filter((t) => t.data === hoje).sort(porHora);
    const pendHoje = deHoje.filter((t) => !t.feito);
    const atrasadas = estado.tarefas.filter((t) => !t.feito && t.data && t.data < hoje);
    const habHoje = habitosDoDia(hoje);
    const hab = feitosNoDia(hoje, habHoje);
    const gruposComHabito = new Set(habHoje.map((x) => x.grupo)).size;
    const habSemana = estado.habitos.filter((x) => x.meta > 0);
    const meta = estado.config.metaAgua;

    const proximas = [
      ...estado.tarefas.filter((t) => !t.feito && t.data > hoje).map((t) => ({ titulo: t.tipo === 'aniversario' ? `Aniversário: ${t.titulo}${idadeAniver(t) > 0 ? ` (${idadeAniver(t)} anos)` : ''}` : t.titulo, data: t.data, cor: t.tipo === 'aniversario' ? '#f59ad8' : AREAS[t.area] || AREAS.Pessoal })),
      ...estado.listas.flatMap((l) => datasDaLista(l).filter((x) => x.data > hoje).map((x) => ({ ...x, cor: l.cor, lista: l.nome }))),
      ...datasDasContas().filter((x) => x.data >= hoje).map((x) => ({ ...x, lista: 'Finanças' })),
    ].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5);

    const semana = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6));

    const blocos = {
      resumo: `<div class="grade g4">
      <a class="card stat" href="#agenda"><span class="selo c-violeta">${ic('calendar')}</span>
        <div><b>${pendHoje.length}</b><span>para hoje</span></div></a>
      <a class="card stat" href="#agenda"><span class="selo c-vermelho">${ic('alert')}</span>
        <div><b>${atrasadas.length}</b><span>atrasadas</span></div></a>
      <a class="card stat" href="#rotina"><span class="selo c-verde">${ic('repeat')}</span>
        <div><b>${hab}/${habHoje.length}</b><span>rotina de hoje</span></div></a>
      <div class="card stat"><span class="selo c-azul">${ic('drop')}</span>
        <div><b>${reg.agua}/${meta}</b><span>copos de água</span></div></div>
    </div>`,
      hoje: `<section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('sun')}</span> Hoje <a href="#agenda">Abrir agenda</a></h2>
        ${atrasadas.length > 1 ? `<button class="btn-mini" data-acao="atrasadas-hoje" style="margin:0 0 6px 8px">${ic('right', 'p')} Passar as ${atrasadas.length} atrasadas para hoje</button>` : ''}
        ${atrasadas.map(htmlTarefa).join('')}
        ${deHoje.map(htmlTarefa).join('')}
        ${!deHoje.length && !atrasadas.length ? '<p class="vazio">Nada marcado para hoje.</p>' : ''}
        <form class="form-linha" data-form="tarefa-rapida" style="margin-top:12px">
          <input type="text" name="titulo" id="rapida-titulo" placeholder="Adicionar tarefa para hoje" maxlength="120" data-precisa style="flex:3 1 200px">
          <input type="time" name="hora" id="rapida-hora" title="Hora (opcional, para receber aviso)" style="flex:1 1 110px">
          <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
        </form>
      </section>`,
      proximas: `<section class="card">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('clock')}</span> Próximas datas</h2>
        ${proximas.length ? proximas.map((p) => {
          const d = paraData(p.data);
          return `<div class="prox">
            <div class="prox-data"><b>${d.getDate()}</b><small>${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>
            <div class="txt" style="flex:1;font-weight:700">${esc(p.titulo)}
              <span style="display:block;font-size:12.5px;color:var(--suave);font-weight:500">${quandoFalta(p.data)}${p.lista ? ' · ' + esc(p.lista) : ''}</span></div>
            <span class="barra-cor" style="background:${p.cor}"></span>
          </div>`;
        }).join('') : '<p class="vazio">Nenhuma data marcada.</p>'}
      </section>`,
      rotina: `<section class="card coluna">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('repeat')}</span> Rotina de hoje <a href="#rotina">${hab}/${habHoje.length}</a></h2>
        <div class="prog" style="margin-bottom:10px"><i style="width:${habHoje.length ? (hab / habHoje.length) * 100 : 0}%"></i></div>
        <div class="lista-rolavel">
          ${gruposHabito().map((g) => {
            const hs = habHoje.filter((x) => x.grupo === g);
            if (!hs.length) return '';
            return `${gruposComHabito > 1 ? `<div class="grupo-mini">${esc(g)}</div>` : ''}
              ${hs.map((x) => {
                const on = reg.habitos.includes(x.id);
                return `<div class="item ${on ? 'feito' : ''}">
                  <button class="check ${on ? 'on' : ''}" data-acao="habito-hoje" data-id="${x.id}" aria-label="marcar">${on ? ic('check') : ''}</button>
                  <span class="txt">${esc(x.nome)}</span></div>`;
              }).join('')}`;
          }).join('') || (habSemana.length ? '' : `<p class="vazio">${estado.habitos.length ? 'Nenhum hábito para hoje.' : 'Crie hábitos na página Rotina diária.'}</p>`)}
          ${habSemana.length ? `<div class="grupo-mini">Na semana</div>
            ${habSemana.map((x) => {
              const on = reg.habitos.includes(x.id);
              const n = feitosNaSemana(x, hoje);
              return `<div class="item ${on ? 'feito' : ''}">
                <button class="check ${on ? 'on' : ''}" data-acao="habito-hoje" data-id="${x.id}" aria-label="marcar">${on ? ic('check') : ''}</button>
                <span class="txt">${esc(x.nome)}</span><span class="meta-sem ${n >= x.meta ? 'ok' : ''}">${n}/${x.meta}</span></div>`;
            }).join('')}` : ''}
        </div>
      </section>`,
      agua: `<section class="card coluna">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('drop')}</span> Água <small>meta: ${(meta * 0.25).toFixed(2).replace('.', ',')} L</small></h2>
        <div class="centro">
          <div class="agua-total"><b>${(reg.agua * 0.25).toFixed(2).replace('.', ',')} L</b><span>${reg.agua} de ${meta} copos de 250 ml</span></div>
          <div class="copos">${Array.from({ length: meta }, (_, i) => `<button class="copo ${i < reg.agua ? 'cheio' : ''}" data-acao="agua" data-i="${i}" aria-label="copo ${i + 1}"></button>`).join('')}</div>
          <div class="botoes">
            <button class="btn sec" data-acao="agua-menos" aria-label="Tirar um copo">−</button>
            <button class="btn" data-acao="agua-mais">${ic('plus', 'p')} 1 copo</button>
          </div>
        </div>
        <div class="prog"><i style="width:${Math.min(100, (reg.agua / meta) * 100)}%;background:var(--agua)"></i></div>
      </section>`,
      humor: `<section class="card coluna">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('heart')}</span> Como você está?</h2>
        <div class="centro">
          <div class="humores">
            ${HUMORES.map((x) => `<button class="humor ${reg.humor === x.id ? 'on' : ''}" data-acao="humor" data-h="${x.id}" title="${x.nome}" style="${reg.humor === x.id ? 'color:var(--amarelo)' : ''}">
              <svg><use href="#i-${x.id}"/></svg></button>`).join('')}
          </div>
          <p class="humor-nome">${reg.humor ? HUMORES.find((x) => x.id === reg.humor)?.nome : 'Toque no rostinho que combina com o seu dia'}</p>
          <div class="semana-humor">
            ${semana.map((d) => {
              const hm = estado.diario[d]?.humor;
              return `<div>${hm ? `<svg class="ic" style="color:var(--amarelo)"><use href="#i-${hm}"/></svg>` : '<span class="ponto"></span>'}${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</div>`;
            }).join('')}
          </div>
        </div>
        <a class="dica" href="#graficos" style="margin:0">Ver o humor nos gráficos</a>
      </section>`,
      foco: `<section class="card coluna pomo">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('timer')}</span> Foco
          <span class="segmento foco-tipo">
            <button class="${focoTela.tipo === 'pomodoro' ? 'ativo' : ''}" data-acao="foco-tipo" data-t="pomodoro">Pomodoro</button>
            <button class="${focoTela.tipo === 'cronometro' ? 'ativo' : ''}" data-acao="foco-tipo" data-t="cronometro">Cronômetro</button>
          </span></h2>
        <div class="centro">
          <div class="anel">
            <svg width="150" height="150" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" style="stroke:var(--card-2)" stroke-width="8"/>
              <circle id="pomo-arco" cx="80" cy="80" r="70" fill="none" stroke="url(#gradFoco)" stroke-width="8" stroke-linecap="round"/>
              <defs><linearGradient id="gradFoco"><stop offset="0" style="stop-color:var(--destaque-2)"/><stop offset="1" stop-color="#f59ad8"/></linearGradient></defs>
            </svg>
            <div class="anel-tempo">${focoTela.tipo === 'pomodoro'
              ? `<b id="pomo-tempo">25:00</b><span id="pomo-estado">${pomo.estado || g('pronta para focar', 'pronto para focar', 'hora de focar')}</span>`
              : `<b id="crono-tempo">${textoCrono(tempoCrono())}</b><span id="crono-estado">${estadoCrono()}</span>`}</div>
          </div>
          <label class="rotulo-select foco-materia">Estudando
            ${estado.config.focoMateria === '__tema'
              ? `<input class="foco-tema" type="text" maxlength="60" placeholder="Digite o tema" value="${esc(estado.config.focoTema || '')}" data-digitar="foco-tema" aria-label="Tema do estudo" autocomplete="off">
                <button type="button" class="foco-tema-sair" data-acao="foco-tema-sair" aria-label="Voltar para a lista" title="Voltar para a lista">${ic('x', 'p')}</button>`
              : `<select data-mudar="foco-materia">
              <option value="">Nada específico</option>
              <option value="__tema">✎ Outro tema (digitar)…</option>
              ${todasMaterias().filter((g) => g.materias.length).map((g) => `<optgroup label="${esc(g.lista.nome)}">
                ${g.materias.map((m) => `<option value="${g.lista.id}/${m.id}" ${estado.config.focoMateria === `${g.lista.id}/${m.id}` ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</optgroup>`).join('')}
            </select>`}</label>
          ${htmlVinculo('foco', 'Ao terminar um foco, marcar')}
          <div class="foco-linha">${focoTela.tipo === 'pomodoro'
            ? `<div class="segmento">${[['Foco', 25, 'foco'], ['Pausa', 5, 'pausa'], ['Longa', 15, 'longa']].map(([n, m, id]) =>
                `<button class="${pomo.modo === id ? 'ativo' : ''}" data-acao="pomo-modo" data-min="${m}" data-modo="${id}">${n} ${m}</button>`).join('')}</div>`
            : `<input class="foco-assunto" type="text" maxlength="80" placeholder="O que está vendo?" value="${esc(crono().assunto || '')}" data-digitar="crono-assunto" aria-label="O que está vendo">`}</div>
          <div class="botoes">${focoTela.tipo === 'pomodoro'
            ? `<button class="btn" id="pomo-play" data-acao="pomo-play">${ic('play', 'p')} Começar</button>
              <button class="btn sec" data-acao="pomo-reset" aria-label="Reiniciar" title="Reiniciar">${ic('reset', 'p')}</button>`
            : `<button class="btn" id="crono-play" data-acao="crono-play">${crono().inicio ? `${ic('pause', 'p')} Pausar` : `${ic('play', 'p')} ${crono().acumulado ? 'Continuar' : 'Iniciar'}`}</button>
              <button class="btn sec" data-acao="crono-finalizar" ${tempoCrono() >= 1000 ? '' : 'disabled'} title="Salvar o tempo estudado">${ic('check', 'p')} Finalizar</button>
              <button class="btn sec" data-acao="crono-descartar" ${tempoCrono() >= 1000 ? '' : 'disabled'} aria-label="Descartar" title="Descartar">${ic('reset', 'p')}</button>`}</div>
        </div>
        <p class="dica foco-rodape">${focoTela.tipo === 'cronometro'
          ? `${minutosHoje() ? `${textoMinutos(minutosHoje())} hoje · ` : ''}<a href="#" data-acao="crono-manual">Esqueceu de iniciar? Lançar manualmente</a>`
          : (reg.pomodoros ? `${reg.pomodoros} ${reg.pomodoros === 1 ? 'ciclo' : 'ciclos'} de foco hoje` : 'Nenhum ciclo de foco hoje ainda.')}</p>
        ${focoTela.tipo === 'cronometro' && focoTela.manual ? `<form class="crono-manual" data-form="crono-manual">
          <h3>Lançar horário manualmente</h3>
          <p class="dica">Fica salvo em <b>${esc(nomeAlvoFoco() || 'Nada específico')}</b>${crono().assunto ? ` · ${esc(crono().assunto)}` : ''}</p>
          <label class="campo">Dia<input type="date" name="dia" value="${hojeISO()}" max="${hojeISO()}"></label>
          <div class="crono-manual-campos">
            <label class="campo">Das<input type="time" name="ini"></label>
            <label class="campo">Até<input type="time" name="fim"></label>
          </div>
          <div class="crono-manual-botoes">
            <button type="button" class="btn sec" data-acao="crono-manual">Cancelar</button>
            <button class="btn">${ic('check', 'p')} Salvar tempo</button>
          </div>
        </form>` : ''}
      </section>`,
      estudos: htmlProximosPassosDash(hoje),
      listas: `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('list')}</span> Minhas listas
        <a href="#" data-acao="lista-nova">${ic('plus', 'p')} Nova lista</a></h2>
      <div class="grade g3" style="margin:0">
        ${estado.listas.map((l) => {
          const { total, feitos, texto } = contarLista(l);
          return `<a class="resumo-lista" href="#lista-${l.id}">
            <span class="selo" style="background:${l.cor}26;color:${l.cor}">${ic(l.icone)}</span>
            <span class="meio">${esc(l.nome)}<small>${texto || (total ? `${feitos} de ${total} concluídos` : 'vazia')}</small>
              <span class="prog" style="display:block"><i style="width:${total ? (feitos / total) * 100 : 0}%"></i></span></span>
          </a>`;
        }).join('')}
      </div>
    </section>`,
    };

    return `
    <div class="ola">
      <div><h1>${oi}, ${esc(estado.config.nome)}</h1>
        <p>${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <div class="ola-acoes">
        <div class="clima" id="clima">${htmlClima()}</div>
        <button class="btn-mini ${dashTela.editando ? 'ativo' : ''}" data-acao="dash-personalizar">${ic('sliders', 'p')} Personalizar</button>
      </div>
    </div>
    ${htmlPedirNotificacao()}
    ${htmlAvisoBackup()}
    ${htmlAvisoEspaco()}
    ${estado.treino?.ativo ? `<a class="alerta convite" href="#treino">${ic('gym')}<span><b>Treino em andamento.</b> Toque para voltar de onde parou.</span><span class="btn">Voltar</span></a>` : ''}
    ${temModulo('jejum') && estado.jejum?.ativo ? `<a class="alerta convite" href="#bemestar">${ic('timer')}<span><b>Jejum em andamento:</b> ${fmtHoras((Date.now() - estado.jejum.ativo.inicio) / 3600000)} de ${estado.jejum.ativo.metaH}h.</span><span class="btn">Ver</span></a>` : ''}
    ${(() => {
      if (agora.getDay() !== 0) return '';
      const semana = segundaDaSemana(hoje);
      if (estado.revisoes[semana]?.foco || estado.config.revisaoVista === semana) return '';
      return `<a class="alerta convite" href="#revisao" data-acao="rev-abrir" data-semana="${semana}">${ic('review')}<span><b>Hora da revisão da semana.</b> Veja o que fez, o que ficou para trás e escolha o foco da próxima.</span><span class="btn">Abrir</span></a>`;
    })()}
    ${(() => {
      const d = paraData(hoje);
      if (d.getDate() > 5) return '';
      const ant = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const m = `${ant.getFullYear()}-${String(ant.getMonth() + 1).padStart(2, '0')}`;
      if (estado.config.retroVista === m) return '';
      return `<a class="alerta convite" href="#retrospectiva" data-acao="retro-abrir" data-m="${m}">${ic('sparkle')}<span><b>Sua retrospectiva de ${MESES_LONGOS[ant.getMonth()].toLowerCase()} está pronta.</b> Veja tudo o que você fez no mês.</span><span class="btn">Ver</span></a>`;
    })()}
    ${dashTela.editando ? htmlPersonalizarDash() : ''}
    <div class="grade-dash">
      ${(() => { Object.assign(blocos, blocosDosModulos()); const vis = blocosDash().filter((b) => b.visivel && blocoDisponivel(b.id) && blocos[b.id]); const extras = espacosDash(vis.map((b) => BLOCOS_DASH[b.id].tam)); return vis.map((b, k) => `<div class="bloco-dash tam-${BLOCOS_DASH[b.id].tam} ${extras[k]}">${blocos[b.id]}</div>`).join(''); })()}
    </div>`;
  },
};

const BLOCOS_DASH = {
  resumo: { nome: 'Resumo do dia', tam: 'cheio' },
  hoje: { nome: 'Hoje', tam: 'meio' },
  proximas: { nome: 'Próximas datas', tam: 'meio' },
  rotina: { nome: 'Rotina de hoje', tam: 'um' },
  agua: { nome: 'Água', tam: 'um' },
  humor: { nome: 'Como você está?', tam: 'um' },
  foco: { nome: 'Foco', tam: 'um' },
  estudos: { nome: 'Estudos: próximo passo', tam: 'meio' },
  treino: { nome: 'Treino de hoje', tam: 'um', modulo: 'treino' },
  jejum: { nome: 'Jejum', tam: 'um', modulo: 'jejum' },
  pets: { nome: 'Pets', tam: 'um', modulo: 'pets' },
  apps: { nome: 'Apps de estudo', tam: 'um', modulo: 'apps' },
  listas: { nome: 'Minhas listas', tam: 'cheio' },
};
function espacosDash(tams) {
  const classes = tams.map(() => []);
  [4, 2].forEach((cols) => {
    const larg = tams.map((t) => (t === 'cheio' ? cols : t === 'meio' ? Math.min(2, cols) : 1));
    const span = [...larg];
    let pos = 0, ultimo = -1;
    larg.forEach((w, k) => {
      if (pos && pos + w > cols) { span[ultimo] += cols - pos; pos = 0; }
      pos += w; ultimo = k;
      if (pos >= cols) pos = 0;
    });
    if (pos && ultimo >= 0) span[ultimo] += cols - pos;
    span.forEach((v, k) => { if (v !== larg[k]) classes[k].push(`s${cols}-${v}`); });
  });
  return classes.map((c) => c.join(' '));
}
const blocoDisponivel = (id) => !BLOCOS_DASH[id].modulo || temModulo(BLOCOS_DASH[id].modulo);
const dashTela = { editando: false };

function blocosDash() {
  const salvos = (estado.config.dashboard || []).filter((b) => BLOCOS_DASH[b.id]);
  Object.keys(BLOCOS_DASH).forEach((id) => {
    if (salvos.some((b) => b.id === id)) return;
    const pos = salvos.findIndex((b) => b.id === 'listas');
    if (pos >= 0) salvos.splice(pos, 0, { id, visivel: true }); else salvos.push({ id, visivel: true });
  });
  estado.config.dashboard = salvos;
  return salvos;
}

function htmlPersonalizarDash() {
  return `<section class="card personalizar-dash">
    <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('sliders')}</span> Personalizar o Dashboard
      <a href="#" data-acao="dash-padrao">Voltar ao padrão</a></h2>
    <p class="dica" style="margin:-6px 0 12px">Arraste para mudar a ordem e use o olho para mostrar ou esconder cada parte.</p>
    <div class="blocos-dash-lista">
      ${blocosDash().filter((b) => blocoDisponivel(b.id)).map((b) => `<div class="item ${b.visivel ? '' : 'feito'}" ${ordem('|config.dashboard', b.id)}>
        ${alca()}
        <span class="txt">${BLOCOS_DASH[b.id].nome}</span>
        <button class="acao-item" data-acao="dash-ver" data-id="${b.id}" title="${b.visivel ? 'Esconder' : 'Mostrar'}">${ic(b.visivel ? 'eye' : 'eyeoff', 'p')}</button>
      </div>`).join('')}
    </div>
    <button class="btn" data-acao="dash-personalizar" style="margin-top:12px">${ic('check', 'p')} Pronto</button>
  </section>`;
}

ACOES['dash-personalizar'] = () => { dashTela.editando = !dashTela.editando; desenhar(); };
ACOES['dash-ver'] = (el) => {
  const b = blocosDash().find((x) => x.id === el.dataset.id);
  b.visivel = !b.visivel;
  salvar(); desenhar();
};
ACOES['dash-padrao'] = () => { estado.config.dashboard = []; salvar(); desenhar(); };

function porHora(a, b) {
  return (a.hora || '99').localeCompare(b.hora || '99') || (PESO_PRIORIDADE[a.prioridade] ?? 3) - (PESO_PRIORIDADE[b.prioridade] ?? 3);
}

let clima = null;
function iconeClima(cod) {
  if (cod === 0 || cod === 1) return ['sun', cod === 0 ? 'Céu limpo' : 'Poucas nuvens'];
  if (cod === 2 || cod === 3 || cod === 45 || cod === 48) return ['cloud', cod === 2 ? 'Parcialmente nublado' : cod === 3 ? 'Nublado' : 'Neblina'];
  if (cod >= 51 && cod <= 67) return ['rain', cod < 61 ? 'Garoa' : 'Chuva'];
  if (cod >= 80 && cod <= 82) return ['rain', 'Pancadas de chuva'];
  if (cod >= 95) return ['rain', 'Tempestade'];
  return ['cloud', ''];
}

function htmlClima() {
  const cid = estado.config.cidade;
  if (!cid) return `<a href="#configuracoes" class="clima-vazio">${ic('cloud')}<div><b>Clima</b><small>escolher cidade</small></div></a>`;
  if (!clima || clima.erro) return `${ic('moon')}<div><b>${esc(cid.nome)}</b><small>${clima ? 'clima indisponível' : 'carregando…'}</small></div>`;
  return `${ic(clima.icone)}<div><b>${clima.temp}°</b><small>${esc(cid.nome)} · ${clima.texto} · ${clima.min}°/${clima.max}°</small></div>`;
}

async function buscarClima() {
  try {
    const cid = estado.config.cidade;
    if (!cid) { clima = null; if ($('#clima')) $('#clima').innerHTML = htmlClima(); return; }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cid.lat}&longitude=${cid.lon}`
      + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min'
      + '&timezone=auto&forecast_days=1';
    const j = await (await fetch(url)).json();
    const [icone, texto] = iconeClima(j.current.weather_code);
    clima = {
      icone, texto,
      temp: Math.round(j.current.temperature_2m),
      min: Math.round(j.daily.temperature_2m_min[0]),
      max: Math.round(j.daily.temperature_2m_max[0]),
    };
  } catch {
    clima = { erro: true };
  }
  if ($('#clima')) $('#clima').innerHTML = htmlClima();
}

FORMS['tarefa-rapida'] = (d) => {
  estado.tarefas.push(tarefa(d.titulo, hojeISO(), { hora: d.hora || '', tipo: 'tarefa', area: 'Pessoal', lembrete: d.hora ? 15 : -1 }));
  salvar(); desenhar();
  avisar(d.hora ? `Adicionada. Aviso 15 min antes das ${d.hora}.` : 'Tarefa adicionada.');
  $('#rapida-titulo')?.focus();
};

ACOES.agua = (el) => {
  const reg = registroDoDia();
  const i = Number(el.dataset.i);
  reg.agua = i < reg.agua ? i : i + 1;
  salvar(); desenhar();
  if (reg.agua === estado.config.metaAgua) avisar('Meta de água do dia concluída!');
};

ACOES['rev-abrir'] = (el) => { estado.config.revisaoVista = el.dataset.semana; salvar(); revTela.semana = el.dataset.semana === segundaDaSemana(hojeISO()) ? null : el.dataset.semana; location.hash = 'revisao'; };

ACOES['agua-mais'] = () => { const reg = registroDoDia(); reg.agua++; salvar(); desenhar(); if (reg.agua === estado.config.metaAgua) avisar('Meta de água do dia concluída!'); };
ACOES['agua-menos'] = () => { const reg = registroDoDia(); reg.agua = Math.max(0, reg.agua - 1); salvar(); desenhar(); };

ACOES.humor = (el) => {
  const reg = registroDoDia();
  reg.humor = reg.humor === el.dataset.h ? '' : el.dataset.h;
  salvar(); desenhar();
};

const focoTela = { tipo: 'pomodoro' };
const crono = () => (estado.config.cronometro = estado.config.cronometro || { acumulado: 0, inicio: 0, assunto: '' });
const tempoCrono = () => { const c = crono(); return c.acumulado + (c.inicio ? Date.now() - c.inicio : 0); };
const estadoCrono = () => (crono().inicio ? 'estudando' : tempoCrono() ? 'pausado' : 'pronto para começar');
function textoCrono(ms) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sg = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sg).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sg).padStart(2, '0')}`;
}
const minutosHoje = () => minutosEstudoDia(hojeISO());

function atualizarCronometro() {
  const el = $('#crono-tempo');
  if (!el) return;
  const ms = tempoCrono();
  el.textContent = textoCrono(ms);
  $('#crono-estado').textContent = estadoCrono();
  const C = 2 * Math.PI * 70;
  const arco = $('#pomo-arco');
  arco.style.strokeDasharray = C;
  arco.style.strokeDashoffset = C * (1 - ((ms / 1000) % 3600) / 3600);
  if (crono().inicio) document.title = `${textoCrono(ms)} · estudando`;
}

ACOES['foco-tipo'] = (el) => { focoTela.tipo = el.dataset.t; desenhar(); };
DIGITAR['crono-assunto'] = (el) => { crono().assunto = el.value; salvar(); };
ACOES['crono-play'] = () => {
  const c = crono();
  if (c.inicio) { c.acumulado += Date.now() - c.inicio; c.inicio = 0; }
  else c.inicio = Date.now();
  salvar(); desenhar();
};
ACOES['crono-descartar'] = () => {
  if (!confirmarDuasVezes('crono-descartar', 'Clique de novo para descartar o tempo.')) return;
  estado.config.cronometro = { acumulado: 0, inicio: 0, assunto: crono().assunto };
  document.title = estado.config.nomeEspaco || 'Minha Central';
  salvar(); desenhar();
};
ACOES['crono-finalizar'] = () => {
  const c = crono();
  const min = Math.max(1, Math.round(tempoCrono() / 60000));
  const { ref, tema } = alvoFoco();
  const reg = registroDoDia();
  if (ref) { reg.estudo = reg.estudo || {}; reg.estudo[ref] = (reg.estudo[ref] || 0) + min; }
  reg.sessoes = reg.sessoes || [];
  reg.sessoes.push({ id: novoId(), ref, ...(tema ? { tema } : {}), assunto: (c.assunto || '').trim(), min, fim: new Date().toTimeString().slice(0, 5) });
  estado.config.cronometro = { acumulado: 0, inicio: 0, assunto: '' };
  document.title = estado.config.nomeEspaco || 'Minha Central';
  salvar(); desenhar();
  tocarSom(true);
  avisar(`${textoMinutos(min)} de estudo salvos${nomeAlvoFoco() ? ` em ${nomeAlvoFoco()}` : ''}.`);
  marcarVinculo(estado.config.focoHabito);
};

ACOES['crono-manual'] = () => { focoTela.manual = !focoTela.manual; desenhar(); };
FORMS['crono-manual'] = (d) => {
  if (!d.ini || !d.fim) { avisar('Preencha o horário de início e de fim.'); return; }
  const paraMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  let min = paraMin(d.fim) - paraMin(d.ini);
  if (min <= 0) min += 24 * 60;
  if (min < 1 || min > 16 * 60) { avisar('Confira os horários: o tempo ficou estranho.'); return; }
  const dia = d.dia || hojeISO();
  const { ref, tema } = alvoFoco();
  const reg = registroDoDia(dia);
  if (ref) { reg.estudo = reg.estudo || {}; reg.estudo[ref] = (reg.estudo[ref] || 0) + min; }
  reg.sessoes = reg.sessoes || [];
  reg.sessoes.push({ id: novoId(), ref, ...(tema ? { tema } : {}), assunto: (crono().assunto || '').trim(), min, ini: d.ini, fim: d.fim, manual: true });
  if (!crono().inicio && !crono().acumulado) crono().assunto = '';
  focoTela.manual = false;
  salvar(); desenhar();
  avisar(`${textoMinutos(min)} de estudo salvos${nomeAlvoFoco() ? ` em ${nomeAlvoFoco()}` : ''}${dia !== hojeISO() ? ` no dia ${paraData(dia).toLocaleDateString('pt-BR')}` : ''}.`);
  marcarVinculo(estado.config.focoHabito, dia);
};

const pomo = { total: 25 * 60, resta: 25 * 60, rodando: false, fimEm: 0, modo: 'foco', estado: '' };

function atualizarPomodoro() {
  if (!$('#pomo-tempo')) return;
  const mm = String(Math.floor(pomo.resta / 60)).padStart(2, '0');
  const ss = String(pomo.resta % 60).padStart(2, '0');
  $('#pomo-tempo').textContent = `${mm}:${ss}`;
  $('#pomo-estado').textContent = pomo.estado || g('pronta para focar', 'pronto para focar', 'hora de focar');
  const C = 2 * Math.PI * 70;
  const arco = $('#pomo-arco');
  arco.style.strokeDasharray = C;
  arco.style.strokeDashoffset = C * (1 - pomo.resta / pomo.total);
  $('#pomo-play').innerHTML = pomo.rodando ? `${ic('pause', 'p')} Pausar` : `${ic('play', 'p')} ${pomo.resta < pomo.total ? 'Continuar' : 'Começar'}`;
}

function passoPomodoro() {
  if (!pomo.rodando) return;
  pomo.resta = Math.max(0, Math.round((pomo.fimEm - Date.now()) / 1000));
  const mm = String(Math.floor(pomo.resta / 60)).padStart(2, '0');
  const ss = String(pomo.resta % 60).padStart(2, '0');
  document.title = `${mm}:${ss} · ${pomo.modo === 'foco' ? 'foco' : 'pausa'}`;
  if (pomo.resta === 0) {
    pomo.rodando = false;
    if (pomo.modo === 'foco') {
      const reg = registroDoDia();
      reg.pomodoros++;
      const { ref, tema } = alvoFoco();
      if (ref) {
        reg.estudo = reg.estudo || {};
        reg.estudo[ref] = (reg.estudo[ref] || 0) + Math.round(pomo.total / 60);
      } else {
        // Sem matéria escolhida: guarda como sessão para entrar nas horas de estudo do dia
        reg.sessoes = reg.sessoes || [];
        reg.sessoes.push({ id: novoId(), ref: '', ...(tema ? { tema } : {}), assunto: 'Ciclo de foco', min: Math.round(pomo.total / 60), fim: new Date().toTimeString().slice(0, 5) });
      }
      salvar();
      marcarVinculo(estado.config.focoHabito);
      pomo.estado = 'hora da pausa';
      notificar('Ciclo de foco concluído', 'Hora de uma pausa.');
    } else {
      pomo.estado = 'vamos voltar?';
      notificar('A pausa acabou', 'Hora de voltar a focar.');
    }
    pomo.resta = pomo.total;
    desenhar();
    return;
  }
  atualizarPomodoro();
}

ACOES['pomo-play'] = () => {
  if (pomo.rodando) {
    pomo.rodando = false;
    pomo.estado = 'pausado';
  } else {
    pomo.fimEm = Date.now() + pomo.resta * 1000;
    pomo.rodando = true;
    pomo.estado = pomo.modo === 'foco' ? 'focando' : 'descansando';
  }
  atualizarPomodoro();
};

ACOES['pomo-reset'] = () => {
  pomo.rodando = false;
  pomo.resta = pomo.total;
  pomo.estado = g('pronta para focar', 'pronto para focar', 'hora de focar');
  atualizarCaminho();
  atualizarPomodoro();
};

MUDAR['foco-materia'] = (el) => {
  estado.config.focoMateria = el.value;
  salvar();
  if (el.value === '__tema') { desenhar(); $('.foco-tema')?.focus(); }
};
DIGITAR['foco-tema'] = (el) => { estado.config.focoTema = el.value; salvar(); };
ACOES['foco-tema-sair'] = () => { estado.config.focoMateria = ''; salvar(); desenhar(); };

// O que o Foco está estudando agora: uma matéria (ref), um tema digitado (aula avulsa) ou nada.
function alvoFoco() {
  const sel = estado.config.focoMateria;
  if (sel === '__tema') return { ref: '', tema: (estado.config.focoTema || '').trim() };
  return { ref: sel && acharRef(sel) ? sel : '', tema: '' };
}
function nomeAlvoFoco() {
  const { ref, tema } = alvoFoco();
  return ref ? nomeMateria(ref) : tema;
}

ACOES['pomo-modo'] = (el) => {
  pomo.rodando = false;
  pomo.total = pomo.resta = Number(el.dataset.min) * 60;
  pomo.modo = el.dataset.modo;
  pomo.estado = pomo.modo === 'foco' ? g('pronta para focar', 'pronto para focar', 'hora de focar') : 'hora de respirar';
  desenhar();
};

ACOES['retro-abrir'] = (el) => { estado.config.retroVista = el.dataset.m; retroTela.tipo = 'mes'; retroTela.mes = el.dataset.m; salvar(); location.hash = 'retrospectiva'; };

// Bloco "Estudos: próximo passo": cada curso/matéria em andamento com o que fazer a seguir.
// Quem tem prazo mais perto aparece primeiro; o próximo passo pode ser editado ali mesmo.
function htmlProximosPassosDash(hoje) {
  const itens = estado.listas.filter((l) => l.tipo === 'cursos').flatMap((l) => (l.materias || [])
    .filter((m) => m.status === 'cursando')
    .map((m) => {
      const prazo = m.tarefas.filter((t) => !t.feito && t.data).sort((a, b) => a.data.localeCompare(b.data))[0];
      return { l, m, prazo };
    }))
    .sort((a, b) => (a.prazo?.data || '9999').localeCompare(b.prazo?.data || '9999'));
  return `<section class="card coluna">
    <h2 class="card-titulo"><span class="selo mini c-azul">${ic('flag')}</span> Estudos: próximo passo</h2>
    ${itens.length ? `<div class="lista-rolavel">${itens.map(({ l, m, prazo }) => {
      const atrasado = prazo && prazo.data < hoje;
      return `<div class="passo-dash">
        <a class="passo-nome" href="#lista-${l.id}--${m.id}">${esc(m.nome)} <small>${esc(l.nome)}</small></a>
        <input class="inline" type="text" value="${esc(m.passo || '')}" placeholder="Escreva o próximo passo…" maxlength="120" data-digitar="campo" data-ref="${l.id}/${m.id}" data-campo="passo" aria-label="Próximo passo de ${esc(m.nome)}">
        ${prazo ? `<span class="passo-prazo ${atrasado ? 'atrasado' : ''}">${ic('clock', 'p')} ${esc(prazo.titulo)} · ${atrasado ? 'atrasado' : quandoFalta(prazo.data).toLowerCase()}</span>` : ''}
      </div>`;
    }).join('')}</div>` : '<p class="vazio">Nenhum curso ou matéria em andamento. Abra Estudos ou Faculdade e marque como Em andamento.</p>'}
  </section>`;
}
