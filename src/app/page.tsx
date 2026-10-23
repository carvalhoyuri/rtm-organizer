import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/session";

export default async function HomePage() {
  const usuario = await getCurrentUsuario();
  redirect(usuario ? "/grupos" : "/login");
}
