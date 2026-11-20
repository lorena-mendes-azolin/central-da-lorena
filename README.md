# Central

Site de organização pessoal que reúne agenda, rotina de hábitos, estudos, metas, finanças e muito mais em um só lugar. Feito com **HTML, CSS e JavaScript puro** e **Supabase**.

🔗 **Acesse:** [lorena-mendes-azolin.github.io/central-da-lorena](https://lorena-mendes-azolin.github.io/central-da-lorena/) (com login)

## Sobre o projeto

Comecei a Central porque queria um lugar só meu para organizar o dia a dia, do jeito que eu gosto. Com o tempo ela virou um projeto para qualquer pessoa usar: cada usuário tem a própria conta, escolhe quais módulos quer no menu e personaliza tudo, sem nada fixo voltado para mim.

É um projeto pessoal, desenvolvido por conta própria e com apoio de IA, que uso para aprender e praticar.

## Funcionalidades

**Dia a dia**
- **Dashboard** com resumo do dia, clima, humor, água e timer de foco (pomodoro)
- **Agenda** por dia, semana e mês, com arrastar e soltar e avisos antes dos compromissos
- **Notificações** no celular e no computador, mesmo com o site fechado
- **Rotina diária** com hábitos, sequência de dias e vínculo opcional com outras partes do site
- **Bem-estar** com diário e registro do dia

**Estudos e listas**
- **Matérias e cursos** com tarefas e caderno de aulas (editor com títulos, destaques, links e imagens)
- **Metas** com prazo e etapas
- **Lista das listas** (filmes, lugares, receitas…) e **compras**, com prévia automática de links (título, imagem e preço)

**Módulos opcionais** (cada pessoa adiciona ou remove do menu)
- **Treino** com mais de 80 exercícios, séries, cronômetro guiado e registro de corrida com pace
- **Finanças** com gastos por categoria, parcelas e contas fixas com aviso de vencimento
- **Flashcards** com revisão espaçada
- **Pets**, **Apps de estudo**, **Jejum** e **Revisão da semana**

**Acompanhamento**
- **Gráficos** de rotina, humor, tarefas, água e foco
- **Retrospectiva** do período
- **Lixeira** e limpeza guiada de espaço

**Conta e aparelhos**
- Login, recuperação de senha e dados sincronizados na nuvem
- Funciona no computador e no celular, e pode ser **instalado como app** (PWA)

## Tecnologias

- HTML, CSS e JavaScript puro (sem framework e sem build)
- [Supabase](https://supabase.com/): autenticação, banco de dados, armazenamento de imagens e Edge Functions
- Service Worker e Web Push para o app instalável e as notificações
- GitHub Pages (hospedagem)

## O que aprendi

- organizar um projeto grande em vários arquivos e módulos, sem framework
- sincronizar dados entre aparelhos e resolver conflitos quando duas telas editam ao mesmo tempo
- enviar notificações com Service Worker, Web Push e uma função agendada no Supabase
- cuidar da segurança: regras de acesso no banco, chave pública no site e chaves secretas só no servidor
- pensar no projeto para outras pessoas: módulos opcionais, nada personalizado como padrão
- fazer um layout que funcione bem no computador e no celular

## Próximos passos

- [x] Login e dados na nuvem
- [x] Notificações no celular e no computador
- [x] Instalar como app no celular
- [ ] Bot de WhatsApp que lê a agenda e manda os lembretes

## Novidades

- **Módulos opcionais:** Treino, Finanças, Flashcards, Pets, Apps de estudo, Jejum e Revisão da semana
- **Notificações** que chegam mesmo com o site fechado
- **App instalável** no celular
- **Prévia de links** nas compras e na lista das listas
- **Retrospectiva**, **lixeira** e **limpeza guiada** de espaço
- Sincronização entre aparelhos mais segura

---

## Para quem quiser rodar o projeto

**Abrir:** baixe a pasta e abra o `index.html` (ou use a extensão **Live Server** do VS Code). Sem o Supabase configurado, os dados ficam salvos só no navegador.

**Configurar o login (Supabase, plano grátis):**
1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo do arquivo `supabase.sql`.
3. Em **Project Settings › API**, copie a **Project URL** e a chave **publicável** e cole no `js/config.js`. Nunca use a chave secreta (service_role) no site.
4. Em **Authentication › URL Configuration**, coloque o endereço do site em **Site URL** e o `redefinir.html` em **Redirect URLs**.
5. As notificações e a prévia de links usam as Edge Functions da pasta `supabase/functions`.

**Estrutura:**
```
index.html, login.html, redefinir.html   páginas
css/style.css                            visual (cores no topo, em :root)
js/                                      um arquivo por parte do site (agenda.js, rotina.js, financas.js…)
js/nuvem.js                              login e sincronização com o Supabase
sw.js, manifest.webmanifest              app instalável e notificações
supabase.sql, supabase/                  banco de dados e Edge Functions
```

## Autora

**Lorena Mendes**, estudante de Análise e Desenvolvimento de Sistemas na Universidade Positivo
[LinkedIn](https://www.linkedin.com/in/lorena-mendes-tech) · [GitHub](https://github.com/lorena-mendes-azolin)
