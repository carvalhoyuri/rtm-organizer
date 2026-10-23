# App multiusuário com Edição compartilhada, não ferramenta pessoal

O pedido original descrevia um fluxo de uso único ("eu faço upload do PDF, eu escolho os artistas"), o que sugeria uma ferramenta pessoal, single-user, sem necessidade de contas. Optamos por multiusuário desde o início: uma Edição (o PDF processado, os Artistas e Shows extraídos) é compartilhada entre todos os Usuários de um grupo, e cada um monta sua própria Agenda e Favoritos em cima dela. O caso de uso real é "eu e meus amigos decidindo juntos a ida ao festival", não uso solitário — e o acesso ao grupo é via um Convite único e permanente (sem cadastro formal), com um único Curador (o dono do projeto) responsável por subir os PDFs.

Essa escolha implica auth/isolamento de dados por Usuário e um papel de Curador separado desde o schema inicial — mais caro de introduzir depois do fato do que de desenhar já multiusuário agora.
