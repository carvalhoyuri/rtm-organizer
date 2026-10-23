-- Torna Edicao global (ver ADR 0004): remove o vínculo com Grupo.
-- Escrito à mão pelo mesmo motivo de 002_grupos.sql (prisma db push falha
-- nessa base por causa da FK Usuario.id -> auth.users).
--
-- Atenção: se já existirem Edições criadas dentro de Grupos, elas continuam
-- existindo como Edições globais separadas (uma por Grupo que a criou). Se
-- forem duplicatas da mesma programação, apague as extras antes/depois — os
-- Favoritos ligados a Shows apagados vão junto (ON DELETE CASCADE).

ALTER TABLE "Edicao" DROP CONSTRAINT "Edicao_grupoId_fkey";
DROP INDEX "Edicao_grupoId_idx";
ALTER TABLE "Edicao" DROP COLUMN "grupoId";
