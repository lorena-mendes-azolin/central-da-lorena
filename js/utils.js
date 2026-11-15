// =========================================================
// utils.js — funções pequenas usadas no site inteiro
// =========================================================

// "Registros" que cada página preenche (o app.js usa eles):
//   PAGINAS  -> função que desenha cada página
//   ACOES    -> o que fazer quando clica num elemento com data-acao="..."
//   MUDAR    -> quando muda um select/checkbox/data com data-mudar="..."
//   DIGITAR  -> enquanto digita num campo com data-digitar="..."
//   FORMS    -> quando envia um formulário com data-form="..."
const PAGINAS = {};
const ACOES = {};
const MUDAR = {};
const DIGITAR = {};
const FORMS = {};

// Desenha um ícone do "sprite" do index.html: ic('calendar'), ic('check', 'p')
function ic(nome, classe = '') {
  return `<svg class="ic ${classe}"><use href="#i-${nome}"/></svg>`;
}

// Atalhos para pegar elementos da página
const $ = (seletor, el = document) => el.querySelector(seletor);
const $$ = (seletor, el = document) => [...el.querySelectorAll(seletor)];

// Datas no formato "AAAA-MM-DD" (fácil de comparar e guardar)
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

// Quantos dias faltam até a data (negativo = já passou)
function diasAte(iso) {
  return Math.round((paraData(iso) - paraData(hojeISO())) / 86400000);
}

// "seg, 16/11"
function dataCurta(iso) {
  return paraData(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

// "Hoje", "Amanhã", "em 5 dias", "há 2 dias"
function quandoFalta(iso) {
  const n = diasAte(iso);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

// Gera um id único para cada item
function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Protege o texto digitado antes de colocar no HTML
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Avisinho que aparece embaixo, com botão "desfazer" opcional
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

// Remove um item de uma lista e oferece "desfazer"
function removerComDesfazer(lista, id, nome = 'Item') {
  const i = lista.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [removido] = lista.splice(i, 1);
  salvar(); desenhar();
  avisar(`${nome} removido`, () => { lista.splice(i, 0, removido); salvar(); desenhar(); });
}
