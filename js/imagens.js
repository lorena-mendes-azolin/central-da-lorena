const BUCKET_IMAGENS = 'imagens';
const VALIDADE_LINK = 60 * 60 * 24 * 365 * 10;
let storageFunciona = null;

function dataUrlParaBlob(dataUrl) {
  const [cab, base64] = dataUrl.split(',');
  const tipo = cab.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: tipo });
}

async function guardarImagem(dataUrl) {
  if (!NUVEM_ATIVA || !usuario || !navigator.onLine || storageFunciona === false) return dataUrl;
  try {
    const blob = dataUrlParaBlob(dataUrl);
    const caminho = `${usuario.id}/${novoId()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
    const envio = await sb.storage.from(BUCKET_IMAGENS).upload(caminho, blob, { contentType: blob.type });
    if (envio.error) throw envio.error;
    const link = await sb.storage.from(BUCKET_IMAGENS).createSignedUrl(caminho, VALIDADE_LINK);
    if (link.error) throw link.error;
    storageFunciona = true;
    return link.data.signedUrl;
  } catch {
    storageFunciona = false;
    return dataUrl;
  }
}

async function migrarImagens() {
  if (!NUVEM_ATIVA || !usuario || !navigator.onLine) return;
  const anexos = [];
  const textos = [];
  const visitar = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(visitar); return; }
    if (obj.tipo === 'imagem' && typeof obj.url === 'string' && obj.url.startsWith('data:image')) anexos.push(obj);
    Object.entries(obj).forEach(([k, v]) => {
      if (k === 'lixeira') return;
      if (typeof v === 'string' && v.includes('src="data:image')) textos.push([obj, k]);
      else if (v && typeof v === 'object') visitar(v);
    });
  };
  visitar(estado);
  if (!anexos.length && !textos.length) return;

  let mudou = false;
  for (const a of anexos) {
    const url = await guardarImagem(a.url);
    if (storageFunciona === false) return;
    a.url = url;
    mudou = true;
  }
  for (const [obj, k] of textos) {
    const achados = [...obj[k].matchAll(/src="(data:image[^"]+)"/g)].map((m) => m[1]);
    let html = obj[k];
    for (const d of achados) {
      const url = await guardarImagem(d);
      if (storageFunciona === false) break;
      html = html.split(d).join(url);
      mudou = true;
    }
    obj[k] = html;
  }
  if (mudou) { salvar(); desenhar(); }
}
