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
  Se o site não mudar: conferir no GitHub (API de commits ou raw.githubusercontent) se o commit levou tudo — o GitHub
  Desktop pode pegar um estado intermediário se os arquivos forem salvos durante o commit.
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
- Layout precisa funcionar no **PC (~1400px) e no celular (~390px)**. Visual limpo, alinhado, sem sobrecarregar.

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
- `seletor.js` transforma `<select>` em menu bonito (com busca quando há mais de 7 opções). `abrirMenuSelect(sel, botao)`
  pode ser usado para abrir um menu a partir de qualquer botão (ex.: setinha de categoria no card).
- `sw.js` é o service worker: **ao mudar arquivos, aumentar a versão do cache** (`central-vNN`) e, se criar
  arquivo novo, colocar na lista dele e no `index.html`.
- Títulos longos que quebram linha: `<textarea class="... titulo-quebra" rows="1">` (cresce sozinho; `ajustarAlturaTitulo`
  em app.js é o reserva para navegador sem `field-sizing`). Enter termina a edição (keydown em app.js). Usado no nome da
  matéria/curso e no título das páginas do caderno (`.folha-titulo`, sem limite de letras).
- Cards de curso/meta etc. já podem ser **arrastados** para mudar a ordem (`arrastar.js`: `ordem(grupo, id)` + `data-pegar`;
  no celular segurar ~0,4 s). A ordem salva é a do array.

## Faculdade / Estudos (js/cursos.js)

- Matérias/cursos ficam em `l.materias` (a ordem do array é a ordem dos cards; filtros não reordenam).
- Situações (`STATUS_MATERIA`): `cursando` (Em andamento, azul), `proximo` (Próximo/Próxima, amarelo), `afazer`
  (Não começou, vermelho), `concluida` (verde). Rótulos com gênero em `palavras()` / `nomeStatus()`. Cor em `.st-m-<status>`.
- O campo `m.tag` aparece na tela como **Categoria** (ex.: Programação). Escolhe-se numa lista (`htmlEscolherCategoria`,
  `MUDAR['curso-cat']`), com "+ Nova categoria…" que troca a lista por um campo de texto (`MUDAR['curso-cat-nova']`).
  `nomeCategoriaExistente` reaproveita o nome já usado (maiúsculas/espaços não importam, `chaveCategoria`).
- Card do curso: setinha no canto superior direito (`.cm-cat-btn`, `ACOES['cm-cat']`) abre o menu de categoria sem entrar
  no curso; "Nova categoria" ali usa `prompt()`.
- Página do curso: bloco `.campos-materia` compacto — Categoria + Marcar hábito na mesma linha, Próximo passo embaixo
  (campos de 34px, letra 13px, rótulos `.rotulo-mini`). No celular, um por linha com rótulo à esquerda.
- Filtro por categoria (`cursosTela.categoria[l.id]`, só na sessão): um `<select class="filtro-categoria">` no fim da linha
  de chips de situação (`htmlFiltroCategoria`, `MUDAR['cursos-categoria']`), só aparece quando algum curso tem categoria.
  Vale na vista de cards, nas "Próximas tarefas" e nos chips da vista Caderno.
  Com um filtro ativo, o formulário de novo curso já vem com aquela categoria.

## Foco (js/dashboard.js)

- "Estudando" aceita matéria, "Nada específico" ou **tema livre** (opção "✎ Outro tema (digitar)…" troca a lista por um
  campo; `config.focoMateria = '__tema'` + `config.focoTema`, × volta para a lista). Use `alvoFoco()` / `nomeAlvoFoco()`.
  Sessões com tema guardam `tema` (com `ref` vazio); Revisão e Retrospectiva agrupam esses minutos pelo nome do tema.

## Mapas mentais (js/mapas.js) — aba "Mapas" dos Flashcards

- Dados em `estado.flashcards.mapas = [{ id, titulo, ref, criado, nos: [{ id, pai, texto, tipo, nota, recolhido }] }]`.
  As bolhas ficam numa **lista simples com `pai`** (não árvore aninhada) para a mescla da nuvem juntar item por item.
  A bolha sem `pai` é o centro; `m.titulo` acompanha o texto dela.
- Tipos (`TIPOS_NO`): topico, resumo, curiosidade, exemplo. Texto longo vai em `nota` (editor do caderno, com
  `data-digitar="mapa-nota"`); a bolha mostra só o título curto e um pontinho quando tem anotação.
- Desenho só com HTML/CSS (`.mm-ramo` / `.mm-filhos`, linhas com ::before/::after), ramos para a direita; cor por tema
  (`CORES_RAMO`, variável `--cor`). No celular (≤760px) o mesmo HTML vira lista em tópicos e o painel fica embaixo.
- Atalhos com o foco no mapa: Tab (item dentro), Enter (item ao lado), Delete (apagar, com desfazer), F2 (editar), setas.
  `redesenharMapa()` preserva a rolagem do mapa e devolve o foco à bolha.
- Próximas fases planejadas: Modo estudo (esconder galhos), "Virar flashcards", gerar mapa de um caderno com IA.

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
- `simulado`: gera simulado de múltipla escolha de UM caderno com o Gemini. Caderno até 100 mil letras, dividido em
  partes de até 40 mil (em paralelo); em cada parte: gera → segunda chamada responde às cegas e descarta o que não
  bate → confere se o trecho citado existe no caderno. Usa a chave do próprio usuário
  (tabela `ia_chaves`, RLS por dono) ou a do site (segredo `GEMINI_API_KEY`) com limite diário em `simulado_uso`
  (`SIMULADO_LIMITE`, padrão 5). Modelo em `GEMINI_MODELO` (padrão `gemini-flash-latest`). `verify_jwt` false.
  SQL em `supabase/simulado.sql`. Tela em `js/simulado.js` (aba Simulados dos Flashcards; dados em `estado.flashcards.simulados`).
- `precos`: robô de preços das Compras. pg_cron de hora em hora (`precos-compras`, corpo `{"modo":"agendado"}`) confere
  os itens com link não comprados que passaram de 20h desde a última conferência (máx. 40 por vez); o botão
  "Conferir preços agora" chama com o token do usuário (só os itens dele, intervalo mínimo 10 min). **Não grava em
  `central_partes`**: grava em `compras_precos` (RLS só leitura pelo dono) e o site (`lerPrecosCompras` em
  `js/compras.js`) aplica nos itens: `valor`, `valorAntes`/`valorRobo`/`precoMudouEm` (mostra "era R$ X"),
  `esgotado`, `precoSituacao` (ok/esgotado/falhou), `precoConferido`. Lojas que bloqueiam robô ficam "falhou".
  SQL em `supabase/precos.sql`. `verify_jwt` false.
  Também grava `compras_precos_historico` (um ponto por item por dia) → gráfico em "Ver detalhes".
  Amazon e Mercado Livre bloqueiam leitura automática às vezes ("falhou"): é da loja, não do código.

- `buscar-imagens`: só `{acao:'salvar', url}` — baixa a imagem cujo ENDEREÇO a pessoa colou (proteção SSRF) e guarda no
  bucket `imagens`. Confere o usuário pelo token; `verify_jwt` false. (A busca de imagens dentro do site foi retirada:
  Google fechou a API para contas novas e a Brave pede cartão.) Tela em `js/imagens-busca.js`: botões Google / Pinterest /
  Colar imagem nos detalhes (Compras e Lista das listas) e Ctrl+V com os detalhes abertos.

## Compras + dinheiro (js/compras-dinheiro.js)

- Marcar item como comprado abre o questionário "Comprou?" (se o módulo Finanças estiver ligado): forma de pagamento
  (Pix/Débito/Dinheiro/Crédito à vista ou parcelado/Boleto), situação, categoria e "Marcar como comprado" opcional;
  "Só marcar, sem lançar" pula. Cria `lancamentos` (avulso) ou `recorrentes` com `freq: 'parcelas'`, ambos com
  `pagamento` e `compra: 'lista/item'`; no item fica `i.lancado = { tipo: 'lanc'|'regra', id, ... }`.
- Juntar dinheiro: `i.guardado` (sem meta) ou `i.meta = 'listaMetas/idMeta'` (vários itens podem ir na mesma meta);
  a página da meta mostra "Itens de Compras" (`htmlItensDaMeta`, chamado em metas.js).
- Linha do item: estrela de prioridade (`i.prioridade`, sobe para o topo em qualquer ordenação), nome em até 2 linhas,
  link da loja no fim da linha. Apagar: lixeira no título do card → modo seleção (vários de uma vez, `removerVariosComDesfazer`).
- Vários links por item: `i.link` é o principal (foto, prévia e robô de preço usam só ele); os outros ficam em
  `i.linksExtras = [{ id, url, nome, valor }]`. Com preço em algum extra, a linha mostra "a partir de" (menor preço);
  `valorCompra(i)` é o valor usado em totais, ordenação e "falta R$". Na linha, com 2+ links o ícone mostra o número e abre um menu.
- Bolinha em "Ver detalhes" só com aviso (`avisoCompra`): vermelha esgotado, verde baixou, amarela subiu.
- Metas: valores com classe `valor-privado` ficam embaçados dentro de `.valores-ocultos` até o olhinho
  (`metasTela.verValores`, só na sessão, como o Diário). Cor por meta em `m.cor` (seção Configurações da meta).
- Lista das listas (colecoes.js): cada categoria tem situações próprias em `c.estados` (2 a 6; a última = concluído).
  Categorias antigas só têm `c.falta`/`c.feito` (`estadosCat()` cobre os dois). No item: `i.estado` (índice) e `i.feito`
  (= última situação), sempre juntos via `definirEstado()`.
- Restaurar backup pede confirmação com resumo (`confirmarRestaurar` em historico.js).
- Cópias antigas do banco ficam no esquema fechado `arquivo` (fora da API); ver `supabase/arrumacao.sql`.

## Como testar

- Não há suíte de testes no repositório; testar abrindo as páginas no PC e no celular e olhando o console (sem erros).
- Conferir visual nas duas larguras antes de entregar.
