# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
# openssl é exigido em runtime pelo motor do Prisma em cima do Debian slim.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
# NEXT_PUBLIC_* são embutidas no bundle do client em tempo de build, então
# precisam existir aqui (no EasyPanel: variáveis de ambiente do serviço, que
# também são passadas como build args).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# DATABASE_URL/DIRECT_URL (Supabase Postgres) e as demais env vars de auth
# (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_EMAIL) vêm
# de fora do container (em runtime) — ver docker-compose.yml e .env.example.

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Saída "standalone" do Next: server.js + só o node_modules rastreado como necessário em runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# O schema do banco NÃO é aplicado no start: o Postgres do Supabase tem objetos fora do
# schema.prisma (FK Usuario.id -> auth.users, trigger handle_new_user) que `prisma db push`
# não enxerga e poderia tentar remover. Mudanças de schema são aplicadas à mão com os scripts
# em supabase/sql/ (ver comentário de 002_grupos.sql e 003_edicao_global.sql).
CMD ["node", "server.js"]
