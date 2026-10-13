import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// prepare: false porque el pooler de Supabase en modo transacción (puerto
// 6543), el recomendado para Vercel, no admite sentencias preparadas.
const client = postgres(connectionString, { max: 1, prepare: false });

export const db = drizzle(client, { schema });