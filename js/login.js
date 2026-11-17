const configurado = Boolean(SUPABASE_URL && SUPABASE_KEY && window.supabase);
const sb = configurado ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const msg = document.getElementById('msg');

function mostrar(texto, erro = false) {
  msg.textContent = texto;
  msg.style.color = erro ? 'var(--vermelho)' : 'var(--verde)';
}

function traduzir(erro) {
  const m = (erro?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (m.includes('already registered')) return 'Já existe uma conta com esse e-mail.';
  if (m.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return 'Algo deu errado: ' + (erro?.message || 'tente de novo.');
}

const formLogin = document.getElementById('form-login');
if (formLogin) {
  let modo = 'entrar';

  if (!configurado) {
    document.getElementById('sem-config').hidden = false;

    if (SUPABASE_URL && SUPABASE_KEY && !window.supabase) {
      document.getElementById('sem-config-txt').innerHTML =
        'Não consegui carregar o Supabase. Confira se está com internet e recarregue com <b>Ctrl+F5</b>.';
    }
    document.getElementById('modo-local').hidden = false;
  } else {

    sb.auth.getSession().then(({ data }) => { if (data.session) location.href = 'index.html'; });
  }

  document.getElementById('abas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-modo]');
    if (!b) return;
    modo = b.dataset.modo;
    document.querySelectorAll('#abas .chip').forEach((c) => c.classList.toggle('ativo', c === b));
    document.getElementById('btn-login').textContent = modo === 'entrar' ? 'Entrar' : 'Criar conta';
    document.getElementById('senha').autocomplete = modo === 'entrar' ? 'current-password' : 'new-password';
    mostrar('');
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!configurado) { mostrar('Configure o Supabase no js/config.js primeiro.', true); return; }
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const botao = document.getElementById('btn-login');
    botao.disabled = true;
    botao.textContent = 'Aguarde…';

    if (modo === 'entrar') {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) mostrar(traduzir(error), true);
      else location.href = 'index.html';
    } else {
      const { data, error } = await sb.auth.signUp({ email, password: senha });
      if (error) mostrar(traduzir(error), true);
      else if (data.session) location.href = 'index.html';
      else mostrar('Conta criada! Confirme pelo link que enviamos no seu e-mail e depois entre.');
    }
    botao.disabled = false;
    botao.textContent = modo === 'entrar' ? 'Entrar' : 'Criar conta';
  });

  document.getElementById('esqueci').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    if (!configurado) { mostrar('Configure o Supabase no js/config.js primeiro.', true); return; }
    if (!email) { mostrar('Digite seu e-mail no campo acima e clique de novo.', true); document.getElementById('email').focus(); return; }
    const destino = location.href.replace(/login\.html.*$/, 'redefinir.html');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: destino });
    if (error) mostrar(traduzir(error), true);
    else mostrar('Enviamos um link para criar uma nova senha no seu e-mail.');
  });
}

const formRedefinir = document.getElementById('form-redefinir');
if (formRedefinir) {
  formRedefinir.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s1 = document.getElementById('nova-senha').value;
    const s2 = document.getElementById('repetir-senha').value;
    if (s1 !== s2) { mostrar('As senhas não são iguais.', true); return; }
    if (!configurado) { mostrar('Configure o Supabase no js/config.js primeiro.', true); return; }
    const { error } = await sb.auth.updateUser({ password: s1 });
    if (error) { mostrar('O link expirou ou é inválido. Peça um novo em "Esqueci minha senha".', true); return; }
    mostrar('Senha alterada! Entrando…');
    setTimeout(() => { location.href = 'index.html'; }, 1200);
  });
}

if (new URLSearchParams(location.search).get('conta') === 'excluida') mostrar('Sua conta e seus dados foram apagados.');
