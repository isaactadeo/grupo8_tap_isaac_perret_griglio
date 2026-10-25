import { and, asc, avg, count, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  Car,
  GeoCoordinates,
  ListingType,
  PublicationComment,
  RatingSummary,
  Service,
} from "@/src/types";
import { db } from "@/lib/db";
import {
  carComments,
  carImages,
  carRatings,
  cars,
  serviceComments,
  serviceImages,
  serviceRatings,
  services,
  users,
} from "@/lib/db/schema";
import type {
  DatosActualizarAuto,
  DatosActualizarServicio,
  DatosNuevoAuto,
  DatosNuevoServicio,
} from "@/lib/marketplace/esquemas";

interface FilaAuto {
  id: string;
  userId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  description: string;
  price: string;
  latitud: number | null;
  longitud: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FilaServicio {
  id: string;
  userId: string;
  title: string;
  category: Service["category"];
  description: string;
  price: string;
  latitud: number | null;
  longitud: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const columnasAuto = {
  id: cars.id,
  userId: cars.userId,
  title: cars.title,
  make: cars.make,
  model: cars.model,
  year: cars.year,
  description: cars.description,
  price: cars.price,
  latitud: sql<number | null>`ST_Y(${cars.location}::geometry)`,
  longitud: sql<number | null>`ST_X(${cars.location}::geometry)`,
  createdAt: cars.createdAt,
  updatedAt: cars.updatedAt,
};

const columnasServicio = {
  id: services.id,
  userId: services.userId,
  title: services.title,
  category: services.category,
  description: services.description,
  price: services.price,
  latitud: sql<number | null>`ST_Y(${services.location}::geometry)`,
  longitud: sql<number | null>`ST_X(${services.location}::geometry)`,
  createdAt: services.createdAt,
  updatedAt: services.updatedAt,
};

function crearUbicacionSql(
  ubicacion: GeoCoordinates | null | undefined,
) {
  if (ubicacion === undefined) {
    return undefined;
  }
  if (ubicacion === null) {
    return null;
  }
  return sql`ST_SetSRID(ST_MakePoint(${ubicacion.lng}, ${ubicacion.lat}), 4326)::geography`;
}

function mapearAuto(fila: FilaAuto, fotos: string[] = []): Car {
  return {
    id: fila.id,
    userId: fila.userId,
    title: fila.title,
    make: fila.make,
    model: fila.model,
    year: fila.year,
    description: fila.description,
    price: fila.price,
    photos: fotos,
    location:
      fila.latitud === null || fila.longitud === null
        ? null
        : { lat: fila.latitud, lng: fila.longitud },
    createdAt: fila.createdAt,
    updatedAt: fila.updatedAt,
  };
}

function mapearServicio(fila: FilaServicio, fotos: string[] = []): Service {
  return {
    id: fila.id,
    userId: fila.userId,
    title: fila.title,
    category: fila.category,
    description: fila.description,
    price: fila.price,
    photos: fotos,
    location:
      fila.latitud === null || fila.longitud === null
        ? null
        : { lat: fila.latitud, lng: fila.longitud },
    createdAt: fila.createdAt,
    updatedAt: fila.updatedAt,
  };
}

async function obtenerFotosAutos(ids: string[]): Promise<Map<string, string[]>> {
  const fotosPorAuto = new Map<string, string[]>();
  if (ids.length === 0) {
    return fotosPorAuto;
  }

  const filas = await db
    .select({ carId: carImages.carId, url: carImages.url })
    .from(carImages)
    .where(inArray(carImages.carId, ids))
    .orderBy(asc(carImages.position));

  for (const fila of filas) {
    const fotos = fotosPorAuto.get(fila.carId) ?? [];
    fotos.push(fila.url);
    fotosPorAuto.set(fila.carId, fotos);
  }
  return fotosPorAuto;
}

async function obtenerFotosServicios(
  ids: string[],
): Promise<Map<string, string[]>> {
  const fotosPorServicio = new Map<string, string[]>();
  if (ids.length === 0) {
    return fotosPorServicio;
  }

  const filas = await db
    .select({ serviceId: serviceImages.serviceId, url: serviceImages.url })
    .from(serviceImages)
    .where(inArray(serviceImages.serviceId, ids))
    .orderBy(asc(serviceImages.position));

  for (const fila of filas) {
    const fotos = fotosPorServicio.get(fila.serviceId) ?? [];
    fotos.push(fila.url);
    fotosPorServicio.set(fila.serviceId, fotos);
  }
  return fotosPorServicio;
}

export async function listarAutos(
  pagina: number,
  tamanoPagina: number,
): Promise<{ items: Car[]; total: number }> {
  const desplazamiento = (pagina - 1) * tamanoPagina;
  const [filas, [conteo]] = await Promise.all([
    db
      .select(columnasAuto)
      .from(cars)
      .orderBy(desc(cars.createdAt))
      .limit(tamanoPagina)
      .offset(desplazamiento),
    db.select({ total: count() }).from(cars),
  ]);
  const fotos = await obtenerFotosAutos(filas.map((fila) => fila.id));

  return {
    items: filas.map((fila) => mapearAuto(fila, fotos.get(fila.id) ?? [])),
    total: conteo.total,
  };
}

export async function obtenerAuto(id: string): Promise<Car | null> {
  const [fila] = await db
    .select(columnasAuto)
    .from(cars)
    .where(eq(cars.id, id))
    .limit(1);
  if (!fila) {
    return null;
  }

  const fotos = await obtenerFotosAutos([fila.id]);
  return mapearAuto(fila, fotos.get(fila.id) ?? []);
}

export async function crearAuto(
  userId: string,
  datos: DatosNuevoAuto,
): Promise<Car> {
  return db.transaction(async (transaccion) => {
    const [fila] = await transaccion
      .insert(cars)
      .values({
        userId,
        title: datos.title,
        make: datos.make,
        model: datos.model,
        year: datos.year,
        description: datos.description,
        price: datos.price,
        location: crearUbicacionSql(datos.location) ?? null,
      })
      .returning(columnasAuto);

    if (!fila) {
      throw new Error("No se pudo crear el auto");
    }

    const fotos = datos.photos ?? [];
    if (fotos.length > 0) {
      await transaccion.insert(carImages).values(
        fotos.map((url, position) => ({
          carId: fila.id,
          url,
          position,
        })),
      );
    }
    return mapearAuto(fila, fotos);
  });
}

export async function actualizarAuto(
  id: string,
  userId: string,
  datos: DatosActualizarAuto,
): Promise<Car | null> {
  return db.transaction(async (transaccion) => {
    const [fila] = await transaccion
      .update(cars)
      .set({
        ...(datos.title !== undefined ? { title: datos.title } : {}),
        ...(datos.make !== undefined ? { make: datos.make } : {}),
        ...(datos.model !== undefined ? { model: datos.model } : {}),
        ...(datos.year !== undefined ? { year: datos.year } : {}),
        ...(datos.description !== undefined
          ? { description: datos.description }
          : {}),
        ...(datos.price !== undefined ? { price: datos.price } : {}),
        ...(datos.location !== undefined
          ? { location: crearUbicacionSql(datos.location) }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(cars.id, id), eq(cars.userId, userId)))
      .returning(columnasAuto);

    if (!fila) {
      return null;
    }

    if (datos.photos !== undefined) {
      await transaccion.delete(carImages).where(eq(carImages.carId, id));
      if (datos.photos.length > 0) {
        await transaccion.insert(carImages).values(
          datos.photos.map((url, position) => ({
            carId: id,
            url,
            position,
          })),
        );
      }
    }

    const filasFotos = await transaccion
      .select({ url: carImages.url })
      .from(carImages)
      .where(eq(carImages.carId, id))
      .orderBy(asc(carImages.position));
    return mapearAuto(
      fila,
      filasFotos.map((foto) => foto.url),
    );
  });
}

export async function eliminarAuto(
  id: string,
  userId: string,
): Promise<boolean> {
  const eliminados = await db
    .delete(cars)
    .where(and(eq(cars.id, id), eq(cars.userId, userId)))
    .returning({ id: cars.id });
  return eliminados.length > 0;
}

export async function listarServicios(
  pagina: number,
  tamanoPagina: number,
): Promise<{ items: Service[]; total: number }> {
  const desplazamiento = (pagina - 1) * tamanoPagina;
  const [filas, [conteo]] = await Promise.all([
    db
      .select(columnasServicio)
      .from(services)
      .orderBy(desc(services.createdAt))
      .limit(tamanoPagina)
      .offset(desplazamiento),
    db.select({ total: count() }).from(services),
  ]);
  const fotos = await obtenerFotosServicios(filas.map((fila) => fila.id));

  return {
    items: filas.map((fila) =>
      mapearServicio(fila, fotos.get(fila.id) ?? []),
    ),
    total: conteo.total,
  };
}

export async function obtenerServicio(id: string): Promise<Service | null> {
  const [fila] = await db
    .select(columnasServicio)
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  if (!fila) {
    return null;
  }

  const fotos = await obtenerFotosServicios([fila.id]);
  return mapearServicio(fila, fotos.get(fila.id) ?? []);
}

export async function crearServicio(
  userId: string,
  datos: DatosNuevoServicio,
): Promise<Service> {
  return db.transaction(async (transaccion) => {
    const [fila] = await transaccion
      .insert(services)
      .values({
        userId,
        title: datos.title,
        category: datos.category,
        description: datos.description,
        price: datos.price,
        location: crearUbicacionSql(datos.location) ?? null,
      })
      .returning(columnasServicio);

    if (!fila) {
      throw new Error("No se pudo crear el servicio");
    }

    const fotos = datos.photos ?? [];
    if (fotos.length > 0) {
      await transaccion.insert(serviceImages).values(
        fotos.map((url, position) => ({
          serviceId: fila.id,
          url,
          position,
        })),
      );
    }
    return mapearServicio(fila, fotos);
  });
}

export async function actualizarServicio(
  id: string,
  userId: string,
  datos: DatosActualizarServicio,
): Promise<Service | null> {
  return db.transaction(async (transaccion) => {
    const [fila] = await transaccion
      .update(services)
      .set({
        ...(datos.title !== undefined ? { title: datos.title } : {}),
        ...(datos.category !== undefined
          ? { category: datos.category }
          : {}),
        ...(datos.description !== undefined
          ? { description: datos.description }
          : {}),
        ...(datos.price !== undefined ? { price: datos.price } : {}),
        ...(datos.location !== undefined
          ? { location: crearUbicacionSql(datos.location) }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(services.id, id), eq(services.userId, userId)))
      .returning(columnasServicio);

    if (!fila) {
      return null;
    }

    if (datos.photos !== undefined) {
      await transaccion
        .delete(serviceImages)
        .where(eq(serviceImages.serviceId, id));
      if (datos.photos.length > 0) {
        await transaccion.insert(serviceImages).values(
          datos.photos.map((url, position) => ({
            serviceId: id,
            url,
            position,
          })),
        );
      }
    }

    const filasFotos = await transaccion
      .select({ url: serviceImages.url })
      .from(serviceImages)
      .where(eq(serviceImages.serviceId, id))
      .orderBy(asc(serviceImages.position));
    return mapearServicio(
      fila,
      filasFotos.map((foto) => foto.url),
    );
  });
}

export async function eliminarServicio(
  id: string,
  userId: string,
): Promise<boolean> {
  const eliminados = await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.userId, userId)))
    .returning({ id: services.id });
  return eliminados.length > 0;
}

export async function existePublicacion(
  tipo: ListingType,
  id: string,
): Promise<boolean> {
  const [publicacion] =
    tipo === "car"
      ? await db
          .select({ id: cars.id })
          .from(cars)
          .where(eq(cars.id, id))
          .limit(1)
      : await db
          .select({ id: services.id })
          .from(services)
          .where(eq(services.id, id))
          .limit(1);
  return publicacion !== undefined;
}

export async function obtenerComentariosPublicacion(
  tipo: ListingType,
  id: string,
): Promise<PublicationComment[]> {
  if (tipo === "car") {
    const filas = await db
      .select({
        id: carComments.id,
        content: carComments.content,
        authorName: users.name,
        createdAt: carComments.createdAt,
      })
      .from(carComments)
      .innerJoin(users, eq(carComments.userId, users.id))
      .where(eq(carComments.carId, id))
      .orderBy(desc(carComments.createdAt))
      .limit(50);
    return filas.map((fila) => ({
      ...fila,
      createdAt: fila.createdAt.toISOString(),
    }));
  }

  const filas = await db
    .select({
      id: serviceComments.id,
      content: serviceComments.content,
      authorName: users.name,
      createdAt: serviceComments.createdAt,
    })
    .from(serviceComments)
    .innerJoin(users, eq(serviceComments.userId, users.id))
    .where(eq(serviceComments.serviceId, id))
    .orderBy(desc(serviceComments.createdAt))
    .limit(50);
  return filas.map((fila) => ({
    ...fila,
    createdAt: fila.createdAt.toISOString(),
  }));
}

export async function crearComentarioPublicacion(
  tipo: ListingType,
  id: string,
  userId: string,
  content: string,
): Promise<PublicationComment | null> {
  if (!(await existePublicacion(tipo, id))) {
    return null;
  }

  const [usuario] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!usuario) {
    throw new Error("No se encontro el usuario del comentario");
  }

  const [comentario] =
    tipo === "car"
      ? await db
          .insert(carComments)
          .values({ carId: id, userId, content })
          .returning({
            id: carComments.id,
            content: carComments.content,
            createdAt: carComments.createdAt,
          })
      : await db
          .insert(serviceComments)
          .values({ serviceId: id, userId, content })
          .returning({
            id: serviceComments.id,
            content: serviceComments.content,
            createdAt: serviceComments.createdAt,
          });

  if (!comentario) {
    throw new Error("No se pudo guardar el comentario");
  }
  return {
    ...comentario,
    authorName: usuario.name,
    createdAt: comentario.createdAt.toISOString(),
  };
}

export async function obtenerResumenCalificaciones(
  tipo: ListingType,
  id: string,
  userId: string | null = null,
): Promise<RatingSummary> {
  if (tipo === "car") {
    const [resumen] = await db
      .select({
        averageRating: avg(carRatings.stars),
        ratingCount: count(),
      })
      .from(carRatings)
      .where(eq(carRatings.carId, id));
    const [calificacionUsuario] = userId
      ? await db
          .select({ stars: carRatings.stars })
          .from(carRatings)
          .where(
            and(
              eq(carRatings.carId, id),
              eq(carRatings.userId, userId),
            ),
          )
          .limit(1)
      : [];
    return {
      averageRating: Number(resumen?.averageRating ?? 0),
      ratingCount: resumen?.ratingCount ?? 0,
      userRating: calificacionUsuario?.stars ?? null,
    };
  }

  const [resumen] = await db
    .select({
      averageRating: avg(serviceRatings.stars),
      ratingCount: count(),
    })
    .from(serviceRatings)
    .where(eq(serviceRatings.serviceId, id));
  const [calificacionUsuario] = userId
    ? await db
        .select({ stars: serviceRatings.stars })
        .from(serviceRatings)
        .where(
          and(
            eq(serviceRatings.serviceId, id),
            eq(serviceRatings.userId, userId),
          ),
        )
        .limit(1)
    : [];
  return {
    averageRating: Number(resumen?.averageRating ?? 0),
    ratingCount: resumen?.ratingCount ?? 0,
    userRating: calificacionUsuario?.stars ?? null,
  };
}

export async function calificarPublicacion(
  tipo: ListingType,
  id: string,
  userId: string,
  stars: number,
): Promise<RatingSummary | null> {
  if (!(await existePublicacion(tipo, id))) {
    return null;
  }

  if (tipo === "car") {
    await db
      .insert(carRatings)
      .values({ carId: id, userId, stars })
      .onConflictDoUpdate({
        target: [carRatings.carId, carRatings.userId],
        set: { stars, updatedAt: new Date() },
      });
  } else {
    await db
      .insert(serviceRatings)
      .values({ serviceId: id, userId, stars })
      .onConflictDoUpdate({
        target: [serviceRatings.serviceId, serviceRatings.userId],
        set: { stars, updatedAt: new Date() },
      });
  }

  return obtenerResumenCalificaciones(tipo, id, userId);
}
