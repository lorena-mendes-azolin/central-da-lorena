// =========================================================
// configuracoes.js — preferências, conta e conexões
// =========================================================

PAGINAS.configuracoes = {
  titulo: 'Configurações',
  desenhar() {
    const c = estado.config;
    const permissao = !PODE_NOTIFICAR ? 'só dentro do site (abra pelo Live Server para ativar)'
      : Notification.permission === 'granted' ? 'ativadas'
      : Notification.permission === 'denied' ? 'bloqueadas (libere no cadeado da barra de endereço)'
      : 'ainda não ativadas';

    return `
    <div class="cab-pagina"><div><h1>Configurações</h1><p>Perfil, avisos, conta e conexões.</p></div></div>

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
