# Grupo como limite de compartilhamento, no lugar de uma Edição global única

Substitui a premissa central de [0001](./0001-multiusuario-edicao-compartilhada.md): não existe mais uma única Edição/programação compartilhada por todos os Usuários do app. Em vez disso, cada Usuário pode criar um **Grupo** (ver CONTEXT.md) e convidar amigos por um link único e permanente daquele Grupo. Toda a Edição/Show/Favorito passa a existir dentro de um Grupo — dois Grupos diferentes não veem a programação, os Favoritos nem os membros um do outro.

Isso não desfaz a decisão de [0002](./0002-supabase-auth-cadastro-aberto.md) de manter cadastro aberto (login/registro continuam sem convite). O que muda é o que um Convite dá acesso a: antes (0001) dava acesso à aplicação inteira; agora dá acesso a um Grupo específico, depois de já autenticado.

## Curador deixa de ser global

`CURADOR_EMAIL` (0002) fazia sentido com uma única Edição compartilhada — só fazia sentido ter um único Curador. Com Grupos, cada um precisa do seu próprio Curador (quem sobe o PDF daquele Grupo), então o papel passa a ser: **quem criou o Grupo é o Curador daquele Grupo**, verificado comparando `Grupo.criadoPorId` com o `Usuário` autenticado — não mais uma env var. `CURADOR_EMAIL` foi removido do código e do `.env`.

## Trade-offs aceitos

- **Sem aprovação de entrada**: visitar o link de convite autenticado adiciona a pessoa ao Grupo na hora, sem o Curador precisar aceitar. Mesma filosofia de fricção mínima da 0002.
- **Qualquer Membro pode compartilhar o link adiante**, não só o Curador — o link não é secreto para o Curador, é secreto para quem está fora do Grupo. Se isso for um problema (alguém convida gente demais), a mitigação por ora é regenerar o `codigoConvite` do Grupo, invalidando o link antigo; não há qualquer outra revogação/expiração implementada.
- **Sem limite de Grupos por Usuário** nem de Membros por Grupo — aceitável para o caso de uso (grupos de amigos), revisar se isso virar vetor de abuso.
- **Sem papel intermediário** entre Curador e Membro (ex: "co-curador") — um Grupo tem exatamente um Curador, quem o criou. Transferir curadoria não está implementado.
