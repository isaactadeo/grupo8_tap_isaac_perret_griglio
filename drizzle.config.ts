import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
