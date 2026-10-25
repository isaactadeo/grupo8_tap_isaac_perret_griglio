import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// prepare: false porque el pooler de Supabase en modo transacción (puerto
// 6543), el recomendado para Vercel, no admite sentencias preparadas.
// Vercel reutiliza la función entre solicitudes y el pooler corta en silencio
// las conexiones inactivas: sin idle_timeout la siguiente consulta esperaba en
// un socket muerto hasta el timeout de la función (300 s).
const client = postgres(connectionString, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });