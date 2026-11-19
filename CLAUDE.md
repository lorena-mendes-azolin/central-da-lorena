# Central — instruções para o Claude

Site pessoal de produtividade ("Central"): agenda, rotina/hábitos, listas, faculdade/cursos, metas,
bem-estar, treino, pets, finanças, flashcards etc. Feito por uma estudante de ADS; **responder sempre em português**,
com explicações simples e diretas.

> Este repositório é **público**. Não coloque aqui (nem em nenhum arquivo versionado) chaves secretas,
> e-mails ou dados pessoais.

## Como o projeto roda

- HTML + CSS + JavaScript puro, **sem build, sem framework, sem npm**. Abrir `index.html` já funciona.
- Publicado no **GitHub Pages**: https://lorena-mendes-azolin.github.io/central-da-lorena/
- Fluxo de publicação: editar os arquivos na pasta do PC → **GitHub Desktop (Commit + Push)** → esperar 1–2 min →
  F5 no PC; no celular fechar e abrir o site.
- Backend: **Supabase** (projeto `slevkhjdgtbrqjxjllha`). Em `js/config.js` vai **só a chave publicável**.
  Nunca usar Secret/service_role no site.
- `segredos/` está no `.gitignore` (chave privada VAPID dos avisos). Os segredos das edge functions ficam no painel do Supabase.

## Regras do produto

- **Nada personalizado só para a dona do site como padrão.** Tudo deve ser configurável por usuário
  (o site tem login e pode ser usado por outras pessoas). Dados de exemplo podem ser apagados pelo usuário.
- Toda página que "entra" em outra (matéria, meta, lixeira, dia antigo do diário…) precisa de **botão de voltar**
  (`<a class="voltar">`).
- Listas que podem crescer muito precisam de rolagem (`.lista-rolavel`) no Dashboard.
- Vínculos com hábitos são sempre opcionais (componente `htmlVinculo(alvo, texto)` em `js/modulos.js`).
- Layout precisa funcionar no **PC (~1400px) e no celular (~390px)**.

## Arquitetura (js/)

- `index.html` carrega todos os scripts em ordem; todos compartilham o escopo global.
  **Cuidado com nomes repetidos**: duas `function` ou `const` com o mesmo nome em arquivos diferentes quebram o site
  (já aconteceu com `dinheiro` e `itemDe`). Antes de criar função global, procure se o nome já existe.
- Registros globais:
  - `PAGINAS.nome = { titulo, desenhar() }` — rota pelo hash (`#agenda`, `#lista-<id>`, `#lista-<id>--<subid>`).
  - `ACOES['x']` ← `data-acao="x"` (clique), `MUDAR['x']` ← `data-mudar` (change), `DIGITAR['x']` ← `data-digitar`,
    `FORMS['x'] = (d, form)` ← `data-form`.
  - `desenhar()` redesenha a página atual (e preserva a rolagem das listas).
- Dados: objeto `estado` (salvo em localStorage na chave `CHAVE`). `salvar()` grava local e manda para a nuvem.
  `completar()` em `dados.js` preenche campos novos e faz **migrações** — toda mudança de formato de dados
  precisa de migração ali, com ids fixos para dois aparelhos migrarem igual.
- `acharRef('lista/sub/tipo/id')` acha qualquer objeto pelo caminho.
- `seletor.js` transforma `<select>` em menu bonito (com busca quando há mais de 7 opções).
- `sw.js` é o service worker: **ao mudar arquivos, aumentar a versão do cache** (`central-vNN`) e, se criar
  arquivo novo, colocar na lista dele e no `index.html`.

## Sincronização (nuvem.js) — parte sensível

- Tabelas: `central_dados` (principal), `central_partes` (uma linha por parte: listas, diario, treino, pets,
  flashcards, financas, jejum, appsEstudo), `central_diario` (texto do diário), históricos de 30 dias,
  `push_inscricoes`, bucket de imagens `imagens`.
- Gravação condicional por `atualizado_em`; em conflito, baixa e faz **mescla em três vias** `mesclar(local, remoto, apagados, base)`.
- Bases (`basePrincipal`, `basePartes`) são **cópias profundas**; nunca compartilhar referência com `estado`.
- Listas de valores simples (ex.: hábitos marcados no dia) são mescladas como conjunto (junta adições e remoções).
- Valor vazio padrão (0, '', []) sem base **não** apaga valor preenchido pelo outro aparelho.
- Ao mexer aqui, testar o cenário de dois aparelhos editando ao mesmo tempo.

## Edge functions (supabase/functions)

- `lembretes`: Web Push, roda a cada minuto via pg_cron; `verify_jwt` false.
- `previa-link`: lê título/imagem/preço de um link (Compras e Lista das listas), copia a imagem para o storage;
  confere o usuário pelo token e bloqueia endereços internos (SSRF). `verify_jwt` false.

## Como testar

- Não há suíte de testes no repositório; testar abrindo as páginas no PC e no celular e olhando o console (sem erros).
- Conferir visual nas duas larguras antes de entregar.
