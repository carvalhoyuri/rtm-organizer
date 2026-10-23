# Programação global e admin único; Grupo só delimita quem vê os Favoritos

Substitui parte de [0003](./0003-grupos-como-limite-de-compartilhamento.md): a Edição (programação extraída do PDF — Palcos, Dias, Shows) deixa de pertencer a um Grupo e passa a ser **global**, a mesma para todos os Usuários do app. O Grupo continua existindo, mas só para delimitar **quem enxerga os Favoritos de quem**.

## O que muda

- `Edicao` perde `grupoId`. Palco, Dia, Show e Revisão seguem pendurados nela e, portanto, também são globais.
- O **Favorito** já era Usuário + Show (sem Grupo) e continua assim: favoritar um Show vale em todos os Grupos do Usuário. O Grupo entra só na leitura — "amigos nesse show" considera apenas Membros do Grupo em que a pessoa está navegando.
- As rotas continuam `/grupos/[grupoId]/edicoes/[edicaoId]` (o Grupo dá o contexto de quem são os amigos), mas qualquer Membro de qualquer Grupo pode abrir qualquer Edição.
- **Curador por Grupo deixa de existir.** Quem cria Edições e sobe PDFs (Revisões) é um **admin global**, definido pela env `ADMIN_EMAIL` (lista separada por vírgula, não salva no banco), na área `/admin`. Isso reaproveita a ideia do `CURADOR_EMAIL` da ADR 0002, removido na 0003.
- Um Grupo ainda tem `criadoPorId`, mas isso não dá nenhum poder além de saber quem o criou.

## Trade-offs aceitos

- Uma Revisão errada do admin afeta todos os Grupos de uma vez (Favoritos de Shows que sumiram do PDF viram CANCELADO para todo mundo). Não há aprovação antes de publicar, como já era.
- Mudar de admin exige alterar a env e redeployar.
- Se já existiam Edições criadas dentro de Grupos antes dessa mudança, elas viram Edições globais separadas; duplicatas devem ser removidas manualmente (ver `supabase/sql/003_edicao_global.sql`).
