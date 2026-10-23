import "server-only";
import { db } from "./db";

// Quando o PDF não traz horário de término, assumimos essa duração pra
// efeito de detectar conflito/tempo livre.
const DURACAO_PADRAO_MIN = 45;
// Abaixo desse intervalo entre dois shows não vale a pena avisar "tempo livre".
const JANELA_LIVRE_MINIMA_MIN = 30;

function paraMinutos(horario: string): number {
  const [h, m] = horario.split(":").map(Number);
  return h * 60 + m;
}

function paraHorario(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type ItemAgenda = {
  favoritoId: string;
  showId: string;
  artista: string;
  palco: string;
  diaId: string;
  dia: Date;
  horarioInicio: string;
  horarioFim: string;
  statusFavorito: "CONFIRMADO" | "ALTERADO" | "CANCELADO";
  statusShow: "ATIVO" | "CANCELADO";
  conflitaCom: string[];
  amigosNoShow: string[];
};

export type AvisoLivre = {
  diaId: string;
  dia: Date;
  de: string;
  ate: string;
};

export type Agenda = {
  itens: ItemAgenda[];
  avisosLivres: AvisoLivre[];
};

/**
 * Amigos (nome) que têm o mesmo Show favoritado, por showId. Só conta Membros
 * do Grupo informado — o Favorito em si é global, o Grupo só filtra quem o vê
 * (ver "Favorito" em CONTEXT.md e ADR 0004).
 */
export async function amigosPorShow(edicaoId: string, grupoId: string): Promise<Map<string, string[]>> {
  const favoritos = await db.favorito.findMany({
    where: {
      status: { in: ["CONFIRMADO", "ALTERADO"] },
      show: { edicaoId },
      usuario: { participacoes: { some: { grupoId } } },
    },
    include: { usuario: true },
  });

  const mapa = new Map<string, string[]>();
  for (const f of favoritos) {
    const lista = mapa.get(f.showId) ?? [];
    lista.push(f.usuario.nome);
    mapa.set(f.showId, lista);
  }
  return mapa;
}

export async function getAgenda(usuarioId: string, edicaoId: string, grupoId: string): Promise<Agenda> {
  const favoritos = await db.favorito.findMany({
    where: { usuarioId, show: { edicaoId } },
    include: { show: { include: { palco: true, dia: true } } },
    orderBy: [{ show: { dia: { data: "asc" } } }, { show: { horarioInicio: "asc" } }],
  });

  const amigos = await amigosPorShow(edicaoId, grupoId);

  const itens: ItemAgenda[] = favoritos.map((f) => ({
    favoritoId: f.id,
    showId: f.showId,
    artista: f.show.artista,
    palco: f.show.palco.nome,
    diaId: f.show.diaId,
    dia: f.show.dia.data,
    horarioInicio: f.show.horarioInicio,
    horarioFim: f.show.horarioFim ?? paraHorario(paraMinutos(f.show.horarioInicio) + DURACAO_PADRAO_MIN),
    statusFavorito: f.status as ItemAgenda["statusFavorito"],
    statusShow: f.show.status as ItemAgenda["statusShow"],
    conflitaCom: [],
    amigosNoShow: (amigos.get(f.showId) ?? []).filter((nome) => nome !== undefined),
  }));

  // Conflitos e avisos de tempo livre só fazem sentido entre shows que ainda vão rolar.
  const ativos = itens.filter((i) => i.statusShow === "ATIVO");

  const porDia = new Map<string, ItemAgenda[]>();
  for (const item of ativos) {
    const lista = porDia.get(item.diaId) ?? [];
    lista.push(item);
    porDia.set(item.diaId, lista);
  }

  const avisosLivres: AvisoLivre[] = [];

  for (const [, doDia] of porDia) {
    doDia.sort((a, b) => paraMinutos(a.horarioInicio) - paraMinutos(b.horarioInicio));

    for (let i = 0; i < doDia.length; i++) {
      for (let j = i + 1; j < doDia.length; j++) {
        const a = doDia[i];
        const b = doDia[j];
        const aInicio = paraMinutos(a.horarioInicio);
        const aFim = paraMinutos(a.horarioFim);
        const bInicio = paraMinutos(b.horarioInicio);
        const bFim = paraMinutos(b.horarioFim);
        const sobrepoe = aInicio < bFim && bInicio < aFim;
        if (sobrepoe) {
          a.conflitaCom.push(b.artista);
          b.conflitaCom.push(a.artista);
        }
      }

      if (i > 0) {
        const anterior = doDia[i - 1];
        const atual = doDia[i];
        const gap = paraMinutos(atual.horarioInicio) - paraMinutos(anterior.horarioFim);
        if (gap >= JANELA_LIVRE_MINIMA_MIN) {
          avisosLivres.push({
            diaId: atual.diaId,
            dia: atual.dia,
            de: anterior.horarioFim,
            ate: atual.horarioInicio,
          });
        }
      }
    }
  }

  return { itens, avisosLivres };
}
