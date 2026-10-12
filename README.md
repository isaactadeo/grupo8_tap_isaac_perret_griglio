# Marketplace Rafaela

Marketplace web para comprar y vender autos en Rafaela, con una seccion
independiente de servicios vehiculares. La compra-venta de autos es el flujo
principal; talleres y lavaderos se agrupan bajo **Servicios**.

## Stack y arquitectura

- Next.js App Router y TypeScript para la aplicacion web y sus endpoints.
- PostgreSQL con PostGIS y Drizzle como fuente de verdad de los datos.
- Elasticsearch como indice de texto reconstruible desde PostgreSQL.
- Clerk para autenticacion OAuth en las escrituras y paginas de acceso.
  Vercel Blob para imagenes y Leaflet para el mapa son integraciones pendientes.
- Docker Compose para servicios locales. Vercel es el destino previsto de
  despliegue, aun no configurado en este repositorio.

El proyecto usa `app/` en la raiz para App Router; no moverlo a `src/app`.
La carpeta `src/types/` contiene los tipos compartidos. PostgreSQL conserva
usuarios, autos, servicios, fotos como URLs y ubicaciones. Elasticsearch se usa
para busqueda; no agregar busqueda full-text en PostgreSQL.

## Estado actual

| Area | Estado |
| --- | --- |
| Esquema inicial PostgreSQL/PostGIS | Implementado en `database/init.sql` |
| CRUD API de autos y servicios | Implementado; sin interfaz de administracion |
| Clerk para autenticar escrituras | Implementado; requiere claves del proyecto |
| Indice Elasticsearch y `GET /api/search` | Implementado; sincronizacion directa despues del commit |
| Pagina principal del marketplace | Pendiente; sigue la pantalla inicial de Next.js |
| Pantallas de listado y detalle | Pendiente |
| Subida de fotos a Vercel Blob | Pendiente |
| Seccion de talleres/lavaderos y mapa de Rafaela | Pendiente |
| Contenedor Docker para la aplicacion Next.js | Pendiente |
| Despliegue y variables de entorno de produccion | Pendiente |

## Estructura objetivo

Conservar las carpetas que ya existen y completar el flujo dentro de ellas:

```text
app/
  api/
    autos/             # GET y POST de publicaciones
    upload/            # Subida de imagenes
  autos/
    [id]/              # Detalle de una publicacion
  servicios/           # Paginas y mapa de talleres/lavaderos
  layout.tsx           # Navegacion principal y proveedores cuando se integren
components/             # Componentes compartidos de interfaz
database/
  init.sql
lib/
  db/                   # Conexion y esquema Drizzle
  search/               # Cliente y consultas Elasticsearch
  blob/                 # Agregar al implementar Vercel Blob
src/
  types/
```

La navegacion debe destacar **Autos** y ofrecer **Servicios** como menu con
accesos separados a talleres y lavaderos. No crear paginas, componentes o
modulos vacios antes de implementar un flujo que los use.

## Requisitos

- Node.js compatible con las versiones indicadas por las dependencias del
  proyecto y npm.
- Docker Desktop con Docker Compose.

## Desarrollo local

Instalar dependencias y levantar PostgreSQL/PostGIS y Elasticsearch:

```bash
npm ci
docker compose up -d db elasticsearch
npm run dev
```

El servidor Next.js corre fuera de Docker en `http://localhost:3000`. Compose
actualmente levanta solo PostgreSQL y Elasticsearch; el contenedor web se
agregara cuando se implemente su Dockerfile y configuracion.

En un volumen PostgreSQL nuevo, `database/init.sql` crea la extension PostGIS
y las tablas. Este es el metodo de inicializacion elegido para el proyecto.
PostgreSQL solo ejecuta el script al crear un volumen nuevo; editar el archivo
no modifica una base que ya fue inicializada.

## Variables de entorno y secretos

Para desarrollo local, crear `.env.local` en la raiz. `.gitignore` excluye los
archivos `.env*`; no subir valores secretos al repositorio ni escribirlos en la
documentacion.

Variables necesarias para servicios locales y autenticacion:

```env
DATABASE_URL=postgres://rafaela:rafaela@localhost:5432/rafaela
ELASTICSEARCH_URL=http://localhost:9200
# Configurar ambas solo si el cluster requiere autenticacion:
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Copiar `.env.example` a `.env.local` y completar las claves del dashboard de
Clerk para habilitar las escrituras autenticadas y las paginas `/sign-in` y
`/sign-up`. Clerk sincroniza el perfil local en la primera escritura y requiere
que la cuenta tenga un correo principal verificado. `.env.local` esta excluido
de Git; el ejemplo no contiene secretos. Vercel Blob sigue pendiente, por lo
que su token no se necesita todavia.

Todavia no se eligio un gestor de secretos para el equipo. Si el despliegue se
hace en Vercel, sus variables de entorno por proyecto y ambiente pueden
administrarse desde la configuracion del proyecto; en caso de elegir otro
hosting, seleccionar un gestor con plan gratuito que cumpla las necesidades
del equipo. Los secretos de produccion no deben depender de `.env.local`.

## Busqueda

El endpoint existente es `GET /api/search`. Ejemplo:

```text
/api/search?q=renault%20kangoo&kind=car&minYear=2018&page=1&pageSize=20
```

Admite filtros `kind=car|service`, `category=taller|lavadero`, `minPrice`,
`maxPrice`, `minYear`, `maxYear` y `lat`, `lng`, `distance`. Limita la consulta
a 2-100 caracteres, el tamano de pagina a 50 y la paginacion profunda.
El indice aplica analisis de texto en espanol, normalizacion de acentos,
prioridad por titulo/marca/modelo, tolerancia a errores y autocompletado.

Elasticsearch local desactiva seguridad y esta configurado para un unico nodo;
no es una configuracion de produccion. El buscador solo encuentra documentos
que hayan sido indexados. Las escrituras CRUD guardan primero en PostgreSQL y
despues sincronizan Elasticsearch directamente, sin outbox. Si Elasticsearch
falla, la API lo informa explicitamente y devuelve el registro que ya quedo
guardado. La busqueda no estara disponible mientras Elasticsearch no responda;
la lectura de listados/detalles desde PostgreSQL sigue funcionando.

## API CRUD

Los listados y detalles son publicos. Crear, editar y eliminar requieren una
sesion Clerk; el servidor determina el propietario desde la sesion y nunca
acepta `userId` enviado por el cliente. Solo el propietario puede editar o
eliminar su registro. Un registro de Clerk se sincroniza con `users` cuando hace
su primera escritura.

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| GET | `/api/autos?page=1&pageSize=20` | Lista autos con paginacion |
| POST | `/api/autos` | Crea un auto |
| GET | `/api/autos/{id}` | Obtiene un auto |
| PATCH | `/api/autos/{id}` | Actualiza campos enviados del auto |
| DELETE | `/api/autos/{id}` | Elimina un auto propio |
| GET | `/api/servicios?page=1&pageSize=20` | Lista talleres y lavaderos |
| POST | `/api/servicios` | Crea un servicio |
| GET | `/api/servicios/{id}` | Obtiene un servicio |
| PATCH | `/api/servicios/{id}` | Actualiza campos enviados del servicio |
| DELETE | `/api/servicios/{id}` | Elimina un servicio propio |

Ejemplo de `POST /api/autos`:

```json
{
  "title": "Toyota Corolla XEI",
  "make": "Toyota",
  "model": "Corolla XEI",
  "year": 2020,
  "description": "Sedan en buen estado, con mantenimiento al dia.",
  "price": "18000000.00",
  "photos": ["https://imagenes.example.com/corolla.jpg"],
  "location": { "lat": -31.25, "lng": -61.49 }
}
```

Ejemplo de `POST /api/servicios`:

```json
{
  "title": "Lavadero de autos",
  "category": "lavadero",
  "description": "Lavado interior y exterior con turno.",
  "price": "12000.00",
  "photos": [],
  "location": { "lat": -31.25, "lng": -61.49 }
}
```

El precio se envia como texto decimal con hasta dos decimales para preservar la
precision de PostgreSQL. `photos` acepta hasta 10 URLs HTTPS; la subida a Blob
todavia no esta integrada. `location` puede omitirse o ser `null`.

Si una mutacion se confirma en PostgreSQL pero Elasticsearch falla, la
respuesta sera `503` y traera `guardado: true` (o `eliminado: true`), el registro
si corresponde y `busquedaActualizada: false`. No repetir un `POST` a ciegas:
la publicacion ya existe en PostgreSQL. Como todavia no hay outbox ni worker,
esa diferencia debe corregirse reintentando la indexacion o reconstruyendo el
indice.

## Funcionalidades pendientes segun prioridad del producto

1. Crear el inicio del marketplace y el listado de autos con busqueda y filtros
   por marca, modelo, ano y presupuesto.
2. Implementar las pantallas de detalle, publicacion y administracion de autos
   y servicios sobre los endpoints CRUD existentes.
3. Integrar Vercel Blob para subir imagenes; hoy el CRUD recibe URLs HTTPS.
4. Crear la seccion independiente de talleres/lavaderos y su mapa de Rafaela.
5. Completar Docker Compose para levantar tambien la aplicacion web y configurar
   el despliegue una vez elegido el proveedor y la gestion de secretos.

## Calidad y base de datos

Validaciones disponibles:

```bash
npm run lint
npx tsc --noEmit
```

`database/init.sql` define el esquema inicial usado por Docker. No se mantiene
un flujo de migraciones para esta etapa del proyecto.

## Flujo Git del equipo

- `main`: produccion; integrar mediante pull request.
- `develop`: integracion del equipo.
- `feature/...`: ramas de trabajo.
- Usar Conventional Commits, por ejemplo `feat: agrega listado de autos`,
  `fix: corrige filtros por presupuesto` o `chore: actualiza dependencias`.

Flujo sugerido para una tarea:

```bash
git switch develop
git pull origin develop
git switch -c feature/nombre-de-la-tarea
# realizar cambios y validar
git add ruta/de/archivos
git commit -m "feat: describe el cambio"
git push -u origin feature/nombre-de-la-tarea
```

Abrir un pull request de la rama feature hacia `develop`; integrar `develop` a
`main` mediante el proceso acordado por el equipo.
