import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/src/types";

export interface UsuarioAutenticado {
  id: string;
  clerkUserId: string;
  role: UserRole;
}

/** Moderadores y admins pueden verificar locales. */
export function esPersonal(role: UserRole): boolean {
  return role === "moderador" || role === "admin";
}

export async function obtenerUsuarioAutenticado(): Promise<
  UsuarioAutenticado | Response
> {
  if (
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    return Response.json(
      { error: "La autenticacion no esta configurada en el servidor" },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Debes iniciar sesion" }, { status: 401 });
  }

  const perfilClerk = await currentUser();
  if (!perfilClerk || perfilClerk.id !== userId) {
    return Response.json(
      { error: "No se pudo verificar el usuario autenticado" },
      { status: 401 },
    );
  }

  const correoPrincipal = perfilClerk.primaryEmailAddress;
  if (!correoPrincipal || correoPrincipal.verification?.status !== "verified") {
    return Response.json(
      { error: "La cuenta debe tener un correo electronico verificado" },
      { status: 422 },
    );
  }
  const correo = correoPrincipal.emailAddress;

  const nombre =
    [perfilClerk.firstName, perfilClerk.lastName].filter(Boolean).join(" ") ||
    perfilClerk.username ||
    correo;

  const [usuario] = await db
    .insert(users)
    .values({
      clerkUserId: userId,
      name: nombre.slice(0, 150),
      email: correo,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        name: nombre.slice(0, 150),
        email: correo,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id, role: users.role });

  if (!usuario) {
    throw new Error("No se pudo sincronizar el perfil local del usuario");
  }

  return { id: usuario.id, clerkUserId: userId, role: usuario.role };
}

/**
 * Id local y rol del usuario con sesión, sin crear ni actualizar su perfil.
 * Devuelve null si Clerk no está configurado, no hay sesión o el usuario
 * todavía no publicó nada.
 */
export async function obtenerUsuarioActual(): Promise<{
  id: string;
  role: UserRole;
} | null> {
  if (
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const [usuario] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);
  return usuario ?? null;
}

/** Id local del usuario con sesión; ver obtenerUsuarioActual. */
export async function obtenerIdUsuarioActual(): Promise<string | null> {
  return (await obtenerUsuarioActual())?.id ?? null;
}
