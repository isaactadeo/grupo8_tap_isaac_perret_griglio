import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export interface UsuarioAutenticado {
  id: string;
  clerkUserId: string;
}

export async function obtenerIdUsuarioOpcional(): Promise<string | null> {
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
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);
  return usuario?.id ?? null;
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
    .returning({ id: users.id });

  if (!usuario) {
    throw new Error("No se pudo sincronizar el perfil local del usuario");
  }

  return { id: usuario.id, clerkUserId: userId };
}
