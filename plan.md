# Locales verificados y panel de administración: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`) para el seguimiento.

**Objetivo:** que un moderador o admin pueda marcar desde un panel qué usuarios son locales reales. Al marcarlo se reindexan **todas** las publicaciones (autos y servicios) de ese usuario, que pasan a verse destacadas, con un tilde de verificación al lado del nombre del vendedor. Además aparecen primero en las búsquedas y tienen prioridad en el mapa de servicios.

**Arquitectura:** la verificación es un dato del **usuario** en PostgreSQL (`users.verified_at`), no de cada publicación. El read model de `Car`/`Service` lee la verificación y el nombre público del dueño con subconsultas correlacionadas, así que cada `indexarAuto`/`indexarServicio` ya los incluye. Elasticsearch guarda una copia desnormalizada (`ownerVerified`, `ownerName`) en cada documento y ordena por `ownerVerified` antes que por relevancia. Cuando un moderador cambia la verificación de un usuario, se escribe primero en PostgreSQL y después se reindexan en bloque todas sus publicaciones; la API devuelve cuántas se reindexaron. Los roles (`usuario`, `moderador`, `admin`) viven en `users.role` y el primer admin se asigna por SQL.

**Tecnologías:** Next.js 16 (App Router), Drizzle + PostgreSQL/PostGIS, Elasticsearch 8, Clerk, Zod 4, Leaflet, Tailwind 4.

**Spec:** el pedido del dueño del proyecto (2026-10-22): *"Validación de locales reales, que aparezcan diferentes visualmente, primeros en las búsquedas, y priorizados en el mapa. Que se cree un panel de administración y que un moderador o admin pueda tildar los usuarios que están verificados como locales reales."* Ampliación del mismo día: *"Que se reindexen todas las publicaciones del usuario verificado, que aparezcan todas destacadas y que al lado del nombre del usuario aparezca un tilde de verificación."*

## Decisiones tomadas (confirmar antes de ejecutar)

1. **Se verifica el usuario, no la publicación.** Un local verificado tiene verificadas todas sus publicaciones de autos y de servicios, también las que cargue más adelante.
2. **"Primeros en las búsquedas" significa orden estricto:** en `/api/search` todos los resultados verificados van antes que los no verificados. Dentro de cada grupo se mantiene el orden actual (`_score`, después `createdAt`). Otra opción sería un *boost* de relevancia, pero no garantiza que aparezcan primeros.
3. **El inicio (`/`) no cambia:** "Últimos autos publicados" sigue en orden cronológico porque no es una búsqueda. Los autos verificados sí muestran la insignia ahí.
4. **Roles en PostgreSQL** (`users.role`), no en `publicMetadata` de Clerk. Así PostgreSQL sigue siendo la fuente de verdad y el panel puede listar y filtrar usuarios con una sola consulta. Moderador y admin tienen los mismos permisos. Por ahora la única diferencia es semántica, y los roles se asignan solo por SQL: no hay pantalla para gestionarlos.
5. **El panel lista solo usuarios con fila en `users`**, es decir, los que ya publicaron o intentaron publicar algo (la fila se crea en `obtenerUsuarioAutenticado`). Un local que todavía no publicó no tiene nada que priorizar.
6. **API con 403 para quien no es personal; la página con `notFound()`**, para no revelar que existe `/admin`.
7. **El enlace al panel va en `/mis-publicaciones`**, que ya consulta al usuario actual, y no en el encabezado. Así no se agrega una consulta a la base en cada página.
8. **Las publicaciones pasan a mostrar el nombre del vendedor**, verificado o no; hoy no se muestra en ningún lado. El nombre viene de Clerk, y cuando el usuario no cargó nombre ni username, `obtenerUsuarioAutenticado` guarda el **correo** como nombre. El read model usa `nullif(name, email)`, así que en ese caso no se muestra nada y el correo nunca se publica.
9. **El nombre en Elasticsearch puede quedar desactualizado** si el usuario lo cambia en Clerk: se actualiza cuando edita alguna publicación (solo esa) o cuando un moderador cambia su verificación (todas). Es aceptable porque las páginas de detalle leen el nombre desde PostgreSQL.

## Restricciones globales

- Funciones y clases propias en castellano sin tildes. Campos serializados y de API en inglés, como los existentes (`verified`, `ownerVerified`, `role`).
- No agregar migraciones de Drizzle: se edita `database/init.sql` y se documenta el `ALTER TABLE` para bases existentes en `README.md`, igual que con `city`/`province`.
- **Orden de despliegue:** aplicar el `ALTER TABLE` en Supabase **antes** de desplegar el código. `columnasAuto` va a leer `users.verified_at`, y sin esa columna fallan todas las lecturas de autos y servicios.
- Primero se escribe en PostgreSQL y después en Elasticsearch. Si falla la reindexación, se responde 503 con `{ error, guardado: true, busquedaActualizada: false, item }`, sin dar a entender que la base se revirtió.
- Validar el JSON de entrada con esquemas de `lib/marketplace/esquemas.ts`.
- No agregar dependencias. El repositorio no tiene framework de tests y AGENTS.md pide no sumar dependencias que no aporten a una funcionalidad. La verificación de cada tarea es `npx tsc --noEmit`, `npm run lint` y escenarios manuales con `curl`/`psql` sobre Docker Compose.
- Antes de escribir código de rutas o páginas, leer las guías que correspondan en `node_modules/next/dist/docs/` (`params`/`searchParams` como `Promise`, `notFound`, `router.refresh`).
- Rama: `feature/locales-verificados` desde `develop`. Commits con Conventional Commits.

## Puntos de revisión

1. **Base sin las columnas nuevas**: una base local o de Supabase sin el `ALTER` hace fallar todas las lecturas de autos y servicios. El README tiene que mostrar el `ALTER` de forma visible y la Tarea 1 lo prueba sobre la base existente.
2. **Documentos viejos en Elasticsearch sin `ownerVerified`**: tienen que contar como no verificados, sin errores. Se ordenan con `missing: "_last"` y en la UI se compara `=== true` (lo cubre la Tarea 2).
3. **Elasticsearch caído al tildar o destildar**: la base queda actualizada, el panel muestra el aviso de sincronización pendiente y la casilla refleja el estado guardado. Volver a enviar el mismo valor reintenta la reindexación, porque el PATCH es idempotente (Tareas 3 y 4).
4. **Usuario común o sin sesión que llama a la API de administración**: 401 sin sesión y 403 con sesión sin rol, sin cambios en la base (Tarea 3).
5. **Quitar la verificación**: todas las publicaciones vuelven al orden normal y pierden el destacado y el tilde en la búsqueda, el mapa y el detalle (Tareas 3 y 5).
6. **Usuario cuyo "nombre" es su correo**: la publicación no muestra el correo, ni en las tarjetas ni en el detalle ni en el popup del mapa. Si está verificado se ve "Local verificado" con el tilde; si no, no se ve línea de vendedor (Tareas 1 y 5).
7. **Usuario verificado con muchas publicaciones o con ninguna**: la reindexación cubre todas en un solo bulk y la respuesta informa la cantidad; con cero publicaciones responde 200 con `reindexadas: 0` (Tarea 3).

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `database/init.sql` | columnas `role`, `verified_at`, `verified_by` en `users` |
| `lib/db/schema.ts` | las mismas columnas en `users` |
| `src/types/index.ts` | `UserRole`, campos nuevos en `User`, `ownerVerified` y `ownerName` en `Car`/`Service`/`MarketplaceSearchDocument`, `AdminUserSummary` |
| `lib/marketplace/repositorio.ts` | subconsultas `ownerVerified` y `ownerName` en `columnasAuto`/`columnasServicio`, mapeo |
| `lib/search/elasticsearch.ts` | mapeo `ownerVerified`/`ownerName`, conversores, orden de `buscarPublicaciones` |
| `lib/auth/usuario.ts` | `role` en `UsuarioAutenticado`, `obtenerUsuarioActual`, `esPersonal` |
| `lib/marketplace/verificacion.ts` (nuevo) | listar usuarios, cambiar verificación, reindexar publicaciones de un usuario |
| `lib/marketplace/esquemas.ts` | `esquemaVerificacionUsuario` |
| `app/api/admin/usuarios/[id]/route.ts` (nuevo) | `PATCH` |
| `app/admin/usuarios/page.tsx` (nuevo) | panel (server component) |
| `app/admin/usuarios/casilla-verificacion.tsx` (nuevo) | casilla (client component) |
| `app/mis-publicaciones/page.tsx` | enlace "Administración" para el personal |
| `app/_componentes/vendedor.tsx` (nuevo) | `MarcaVerificado` (tilde) y `NombreVendedor` (nombre + tilde) |
| `app/_componentes/tarjeta-auto.tsx`, `app/autos/buscador.tsx`, `app/page.tsx`, `app/autos/[id]/vista-detalle.tsx` | destacado y vendedor con tilde en autos |
| `app/servicios/panel.tsx`, `app/servicios/mapa.tsx`, `app/globals.css` | destacado y vendedor con tilde en servicios, prioridad en el mapa |
| `README.md` | `ALTER TABLE`, bootstrap del admin, rutas y estado |

---

### Tarea 1: columnas de verificación y read model

**Archivos:**
- Modificar: `database/init.sql` (tabla `users`)
- Modificar: `lib/db/schema.ts` (`users`)
- Modificar: `src/types/index.ts`
- Modificar: `lib/marketplace/repositorio.ts` (`FilaAuto`, `FilaServicio`, `columnasAuto`, `columnasServicio`, `mapearAuto`, `mapearServicio`)
- Modificar: `lib/search/elasticsearch.ts` (`propiedadesIndice`, `convertirAutoADocumentoBusqueda`, `convertirServicioADocumentoBusqueda`)
- Modificar: `README.md` (sección del `ALTER TABLE`)

**Interfaces:**
- Produce:
  - `type UserRole = "usuario" | "moderador" | "admin"`
  - `User` suma `role: UserRole; verifiedAt: Date | null; verifiedBy: string | null`
  - `Car.ownerVerified: boolean`, `Service.ownerVerified: boolean`
  - `Car.ownerName: string | null`, `Service.ownerName: string | null` (`null` cuando el nombre guardado es el correo; ver decisión 8)
  - `MarketplaceSearchDocument.ownerVerified?: boolean` y `ownerName?: string` (opcionales porque los documentos indexados antes no los tienen; los conversores siempre completan `ownerVerified` y agregan `ownerName` solo si no es `null`, como ya hacen con `city`)
  - columnas Drizzle `users.role`, `users.verifiedAt`, `users.verifiedBy`

- [ ] **Paso 1: SQL.** En `database/init.sql`, dentro de `CREATE TABLE users`:
  ```sql
  role varchar(20) NOT NULL DEFAULT 'usuario'
    CHECK (role IN ('usuario', 'moderador', 'admin')),
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ```
  En `README.md`, debajo del `ALTER` de `city`/`province`, agregar el equivalente para bases ya creadas (local y Supabase), con la advertencia de aplicarlo antes de desplegar:
  ```sql
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'usuario'
      CHECK (role IN ('usuario', 'moderador', 'admin')),
    ADD COLUMN IF NOT EXISTS verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id) ON DELETE SET NULL;
  ```
- [ ] **Paso 2: aplicarlo a la base local existente.**
  Correr: `docker compose exec db psql -U rafaela -d rafaela -c "<ALTER de arriba>"` y después `docker compose exec db psql -U rafaela -d rafaela -c "\d users"`
  Esperado: aparecen `role`, `verified_at` y `verified_by`.
- [ ] **Paso 3: Drizzle.** En `lib/db/schema.ts`, `role: varchar("role", { length: 20 }).$type<UserRole>().notNull().default("usuario")`, `verifiedAt: timestamp("verified_at", { withTimezone: true })` y `verifiedBy: uuid("verified_by")`, más un `check("users_role_check", …)` con el mismo patrón que `services_category_check`. Tipar `verifiedBy` como `uuid` sin `.references()`, porque la autorreferencia complica la inferencia de Drizzle y la FK ya está en el SQL.
- [ ] **Paso 4: read model.** En `columnasAuto` y `columnasServicio` agregar
  `ownerVerified: sql<boolean>\`coalesce((select ${users.verifiedAt} is not null from ${users} where ${users.id} = ${cars.userId}), false)\``
  y
  `ownerName: sql<string | null>\`(select nullif(${users.name}, ${users.email}) from ${users} where ${users.id} = ${cars.userId})\``
  (con `services.userId` en servicios). Son subconsultas y no un `join` porque `columnasAuto` también se usa en los `.returning(...)` de insert/update, donde no se puede hacer join, y PostgreSQL acepta subconsultas en `RETURNING`. Sumar `ownerVerified: boolean` y `ownerName: string | null` a `FilaAuto`/`FilaServicio` y propagarlos en `mapearAuto`/`mapearServicio`.
- [ ] **Paso 5: índice.** En `propiedadesIndice`, `ownerVerified: { type: "boolean" }` y `ownerName: { type: "keyword", index: false }` (solo se muestra, no se busca por él). En los dos conversores, `ownerVerified: car.ownerVerified` y `...(car.ownerName ? { ownerName: car.ownerName } : {})` (igual en servicios). `asegurarIndiceMarketplace` ya hace `putMapping` sobre el índice existente.
- [ ] **Paso 6: verificar tipos y lint.**
  Correr: `npx tsc --noEmit` y `npm run lint`
  Esperado: sin errores. Si `tsc` marca un consumidor de `Car`/`Service` que arma objetos a mano (por ejemplo, una vista previa del formulario), completar `ownerVerified: false` ahí.
- [ ] **Paso 7: verificar en ejecución.** Con `npm run dev`, abrir `/`, `/autos`, un `/autos/[id]` y `/mis-publicaciones`.
  Esperado: todo carga igual que antes. Después, editar un auto propio y correr `curl -s "localhost:9200/marketplace-listings/_doc/car:<id>?pretty"`. Esperado: `"ownerVerified" : false` y `"ownerName"` con tu nombre. Con un usuario cuyo `name` sea igual a su `email` (forzarlo con `UPDATE users SET name = email WHERE id = '<uuid>'` y guardar uno de sus autos), esperado: el documento no tiene `ownerName` (punto de revisión 6). Volver a poner el nombre real después.
- [ ] **Paso 8: commit.**
  ```bash
  git add database/init.sql lib/db/schema.ts src/types/index.ts lib/marketplace/repositorio.ts lib/search/elasticsearch.ts README.md
  git commit -m "feat: agrega verificación de usuarios al esquema y al índice de búsqueda"
  ```

### Tarea 2: verificados primero en la búsqueda

**Archivos:**
- Modificar: `lib/search/elasticsearch.ts` (`sort` en `buscarPublicaciones`)

**Interfaces:**
- Consume: `MarketplaceSearchDocument.ownerVerified` (Tarea 1)
- Produce: `GET /api/search` devuelve los verificados antes que el resto en cualquier combinación de filtros

- [ ] **Paso 1: implementar el orden.** Cambiar `sort` a
  `[{ ownerVerified: { order: "desc", missing: "_last" } }, { _score: { order: "desc" } }, { createdAt: { order: "desc" } }]`.
- [ ] **Paso 2: tipos y lint.** `npx tsc --noEmit` y `npm run lint`, sin errores.
- [ ] **Paso 3: verificar el orden con un usuario marcado a mano.** Elegir un usuario con al menos un auto más viejo que otros:
  `docker compose exec db psql -U rafaela -d rafaela -c "UPDATE users SET verified_at = now() WHERE id = '<uuid>'"`, y después editar y guardar uno de sus autos desde la UI para reindexarlo (la reindexación masiva llega en la Tarea 3).
  Correr: `curl -s "localhost:3000/api/search?kind=car" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.table(JSON.parse(s).items.map(i=>({id:i.id,v:i.ownerVerified}))))"`
  Esperado: el auto reindexado aparece primero con `ownerVerified: true`. Los documentos sin el campo aparecen después y la respuesta es 200 (punto de revisión 2).
- [ ] **Paso 4: revertir el dato de prueba** con `UPDATE users SET verified_at = NULL …` y volver a guardar el auto.
- [ ] **Paso 5: commit.**
  ```bash
  git add lib/search/elasticsearch.ts
  git commit -m "feat: ordena primero las publicaciones de locales verificados"
  ```

### Tarea 3: roles, autorización y API de verificación

**Archivos:**
- Modificar: `lib/auth/usuario.ts`
- Crear: `lib/marketplace/verificacion.ts`
- Modificar: `lib/marketplace/esquemas.ts`
- Crear: `app/api/admin/usuarios/[id]/route.ts`
- Modificar: `src/types/index.ts` (`AdminUserSummary`)

**Interfaces:**
- Consume: `users.role`, `users.verifiedAt` y `users.verifiedBy`; `listarAutosDeUsuario`, `listarServiciosDeUsuario` (repositorio); `convertirAutoADocumentoBusqueda`, `convertirServicioADocumentoBusqueda`, `indexarPublicaciones` (search)
- Produce:
  - `UsuarioAutenticado` suma `role: UserRole` (se agrega `role: users.role` al `.returning` del upsert existente)
  - `esPersonal(role: UserRole): boolean`: `true` para `moderador` y `admin`
  - `obtenerUsuarioActual(): Promise<{ id: string; role: UserRole } | null>`: igual que `obtenerIdUsuarioActual`, pero también devuelve el rol (sin escribir en la base)
  - `interface AdminUserSummary { id: string; name: string; email: string; role: UserRole; verifiedAt: string | null; carCount: number; serviceCount: number }` (`verifiedAt` en ISO para poder pasarlo a un client component)
  - `listarUsuariosParaVerificar(filtros: { texto?: string; pagina: number; tamanoPagina: number }): Promise<{ items: AdminUserSummary[]; total: number }>`: ordena por `verified_at DESC NULLS LAST`, después `name`; filtra con `ilike` sobre `name` y `email` (no es búsqueda full-text, y los usuarios no están en Elasticsearch); los conteos salen de subconsultas `count(*)` sobre `cars`/`services`
  - `cambiarVerificacionUsuario(userId: string, verificado: boolean, moderadorId: string): Promise<AdminUserSummary | null>`: `null` si el usuario no existe. Si el valor no cambia, conserva el `verified_at` original. Si `verificado` es `false`, deja `verified_at` y `verified_by` en `NULL`.
  - `reindexarPublicacionesDeUsuario(userId: string): Promise<number>`: lee **todos** los autos y servicios del usuario desde PostgreSQL (`listarAutosDeUsuario` y `listarServiciosDeUsuario`, sin paginar), los convierte y los manda en un solo `indexarPublicaciones`. Devuelve la cantidad reindexada (0 si no tiene publicaciones). Como lee después del commit, cada documento sale con el `ownerVerified` y el `ownerName` actuales.
  - `esquemaVerificacionUsuario = z.object({ verified: z.boolean() }).strict()`
  - `PATCH /api/admin/usuarios/[id]` con cuerpo `{ verified: boolean }`. Responde `200 { item: AdminUserSummary, reindexadas: number }`, `400` si el id o el cuerpo no son válidos, `401` sin sesión, `403 { error: "No tenés permisos para administrar usuarios" }`, `404` si el usuario no existe y `503 { error, guardado: true, busquedaActualizada: false, item }` si falla la reindexación

- [ ] **Paso 1: autorización.** Implementar `role` en `UsuarioAutenticado`, `esPersonal` y `obtenerUsuarioActual` en `lib/auth/usuario.ts`. `obtenerIdUsuarioActual` puede delegar en `obtenerUsuarioActual` para no duplicar la consulta.
- [ ] **Paso 2: repositorio de verificación.** Crear `lib/marketplace/verificacion.ts` con las tres funciones de arriba. La API no reindexa a mano: lo hace siempre a través de `reindexarPublicacionesDeUsuario`, así el panel y cualquier script futuro usan el mismo camino.
- [ ] **Paso 3: esquema y ruta.** Agregar `esquemaVerificacionUsuario` y escribir `route.ts` siguiendo el orden de `app/api/autos/[id]/route.ts`: validar el id con `z.uuid()`, `obtenerUsuarioAutenticado`, `esPersonal` (403), `leerJson`, `cambiarVerificacionUsuario` (404 si devuelve `null`), `reindexarPublicacionesDeUsuario` dentro de su propio `try` (503 degradado) y todo envuelto en `responderErrorServidor`. El PATCH siempre reindexa, aunque el valor no cambie (punto de revisión 3).
- [ ] **Paso 4: tipos y lint.** `npx tsc --noEmit` y `npm run lint`, sin errores.
- [ ] **Paso 5: verificar permisos (punto de revisión 4).** Con sesión de un usuario común, desde la consola del navegador en `localhost:3000`:
  `await fetch("/api/admin/usuarios/<uuid-de-otro>", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ verified: true }) }).then(r => r.status)`
  Esperado: `403`, y `SELECT verified_at FROM users WHERE id = '<uuid-de-otro>'` sigue en `NULL`. Desde una ventana sin sesión, esperado: `401`.
- [ ] **Paso 6: dar rol al usuario de prueba y verificar el flujo feliz.**
  `docker compose exec db psql -U rafaela -d rafaela -c "UPDATE users SET role = 'admin' WHERE email = '<tu correo>'"`.
  Elegir un usuario con al menos dos autos y un servicio, y contar sus publicaciones en la base:
  `docker compose exec db psql -U rafaela -d rafaela -c "SELECT (SELECT count(*) FROM cars WHERE user_id = '<uuid>') + (SELECT count(*) FROM services WHERE user_id = '<uuid>')"`.
  Repetir el `fetch` con `verified: true`. Esperado: `200`, `item.verifiedAt` con fecha y `reindexadas` igual al conteo de la base. Después:
  `curl -s "localhost:9200/marketplace-listings/_count?q=userId:<uuid>%20AND%20ownerVerified:true"`
  Esperado: `count` igual al conteo de la base, es decir, **todas** las publicaciones quedaron verificadas. Repetir con `verified: false` y esperar `count: 0` con `ownerVerified:true` (punto de revisión 5). Con un usuario sin publicaciones, esperado: `200` y `reindexadas: 0` (punto de revisión 7). Con un uuid inexistente, esperado: `404`. Con `{ "verified": "si" }`, esperado: `400`.
- [ ] **Paso 7: verificar la respuesta degradada (punto de revisión 3).** Correr `docker compose stop elasticsearch` y repetir el PATCH con `verified: true`. Esperado: `503` con `guardado: true`, y en la base `verified_at` con fecha. Correr `docker compose start elasticsearch`, repetir el mismo PATCH y esperar `200`, con los documentos actualizados.
- [ ] **Paso 8: commit.**
  ```bash
  git add lib/auth/usuario.ts lib/marketplace/verificacion.ts lib/marketplace/esquemas.ts "app/api/admin/usuarios/[id]/route.ts" src/types/index.ts
  git commit -m "feat: agrega roles y API para verificar locales"
  ```

### Tarea 4: panel de administración

**Archivos:**
- Crear: `app/admin/usuarios/page.tsx`
- Crear: `app/admin/usuarios/casilla-verificacion.tsx`
- Modificar: `app/mis-publicaciones/page.tsx`
- Modificar: `README.md` (bootstrap del admin y ruta `/admin/usuarios`)

**Interfaces:**
- Consume: `obtenerUsuarioActual`, `esPersonal`, `listarUsuariosParaVerificar`, `PATCH /api/admin/usuarios/[id]` (Tarea 3)
- Produce: la ruta `/admin/usuarios?q=&page=`

- [ ] **Paso 1: página.** `app/admin/usuarios/page.tsx` es un server component con `metadata.title = "Administración"` y `robots: { index: false }`, y usa `Encabezado` sin sección activa. Llama a `obtenerUsuarioActual()` y, si devuelve `null` o `!esPersonal(role)`, a `notFound()`. Lee `q` (2 a 100 caracteres; fuera de ese rango se ignora) y `page` (entero ≥ 1, si no 1) de `searchParams`, con páginas de 50. Muestra un buscador GET (`<form>` con `name="q"`) y una tabla con nombre, correo, cantidad de autos y servicios, fecha de verificación y `<CasillaVerificacion>`. Si no hay resultados, muestra un texto que explica que solo aparecen usuarios que ya publicaron. Sigue los estilos existentes (`campo`, `boton`, `insignia`, `divide-linea`).
- [ ] **Paso 2: casilla.** `CasillaVerificacion({ usuarioId, nombre, verificadoInicial }: { usuarioId: string; nombre: string; verificadoInicial: boolean })` es un client component. Usa un checkbox con `aria-label={\`Local verificado: ${nombre}\`}` que queda deshabilitado mientras envía. Hace el PATCH y después `router.refresh()`. Con un 200 muestra `role="status"` con "Se actualizaron N publicaciones." usando `reindexadas`. Con un 503, muestra `role="alert"` con "Guardado. La búsqueda no se actualizó: volvé a tildar para reintentar." y deja la casilla en el valor guardado. Con otro error, revierte la casilla y muestra el mensaje de `error`.
- [ ] **Paso 3: enlace.** En `app/mis-publicaciones/page.tsx`, cambiar `obtenerIdUsuarioActual` por `obtenerUsuarioActual` y, si `esPersonal(role)`, mostrar un enlace "Administración" a `/admin/usuarios` junto al título.
- [ ] **Paso 4: README.** Documentar la ruta, los roles y cómo dar de alta al primer admin desde el SQL Editor de Supabase o `psql`. El `clerk_user_id` se copia del dashboard de Clerk, y funciona aunque el usuario todavía no tenga fila:
  ```sql
  INSERT INTO users (clerk_user_id, name, email, role)
  VALUES ('user_…', 'Nombre', 'correo@…', 'admin')
  ON CONFLICT (clerk_user_id) DO UPDATE SET role = EXCLUDED.role;
  ```
- [ ] **Paso 5: tipos y lint.** `npx tsc --noEmit` y `npm run lint`, sin errores.
- [ ] **Paso 6: verificar en el navegador.** Como admin: en `/mis-publicaciones` aparece el enlace; en `/admin/usuarios` se ve la lista; tildar un usuario hace que la fecha aparezca después del refresh; `?q=<parte del correo>` filtra; `?page=abc` muestra la página 1. Como usuario común, `/admin/usuarios` responde 404 y no aparece el enlace. Sin sesión, también 404.
- [ ] **Paso 7: commit.**
  ```bash
  git add app/admin app/mis-publicaciones/page.tsx README.md
  git commit -m "feat: agrega panel de administración para verificar locales"
  ```

### Tarea 5: diferenciación visual y prioridad en el mapa

**Archivos:**
- Crear: `app/_componentes/vendedor.tsx`
- Modificar: `app/_componentes/tarjeta-auto.tsx`, `app/autos/buscador.tsx`, `app/page.tsx`, `app/autos/[id]/vista-detalle.tsx`
- Modificar: `app/servicios/panel.tsx`, `app/servicios/mapa.tsx`, `app/globals.css`

**Interfaces:**
- Consume: `ownerVerified` y `ownerName` en `Car`, `Service` y `MarketplaceSearchDocument` (Tarea 1), y el orden de la Tarea 2
- Produce, en `app/_componentes/vendedor.tsx`:
  - `MarcaVerificado(): React.JSX.Element`: el tilde. Es un SVG de check dentro de un círculo relleno con `var(--color-destacado)`, de `1em` para que acompañe el tamaño del texto, con `role="img"` y `aria-label="Verificado"` y un `<title>Local verificado</title>` como tooltip.
  - `NombreVendedor({ nombre, verificado }: { nombre?: string | null; verificado: boolean }): React.JSX.Element | null`. Con nombre muestra `<span>{nombre}</span>` y, si `verificado`, `<MarcaVerificado />` pegado a la derecha (`inline-flex items-center gap-1`). Sin nombre y verificado muestra "Local verificado" con el tilde. Sin nombre y sin verificar devuelve `null`.
  - Usa los tokens `--color-destacado` y `--color-destacado-suave` que ya existen en `globals.css`, así que no hace falta definir colores nuevos.
- "Destacada" significa lo mismo en todos lados: borde `border-destacado` y fondo `bg-destacado-suave` en el contenedor de la publicación, en vez de `border-linea` y el fondo normal.

- [ ] **Paso 1: componentes y tarjeta.** Crear `vendedor.tsx`. En `DatosTarjetaAuto` agregar `verificado?: boolean` y `vendedor?: string | null`. La tarjeta muestra `<NombreVendedor nombre={auto.vendedor} verificado={auto.verificado === true} />` en una línea debajo de año y ciudad. Si `verificado`, la tarjeta va destacada: borde `border-destacado` en la foto y fondo `bg-destacado-suave` con padding en el bloque de texto.
- [ ] **Paso 2: consumidores de la tarjeta.** En `buscador.tsx`, `verificado: auto.ownerVerified === true` y `vendedor: auto.ownerName` (punto de revisión 2: los documentos viejos no tienen los campos). En `app/page.tsx`, `verificado: auto.ownerVerified` y `vendedor: auto.ownerName`. En `vista-detalle.tsx`, agregar al panel lateral una línea "Publicado por" con `<NombreVendedor nombre={auto.ownerName} verificado={auto.ownerVerified} />` y, si está verificado, una frase corta debajo: "Local verificado por Marketplace Rafaela".
- [ ] **Paso 3: lista de servicios.** En `panel.tsx`, cada `<li>` con `servicio.ownerVerified === true` va destacado (borde y fondo, con padding y bordes redondeados para que no quede pegado al divisor) y todos muestran `<NombreVendedor>` debajo del título. Sumar a las referencias del mapa un `<li>` con `<MarcaVerificado />` y el texto "Local verificado".
- [ ] **Paso 4: mapa.** En `mapa.tsx`, para un servicio con `ownerVerified === true`: `zIndexOffset: 1000` en `L.marker` para que quede encima de los demás, la clase extra `marcador-servicio--verificado` en el `html` del `divIcon`, un `iconSize` un 20% más grande (anclas ajustadas), y en el popup el nombre del vendedor con un tilde. Como el popup se arma con DOM y no con React, el tilde se crea como un `<span class="marca-verificado">` con `textContent = "✓"`, `aria-label` y `title` "Local verificado", y el nombre con `textContent` como el resto. En `globals.css`, `.marcador-servicio--verificado` con `width/height: 34px`, borde `var(--color-destacado)` y una sombra más marcada, y `.marca-verificado` como un círculo `var(--color-destacado)` con el check en `var(--color-papel)`, para que se vea igual que `MarcaVerificado`. El orden de la Tarea 2 ya asegura que, cuando hay más resultados que el tamaño de página, los verificados entren al mapa.
- [ ] **Paso 5: tipos y lint.** `npx tsc --noEmit` y `npm run lint`, sin errores.
- [ ] **Paso 6: verificar en el navegador.** Verificar desde el panel a un usuario que tenga un auto y un servicio con ubicación. Esperado:
  - en `/autos`, **todas** sus tarjetas aparecen primero, destacadas y con su nombre seguido del tilde;
  - en `/` y en `/autos/[id]` se ve el nombre con el tilde, y el detalle dice "Publicado por";
  - en `/servicios`, al buscar, el servicio aparece primero en la lista, destacado y con el tilde, y en el mapa su marcador es más grande, tiene anillo dorado, queda por encima cuando se superpone con otro y el popup muestra el nombre con el tilde;
  - las publicaciones de usuarios no verificados muestran el nombre sin tilde y sin destacado;
  - con el usuario de prueba cuyo `name` es el correo (Tarea 1), ningún lugar muestra el correo (punto de revisión 6);
  - al destildarlo desde el panel y volver a buscar, todo vuelve al estilo normal (punto de revisión 5).
  
  Revisar también un ancho de 400 px: un nombre largo con el tilde se corta con `truncate` y no rompe la tarjeta, y el tilde queda visible.
- [ ] **Paso 7: commit.**
  ```bash
  git add app/_componentes app/autos app/page.tsx app/servicios app/globals.css
  git commit -m "feat: destaca locales verificados en tarjetas, servicios y mapa"
  ```

### Tarea 6: cierre

**Archivos:**
- Modificar: `README.md` ("Estado de otras funcionalidades" y secciones de búsqueda y servicios)

- [ ] **Paso 1: README.** Explicar que las búsquedas priorizan a los locales verificados, que sus publicaciones se ven destacadas y con un tilde junto al nombre del vendedor, que el mapa les da prioridad y que el panel está en `/admin/usuarios`. Corregir la frase "Las publicaciones todavía no muestran datos de contacto del vendedor": ahora muestran el nombre (nunca el correo), pero el contacto sigue pendiente. Dejar como pendiente lo que no se hace: gestión de roles desde la UI, solicitud de verificación por parte del local y prioridad en el listado del inicio.
- [ ] **Paso 2: verificación final.**
  Correr: `npx tsc --noEmit`, `npm run lint` y `npm run build`
  Esperado: los tres terminan sin errores.
- [ ] **Paso 3: commit.**
  ```bash
  git add README.md
  git commit -m "docs: documenta locales verificados y panel de administración"
  ```
- [ ] **Paso 4: despliegue (coordinar con el equipo).** Aplicar el `ALTER TABLE users …` en Supabase, dar de alta al primer admin con el `INSERT … ON CONFLICT` y recién después mergear y desplegar. Si producción ya tiene documentos en Elasticsearch, no hace falta reindexar todo: los documentos sin `ownerVerified` cuentan como no verificados.

## Fuera de alcance

- Pantalla para asignar o quitar roles (por ahora se hace por SQL).
- Formulario para que un local pida la verificación, o datos del local (CUIT, dirección, horario).
- Registro de auditoría más allá de `verified_at`/`verified_by`.
- Filtro "solo verificados" en el buscador.
