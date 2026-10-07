This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database

Start the PostgreSQL/PostGIS container and make sure `.env.local` has the
`DATABASE_URL` connection string:

```bash
docker compose up -d db
npm run db:generate
npm run db:migrate
```

The schema is defined in `lib/db/schema.ts`; generated and custom SQL migrations
are stored in `database/migrations`. The car full-text search vector uses the
Spanish dictionary and is maintained by PostgreSQL as car data changes.

To check that all five tables exist:

```bash
docker exec rafaela_db psql -U rafaela -d rafaela -c "\dt"
```

To verify Spanish full-text matching against a temporary car record (the
transaction is rolled back, so no test data is kept):

```powershell
@'
BEGIN;
INSERT INTO users (name, email, password_hash)
VALUES ('Migration test', 'migration-test@example.invalid', 'temporary-validation-hash');
INSERT INTO cars (user_id, title, make, model, year, description, price)
SELECT id, 'Mecanico especializado', 'Renault', 'Kangoo', 2020, 'Cambio de frenos y mantenimiento', 2500
FROM users WHERE email = 'migration-test@example.invalid';
SELECT title, search_vector @@ plainto_tsquery('spanish'::regconfig, 'mecanicos frenos') AS matches
FROM cars WHERE title = 'Mecanico especializado';
ROLLBACK;
'@ | docker exec -i rafaela_db psql -v ON_ERROR_STOP=1 -U rafaela -d rafaela
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
