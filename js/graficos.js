const graficoTela = { dias: 7 };

const NOMES_DIA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Minutos estudados no dia: soma todas as matérias/cursos e também o estudo lançado sem matéria
function minutosEstudoDia(iso) {
  const r = estado.diario[iso] || {};
  return Object.values(r.estudo || {}).reduce((a, b) => a + b, 0)
    + (r.sessoes || []).filter((x) => !x.ref).reduce((a, x) => a + (x.min || 0), 0);
}

// Quanto do que estava previsto para o dia foi feito: hábitos do dia + tarefas marcadas para o dia (agenda e matérias)
function efetividadeDia(iso) {
  const habitos = habitosDoDia(iso);
  const tarefas = [
    ...estado.tarefas.filter((t) => t.data === iso),
    ...estado.listas.filter((l) => l.tipo === 'cursos').flatMap((l) => l.materias.flatMap((m) => m.tarefas)).filter((t) => t.data === iso),
  ];
  return { feitos: feitosNoDia(iso, habitos) + tarefas.filter((t) => t.feito).length, total: habitos.length + tarefas.length };
}

// Melhor dia da semana pela PORCENTAGEM cumprida (não pela quantidade): cada dia vira um %,
// e quando o mesmo dia da semana aparece mais de uma vez no período, tira a média deles.
function melhorDiaSemana(dias) {
  const hoje = hojeISO();
  const porDia = {};
  dias.filter((d) => d <= hoje).forEach((d) => {
    const e = efetividadeDia(d);
    if (!e.total) return;
    const w = paraData(d).getDay();
    (porDia[w] = porDia[w] || []).push(e.feitos / e.total);
  });
  const melhor = Object.entries(porDia)
    .map(([w, v]) => ({ w: Number(w), pct: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.pct - a.pct)[0];
  return melhor && melhor.pct > 0 ? { nome: NOMES_DIA_LONGO[melhor.w], pct: Math.round(melhor.pct * 100) } : null;
}

const NOTA_HUMOR = { face1: 5, face2: 4, face3: 3, face4: 2, face5: 1 };

function diasDoPeriodo() {
  const hoje = hojeISO();
  return Array.from({ length: graficoTela.dias }, (_, i) => somarDias(hoje, i - graficoTela.dias + 1));
}

function rotuloDia(iso, i, total) {
  if (total <= 7) return paraData(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return i % 5 === 0 || i === total - 1 ? String(Number(iso.slice(8))) : '';
}

function colunas(dias, valorDe, dicaDe, opcoes = {}) {
  const valores = dias.map(valorDe);
  const max = Math.max(opcoes.max || 0, (opcoes.meta || 0) * 1.15, ...valores, 1);
  const meta = opcoes.meta ? `<div class="linha-meta" style="bottom:${(opcoes.meta / max) * 100}%"><span>meta ${opcoes.meta}</span></div>` : '';
  return `
    <div class="grafico-colunas">
      ${meta}
      ${dias.map((d, i) => `<div class="col ${valores[i] ? '' : 'zero'}" data-dica="${esc(dicaDe(d, valores[i]))}">
        <i style="height:${Math.max(valores[i] ? 3 : 1, (valores[i] / max) * 100)}%"></i></div>`).join('')}
    </div>
    <div class="eixo-x">${dias.map((d, i) => `<span>${rotuloDia(d, i, dias.length)}</span>`).join('')}</div>`;
}

function habitosFeitos(iso) { return feitosNoDia(iso); }

function tarefasConcluidas(iso) {
  const daAgenda = estado.tarefas.filter((t) => t.feito && (t.feitoEm || t.data) === iso).length;
  const dasMaterias = estado.listas.filter((l) => l.tipo === 'cursos')
    .flatMap((l) => l.materias.flatMap((m) => m.tarefas)).filter((t) => t.feito && t.feitoEm === iso).length;
  return daAgenda + dasMaterias;
}

PAGINAS.graficos = {
  titulo: 'Gráficos',
  desenhar() {
    const dias = diasDoPeriodo();
    const n = dias.length;
    const totalHab = estado.habitos.length;
    const possiveis = dias.reduce((s, d) => s + habitosDoDia(d).length, 0);
    const pctRotina = possiveis ? Math.round((dias.reduce((s, d) => s + habitosFeitos(d), 0) / possiveis) * 100) : 0;
    const concluidas = dias.reduce((s, d) => s + tarefasConcluidas(d), 0);
    const mediaAgua = dias.reduce((s, d) => s + (estado.diario[d]?.agua || 0), 0) / n;
    const estudoTotal = dias.reduce((s, d) => s + minutosEstudoDia(d), 0);

    const contagem = {};
    dias.forEach((d) => { const h = estado.diario[d]?.humor; if (h) contagem[h] = (contagem[h] || 0) + 1; });
    const registrosHumor = Object.values(contagem).reduce((a, b) => a + b, 0);
    const maisFrequente = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0];
    const nomeHumor = HUMORES.find((h) => h.id === maisFrequente)?.nome;

    const freq = estado.habitos.map((h) => {
      const valem = dias.filter((d) => valeNoDia(h, d));
      const feitos = valem.filter((d) => estado.diario[d]?.habitos.includes(h.id)).length;
      const esperado = h.meta > 0 ? Math.max(1, Math.round((h.meta * n) / 7)) : valem.length;
      return { nome: h.nome, feitos, n: esperado, pct: esperado ? Math.min(100, Math.round((feitos / esperado) * 100)) : 0 };
    }).sort((a, b) => a.pct - b.pct);

    const periodo = n === 7 ? 'últimos 7 dias' : 'últimos 30 dias';

    return `
    <div class="cab-pagina">
      <div><h1>Gráficos</h1><p>Como foram os ${periodo}.</p></div>
      <div class="cab-acoes"><a class="btn sec" href="#retrospectiva">${ic('sparkle', 'p')} Retrospectiva</a>
      <div class="segmento">
        <button class="${n === 7 ? 'ativo' : ''}" data-acao="graf-periodo" data-d="7">7 dias</button>
        <button class="${n === 30 ? 'ativo' : ''}" data-acao="graf-periodo" data-d="30">30 dias</button>
      </div></div>
    </div>

    <div class="grade g2">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('repeat')}</span> Rotina dia a dia <small>${pctRotina}% no período</small></h2>
        ${totalHab ? colunas(dias, (d) => { const t = habitosDoDia(d).length; return t ? Math.round((habitosFeitos(d) / t) * 100) : 0; },
          (d, v) => `${dataCurta(d)} · ${habitosFeitos(d)} de ${habitosDoDia(d).length} hábitos (${v}%)`, { max: 100 })
          : '<p class="vazio">Crie hábitos na Rotina diária para ver este gráfico.</p>'}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('flame')}</span> Frequência de cada hábito <small>dias feitos</small></h2>
        ${freq.length ? `<div class="barras-h rolavel">
          ${freq.map((f) => `<div class="barra-h ${f.pct < 50 ? 'baixo' : ''}" data-dica="${esc(f.nome)} · ${f.feitos} de ${f.n} ${f.n === 1 ? 'vez' : 'vezes'}">
            <span class="nome">${esc(f.nome)}</span>
            <span class="trilho"><i style="width:${Math.max(f.pct, 1)}%"></i></span>
            <span class="valor">${f.pct}%</span></div>`).join('')}
        </div>
        <p class="dica">Os que você mais deixa de fazer aparecem primeiro (em rosa abaixo de 50%).</p>`
          : '<p class="vazio">Nenhum hábito cadastrado.</p>'}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('heart')}</span> Humor
          <small>${maisFrequente ? `mais frequente: ${nomeHumor}` : ''}</small></h2>
        ${registrosHumor ? `<div class="grafico-linha" id="grafico-humor">
            <div class="eixo-humor">${HUMORES.map((h) => `<svg><use href="#i-${h.id}"/></svg>`).join('')}</div>
            <svg id="svg-humor" role="img" aria-label="Gráfico do humor por dia"></svg>
          </div>
          <div class="eixo-x" style="margin-left:34px">${dias.map((d, i) => `<span>${rotuloDia(d, i, n)}</span>`).join('')}</div>`
          : '<p class="vazio">Registre o seu humor no Dashboard para ver como ele muda ao longo dos dias.</p>'}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('check')}</span> Tarefas concluídas <small>${concluidas} no período</small></h2>
        ${colunas(dias, tarefasConcluidas, (d, v) => `${dataCurta(d)} · ${v} ${v === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`)}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('drop')}</span> Água <small>média de ${mediaAgua.toFixed(1).replace('.', ',')} copos/dia</small></h2>
        ${colunas(dias, (d) => estado.diario[d]?.agua || 0, (d, v) => `${dataCurta(d)} · ${v} ${v === 1 ? 'copo' : 'copos'} (${(v * 0.25).toFixed(2).replace('.', ',')} L)`, { meta: estado.config.metaAgua })}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('book')}</span> Horas de estudo <small>${textoMinutos(estudoTotal)} no período</small></h2>
        ${colunas(dias, minutosEstudoDia, (d, v) => `${dataCurta(d)} · ${v ? `${textoMinutos(v)} de estudo` : 'sem estudo'}`)}
      </section>
      ${htmlGraficosModulos(dias)}
    </div>`;
  },
  depois() {
    const svg = $('#svg-humor');
    if (!svg) return;
    const desenharHumor = () => {
      const dias = diasDoPeriodo();
      const W = svg.clientWidth, H = svg.clientHeight;
      const esq = 34, dir = 8, cima = 9, baixo = 9;
      const larg = (W - esq - dir) / dias.length;
      const x = (i) => esq + larg * i + larg / 2;
      const y = (nota) => cima + ((5 - nota) / 4) * (H - cima - baixo);
      const pontos = dias.map((d, i) => ({ d, i, nota: NOTA_HUMOR[estado.diario[d]?.humor] })).filter((p) => p.nota);

      let html = [1, 2, 3, 4, 5].map((n) => `<line x1="${esq}" x2="${W - dir}" y1="${y(n)}" y2="${y(n)}" stroke="#312f57" stroke-width="1"/>`).join('');

      // Liga todos os registros em ordem: linha cheia entre dias seguidos, tracejada quando pulou dias sem registro.
      if (pontos.length > 1) {
        const base = H - baixo;
        const area = `M${x(pontos[0].i)},${base} ` + pontos.map((p) => `L${x(p.i)},${y(p.nota)}`).join(' ') + ` L${x(pontos[pontos.length - 1].i)},${base} Z`;
        html += `<defs><linearGradient id="humor-sombra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7c56b" stop-opacity=".22"/><stop offset="1" stop-color="#f7c56b" stop-opacity="0"/></linearGradient></defs>
          <path d="${area}" fill="url(#humor-sombra)"/>`;
      }
      for (let k = 1; k < pontos.length; k++) {
        const a = pontos[k - 1], b = pontos[k];
        const pulou = b.i - a.i > 1;
        html += `<line x1="${x(a.i)}" y1="${y(a.nota)}" x2="${x(b.i)}" y2="${y(b.nota)}" stroke="#f7c56b" stroke-width="2.5" stroke-linecap="round" ${pulou ? 'stroke-dasharray="4 6" stroke-opacity=".6"' : ''}/>`;
      }
      html += pontos.map((p) => {
        const nome = HUMORES.find((h) => NOTA_HUMOR[h.id] === p.nota).nome;
        return `<circle cx="${x(p.i)}" cy="${y(p.nota)}" r="5" fill="#f7c56b" style="stroke:var(--card)" stroke-width="2"/>
          <circle class="ponto-hit" cx="${x(p.i)}" cy="${y(p.nota)}" r="14" fill="transparent" data-dica="${dataCurta(p.d)} · ${nome}"/>`;
      }).join('');
      svg.innerHTML = html;
    };
    desenharHumor();
    new ResizeObserver(desenharHumor).observe(svg);
  },
};

ACOES['graf-periodo'] = (el) => { graficoTela.dias = Number(el.dataset.d); desenhar(); };

document.addEventListener('mousemove', (e) => {
  const dica = $('#dica-grafico');
  const alvo = e.target.closest('[data-dica]');
  if (!alvo) { dica.hidden = true; return; }
  dica.textContent = alvo.dataset.dica;
  dica.hidden = false;
  const larg = dica.offsetWidth;
  dica.style.left = Math.min(e.clientX + 14, window.innerWidth - larg - 8) + 'px';
  dica.style.top = (e.clientY - 40) + 'px';
});
