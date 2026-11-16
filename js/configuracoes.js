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
          <label class="campo">Como quer ser chamada
            <input type="text" id="cfg-nome" value="${esc(c.nome)}" maxlength="30" data-digitar="cfg" data-campo="nome"></label>
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
        <p style="margin:0 0 12px">Guarde uma cópia dos seus dados em um arquivo.</p>
        <div class="form-linha" style="justify-content:flex-start">
          <button class="btn sec" data-acao="backup">${ic('save', 'p')} Fazer backup</button>
          <button class="btn sec" data-acao="restaurar">${ic('upload', 'p')} Restaurar</button>
        </div>
      </section>
    </div>`;
  },
};

DIGITAR.cfg = (el) => {
  estado.config[el.dataset.campo] = el.value.trim() || 'Lorena';
  salvar();
  $('#perfil-nome').textContent = estado.config.nome;
  $('#perfil-foto').textContent = estado.config.nome[0].toUpperCase();
};

MUDAR['cfg-num'] = (el) => {
  estado.config[el.dataset.campo] = Math.max(1, Math.min(20, Number(el.value) || 8));
  salvar();
};

ACOES['testar-aviso'] = () => notificar('Teste de aviso', 'Se você está vendo isso, os avisos estão funcionando.');
ACOES.restaurar = () => $('#arquivo-backup').click();
