import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  // Se responde siempre en el momento: el build no consulta la base.
  await connection();

  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    return Response.json({ status: "ok", db: result[0] });
  } catch (error) {
    // El detalle queda en el log del servidor, no en la respuesta pública.
    console.error(error);
    return Response.json(
      { status: "error", message: "No se pudo conectar con la base de datos" },
      { status: 500 }
    );
  }
}
