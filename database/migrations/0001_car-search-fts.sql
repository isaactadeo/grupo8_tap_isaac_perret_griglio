ALTER TABLE "cars"
ADD COLUMN "search_vector" tsvector
GENERATED ALWAYS AS (
  to_tsvector(
    'spanish'::regconfig,
    title || ' ' || make || ' ' || model || ' ' || description
  )
) STORED;
--> statement-breakpoint
CREATE INDEX "cars_search_vector_idx" ON "cars" USING gin ("search_vector");