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
  menu.innerHTML = html;

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
  if (!menuAberto) return;
  menuAberto.menu.remove();
  menuAberto.btn.classList.remove('aberto');
  menuAberto = null;
}

document.addEventListener('click', (e) => { if (menuAberto && !e.target.closest('.sel-menu')) fecharMenuSelect(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuSelect(); });
window.addEventListener('resize', fecharMenuSelect);
document.addEventListener('scroll', (e) => { if (menuAberto && !e.target.closest?.('.sel-menu')) fecharMenuSelect(); }, true);

document.addEventListener('change', (e) => { if (e.target.matches?.('select[data-pronto]')) rotuloSelect(e.target); }, true);
