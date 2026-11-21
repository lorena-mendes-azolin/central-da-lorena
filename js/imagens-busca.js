// Escolher a imagem de um item (Compras e Lista das listas), sem precisar baixar:
// abrir Google ou Pinterest em outra aba -> copiar a imagem -> "Colar imagem" (ou Ctrl+V com os detalhes abertos).
// Colar o ENDEREÇO de uma imagem também funciona: a função buscar-imagens baixa e guarda no armazenamento.

function htmlBotoesImagem(ref, titulo) {
  const q = encodeURIComponent((titulo || '').trim());
  return `<div class="dc-foto-acoes">
    <a class="btn-mini" href="https://www.google.com/search?tbm=isch&q=${q}" target="_blank" rel="noopener" title="Abre o Google Imagens. Copie a imagem e use &quot;Colar imagem&quot;">${ic('right', 'p')} Google</a>
    <a class="btn-mini" href="https://br.pinterest.com/search/pins/?q=${q}" target="_blank" rel="noopener" title="Abre o Pinterest. Copie a imagem e use &quot;Colar imagem&quot;">${ic('right', 'p')} Pinterest</a>
    <button type="button" class="btn-mini" data-acao="img-colar" data-ref="${ref}" title="Cole uma imagem copiada (no computador também dá Ctrl+V)">${ic('upload', 'p')} Colar imagem</button>
  </div>`;
}

// Qual item está aberto em "Ver detalhes" agora
function itemDaJanelaAberta() {
  if ($('#janela-compra')?.open && compraAberta.id) return `${compraAberta.lista}/${compraAberta.id}`;
  if ($('#janela-colecao')?.open && colAberto.ref) return colAberto.ref;
  return '';
}
function redesenharDetalhes() {
  document.activeElement?.blur?.();
  if (typeof redesenharCompra === 'function') redesenharCompra();
  if (typeof redesenharColecao === 'function') redesenharColecao();
}

async function usarArquivoImagem(ref, arquivo) {
  const i = acharRef(ref);
  if (!i || !arquivo) return false;
  avisar('Colocando a imagem…');
  try {
    i.foto = await lerImagem(arquivo);
    salvar(); desenhar(); redesenharDetalhes();
    avisar('Imagem colocada.');
    return true;
  } catch { avisar('Não consegui abrir essa imagem.'); return false; }
}

// Baixa a imagem pelo endereço (no servidor) e guarda no seu armazenamento
async function usarEnderecoImagem(ref, url, silencioso = false) {
  if (!usuario) { avisar('Para puxar a imagem, entre com a sua conta (precisa da nuvem).'); return false; }
  if (!silencioso) avisar('Buscando a imagem…');
  let r;
  try {
    const { data, error } = await sb.functions.invoke('buscar-imagens', { body: { acao: 'salvar', url } });
    if (error) throw error;
    r = data;
  } catch { r = { erro: 'sem conexão' }; }
  const i = acharRef(ref);
  if (!r?.foto || !i) { if (!silencioso) avisar('Não consegui puxar essa imagem. Tente copiar a imagem (e não o endereço).'); return false; }
  i.foto = r.foto;
  salvar(); desenhar(); redesenharDetalhes();
  avisar('Imagem colocada.');
  return true;
}

const pareceEnderecoImagem = (t) => /^https?:\/\/\S+$/i.test(t) && (/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(t) || /(encrypted-tbn|googleusercontent|pinimg|imgs\.search\.brave)/i.test(t));

// Ctrl+V com os detalhes abertos: imagem copiada vira a foto do item
document.addEventListener('paste', (e) => {
  const ref = itemDaJanelaAberta();
  if (!ref) return;
  const arq = [...(e.clipboardData?.items || [])].find((x) => x.kind === 'file' && x.type.startsWith('image/'));
  if (arq) { e.preventDefault(); usarArquivoImagem(ref, arq.getAsFile()); return; }
  const texto = (e.clipboardData?.getData('text') || '').trim();
  const emCampo = e.target.closest?.('input, textarea, [contenteditable="true"]');
  if (!emCampo && pareceEnderecoImagem(texto)) { e.preventDefault(); usarEnderecoImagem(ref, texto); }
});

// Botão "Colar imagem" (no celular é o jeito mais fácil)
ACOES['img-colar'] = async (el) => {
  const ref = el.dataset.ref;
  if (!navigator.clipboard?.read) { avisar('Este navegador não deixa colar pelo botão. No computador, aperte Ctrl+V com os detalhes abertos.'); return; }
  try {
    const itens = await navigator.clipboard.read();
    for (const it of itens) {
      const tipo = it.types.find((t) => t.startsWith('image/'));
      if (tipo) {
        const blob = await it.getType(tipo);
        await usarArquivoImagem(ref, new File([blob], 'colada.' + (tipo.split('/')[1] || 'png'), { type: tipo }));
        return;
      }
      if (it.types.includes('text/plain')) {
        const txt = (await (await it.getType('text/plain')).text()).trim();
        if (/^https?:\/\//i.test(txt)) { await usarEnderecoImagem(ref, txt); return; }
      }
    }
    avisar('Não achei imagem copiada. No Google ou Pinterest: segure ou clique com o botão direito na imagem e escolha "Copiar imagem".');
  } catch {
    avisar('O navegador não deixou colar. Tente de novo e toque em "Permitir"/"Colar" quando ele perguntar, ou use Ctrl+V no computador.');
  }
};
