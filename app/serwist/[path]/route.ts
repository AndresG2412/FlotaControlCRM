import { createSerwistRoute } from "@serwist/turbopack";
import { spawnSync } from "node:child_process";

// Revisión del precache: el commit actual (cambia en cada despliegue).
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  additionalPrecacheEntries: [{ url: "/sin-conexion", revision }],
});
