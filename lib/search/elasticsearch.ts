import { Client, errors, type estypes } from "@elastic/elasticsearch";
import type {
  Car,
  ListingType,
  MarketplaceSearchDocument,
  MarketplaceSearchFilters,
  Service,
} from "@/src/types";

const MARKETPLACE_INDEX = "marketplace-listings";
const MAX_PAGE_SIZE = 50;
const MAX_RESULT_WINDOW = 10_000;

let client: Client | undefined;
let indexInitialization: Promise<void> | undefined;

function obtenerCliente(): Client {
  if (client) {
    return client;
  }

  const node = process.env.ELASTICSEARCH_URL;
  if (!node) {
    throw new Error("Falta la variable de entorno ELASTICSEARCH_URL");
  }

  const username = process.env.ELASTICSEARCH_USERNAME;
  const password = process.env.ELASTICSEARCH_PASSWORD;
  if (Boolean(username) !== Boolean(password)) {
    throw new Error(
      "ELASTICSEARCH_USERNAME y ELASTICSEARCH_PASSWORD deben configurarse juntos",
    );
  }

  client = new Client({
    node,
    ...(username && password ? { auth: { username, password } } : {}),
  });
  return client;
}

function esIndiceYaCreado(error: unknown): boolean {
  return (
    error instanceof errors.ResponseError &&
    error.body?.error?.type === "resource_already_exists_exception"
  );
}

export async function asegurarIndiceMarketplace(): Promise<void> {
  if (!indexInitialization) {
    indexInitialization = obtenerCliente()
      .indices.create({
        index: MARKETPLACE_INDEX,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          max_ngram_diff: 13,
          analysis: {
            filter: {
              spanish_stop: {
                type: "stop",
                stopwords: "_spanish_",
              },
              spanish_light_stemmer: {
                type: "stemmer",
                language: "light_spanish",
              },
              autocomplete_edge_ngram: {
                type: "edge_ngram",
                min_gram: 2,
                max_gram: 15,
              },
            },
            analyzer: {
              spanish_marketplace: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding",
                  "spanish_stop",
                  "spanish_light_stemmer",
                ],
              },
              spanish_autocomplete_index: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding",
                  "autocomplete_edge_ngram",
                ],
              },
              spanish_autocomplete_search: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding"],
              },
            },
          },
        },
        mappings: {
          dynamic: "strict",
          properties: {
            id: { type: "keyword" },
            kind: { type: "keyword" },
            userId: { type: "keyword" },
            title: {
              type: "text",
              analyzer: "spanish_marketplace",
              fields: {
                keyword: { type: "keyword", ignore_above: 256 },
                autocomplete: {
                  type: "text",
                  analyzer: "spanish_autocomplete_index",
                  search_analyzer: "spanish_autocomplete_search",
                  norms: false,
                },
              },
            },
            description: { type: "text", analyzer: "spanish_marketplace" },
            make: {
              type: "text",
              analyzer: "spanish_marketplace",
              fields: { keyword: { type: "keyword", ignore_above: 128 } },
            },
            model: {
              type: "text",
              analyzer: "spanish_marketplace",
              fields: { keyword: { type: "keyword", ignore_above: 128 } },
            },
            category: {
              type: "text",
              analyzer: "spanish_marketplace",
              fields: { keyword: { type: "keyword", ignore_above: 64 } },
            },
            year: { type: "integer" },
            price: { type: "scaled_float", scaling_factor: 100 },
            photos: { type: "keyword", index: false },
            location: { type: "geo_point" },
            createdAt: { type: "date" },
          },
        },
      })
      .then(() => undefined)
      .catch((error: unknown) => {
        if (esIndiceYaCreado(error)) {
          return;
        }

        indexInitialization = undefined;
        throw error;
      });
  }

  return indexInitialization;
}

function obtenerIdDocumento(kind: ListingType, id: string): string {
  return `${kind}:${id}`;
}

function convertirUbicacion(
  location: Car["location"] | Service["location"],
): MarketplaceSearchDocument["location"] {
  return location ? { lat: location.lat, lon: location.lng } : null;
}

export function convertirAutoADocumentoBusqueda(
  car: Car,
): MarketplaceSearchDocument {
  const price = Number(car.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Precio inválido para el auto ${car.id}`);
  }

  return {
    id: car.id,
    kind: "car",
    userId: car.userId,
    title: car.title,
    description: car.description,
    price,
    photos: car.photos,
    location: convertirUbicacion(car.location),
    createdAt: car.createdAt.toISOString(),
    make: car.make,
    model: car.model,
    year: car.year,
  };
}

export function convertirServicioADocumentoBusqueda(
  service: Service,
): MarketplaceSearchDocument {
  const price = Number(service.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Precio inválido para el servicio ${service.id}`);
  }

  return {
    id: service.id,
    kind: "service",
    userId: service.userId,
    title: service.title,
    description: service.description,
    price,
    photos: service.photos,
    location: convertirUbicacion(service.location),
    createdAt: service.createdAt.toISOString(),
    category: service.category,
  };
}

export async function indexarPublicacion(
  listing: MarketplaceSearchDocument,
): Promise<void> {
  await asegurarIndiceMarketplace();
  await obtenerCliente().index({
    index: MARKETPLACE_INDEX,
    id: obtenerIdDocumento(listing.kind, listing.id),
    document: listing,
  });
}

export function indexarAuto(car: Car): Promise<void> {
  return indexarPublicacion(convertirAutoADocumentoBusqueda(car));
}

export function indexarServicio(service: Service): Promise<void> {
  return indexarPublicacion(convertirServicioADocumentoBusqueda(service));
}

export async function indexarPublicaciones(
  listings: MarketplaceSearchDocument[],
): Promise<void> {
  if (listings.length === 0) {
    return;
  }

  await asegurarIndiceMarketplace();
  const operations: (
    | estypes.BulkOperationContainer
    | MarketplaceSearchDocument
  )[] = [];
  for (const listing of listings) {
    operations.push(
      {
        index: {
          _index: MARKETPLACE_INDEX,
          _id: obtenerIdDocumento(listing.kind, listing.id),
        },
      },
      listing,
    );
  }

  const response = await obtenerCliente().bulk({ operations });
  if (response.errors) {
    const failures = response.items.flatMap((item) =>
      item.index?.error
        ? [`${item.index._id}: ${item.index.error.reason}`]
        : [],
    );
    throw new Error(
      `No se pudieron indexar ${failures.length} publicaciones: ${failures.slice(0, 5).join("; ")}`,
    );
  }
}

export async function eliminarPublicacion(
  kind: ListingType,
  id: string,
): Promise<void> {
  await asegurarIndiceMarketplace();

  try {
    await obtenerCliente().delete({
      index: MARKETPLACE_INDEX,
      id: obtenerIdDocumento(kind, id),
    });
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error.meta.statusCode === 404
    ) {
      return;
    }
    throw error;
  }
}

export interface MarketplaceSearchResult {
  items: MarketplaceSearchDocument[];
  total: number;
  totalRelation: "eq" | "gte";
  page: number;
  pageSize: number;
}

export async function buscarPublicaciones(
  filters: MarketplaceSearchFilters,
): Promise<MarketplaceSearchResult> {
  const from = (filters.page - 1) * filters.pageSize;
  if (
    filters.pageSize < 1 ||
    filters.pageSize > MAX_PAGE_SIZE ||
    from + filters.pageSize > MAX_RESULT_WINDOW
  ) {
    throw new RangeError("La paginación solicitada excede los límites");
  }

  await asegurarIndiceMarketplace();

  const must: estypes.QueryDslQueryContainer[] = [
    {
      bool: {
        should: [
          {
            multi_match: {
              query: filters.query,
              fields: ["title^6", "make^4", "model^4", "category^3"],
              type: "cross_fields",
              operator: "and",
            },
          },
          {
            multi_match: {
              query: filters.query,
              fields: [
                "title^6",
                "make^4",
                "model^4",
                "category^3",
                "description",
              ],
              type: "best_fields",
              operator: "and",
              fuzziness: "AUTO",
              prefix_length: 2,
              max_expansions: 25,
            },
          },
          {
            match: {
              "title.autocomplete": {
                query: filters.query,
                operator: "and",
                boost: 3,
              },
            },
          },
          {
            match_phrase: {
              title: { query: filters.query, boost: 8 },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];

  const filter: estypes.QueryDslQueryContainer[] = [];
  if (filters.kind) {
    filter.push({ term: { kind: filters.kind } });
  }
  if (filters.category) {
    filter.push({ term: { "category.keyword": filters.category } });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter.push({
      range: {
        price: {
          ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
          ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
        },
      },
    });
  }
  if (filters.minYear !== undefined || filters.maxYear !== undefined) {
    filter.push({
      range: {
        year: {
          ...(filters.minYear !== undefined ? { gte: filters.minYear } : {}),
          ...(filters.maxYear !== undefined ? { lte: filters.maxYear } : {}),
        },
      },
    });
  }
  if (filters.location) {
    filter.push({
      geo_distance: {
        distance: filters.location.distance,
        location: {
          lat: filters.location.lat,
          lon: filters.location.lon,
        },
      },
    });
  }

  const response = await obtenerCliente().search<MarketplaceSearchDocument>({
    index: MARKETPLACE_INDEX,
    from,
    size: filters.pageSize,
    track_total_hits: MAX_RESULT_WINDOW,
    query: {
      bool: {
        must,
        filter,
      },
    },
    sort: [{ _score: { order: "desc" } }, { createdAt: { order: "desc" } }],
  });

  const total = response.hits.total;
  return {
    items: response.hits.hits.flatMap((hit) =>
      hit._source ? [hit._source] : [],
    ),
    total: typeof total === "number" ? total : (total?.value ?? 0),
    totalRelation: typeof total === "number" ? "eq" : (total?.relation ?? "eq"),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
