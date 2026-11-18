const TEMAS = {
  violeta: { nome: 'Violeta', cor1: '#6f55e8', cor2: '#9d86ff' },
  rosa: { nome: 'Rosa', cor1: '#d6589f', cor2: '#f59ad8' },
  azul: { nome: 'Azul', cor1: '#3d7be0', cor2: '#7fb4ff' },
  verde: { nome: 'Verde-água', cor1: '#1f9e86', cor2: '#5fd6c0' },
  ambar: { nome: 'Âmbar', cor1: '#c9822b', cor2: '#f7c56b' },
  lavanda: { nome: 'Lavanda', cor1: '#8a6fd1', cor2: '#c4b5fd' },
};

let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; });
ACOES.instalar = async () => { if (!eventoInstalar) return; eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; desenhar(); };

ACOES.tema = (el) => { estado.config.tema = el.dataset.t; aplicarTema(); salvar(); desenhar(); };

PAGINAS.configuracoes = {
  titulo: 'Configurações',
  desenhar() {
    const c = estado.config;
    const permissao = !PODE_NOTIFICAR ? 'só dentro do site (abra pelo Live Server para ativar)'
      : Notification.permission === 'granted' ? 'ativadas'
      : Notification.permission === 'denied' ? 'bloqueadas (libere no cadeado da barra de endereço)'
      : 'ainda não ativadas';

    return `
    <div class="cab-pagina"><div><h1>Configurações</h1><p>Perfil, aparência, avisos, conta e conexões.</p></div></div>

    <div class="grade g2">
      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('user')}</span> Perfil</h2>
        <div style="display:grid;gap:12px">
          <label class="campo">Como quer ser chamado(a)
            <input type="text" id="cfg-nome" value="${esc(c.nome)}" maxlength="30" data-digitar="cfg" data-campo="nome"></label>
          <div class="campo"><span>Como o site fala com você</span>
            <div class="segmento">${[['a', 'Feminino'], ['o', 'Masculino'], ['n', 'Neutro']].map(([v, n]) => `<button class="${c.genero === v ? 'ativo' : ''}" data-acao="bv-genero" data-v="${v}">${n}</button>`).join('')}</div></div>
          <label class="campo">Nome do seu espaço (aparece na aba do navegador)
            <input type="text" value="${esc(c.nomeEspaco || '')}" maxlength="40" placeholder="Minha Central" data-digitar="bv-espaco"></label>
          <div class="campo"><span>Cidade do clima</span>${htmlBuscaCidade('cfg-cidade')}</div>
          <label class="campo">Meta de água (copos de 250 ml)
            <input type="number" id="cfg-agua" min="1" max="20" value="${c.metaAgua}" data-mudar="cfg-num" data-campo="metaAgua"></label>
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('palette')}</span> Aparência</h2>
        <p style="margin:0 0 12px">Cor de destaque do site:</p>
        <div class="temas">
          ${Object.entries(TEMAS).map(([id, t]) => `<button class="tema ${(c.tema || 'violeta') === id ? 'on' : ''}" data-acao="tema" data-t="${id}" title="${t.nome}">
            <i style="background:linear-gradient(135deg, ${t.cor1}, ${t.cor2})"></i><span>${t.nome}</span></button>`).join('')}
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('grid')}</span> Instalar como aplicativo</h2>
        ${location.protocol.startsWith('http') && location.hostname !== '127.0.0.1' && location.hostname !== 'localhost'
          ? `<p style="margin:0 0 12px">No celular: abra o menu do navegador e toque em <b>Adicionar à tela inicial</b> (no iPhone, pelo botão Compartilhar do Safari). No computador: clique no ícone de instalar na barra de endereço.</p>
             ${eventoInstalar ? `<button class="btn" data-acao="instalar">${ic('plus', 'p')} Instalar agora</button>` : ''}`
          : `<p style="margin:0 0 10px">Você está abrindo o site ${location.protocol === 'file:' ? 'direto do arquivo do computador' : 'pelo Live Server'}. Para instalar, abra pelo endereço publicado no GitHub Pages:</p>
             <a class="btn sec" href="https://lorena-mendes-azolin.github.io/central-da-lorena/" target="_blank" rel="noopener">${ic('link', 'p')} Abrir o site publicado</a>
             <p class="dica">No celular, abra esse link e toque em <b>Adicionar à tela inicial</b>.</p>`}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('save')}</span> Espaço no navegador</h2>
        ${htmlBarraEspaco()}
        <a class="btn sec" href="#limpeza">${ic('sparkle', 'p')} Liberar espaço</a>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-violeta">${ic('trash')}</span> Lixeira</h2>
        <p style="margin:0 0 12px">${(estado.lixeira || []).length ? `${estado.lixeira.length} ${estado.lixeira.length === 1 ? 'item apagado' : 'itens apagados'} nos últimos 30 dias.` : 'Nada apagado nos últimos 30 dias.'} Dá para restaurar qualquer coisa que você apagou.</p>
        <a class="btn sec" href="#lixeira">${ic('trash', 'p')} Abrir a lixeira</a>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('bell')}</span> Notificações</h2>
        <p style="margin:0 0 12px">Notificações do computador: <b>${permissao}</b></p>
        <div class="form-linha" style="justify-content:flex-start">
          ${PODE_NOTIFICAR && Notification.permission === 'default' ? '<button class="btn" data-acao="permitir-notif">Ativar notificações</button>' : ''}
          <button class="btn sec" data-acao="testar-aviso">Testar um aviso</button>
        </div>
        <p class="dica">Cada tarefa da Agenda tem o seu próprio "Avisar".</p>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-azul">${ic('user')}</span> Conta</h2>
        ${usuario
          ? `<p style="margin:0 0 12px">Conectada como <b>${esc(usuario.email)}</b>. Seus dados ficam salvos na nuvem.</p>
             <button class="btn sec" data-acao="sair">${ic('logout', 'p')} Sair da conta</button>`
          : `<p style="margin:0 0 12px">Você está no <b>modo local</b>: os dados ficam só neste navegador.
             Para ter login e acessar de qualquer lugar, configure o Supabase (passo a passo no LEIA-ME).</p>
             <a class="btn sec" href="login.html">${ic('logout', 'p')} Ir para a tela de login</a>`}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('chat')}</span> WhatsApp <small><span class="tag">em breve</span></small></h2>
        <p style="margin:0 0 12px">Receber os lembretes da agenda também no WhatsApp.</p>
        <button class="btn" disabled style="opacity:.45;cursor:not-allowed">Conectar ao WhatsApp</button>
        <p class="dica">Próxima etapa: um bot vai ler a sua agenda no Supabase e mandar os lembretes.</p>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-rosa">${ic('save')}</span> Backup</h2>
        <p style="margin:0 0 6px">Baixa um arquivo com tudo, inclusive o diário. No computador ele vai para a pasta <b>Downloads</b>. No celular abre a opção de compartilhar, para você escolher o <b>Google Drive</b>.</p>
        <p class="dica" style="margin:0 0 12px">${estado.config.ultimoBackup ? `Último backup: ${dataCurta(estado.config.ultimoBackup)}${diasDesdeBackup() ? ` (há ${diasDesdeBackup()} ${diasDesdeBackup() === 1 ? 'dia' : 'dias'})` : ' (hoje)'}.` : 'Você ainda não fez nenhum backup.'} O site te lembra a cada 7 dias.</p>
        <div class="form-linha" style="justify-content:flex-start">
          <button class="btn sec" data-acao="backup">${ic('save', 'p')} Fazer backup</button>
          <button class="btn sec" data-acao="restaurar">${ic('upload', 'p')} Restaurar arquivo</button>
        </div>
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-verde">${ic('clock')}</span> Histórico na nuvem</h2>
        <p style="margin:0 0 12px">Todo dia em que você mexe no site, a nuvem guarda sozinha uma cópia de como estava antes. As cópias ficam 30 dias. Se algo sumir ou for apagado sem querer, volte para um dia anterior.</p>
        ${htmlHistorico()}
      </section>

      <section class="card">
        <h2 class="card-titulo"><span class="selo mini c-amarelo">${ic('bell')}</span> Avisos com o site fechado</h2>
        ${htmlPush()}
      </section>

      <section class="card zona-perigo">
        <h2 class="card-titulo"><span class="selo mini c-vermelho">${ic('user')}</span> Conta e privacidade</h2>
        <p style="margin:0 0 12px">Veja como seus dados são guardados em <a href="privacidade.html" target="_blank" rel="noopener">Privacidade e seus dados</a>.</p>
        ${usuario ? (cfgTela.excluindo ? `<div class="excluir-conta">
          <p><b>Isso apaga para sempre</b> sua conta, todos os seus dados e imagens da nuvem. Não dá para desfazer. Se quiser guardar alguma coisa, faça um backup antes.</p>
          <label class="campo">Para confirmar, digite EXCLUIR<input type="text" id="confirma-excluir" autocomplete="off"></label>
          <div class="form-linha" style="justify-content:flex-end;margin-top:10px">
            <button class="btn sec" data-acao="conta-excluir-cancelar">Cancelar</button>
            <button class="btn perigo" data-acao="conta-excluir-confirmar" ${cfgTela.apagando ? 'disabled' : ''}>${cfgTela.apagando ? 'Apagando…' : 'Excluir para sempre'}</button>
          </div></div>`
          : `<button class="btn sec" data-acao="conta-excluir">${ic('trash', 'p')} Excluir minha conta</button>`)
          : '<p class="dica" style="margin:0">No modo local, os dados ficam só neste navegador. Para apagar, limpe os dados do site no navegador.</p>'}
      </section>
    </div>`;
  },
};

const cfgTela = { excluindo: false, apagando: false };
ACOES['conta-excluir'] = () => { cfgTela.excluindo = true; desenhar(); $('#confirma-excluir')?.focus(); };
ACOES['conta-excluir-cancelar'] = () => { cfgTela.excluindo = false; desenhar(); };
ACOES['conta-excluir-confirmar'] = async () => {
  if (($('#confirma-excluir')?.value || '').trim().toUpperCase() !== 'EXCLUIR') { avisar('Digite EXCLUIR para confirmar.'); return; }
  cfgTela.apagando = true; desenhar();
  try {
    const pasta = await sb.storage.from(BUCKET_IMAGENS).list(usuario.id, { limit: 1000 });
    const arquivos = (pasta.data || []).map((f) => `${usuario.id}/${f.name}`);
    if (arquivos.length) await sb.storage.from(BUCKET_IMAGENS).remove(arquivos);
  } catch { }
  const { error } = await sb.rpc('excluir_minha_conta');
  if (error) {
    cfgTela.apagando = false; desenhar();
    avisar(/excluir_minha_conta|PGRST202|42883/.test(`${error.code} ${error.message}`) ? 'A exclusão ainda não foi ativada no Supabase (falta rodar o supabase.sql).' : 'Não consegui excluir agora. Tente de novo.');
    return;
  }
  clearTimeout(timerNuvem); pendenteNuvem = false;
  Object.keys(localStorage).filter((k) => k.startsWith(CHAVE)).forEach((k) => localStorage.removeItem(k));
  try { await sb.auth.signOut(); } catch { }
  location.href = 'login.html?conta=excluida';
};

DIGITAR.cfg = (el) => {
  if (!el.value.trim()) return;
  estado.config[el.dataset.campo] = el.value.trim();
  salvar();
  atualizarPerfil();
};

MUDAR['cfg-num'] = (el) => {
  estado.config[el.dataset.campo] = Math.max(1, Math.min(20, Number(el.value) || 8));
  salvar();
};

ACOES['testar-aviso'] = () => notificar('Teste de aviso', 'Se você está vendo isso, os avisos estão funcionando.');
ACOES.restaurar = () => $('#arquivo-backup').click();
