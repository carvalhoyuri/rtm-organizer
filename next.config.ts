import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota só o necessário (server + node_modules rastreados) em .next/standalone — é o que o Dockerfile copia.
  output: "standalone",
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      // Margem generosa pro upload multipart de um PDF de programação (texto/vetor, não escaneado).
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
