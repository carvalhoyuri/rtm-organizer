# Supabase (Postgres + Auth) e cadastro aberto no lugar do Convite

Substitui o modelo de acesso descrito em [0001](./0001-multiusuario-edicao-compartilhada.md): o app deixa de rodar em SQLite local com um Convite único e permanente por grupo, e passa a usar Postgres hospedado no Supabase com contas reais (email/senha ou Google via Supabase Auth). O conceito de **Convite** é removido do domínio — não existe mais em CONTEXT.md nem no código.

Cadastro agora é aberto: qualquer pessoa com email ou conta Google pode criar uma conta. Essa é uma mudança deliberada de modelo de acesso (o app deixa de ser fechado ao grupo de amigos por padrão) — o trade-off aceito é simplicidade de auth (sem gerenciar/distribuir um código de convite) em troca de abrir o cadastro; não há hoje uma segunda camada de aprovação/allowlist.

O papel de **Curador** (ver CONTEXT.md) não é mais concedido por um código mágico no login — é calculado em `src/lib/session.ts` comparando o email autenticado com a env var `CURADOR_EMAIL`, e não fica persistido no banco. Isso mantém a premissa original do 0001 ("um único Curador, o dono do projeto") sem precisar de UI de administração.

A tabela `Usuario` (Prisma, schema `public`) deixou de ter senha ou id gerado (`cuid()`) próprios: o id agora é o mesmo id de `auth.users` (schema gerenciado pelo Supabase Auth), e a linha é criada por um trigger Postgres (`supabase/sql/handle_new_user.sql`) quando a conta é criada — não pelo código da aplicação. Isso vale igualmente pra cadastro por email/senha e por Google (ou qualquer outro provider OAuth adicionado depois), sem precisar de lógica própria por provider.
