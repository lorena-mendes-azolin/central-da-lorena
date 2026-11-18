const petTela = { pet: null, criando: false };
const ESPECIES = { cachorro: 'Cachorro', gato: 'Gato', passaro: 'Pássaro', peixe: 'Peixe', roedor: 'Roedor', reptil: 'Réptil', outro: 'Outro' };
const ATIV_PET = { passeio: { nome: 'Passeio', cor: '#5fd6a4' }, brincadeira: { nome: 'Brincadeira', cor: '#f7c56b' }, banho: { nome: 'Banho', cor: '#8fd3ff' }, treino: { nome: 'Adestramento', cor: '#c49bff' } };
const EXTRAS_PET = { passeio: 'Passeios', brincadeira: 'Brincadeiras', banho: 'Banhos', treino: 'Adestramento', juntos: 'Tempo juntos', peso: 'Peso', registros: 'Últimos registros' };
const mostraPet = (p, k) => (p.mostrar || []).includes(k);
const CUIDADOS_PET = ['Vacina', 'Vermífugo', 'Antipulgas', 'Banho e tosa', 'Veterinário', 'Remédio', 'Comprar ração', 'Cortar unhas'];

function dadosPets() {
  estado.pets = estado.pets || {};
  const p = estado.pets;
  p.lista = p.lista || [];
  p.atividades = p.atividades || [];
  return p;
}
const petAtual = () => { const l = dadosPets().lista; return l.find((x) => x.id === petTela.pet) || l[0]; };

function idadePet(nasc) {
  if (!nasc) return '';
  const n = paraData(nasc), h = paraData(hojeISO());
  let meses = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth() - (h.getDate() < n.getDate() ? 1 : 0);
  if (meses < 0) return '';
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const a = Math.floor(meses / 12);
  return `${a} ${a === 1 ? 'ano' : 'anos'}${meses % 12 ? ` e ${meses % 12} ${meses % 12 === 1 ? 'mês' : 'meses'}` : ''}`;
}

PAGINAS.pets = {
  titulo: 'Pets',
  desenhar() {
    const d = dadosPets();
    const p = petAtual();
    if (p) petTela.pet = p.id;
    return `
    <div class="cab-pagina">
      <div><h1>Pets</h1><p>Passeios, brincadeiras, cardápio da semana e os cuidados dos seus bichinhos.</p></div>
      <div class="cab-acoes"><button class="btn" data-acao="pet-novo">${ic('plus', 'p')} Novo pet</button></div>
    </div>
    ${petTela.criando || !d.lista.length ? htmlFormPet() : ''}
    ${d.lista.length > 1 ? `<div class="chips">${d.lista.map((x) => `<button class="chip ${x.id === p.id ? 'ativo' : ''}" data-acao="pet-ver" data-id="${x.id}">${esc(x.nome)}</button>`).join('')}</div>` : ''}
    ${p ? `<div class="pagina-pet">${htmlPet(p)}</div>` : ''}`;
  },
};

function htmlFormPet(p = {}) {
  return `<form class="card" data-form="pet-salvar" style="margin-bottom:16px">
    <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('paw')}</span> ${p.id ? 'Editar pet' : 'Novo pet'}</h2>
    <div class="linha3">
      <label class="campo">Nome<input type="text" name="nome" maxlength="30" value="${esc(p.nome || '')}" data-precisa></label>
      <label class="campo">Espécie<select name="especie">${Object.entries(ESPECIES).map(([id, n]) => `<option value="${id}" ${p.especie === id ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo">Raça (opcional)<input type="text" name="raca" maxlength="40" value="${esc(p.raca || '')}"></label>
    </div>
    <div class="linha3">
      <label class="campo">Nascimento (opcional)<input type="date" name="nasc" value="${p.nasc || ''}" max="${hojeISO()}"></label>
      <label class="campo">Passeios por semana (meta)<input type="number" name="meta" min="0" max="21" value="${p.meta ?? 7}"></label>
      <label class="campo">Brincadeiras por semana (meta)<input type="number" name="metaBrincar" min="0" max="21" value="${p.metaBrincar ?? 5}"></label>
    </div>
    <div class="linha2">
      <label class="campo">Ao registrar passeio, marcar na Rotina<select name="habPasseio">${opcoesHabitos(p.habPasseio || '')}</select></label>
      <label class="campo">Ao registrar brincadeira, marcar na Rotina<select name="habBrincar">${opcoesHabitos(p.habBrincar || '')}</select></label>
    </div>
    ${p.id ? `<input type="hidden" name="id" value="${p.id}">` : ''}
    <div class="form-linha" style="justify-content:flex-end">
      ${dadosPets().lista.length ? '<button type="button" class="btn sec" data-acao="pet-cancelar">Cancelar</button>' : ''}
      <button class="btn">${p.id ? 'Salvar' : 'Adicionar pet'}</button>
    </div>
  </form>`;
}

function htmlPet(p) {
  if (petTela.editando === p.id) return htmlFormPet(p);
  const d = dadosPets();
  const hoje = hojeISO();
  const seg = segundaDaSemana(hoje);
  const dias = Array.from({ length: 7 }, (_, k) => somarDias(seg, k));
  const ativ = d.atividades.filter((a) => a.petId === p.id);
  const daSemana = ativ.filter((a) => a.data >= seg && a.data <= dias[6]);
  const nPasseio = daSemana.filter((a) => a.tipo === 'passeio').length;
  const nBrincar = daSemana.filter((a) => a.tipo === 'brincadeira').length;
  const minSemana = daSemana.reduce((s, a) => s + (a.min || 0), 0);
  const card = p.cardapio || {};
  const refeicoes = p.refeicoes || [];
  const lembretes = estado.tarefas.filter((t) => t.petId === p.id && !t.feito).sort((a, b) => (a.data || '9').localeCompare(b.data || '9'));
  const pesos = [...(p.pesos || [])].sort((a, b) => a.data.localeCompare(b.data));
  const ultimoPeso = pesos[pesos.length - 1];
  const dif = pesos.length > 1 ? ultimoPeso.kg - pesos[pesos.length - 2].kg : 0;
  const dHoje = paraData(hoje).getDay();
  const tiposAtivos = Object.keys(ATIV_PET).filter((k) => mostraPet(p, k));

  return `
  <section class="card pet-topo">
    <span class="pet-avatar">${ic('paw')}</span>
    <div><h2>${esc(p.nome)}</h2><p class="dica" style="margin:0">${ESPECIES[p.especie] || ''}${p.raca ? ` · ${esc(p.raca)}` : ''}${p.nasc ? ` · ${idadePet(p.nasc)}` : ''}${ultimoPeso ? ` · ${fmtNum(ultimoPeso.kg, 2)} kg` : ''}</p></div>
    <span class="espaco"></span>
    <button class="btn-mini ${petTela.personalizando ? 'ativo' : ''}" data-acao="pet-personalizar">${ic('eye', 'p')} O que acompanhar</button>
    <button class="btn-mini" data-acao="pet-editar" data-id="${p.id}">${ic('edit', 'p')} Editar</button>
    <button class="acao-item apagar" data-acao="pet-del" data-id="${p.id}" title="Excluir pet">${ic('trash', 'p')}</button>
  </section>
  ${petTela.personalizando ? `<section class="card pet-personalizar">
    <p style="margin:0 0 10px">Cardápio e Cuidados aparecem sempre. Escolha o que mais faz sentido para ${esc(p.nome)}:</p>
    <div class="chips">${Object.entries(EXTRAS_PET).map(([k, n]) => `<button class="chip ${mostraPet(p, k) ? 'ativo' : ''}" data-acao="pet-mostrar" data-k="${k}">${mostraPet(p, k) ? ic('check', 'p') + ' ' : ''}${n}</button>`).join('')}</div>
  </section>` : ''}

  ${(() => {
    const st = [
      mostraPet(p, 'passeio') && `<div class="card stat"><span class="selo c-verde">${ic('paw')}</span><div><b>${nPasseio}/${p.meta ?? 7}</b><span>passeios na semana</span></div></div>`,
      mostraPet(p, 'brincadeira') && `<div class="card stat"><span class="selo c-amarelo">${ic('star')}</span><div><b>${nBrincar}/${p.metaBrincar ?? 5}</b><span>brincadeiras na semana</span></div></div>`,
      mostraPet(p, 'juntos') && `<div class="card stat"><span class="selo c-violeta">${ic('clock')}</span><div><b>${textoMinutos(minSemana)}</b><span>juntos nesta semana</span></div></div>`,
    ].filter(Boolean);
    return st.length ? `<div class="grade-auto">${st.join('')}</div>` : '';
  })()}

  ${tiposAtivos.length ? `<section class="card">
    <h2 class="card-titulo"><span class="selo mini c-verde">${ic('calendar')}</span> Esta semana</h2>
    <div class="semana-pet">${dias.map((dia) => { const a = ativ.filter((x) => x.data === dia); const min = a.reduce((t, x) => t + (x.min || 0), 0); return `<div class="dia-pet ${dia === hoje ? 'hoje' : ''} ${a.length ? 'feito' : ''} ${dia > hoje ? 'futuro' : ''}">
      <small>${DIAS_SEMANA[paraData(dia).getDay()]}</small>
      <b>${paraData(dia).getDate()}</b>
      <div class="pontos-pet">${a.map((x) => `<i style="background:${ATIV_PET[x.tipo]?.cor}" title="${ATIV_PET[x.tipo]?.nome}${x.min ? ` · ${x.min} min` : ''}"></i>`).join('')}</div>
      <span class="min-pet">${a.length ? (min ? min + ' min' : a.length + 'x') : ''}</span>
    </div>`; }).join('')}</div>
    ${tiposAtivos.length > 1 ? `<p class="dica leg-linha">${tiposAtivos.map((id) => `<span class="leg-pet"><i style="background:${ATIV_PET[id].cor}"></i>${ATIV_PET[id].nome}</span>`).join(' ')}</p>` : ''}
    <div class="painel-pet">
      ${mostraPet(p, 'passeio') ? `<button class="btn" data-acao="pet-rapido" data-t="passeio">${ic('paw', 'p')} Passeei agora</button>` : ''}
      ${mostraPet(p, 'brincadeira') ? `<button class="btn" data-acao="pet-rapido" data-t="brincadeira">${ic('star', 'p')} Brincou agora</button>` : ''}
      ${mostraPet(p, 'passeio') || mostraPet(p, 'brincadeira') ? '<span class="jj-ou">ou registrar outro dia</span>' : ''}
      <form class="registro-pet" data-form="pet-ativ">
        ${tiposAtivos.length > 1 ? `<select name="tipo" aria-label="O que fizeram">${tiposAtivos.map((id) => `<option value="${id}">${ATIV_PET[id].nome}</option>`).join('')}</select>` : `<input type="hidden" name="tipo" value="${tiposAtivos[0]}">`}
        <input type="date" name="data" value="${hoje}" max="${hoje}" aria-label="Dia">
        <span class="com-unidade"><input type="number" name="min" min="0" max="600" value="20" aria-label="Minutos"><i>min</i></span>
        <button class="btn sec">${ic('plus', 'p')} Registrar</button>
      </form>
    </div>
  </section>` : ''}

  <div class="grade-pet">
    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('coffee')}</span> Cardápio da semana</h2>
      <p class="dica" style="margin:0 0 10px">Escreva o que ${esc(p.nome)} come em cada dia. Útil quando a alimentação muda durante a semana.</p>
      <div class="cardapio-pet">${ORDEM_SEMANA.map((dw) => `<label class="${dw === dHoje ? 'hoje' : ''}"><span>${DIAS_SEMANA[dw]}</span>
        <input type="text" maxlength="120" value="${esc(card[dw] || '')}" placeholder="—" data-digitar="pet-cardapio" data-d="${dw}"></label>`).join('')}</div>
      <h3 class="sub-titulo">Horários das refeições</h3>
      <div class="refeicoes-pet">${refeicoes.map((r) => `<div class="item"><span class="txt"><b>${r.hora}</b> · ${esc(r.texto)}</span>
        <button class="btn-mini" data-acao="pet-ref-aviso" data-id="${r.id}" title="Criar aviso diário na agenda">${ic('bell', 'p')} ${estado.tarefas.some((t) => t.refPet === r.id) ? 'Com aviso' : 'Avisar'}</button>
        <button class="acao-item apagar" data-acao="pet-ref-del" data-id="${r.id}">${ic('x', 'p')}</button></div>`).join('') || '<p class="vazio">Nenhum horário ainda.</p>'}</div>
      <form class="form-linha" data-form="pet-ref">
        <input type="time" name="hora" aria-label="Hora" required>
        <input type="text" name="texto" maxlength="60" placeholder="Ração, sachê, remédio…" aria-label="O quê" style="flex:2 1 160px" data-precisa>
        <button class="btn sec">${ic('plus', 'p')}</button>
      </form>
    </section>

    <section class="card">
      <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('bell')}</span> Cuidados e lembretes</h2>
      <div class="lista-rolavel" style="max-height:240px">${lembretes.map((t) => `<div class="item ${t.data && t.data < hoje ? 'atrasado' : ''}">
        <button class="check" data-acao="tarefa-toggle" data-id="${t.id}" aria-label="Feito"></button>
        <span class="txt">${esc(t.titulo.replace(`${p.nome}: `, ''))}<span class="sub">${t.data ? `${dataCurta(t.data)} · ${quandoFalta(t.data)}` : 'sem data'}${t.hora ? ` · ${t.hora}` : ''}${t.repetir ? ` · ${REPETICOES[t.repetir].toLowerCase()}` : ''}</span></span>
        <button class="acao-item apagar" data-acao="tarefa-del" data-id="${t.id}">${ic('trash', 'p')}</button></div>`).join('') || '<p class="vazio">Nada marcado. Que tal anotar a próxima vacina?</p>'}</div>
      <form data-form="pet-lembrete" class="form-lembrete-pet">
        <div class="chips">${CUIDADOS_PET.map((c) => `<button type="button" class="chip" data-acao="pet-cuidado" data-v="${c}">${c}</button>`).join('')}</div>
        <div class="linha2">
          <label class="campo">O quê<input type="text" name="titulo" id="pet-lem-titulo" maxlength="60" data-precisa></label>
          <label class="campo">Dia<input type="date" name="data" value="${hoje}"></label>
        </div>
        <div class="linha2">
          <label class="campo">Hora (opcional)<input type="time" name="hora"></label>
          <label class="campo">Repetir<select name="repetir">${Object.entries(REPETICOES).map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select></label>
        </div>
        <div class="form-linha" style="justify-content:flex-end"><button class="btn">${ic('plus', 'p')} Adicionar lembrete</button></div>
      </form>
      <p class="dica" style="margin:6px 0 0">Os lembretes também aparecem na Agenda e avisam como as outras tarefas.</p>
    </section>
  </div>

  ${mostraPet(p, 'peso') || mostraPet(p, 'registros') ? `<div class="grade-pet">
    ${mostraPet(p, 'peso') ? `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-azul">${ic('scale')}</span> Peso</h2>
      ${ultimoPeso ? `<p class="peso-pet"><b>${fmtNum(ultimoPeso.kg, 2)} kg</b> <span class="dica">em ${dataCurta(ultimoPeso.data)}${dif ? ` · ${dif > 0 ? '+' : ''}${fmtNum(dif, 2)} kg desde a última pesagem` : ''}</span></p>` : '<p class="vazio">Sem pesagens ainda.</p>'}
      ${pesos.length > 1 ? `<div class="barras-km peso-barras">${pesos.slice(-10).map((x) => { const mx = Math.max(...pesos.slice(-10).map((y) => y.kg)); return `<div class="barra-km" title="${fmtNum(x.kg, 2)} kg"><em>${fmtNum(x.kg, 1)}</em><span style="height:${Math.round((x.kg / mx) * 100)}%"></span><small>${diaCurto(x.data)}</small></div>`; }).join('')}</div>` : ''}
      <form class="form-linha" data-form="pet-peso">
        <input type="date" name="data" value="${hoje}" max="${hoje}" aria-label="Dia">
        <span class="com-unidade"><input type="text" inputmode="decimal" name="kg" placeholder="0,0" aria-label="Peso" data-precisa><i>kg</i></span>
        <button class="btn sec">Salvar peso</button>
      </form>
    </section>` : ''}
    ${mostraPet(p, 'registros') ? `<section class="card">
      <h2 class="card-titulo"><span class="selo mini c-verde">${ic('list')}</span> Últimos registros</h2>
      <div class="lista-rolavel" style="max-height:260px">${[...ativ].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 40).map((a) => `<div class="item">
        <i class="ponto-pet" style="background:${ATIV_PET[a.tipo]?.cor}"></i>
        <span class="txt">${ATIV_PET[a.tipo]?.nome}<span class="sub">${dataCurta(a.data)}${a.min ? ` · ${a.min} min` : ''}</span></span>
        <button class="acao-item apagar" data-acao="pet-ativ-del" data-id="${a.id}">${ic('trash', 'p')}</button></div>`).join('') || '<p class="vazio">Nenhum registro ainda.</p>'}</div>
    </section>` : ''}
  </div>` : ''}`;
}

ACOES['pet-personalizar'] = () => { petTela.personalizando = !petTela.personalizando; desenhar(); };
ACOES['pet-mostrar'] = (el) => {
  const p = petAtual();
  const m = new Set(p.mostrar || []);
  m.has(el.dataset.k) ? m.delete(el.dataset.k) : m.add(el.dataset.k);
  p.mostrar = [...m];
  salvar(); desenhar();
};

ACOES['pet-novo'] = () => { petTela.criando = !petTela.criando; petTela.editando = null; desenhar(); };
ACOES['pet-cancelar'] = () => { petTela.criando = false; petTela.editando = null; desenhar(); };
ACOES['pet-ver'] = (el) => { petTela.pet = el.dataset.id; petTela.editando = null; desenhar(); };
ACOES['pet-editar'] = (el) => { petTela.editando = el.dataset.id; desenhar(); };
FORMS['pet-salvar'] = (d) => {
  const lista = dadosPets().lista;
  const dados = { nome: d.nome, especie: d.especie, raca: d.raca, nasc: d.nasc, meta: Number(d.meta) || 0, metaBrincar: Number(d.metaBrincar) || 0, habPasseio: d.habPasseio || '', habBrincar: d.habBrincar || '' };
  let p = d.id && lista.find((x) => x.id === d.id);
  if (p) Object.assign(p, dados);
  else { p = { id: novoId(), ...dados, cardapio: {}, refeicoes: [], pesos: [], mostrar: [] }; lista.push(p); }
  petTela.pet = p.id; petTela.criando = false; petTela.editando = null;
  salvar(); desenhar();
  avisar(`${p.nome} salvo.`);
};
ACOES['pet-del'] = (el) => {
  const d = dadosPets();
  const p = d.lista.find((x) => x.id === el.dataset.id);
  if (!confirmarDuasVezes(`pet-${p.id}`, `Clique de novo para excluir ${p.nome} e os registros.`)) return;
  const antes = JSON.parse(JSON.stringify({ lista: d.lista, atividades: d.atividades }));
  const tarefasAntes = estado.tarefas;
  d.lista = d.lista.filter((x) => x.id !== p.id);
  d.atividades = d.atividades.filter((a) => a.petId !== p.id);
  estado.tarefas = estado.tarefas.filter((t) => t.petId !== p.id);
  petTela.pet = null;
  salvar(); desenhar();
  avisar(`${p.nome} excluído.`, () => { Object.assign(d, antes); estado.tarefas = tarefasAntes; salvar(); desenhar(); });
};

function registrarAtivPet(tipo, data, min, petId) {
  const p = dadosPets().lista.find((x) => x.id === petId) || petAtual();
  dadosPets().atividades.push({ id: novoId(), petId: p.id, tipo, data, min });
  const hab = tipo === 'passeio' ? p.habPasseio : tipo === 'brincadeira' ? p.habBrincar : '';
  const marcou = marcarHabitoAuto(hab, data);
  salvar(); desenhar();
  avisar(`${ATIV_PET[tipo].nome} registrado${tipo === 'brincadeira' ? 'a' : ''} para ${p.nome}.${marcou ? ` "${nomeHabito(hab)}" marcado na Rotina.` : ''}`);
}
FORMS['pet-ativ'] = (d) => registrarAtivPet(d.tipo, d.data || hojeISO(), Number(d.min) || 0);
ACOES['pet-rapido'] = (el) => registrarAtivPet(el.dataset.t, hojeISO(), 20, el.dataset.pet);
ACOES['pet-ativ-del'] = (el) => {
  const d = dadosPets();
  const pos = d.atividades.findIndex((a) => a.id === el.dataset.id);
  const [a] = d.atividades.splice(pos, 1);
  salvar(); desenhar();
  avisar('Registro apagado.', () => { d.atividades.splice(pos, 0, a); salvar(); desenhar(); });
};
DIGITAR['pet-cardapio'] = (el) => { const p = petAtual(); p.cardapio = p.cardapio || {}; p.cardapio[el.dataset.d] = el.value; salvar(); };
FORMS['pet-ref'] = (d) => {
  if (!d.hora) { avisar('Escolha o horário.'); return; }
  const p = petAtual();
  p.refeicoes = [...(p.refeicoes || []), { id: novoId(), hora: d.hora, texto: d.texto }].sort((a, b) => a.hora.localeCompare(b.hora));
  salvar(); desenhar();
};
ACOES['pet-ref-del'] = (el) => {
  const p = petAtual();
  p.refeicoes = p.refeicoes.filter((r) => r.id !== el.dataset.id);
  estado.tarefas = estado.tarefas.filter((t) => t.refPet !== el.dataset.id);
  salvar(); desenhar();
};
ACOES['pet-ref-aviso'] = (el) => {
  const p = petAtual();
  const r = p.refeicoes.find((x) => x.id === el.dataset.id);
  const ja = estado.tarefas.filter((t) => t.refPet === r.id);
  if (ja.length) {
    estado.tarefas = estado.tarefas.filter((t) => t.refPet !== r.id);
    salvar(); desenhar(); avisar('Aviso da refeição desligado.'); return;
  }
  estado.tarefas.push({ id: novoId(), titulo: `${p.nome}: ${r.texto}`, data: hojeISO(), hora: r.hora, duracao: 15, tipo: 'tarefa', area: 'Pessoal', lembrete: 0, notas: '', prioridade: '', repetir: 'diario', diaFixo: 0, feito: false, petId: p.id, refPet: r.id });
  salvar(); desenhar();
  avisar(`Aviso criado: todo dia às ${r.hora}.`);
};
ACOES['pet-cuidado'] = (el) => { const i = $('#pet-lem-titulo'); i.value = el.dataset.v; i.focus(); };
FORMS['pet-lembrete'] = (d) => {
  const p = petAtual();
  estado.tarefas.push({ id: novoId(), titulo: `${p.nome}: ${d.titulo}`, data: d.data || hojeISO(), hora: d.hora || '', duracao: 30, tipo: 'compromisso', area: 'Pessoal',
    lembrete: d.hora ? 60 : 1440, notas: '', prioridade: '', repetir: d.repetir || '', diaFixo: d.data ? Number(d.data.slice(8)) : 0, feito: false, petId: p.id });
  salvar(); desenhar();
  avisar('Lembrete criado. Ele aparece na Agenda também.');
};
FORMS['pet-peso'] = (d) => {
  const kg = numero(d.kg);
  if (!kg || kg <= 0) { avisar('Coloque o peso em kg.'); return; }
  const p = petAtual();
  p.pesos = [...(p.pesos || []).filter((x) => x.data !== d.data), { data: d.data || hojeISO(), kg }];
  salvar(); desenhar();
  avisar('Peso salvo.');
};
