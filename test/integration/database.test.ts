import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

// Hits the real Supabase project configured in .env — there is no disposable
// test project yet (see docs/qa-strategy.md, Section 12). Only creates/deletes
// its own throwaway Auth users; never touches real app data.
const db = new PrismaClient();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

afterAll(async () => {
  await db.$disconnect();
});

describe("Supabase Postgres connectivity", () => {
  it("is reachable and has every table from prisma/schema.prisma", async () => {
    const tables = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name;
    `;
    expect(tables.map((t) => t.table_name)).toEqual([
      "Dia",
      "Edicao",
      "Favorito",
      "Grupo",
      "MembroGrupo",
      "Palco",
      "Revisao",
      "Show",
      "Usuario",
    ]);
  });

  it("has the Usuario -> auth.users foreign key from supabase/sql/handle_new_user.sql", async () => {
    const rows = await db.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint WHERE conname = 'Usuario_id_fkey';
    `;
    expect(rows).toHaveLength(1);
  });

  it("has the on_auth_user_created trigger from supabase/sql/handle_new_user.sql", async () => {
    const rows = await db.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
    `;
    expect(rows).toHaveLength(1);
  });
});

describe("handle_new_user trigger", () => {
  async function createAndCleanup(
    email: string,
    metadata: Record<string, string> | undefined,
    assert: (usuario: Awaited<ReturnType<typeof db.usuario.findUnique>>) => void
  ) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "vitest-trigger-check-123",
      email_confirm: true,
      user_metadata: metadata,
    });
    expect(error).toBeNull();
    const userId = data!.user!.id;

    try {
      const usuario = await db.usuario.findUnique({ where: { id: userId } });
      assert(usuario);
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  }

  it("provisions a matching Usuario row using the account's full_name", async () => {
    const email = `vitest-${Date.now()}@example.com`;
    await createAndCleanup(email, { full_name: "Vitest Trigger Check" }, (usuario) => {
      expect(usuario).not.toBeNull();
      expect(usuario?.email).toBe(email);
      expect(usuario?.nome).toBe("Vitest Trigger Check");
    });
  });

  it("falls back to the email prefix when no full_name is provided", async () => {
    const email = `vitest-noname-${Date.now()}@example.com`;
    await createAndCleanup(email, undefined, (usuario) => {
      expect(usuario?.nome).toBe(email.split("@")[0]);
    });
  });

  it("cascades the Usuario row's deletion when the auth user is deleted", async () => {
    const email = `vitest-cascade-${Date.now()}@example.com`;
    const { data } = await admin.auth.admin.createUser({
      email,
      password: "vitest-trigger-check-123",
      email_confirm: true,
    });
    const userId = data!.user!.id;

    await admin.auth.admin.deleteUser(userId);

    const usuario = await db.usuario.findUnique({ where: { id: userId } });
    expect(usuario).toBeNull();
  });
});

describe("Grupo / MembroGrupo (ADR 0003)", () => {
  async function withThrowawayUsuario<T>(run: (usuarioId: string) => Promise<T>): Promise<T> {
    const email = `vitest-grupo-${Date.now()}@example.com`;
    const { data } = await admin.auth.admin.createUser({ email, password: "vitest-trigger-check-123", email_confirm: true });
    const usuarioId = data!.user!.id;
    try {
      return await run(usuarioId);
    } finally {
      await admin.auth.admin.deleteUser(usuarioId);
    }
  }

  it("creating a Grupo does not auto-add the creator as a member (that's the caller's job, see criarGrupoAction)", async () => {
    await withThrowawayUsuario(async (usuarioId) => {
      const grupo = await db.grupo.create({ data: { nome: "Vitest Grupo", criadoPorId: usuarioId } });
      const membro = await db.membroGrupo.findUnique({ where: { grupoId_usuarioId: { grupoId: grupo.id, usuarioId } } });
      expect(membro).toBeNull();
      await db.grupo.delete({ where: { id: grupo.id } });
    });
  });

  it("generates a unique codigoConvite per Grupo", async () => {
    await withThrowawayUsuario(async (usuarioId) => {
      const a = await db.grupo.create({ data: { nome: "A", criadoPorId: usuarioId } });
      const b = await db.grupo.create({ data: { nome: "B", criadoPorId: usuarioId } });
      expect(a.codigoConvite).not.toBe(b.codigoConvite);
      await db.grupo.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    });
  });

  it("rejects a second MembroGrupo row for the same Grupo+Usuario pair", async () => {
    await withThrowawayUsuario(async (usuarioId) => {
      const grupo = await db.grupo.create({ data: { nome: "Vitest Grupo", criadoPorId: usuarioId } });
      await db.membroGrupo.create({ data: { grupoId: grupo.id, usuarioId } });

      await expect(db.membroGrupo.create({ data: { grupoId: grupo.id, usuarioId } })).rejects.toThrow();

      await db.grupo.delete({ where: { id: grupo.id } }); // cascades MembroGrupo
    });
  });

  it("cascades Grupo deletion to its MembroGrupo rows without touching the global Edicao (ADR 0004)", async () => {
    await withThrowawayUsuario(async (usuarioId) => {
      const grupo = await db.grupo.create({
        data: {
          nome: "Vitest Grupo",
          criadoPorId: usuarioId,
          membros: { create: { usuarioId } },
        },
      });
      const edicao = await db.edicao.create({ data: { nome: "Vitest Edição", ano: 2026 } });

      try {
        await db.grupo.delete({ where: { id: grupo.id } });

        const membro = await db.membroGrupo.findFirst({ where: { grupoId: grupo.id } });
        expect(membro).toBeNull();
        expect(await db.edicao.findUnique({ where: { id: edicao.id } })).not.toBeNull();
      } finally {
        await db.edicao.delete({ where: { id: edicao.id } });
      }
    });
  });
});
