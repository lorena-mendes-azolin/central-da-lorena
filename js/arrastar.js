const arraste = { ativo: null, timer: null, ignorarClique: false };

function listaDoGrupo(grupo) {
  const [ref, campo] = grupo.split('|');
  let obj = ref ? acharRef(ref) : estado;
  for (const parte of campo.split('.')) obj = obj?.[parte];
  return Array.isArray(obj) ? obj : null;
}

const idDe = (x) => (x && typeof x === 'object' ? x.id : x);

function moverNoGrupo(grupo, idOrigem, idAlvo, depois) {
  const lista = listaDoGrupo(grupo);
  if (!lista) return;
  const de = lista.findIndex((x) => String(idDe(x)) === idOrigem);
  if (de < 0) return;
  const [item] = lista.splice(de, 1);
  let para = lista.findIndex((x) => String(idDe(x)) === idAlvo);
  if (para < 0) { lista.splice(de, 0, item); return; }
  if (depois) para++;
  lista.splice(para, 0, item);
  salvar(); desenhar();
}

function rolavelDe(el) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const st = getComputedStyle(p);
    if (/(auto|scroll)/.test(st.overflowY + st.overflowX) && (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth)) return p;
  }
  return null;
}

function comecarArraste(a) {
  a.comecou = true;
  const r = a.unidade.getBoundingClientRect();
  a.dx = a.x0 - r.left;
  a.dy = a.y0 - r.top;
  const fantasma = a.unidade.cloneNode(true);
  fantasma.classList.add('fantasma-arraste');
  fantasma.style.width = r.width + 'px';
  fantasma.style.height = r.height + 'px';
  document.body.appendChild(fantasma);
  a.fantasma = fantasma;
  a.rolavel = rolavelDe(a.unidade);
  a.unidade.classList.add('arrastando');
  document.body.classList.add('arrastando-algo');
  if (navigator.vibrate && a.toque) navigator.vibrate(15);
}

function moverFantasma(a, x, y) {
  a.fantasma.style.transform = `translate(${x - a.dx}px, ${y - a.dy}px)`;
  $$('.alvo-antes, .alvo-depois').forEach((el) => el.classList.remove('alvo-antes', 'alvo-depois'));
  const alvo = document.elementFromPoint(x, y)?.closest(`[data-ordem="${CSS.escape(a.grupo)}"]`);
  a.alvo = null;
  if (alvo && alvo !== a.unidade) {
    const r = alvo.getBoundingClientRect();
    const horizontal = alvo.hasAttribute('data-ordem-x');
    a.depois = horizontal ? x > r.left + r.width / 2 : y > r.top + r.height / 2;
    alvo.classList.add(a.depois ? 'alvo-depois' : 'alvo-antes');
    a.alvo = alvo;
  }
  const margem = 50;
  if (y < margem) window.scrollBy(0, -14);
  else if (y > innerHeight - margem) window.scrollBy(0, 14);
  if (a.rolavel) {
    const r = a.rolavel.getBoundingClientRect();
    if (y < r.top + margem) a.rolavel.scrollTop -= 12;
    else if (y > r.bottom - margem) a.rolavel.scrollTop += 12;
    if (x < r.left + margem) a.rolavel.scrollLeft -= 12;
    else if (x > r.right - margem) a.rolavel.scrollLeft += 12;
  }
}

function terminarArraste(confirmar) {
  const a = arraste.ativo;
  clearTimeout(arraste.timer);
  arraste.ativo = null;
  if (!a || !a.comecou) return;
  a.fantasma.remove();
  a.unidade.classList.remove('arrastando');
  document.body.classList.remove('arrastando-algo');
  $$('.alvo-antes, .alvo-depois').forEach((el) => el.classList.remove('alvo-antes', 'alvo-depois'));
  arraste.ignorarClique = true;
  setTimeout(() => { arraste.ignorarClique = false; }, 50);
  if (confirmar && a.alvo) moverNoGrupo(a.grupo, a.id, a.alvo.dataset.ordemId, a.depois);
}

document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || arraste.ativo) return;
  const pegador = e.target.closest('[data-pegar]');
  if (!pegador) return;
  const unidade = pegador.closest('[data-ordem]');
  if (!unidade) return;
  const toque = e.pointerType !== 'mouse';
  const soAlca = !pegador.hasAttribute('data-ordem');
  if (soAlca) e.preventDefault();
  arraste.ativo = { unidade, grupo: unidade.dataset.ordem, id: unidade.dataset.ordemId, x0: e.clientX, y0: e.clientY, toque, soAlca, comecou: false };
  if (toque && !soAlca) {
    arraste.timer = setTimeout(() => { if (arraste.ativo && !arraste.ativo.comecou) comecarArraste(arraste.ativo); }, 380);
  }
});

document.addEventListener('pointermove', (e) => {
  const a = arraste.ativo;
  if (!a) return;
  const dist = Math.hypot(e.clientX - a.x0, e.clientY - a.y0);
  if (!a.comecou) {
    if (a.toque && !a.soAlca) { if (dist > 8) { clearTimeout(arraste.timer); arraste.ativo = null; } return; }
    if (dist < 6) return;
    comecarArraste(a);
  }
  moverFantasma(a, e.clientX, e.clientY);
});

document.addEventListener('touchmove', (e) => { if (arraste.ativo?.comecou) e.preventDefault(); }, { passive: false });
document.addEventListener('pointerup', () => terminarArraste(true));
document.addEventListener('pointercancel', () => terminarArraste(false));
document.addEventListener('click', (e) => {
  if (arraste.ignorarClique) { e.preventDefault(); e.stopPropagation(); }
}, true);
document.addEventListener('dragstart', (e) => { if (e.target.closest?.('[data-pegar]')) e.preventDefault(); });

function alca(titulo = 'Arraste para mudar a ordem') {
  return `<span class="alca" data-pegar title="${titulo}" aria-hidden="true">${ic('grip', 'p')}</span>`;
}
function ordem(grupo, id, horizontal = false) {
  return `data-ordem="${esc(grupo)}" data-ordem-id="${esc(id)}"${horizontal ? ' data-ordem-x' : ''}`;
}
