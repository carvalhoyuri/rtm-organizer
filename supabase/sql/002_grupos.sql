-- Adiciona Grupo/MembroGrupo e escopa Edicao por Grupo (ver CONTEXT.md, ADR 0003).
-- Escrito à mão em vez de `prisma db push` porque o push falha nessa base:
-- ele introspecciona o banco inteiro pra calcular o diff, e a FK
-- Usuario.id -> auth.users (criada por handle_new_user.sql, fora do schema.prisma)
-- não é uma referência cross-schema que o Prisma consiga introspeccionar sem
-- listar `auth` em `datasource.schemas` — o que não queremos (colocaria o
-- schema `auth` inteiro do Supabase sob gestão do Prisma). `db execute` roda
-- SQL direto sem introspecção, então não esbarra nisso.
--
-- Seguro rodar como está: a tabela "Edicao" está vazia (confirmado antes de
-- rodar), então adicionar grupoId NOT NULL sem default não quebra nada.

CREATE TABLE "Grupo" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "codigoConvite" TEXT NOT NULL,
  "criadoPorId" UUID NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Grupo_codigoConvite_key" ON "Grupo"("codigoConvite");
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MembroGrupo" (
  "id" TEXT NOT NULL,
  "grupoId" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
  "entrouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembroGrupo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MembroGrupo_grupoId_usuarioId_key" ON "MembroGrupo"("grupoId", "usuarioId");
ALTER TABLE "MembroGrupo" ADD CONSTRAINT "MembroGrupo_grupoId_fkey"
  FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembroGrupo" ADD CONSTRAINT "MembroGrupo_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Edicao" ADD COLUMN "grupoId" TEXT NOT NULL;
CREATE INDEX "Edicao_grupoId_idx" ON "Edicao"("grupoId");
ALTER TABLE "Edicao" ADD CONSTRAINT "Edicao_grupoId_fkey"
  FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
