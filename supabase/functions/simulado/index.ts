// Gera um simulado de múltipla escolha a partir de UM caderno, usando o Gemini.
// O caderno é dividido em partes de até 40 mil letras (para a IA não se perder em texto grande).
// Em cada parte: passo 1 gera as questões presas ao texto; passo 2 outra chamada responde às cegas
// e descarta as questões em que o gabarito não bate ou que ficaram ambíguas.
// Usa a chave do próprio usuário (tabela ia_chaves) se ele tiver; senão a chave do site, com limite diário.
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CHAVE_SITE = Deno.env.get('GEMINI_API_KEY') || '';
const MODELO = Deno.env.get('GEMINI_MODELO') || 'gemini-flash-latest';
const LIMITE_DIA = Number(Deno.env.get('SIMULADO_LIMITE') || 5);
const MAX_TEXTO = 100000;
const TAM_PARTE = 40000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

class ErroIA extends Error { constructor(msg: string, public chaveRuim = false) { super(msg); } }

async function gemini(chave: string, sistema: string, texto: string, schema: unknown, tentativa = 0): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  let r: Response;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: 'user', parts: [{ text: texto }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: schema },
      }),
    });
  } catch {
    throw new ErroIA('A IA demorou demais para responder. Tente de novo.');
  } finally { clearTimeout(t); }
  if ((r.status === 429 || r.status === 503) && tentativa === 0) {
    await new Promise((ok) => setTimeout(ok, 4000));
    return gemini(chave, sistema, texto, schema, 1);
  }
  if (!r.ok) {
    const corpo = await r.text().catch(() => '');
    if (r.status === 400 && /API_KEY_INVALID|API key not valid/i.test(corpo)) throw new ErroIA('A chave do Gemini não é válida.', true);
    if (r.status === 403) throw new ErroIA('A chave do Gemini não tem permissão para usar a IA.', true);
    if (r.status === 429) throw new ErroIA('A cota grátis do Gemini acabou por agora. Tente mais tarde.');
    throw new ErroIA(`A IA respondeu com erro (${r.status}).`);
  }
  const d = await r.json();
  const partes = d?.candidates?.[0]?.content?.parts || [];
  const saida = partes.filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
  try { return JSON.parse(saida); } catch { throw new ErroIA('A IA devolveu uma resposta em formato estranho. Tente de novo.'); }
}

const SCHEMA_GERAR = {
  type: 'OBJECT',
  properties: {
    questoes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          enunciado: { type: 'STRING' },
          alternativas: { type: 'ARRAY', items: { type: 'STRING' } },
          correta: { type: 'INTEGER', description: 'índice (0 a 3) da alternativa correta' },
          explicacao: { type: 'STRING', description: 'por que a correta está certa, em 1 a 3 frases' },
          pagina: { type: 'STRING', description: 'título da página do caderno de onde veio' },
          trecho: { type: 'STRING', description: 'trecho copiado LITERALMENTE do caderno que justifica a resposta' },
          complemento: { type: 'STRING', description: 'informação extra que NÃO está no caderno, se usou; senão vazio' },
        },
        required: ['enunciado', 'alternativas', 'correta', 'explicacao', 'pagina', 'trecho'],
      },
    },
  },
  required: ['questoes'],
};

const SCHEMA_CONFERIR = {
  type: 'OBJECT',
  properties: {
    respostas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          numero: { type: 'INTEGER' },
          resposta: { type: 'INTEGER', description: 'índice (0 a 3) da alternativa correta segundo o texto, ou -1 se o texto não permite responder' },
          ambigua: { type: 'BOOLEAN', description: 'true se mais de uma alternativa pode ser considerada correta ou o enunciado é confuso' },
        },
        required: ['numero', 'resposta', 'ambigua'],
      },
    },
  },
  required: ['respostas'],
};

const SISTEMA_GERAR = `Você cria questões de múltipla escolha em português do Brasil para um estudante revisar para a prova.
Regras obrigatórias:
- Use SOMENTE o conteúdo do caderno enviado. Cada questão precisa poder ser respondida só com o caderno.
- Exatamente 4 alternativas por questão, só UMA correta. As erradas devem ser plausíveis, mas claramente erradas segundo o caderno.
- Não use "todas as anteriores", "nenhuma das anteriores" nem pegadinhas de palavra.
- Varie os assuntos: espalhe as questões por todo o caderno, não só pelo começo.
- Em "trecho", copie literalmente (sem mudar nenhuma palavra) um pedaço curto do caderno que prova a resposta.
- Em "pagina", coloque o título exato da página de onde tirou.
- Se a explicação precisar de algo que não está no caderno, coloque essa parte em "complemento". Senão, deixe vazio.
- Se o caderno tiver algo que parece errado, não crie questão sobre isso.`;

const SISTEMA_CONFERIR = `Você é um revisor de provas. Responda a cada questão usando SOMENTE o texto do caderno enviado.
Não use conhecimento de fora. Se o caderno não permite ter certeza da resposta, responda -1.
Marque "ambigua" como true se mais de uma alternativa puder ser defendida como correta ou se o enunciado for confuso.`;

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function embaralhar<T>(lista: T[]) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Divide as páginas em partes de até TAM_PARTE letras. Página muito grande é cortada em parágrafos.
function dividir(paginas: { titulo: string; texto: string }[]) {
  const blocos: string[] = [];
  for (const p of paginas) {
    const cab = `### Página: ${p.titulo}\n`;
    if (cab.length + p.texto.length <= TAM_PARTE) { blocos.push(cab + p.texto); continue; }
    let atual = '';
    for (const par of p.texto.split(/\n+/)) {
      const pedacos = par.length > TAM_PARTE - cab.length ? par.match(new RegExp(`[\\s\\S]{1,${TAM_PARTE - cab.length - 10}}`, 'g'))! : [par];
      for (const pd of pedacos) {
        if (atual && atual.length + pd.length + 1 > TAM_PARTE - cab.length) { blocos.push(cab + atual); atual = ''; }
        atual += (atual ? '\n' : '') + pd;
      }
    }
    if (atual) blocos.push(cab + atual);
  }
  const partes: string[] = [];
  let atual = '';
  for (const b of blocos) {
    if (atual && atual.length + b.length + 2 > TAM_PARTE) { partes.push(atual); atual = ''; }
    atual += (atual ? '\n\n' : '') + b;
  }
  if (atual) partes.push(atual);
  // Sobra muito pequena no fim vai junto com a parte anterior (até 20% acima do tamanho).
  while (partes.length > 1) {
    const n = partes.length;
    if (partes[n - 1].length < TAM_PARTE * 0.25 && partes[n - 2].length + partes[n - 1].length <= TAM_PARTE * 1.2) partes.splice(n - 2, 2, partes[n - 2] + '\n\n' + partes[n - 1]);
    else break;
  }
  return partes;
}

// Reparte as questões entre as partes, proporcional ao tamanho (pelo menos 1 em cada, se der).
function repartir(qtd: number, tamanhos: number[]) {
  const total = tamanhos.reduce((a, b) => a + b, 0);
  const cotas = tamanhos.map((t) => Math.max(1, Math.floor((qtd * t) / total)));
  let soma = cotas.reduce((a, b) => a + b, 0);
  const ordem = tamanhos.map((t, i) => ({ i, resto: (qtd * t) / total - cotas[i] })).sort((a, b) => b.resto - a.resto);
  for (let k = 0; soma < qtd; k = (k + 1) % ordem.length) { cotas[ordem[k].i]++; soma++; }
  for (let k = cotas.length - 1; soma > qtd && k >= 0; k--) { if (cotas[k] > 1) { cotas[k]--; soma--; } }
  return cotas;
}

const valida = (q: any) => q && typeof q.enunciado === 'string' && q.enunciado.trim() && Array.isArray(q.alternativas) && q.alternativas.length === 4
  && q.alternativas.every((a: unknown) => typeof a === 'string' && a.trim())
  && new Set(q.alternativas.map((a: string) => normalizar(a))).size === 4
  && Number.isInteger(q.correta) && q.correta >= 0 && q.correta <= 3;

// Gera e confere as questões de UMA parte do caderno.
async function questoesDaParte(chave: string, materia: string, texto: string, quer: number) {
  const pedir = quer + Math.max(2, Math.ceil(quer * 0.4));
  const gerado = await gemini(chave, SISTEMA_GERAR,
    `Matéria: ${materia || '(sem nome)'}\nCrie ${pedir} questões.\n\nCADERNO:\n${texto}`, SCHEMA_GERAR);
  const questoes = (gerado?.questoes || []).filter(valida);
  if (!questoes.length) return { boas: [], geradas: 0 };
  // Conferência às cegas: outra chamada responde sem ver o gabarito.
  const prova = questoes.map((q: any, i: number) => `${i + 1}. ${q.enunciado}\n${q.alternativas.map((a: string, j: number) => `   (${j}) ${a}`).join('\n')}`).join('\n\n');
  const conf = await gemini(chave, SISTEMA_CONFERIR, `CADERNO:\n${texto}\n\nQUESTÕES:\n${prova}`, SCHEMA_CONFERIR);
  const mapa = new Map<number, any>((conf?.respostas || []).map((r: any) => [Number(r.numero), r]));
  const boas = questoes.filter((q: any, i: number) => {
    const r = mapa.get(i + 1);
    return r && !r.ambigua && Number(r.resposta) === q.correta;
  });
  return { boas, geradas: questoes.length };
}

async function chaveDoUsuario(uid: string) {
  const { data } = await sb.from('ia_chaves').select('gemini').eq('user_id', uid).maybeSingle();
  return (data?.gemini || '').trim();
}

async function usadosHoje(uid: string) {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const { data } = await sb.from('simulado_uso').select('qtd').eq('user_id', uid).eq('dia', hoje).maybeSingle();
  return data?.qtd || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: quem } = await sb.auth.getUser(token);
  if (!quem.user) return json({ erro: 'Faça login de novo para usar o simulado.' }, 401);
  const uid = quem.user.id;

  const corpo = await req.json().catch(() => ({}));
  const chavePropria = await chaveDoUsuario(uid);

  if (corpo.acao === 'status') {
    return json({ chavePropria: Boolean(chavePropria), chaveSite: Boolean(CHAVE_SITE), usados: await usadosHoje(uid), limite: LIMITE_DIA });
  }

  const materia = String(corpo.materia || '').slice(0, 120);
  const qtd = [5, 10, 15].includes(Number(corpo.qtd)) ? Number(corpo.qtd) : 10;
  const paginas = (Array.isArray(corpo.paginas) ? corpo.paginas : [])
    .map((p: any) => ({ titulo: String(p?.titulo || 'Sem título').slice(0, 120), texto: String(p?.texto || '') }))
    .filter((p: any) => p.texto.trim());
  let total = 0;
  const dentro: { titulo: string; texto: string }[] = [];
  for (const p of paginas) {
    if (total >= MAX_TEXTO) break;
    const texto = p.texto.slice(0, MAX_TEXTO - total);
    dentro.push({ titulo: p.titulo, texto });
    total += texto.length;
  }
  if (total < 300) return json({ erro: 'Esse caderno tem pouco texto para gerar um simulado. Escreva mais nas páginas e tente de novo.' });
  const cortado = paginas.reduce((a: number, p: any) => a + p.texto.length, 0) > MAX_TEXTO;
  const partes = dividir(dentro);

  const usarSite = !chavePropria;
  if (usarSite && !CHAVE_SITE) return json({ erro: 'Para gerar simulados, coloque a sua chave do Gemini (é grátis).', precisaChave: true });
  if (usarSite) {
    const { data: nova, error } = await sb.rpc('usar_simulado', { uid, limite: LIMITE_DIA });
    if (error) return json({ erro: 'Não consegui conferir o limite do dia. Tente de novo.' });
    if (nova === null) return json({ erro: `Você já gerou ${LIMITE_DIA} simulados hoje com a IA do site. Coloque a sua chave do Gemini (grátis) para gerar mais.`, limite: true });
  }
  const chave = chavePropria || CHAVE_SITE;

  try {
    const cotas = repartir(qtd, partes.map((p) => p.length));
    const resultados = await Promise.allSettled(partes.map((texto, i) => questoesDaParte(chave, materia, texto, cotas[i])));
    const ok = resultados.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ boas: any[]; geradas: number }>[];
    if (!ok.length) throw (resultados[0] as PromiseRejectedResult).reason;
    const geradas = ok.reduce((a, r) => a + r.value.geradas, 0);
    if (!geradas) throw new ErroIA('A IA não conseguiu criar questões com esse caderno. Tente de novo.');

    // Junta: primeiro a cota de cada parte, depois completa com as que sobraram.
    const listas = resultados.map((r) => (r.status === 'fulfilled' ? [...r.value.boas] : []));
    const escolhidas: any[] = [];
    listas.forEach((l, i) => escolhidas.push(...l.splice(0, cotas[i])));
    for (const l of listas) while (escolhidas.length < qtd && l.length) escolhidas.push(l.shift());
    if (!escolhidas.length) throw new ErroIA('Nenhuma questão passou na conferência. Tente gerar de novo.');

    const textoNorm = normalizar(partes.join('\n'));
    const saida = escolhidas.slice(0, qtd).map((q: any) => {
      const certa = q.alternativas[q.correta];
      const alternativas = embaralhar(q.alternativas as string[]);
      const trecho = String(q.trecho || '').trim();
      const trechoOk = trecho.length >= 8 && textoNorm.includes(normalizar(trecho));
      return {
        enunciado: q.enunciado.trim(),
        alternativas,
        correta: alternativas.indexOf(certa),
        explicacao: String(q.explicacao || '').trim(),
        pagina: String(q.pagina || '').trim(),
        trecho: trechoOk ? trecho : '',
        complemento: String(q.complemento || '').trim(),
      };
    });

    return json({ questoes: saida, descartadas: geradas - ok.reduce((a, r) => a + r.value.boas.length, 0), partes: partes.length, partesFalharam: resultados.length - ok.length, chavePropria: !usarSite, cortado });
  } catch (e) {
    if (usarSite) await sb.rpc('devolver_simulado', { uid });
    const erro = e instanceof ErroIA ? e : new ErroIA('Algo deu errado ao gerar o simulado. Tente de novo.');
    if (erro.chaveRuim && usarSite) return json({ erro: 'A IA do site está indisponível agora. Você pode usar a sua própria chave do Gemini.' });
    return json({ erro: erro.message, chaveRuim: erro.chaveRuim });
  }
});
