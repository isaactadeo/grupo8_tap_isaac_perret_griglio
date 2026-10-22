-- Extensiones que vamos a necesitar
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text,
  name varchar(150) NOT NULL,
  email varchar(320) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'usuario'
    CHECK (role IN ('usuario', 'moderador', 'admin')),
  -- Local real verificado por un moderador; NULL si no está verificado.
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Nombre que vio el moderador al verificar; es el que se publica con el tilde.
  verified_name varchar(150),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_idx ON users (email);
CREATE UNIQUE INDEX users_clerk_user_id_idx ON users (clerk_user_id);

CREATE TABLE cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  make varchar(100) NOT NULL,
  model varchar(100) NOT NULL,
  year integer NOT NULL,
  description text NOT NULL,
  price numeric(12, 2) NOT NULL,
  city varchar(100),
  province varchar(60),
  location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE car_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text varchar(250),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  category varchar(100) NOT NULL
    CHECK (category IN ('taller', 'lavadero')),
  description text NOT NULL,
  price numeric(12, 2) NOT NULL,
  location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text varchar(250),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS sin políticas: solo el dueño de las tablas (el usuario con el que se
-- conecta la app) puede leerlas y escribirlas. En Supabase bloquea el acceso
-- a estas tablas desde la Data API (REST) con las claves públicas.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_images ENABLE ROW LEVEL SECURITY;
