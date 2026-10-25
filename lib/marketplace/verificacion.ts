import { clerkClient } from "@clerk/nextjs/server";
import { asc, eq, ilike, or, sql, count } from "drizzle-orm";
import type { AdminUserSummary, UserRole } from "@/src/types";
import { db } from "@/lib/db";
import { leerPerfilClerk } from "@/lib/auth/usuario";
import { users } from "@/lib/db/schema";
import {
  listarAutosDeUsuario,
  listarServiciosDeUsuario,
} from "@/lib/marketplace/repositorio";
import {
  convertirAutoADocumentoBusqueda,
  convertirServicioADocumentoBusqueda,
  indexarPublicaciones,
} from "@/lib/search/elasticsearch";

interface FilaUsuario {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  verifiedAt: Date | null;
  verifiedName: string | null;
  carCount: number;
  serviceCount: number;
}

// También se usan en el RETURNING del update: por eso son subconsultas. Las
// columnas van calificadas a mano porque Drizzle las escribe sin tabla en
// consultas de una sola tabla.
const columnasResumen = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  verifiedAt: users.verifiedAt,
  verifiedName: users.verifiedName,
  carCount: sql<number>`(select count(*)::int from cars where cars.user_id = "users"."id")`,
  serviceCount: sql<number>`(select count(*)::int from services where services.user_id = "users"."id")`,
};

function mapearResumen(fila: FilaUsuario): AdminUserSummary {
  return {
    ...fila,
    verifiedAt: fila.verifiedAt ? fila.verifiedAt.toISOString() : null,
  };
}

/** Escapa los comodines de LIKE para buscar el texto tal cual. */
function escaparComodines(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

export async function listarUsuariosParaVerificar(filtros: {
  texto?: string;
  pagina: number;
  tamanoPagina: number;
}): Promise<{ items: AdminUserSummary[]; total: number }> {
  const patron = filtros.texto
    ? `%${escaparComodines(filtros.texto)}%`
    : undefined;
  const condicion = patron
    ? or(ilike(users.name, patron), ilike(users.email, patron))
    : undefined;

  const [filas, [conteo]] = await Promise.all([
    db
      .select(columnasResumen)
      .from(users)
      .where(condicion)
      .orderBy(sql`${users.verifiedAt} desc nulls last`, asc(users.name))
      .limit(filtros.tamanoPagina)
      .offset((filtros.pagina - 1) * filtros.tamanoPagina),
    db.select({ total: count() }).from(users).where(condicion),
  ]);

  return { items: filas.map(mapearResumen), total: conteo.total };
}

/**
 * Crea en PostgreSQL los usuarios de Clerk que todavía no tienen fila, para
 * que el panel liste a todos los registrados aunque no hayan publicado. No
 * modifica filas existentes: el nombre y el correo se actualizan cuando el
 * usuario publica.
 */
export async function sincronizarUsuariosClerk(): Promise<void> {
  const clerk = await clerkClient();
  const filas: { clerkUserId: string; name: string; email: string }[] = [];
  for (let desplazamiento = 0; ; desplazamiento += 500) {
    const { data } = await clerk.users.getUserList({
      limit: 500,
      offset: desplazamiento,
    });
    for (const perfil of data) {
      const datos = leerPerfilClerk(perfil);
      if (datos) {
        filas.push({
          clerkUserId: perfil.id,
          name: datos.nombre,
          email: datos.correo,
        });
      }
    }
    if (data.length < 500) {
      break;
    }
  }
  if (filas.length > 0) {
    // Sin target: ignora tanto el clerk_user_id como el correo ya existentes.
    await db.insert(users).values(filas).onConflictDoNothing();
  }
}

/**
 * Cambia el rol de un usuario. Devuelve null si el usuario no existe.
 */
export async function cambiarRolUsuario(
  userId: string,
  role: UserRole,
): Promise<AdminUserSummary | null> {
  const [fila] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning(columnasResumen);
  return fila ? mapearResumen(fila) : null;
}

/**
 * Marca o desmarca a un usuario como local verificado. Al verificar guarda el
 * nombre actual como nombre público aprobado (nunca el correo). Si ya estaba
 * verificado conserva fecha, moderador y nombre aprobado: para aprobar un
 * nombre nuevo hay que quitar la verificación y volver a darla. Devuelve null
 * si el usuario no existe.
 */
export async function cambiarVerificacionUsuario(
  userId: string,
  verificado: boolean,
  moderadorId: string,
): Promise<AdminUserSummary | null> {
  const [fila] = await db
    .update(users)
    .set(
      verificado
        ? {
            verifiedBy: sql`case when ${users.verifiedAt} is null then ${moderadorId}::uuid else ${users.verifiedBy} end`,
            verifiedName: sql`case when ${users.verifiedAt} is null then nullif(${users.name}, left(${users.email}, 150)) else ${users.verifiedName} end`,
            verifiedAt: sql`coalesce(${users.verifiedAt}, now())`,
            updatedAt: new Date(),
          }
        : {
            verifiedAt: null,
            verifiedBy: null,
            verifiedName: null,
            updatedAt: new Date(),
          },
    )
    .where(eq(users.id, userId))
    .returning(columnasResumen);

  return fila ? mapearResumen(fila) : null;
}

/**
 * Reindexa todas las publicaciones del usuario con los datos actuales de
 * PostgreSQL (verificación y nombre del dueño). Devuelve cuántas indexó.
 */
export async function reindexarPublicacionesDeUsuario(
  userId: string,
): Promise<number> {
  const autos = await listarAutosDeUsuario(userId);
  const servicios = await listarServiciosDeUsuario(userId);
  await indexarPublicaciones([
    ...autos.map(convertirAutoADocumentoBusqueda),
    ...servicios.map(convertirServicioADocumentoBusqueda),
  ]);
  return autos.length + servicios.length;
}
