# 🌙 Central da Lorena

Meu site de organização do dia a dia: dashboard, agenda (dia, semana e mês) com avisos, rotina diária e listas.

## Como abrir

**Jeito recomendado (com notificações do Windows):**
1. Abra esta pasta no VS Code (Arquivo › Abrir pasta).
2. Instale a extensão **Live Server** (ícone de quadradinhos na lateral › pesquise "Live Server").
3. Clique com o botão direito no `index.html` › **Open with Live Server**.
4. No site, clique em **Ativar** na faixa de notificações.

**Jeito rápido:** dois cliques no `index.html`. Funciona tudo, mas os avisos aparecem só dentro do site.

> Os avisos funcionam enquanto o site estiver aberto numa aba (pode ficar minimizada).

## Onde ficam os dados
- **Modo local** (enquanto o `js/config.js` estiver vazio): no navegador. Use **💾 Fazer backup** de vez em quando.
- **Com login** (depois de configurar o Supabase): na nuvem, em qualquer aparelho.

## Configurar o login (Supabase, plano grátis)
1. Em [supabase.com](https://supabase.com), crie um projeto novo (ex.: `central-da-lorena`).
2. Vá em **SQL Editor** › **New query**, cole o conteúdo do arquivo `supabase.sql` e clique em **Run**.
3. Vá em **Project Settings › API** e copie a **Project URL** e a chave **anon public**.
4. Cole as duas no `js/config.js`. Nunca use a chave `service_role` no site!
5. Em **Authentication › URL Configuration**, coloque o endereço do site em **Site URL** e adicione o `redefinir.html` em **Redirect URLs**
   (ex.: `http://127.0.0.1:5500/redefinir.html` no Live Server, ou o endereço do GitHub Pages quando publicar).
6. Abra o site: ele vai pedir login. Crie sua conta em **Criar conta**. Os dados que você já tinha neste navegador sobem sozinhos no primeiro login.

## Estrutura
```
index.html            estrutura da página (menu lateral + área principal)
css/style.css         visual (as cores estão no topo, em :root)
login.html            tela de entrar / criar conta / esqueci a senha
redefinir.html        tela para criar uma senha nova (link do e-mail)
supabase.sql          tabela e regras de segurança do Supabase
js/config.js          chaves do Supabase (vazio = modo local)
js/nuvem.js           login e sincronização com o Supabase
js/login.js           código das telas de login e nova senha
js/utils.js           funções pequenas (datas, avisinhos…)
js/dados.js           o que é salvo e os dados de exemplo
js/dashboard.js       página inicial, clima, água, humor, pomodoro
js/agenda.js          tarefas, compromissos e calendário
js/rotina.js          hábitos diários e sequência
js/graficos.js        página de gráficos
js/listas.js          esqueleto das listas + lista simples (lista, quadro, caderno)
js/editor.js          editor de texto, caderno, links e imagens
js/cursos.js          listas de matérias/cursos (tarefas, caderno de aulas)
js/metas.js           listas de metas (descrição, prazo, etapas)
js/colecoes.js        lista de listas (lugares, filmes, receitas…)
js/compras.js         compras para agora e a longo prazo
js/notificacoes.js    avisos das tarefas, som e sininho
js/configuracoes.js   página de configurações
js/app.js             liga tudo: menu, troca de páginas e cliques
```

## Menu lateral
- **Minimizar**: deixa só os ícones.
- **Desafixar**: esconde o menu; ele abre por cima pelo botão ☰ do topo.
- A escolha fica salva.

## Ícones
Os ícones são desenhos em SVG que ficam no começo do `index.html` (cada `<symbol id="i-nome">`).
No JavaScript, use `ic('nome')`. Para criar um ícone novo, adicione um `<symbol>` com o desenho.

## Como o código funciona (resumo)
- Cada página é um objeto em `PAGINAS` com uma função `desenhar()` que devolve o HTML.
- Botões têm `data-acao="nome"`, e o que eles fazem fica em `ACOES['nome']`.
- Sempre que algo muda: altera o `estado`, chama `salvar()` e depois `desenhar()`.

## Próximos passos
- [x] Login e dados na nuvem (Supabase), falta só configurar as chaves
- [ ] Bot de WhatsApp que lê a agenda e manda os lembretes

## Novidades
- **Gráficos**: rotina dia a dia, frequência de cada hábito, humor, tarefas, água e foco (7 ou 30 dias).
- **Caderno** nas listas: páginas de anotação com formatação (títulos, negrito, marca-texto, listas, tarefas, destaque).
- Menu com um botão só: **Fixar / Desafixar** (desafixado = minimizado).
- **Tipos de lista**: matérias/cursos, metas, coleção (lista de listas) e compras. Ao criar uma lista nova, você escolhe o tipo.
- **Links e imagens** em matérias, metas, itens da lista de listas, compras e listas simples. No editor de texto também.
- Menu minimizado abre por cima quando o mouse passa.
