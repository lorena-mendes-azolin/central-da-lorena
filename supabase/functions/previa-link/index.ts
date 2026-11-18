import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

async function buscar(url: URL, aceitar: string, limite: number, agente = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36') {
  let atual = url;
  for (let i = 0; i < 5; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(atual, {
      redirect: 'manual', signal: ctrl.signal,
      headers: {
        'User-Agent': agente,
        'Accept': aceitar, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
      },
    }).finally(() => clearTimeout(t));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const prox = urlSegura(new URL(r.headers.get('location')!, atual).href);
      if (!prox) throw new Error('redirecionamento bloqueado');
      atual = prox;
      continue;
    }
    const leitor = r.body?.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    while (leitor) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > limite) { await leitor.cancel(); break; }
      partes.push(value);
    }
    const bytes = new Uint8Array(total > limite ? partes.reduce((s, p) => s + p.length, 0) : total);
    let pos = 0;
    for (const p of partes) { bytes.set(p, pos); pos += p.length; }
    return { resp: r, bytes, final: atual };
  }
  throw new Error('muitos redirecionamentos');
}

const decodificar = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();

function meta(html: string, nomes: string[]) {
  for (const n of nomes) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, 'i');
    const m = html.match(re1) || html.match(re2);
    if (m) return decodificar(m[1]);
  }
  return '';
}

function produtoJsonLd(html: string) {
  const blocos = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const achar = (o: any): any => {
    if (!o || typeof o !== 'object') return null;
    if (Array.isArray(o)) { for (const x of o) { const r = achar(x); if (r) return r; } return null; }
    const tipo = [].concat(o['@type'] || []).join(',');
    if (/Product/i.test(tipo)) return o;
    return achar(o['@graph']) || null;
  };
  for (const b of blocos) {
    try { const p = achar(JSON.parse(b.trim())); if (p) return p; } catch { }
  }
  return null;
}

function precoDe(v: unknown) {
  if (v === undefined || v === null || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: quem } = await sb.auth.getUser(token);
  if (!quem.user) return json({ erro: 'sem login' }, 401);

  const { url } = await req.json().catch(() => ({}));
  const alvo = urlSegura(String(url || ''));
  if (!alvo) return json({ erro: 'link inválido' }, 400);

  let html = '';
  let final = alvo;
  try {
    const r = await buscar(alvo, 'text/html,application/xhtml+xml', 1_500_000);
    final = r.final;
    html = new TextDecoder('utf-8').decode(r.bytes);
  } catch (e) {
    return json({ erro: `não consegui abrir a página (${(e as Error).message})` }, 200);
  }

  if (!/og:image/i.test(html)) {
    try {
      const r2 = await buscar(alvo, 'text/html,application/xhtml+xml', 1_500_000, 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');
      const h2 = new TextDecoder('utf-8').decode(r2.bytes);
      if (/og:image/i.test(h2)) { html = h2; final = r2.final; }
    } catch { }
  }

  const prod = produtoJsonLd(html);
  const oferta = prod ? [].concat(prod.offers || [])[0] : null;
  const titulo = meta(html, ['og:title', 'twitter:title']) || (prod?.name ? String(prod.name) : '') || decodificar((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
  let imagem = meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image']);
  if (!imagem && prod?.image) imagem = String([].concat(prod.image)[0]?.url || [].concat(prod.image)[0]);
  if (!imagem) imagem = (html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '';
  const preco = precoDe(meta(html, ['product:price:amount', 'og:price:amount', 'price'])) || precoDe(oferta?.price ?? oferta?.lowPrice) || '';
  const moeda = meta(html, ['product:price:currency', 'og:price:currency', 'priceCurrency']) || oferta?.priceCurrency || '';
  const loja = meta(html, ['og:site_name']) || final.hostname.replace(/^www\./, '');

  let foto = '';
  const urlImg = imagem ? urlSegura(new URL(decodificar(imagem), final).href) : null;
  if (urlImg) {
    try {
      const r = await buscar(urlImg, 'image/*', 4_000_000);
      const tipo = (r.resp.headers.get('content-type') || '').split(';')[0];
      if (r.resp.ok && tipo.startsWith('image/') && r.bytes.length > 500 && r.bytes.length < 4_000_000) {
        const ext = (tipo.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z]/g, '');
        const caminho = `${quem.user.id}/produto-${Date.now()}.${ext}`;
        const up = await sb.storage.from('imagens').upload(caminho, r.bytes, { contentType: tipo, upsert: false });
        if (!up.error) {
          const assinada = await sb.storage.from('imagens').createSignedUrl(caminho, 60 * 60 * 24 * 365 * 10);
          foto = assinada.data?.signedUrl || '';
        }
      }
    } catch { }
    if (!foto) foto = urlImg.href;
  }

  return json({ titulo: titulo.slice(0, 160), foto, preco, moeda, loja: loja.slice(0, 60), url: final.href });
});
