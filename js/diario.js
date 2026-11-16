const diarioMem = {};
const diarioTimers = {};
const diarioStatus = { tabela: null, carregados: new Set(), listaPronta: false, carregando: false };

const usaTabelaDiario = () => NUVEM_ATIVA && !!usuario && diarioStatus.tabela === true;
const diarioVazio = () => ({ bom: ['', '', ''], texto: '' });

function lerDiario(dia) {
  if (!usaTabelaDiario()) {
    const r = estado.diario[dia] || {};
    return { bom: r.bom || ['', '', ''], texto: r.texto || '' };
  }
  return diarioMem[dia] || diarioVazio();
}

function temConteudo(d) {
  return !!d && (d.bom?.some((x) => x && x.trim()) || (d.texto && d.texto.trim()));
}

function escreverDiario(dia, campo, valor, i) {
  if (!usaTabelaDiario()) {
    const r = registroDoDia(dia);
    if (campo === 'bom') { r.bom = r.bom || ['', '', '']; r.bom[i] = valor; } else r.texto = valor;
    salvar();
    return;
  }
  const d = diarioMem[dia] || (diarioMem[dia] = diarioVazio());
  if (campo === 'bom') d.bom[i] = valor; else d.texto = valor;
  statusNuvem('salvando');
  clearTimeout(diarioTimers[dia]);
  diarioTimers[dia] = setTimeout(() => enviarDiario(dia), 800);
}

async function enviarDiario(dia) {
  delete diarioTimers[dia];
  const d = diarioMem[dia];
  if (!d) return;
  if (!navigator.onLine) { statusNuvem('offline'); diarioTimers[dia] = setTimeout(() => enviarDiario(dia), 10000); return; }
  const linha = { user_id: usuario.id, dia, bom: d.bom, texto: d.texto, atualizado_em: new Date().toISOString() };
  const { error } = temConteudo(d)
    ? await sb.from('central_diario').upsert(linha)
    : await sb.from('central_diario').delete().eq('user_id', usuario.id).eq('dia', dia);
  if (error) {
    if (tabelaNaoExiste(error)) { usarDiarioAntigo(); return; }
    statusNuvem('erro');
    diarioTimers[dia] = setTimeout(() => enviarDiario(dia), 15000);
    return;
  }
  if (!Object.keys(diarioTimers).length && !pendenteNuvem && !salvandoNuvem) statusNuvem('salvo');
}

function tabelaNaoExiste(error) {
  return ['42P01', 'PGRST205', 'PGRST204'].includes(error.code) || /central_diario/.test(error.message || '');
}

function usarDiarioAntigo() {
  diarioStatus.tabela = false;
  Object.entries(diarioMem).forEach(([dia, d]) => {
    if (!temConteudo(d)) return;
    const r = registroDoDia(dia);
    r.bom = d.bom;
    r.texto = d.texto;
  });
  salvar();
}

function enviarDiarioPendente() {
  Object.keys(diarioTimers).forEach((dia) => { clearTimeout(diarioTimers[dia]); enviarDiario(dia); });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarDiarioPendente(); });
window.addEventListener('pagehide', enviarDiarioPendente);

async function carregarDiario(ini, fim) {
  if (!usaTabelaDiario()) return false;
  const chave = `${ini}|${fim}`;
  if (diarioStatus.carregados.has(chave)) return false;
  diarioStatus.carregados.add(chave);
  const { data, error } = await sb.from('central_diario').select('dia, bom, texto')
    .eq('user_id', usuario.id).gte('dia', ini).lte('dia', fim);
  if (error) { if (tabelaNaoExiste(error)) usarDiarioAntigo(); return false; }
  data.forEach((r) => { if (!diarioTimers[r.dia]) diarioMem[r.dia] = { bom: r.bom || ['', '', ''], texto: r.texto || '' }; });
  return data.length > 0;
}

async function carregarListaDiario() {
  if (!usaTabelaDiario() || diarioStatus.listaPronta) return false;
  diarioStatus.listaPronta = true;
  const { data, error } = await sb.from('central_diario').select('dia, bom, texto')
    .eq('user_id', usuario.id).order('dia', { ascending: false }).limit(60);
  if (error) { if (tabelaNaoExiste(error)) usarDiarioAntigo(); return false; }
  data.forEach((r) => { if (!diarioTimers[r.dia]) diarioMem[r.dia] = { bom: r.bom || ['', '', ''], texto: r.texto || '' }; });
  return true;
}

function diariosComConteudo() {
  const fonte = usaTabelaDiario()
    ? Object.entries(diarioMem)
    : Object.entries(estado.diario).map(([d, r]) => [d, { bom: r.bom || [], texto: r.texto || '' }]);
  return fonte.filter(([, d]) => temConteudo(d)).sort((a, b) => b[0].localeCompare(a[0]));
}

async function migrarDiario() {
  if (!NUVEM_ATIVA || !usuario || !navigator.onLine) return;
  const antigos = Object.entries(estado.diario).filter(([, r]) => temConteudo(r));
  const { error } = await sb.from('central_diario').select('dia').eq('user_id', usuario.id).limit(1);
  if (error) { if (tabelaNaoExiste(error)) diarioStatus.tabela = false; return; }
  diarioStatus.tabela = true;
  if (!antigos.length) return;
  const linhas = antigos.map(([dia, r]) => ({ user_id: usuario.id, dia, bom: r.bom || ['', '', ''], texto: r.texto || '', atualizado_em: new Date().toISOString() }));
  const envio = await sb.from('central_diario').upsert(linhas);
  if (envio.error) return;
  antigos.forEach(([dia, r]) => {
    diarioMem[dia] = { bom: r.bom || ['', '', ''], texto: r.texto || '' };
    delete r.bom;
    delete r.texto;
  });
  salvar();
}
