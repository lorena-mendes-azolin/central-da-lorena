// =========================================================
// dashboard.js — página inicial com o resumo de tudo
// =========================================================

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
    const hab = estado.habitos.filter((x) => reg.habitos.includes(x.id)).length;
    const meta = estado.config.metaAgua;

    // Próximas datas: agenda + itens de listas com data
    const proximas = [
      ...estado.tarefas.filter((t) => !t.feito && t.data > hoje).map((t) => ({ titulo: t.titulo, data: t.data, cor: AREAS[t.area] || AREAS.Pessoal })),
      ...estado.listas.flatMap((l) => datasDaLista(l).filter((x) => x.data > hoje).map((x) => ({ ...x, cor: l.cor, lista: l.nome }))),
    ].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5);

    const semana = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6));

    return `
    <div class="ola">
      <div><h1>${oi}, ${esc(estado.config.nome)}</h1>
        <p>${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <div class="clima" id="clima">${htmlClima()}</div>
    </div>
    ${htmlPedirNotificacao()}

    <div class="grade g4">
      <a class="card stat" href="#agenda"><span class="selo c-violeta">${ic('calendar')}</span>
        <div><b>${pendHoje.length}</b><span>para hoje</span></div></a>
      <a class="card stat" href="#agenda"><span class="selo c-vermelho">${ic('alert')}</span>
        <div><b>${atrasadas.length}</b><span>atrasadas</span></div></a>
      <a class="card stat" href="#rotina"><span class="selo c-verde">${ic('repeat')}</span>
        <div><b>${hab}/${estado.habitos.length}</b><span>rotina de hoje</span></div></a>
      <div class="card stat"><span class="selo c-azul">${ic('drop')}</span>
        <div><b>${reg.agua}/${meta}</b><span>copos de água</span></div></div>
    </div>

    <div class="grade g3">
      <section class="card" style="grid-column:span 2">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('sun')}</span> Hoje <a href="#agenda">Abrir agenda</a></h2>
        ${atrasadas.map(htmlTarefa).join('')}
        ${deHoje.map(htmlTarefa).join('')}
        ${!deHoje.length && !atrasadas.length ? '<p class="vazio">Nada marcado para hoje.</p>' : ''}
        <form class="form-linha" data-form="tarefa-rapida" style="margin-top:12px">
          <input type="text" name="titulo" id="rapida-titulo" placeholder="Adicionar tarefa para hoje" maxlength="120" required style="flex:3 1 200px">
          <input type="time" name="hora" id="rapida-hora" title="Hora (opcional, para receber aviso)" style="flex:1 1 110px">
          <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
        </form>
      </section>

      <section class="card">
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
      </section>
    </div>

    <div class="grade g3">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('repeat')}</span> Rotina de hoje <a href="#rotina">${hab}/${estado.habitos.length}</a></h2>
        <div class="prog" style="margin-bottom:10px"><i style="width:${estado.habitos.length ? (hab / estado.habitos.length) * 100 : 0}%"></i></div>
        ${estado.habitos.map((x) => {
          const on = reg.habitos.includes(x.id);
          return `<div class="item ${on ? 'feito' : ''}">
            <button class="check ${on ? 'on' : ''}" data-acao="habito-hoje" data-id="${x.id}" aria-label="marcar">${on ? ic('check') : ''}</button>
            <span class="txt">${esc(x.nome)}</span></div>`;
        }).join('') || '<p class="vazio">Crie hábitos na página Rotina diária.</p>'}
        <h2 class="card-titulo" style="margin-top:18px"><span class="selo mini c-azul">${ic('drop')}</span> Água <small>${(reg.agua * 0.25).toFixed(2).replace('.', ',')} L</small></h2>
        <div class="copos">${Array.from({ length: meta }, (_, i) => `<button class="copo ${i < reg.agua ? 'cheio' : ''}" data-acao="agua" data-i="${i}" aria-label="copo ${i + 1}"></button>`).join('')}</div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('heart')}</span> Como você está?</h2>
        <div class="humores">
          ${HUMORES.map((x) => `<button class="humor ${reg.humor === x.id ? 'on' : ''}" data-acao="humor" data-h="${x.id}" title="${x.nome}" style="${reg.humor === x.id ? 'color:var(--amarelo)' : ''}">
            <svg><use href="#i-${x.id}"/></svg></button>`).join('')}
        </div>
        <div class="semana-humor">
          ${semana.map((d) => {
            const hm = estado.diario[d]?.humor;
            return `<div>${hm ? `<svg class="ic" style="color:var(--amarelo)"><use href="#i-${hm}"/></svg>` : '<span class="ponto"></span>'}${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</div>`;
          }).join('')}
        </div>
        <p class="dica">Registre como foi o seu dia e acompanhe a semana.</p>
      </section>

      <section class="card pomo">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('timer')}</span> Foco</h2>
        <div class="segmento" style="margin-bottom:12px">
          ${[['Foco', 25, 'foco'], ['Pausa', 5, 'pausa'], ['Longa', 15, 'longa']].map(([n, m, id]) =>
            `<button class="${pomo.modo === id ? 'ativo' : ''}" data-acao="pomo-modo" data-min="${m}" data-modo="${id}">${n} ${m}</button>`).join('')}
        </div>
        <div class="anel">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#28274a" stroke-width="8"/>
            <circle id="pomo-arco" cx="80" cy="80" r="70" fill="none" stroke="url(#gradFoco)" stroke-width="8" stroke-linecap="round"/>
            <defs><linearGradient id="gradFoco"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#f59ad8"/></linearGradient></defs>
          </svg>
          <div class="anel-tempo"><b id="pomo-tempo">25:00</b><span id="pomo-estado">${pomo.estado}</span></div>
        </div>
        <div class="botoes">
          <button class="btn" id="pomo-play" data-acao="pomo-play">${ic('play', 'p')} Começar</button>
          <button class="btn sec" data-acao="pomo-reset" aria-label="Reiniciar">${ic('reset', 'p')}</button>
        </div>
        <p class="dica">${reg.pomodoros ? `${reg.pomodoros} ${reg.pomodoros === 1 ? 'ciclo' : 'ciclos'} de foco hoje` : 'Nenhum ciclo de foco hoje ainda.'}</p>
      </section>
    </div>

    <section class="card">
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
    </section>`;
  },
};

function porHora(a, b) {
  return (a.hora || '99').localeCompare(b.hora || '99');
}

// ---------- Clima (Open-Meteo, grátis e sem cadastro) ----------
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
  if (!clima || clima.erro) return `${ic('moon')}<div><b>Curitiba</b><small>${clima ? 'clima indisponível' : 'carregando…'}</small></div>`;
  return `${ic(clima.icone)}<div><b>${clima.temp}°</b><small>Curitiba · ${clima.texto} · ${clima.min}°/${clima.max}°</small></div>`;
}

async function buscarClima() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-25.43&longitude=-49.27'
      + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min'
      + '&timezone=America%2FSao_Paulo&forecast_days=1';
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

// ---------- Ações ----------
FORMS['tarefa-rapida'] = (d) => {
  estado.tarefas.push(tarefa(d.titulo, hojeISO(), { hora: d.hora || '', tipo: 'tarefa', area: 'Pessoal', lembrete: d.hora ? 15 : -1 }));
  salvar(); desenhar();
  avisar(d.hora ? `Adicionada. Aviso 15 min antes das ${d.hora}.` : 'Tarefa adicionada.');
  $('#rapida-titulo')?.focus();
};

ACOES.agua = (el) => {
  const reg = registroDoDia();
  const i = Number(el.dataset.i);
  reg.agua = i < reg.agua ? i : i + 1; // clicar num copo cheio esvazia a partir dele
  salvar(); desenhar();
  if (reg.agua === estado.config.metaAgua) avisar('Meta de água do dia concluída!');
};

ACOES.humor = (el) => {
  const reg = registroDoDia();
  reg.humor = reg.humor === el.dataset.h ? '' : el.dataset.h;
  salvar(); desenhar();
};

// ---------- Pomodoro (foco) ----------
const pomo = { total: 25 * 60, resta: 25 * 60, rodando: false, fimEm: 0, modo: 'foco', estado: 'pronta para focar' };

function atualizarPomodoro() {
  if (!$('#pomo-tempo')) return;
  const mm = String(Math.floor(pomo.resta / 60)).padStart(2, '0');
  const ss = String(pomo.resta % 60).padStart(2, '0');
  $('#pomo-tempo').textContent = `${mm}:${ss}`;
  $('#pomo-estado').textContent = pomo.estado;
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
      registroDoDia().pomodoros++;
      salvar();
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
  pomo.estado = 'pronta para focar';
  atualizarCaminho();
  atualizarPomodoro();
};

ACOES['pomo-modo'] = (el) => {
  pomo.rodando = false;
  pomo.total = pomo.resta = Number(el.dataset.min) * 60;
  pomo.modo = el.dataset.modo;
  pomo.estado = pomo.modo === 'foco' ? 'pronta para focar' : 'hora de respirar';
  desenhar();
};
