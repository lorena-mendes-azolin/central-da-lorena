const historicoTela = { lista: null, carregando: false, erro: '', restaurando: '' };

function diasDesdeBackup() {
  const u = estado.config.ultimoBackup;
  if (!u) return Infinity;
  return Math.round((paraData(hojeISO()) - paraData(u)) / 86400000);
}

function backupAtrasado() {
  if (estado.config.backupAdiado === hojeISO()) return false;
  const temDados = estado.tarefas.length || estado.listas.some((l) => (l.itens?.length || l.materias?.length));
  return temDados && diasDesdeBackup() >= 7;
}

function htmlAvisoBackup() {
  if (!backupAtrasado()) return '';
  const n = diasDesdeBackup();
  return `<div class="alerta convite aviso-backup">${ic('save')}<span><b>${n === Infinity ? 'Você ainda não fez nenhum backup.' : `Faz ${n} dias desde o seu último backup.`}</b> Baixe uma cópia e guarde no Google Drive ou em outro lugar seguro.</span>
    <span class="aviso-backup-botoes"><button class="btn sec" data-acao="backup-adiar">Depois</button><button class="btn" data-acao="backup">Fazer backup</button></span></div>`;
}

async function linhasDoDiario() {
  if (!usaTabelaDiario()) return [];
  const { data, error } = await sb.from('central_diario').select('dia, bom, texto').eq('user_id', usuario.id).order('dia');
  if (error) throw error;
  return data;
}

ACOES.backup = async () => {
  let diario = [];
  try { diario = await linhasDoDiario(); } catch { avisar('Não consegui buscar o diário na nuvem. Tente de novo com internet.'); return; }
  const conteudo = { app: 'central-da-lorena', versao: 2, criadoEm: new Date().toISOString(), dados: estado, diario };
  const nome = `backup-central-${hojeISO()}.json`;
  const arquivo = new File([JSON.stringify(conteudo, null, 2)], nome, { type: 'application/json' });
  const celular = matchMedia('(pointer: coarse)').matches;
  let enviado = false;
  if (celular && navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: 'Backup da Central' }); enviado = true; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  if (!enviado) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(arquivo);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  estado.config.ultimoBackup = hojeISO();
  delete estado.config.backupAdiado;
  salvar(); desenhar();
  avisar(enviado ? 'Backup pronto. Escolha onde guardar (Drive, por exemplo).' : `Backup salvo em Downloads como ${nome}. Guarde uma cópia no Google Drive.`);
};

ACOES['backup-adiar'] = () => { estado.config.backupAdiado = hojeISO(); salvar(); desenhar(); };

async function gravarDiario(linhas, substituir) {
  if (!linhas.length && !substituir) return;
  if (!usaTabelaDiario()) {
    linhas.forEach((r) => { const reg = registroDoDia(r.dia); reg.bom = r.bom || ['', '', '']; reg.texto = r.texto || ''; });
    return;
  }
  const agora = new Date().toISOString();
  const cheias = linhas.filter((r) => temConteudo(r));
  const vazias = linhas.filter((r) => !temConteudo(r)).map((r) => r.dia);
  if (cheias.length) {
    const { error } = await sb.from('central_diario').upsert(cheias.map((r) => ({ user_id: usuario.id, dia: r.dia, bom: r.bom || ['', '', ''], texto: r.texto || '', atualizado_em: agora })));
    if (error) throw error;
  }
  if (vazias.length) await sb.from('central_diario').delete().eq('user_id', usuario.id).in('dia', vazias);
  Object.keys(diarioMem).forEach((k) => delete diarioMem[k]);
  diarioStatus.carregados.clear();
  diarioStatus.listaPronta = false;
}

async function restaurarArquivo(arquivo) {
  let bruto;
  try { bruto = JSON.parse(await arquivo.text()); } catch { avisar('Esse arquivo não parece um backup da Central.'); return; }
  const dados = bruto.app === 'central-da-lorena' ? bruto.dados : bruto;
  if (!dados || !Array.isArray(dados.tarefas) || !Array.isArray(dados.listas)) { avisar('Esse arquivo não parece um backup da Central.'); return; }
  const anterior = estado;
  estado = completar(dados);
  try { await gravarDiario(bruto.diario || [], false); } catch { avisar('Restaurei os dados, mas o diário não foi enviado para a nuvem.'); }
  salvar(); aplicarMenu(); aplicarTema(); desenhar();
  avisar('Backup restaurado.', () => { estado = anterior; salvar(); aplicarMenu(); aplicarTema(); desenhar(); });
}

const historicoDisponivel = () => NUVEM_ATIVA && !!usuario;

async function carregarHistorico() {
  if (!historicoDisponivel() || historicoTela.carregando) return;
  historicoTela.carregando = true;
  let { data, error } = await sb.from('central_historico').select('dia, criado_em').eq('user_id', usuario.id).order('dia', { ascending: false }).limit(31);
  if (!error && partesOk) {
    const r = await sb.from('central_partes_historico').select('dia').eq('user_id', usuario.id);
    if (!r.error) {
      const dias = new Set([...(data || []).map((x) => x.dia), ...(r.data || []).map((x) => x.dia)]);
      data = [...dias].sort().reverse().slice(0, 31).map((dia) => ({ dia }));
    }
  }
  historicoTela.carregando = false;
  if (error) {
    historicoTela.lista = [];
    historicoTela.erro = /central_historico|42P01|PGRST205/.test(`${error.code} ${error.message}`)
      ? 'O histórico ainda não foi ativado. Rode o arquivo supabase.sql no SQL Editor do Supabase.'
      : 'Não consegui buscar o histórico agora.';
  } else {
    historicoTela.lista = data;
    historicoTela.erro = '';
  }
  desenharSeguro();
}

function htmlHistorico() {
  if (!historicoDisponivel()) return '<p class="dica" style="margin:0">O histórico funciona quando você está entrando com a sua conta (nuvem ligada).</p>';
  if (historicoTela.lista === null) {
    setTimeout(carregarHistorico, 0);
    return '<p class="dica" style="margin:0">Carregando versões…</p>';
  }
  if (historicoTela.erro) return `<p class="dica" style="margin:0">${historicoTela.erro}</p>`;
  if (!historicoTela.lista.length) return '<p class="dica" style="margin:0">A primeira cópia aparece aqui amanhã, depois que você mexer em alguma coisa.</p>';
  return `<div class="lista-rolavel historico-lista">${historicoTela.lista.map((v) => `<div class="item">
      <span class="txt">${(() => { const t = paraData(v.dia).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); return t[0].toUpperCase() + t.slice(1); })()}
        <span class="sub">como estava no começo do dia</span></span>
      <button class="btn-mini" data-acao="historico-voltar" data-dia="${v.dia}" ${historicoTela.restaurando ? 'disabled' : ''}>${historicoTela.restaurando === v.dia ? 'Voltando…' : 'Voltar para esta versão'}</button>
    </div>`).join('')}</div>`;
}

ACOES['historico-voltar'] = async (el) => {
  const dia = el.dataset.dia;
  if (!confirmarDuasVezes(`historico-${dia}`, `Clique de novo para voltar tudo para ${dataCurta(dia)}.`)) return;
  historicoTela.restaurando = dia;
  desenhar();
  try {
    const h = await sb.from('central_historico').select('dia, dados').eq('user_id', usuario.id).gte('dia', dia).order('dia');
    if (h.error) throw h.error;
    const atual = await sb.from('central_dados').select('dados').eq('user_id', usuario.id).maybeSingle();
    const data = { dados: { ...((h.data && h.data[0]?.dados) || atual.data?.dados || {}) } };
    if (partesOk) {
      const ph = await sb.from('central_partes_historico').select('chave, dia, dados').eq('user_id', usuario.id).gte('dia', dia).order('dia');
      if (ph.error) throw ph.error;
      const pa = await sb.from('central_partes').select('chave, dados').eq('user_id', usuario.id);
      PARTES.forEach((k) => {
        const antiga = (ph.data || []).find((x) => x.chave === k);
        const agora = (pa.data || []).find((x) => x.chave === k);
        if (antiga) data.dados[k] = antiga.dados;
        else if (agora) data.dados[k] = agora.dados;
      });
    }
    if (!Object.keys(data.dados).length) throw new Error('sem dados');
    const anterior = estado;
    let diarioAntes = [];
    try { diarioAntes = await linhasDoDiario(); } catch { }
    const versoes = await sb.from('central_diario_historico').select('dia, versao_dia, bom, texto')
      .eq('user_id', usuario.id).gte('versao_dia', dia).order('versao_dia');
    if (!versoes.error && versoes.data.length) {
      const porDia = {};
      versoes.data.forEach((r) => { if (!porDia[r.dia]) porDia[r.dia] = r; });
      await gravarDiario(Object.values(porDia), true);
    }
    estado = completar(data.dados);
    salvar(); aplicarMenu(); aplicarTema();
    historicoTela.restaurando = '';
    historicoTela.lista = null;
    desenhar();
    avisar(`Tudo voltou para como estava em ${dataCurta(dia)}.`, async () => {
      estado = anterior;
      try { await gravarDiario(diarioAntes, false); } catch { }
      salvar(); aplicarMenu(); aplicarTema(); desenhar();
    });
  } catch {
    historicoTela.restaurando = '';
    desenhar();
    avisar('Não consegui voltar essa versão agora. Nada foi alterado.');
  }
};
