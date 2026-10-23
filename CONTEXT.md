# Agenda RTM

App multiusuário para montar a agenda pessoal de shows do festival Rock The Mountain, a partir da programação extraída de um PDF oficial.

## Language

**Grupo**:
O espaço compartilhado entre um Usuário e seus amigos. Delimita só **quem vê os Favoritos de quem** — a programação (Edição, Show) é global e igual para todos os Grupos (ver ADR 0004, que ajusta a 0003). Qualquer Usuário pode criar um Grupo; um Usuário pode pertencer a vários Grupos. Compartilhado por um link de convite único e permanente por Grupo (ver Convite).
_Avoid_: Time, equipe, workspace

**Convite**:
Link único e permanente que dá acesso a um Grupo específico — não à aplicação como um todo (login/cadastro são abertos, ver ADR 0002). Visitar o link autenticado adiciona o Usuário como membro do Grupo automaticamente, sem aprovação do Curador. Qualquer Membro pode compartilhar o link adiante, não só o Curador.

**Edição**:
Uma ocorrência anual do festival (ex: "Edição RTM 2026"). Global: a mesma para todos os Grupos, mantida pelo Admin. Concebida como o conceito raiz que agrupa toda a programação de um ano; o ano é apenas um atributo dela, não o conceito em si — importante porque uma Edição pode ter blocos de datas não contíguos.
_Avoid_: Ano

**Agenda**:
A lista pessoal e ordenada dos shows que um Usuário escolheu dentro de uma Edição, pronta para segui-la ao vivo no festival.
_Avoid_: Roadmap, roteiro

**Show**:
Uma apresentação específica dentro de uma Edição, identificada pela combinação Artista + Palco + Dia. Um mesmo Artista pode ter mais de um Show na mesma Edição (ex: dois blocos de datas), cada um é uma entidade distinta.

**Favorito**:
A relação entre um Usuário e um Show específico (não entre Usuário e Artista) indicando que aquele Show está na Agenda do Usuário. Vale em todos os Grupos do Usuário (não é por Grupo). Escolher um Artista com múltiplos Shows exige favoritar cada apresentação individualmente. Visível para os Membros dos Grupos em que o Usuário está (não é privado) — qualquer um vê quais Shows os outros do mesmo Grupo favoritaram.

Tem 3 estados:
- **Confirmado**: estado padrão, nada mudou desde que foi favoritado.
- **Alterado**: uma Revisão mudou o Dia/Palco/horário do Show; aguarda o Usuário revisar.
- **Cancelado**: o Artista sumiu do Show numa Revisão. Fica visível na Agenda riscado/marcado — nunca some sozinho, só se o Usuário remover manualmente.

**Revisão**:
O resultado de um novo upload de PDF em uma Edição já existente. Atualiza os Shows existentes (por Artista + Palco + Dia), cria Shows novos e marca como cancelados os que sumiram do PDF.

**Admin**:
Papel global (env `ADMIN_EMAIL`, não salvo no banco) responsável por criar Edições e subir PDFs (disparando Revisões), na área `/admin`. Distinto do Membro comum, que apenas visualiza a programação e escolhe Favoritos. Não há etapa de verificação manual do conteúdo extraído antes de publicar. Substitui o antigo Curador por Grupo (ver ADR 0004).
_Avoid_: Curador
