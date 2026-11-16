PAGINAS.lixeira = {
  titulo: 'Lixeira',
  desenhar() {
    const itens = estado.lixeira || [];
    const diasRestantes = (q) => Math.max(0, 30 - Math.floor((Date.now() - new Date(q).getTime()) / 86400000));
    return `
    <div class="cab-pagina">
      <div><h1>Lixeira</h1><p>O que você apaga fica aqui por 30 dias. Depois some de vez.</p></div>
      ${itens.length ? `<button class="btn sec" data-acao="lixeira-esvaziar">${ic('trash', 'p')} Esvaziar lixeira</button>` : ''}
    </div>
    <section class="card">
      <div class="lista-rolavel" style="max-height:none">
        ${itens.map((x, i) => `<div class="item item-lixeira">
          <span class="selo mini c-violeta">${ic('trash')}</span>
          <span class="txt">${esc(x.nome)}<span class="sub">${esc(x.tipo)} · apagado ${quandoFalta(x.quando.slice(0, 10)).toLowerCase()} · some em ${diasRestantes(x.quando)} ${diasRestantes(x.quando) === 1 ? 'dia' : 'dias'}</span></span>
          <button class="btn-mini" data-acao="lixeira-restaurar" data-i="${i}">${ic('reset', 'p')} Restaurar</button>
          <button class="acao-item apagar" data-acao="lixeira-apagar" data-i="${i}" title="Apagar de vez">${ic('x', 'p')}</button>
        </div>`).join('') || '<p class="vazio">A lixeira está vazia.</p>'}
      </div>
    </section>`;
  },
};

ACOES['lixeira-restaurar'] = (el) => {
  const x = estado.lixeira[Number(el.dataset.i)];
  const lista = seguirCaminho(x.caminho);
  if (!Array.isArray(lista)) {
    avisar('O lugar de onde isso veio também foi apagado. Restaure ele primeiro.');
    return;
  }
  if (!lista.some((y) => y.id === x.item.id)) lista.splice(Math.min(x.pos ?? 0, lista.length), 0, x.item);
  estado.lixeira.splice(Number(el.dataset.i), 1);
  salvar(); desenhar();
  avisar(`${x.tipo} restaurado.`);
};

ACOES['lixeira-apagar'] = (el) => {
  estado.lixeira.splice(Number(el.dataset.i), 1);
  salvar(); desenhar();
};

ACOES['lixeira-esvaziar'] = () => {
  if (!confirmarDuasVezes('lixeira-esvaziar', 'Clique de novo para apagar tudo de vez.')) return;
  estado.lixeira = [];
  salvar(); desenhar();
  avisar('Lixeira esvaziada.');
};

const confirmacoes = {};
function confirmarDuasVezes(chave, mensagem) {
  if (confirmacoes[chave] && Date.now() - confirmacoes[chave] < 4000) {
    delete confirmacoes[chave];
    return true;
  }
  confirmacoes[chave] = Date.now();
  avisar(mensagem);
  return false;
}
