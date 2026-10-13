import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    return Response.json({ status: "ok", db: result[0] });
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}