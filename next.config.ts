import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota só o necessário (server + node_modules rastreados) em .next/standalone — é o que o Dockerfile copia.
  output: "standalone",
  serverExternalPackages: ["pdfjs-dist"],
  // O pdfjs carrega pdf.worker.mjs por import dinâmico (não rastreável pelo Next), então ele
  // não entra no .next/standalone sozinho — sem isso, ler PDF falha só em produção/Docker.
  outputFileTracingIncludes: {
    "/admin/edicoes/[edicaoId]": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  experimental: {
    serverActions: {
      // Margem generosa pro upload multipart de um PDF de programação (texto/vetor, não escaneado).
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
