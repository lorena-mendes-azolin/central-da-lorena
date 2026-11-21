// Robô de preços das Compras.
// - Agendado (pg_cron, de hora em hora): confere os itens com link que não foram conferidos nas últimas 20h.
// - Manual (botão "Conferir preços agora"): confere só os itens de quem chamou (precisa estar logado).
// Grava o resultado na tabela compras_precos; o site lê essa tabela e atualiza os itens.
// Não mexe nos dados do usuário (central_partes), só lê.
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const POR_VEZ = 40;          // máximo de links por execução
const JUNTOS = 5;            // quantos links abre ao mesmo tempo
const INTERVALO_AUTO = 20 * 3600_000;   // agendado: confere de novo depois de 20h
const INTERVALO_MANUAL = 10 * 60_000;   // botão: não repete o mesmo link em menos de 10 min
const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ROBO_FB = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

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

async function baixarPagina(url: URL, agente: string) {
  let atual = url;
  for (let i = 0; i < 5; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(atual, {
      redirect: 'manual', signal: ctrl.signal,
      headers: { 'User-Agent': agente, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7' },
    }).finally(() => clearTimeout(t));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const prox = urlSegura(new URL(r.headers.get('location')!, atual).href);
      if (!prox) throw new Error('redirecionamento bloqueado');
      atual = prox;
      continue;
    }
    if (!r.ok) { await r.body?.cancel(); throw new Error('status ' + r.status); }
    const leitor = r.body?.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    while (leitor) {
      const { done, value } = await leitor.read();
      if (done) break;
      partes.push(value);
      total += value.length;
      if (total > 1_500_000) { await leitor.cancel(); break; }
    }
    const bytes = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
    let pos = 0;
    for (const p of partes) { bytes.set(p, pos); pos += p.length; }
    return new TextDecoder('utf-8').decode(bytes);
  }
  throw new Error('muitos redirecionamentos');
}

// ---------- leitura da página ----------
const decodificar = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

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
    try { const p = achar(JSON.parse(b.trim())); if (p) return p; } catch { /* bloco inválido */ }
  }
  return null;
}

function precoDe(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const ESGOTADO = /OutOfStock|SoldOut|Discontinued|out[ _-]?of[ _-]?stock|^oos$/i;
const DISPONIVEL = /InStock|LimitedAvailability|OnlineOnly|PreOrder|BackOrder|in[ _-]?stock/i;

function lerPagina(html: string) {
  const prod = produtoJsonLd(html);
  const ofertas: any[] = prod ? [].concat(prod.offers || []).flatMap((o: any) => (o?.offers ? [].concat(o.offers) : [o])) : [];
  const preco = precoDe(meta(html, ['product:price:amount', 'og:price:amount', 'price']))
    ?? precoDe(ofertas[0]?.price ?? ofertas[0]?.lowPrice ?? ofertas[0]?.priceSpecification?.price);

  // estoque: primeiro pelos dados estruturados da página
  const disp = [...ofertas.map((o) => String(o?.availability || '')), meta(html, ['product:availability', 'og:availability', 'availability'])].filter(Boolean);
  let esgotado: boolean | null = null;
  if (disp.length) {
    if (disp.some((d) => DISPONIVEL.test(d))) esgotado = false;
    else if (disp.every((d) => ESGOTADO.test(d))) esgotado = true;
  }
  // sem dado estruturado e sem preço: procura a palavra na página
  if (esgotado === null && preco === null) {
    const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    if (/produto\s+esgotado|produto\s+indispon[ií]vel|fora\s+de\s+estoque|esgotado\s+no\s+momento|indispon[ií]vel\s+no\s+momento/i.test(texto)) esgotado = true;
  }
  return { preco, esgotado };
}

async function conferir(link: string): Promise<{ preco: number | null; situacao: 'ok' | 'esgotado' | 'falhou' }> {
  const alvo = urlSegura(link);
  if (!alvo) return { preco: null, situacao: 'falhou' };
  let r = { preco: null as number | null, esgotado: null as boolean | null };
  try { r = lerPagina(await baixarPagina(alvo, NAVEGADOR)); } catch { /* tenta de novo abaixo */ }
  if (r.preco === null && r.esgotado === null) {
    try { r = lerPagina(await baixarPagina(alvo, ROBO_FB)); } catch { /* site bloqueou */ }
  }
  if (r.esgotado) return { preco: r.preco, situacao: 'esgotado' };
  if (r.preco !== null) return { preco: r.preco, situacao: 'ok' };
  return { preco: null, situacao: 'falhou' };
}

// ---------- quais itens conferir ----------
type Alvo = { user_id: string; lista_id: string; item_id: string; link: string; ultimo: number };

function linkDoItem(i: any) {
  return String(i?.link || ([].concat(i?.anexos || []) as any[]).find((a) => a?.tipo === 'link')?.url || '').trim();
}

async function itensParaConferir(usuario: string | null, intervalo: number): Promise<Alvo[]> {
  let q = sb.from('central_partes').select('user_id, dados').eq('chave', 'listas');
  if (usuario) q = q.eq('user_id', usuario);
  const { data: partes, error } = await q;
  if (error) throw error;
  let q2 = sb.from('compras_precos').select('user_id, lista_id, item_id, link, verificado_em');
  if (usuario) q2 = q2.eq('user_id', usuario);
  const { data: feitos } = await q2;
  const ultimo = new Map((feitos || []).map((f: any) => [`${f.user_id}|${f.lista_id}|${f.item_id}`, f]));

  const agora = Date.now();
  const alvos: Alvo[] = [];
  for (const p of partes || []) {
    for (const l of [].concat(p.dados || []) as any[]) {
      if (l?.tipo !== 'compras') continue;
      for (const i of [].concat(l.itens || []) as any[]) {
        const link = linkDoItem(i);
        if (!link || i.comprado || !i.id) continue;
        const f: any = ultimo.get(`${p.user_id}|${l.id}|${i.id}`);
        const quando = f && f.link === link ? new Date(f.verificado_em).getTime() : 0; // link trocado = conferir de novo
        if (agora - quando < intervalo) continue;
        alvos.push({ user_id: p.user_id, lista_id: l.id, item_id: i.id, link, ultimo: quando });
      }
    }
  }
  return alvos.sort((a, b) => a.ultimo - b.ultimo).slice(0, POR_VEZ);
}

async function rodar(alvos: Alvo[]) {
  const resultados: any[] = [];
  let pos = 0;
  const trabalhador = async () => {
    while (pos < alvos.length) {
      const a = alvos[pos++];
      const r = await conferir(a.link);
      resultados.push({ user_id: a.user_id, lista_id: a.lista_id, item_id: a.item_id, link: a.link, preco: r.preco, situacao: r.situacao, verificado_em: new Date().toISOString() });
    }
  };
  await Promise.all(Array.from({ length: JUNTOS }, trabalhador));
  if (resultados.length) {
    const { error } = await sb.from('compras_precos').upsert(resultados, { onConflict: 'user_id,lista_id,item_id' });
    if (error) throw error;
    // Histórico: um ponto por dia (horário de Brasília); se conferir duas vezes no dia, fica o último
    const dia = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
    const hist = resultados.filter((r) => r.situacao !== 'falhou')
      .map((r) => ({ user_id: r.user_id, lista_id: r.lista_id, item_id: r.item_id, dia, preco: r.preco, situacao: r.situacao, verificado_em: r.verificado_em }));
    if (hist.length) await sb.from('compras_precos_historico').upsert(hist, { onConflict: 'user_id,lista_id,item_id,dia' });
  }
  return resultados;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const corpo = await req.json().catch(() => ({}));
  try {
    if (corpo?.modo === 'agendado') {
      // Sem login: só confere o que já passou de 20h, então chamar várias vezes não faz nada a mais.
      const r = await rodar(await itensParaConferir(null, INTERVALO_AUTO));
      return json({ conferidos: r.length });
    }
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: quem } = await sb.auth.getUser(token);
    if (!quem.user) return json({ erro: 'sem login' }, 401);
    const r = await rodar(await itensParaConferir(quem.user.id, INTERVALO_MANUAL));
    return json({
      conferidos: r.length,
      ok: r.filter((x) => x.situacao === 'ok').length,
      esgotados: r.filter((x) => x.situacao === 'esgotado').length,
      falharam: r.filter((x) => x.situacao === 'falhou').length,
    });
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
