import Link from "next/link";
import { logoutAction } from "@/app/logout/actions";

export function Header({ usuarioNome, titulo }: { usuarioNome: string; titulo?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-rtm-border bg-rtm-bg/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <Link href="/grupos" className="font-bold tracking-tight text-rtm-text">
          {titulo ?? "Agenda RTM"}
        </Link>
        <div className="flex items-center gap-3 text-sm text-rtm-muted">
          <span>{usuarioNome}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-rtm-muted underline-offset-2 hover:text-rtm-text hover:underline">
              sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
