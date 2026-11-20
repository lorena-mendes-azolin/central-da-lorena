// Simulado com IA: escolhe UM caderno, a IA (Gemini, pela edge function "simulado") gera
// questões de múltipla escolha e outra chamada confere o gabarito. As questões ficam salvas.
const SIM_MAX_TEXTO = 100000;
const SIM_LETRAS = ['A', 'B', 'C', 'D'];
const simTela = { ref: '', fora: [], qtd: 10, gerando: false, erro: '', status: null, buscandoStatus: false, chaveAberta: false, fazendo: null, ver: null };

function simulados() {
  estado.flashcards = estado.flashcards || { baralhos: [] };
  estado.flashcards.simulados = estado.flashcards.simulados || [];
  return estado.flashcards.simulados;
}

// Texto puro de uma página do caderno (sem rodar nada do HTML).
function simTextoDe(html) {
  const marcado = String(html || '').replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote)[^>]*>/gi, '$&\n');
  const doc = new DOMParser().parseFromString(marcado, 'text/html');
  return (doc.body.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Cadernos que têm pelo menos uma página com texto.
function simCadernos() {
  const grupos = [];
  estado.listas.filter((l) => l.tipo === 'cursos').forEach((l) => {
    const itens = [];
    if ((l.notas || []).some((n) => simTextoDe(n.html))) itens.push({ ref: l.id, nome: `Anotações gerais · ${l.nome}`, notas: l.notas });
    (l.materias || []).forEach((m) => {
      if ((m.notas || []).some((n) => simTextoDe(n.html))) itens.push({ ref: `${l.id}/${m.id}`, nome: m.nome, notas: m.notas });
    });
    if (itens.length) grupos.push({ nome: l.nome, itens });
  });
  return grupos;
}
const simCaderno = (ref) => simCadernos().flatMap((g) => g.itens).find((c) => c.ref === ref) || null;

function simPaginasEscolhidas(cad) {
  return cad.notas.map((n) => ({ id: n.id, titulo: n.titulo || 'Sem título', texto: simTextoDe(n.html) }))
    .filter((p) => p.texto && !simTela.fora.includes(p.id));
}

async function simBuscarStatus() {
  if (!NUVEM_ATIVA || !usuario || simTela.buscandoStatus) return;
  simTela.buscandoStatus = true;
  try {
    const { data, error } = await sb.functions.invoke('simulado', { body: { acao: 'status' } });
    simTela.status = error || !data ? { falhou: true } : data;
  } catch { simTela.status = { falhou: true }; }
  simTela.buscandoStatus = false;
  if (location.hash === '#flashcards' && flashTela.aba === 'simulados') desenharSeguro();
}

function htmlSimulados() {
  if (simTela.fazendo) return htmlSimFazendo();
  if (simTela.ver) return htmlSimVer();
  if (!simTela.status && !simTela.buscandoStatus) setTimeout(simBuscarStatus, 0);
  const lista = simulados();
  return `
  <div class="cab-pagina">
    <div><h1>Simulados</h1><p>Escolha um caderno e a IA cria questões de múltipla escolha só com o que você anotou.</p></div>
    <div class="cab-acoes">${htmlAbasFlash()}</div>
  </div>
  <div class="sim-layout">
    ${htmlSimNovo()}
    <section class="card">
      <h2 class="card-titulo">${ic('review')} Simulados salvos <small>${lista.length || ''}</small></h2>
      ${lista.length ? `<div class="sim-salvos lista-rolavel">${lista.map((s) => {
        const ok = s.questoes.filter((q) => !q.problema).length;
        const ult = s.tentativas[s.tentativas.length - 1];
        return `<button class="baralho" data-acao="sim-ver" data-id="${s.id}">
          <span class="selo mini c-violeta">${ic('review')}</span>
          <span class="meio"><b>${esc(s.nome)}</b><small>${new Date(s.criado).toLocaleDateString('pt-BR')} · ${ok} ${ok === 1 ? 'questão' : 'questões'}</small></span>
          ${ult ? `<em class="sim-nota ${ult.acertos / ult.total >= 0.7 ? 'boa' : ''}" title="Última tentativa">${ult.acertos}/${ult.total}</em>` : ''}
        </button>`;
      }).join('')}</div>` : '<p class="vazio">Nenhum simulado ainda. Os que você gerar ficam guardados aqui para refazer depois.</p>'}
    </section>
  </div>`;
}

function htmlSimStatus() {
  const s = simTela.status;
  if (!NUVEM_ATIVA || !usuario) return '<p class="dica">Entre na sua conta para usar o simulado com IA.</p>';
  if (!s) return '<p class="dica">Conferindo a IA…</p>';
  if (s.falhou) return `<p class="dica">Não consegui falar com a IA agora. <button class="sim-link" data-acao="sim-status">Tentar de novo</button></p>`;
  if (s.chavePropria) return `<p class="dica sim-status">${ic('check', 'p')} Usando a sua chave do Gemini (sem limite do site). <button class="sim-link" data-acao="sim-chave">Trocar</button></p>`;
  if (!s.chaveSite) return `<p class="dica sim-status">Para gerar simulados, coloque a sua chave do Gemini (é grátis). <button class="sim-link" data-acao="sim-chave">Colocar chave</button></p>`;
  return `<p class="dica sim-status">IA do site: ${s.usados} de ${s.limite} simulados hoje. <button class="sim-link" data-acao="sim-chave">Usar minha chave (sem limite)</button></p>`;
}

function htmlSimChave() {
  const tem = simTela.status?.chavePropria;
  return `<div class="sim-chave">
    <b>Sua chave do Gemini</b>
    <ol>
      <li>Abra <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> com a sua conta Google.</li>
      <li>Clique em <b>Create API key</b> (é grátis).</li>
      <li>Copie a chave e cole aqui.</li>
    </ol>
    <form class="form-linha" data-form="sim-chave">
      <input type="password" name="chave" placeholder="${tem ? 'Chave salva · cole outra para trocar' : 'Cole a chave aqui'}" autocomplete="off" data-precisa>
      <button class="btn" type="submit">Salvar</button>
      ${tem ? '<button class="btn sec" type="button" data-acao="sim-chave-tirar">Remover</button>' : ''}
      <button class="btn sec" type="button" data-acao="sim-chave">Fechar</button>
    </form>
    <p class="dica">A chave fica guardada só na sua conta e é usada apenas para gerar os seus simulados, com a cota grátis do Google.</p>
  </div>`;
}

function htmlSimNovo() {
  const grupos = simCadernos();
  if (!grupos.length) {
    return `<section class="card vazio-grande">
      <span class="selo c-violeta">${ic('notebook')}</span>
      <h2>Nenhum caderno com texto</h2>
      <p class="vazio">O simulado é feito a partir das páginas do Caderno das suas matérias ou cursos. Escreva suas anotações lá e volte aqui.</p>
      ${htmlSimStatus()}
      ${simTela.chaveAberta ? htmlSimChave() : ''}
    </section>`;
  }
  const cad = simCaderno(simTela.ref);
  if (!cad) simTela.ref = '';
  const paginas = cad ? cad.notas.map((n) => ({ id: n.id, titulo: n.titulo || 'Sem título', tam: simTextoDe(n.html).length })).filter((p) => p.tam) : [];
  const total = paginas.filter((p) => !simTela.fora.includes(p.id)).reduce((s, p) => s + p.tam, 0);
  const passou = total > SIM_MAX_TEXTO;
  const pouco = cad && total < 300;
  const pode = cad && !passou && !pouco && !simTela.gerando && simTela.status && !simTela.status.falhou;

  return `<section class="card">
    <h2 class="card-titulo">${ic('sparkle')} Novo simulado</h2>
    <label class="campo">Qual caderno?
      <select data-mudar="sim-caderno">
        <option value="">Escolha um caderno</option>
        ${grupos.map((g) => `<optgroup label="${esc(g.nome)}">${g.itens.map((c) => `<option value="${c.ref}" ${c.ref === simTela.ref ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>`).join('')}
      </select>
    </label>
    ${cad ? `
      <div class="sub-titulo">${ic('note', 'p')} Páginas que entram <small class="sim-conta ${passou ? 'ruim' : ''}">${Math.round(total / 1000 * 10) / 10} mil de ${SIM_MAX_TEXTO / 1000} mil letras</small></div>
      <div class="sim-paginas lista-rolavel">
        ${paginas.map((p) => `<button class="sim-pagina" data-acao="sim-pagina" data-id="${p.id}">
          <span class="check ${simTela.fora.includes(p.id) ? '' : 'on'}">${simTela.fora.includes(p.id) ? '' : ic('check')}</span>
          <span>${esc(p.titulo)}</span><small>${p.tam.toLocaleString('pt-BR')} letras</small>
        </button>`).join('')}
      </div>
      ${passou ? '<p class="dica sim-aviso">Passou do limite de 100 mil letras por simulado. Desmarque alguma página.</p>' : ''}
      ${pouco ? '<p class="dica sim-aviso">Tem pouco texto marcado. Escreva mais no caderno ou marque mais páginas.</p>' : ''}
      <div class="sim-linha">
        <span class="rotulo-select">Questões</span>
        <div class="segmento">${[5, 10, 15].map((n) => `<button class="${simTela.qtd === n ? 'ativo' : ''}" data-acao="sim-qtd" data-n="${n}">${n}</button>`).join('')}</div>
        <span class="espaco"></span>
        <button class="btn" data-acao="sim-gerar" ${pode ? '' : 'disabled'}>${ic('sparkle', 'p')} ${simTela.gerando ? 'Gerando…' : 'Gerar simulado'}</button>
      </div>` : ''}
    ${simTela.gerando ? `<div class="sim-carregando"><span class="girando"></span><span>Lendo o caderno e criando as questões. Caderno grande é dividido em partes, e uma segunda IA confere cada gabarito. Pode levar até 2 minutos.</span></div>` : ''}
    ${simTela.erro ? `<div class="alerta">${ic('alert')}<span>${esc(simTela.erro)}</span></div>` : ''}
    ${htmlSimStatus()}
    ${simTela.chaveAberta ? htmlSimChave() : ''}
  </section>`;
}

// ---------- Fazendo o simulado ----------
function simAtual() { return simulados().find((s) => s.id === (simTela.fazendo?.simId || simTela.ver)); }

function htmlSimFonte(q) {
  return `<div class="sim-porque">
    <b>Por quê?</b>
    <p>${esc(q.explicacao)}</p>
    ${q.trecho ? `<div class="sim-trecho"><small>${ic('notebook', 'p')} No seu caderno${q.pagina ? ` · ${esc(q.pagina)}` : ''}</small><blockquote>${esc(q.trecho)}</blockquote></div>`
      : q.pagina ? `<small class="sim-pagina-fonte">${ic('notebook', 'p')} Baseado na página “${esc(q.pagina)}”, mas a IA não copiou o trecho exato. Vale conferir no caderno.</small>` : ''}
    ${q.complemento ? `<div class="sim-complemento"><small>${ic('sparkle', 'p')} Complemento da IA (não está no seu caderno)</small><p>${esc(q.complemento)}</p></div>` : ''}
  </div>`;
}

function htmlSimFazendo() {
  const f = simTela.fazendo;
  const s = simAtual();
  if (!s) { simTela.fazendo = null; return htmlSimulados(); }
  if (f.idx >= f.fila.length) {
    const total = Object.keys(f.escolhas).length;
    const acertos = Object.entries(f.escolhas).filter(([id, n]) => s.questoes.find((q) => q.id === id)?.correta === n).length;
    const pct = total ? Math.round((acertos / total) * 100) : 0;
    return `<section class="card estudo fim">
      <span class="selo ${pct >= 70 ? 'c-verde' : 'c-violeta'}">${ic(pct >= 70 ? 'star' : 'review')}</span>
      <h2>Simulado concluído</h2>
      <p>${acertos} de ${total} ${total === 1 ? 'questão certa' : 'questões certas'} · ${pct}%</p>
      <div class="botoes">
        <button class="btn sec" data-acao="sim-ver" data-id="${s.id}">Ver as questões</button>
        <button class="btn sec" data-acao="sim-refazer" data-id="${s.id}">${ic('reset', 'p')} Refazer</button>
        <button class="btn" data-acao="sim-sair">Voltar aos simulados</button>
      </div>
    </section>`;
  }
  const q = s.questoes.find((x) => x.id === f.fila[f.idx]);
  const escolha = f.escolhas[q.id];
  const respondida = escolha !== undefined;
  return `<a class="voltar" href="#flashcards" data-acao="sim-sair">${ic('left', 'p')} Sair do simulado</a>
    <div class="estudo-topo"><b>${esc(s.nome)}</b><span>${f.idx + 1} de ${f.fila.length}</span></div>
    <div class="prog" style="margin-bottom:18px"><i style="width:${(f.idx / f.fila.length) * 100}%"></i></div>
    <section class="card sim-questao">
      <p class="sim-enunciado">${esc(q.enunciado).replace(/\n/g, '<br>')}</p>
      <div class="sim-alternativas">
        ${q.alternativas.map((a, i) => {
          const cls = !respondida ? '' : i === q.correta ? 'certa' : i === escolha ? 'errada' : 'apagada';
          return `<button class="sim-alt ${cls}" data-acao="sim-responder" data-n="${i}" ${respondida ? 'disabled' : ''}><kbd>${SIM_LETRAS[i]}</kbd><span>${esc(a)}</span></button>`;
        }).join('')}
      </div>
      ${respondida ? `<p class="sim-resultado ${escolha === q.correta ? 'boa' : 'ruim'}">${escolha === q.correta ? `${ic('check', 'p')} Acertou!` : `${ic('x', 'p')} Não foi dessa vez. A certa é a ${SIM_LETRAS[q.correta]}.`}</p>
        ${htmlSimFonte(q)}
        <div class="sim-acoes">
          <button class="btn-mini" data-acao="sim-problema" data-id="${q.id}" title="A questão está errada, confusa ou fora do conteúdo">${ic('flag', 'p')} Questão com problema</button>
          <button class="btn-mini" data-acao="sim-flash" data-id="${q.id}">${ic('layers', 'p')} ${q.virouCard ? 'Já virou flashcard' : 'Virar flashcard'}</button>
          <span class="espaco"></span>
          <button class="btn" data-acao="sim-proxima">${f.idx + 1 < f.fila.length ? 'Próxima' : 'Ver resultado'} ${ic('right', 'p')}</button>
        </div>` : `<div class="sim-acoes"><button class="btn-mini" data-acao="sim-problema" data-id="${q.id}">${ic('flag', 'p')} Questão com problema</button><span class="espaco"></span><small class="dica" style="margin:0">Teclas A a D ou 1 a 4</small></div>`}
    </section>`;
}

// ---------- Ver um simulado salvo ----------
function htmlSimVer() {
  const s = simAtual();
  if (!s) { simTela.ver = null; return htmlSimulados(); }
  const boas = s.questoes.filter((q) => !q.problema).length;
  return `<a class="voltar" href="#flashcards" data-acao="sim-sair">${ic('left', 'p')} Voltar aos simulados</a>
    <section class="card">
      <div class="barra-lista" style="margin-bottom:10px">
        <textarea class="titulo-edit pequeno titulo-quebra" rows="1" data-digitar="sim-nome" data-id="${s.id}" aria-label="Nome do simulado" maxlength="80">${esc(s.nome)}</textarea>
        <span class="espaco"></span>
        <button class="btn" data-acao="sim-refazer" data-id="${s.id}" ${boas ? '' : 'disabled'}>${ic('play', 'p')} ${s.tentativas.length ? 'Refazer' : 'Fazer'}</button>
        <button class="acao-item apagar" data-acao="sim-del" data-id="${s.id}" title="Excluir simulado">${ic('trash', 'p')}</button>
      </div>
      <p class="dica" style="margin:0 0 14px">${s.caderno ? `Caderno: ${esc(s.caderno)} · ` : ''}criado em ${new Date(s.criado).toLocaleDateString('pt-BR')}${s.tentativas.length ? ` · tentativas: ${s.tentativas.map((t) => `${t.acertos}/${t.total}`).join(', ')}` : ''}</p>
      <div class="sim-lista">
        ${s.questoes.map((q, n) => `<details class="sim-item ${q.problema ? 'problema' : ''}">
          <summary><b>${n + 1}.</b> <span>${esc(q.enunciado)}</span>${q.problema ? '<em>com problema</em>' : ''}</summary>
          <ol class="sim-gabarito">${q.alternativas.map((a, i) => `<li class="${i === q.correta ? 'certa' : ''}"><kbd>${SIM_LETRAS[i]}</kbd> ${esc(a)}</li>`).join('')}</ol>
          ${htmlSimFonte(q)}
          <div class="sim-acoes">
            <button class="btn-mini" data-acao="sim-problema" data-id="${q.id}">${ic('flag', 'p')} ${q.problema ? 'Não tem problema (voltar ao simulado)' : 'Questão com problema'}</button>
            <button class="btn-mini" data-acao="sim-flash" data-id="${q.id}">${ic('layers', 'p')} ${q.virouCard ? 'Já virou flashcard' : 'Virar flashcard'}</button>
          </div>
        </details>`).join('')}
      </div>
    </section>`;
}

// ---------- Ações ----------
MUDAR['sim-caderno'] = (el) => { simTela.ref = el.value; simTela.fora = []; simTela.erro = ''; desenhar(); };
ACOES['sim-pagina'] = (el) => {
  const id = el.dataset.id;
  simTela.fora = simTela.fora.includes(id) ? simTela.fora.filter((x) => x !== id) : [...simTela.fora, id];
  desenhar();
};
ACOES['sim-qtd'] = (el) => { simTela.qtd = Number(el.dataset.n); desenhar(); };
ACOES['sim-status'] = () => { simTela.status = null; simBuscarStatus(); desenhar(); };
ACOES['sim-chave'] = () => { simTela.chaveAberta = !simTela.chaveAberta; desenhar(); $('.sim-chave input')?.focus(); };

FORMS['sim-chave'] = async (d) => {
  if (!usuario) return;
  const chave = d.chave.replace(/\s/g, '');
  if (chave.length < 20) { avisar('Essa chave parece incompleta. Copie de novo no AI Studio.'); return; }
  const { error } = await sb.from('ia_chaves').upsert({ user_id: usuario.id, gemini: chave, atualizado_em: new Date().toISOString() });
  if (error) { avisar('Não consegui salvar a chave. Tente de novo.'); return; }
  simTela.chaveAberta = false; simTela.erro = '';
  avisar('Chave salva. Agora os simulados usam a sua cota grátis.');
  simTela.status = null; simBuscarStatus(); desenhar();
};
ACOES['sim-chave-tirar'] = async () => {
  if (!usuario) return;
  const { error } = await sb.from('ia_chaves').delete().eq('user_id', usuario.id);
  if (error) { avisar('Não consegui remover a chave.'); return; }
  simTela.chaveAberta = false;
  avisar('Chave removida.');
  simTela.status = null; simBuscarStatus(); desenhar();
};

ACOES['sim-gerar'] = async () => {
  const cad = simCaderno(simTela.ref);
  if (!cad || simTela.gerando) return;
  const paginas = simPaginasEscolhidas(cad);
  simTela.gerando = true; simTela.erro = '';
  desenhar();
  let resp;
  try {
    const { data, error } = await sb.functions.invoke('simulado', {
      body: { materia: cad.nome, qtd: simTela.qtd, paginas: paginas.map((p) => ({ titulo: p.titulo, texto: p.texto })) },
    });
    resp = error ? { erro: 'Não consegui falar com a IA. Confira a internet e tente de novo.' } : data;
  } catch { resp = { erro: 'Não consegui falar com a IA. Confira a internet e tente de novo.' }; }
  simTela.gerando = false;
  if (!resp?.questoes?.length) {
    simTela.erro = resp?.erro || 'A IA não devolveu questões. Tente de novo.';
    if (resp?.precisaChave || resp?.limite || resp?.chaveRuim) simTela.chaveAberta = true;
    simTela.status = null; simBuscarStatus();
    desenharSeguro();
    return;
  }
  const s = {
    id: novoId(), ref: cad.ref, caderno: cad.nome,
    nome: `${cad.nome} · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
    criado: new Date().toISOString(),
    questoes: resp.questoes.map((q) => ({ id: novoId(), ...q, problema: false })),
    tentativas: [],
  };
  simulados().unshift(s);
  salvar();
  if (resp.partesFalharam) avisar('Uma parte do caderno não respondeu a tempo, então o simulado ficou só com as outras partes.');
  else if (resp.questoes.length < simTela.qtd) avisar(`A conferência descartou algumas questões duvidosas. Ficaram ${resp.questoes.length}.`);
  simTela.status = null; simBuscarStatus();
  simComecar(s);
};

function simComecar(s) {
  const fila = s.questoes.filter((q) => !q.problema).map((q) => q.id).sort(() => Math.random() - 0.5);
  simTela.ver = null;
  simTela.fazendo = { simId: s.id, fila, idx: 0, escolhas: {} };
  window.scrollTo(0, 0);
  desenharSeguro();
}

ACOES['sim-refazer'] = (el) => { const s = simulados().find((x) => x.id === el.dataset.id); if (s) simComecar(s); };
ACOES['sim-ver'] = (el) => { simTela.fazendo = null; simTela.ver = el.dataset.id; window.scrollTo(0, 0); desenhar(); };
ACOES['sim-sair'] = () => { simTela.fazendo = null; simTela.ver = null; desenhar(); };
ACOES['sim-del'] = (el) => { simTela.ver = null; removerComDesfazer(simulados(), el.dataset.id, 'Simulado'); };
DIGITAR['sim-nome'] = (el) => { const s = simulados().find((x) => x.id === el.dataset.id); if (s) { s.nome = el.value; salvar(); } };

ACOES['sim-responder'] = (el) => {
  const f = simTela.fazendo;
  if (!f) return;
  const id = f.fila[f.idx];
  if (f.escolhas[id] !== undefined) return;
  f.escolhas[id] = Number(el.dataset.n);
  desenhar();
};

function simFinalizarSePreciso() {
  const f = simTela.fazendo;
  if (!f || f.idx < f.fila.length || f.salvo) return;
  f.salvo = true;
  const s = simAtual();
  const total = Object.keys(f.escolhas).length;
  if (s && total) {
    const acertos = Object.entries(f.escolhas).filter(([id, n]) => s.questoes.find((q) => q.id === id)?.correta === n).length;
    s.tentativas.push({ data: hojeISO(), acertos, total });
  }
}

ACOES['sim-proxima'] = () => {
  const f = simTela.fazendo;
  if (!f) return;
  f.idx++;
  simFinalizarSePreciso();
  salvar(); desenhar();
  window.scrollTo(0, 0);
};

ACOES['sim-problema'] = (el) => {
  const s = simAtual();
  const q = s?.questoes.find((x) => x.id === el.dataset.id);
  if (!q) return;
  q.problema = !q.problema;
  const f = simTela.fazendo;
  if (f && q.problema && f.fila[f.idx] === q.id) {
    delete f.escolhas[q.id];
    f.fila.splice(f.idx, 1);
    simFinalizarSePreciso();
  }
  salvar(); desenhar();
  avisar(q.problema ? 'Questão marcada com problema. Ela não volta mais nos simulados.' : 'A questão voltou para o simulado.');
};

ACOES['sim-flash'] = (el) => {
  const s = simAtual();
  const q = s?.questoes.find((x) => x.id === el.dataset.id);
  if (!q || q.virouCard) return;
  const ref = s.ref && acharRef(s.ref) ? s.ref : '';
  const b = (ref && baralhos().find((x) => x.ref === ref)) || criarBaralho(ref, s.caderno);
  b.cards.unshift({ id: novoId(), frente: q.enunciado, verso: q.alternativas[q.correta] + (q.explicacao ? `\n\n${q.explicacao}` : ''), caixa: 1, proxima: '' });
  q.virouCard = true;
  salvar(); desenhar();
  avisar(`Virou flashcard no baralho “${b.nome}”.`);
};

document.addEventListener('keydown', (e) => {
  const f = simTela.fazendo;
  if (!f || location.hash !== '#flashcards' || flashTela.aba !== 'simulados' || e.target.matches('input, textarea, select')) return;
  if (f.idx >= f.fila.length) return;
  const respondida = f.escolhas[f.fila[f.idx]] !== undefined;
  const mapa = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
  const n = mapa[e.key.toLowerCase()];
  if (!respondida && n !== undefined) { e.preventDefault(); ACOES['sim-responder']({ dataset: { n } }); }
  else if (respondida && e.key === 'Enter') { e.preventDefault(); ACOES['sim-proxima'](); }
});
