let menuAberto = null;

function melhorarSelects(raiz = document) {
  raiz.querySelectorAll('select:not([data-pronto])').forEach((sel) => {
    sel.dataset.pronto = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sel-btn ' + sel.className;
    if (sel.getAttribute('style')) btn.setAttribute('style', sel.getAttribute('style'));
    btn.setAttribute('aria-label', sel.getAttribute('aria-label') || 'Escolher');
    btn.innerHTML = `<span></span>${ic('down', 'p')}`;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); abrirMenuSelect(sel, btn); });
    sel.after(btn);
    sel.classList.add('sel-oculto');
    sel._botao = btn;
    rotuloSelect(sel);
  });
}

function rotuloSelect(sel) {
  const op = sel.options[sel.selectedIndex];
  if (sel._botao) sel._botao.querySelector('span').textContent = op ? op.textContent : '';
}

function abrirMenuSelect(sel, btn) {
  const jaEra = menuAberto?.sel === sel;
  fecharMenuSelect();
  if (jaEra) return;
  const menu = document.createElement('div');
  menu.className = 'sel-menu';
  let html = '';
  [...sel.children].forEach((filho) => {
    if (filho.tagName === 'OPTGROUP') {
      html += `<div class="sel-grupo">${esc(filho.label)}</div>`;
      [...filho.children].forEach((op) => { html += itemMenu(op, sel); });
    } else html += itemMenu(filho, sel);
  });
  const total = sel.querySelectorAll('option').length;
  const comBusca = total > 7;
  menu.innerHTML = comBusca ? `<div class="sel-busca">${ic('search', 'p')}<input type="search" placeholder="Pesquisar…" aria-label="Pesquisar"></div><div class="sel-itens">${html}</div><p class="sel-nada" hidden>Nada encontrado.</p>` : html;
  if (comBusca) menu.classList.add('com-busca');

  (btn.closest('dialog') || document.body).appendChild(menu);
  const r = btn.getBoundingClientRect();
  menu.style.minWidth = r.width + 'px';
  const alturaMenu = Math.min(menu.scrollHeight, 300);
  const abreParaCima = r.bottom + alturaMenu + 8 > innerHeight && r.top > alturaMenu;
  menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + 'px';
  menu.style.top = (abreParaCima ? r.top - alturaMenu - 4 : r.bottom + 4) + 'px';
  menu.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  btn.classList.add('aberto');
  menuAberto = { sel, btn, menu };
  const busca = menu.querySelector('.sel-busca input');
  if (busca) {
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => busca.focus(), 20);
    const sem = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    busca.addEventListener('click', (e) => e.stopPropagation());
    busca.addEventListener('input', () => {
      const q = sem(busca.value.trim());
      let algum = false;
      menu.querySelectorAll('.sel-item').forEach((b) => { const ok = !q || sem(b.textContent).includes(q); b.hidden = !ok; if (ok) algum = true; });
      menu.querySelectorAll('.sel-grupo').forEach((g) => {
        let prox = g.nextElementSibling, vis = false;
        while (prox && !prox.classList.contains('sel-grupo')) { if (!prox.hidden) vis = true; prox = prox.nextElementSibling; }
        g.hidden = !vis;
      });
      menu.querySelector('.sel-nada').hidden = algum;
    });
    busca.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); menu.querySelector('.sel-item:not([hidden])')?.click(); }
    });
  }

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-valor]');
    if (!item) return;
    e.stopPropagation();
    sel.value = item.dataset.valor;
    rotuloSelect(sel);
    fecharMenuSelect();
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function itemMenu(op, sel) {
  const on = op.value === sel.value;
  return `<button type="button" class="sel-item ${on ? 'on' : ''} ${op.dataset.especial ? 'especial' : ''}" data-valor="${esc(op.value)}">
    <span>${esc(op.textContent)}</span>${on ? ic('check', 'p') : ''}</button>`;
}

function fecharMenuSelect() {
  if (typeof fecharCalendario === 'function') fecharCalendario();
  if (!menuAberto) return;
  menuAberto.menu.remove();
  menuAberto.btn.classList.remove('aberto');
  menuAberto = null;
}

document.addEventListener('click', (e) => { if (menuAberto && !e.target.closest('.sel-menu')) fecharMenuSelect(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuSelect(); });
window.addEventListener('resize', fecharMenuSelect);
document.addEventListener('scroll', (e) => {
  if (!(menuAberto || calAberto) || e.target.closest?.('.sel-menu, .cal-menu, .hora-menu')) return;
  const aberto = menuAberto || calAberto;
  const r = aberto.btn.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return fecharMenuSelect();
  if (calAberto) return posicionarCalendario();
  const m = menuAberto.menu;
  const alto = m.offsetHeight;
  const cima = r.bottom + alto + 8 > innerHeight && r.top > alto;
  m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 8) + 'px';
  m.style.top = (cima ? r.top - alto - 4 : r.bottom + 4) + 'px';
}, true);

document.addEventListener('change', (e) => { if (e.target.matches?.('select[data-pronto]')) rotuloSelect(e.target); }, true);

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesAno = (v) => `${MESES_CURTOS[Number(v.slice(5, 7)) - 1]}/${v.slice(0, 4)}`;
let calAberto = null;

function melhorarDatas(raiz = document) {
  raiz.querySelectorAll('input[type=time]:not([data-pronto])').forEach((inp) => {
    inp.dataset.pronto = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'data-btn';
    if (inp.getAttribute('style')) btn.setAttribute('style', inp.getAttribute('style'));
    btn.setAttribute('aria-label', inp.getAttribute('aria-label') || inp.title || 'Escolher hora');
    btn.innerHTML = `${ic('clock', 'p')}<span></span>`;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); abrirHora(inp, btn); });
    inp.after(btn);
    inp.classList.add('sel-oculto');
    inp._botao = btn;
    rotuloData(inp);
  });
  raiz.querySelectorAll('input[type=date]:not([data-pronto]), input[type=month]:not([data-pronto])').forEach((inp) => {
    inp.dataset.pronto = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'data-btn';
    if (inp.getAttribute('style')) btn.setAttribute('style', inp.getAttribute('style'));
    btn.setAttribute('aria-label', inp.getAttribute('aria-label') || 'Escolher data');
    btn.innerHTML = `${ic('calendar', 'p')}<span></span>`;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); abrirCalendario(inp, btn); });
    inp.after(btn);
    inp.classList.add('sel-oculto');
    inp._botao = btn;
    rotuloData(inp);
  });
}

function rotuloData(inp) {
  if (!inp._botao) return;
  const v = inp.value;
  if (inp.type === 'time') {
    inp._botao.querySelector('span').textContent = v || 'Escolher hora';
    inp._botao.classList.toggle('vazio', !v);
    return;
  }
  const mes = inp.type === 'month' || inp.dataset.soMes === '1';
  inp._botao.querySelector('span').textContent = !v ? (inp.type === 'month' ? 'Escolher mês' : 'Escolher data')
    : mes ? mesAno(v) : `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
  inp._botao.classList.toggle('vazio', !v);
}

function abrirCalendario(inp, btn) {
  const jaEra = calAberto?.inp === inp;
  fecharMenuSelect();
  if (jaEra) return;
  const base = inp.value ? inp.value.slice(0, 7) : hojeISO().slice(0, 7);
  const modoMes = inp.type === 'month' || inp.dataset.soMes === '1';
  const menu = document.createElement('div');
  menu.className = 'cal-menu';
  (btn.closest('dialog') || document.body).appendChild(menu);
  btn.classList.add('aberto');
  calAberto = { inp, btn, menu, ano: Number(base.slice(0, 4)), mes: Number(base.slice(5, 7)) - 1, modo: modoMes ? 'mes' : 'dia' };
  desenharCalendario();
  menu.addEventListener('click', cliqueCalendario);
}

function posicionarCalendario() {
  const { btn, menu } = calAberto;
  const r = btn.getBoundingClientRect();
  const alt = menu.offsetHeight;
  const paraCima = r.bottom + alt + 8 > innerHeight && r.top > alt;
  menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = (paraCima ? r.top - alt - 4 : r.bottom + 4) + 'px';
}

function desenharCalendario() {
  const c = calAberto;
  const v = c.inp.value;
  const hoje = hojeISO();
  const podeMes = c.inp.type === 'month' || c.inp.dataset.mesOk === '1';
  let corpo;
  if (c.modo === 'mes') {
    corpo = `<div class="cal-topo">
        <button type="button" class="acao-item" data-cal="ano" data-n="-1" aria-label="Ano anterior">${ic('left', 'p')}</button>
        <b>${c.ano}</b>
        <button type="button" class="acao-item" data-cal="ano" data-n="1" aria-label="Próximo ano">${ic('right', 'p')}</button>
      </div>
      <div class="cal-meses">${MESES_CURTOS.map((m, i) => {
        const ym = `${c.ano}-${String(i + 1).padStart(2, '0')}`;
        return `<button type="button" class="${v.startsWith(ym) ? 'on' : ''} ${hoje.startsWith(ym) ? 'hoje' : ''}" data-cal="mes" data-m="${i}">${m}</button>`;
      }).join('')}</div>`;
  } else {
    const primeiro = new Date(c.ano, c.mes, 1);
    const vazios = (primeiro.getDay() + 6) % 7;
    const nDias = new Date(c.ano, c.mes + 1, 0).getDate();
    let dias = '';
    for (let i = 0; i < vazios; i++) dias += '<span></span>';
    for (let d = 1; d <= nDias; d++) {
      const iso = `${c.ano}-${String(c.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dias += `<button type="button" class="${iso === v ? 'on' : ''} ${iso === hoje ? 'hoje' : ''}" data-cal="dia" data-d="${iso}">${d}</button>`;
    }
    corpo = `<div class="cal-topo">
        <button type="button" class="acao-item" data-cal="mover" data-n="-1" aria-label="Mês anterior">${ic('left', 'p')}</button>
        <button type="button" class="cal-titulo" data-cal="ver-meses">${MESES_LONGOS[c.mes]} de ${c.ano} ${ic('down', 'p')}</button>
        <button type="button" class="acao-item" data-cal="mover" data-n="1" aria-label="Próximo mês">${ic('right', 'p')}</button>
      </div>
      <div class="cal-sem">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal-dias">${dias}</div>`;
  }
  const soMesAtivo = c.modo === 'mes' && c.inp.type !== 'month' && c.inp.dataset.mesOk === '1';
  c.menu.innerHTML = `${c.inp.dataset.mesOk === '1' ? `<div class="segmento cal-modo">
      <button type="button" class="${c.modo === 'dia' ? 'ativo' : ''}" data-cal="modo" data-m="dia">Dia certo</button>
      <button type="button" class="${soMesAtivo ? 'ativo' : ''}" data-cal="modo" data-m="mes">Só mês e ano</button>
    </div>` : ''}
    ${corpo}
    <div class="cal-rodape">
      <button type="button" data-cal="limpar">Limpar</button>
      <button type="button" data-cal="${c.modo === 'mes' && podeMes ? 'este-mes' : 'hoje'}">${c.modo === 'mes' && podeMes ? 'Este mês' : 'Hoje'}</button>
    </div>`;
  c.menuModoMes = soMesAtivo || c.inp.type === 'month';
  posicionarCalendario();
}

function escolherData(valor, soMes) {
  const { inp } = calAberto;
  inp.value = valor;
  if (inp.dataset.mesOk === '1') {
    inp.dataset.soMes = soMes ? '1' : '0';
    if (inp.dataset.ref && inp.dataset.campoMes) {
      const obj = acharRef(inp.dataset.ref);
      if (obj) obj[inp.dataset.campoMes] = !!soMes && !!valor;
    }
  }
  rotuloData(inp);
  fecharMenuSelect();
  inp.dispatchEvent(new Event('change', { bubbles: true }));
}

function cliqueCalendario(e) {
  e.stopPropagation();
  const b = e.target.closest('[data-cal]');
  if (!b) return;
  const c = calAberto;
  const acao = b.dataset.cal;
  const ultimoDia = (a, m) => `${a}-${String(m + 1).padStart(2, '0')}-${String(new Date(a, m + 1, 0).getDate()).padStart(2, '0')}`;
  if (acao === 'mover') { const d = new Date(c.ano, c.mes + Number(b.dataset.n), 1); c.ano = d.getFullYear(); c.mes = d.getMonth(); }
  if (acao === 'ano') c.ano += Number(b.dataset.n);
  if (acao === 'ver-meses') c.modo = 'mes';
  if (acao === 'modo') c.modo = b.dataset.m;
  if (acao === 'dia') return escolherData(b.dataset.d, false);
  if (acao === 'mes') {
    const m = Number(b.dataset.m);
    if (c.inp.type === 'month') return escolherData(`${c.ano}-${String(m + 1).padStart(2, '0')}`, true);
    if (c.menuModoMes) return escolherData(ultimoDia(c.ano, m), true);
    c.mes = m; c.modo = 'dia';
  }
  if (acao === 'limpar') return escolherData('', false);
  if (acao === 'hoje') return escolherData(hojeISO(), false);
  if (acao === 'este-mes') {
    const h = new Date();
    return c.inp.type === 'month' ? escolherData(hojeISO().slice(0, 7), true) : escolherData(ultimoDia(h.getFullYear(), h.getMonth()), true);
  }
  desenharCalendario();
}

function fecharCalendario() {
  if (!calAberto) return;
  const { menu, btn, inp, mudou } = calAberto;
  menu.remove();
  btn.classList.remove('aberto');
  calAberto = null;
  if (mudou) inp.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('click', (e) => { if (calAberto && !e.target.closest('.cal-menu, .hora-menu')) fecharCalendario(); });
document.addEventListener('change', (e) => { if (e.target.matches?.('input[data-pronto]')) rotuloData(e.target); }, true);

function abrirHora(inp, btn) {
  const jaEra = calAberto?.inp === inp;
  fecharMenuSelect();
  if (jaEra) return;
  const [h, m] = (inp.value || '').split(':');
  const menu = document.createElement('div');
  menu.className = 'hora-menu';
  const minutos = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  if (m && !minutos.includes(m)) minutos.push(m), minutos.sort();
  const pc = matchMedia('(pointer: fine)').matches;
  menu.innerHTML = `${pc ? `<input type="text" class="hora-digitar" inputmode="numeric" maxlength="5" placeholder="hh:mm" value="${h && m ? `${h}:${m}` : ''}" aria-label="Digite a hora">` : ''}<div class="hora-colunas">
      <div class="hora-col"><span>Hora</span>${Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((x) => `<button type="button" class="${x === h ? 'on' : ''}" data-h="${x}">${x}</button>`).join('')}</div>
      <div class="hora-col"><span>Min</span>${minutos.map((x) => `<button type="button" class="${x === m ? 'on' : ''}" data-m="${x}">${x}</button>`).join('')}</div>
    </div>
    ${pc ? '<p class="dica-hora">Digite, ou role o mouse sobre a hora e os minutos</p>' : ''}
    <div class="cal-rodape"><button type="button" data-limpar>Limpar</button><button type="button" data-agora>Agora</button></div>`;
  (btn.closest('dialog') || document.body).appendChild(menu);
  btn.classList.add('aberto');
  calAberto = { inp, btn, menu, hora: h || '', min: m || '' };
  posicionarCalendario();
  menu.querySelectorAll('.on').forEach((b) => b.scrollIntoView({ block: 'center' }));
  const campo = menu.querySelector('.hora-digitar');
  const marcar = (deFora = false) => {
    const c = calAberto;
    menu.querySelectorAll('[data-h]').forEach((x) => x.classList.toggle('on', x.dataset.h === c.hora));
    let bm = menu.querySelector(`[data-m="${c.min}"]`);
    if (!bm && c.min) {
      bm = document.createElement('button'); bm.type = 'button'; bm.dataset.m = c.min; bm.textContent = c.min;
      const col = menu.querySelectorAll('.hora-col')[1];
      const depois = [...col.querySelectorAll('[data-m]')].find((x) => x.dataset.m > c.min);
      col.insertBefore(bm, depois || null);
    }
    menu.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === bm));
    menu.querySelectorAll('.on').forEach((b) => b.scrollIntoView({ block: 'nearest' }));
    if (c.hora && c.min) { inp.value = `${c.hora}:${c.min}`; rotuloData(inp); c.mudou = true; }
    if (campo && (deFora || document.activeElement !== campo)) campo.value = c.hora && c.min ? `${c.hora}:${c.min}` : '';
  };
  if (campo) {
    setTimeout(() => campo.focus(), 30);
    campo.addEventListener('input', () => {
      let v = campo.value.replace(/\D/g, '').slice(0, 4);
      if (v.length >= 3) v = `${v.slice(0, 2)}:${v.slice(2)}`;
      campo.value = v;
      const mt = v.match(/^(\d{2}):(\d{2})$/);
      if (mt && Number(mt[1]) < 24 && Number(mt[2]) < 60) { calAberto.hora = mt[1]; calAberto.min = mt[2]; marcar(); }
    });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const c = calAberto;
        if (c.hora && c.min) { c.mudou = false; inp.value = `${c.hora}:${c.min}`; rotuloData(inp); fecharMenuSelect(); inp.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      if (e.key === 'Escape') fecharMenuSelect();
    });
  }
  menu.querySelectorAll('.hora-col').forEach((col, k) => col.addEventListener('wheel', (e) => {
    if (!pc) return;
    e.preventDefault();
    const c = calAberto;
    const passo = e.deltaY > 0 ? 1 : -1;
    if (k === 0) { c.hora = String(((Number(c.hora || 0) + passo) % 24 + 24) % 24).padStart(2, '0'); if (!c.min) c.min = '00'; }
    else { const atual = Number(c.min || 0); const prox = passo > 0 ? Math.floor(atual / 5) * 5 + 5 : Math.ceil(atual / 5) * 5 - 5; c.min = String(((prox % 60) + 60) % 60).padStart(2, '0'); if (!c.hora) c.hora = String(new Date().getHours()).padStart(2, '0'); }
    marcar(true);
  }, { passive: false }));
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('button');
    if (!b) return;
    const c = calAberto;
    const definir = (valor) => {
      c.mudou = false;
      inp.value = valor;
      rotuloData(inp);
      fecharMenuSelect();
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    };
    if ('limpar' in b.dataset) return definir('');
    if ('agora' in b.dataset) { const a = new Date(); return definir(`${String(a.getHours()).padStart(2, '0')}:${String(a.getMinutes()).padStart(2, '0')}`); }
    if (b.dataset.h) { c.hora = b.dataset.h; menu.querySelectorAll('[data-h]').forEach((x) => x.classList.toggle('on', x === b)); if (!c.min) { c.min = '00'; } }
    if (b.dataset.m) { c.min = b.dataset.m; menu.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b)); if (!c.hora) return; }
    if (c.hora && b.dataset.m) return definir(`${c.hora}:${c.min}`);
    if (c.hora && b.dataset.h) {
      inp.value = `${c.hora}:${c.min}`;
      rotuloData(inp);
      c.mudou = true;
    }
  });
}
