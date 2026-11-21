// Copia uma imagem da internet para o storage, quando a pessoa cola o ENDEREÇO de uma imagem nos detalhes do item.
// - { acao: 'salvar', url } -> baixa a imagem (com proteção contra endereços internos) e guarda no bucket "imagens"
// Precisa estar logado (token do usuário). verify_jwt false: a função confere o usuário sozinha.
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------- segurança do endereço (igual à previa-link) ----------
function enderecoProibido(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}
function urlSegura(texto: string) {
  try {
    const u = new URL(texto);
    if (!['http:', 'https:'].includes(u.protocol) || enderecoProibido(u.hostname) || (u.port && !['80', '443'].includes(u.port))) return null;
    return u;
  } catch { return null; }
}

async function baixarImagem(url: URL) {
  let atual = url;
  for (let i = 0; i < 5; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(atual, {
      redirect: 'manual', signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept': 'image/*' },
    }).finally(() => clearTimeout(t));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const prox = urlSegura(new URL(r.headers.get('location')!, atual).href);
      if (!prox) throw new Error('redirecionamento bloqueado');
      atual = prox;
      continue;
    }
    const tipo = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!r.ok || !tipo.startsWith('image/') || tipo === 'image/svg+xml') { await r.body?.cancel(); throw new Error('não é uma imagem'); }
    const leitor = r.body!.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > 5_000_000) { await leitor.cancel(); throw new Error('imagem grande demais'); }
      partes.push(value);
    }
    const bytes = new Uint8Array(total);
    let pos = 0;
    for (const p of partes) { bytes.set(p, pos); pos += p.length; }
    if (bytes.length < 300) throw new Error('imagem vazia');
    return { bytes, tipo };
  }
  throw new Error('muitos redirecionamentos');
}

async function salvar(usuario: string, url: string) {
  const alvo = urlSegura(url);
  if (!alvo) return json({ erro: 'endereço inválido' }, 400);
  let img;
  try { img = await baixarImagem(alvo); } catch (e) { return json({ erro: `não consegui baixar a imagem (${(e as Error).message})` }); }
  const ext = (img.tipo.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z]/g, '') || 'jpg';
  const caminho = `${usuario}/busca-${Date.now()}.${ext}`;
  const up = await sb.storage.from('imagens').upload(caminho, img.bytes, { contentType: img.tipo, upsert: false });
  if (up.error) return json({ erro: 'não consegui guardar a imagem' });
  const assinada = await sb.storage.from('imagens').createSignedUrl(caminho, 60 * 60 * 24 * 365 * 10);
  return json({ foto: assinada.data?.signedUrl || '' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: quem } = await sb.auth.getUser(token);
  if (!quem.user) return json({ erro: 'sem login' }, 401);
  const corpo = await req.json().catch(() => ({}));
  if (corpo?.acao === 'salvar') return salvar(quem.user.id, String(corpo.url || ''));
  return json({ erro: 'ação desconhecida' }, 400);
});
