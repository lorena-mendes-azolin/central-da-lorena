const PROTOCOLOS_JEJUM = [12, 13, 14, 16, 18, 20];
const SENTIR_JEJUM = [['5', 'Muito bem'], ['4', 'Bem'], ['3', 'Normal'], ['2', 'Com fome'], ['1', 'Mal']];
const SINAIS_JEJUM = ['Energia', 'Foco', 'Leveza', 'Fome', 'Dor de cabeça', 'Irritação', 'Cansaço', 'Tontura'];
const jejumTela = { encerrando: false, manual: false, sinais: [] };

function dadosJejum() {
  estado.jejum = estado.jejum || {};
  const j = estado.jejum;
  j.ciclos = j.ciclos || [];
  if (!j.metaH) j.metaH = 16;
  return j;
}
const horasCiclo = (c) => (c.fim - c.inicio) / 3600000;
const cicloCompleto = (c) => horasCiclo(c) >= c.metaH - 0.01;
const diaDoCiclo = (c) => hojeISO(new Date(c.fim));
const fmtHoras = (h) => { const hh = Math.floor(h); const mm = Math.floor((h - hh) * 60); return `${hh}h${String(mm).padStart(2, '0')}`; };
const horaDe = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function sequenciaJejum() {
  const dias = new Set(dadosJejum().ciclos.filter(cicloCompleto).map(diaDoCiclo));
  let d = hojeISO();
  if (!dias.has(d)) d = somarDias(d, -1);
  let n = 0;
  while (dias.has(d) && n < 3650) { n++; d = somarDias(d, -1); }
  return n;
}

function htmlJejum() {
  if (!temModulo('jejum')) return '';
  const j = dadosJejum();
  const at = j.ativo;
  const ciclos = [...j.ciclos].sort((a, b) => b.fim - a.fim);
  const ult7 = j.ciclos.filter((c) => c.fim >= Date.now() - 7 * 86400000);
  const media7 = ult7.length ? ult7.reduce((s, c) => s + horasCiclo(c), 0) / ult7.length : 0;
  const completos = j.ciclos.filter(cicloCompleto).length;
  const decorrido = at ? (Date.now() - at.inicio) / 3600000 : 0;
  const meta = at ? at.metaH : j.metaH;
  const pct = at ? Math.min(1, decorrido / meta) : 0;
  const ontem = somarDias(hojeISO(), -1);
  return `
  <section class="card jejum-card" id="jejum">
    <h2 class="card-titulo"><span class="selo mini c-verde">${ic('timer')}</span> Jejum
      <a href="#graficos" style="margin-left:auto">Ver relatório</a></h2>
    <div class="linha-vinculo">${htmlVinculo('jejum', 'Ao bater a meta do jejum, marcar')}</div>
    <div class="jejum-grade">
      <div class="jejum-anel-lado">
        <div class="anel-jejum">
          <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" fill="none" style="stroke:var(--card-2)" stroke-width="10"/>
            <circle id="jj-arco" cx="80" cy="80" r="70" fill="none" stroke="#5fd6a4" stroke-width="10" stroke-linecap="round" stroke-dasharray="440" stroke-dashoffset="${440 * (1 - pct)}" transform="rotate(-90 80 80)"/></svg>
          <div class="anel-meio"><b id="jj-tempo">${at ? fmtHoras(decorrido) : `${meta}h`}</b><span id="jj-sub">${at ? (decorrido >= meta ? 'meta cumprida!' : `faltam ${fmtHoras(meta - decorrido)}`) : `jejum · ${24 - meta}h de janela`}</span></div>
        </div>
        ${at ? `<p class="dica" style="text-align:center;margin:6px 0 0">Começou ${hojeISO(new Date(at.inicio)) === hojeISO() ? 'hoje' : 'ontem'} às <b>${horaDe(at.inicio)}</b> · ${decorrido >= meta ? 'meta atingida' : 'termina'} às <b>${horaDe(at.inicio + meta * 3600000)}</b></p>` : ''}
      </div>
      <div class="jejum-lado">
        ${jejumTela.encerrando && at ? `<div class="encerrar-jejum">
          <h3>Como você se sentiu?</h3>
          <div class="chips">${SENTIR_JEJUM.map(([v, n]) => `<button class="chip ${jejumTela.sentir === v ? 'ativo' : ''}" data-acao="jj-sentir" data-v="${v}">${n}</button>`).join('')}</div>
          <h3>Percebeu algo?</h3>
          <div class="chips">${SINAIS_JEJUM.map((s) => `<button class="chip ${jejumTela.sinais.includes(s) ? 'ativo' : ''}" data-acao="jj-sinal" data-v="${s}">${s}</button>`).join('')}</div>
          <label class="campo">Anotação (opcional)<input type="text" id="jj-nota" maxlength="140" value="${esc(jejumTela.nota || '')}"></label>
          <div class="form-linha" style="justify-content:flex-end;margin-top:10px">
            <button class="btn sec" data-acao="jj-encerrar">Voltar</button>
            <button class="btn" data-acao="jj-salvar">${ic('check', 'p')} Salvar ciclo</button>
          </div>
        </div>` : at ? `
          <p style="margin:0 0 10px">Protocolo <b>${meta}:${24 - meta}</b>. ${decorrido >= meta ? 'Você já cumpriu a meta! Encerre quando for comer.' : 'Bom jejum! Beba bastante água.'}</p>
          <div class="form-linha">
            <button class="btn" data-acao="jj-encerrar">${ic('check', 'p')} Encerrar jejum</button>
            <button class="btn sec" data-acao="jj-cancelar">Cancelar</button>
          </div>
          <p class="dica">Se sentir tontura ou mal-estar, pare e coma. O jejum deve fazer bem.</p>` : `
          <div class="jj-bloco">
            <span class="jj-rotulo">Protocolo</span>
            <div class="chips">${PROTOCOLOS_JEJUM.map((h) => `<button class="chip ${j.metaH === h ? 'ativo' : ''}" data-acao="jj-meta" data-h="${h}">${h}:${24 - h}</button>`).join('')}</div>
          </div>
          <div class="jj-acoes">
            <button class="btn" data-acao="jj-comecar">${ic('play', 'p')} Comecei agora</button>
            <span class="jj-ou">ou</span>
            <form class="jj-comecei" data-form="jj-comecei">
              <select name="dia" aria-label="Dia"><option value="${hojeISO()}">Hoje</option><option value="${ontem}">Ontem</option></select>
              <input type="time" name="hora" aria-label="Hora que começou">
              <button class="btn sec">Comecei nesse horário</button>
            </form>
          </div>
          <a href="#" class="dica jj-link" data-acao="jj-manual">${jejumTela.manual ? 'Fechar' : 'Lançar um jejum que já terminou'}</a>
          ${jejumTela.manual ? `<form class="jj-manual" data-form="jj-manual">
            <div class="linha2">
              <label class="campo">Começou (dia)<input type="date" name="di" value="${ontem}" max="${hojeISO()}"></label>
              <label class="campo">às<input type="time" name="hi"></label>
            </div>
            <div class="linha2">
              <label class="campo">Terminou (dia)<input type="date" name="df" value="${hojeISO()}" max="${hojeISO()}"></label>
              <label class="campo">às<input type="time" name="hf"></label>
            </div>
            <label class="campo">Como se sentiu<select name="sentir"><option value="">—</option>${SENTIR_JEJUM.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>
            <div class="form-linha" style="justify-content:flex-end"><button class="btn">Salvar ciclo</button></div>
          </form>` : ''}`}
      </div>
    </div>
    <div class="grade g3 jejum-stats">
      <div class="stat-mini"><b>${completos}</b><span>${completos === 1 ? 'ciclo completo' : 'ciclos completos'}</span></div>
      <div class="stat-mini"><b>${sequenciaJejum()}</b><span>${sequenciaJejum() === 1 ? 'dia seguido' : 'dias seguidos'}</span></div>
      <div class="stat-mini"><b>${media7 ? fmtHoras(media7) : '—'}</b><span>média nos últimos 7 dias</span></div>
    </div>
    ${ciclos.length ? `<div class="lista-rolavel" style="max-height:220px">${ciclos.slice(0, 30).map((c) => `<div class="item">
      <span class="ponto-jejum ${cicloCompleto(c) ? 'ok' : ''}">${cicloCompleto(c) ? ic('check') : ''}</span>
      <span class="txt">${fmtHoras(horasCiclo(c))} de ${c.metaH}h<span class="sub">${dataCurta(diaDoCiclo(c))} · ${horaDe(c.inicio)} → ${horaDe(c.fim)}${c.sentir ? ` · ${SENTIR_JEJUM.find(([v]) => v === c.sentir)?.[1].toLowerCase()}` : ''}${c.sinais?.length ? ` · ${c.sinais.join(', ').toLowerCase()}` : ''}${c.nota ? ` · ${esc(c.nota)}` : ''}</span></span>
      <button class="acao-item apagar" data-acao="jj-del" data-id="${c.id}" title="Apagar">${ic('trash', 'p')}</button></div>`).join('')}</div>` : ''}
  </section>`;
}

function atualizarJejum() {
  const at = estado.jejum?.ativo;
  const el = $('#jj-tempo');
  if (!at || !el) return;
  const h = (Date.now() - at.inicio) / 3600000;
  el.textContent = fmtHoras(h);
  const sub = $('#jj-sub');
  if (sub) sub.textContent = h >= at.metaH ? 'meta cumprida!' : `faltam ${fmtHoras(at.metaH - h)}`;
  $('#jj-arco')?.setAttribute('stroke-dashoffset', String(440 * (1 - Math.min(1, h / at.metaH))));
  if (h >= at.metaH && !at.avisado) {
    at.avisado = true; salvar();
    tocarSom(true);
    avisar(`Você completou ${at.metaH}h de jejum!`);
    try { mostrarNotificacao?.('Jejum completo', `Você completou ${at.metaH}h de jejum.`); } catch { }
  }
}

ACOES['jj-meta'] = (el) => { dadosJejum().metaH = Number(el.dataset.h); salvar(); desenhar(); };
function comecarJejum(inicio) {
  const j = dadosJejum();
  if (inicio > Date.now()) { avisar('Esse horário ainda não chegou.'); return; }
  j.ativo = { inicio, metaH: j.metaH };
  salvar(); desenhar();
  avisar(`Jejum de ${j.metaH}h começou. Termina às ${horaDe(inicio + j.metaH * 3600000)}.`);
}
ACOES['jj-comecar'] = () => comecarJejum(Date.now());
FORMS['jj-comecei'] = (d) => {
  if (!d.hora) { avisar('Escolha a hora em que começou.'); return; }
  const [h, m] = d.hora.split(':').map(Number);
  const dt = paraData(d.dia); dt.setHours(h, m, 0, 0);
  comecarJejum(dt.getTime());
};
ACOES['jj-cancelar'] = () => {
  if (!confirmarDuasVezes('jj-cancelar', 'Clique de novo para cancelar sem salvar.')) return;
  dadosJejum().ativo = null; salvar(); desenhar();
};
ACOES['jj-encerrar'] = () => { jejumTela.encerrando = !jejumTela.encerrando; jejumTela.sinais = []; jejumTela.sentir = ''; jejumTela.nota = ''; desenhar(); };
ACOES['jj-sentir'] = (el) => { jejumTela.nota = $('#jj-nota')?.value || ''; jejumTela.sentir = el.dataset.v; desenhar(); };
ACOES['jj-sinal'] = (el) => { jejumTela.nota = $('#jj-nota')?.value || ''; const s = el.dataset.v; jejumTela.sinais = jejumTela.sinais.includes(s) ? jejumTela.sinais.filter((x) => x !== s) : [...jejumTela.sinais, s]; desenhar(); };
ACOES['jj-salvar'] = () => {
  const j = dadosJejum();
  const c = { id: novoId(), inicio: j.ativo.inicio, fim: Date.now(), metaH: j.ativo.metaH, sentir: jejumTela.sentir || '', sinais: jejumTela.sinais, nota: ($('#jj-nota')?.value || '').trim() };
  j.ciclos.push(c);
  const bateu = (c.fim - c.inicio) / 3600000 >= c.metaH;
  j.ativo = null;
  if (bateu) setTimeout(() => marcarVinculo(j.habito), 0);
  jejumTela.encerrando = false;
  salvar(); desenhar();
  avisar(cicloCompleto(c) ? `Ciclo completo: ${fmtHoras(horasCiclo(c))}!` : `Ciclo salvo: ${fmtHoras(horasCiclo(c))} de ${c.metaH}h.`);
};
ACOES['jj-manual'] = () => { jejumTela.manual = !jejumTela.manual; desenhar(); };
FORMS['jj-manual'] = (d) => {
  if (!d.hi || !d.hf) { avisar('Preencha os dois horários.'); return; }
  const ms = (dia, hora) => { const [h, m] = hora.split(':').map(Number); const x = paraData(dia); x.setHours(h, m, 0, 0); return x.getTime(); };
  const inicio = ms(d.di, d.hi), fim = ms(d.df, d.hf);
  if (fim <= inicio) { avisar('O fim precisa ser depois do começo.'); return; }
  if (fim - inicio > 72 * 3600000) { avisar('Confira as datas: passou de 72 horas.'); return; }
  const j = dadosJejum();
  const c = { id: novoId(), inicio, fim, metaH: j.metaH, sentir: d.sentir || '', sinais: [], nota: '' };
  j.ciclos.push(c);
  jejumTela.manual = false;
  salvar(); desenhar();
  avisar(`Ciclo de ${fmtHoras(horasCiclo(c))} salvo.`);
};
ACOES['jj-del'] = (el) => {
  const j = dadosJejum();
  const pos = j.ciclos.findIndex((c) => c.id === el.dataset.id);
  const [c] = j.ciclos.splice(pos, 1);
  salvar(); desenhar();
  avisar('Ciclo apagado.', () => { j.ciclos.splice(pos, 0, c); salvar(); desenhar(); });
};

function horasJejumNoDia(d) {
  return (estado.jejum?.ciclos || []).filter((c) => diaDoCiclo(c) === d).reduce((s, c) => s + horasCiclo(c), 0);
}
function htmlGraficosModulos(dias) {
  let html = '';
  if (temModulo('jejum')) {
    const cs = (estado.jejum?.ciclos || []).filter((c) => dias.includes(diaDoCiclo(c)));
    const comp = cs.filter(cicloCompleto).length;
    const media = cs.length ? cs.reduce((s, c) => s + horasCiclo(c), 0) / cs.length : 0;
    const maior = cs.length ? Math.max(...cs.map(horasCiclo)) : 0;
    const sentiu = cs.filter((c) => c.sentir);
    const mediaSentir = sentiu.length ? sentiu.reduce((s, c) => s + Number(c.sentir), 0) / sentiu.length : 0;
    const sinais = {};
    cs.forEach((c) => (c.sinais || []).forEach((s) => { sinais[s] = (sinais[s] || 0) + 1; }));
    const topSinais = Object.entries(sinais).sort((a, b) => b[1] - a[1]).slice(0, 3);
    html += `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('timer')}</span> Jejum <small>${comp} de ${cs.length} ${cs.length === 1 ? 'ciclo completo' : 'ciclos completos'}</small></h2>
      ${cs.length ? `<div class="resumo-jejum">
        <span><b>${fmtHoras(media)}</b> média</span><span><b>${fmtHoras(maior)}</b> maior</span>
        <span><b>${cs.length ? Math.round((comp / cs.length) * 100) : 0}%</b> completos</span>
        ${mediaSentir ? `<span><b>${SENTIR_JEJUM.find(([v]) => v === String(Math.round(mediaSentir)))?.[1]}</b> como se sentiu, em média</span>` : ''}
        ${topSinais.length ? `<span><b>${topSinais.map(([s]) => s).join(', ')}</b> o que mais apareceu</span>` : ''}
      </div>` : ''}
      ${colunas(dias, horasJejumNoDia, (d, v) => `${dataCurta(d)} · ${v ? fmtHoras(v) : 'sem jejum'}`, { meta: estado.jejum?.metaH || 16 })}
    </section>`;
  }
  if (temModulo('treino')) {
    const t = estado.treino || {};
    const minDia = (d) => Math.round(((t.sessoes || []).filter((s) => s.data === d).reduce((a, s) => a + s.dur, 0) + (t.corridas || []).filter((c) => c.data === d).reduce((a, c) => a + c.tempo, 0)) / 60);
    const total = dias.reduce((s, d) => s + minDia(d), 0);
    const ativos = dias.filter((d) => minDia(d) > 0).length;
    html += `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('gym')}</span> Treino <small>${textoMinutos(total)} em ${ativos} ${ativos === 1 ? 'dia' : 'dias'}</small></h2>
      ${colunas(dias, minDia, (d, v) => `${dataCurta(d)} · ${v ? textoMinutos(v) : 'sem treino'}`)}
    </section>`;
  }
  if (temModulo('apps') && (estado.appsEstudo?.lista || []).length) {
    const somaDia = (d) => Object.values(estado.diario[d]?.apps || {}).reduce((a, b) => a + b, 0);
    const total = dias.reduce((s, d) => s + somaDia(d), 0);
    html += `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-azul">${ic('code')}</span> Apps de estudo <small>${total} no período</small></h2>
      ${colunas(dias, somaDia, (d, v) => `${dataCurta(d)} · ${v} ${v === 1 ? 'lição' : 'lições'}`)}
    </section>`;
  }
  return html;
}
