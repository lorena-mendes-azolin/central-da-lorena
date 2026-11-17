const bvTela = { passo: 1, cidades: null, buscando: false };

function precisaBoasVindas() { return !estado.config.boasVindas; }

async function buscarCidades(nome) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=6&language=pt&format=json`;
  const j = await (await fetch(url)).json();
  return (j.results || []).map((r) => ({ nome: r.name, lat: Math.round(r.latitude * 100) / 100, lon: Math.round(r.longitude * 100) / 100, onde: [r.admin1, r.country].filter(Boolean).join(', ') }));
}

function htmlBuscaCidade(form) {
  const c = estado.config.cidade;
  return `<form class="form-linha" data-form="${form}">
      <input type="text" name="cidade" maxlength="60" placeholder="Digite sua cidade" aria-label="Cidade" style="flex:1 1 200px" data-precisa>
      <button class="btn sec">${bvTela.buscando ? 'Buscando…' : 'Buscar'}</button>
    </form>
    ${bvTela.cidades ? `<div class="lista-cidades">${bvTela.cidades.map((x, k) => `<button class="chip" data-acao="cidade-escolher" data-k="${k}">${esc(x.nome)} <b>${esc(x.onde)}</b></button>`).join('') || '<p class="vazio">Não achei essa cidade.</p>'}</div>` : ''}
    ${c ? `<p class="dica" style="margin:8px 0 0">Cidade escolhida: <b>${esc(c.nome)}</b> <a href="#" data-acao="cidade-tirar">tirar</a></p>` : ''}`;
}

async function procurarCidade(d) {
  bvTela.buscando = true; desenhar();
  try { bvTela.cidades = await buscarCidades(d.cidade); } catch { bvTela.cidades = []; avisar('Não consegui buscar agora. Confira a internet.'); }
  bvTela.buscando = false; desenhar();
}
FORMS['bv-cidade'] = procurarCidade;
FORMS['cfg-cidade'] = procurarCidade;
ACOES['cidade-escolher'] = (el) => {
  const x = bvTela.cidades[Number(el.dataset.k)];
  estado.config.cidade = { nome: x.nome, lat: x.lat, lon: x.lon };
  bvTela.cidades = null;
  salvar(); desenhar(); buscarClima();
};
ACOES['cidade-tirar'] = () => { estado.config.cidade = null; salvar(); desenhar(); buscarClima(); };

PAGINAS.boasvindas = {
  titulo: 'Boas-vindas',
  desenhar() {
    const c = estado.config;
    const passos = ['Você', 'Aparência', 'O que vai usar'];
    const temLista = (id) => estado.listas.some((l) => l.id === id);
    const corpo = {
      1: `<h2>Que bom ter você aqui!</h2>
        <p class="dica">Vamos deixar tudo com a sua cara. Dá para mudar qualquer coisa depois em Configurações.</p>
        <label class="campo">Como quer ser chamado(a)?<input type="text" id="bv-nome" value="${esc(c.nome)}" maxlength="30" data-digitar="bv-nome" placeholder="Seu nome ou apelido"></label>
        <p class="rotulo-bv">Como prefere que o site fale com você?</p>
        <div class="segmento">${[['a', 'Feminino'], ['o', 'Masculino'], ['n', 'Neutro']].map(([v, n]) => `<button class="${c.genero === v ? 'ativo' : ''}" data-acao="bv-genero" data-v="${v}">${n}</button>`).join('')}</div>
        <p class="dica">Exemplo: "${g('pronta para focar', 'pronto para focar', 'hora de focar')}".</p>
        <p class="rotulo-bv">Sua cidade, para mostrar o clima <span class="dica">(opcional)</span></p>
        ${htmlBuscaCidade('bv-cidade')}`,
      2: `<h2>Escolha a cor do seu espaço</h2>
        <div class="temas">${Object.entries(TEMAS).map(([id, t]) => `<button class="tema ${(c.tema || 'violeta') === id ? 'on' : ''}" data-acao="tema" data-t="${id}" title="${t.nome}">
          <i style="background:linear-gradient(135deg, ${t.cor1}, ${t.cor2})"></i><span>${t.nome}</span></button>`).join('')}</div>
        <label class="campo" style="margin-top:16px">Nome do seu espaço<input type="text" value="${esc(c.nomeEspaco || '')}" maxlength="40" data-digitar="bv-espaco" placeholder="Minha Central"></label>
        <p class="dica">Aparece na aba do navegador.</p>`,
      3: `<h2>O que você quer usar?</h2>
        <p class="dica">Agenda, Rotina diária, Bem-estar e Gráficos já vêm sempre. Marque o resto. Dá para adicionar ou tirar depois em "Adicionar módulos".</p>
        <div class="opcoes-bv">
          ${[['faculdade', 'cap', 'Faculdade', 'Matérias, provas, notas e caderno de aulas'], ['estudos', 'book', 'Cursos', 'Cursos livres, com aulas e anotações']].map(([id, i, n, t]) => `<button class="opcao-bv ${temLista(id) ? 'ativo' : ''}" data-acao="bv-lista" data-id="${id}">
            <span class="selo mini c-rosa">${ic(i)}</span><b>${n}</b><small>${t}</small><span class="marca">${temLista(id) ? ic('check') : ''}</span></button>`).join('')}
          ${MODULOS.map((m) => `<button class="opcao-bv ${temModulo(m.id) ? 'ativo' : ''}" data-acao="bv-modulo" data-id="${m.id}">
            <span class="selo mini ${m.cor}">${ic(m.icone)}</span><b>${m.nome}</b><small>${m.texto.split('.')[0]}.</small><span class="marca">${temModulo(m.id) ? ic('check') : ''}</span></button>`).join('')}
        </div>`,
    }[bvTela.passo];
    return `<div class="boas-vindas">
      <div class="bv-topo"><span class="bv-logo">${ic('sparkle')}</span><b>${esc(c.nomeEspaco || 'Minha Central')}</b></div>
      <div class="passos-wizard">${passos.map((p, k) => `<span class="${bvTela.passo === k + 1 ? 'ativo' : bvTela.passo > k + 1 ? 'ok' : ''}"><i>${bvTela.passo > k + 1 ? ic('check') : k + 1}</i>${p}</span>`).join('')}</div>
      <section class="card bv-card">${corpo}
        <div class="form-linha" style="margin-top:20px">
          ${bvTela.passo > 1 ? '<button class="btn sec" data-acao="bv-passo" data-v="-1">Voltar</button>' : ''}
          <span class="espaco"></span>
          ${bvTela.passo < 3 ? `<button class="btn" data-acao="bv-passo" data-v="1">Continuar ${ic('right', 'p')}</button>` : `<button class="btn" data-acao="bv-fim">${ic('check', 'p')} Começar a usar</button>`}
        </div>
      </section>
    </div>`;
  },
};

DIGITAR['bv-nome'] = (el) => { estado.config.nome = el.value.trim(); atualizarPerfil(); salvar(); };
DIGITAR['bv-espaco'] = (el) => { estado.config.nomeEspaco = el.value.trim() || 'Minha Central'; salvar(); };
ACOES['bv-genero'] = (el) => { estado.config.genero = el.dataset.v; salvar(); desenhar(); };
ACOES['bv-passo'] = (el) => {
  if (bvTela.passo === 1 && !estado.config.nome) { avisar('Conta pra gente como quer ser chamado(a).'); $('#bv-nome')?.focus(); return; }
  bvTela.passo += Number(el.dataset.v); desenhar(); window.scrollTo(0, 0);
};
ACOES['bv-modulo'] = (el) => { estado.config.modulos = { ...estado.config.modulos, [el.dataset.id]: !temModulo(el.dataset.id) }; salvar(); desenhar(); };
ACOES['bv-lista'] = (el) => {
  const id = el.dataset.id;
  if (estado.listas.some((l) => l.id === id)) estado.listas = estado.listas.filter((l) => l.id !== id);
  else estado.listas.unshift(id === 'faculdade'
    ? { id: 'faculdade', tipo: 'cursos', nome: 'Faculdade', icone: 'cap', cor: '#f59ad8', desc: '', rotulo: 'Matéria', materias: [] }
    : { id: 'estudos', tipo: 'cursos', nome: 'Estudos', icone: 'book', cor: '#6aaeff', desc: '', rotulo: 'Curso', materias: [] });
  salvar(); desenhar();
};
ACOES['bv-fim'] = () => {
  estado.config.boasVindas = true;
  document.body.classList.remove('sem-menu');
  salvar(); atualizarPerfil();
  location.hash = 'dashboard';
  desenhar();
  avisar(`Tudo pronto, ${estado.config.nome}!`);
};

function atualizarPerfil() {
  const n = estado.config.nome || '?';
  $('#perfil-nome').textContent = estado.config.nome || 'Você';
  $('#perfil-foto').textContent = n[0].toUpperCase();
}
