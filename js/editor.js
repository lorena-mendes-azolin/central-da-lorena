function lerImagem(arquivo, tamanhoMax = 1000) {
  return new Promise((ok, erro) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) { erro(new Error('não é imagem')); return; }
    const leitor = new FileReader();
    leitor.onerror = erro;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = erro;
      img.onload = () => {
        const escala = Math.min(1, tamanhoMax / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok(guardarImagem(c.toDataURL('image/jpeg', 0.78)));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function dominio(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function corrigirLink(url) {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

function htmlAnexos(obj, ref) {
  const anexos = obj.anexos || [];
  const imagens = anexos.filter((a) => a.tipo === 'imagem');
  const links = anexos.filter((a) => a.tipo === 'link');
  return `<div class="anexos">
    ${imagens.length ? `<div class="anexos-imagens">${imagens.map((a) => `<figure>
        <img src="${a.url}" alt="${esc(a.nome || 'imagem')}" data-acao="ver-imagem" data-src="${a.url}">
        <button class="acao-item apagar" data-acao="anexo-del" data-ref="${ref}" data-id="${a.id}" title="Remover imagem">${ic('x', 'p')}</button>
      </figure>`).join('')}</div>` : ''}
    ${links.length ? `<div class="anexos-links">${links.map((a) => `<span class="link-chip">
        <a href="${esc(a.url)}" target="_blank" rel="noopener">${ic('link', 'p')}${esc(a.nome || dominio(a.url))}</a>
        <button class="acao-item apagar" data-acao="anexo-del" data-ref="${ref}" data-id="${a.id}" title="Remover link">${ic('x', 'p')}</button>
      </span>`).join('')}</div>` : ''}
    <div class="anexos-add">
      <form class="form-link" data-form="anexo-link" data-ref="${ref}">
        <input type="text" name="url" placeholder="Colar um link" aria-label="Link" data-precisa>
        <button class="btn-mini" type="submit">${ic('plus', 'p')} Link</button>
      </form>
      <label class="btn-mini">${ic('image', 'p')} Imagem
        <input type="file" accept="image/*" multiple data-mudar="anexo-imagem" data-ref="${ref}" hidden></label>
    </div>
  </div>`;
}

FORMS['anexo-link'] = (d, form) => {
  const obj = acharRef(form.dataset.ref);
  if (!obj || !d.url) return;
  obj.anexos = obj.anexos || [];
  obj.anexos.push({ id: novoId(), tipo: 'link', url: corrigirLink(d.url), nome: '' });
  salvar(); desenhar();
};

MUDAR['anexo-imagem'] = async (el) => {
  const obj = acharRef(el.dataset.ref);
  if (!obj) return;
  obj.anexos = obj.anexos || [];
  for (const arq of el.files) {
    try {
      obj.anexos.push({ id: novoId(), tipo: 'imagem', url: await lerImagem(arq), nome: arq.name });
    } catch { avisar('Não consegui abrir essa imagem.'); }
  }
  salvar(); desenhar();
};

ACOES['anexo-del'] = (el) => {
  const obj = acharRef(el.dataset.ref);
  if (obj?.anexos) removerComDesfazer(obj.anexos, el.dataset.id, 'Anexo');
};

ACOES['ver-imagem'] = (el) => {
  const v = document.createElement('div');
  v.className = 'visualizador';
  v.innerHTML = `<img src="${el.dataset.src || el.src}" alt="">`;
  v.onclick = () => v.remove();
  document.body.appendChild(v);
};
document.addEventListener('click', (e) => {
  const img = e.target.closest('.editor img');
  if (img && !e.target.closest('[data-acao]')) ACOES['ver-imagem'](img);
});

// Link sozinho na linha vira card (classe "link-card"); no meio do texto fica como etiqueta (só CSS).
const BLOCOS_EDITOR = /^(DIV|P|LI|H1|H2|H3|H4|BLOCKQUOTE|UL|OL|BR|IMG)$/;
function linkSozinho(a) {
  const pai = a.parentElement;
  if (!pai) return false;
  if (pai.classList.contains('editor') || !BLOCOS_EDITOR.test(pai.tagName)) {
    // link solto: olha os vizinhos até a quebra de linha
    if (!pai.classList.contains('editor')) return false;
    const vazio = (n, lado) => {
      for (let x = n[lado]; x; x = x[lado]) {
        if (x.nodeType === 1 && BLOCOS_EDITOR.test(x.tagName)) return true;
        if ((x.textContent || '').trim()) return false;
      }
      return true;
    };
    return vazio(a, 'previousSibling') && vazio(a, 'nextSibling');
  }
  return (pai.textContent || '').trim() === (a.textContent || '').trim() && !pai.querySelector('img');
}
function marcarLinksEditor(raiz) {
  raiz.querySelectorAll('a[href]').forEach((a) => {
    a.classList.toggle('link-card', linkSozinho(a));
    if (!a.classList.length) a.removeAttribute('class');
    a.target = '_blank'; a.rel = 'noopener';
  });
}
function prepararHtmlEditor(html) {
  if (!html || !html.includes('<a')) return html || '';
  const t = document.createElement('template');
  t.innerHTML = html;
  const caixa = document.createElement('div');
  caixa.className = 'editor';
  caixa.append(t.content);
  marcarLinksEditor(caixa);
  return caixa.innerHTML;
}

function htmlEditor(ref, campo, html, vazio = 'Comece a escrever…') {
  html = prepararHtmlEditor(html);
  return `<div class="com-editor">
    <div class="ferramentas" role="toolbar" aria-label="Formatação">
      <button data-cmd="bold" title="Negrito (Ctrl+B)">${ic('bold', 'p')}</button>
      <button data-cmd="italic" title="Itálico (Ctrl+I)">${ic('italic', 'p')}</button>
      <button data-cmd="marca" title="Marca-texto">${ic('highlight', 'p')}</button>
      <span class="sep"></span>
      <button data-cmd="h2" title="Título">H1</button>
      <button data-cmd="h3" title="Subtítulo">H2</button>
      <button data-cmd="p" title="Texto normal">T</button>
      <span class="sep"></span>
      <button data-cmd="insertUnorderedList" title="Lista com marcadores">${ic('list', 'p')}</button>
      <button data-cmd="insertOrderedList" title="Lista numerada">1.</button>
      <button data-cmd="checklist" title="Lista de tarefas">${ic('checklist', 'p')}</button>
      <button data-cmd="blockquote" title="Destaque">${ic('quote', 'p')}</button>
      <span class="sep"></span>
      <button data-cmd="link" title="Inserir link">${ic('link', 'p')}</button>
      <button data-cmd="imagem" title="Inserir imagem">${ic('image', 'p')}</button>
    </div>
    <div class="editor" contenteditable="true" data-vazio="${esc(vazio)}" data-digitar="editor" data-ref="${ref}" data-campo="${campo}">${html || ''}</div>
    <input type="file" accept="image/*" class="editor-arquivo" hidden>
  </div>`;
}

DIGITAR.editor = (el) => {
  const obj = acharRef(el.dataset.ref);
  if (!obj) return;
  if (el.querySelector('a[href]')) marcarLinksEditor(el);
  obj[el.dataset.campo] = el.innerHTML;
  if ('editado' in obj) {
    obj.editado = new Date().toISOString();
    const info = $('#pagina-editada');
    if (info) info.textContent = 'Editada ' + textoEditada(obj.editado);
  }
  salvar();
  const pos = el.dataset.ref.indexOf('/nota/');
  if (pos > 0 && typeof habitoDaMateria === 'function' && el.innerText.trim()) marcarVinculo(habitoDaMateria(el.dataset.ref.slice(0, pos)));
};

let faixaGuardada = null;

document.addEventListener('mousedown', (e) => {
  const b = e.target.closest('[data-cmd]');
  if (!b) return;
  e.preventDefault();
  const caixa = b.closest('.com-editor');
  const editor = caixa.querySelector('.editor');
  const sel = document.getSelection();
  if (!editor.contains(sel.anchorNode)) {
    editor.focus();
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  const cmd = b.dataset.cmd;
  if (['h2', 'h3', 'p', 'blockquote'].includes(cmd)) {
    document.execCommand('formatBlock', false, cmd);
  } else if (cmd === 'marca') {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('hiliteColor', false, 'rgba(247, 197, 107, .32)');
    document.execCommand('styleWithCSS', false, false);
  } else if (cmd === 'checklist') {
    document.execCommand('insertUnorderedList');
    const no = document.getSelection().anchorNode;
    const ul = (no.nodeType === 1 ? no : no.parentElement).closest('ul');
    if (ul) ul.classList.add('checklist');
  } else if (cmd === 'link') {
    const url = window.prompt('Cole o link:');
    if (url) {
      if (sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(corrigirLink(url))}" target="_blank">${esc(dominio(corrigirLink(url)))}</a>&nbsp;`);
      else document.execCommand('createLink', false, corrigirLink(url));
      editor.querySelectorAll('a').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
    }
  } else if (cmd === 'imagem') {
    faixaGuardada = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    caixa.querySelector('.editor-arquivo').click();
    return;
  } else {
    document.execCommand(cmd);
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
});

document.addEventListener('change', async (e) => {
  if (!e.target.matches('.editor-arquivo')) return;
  const editor = e.target.closest('.com-editor').querySelector('.editor');
  const arq = e.target.files[0];
  e.target.value = '';
  if (!arq) return;
  try {
    const url = await lerImagem(arq);
    editor.focus();
    if (faixaGuardada) { const s = document.getSelection(); s.removeAllRanges(); s.addRange(faixaGuardada); }
    document.execCommand('insertHTML', false, `<img src="${url}" alt=""><br>`);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  } catch { avisar('Não consegui abrir essa imagem.'); }
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('.editor a');
  if (a && (e.ctrlKey || e.metaKey || a.classList.contains('link-card'))) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); }

  const li = e.target.closest('.editor ul.checklist li');
  if (li && e.clientX - li.getBoundingClientRect().left <= 22) {
    li.classList.toggle('ok');
    li.closest('.editor').dispatchEvent(new Event('input', { bubbles: true }));
  }
});

const paginaAberta = {};

function htmlCaderno(dono, refBase, textoVazio = 'Crie uma página para cada aula, livro ou assunto.') {
  dono.notas = dono.notas || [];
  const aberta = dono.notas.find((n) => n.id === paginaAberta[refBase]) || dono.notas[0];
  return `<div class="caderno">
    <aside class="paginas">
      <button class="btn" data-acao="pagina-nova" data-ref="${refBase}" style="margin-bottom:6px">${ic('plus', 'p')} Nova página</button>
      ${dono.notas.map((n) => `<button class="pg ${aberta && n.id === aberta.id ? 'ativo' : ''}" data-acao="pagina-abrir" data-ref="${refBase}" data-id="${n.id}" ${ordem(refBase + '|notas', n.id)} data-pegar>
        ${ic('note', 'p')}<span id="pg-${n.id}">${esc(n.titulo || 'Sem título')}</span>${(n.anexos || []).length ? `<small>${ic('link', 'p')}${n.anexos.length}</small>` : ''}<small>${n.criado.slice(8)}/${n.criado.slice(5, 7)}</small></button>`).join('')
        || '<p class="vazio" style="padding:4px 8px">Nenhuma página ainda.</p>'}
    </aside>
    ${aberta ? `<article class="folha">
      <input class="folha-titulo" value="${esc(aberta.titulo)}" placeholder="Sem título" data-digitar="pagina-titulo" data-ref="${refBase}/nota/${aberta.id}" aria-label="Título da página" maxlength="80">
      <div class="folha-info">
        <span id="pagina-editada">Editada ${textoEditada(aberta.editado)}</span>
        <button class="btn-mini" data-acao="pagina-del" data-ref="${refBase}" data-id="${aberta.id}" style="margin-left:auto">${ic('trash', 'p')} Excluir página</button>
      </div>
      ${htmlEditor(`${refBase}/nota/${aberta.id}`, 'html', aberta.html, 'Comece a escrever… o que você aprendeu hoje?')}
      <h3 class="sub-titulo">${ic('image', 'p')} Links e imagens</h3>
      ${htmlAnexos(aberta, `${refBase}/nota/${aberta.id}`)}
    </article>` : `<article class="folha vazia">
      <div><p style="font-size:17px;font-weight:700;margin:0 0 6px">Caderno vazio</p>
      <p class="vazio" style="margin:0 0 14px">${textoVazio}</p>
      <button class="btn" data-acao="pagina-nova" data-ref="${refBase}">${ic('plus', 'p')} Criar a primeira página</button></div>
    </article>`}
  </div>`;
}

function textoEditada(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${quandoFalta(hojeISO(d)).toLowerCase()} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

ACOES['pagina-nova'] = (el) => {
  const dono = acharRef(el.dataset.ref);
  dono.notas = dono.notas || [];
  const n = { id: novoId(), titulo: '', html: '', criado: hojeISO(), editado: new Date().toISOString() };
  dono.notas.unshift(n);
  paginaAberta[el.dataset.ref] = n.id;
  salvar(); desenhar();
  $('.folha-titulo')?.focus();
};

ACOES['pagina-abrir'] = (el) => { paginaAberta[el.dataset.ref] = el.dataset.id; desenhar(); };

ACOES['pagina-del'] = (el) => {
  const dono = acharRef(el.dataset.ref);
  delete paginaAberta[el.dataset.ref];
  removerComDesfazer(dono.notas, el.dataset.id, 'Página');
};

DIGITAR['pagina-titulo'] = (el) => {
  const n = acharRef(el.dataset.ref);
  if (!n) return;
  n.titulo = el.value;
  n.editado = new Date().toISOString();
  const item = $('#pg-' + n.id);
  if (item) item.textContent = el.value || 'Sem título';
  salvar();
};
