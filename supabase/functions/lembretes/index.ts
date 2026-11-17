import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const limpar = (v?: string) => (v || '').replace(/^VAPID_\w+/, '').replace(/[\s"'=]/g, '');
const VAPID_PUBLICA = limpar(Deno.env.get('VAPID_PUBLICA'));
const VAPID_PRIVADA = limpar(Deno.env.get('VAPID_PRIVADA'));
const contato = (Deno.env.get('VAPID_CONTATO') || '').trim();
const VAPID_CONTATO = /^(mailto:|https:)/.test(contato) ? contato : contato.includes('@') ? `mailto:${contato}` : 'mailto:avisos@example.com';

let erroChaves = '';
try {
  webpush.setVapidDetails(VAPID_CONTATO, VAPID_PUBLICA, VAPID_PRIVADA);
} catch (e) {
  erroChaves = `${(e as Error).message} (publica: ${VAPID_PUBLICA.length} caracteres, privada: ${VAPID_PRIVADA.length} caracteres)`;
  console.error('Chaves VAPID com problema:', erroChaves);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Tarefa = { id: string; titulo: string; data?: string; hora?: string; lembrete?: number; feito?: boolean };

function offsetMin(fuso: string, quando: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(quando);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const local = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  return Math.round((local - quando.getTime()) / 60000);
}

function momentoDoAviso(t: Tarefa, fuso: string) {
  const [h, m] = (t.hora || '08:00').split(':').map(Number);
  const [a, mes, d] = t.data!.split('-').map(Number);
  const comoUtc = Date.UTC(a, mes - 1, d, h, m);
  const off = offsetMin(fuso, new Date(comoUtc));
  return comoUtc - off * 60000 - (t.lembrete || 0) * 60000;
}

function textoQuando(t: Tarefa, fuso: string) {
  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: fuso }).format(new Date());
  const amanha = new Intl.DateTimeFormat('sv-SE', { timeZone: fuso }).format(new Date(Date.now() + 86400000));
  const dia = t.data === hoje ? 'hoje' : t.data === amanha ? 'amanhã' : t.data!.split('-').reverse().slice(0, 2).join('/');
  return t.hora ? `${dia} às ${t.hora}` : dia;
}

async function enviar(userId: string, titulo: string, corpo: string, tag: string) {
  const { data: inscricoes } = await sb.from('push_inscricoes').select('endpoint, inscricao').eq('user_id', userId);
  let enviados = 0;
  for (const i of inscricoes || []) {
    try {
      await webpush.sendNotification(i.inscricao, JSON.stringify({ titulo, corpo, tag, url: './index.html#agenda' }), { TTL: 3600 });
      enviados++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await sb.from('push_inscricoes').delete().eq('endpoint', i.endpoint);
    }
  }
  return enviados;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const corpo = await req.json().catch(() => ({}));
  if (erroChaves) return new Response(JSON.stringify({ erro: erroChaves }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (corpo.teste) {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data } = await sb.auth.getUser(token);
    if (!data.user) return new Response(JSON.stringify({ erro: 'sem login' }), { status: 401, headers: CORS });
    const n = await enviar(data.user.id, 'Teste de aviso', 'Os avisos com o site fechado estão funcionando!', 'teste');
    return new Response(JSON.stringify({ enviados: n }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const { data: inscritos } = await sb.from('push_inscricoes').select('user_id');
  const usuarios = [...new Set((inscritos || []).map((x) => x.user_id))];
  const agora = Date.now();
  let total = 0;

  for (const userId of usuarios) {
    const { data: linha } = await sb.from('central_dados').select('dados').eq('user_id', userId).maybeSingle();
    const dados = linha?.dados || {};
    const fuso = dados.config?.fuso || 'America/Sao_Paulo';
    const avisados = dados.avisados || {};
    const tarefas: Tarefa[] = (dados.tarefas || []).filter((t: Tarefa) => !t.feito && t.data && (t.lembrete ?? -1) >= 0);
    for (const t of tarefas) {
      const chave = `${t.id}|${t.data}`;
      if (avisados[chave]) continue;
      const quando = momentoDoAviso(t, fuso);
      if (quando > agora || agora - quando > 15 * 60000) continue;
      const { error } = await sb.from('push_enviados').insert({ user_id: userId, chave });
      if (error) continue;
      total += await enviar(userId, t.titulo, textoQuando(t, fuso), chave);
    }
  }
  await sb.from('push_enviados').delete().lt('enviado_em', new Date(agora - 3 * 86400000).toISOString());
  return new Response(JSON.stringify({ usuarios: usuarios.length, enviados: total }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
});
