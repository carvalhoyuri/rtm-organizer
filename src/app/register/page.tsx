import Link from "next/link";
import { registerAction } from "./actions";
import { loginComGoogleAction } from "../login/actions";

const ERROS: Record<string, string> = {
  campos: "Preenche nome, email e senha.",
  "senha-curta": "A senha precisa ter pelo menos 6 caracteres.",
  "email-existente": "Já existe uma conta com esse email. Tenta entrar em vez de cadastrar.",
  cadastro: "Não consegui criar sua conta. Confere os dados e tenta de novo.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; next?: string }>;
}) {
  const { erro, ok, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-rtm-text">Agenda RTM</h1>
        <p className="mt-1 text-sm text-rtm-muted">Cria sua conta pra montar a agenda do Rock The Mountain</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-rtm-border bg-rtm-surface p-6">
        {erro && <p className="rounded-lg bg-rtm-accent/10 px-3 py-2 text-sm text-rtm-accent">{ERROS[erro] ?? "Algo deu errado."}</p>}

        {ok ? (
          <p className="rounded-lg bg-rtm-accent2/10 px-3 py-2 text-sm text-rtm-accent2">
            Quase lá! Confirma sua conta pelo link que a gente mandou pro seu email.
          </p>
        ) : (
          <>
            <form action={loginComGoogleAction}>
              <input type="hidden" name="next" value={next ?? ""} />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-rtm-border bg-rtm-bg px-4 py-2.5 font-medium text-rtm-text transition hover:border-rtm-accent2"
              >
                Cadastrar com Google
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-rtm-muted">
              <span className="h-px flex-1 bg-rtm-border" />
              ou
              <span className="h-px flex-1 bg-rtm-border" />
            </div>

            <form action={registerAction} className="flex flex-col gap-4">
              <input type="hidden" name="next" value={next ?? ""} />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-rtm-muted">Seu nome</span>
                <input
                  name="nome"
                  required
                  autoFocus
                  className="rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-rtm-text outline-none focus:border-rtm-accent2"
                  placeholder="Como te chamam"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-rtm-muted">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-rtm-text outline-none focus:border-rtm-accent2"
                  placeholder="voce@exemplo.com"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-rtm-muted">Senha</span>
                <input
                  name="senha"
                  required
                  type="password"
                  minLength={6}
                  className="rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-rtm-text outline-none focus:border-rtm-accent2"
                  placeholder="Pelo menos 6 caracteres"
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-lg bg-rtm-accent px-4 py-2.5 font-medium text-white transition hover:opacity-90"
              >
                Cadastrar
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-rtm-muted">
          Já tem conta?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-rtm-accent2 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
