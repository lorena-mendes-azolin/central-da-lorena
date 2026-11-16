const PAGINAS = {};
const ACOES = {};
const MUDAR = {};
const DIGITAR = {};
const FORMS = {};

function ic(nome, classe = '') {
  return `<svg class="ic ${classe}"><use href="#i-${nome}"/></svg>`;
}

const $ = (seletor, el = document) => el.querySelector(seletor);
const $$ = (seletor, el = document) => [...el.querySelectorAll(seletor)];

function hojeISO(data = new Date()) {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

function paraData(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

function somarDias(iso, n) {
  const d = paraData(iso);
  d.setDate(d.getDate() + n);
  return hojeISO(d);
}

function diasAte(iso) {
  return Math.round((paraData(iso) - paraData(hojeISO())) / 86400000);
}

function dataCurta(iso) {
  return paraData(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function quandoFalta(iso) {
  const n = diasAte(iso);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let timerToast;
function avisar(mensagem, desfazer) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(mensagem)}</span>` + (desfazer ? '<button type="button">desfazer</button>' : '');
  if (desfazer) {
    t.querySelector('button').onclick = () => { desfazer(); t.classList.remove('show'); };
  }
  t.classList.add('show');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.classList.remove('show'), 4500);
}

function caminhoDe(alvo, obj = estado, trilha = []) {
  if (obj === alvo) return trilha;
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const x = obj[i];
      if (x && typeof x === 'object') {
        const r = caminhoDe(alvo, x, [...trilha, x.id !== undefined ? { id: x.id } : { i }]);
        if (r) return r;
      }
    }
    return null;
  }
  for (const k of Object.keys(obj)) {
    if (k === 'lixeira') continue;
    const v = obj[k];
    if (v && typeof v === 'object') {
      const r = caminhoDe(alvo, v, [...trilha, { k }]);
      if (r) return r;
    }
  }
  return null;
}

function seguirCaminho(trilha) {
  let o = estado;
  for (const p of trilha || []) {
    if (!o) return null;
    if ('k' in p) o = o[p.k];
    else if ('id' in p) o = Array.isArray(o) ? o.find((x) => x && x.id === p.id) : null;
    else o = o[p.i];
  }
  return o || null;
}

const nomeDoItem = (x) => x.titulo || x.nome || x.desc || x.frente || 'Sem nome';

function removerComDesfazer(lista, id, nome = 'Item') {
  const i = lista.findIndex((x) => x.id === id);
  if (i < 0) return;
  const caminho = caminhoDe(lista);
  const [removido] = lista.splice(i, 1);
  const registro = { id: removido.id, tipo: nome, nome: nomeDoItem(removido), quando: new Date().toISOString(), pos: i, caminho, item: removido };
  estado.lixeira = estado.lixeira || [];
  if (caminho) estado.lixeira.unshift(registro);
  salvar(); desenhar();
  avisar(`${nome} foi para a lixeira`, () => {
    estado.lixeira = estado.lixeira.filter((x) => x !== registro);
    lista.splice(i, 0, removido);
    salvar(); desenhar();
  });
}
