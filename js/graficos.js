// =========================================================
// graficos.js — acompanhar rotina, humor, tarefas, água e foco
// =========================================================

const graficoTela = { dias: 7 };

// Humor vira nota de 1 (cansada) a 5 (ótimo) para o gráfico de linha
const NOTA_HUMOR = { face1: 5, face2: 4, face3: 3, face4: 2, face5: 1 };

function diasDoPeriodo() {
  const hoje = hojeISO();
  return Array.from({ length: graficoTela.dias }, (_, i) => somarDias(hoje, i - graficoTela.dias + 1));
}

// Rótulo do eixo X: dia da semana (7 dias) ou número do dia, de 5 em 5 (30 dias)
function rotuloDia(iso, i, total) {
  if (total <= 7) return paraData(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return i % 5 === 0 || i === total - 1 ? String(Number(iso.slice(8))) : '';
}

// Gráfico de colunas simples (uma série só)
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

function habitosFeitos(iso) {
  const r = estado.diario[iso];
  return r ? r.habitos.filter((id) => estado.habitos.some((h) => h.id === id)).length : 0;
}

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
    const pctRotina = totalHab ? Math.round((dias.reduce((s, d) => s + habitosFeitos(d), 0) / (totalHab * n)) * 100) : 0;
    const concluidas = dias.reduce((s, d) => s + tarefasConcluidas(d), 0);
    const mediaAgua = dias.reduce((s, d) => s + (estado.diario[d]?.agua || 0), 0) / n;
    const focos = dias.reduce((s, d) => s + (estado.diario[d]?.pomodoros || 0), 0);

    // humor mais frequente
    const contagem = {};
    dias.forEach((d) => { const h = estado.diario[d]?.humor; if (h) contagem[h] = (contagem[h] || 0) + 1; });
    const registrosHumor = Object.values(contagem).reduce((a, b) => a + b, 0);
    const maisFrequente = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0];
    const nomeHumor = HUMORES.find((h) => h.id === maisFrequente)?.nome;

    // frequência de cada hábito no período (os menos feitos primeiro)
    const freq = estado.habitos.map((h) => {
      const feitos = dias.filter((d) => estado.diario[d]?.habitos.includes(h.id)).length;
      return { nome: h.nome, feitos, pct: Math.round((feitos / n) * 100) };
    }).sort((a, b) => a.pct - b.pct);

    const periodo = n === 7 ? 'últimos 7 dias' : 'últimos 30 dias';

    return `
    <div class="cab-pagina">
      <div><h1>Gráficos</h1><p>Como foram os ${periodo}.</p></div>
      <div class="segmento">
        <button class="${n === 7 ? 'ativo' : ''}" data-acao="graf-periodo" data-d="7">7 dias</button>
        <button class="${n === 30 ? 'ativo' : ''}" data-acao="graf-periodo" data-d="30">30 dias</button>
      </div>
    </div>

    <div class="grade g2">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('repeat')}</span> Rotina dia a dia <small>${pctRotina}% no período</small></h2>
        ${totalHab ? colunas(dias, (d) => Math.round((habitosFeitos(d) / totalHab) * 100),
          (d, v) => `${dataCurta(d)} · ${habitosFeitos(d)} de ${totalHab} hábitos (${v}%)`, { max: 100 })
          : '<p class="vazio">Crie hábitos na Rotina diária para ver este gráfico.</p>'}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('flame')}</span> Frequência de cada hábito <small>dias feitos</small></h2>
        ${freq.length ? `<div class="barras-h rolavel">
          ${freq.map((f) => `<div class="barra-h ${f.pct < 50 ? 'baixo' : ''}" data-dica="${esc(f.nome)} · ${f.feitos} de ${n} dias">
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
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('timer')}</span> Foco <small>${focos} ${focos === 1 ? 'ciclo' : 'ciclos'}</small></h2>
        ${colunas(dias, (d) => estado.diario[d]?.pomodoros || 0, (d, v) => `${dataCurta(d)} · ${v} ${v === 1 ? 'ciclo' : 'ciclos'} de foco`)}
      </section>
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
      // linhas de grade (uma por nível de humor)
      let html = [1, 2, 3, 4, 5].map((n) => `<line x1="${esq}" x2="${W - dir}" y1="${y(n)}" y2="${y(n)}" stroke="#312f57" stroke-width="1"/>`).join('');
      // liga só dias seguidos com registro
      for (let k = 1; k < pontos.length; k++) {
        const a = pontos[k - 1], b = pontos[k];
        if (b.i - a.i === 1) html += `<line x1="${x(a.i)}" y1="${y(a.nota)}" x2="${x(b.i)}" y2="${y(b.nota)}" stroke="#f7c56b" stroke-width="2" stroke-linecap="round"/>`;
      }
      html += pontos.map((p) => {
        const nome = HUMORES.find((h) => NOTA_HUMOR[h.id] === p.nota).nome;
        return `<circle cx="${x(p.i)}" cy="${y(p.nota)}" r="5" fill="#f7c56b" stroke="#201f38" stroke-width="2"/>
          <circle class="ponto-hit" cx="${x(p.i)}" cy="${y(p.nota)}" r="14" fill="transparent" data-dica="${dataCurta(p.d)} · ${nome}"/>`;
      }).join('');
      svg.innerHTML = html;
    };
    desenharHumor();
    new ResizeObserver(desenharHumor).observe(svg);
  },
};

ACOES['graf-periodo'] = (el) => { graficoTela.dias = Number(el.dataset.d); desenhar(); };

// ---------- Dica ao passar o mouse nos gráficos ----------
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
