import Link from "next/link";
import { loginAction, loginComGoogleAction } from "./actions";

const ERROS: Record<string, string> = {
  campos: "Preenche seu email e senha.",
  credenciais: "Email ou senha inválidos.",
  google: "Não consegui iniciar o login com Google. Tenta de novo.",
  auth: "O link de confirmação/login expirou ou já foi usado. Tenta entrar de novo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
}) {
  const { erro, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-rtm-text">Agenda RTM</h1>
        <p className="mt-1 text-sm text-rtm-muted">Sua agenda pessoal pro Rock The Mountain</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-rtm-border bg-rtm-surface p-6">
        {erro && <p className="rounded-lg bg-rtm-accent/10 px-3 py-2 text-sm text-rtm-accent">{ERROS[erro] ?? "Algo deu errado."}</p>}

        <form action={loginComGoogleAction}>
          <input type="hidden" name="next" value={next ?? ""} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rtm-border bg-rtm-bg px-4 py-2.5 font-medium text-rtm-text transition hover:border-rtm-accent2"
          >
            Entrar com Google
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-rtm-muted">
          <span className="h-px flex-1 bg-rtm-border" />
          ou
          <span className="h-px flex-1 bg-rtm-border" />
        </div>

        <form action={loginAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-rtm-muted">Email</span>
            <input
              name="email"
              type="email"
              required
              autoFocus
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
              className="rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-rtm-text outline-none focus:border-rtm-accent2"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-rtm-accent px-4 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-rtm-muted">
          Ainda não tem conta?{" "}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-rtm-accent2 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  );
}
