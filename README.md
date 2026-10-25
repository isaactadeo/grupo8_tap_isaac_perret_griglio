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

Si el volumen ya contiene la estructura anterior, aplicar una vez
`database/migrations/0001_publication_interactions.sql` con `psql` para crear
las tablas de comentarios y calificaciones. No es necesario recrear el volumen.

## Configuracion local

Copiar `.env.example` como `.env.local` y completar las variables:

```env
DATABASE_URL=postgres://USUARIO:CONTRASENA@localhost:5432/rafaela
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

En desarrollo local Elasticsearch no requiere usuario ni contraseña; esas
variables solo son necesarias para un endpoint protegido y deben completarse
juntas.

Configurar Clerk para habilitar la autenticacion y las publicaciones. Los
archivos `.env*` no deben subirse al repositorio.

## Validacion

```bash
npx tsc --noEmit
npm run lint
```

## Servicios vehiculares

La pagina `/servicios` permite buscar talleres y lavaderos por texto y tipo,
filtrar por distancia y explorar los resultados en un mapa OpenStreetMap.
También permite publicar un servicio autenticado con descripción, precio,
ubicación y URLs HTTPS de fotos. La carga de imágenes desde el dispositivo no
está implementada.

Los cambios se guardan primero en PostgreSQL y luego se indexan en Elasticsearch
para la búsqueda. Un error de sincronización se informa sin ocultar que la
publicación ya pudo haberse guardado.

Cada publicación de servicio permite consultar y agregar comentarios y
calificar con una a cinco estrellas. Se necesita iniciar sesión para comentar o
calificar; cada usuario puede modificar su calificación. Los resultados muestran
el promedio y la cantidad de calificaciones.

## Publicar autos

La pagina `/autos/publicar` ofrece un formulario para usuarios autenticados.
Solicita marca, modelo, año, descripción, precio y hasta 10 URLs HTTPS de fotos;
la ubicación por coordenadas es opcional. Las fotos deben alojarse previamente
en otro lugar: la carga directa de archivos no está implementada.

La API valida los datos, obtiene el propietario de la sesión de Clerk, guarda
el auto en PostgreSQL y después lo indexa en Elasticsearch. Si la indexación
falla, el formulario informa que el auto quedó guardado pero la búsqueda no se
sincronizó.

Al publicar un auto se ofrece un enlace a su detalle en `/autos/[id]`, donde se
pueden consultar y agregar comentarios y calificaciones con estrellas. Estas
interacciones también están disponibles para las publicaciones de servicios.

## Estado de otras funcionalidades

- Las APIs de autos y servicios, autenticación con Clerk y búsqueda con
  Elasticsearch forman parte del proyecto.
- El mapa y los flujos de búsqueda y publicación de servicios están en
  `/servicios`.
- El formulario autenticado de publicación de autos está en `/autos/publicar`;
  la interfaz de búsqueda de autos sigue pendiente.
- La aplicación web dentro de Docker y el despliegue en la nube siguen
  pendientes.
