import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. The running app uses
    // DATABASE_URL (pooled) via the adapter in src/lib/prisma.ts instead.
    url: env("DIRECT_URL"),
  },
});
