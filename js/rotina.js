// =========================================================
// rotina.js — controle dos hábitos de cada dia
// =========================================================

// Dias seguidos que o hábito foi feito (se hoje ainda não fez, conta até ontem)
function sequencia(idHabito) {
  let dia = hojeISO();
  if (!estado.diario[dia]?.habitos.includes(idHabito)) dia = somarDias(dia, -1);
  let n = 0;
  while (estado.diario[dia]?.habitos.includes(idHabito)) { n++; dia = somarDias(dia, -1); }
  return n;
}

function feitosNoDia(iso) {
  const r = estado.diario[iso];
  return r ? r.habitos.filter((id) => estado.habitos.some((h) => h.id === id)).length : 0;
}

PAGINAS.rotina = {
  titulo: 'Rotina diária',
  desenhar() {
    const hoje = hojeISO();
    const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6));
    const total = estado.habitos.length;
    const feitosHoje = feitosNoDia(hoje);
    const maiorSeq = Math.max(0, ...estado.habitos.map((h) => sequencia(h.id)));
    const pctSemana = total ? Math.round((dias.reduce((s, d) => s + feitosNoDia(d), 0) / (total * 7)) * 100) : 0;
    const mapa = Array.from({ length: 35 }, (_, i) => somarDias(hoje, i - 34));

    return `
    <div class="cab-pagina">
      <div><h1>Rotina diária</h1><p>Marque o que fez em cada dia. Tudo recomeça sozinho no dia seguinte.</p></div>
    </div>

    <div class="grade g3">
      <div class="card stat"><span class="selo c-verde">${ic('check')}</span>
        <div><b>${feitosHoje}/${total}</b><span>feitos hoje</span></div></div>
      <div class="card stat"><span class="selo c-amarelo">${ic('flame')}</span>
        <div><b>${maiorSeq} ${maiorSeq === 1 ? 'dia' : 'dias'}</b><span>maior sequência atual</span></div></div>
      <div class="card stat"><span class="selo c-violeta">${ic('repeat')}</span>
        <div><b>${pctSemana}%</b><span>da rotina nos últimos 7 dias</span></div></div>
    </div>

    <section class="card" style="margin-bottom:16px">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('repeat')}</span> Meus hábitos</h2>
      ${total ? `<div class="rolagem">
        <table class="habitos">
          <thead><tr><th>Hábito</th>
            ${dias.map((d) => `<th class="${d === hoje ? 'hoje-col' : ''}">${paraData(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<br>${Number(d.slice(8))}</th>`).join('')}
            <th>Sequência</th><th></th></tr></thead>
          <tbody>
            ${estado.habitos.map((h) => `<tr>
              <td><input class="inline inline-t" value="${esc(h.nome)}" data-digitar="habito-nome" data-id="${h.id}" aria-label="Nome do hábito"></td>
              ${dias.map((d) => {
                const on = estado.diario[d]?.habitos.includes(h.id);
                return `<td><button class="bola ${on ? 'on' : ''}" data-acao="habito-dia" data-id="${h.id}" data-dia="${d}" aria-label="Marcar ${dataCurta(d)}">${on ? ic('check') : ''}</button></td>`;
              }).join('')}
              <td>${sequencia(h.id) ? `<span class="fogo">${ic('flame')} ${sequencia(h.id)}</span>` : '<span style="color:var(--fraco)">—</span>'}</td>
              <td><button class="acao-item apagar" data-acao="habito-del" data-id="${h.id}" title="Apagar hábito">${ic('trash', 'p')}</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="vazio">Nenhum hábito ainda. Adicione o primeiro abaixo.</p>'}
      <form class="form-linha" data-form="habito-novo" style="margin-top:14px">
        <input type="text" name="nome" id="habito-nome" placeholder="Novo hábito (ex.: Beber água ao acordar)" maxlength="60" required style="flex:3 1 240px">
        <button class="btn" type="submit">${ic('plus', 'p')} Adicionar</button>
      </form>
    </section>

    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('calendar')}</span> Últimas 5 semanas</h2>
      <div class="mapa">
        ${mapa.map((d) => {
          const pct = total ? feitosNoDia(d) / total : 0;
          return `<div title="${dataCurta(d)}: ${Math.round(pct * 100)}%"
            style="background:${pct ? `rgba(95,214,164,${0.18 + pct * 0.82})` : 'var(--card-2)'};${d === hoje ? 'outline:2px solid var(--rosa);outline-offset:1px' : ''}"></div>`;
        }).join('')}
      </div>
      <p class="dica">Quanto mais verde, mais da rotina foi feita naquele dia.</p>
    </section>`;
  },
};

// ---------- Ações ----------
function marcarHabito(id, dia) {
  const reg = registroDoDia(dia);
  const on = reg.habitos.includes(id);
  reg.habitos = on ? reg.habitos.filter((x) => x !== id) : [...reg.habitos, id];
  salvar(); desenhar();
  if (!on && dia === hojeISO() && feitosNoDia(dia) === estado.habitos.length) {
    tocarSom(true);
    avisar('Rotina de hoje completa!');
  }
}

ACOES['habito-dia'] = (el) => marcarHabito(el.dataset.id, el.dataset.dia);
ACOES['habito-hoje'] = (el) => marcarHabito(el.dataset.id, hojeISO());

DIGITAR['habito-nome'] = (el) => {
  const h = estado.habitos.find((x) => x.id === el.dataset.id);
  if (h) { h.nome = el.value.trim(); salvar(); }
};

FORMS['habito-novo'] = (d) => {
  estado.habitos.push({ id: novoId(), nome: d.nome });
  salvar(); desenhar();
  $('#habito-nome')?.focus();
};

ACOES['habito-del'] = (el) => removerComDesfazer(estado.habitos, el.dataset.id, 'Hábito');
