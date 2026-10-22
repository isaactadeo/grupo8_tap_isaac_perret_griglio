# Marketplace Rafaela

Marketplace web para comprar y vender autos y encontrar servicios vehiculares
en Rafaela. La aplicacion usa Next.js, PostgreSQL/PostGIS y Elasticsearch.

## Desarrollo local

Requisitos: Node.js, npm y Docker Desktop con Docker Compose.

```bash
npm ci
docker compose up -d db elasticsearch
npm run dev
```

La aplicacion queda disponible en `http://localhost:3000`. Docker Compose
levanta PostgreSQL/PostGIS y Elasticsearch; Next.js corre localmente fuera de
Docker.

En un volumen PostgreSQL nuevo se ejecuta `database/init.sql` para crear las
tablas y habilitar PostGIS. El script no se vuelve a ejecutar sobre un volumen
ya inicializado.

## Configuracion local

Crear `.env.local` en la raiz con las variables necesarias:

```env
DATABASE_URL=postgres://USUARIO:CONTRASENA@localhost:5432/rafaela
ELASTICSEARCH_URL=http://localhost:9200
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
BLOB_READ_WRITE_TOKEN=
```

Configurar Clerk para habilitar la autenticacion y las publicaciones. Las fotos
de autos se suben a Vercel Blob: crear un store con acceso público en Vercel
(Storage → Blob) y copiar su `BLOB_READ_WRITE_TOKEN`. Sin ese token se puede
publicar, pero sin fotos. Los archivos `.env*` no deben subirse al repositorio.

Si la base local se creó antes de que existieran los campos de ubicación de
los autos, agregarlos sin perder datos:

```sql
ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS province varchar(60);
```

Los roles y la verificación de locales agregan columnas a `users`. En una base
creada antes (local o Supabase) hay que aplicarlas **antes** de desplegar el
código que las usa; sin ellas fallan las lecturas de autos y servicios:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'usuario'
    CHECK (role IN ('usuario', 'moderador', 'admin')),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_name varchar(150);
```

El índice de Elasticsearch incorpora los campos nuevos automáticamente en la
primera búsqueda. Los documentos indexados antes de la verificación de locales
cuentan como no verificados y no muestran el nombre del vendedor en la búsqueda
hasta que se edita la publicación o se cambia la verificación de su dueño.

## Base de datos en Supabase

El despliegue en Vercel está en preparación y va a usar Supabase como
PostgreSQL/PostGIS:

1. Habilitar PostGIS en Database → Extensions, dentro del schema `extensions`.
2. Ejecutar `database/init.sql` en el SQL Editor. El script activa Row Level
   Security sin políticas en todas las tablas: la app se conecta como dueña de
   las tablas y no se ve afectada, pero la Data API de Supabase no puede leer
   ni modificar los datos con las claves públicas. En la base local no cambia
   nada. Como la app no usa la Data API, también se puede desactivar en
   Integrations → Data API.
3. Si la base ya existía antes de los roles y la verificación de locales,
   ejecutar el `ALTER TABLE users …` de la sección anterior **antes** de
   desplegar esa versión: sin esas columnas fallan las lecturas de autos y
   servicios.
4. Usar como `DATABASE_URL` la cadena del pooler en modo transacción (Connect →
   Transaction pooler, puerto 6543) con `?sslmode=require` al final. Por ese
   pooler, `lib/db/index.ts` crea la conexión con `prepare: false`.

`next build` necesita `DATABASE_URL` porque `lib/db/index.ts` la valida al
cargarse; `ELASTICSEARCH_URL` recién se usa en la primera búsqueda.

## Buscar autos

El inicio (`/`) muestra un buscador por marca o modelo, año y presupuesto, y
los últimos autos publicados, leídos desde PostgreSQL.

La página `/autos` lista los autos en venta con filtros de texto, rango de años
y rango de precios, y paginación de 24 resultados. Los filtros viven en la URL
(`/autos?q=hilux&minYear=2018&maxPrice=15000000`), así que una búsqueda se puede
compartir. Los resultados vienen de `GET /api/search?kind=car`, que acepta una
búsqueda sin texto cuando se indica `kind`.

Cada auto tiene su página en `/autos/[id]`, con galería de fotos, precio, ficha
técnica, enlace a la ubicación en OpenStreetMap y descripción. Los datos se leen
desde PostgreSQL. Las publicaciones muestran el nombre del vendedor (nunca su
correo: si no cargó un nombre en Clerk, no se muestra), pero todavía no sus
datos de contacto.

Las publicaciones de locales verificados (ver Administración) aparecen primero
en `GET /api/search`, con cualquier combinación de filtros, y se ven destacadas:
borde dorado, la insignia "Local verificado" y un tilde junto al nombre del
vendedor. El listado del inicio sigue en orden de publicación, con el mismo
destacado.

## Servicios vehiculares

La pagina `/servicios` permite buscar talleres y lavaderos por texto y tipo,
filtrar por distancia y explorar los resultados en un mapa OpenStreetMap. El
botón "Publicar servicio" lleva a `/servicios/publicar`, donde un usuario
autenticado carga nombre, tipo, descripción, precio, fotos y la ubicación en el
mapa. El mismo formulario se usa para editar en `/servicios/[id]/editar`.

Los cambios se guardan primero en PostgreSQL y luego se indexan en Elasticsearch
para la búsqueda. Un error de sincronización se informa sin ocultar que la
publicación ya pudo haberse guardado.

Los servicios de locales verificados aparecen primero en los resultados,
destacados y con un tilde junto al nombre del vendedor. En el mapa su marcador
es más grande, tiene borde dorado y queda por encima de los demás, y el popup
muestra el nombre con el tilde.

## Publicar autos

La pagina `/autos/publicar` ofrece un formulario para usuarios autenticados.
Solicita marca, modelo, año, descripción, precio, ciudad y provincia, y hasta
10 fotos (JPG, PNG o WebP de hasta 10 MB). Las fotos se suben desde el
navegador directamente a Vercel Blob: `POST /api/fotos` verifica la sesión de
Clerk y emite un token de subida limitado a esos tipos y tamaños. Al publicar,
se guardan las URLs resultantes junto con el auto.

La API valida los datos, obtiene el propietario de la sesión de Clerk, guarda
el auto en PostgreSQL y después lo indexa en Elasticsearch. Si la indexación
falla, el formulario informa que el auto quedó guardado pero la búsqueda no se
sincronizó.

## Interfaz

La interfaz sigue una línea minimalista: monocromo cálido (fondo hueso,
superficies blancas, bordes de 1px), botones negros y color solo con
significado, en tonos pastel (talleres, lavaderos, avisos y errores). Los
títulos usan Newsreader (serif) y la interfaz y los precios Geist, cargadas
con `next/font`. Los tokens están en `app/globals.css`
(bloque `@theme`) y los componentes compartidos en `app/_componentes/`. El mapa
se muestra en escala de grises para que resalten los marcadores.

## Administración

Los usuarios tienen un rol (`usuario`, `moderador` o `admin`). Moderadores y
admins ven el enlace "Administración" en `/mis-publicaciones` y usan
`/admin/usuarios` para tildar a los usuarios que son locales reales. La lista
muestra solo usuarios que ya publicaron algo, con búsqueda por nombre o correo.
Para cualquier otro visitante la página muestra "no encontrado", y
`PATCH /api/admin/usuarios/[id]` responde 401 sin sesión y 403 sin rol.

Al tildar o destildar, el cambio se guarda en PostgreSQL y después se reindexan
todas las publicaciones del usuario; el panel informa cuántas. Si la
reindexación falla, el cambio queda guardado y el panel ofrece "Reintentar
sincronización", que repite la reindexación sin cambiar la verificación.
Al verificar se guarda el nombre que tiene el usuario en ese momento y es el
que se publica con el tilde, aunque después lo cambie en Clerk; para aprobar
un nombre nuevo hay que destildar y volver a tildar.

Los roles no tienen pantalla: se asignan por SQL (SQL Editor de Supabase o
`psql`). Para dar de alta al primer admin, copiar su `clerk_user_id` del
dashboard de Clerk; funciona aunque todavía no haya publicado nada:

```sql
INSERT INTO users (clerk_user_id, name, email, role)
VALUES ('user_…', 'Nombre', 'correo@…', 'admin')
ON CONFLICT (clerk_user_id) DO UPDATE SET role = EXCLUDED.role;
```

## Estado de otras funcionalidades

- Las APIs de autos y servicios, autenticación con Clerk y búsqueda con
  Elasticsearch forman parte del proyecto.
- El mapa y los flujos de búsqueda y publicación de servicios están en
  `/servicios`.
- La búsqueda de autos está en `/autos` y el detalle en `/autos/[id]`; el
  formulario autenticado de publicación está en `/autos/publicar`.
- Cada usuario ve sus autos y servicios en `/mis-publicaciones` y puede
  editarlos (`/autos/[id]/editar`, `/servicios/[id]/editar`) o eliminarlos con
  confirmación. El dueño también ve esas acciones en el detalle del auto. Las
  páginas y la API tratan una publicación ajena como inexistente (404).
- Al eliminar una publicación, sus fotos subidas se borran de Vercel Blob
  después de confirmar el borrado en PostgreSQL, salvo las que use otra
  publicación. Las URLs externas no se tocan. Si la limpieza falla, la
  publicación igual queda eliminada y el error se registra en el servidor.
- Locales verificados: panel en `/admin/usuarios`, prioridad en la búsqueda y
  el mapa, y destacado con tilde. Siguen pendientes la gestión de roles desde
  la interfaz, que un local pida la verificación y priorizarlos en el listado
  del inicio.
- Contactar al vendedor sigue pendiente. Las fotos que se quitan al editar
  quedan en Vercel Blob sin limpieza automática.
- La subida de fotos a Vercel Blob está implementada para autos y servicios. Las fotos subidas que no llegan a
  publicarse tampoco se limpian automáticamente.
- El despliegue en la nube (Vercel + Supabase) está en preparación. La
  aplicación web dentro de Docker sigue pendiente.
