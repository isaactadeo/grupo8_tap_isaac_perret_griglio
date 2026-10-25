export type ServiceType = "taller" | "lavadero";

/** Leaflet-friendly coordinates; PostGIS point constructors use lng before lat. */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  clerkUserId: string | null;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Car {
  id: string;
  userId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  description: string;
  /** PostgreSQL numeric values are returned as strings to preserve precision. */
  price: string;
  /** Image URLs are stored in car_images and assembled into this read model. */
  photos: string[];
  location: GeoCoordinates | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  userId: string;
  title: string;
  category: ServiceType;
  description: string;
  /** PostgreSQL numeric values are returned as strings to preserve precision. */
  price: string;
  /** Image URLs are stored in service_images and assembled into this read model. */
  photos: string[];
  location: GeoCoordinates | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingType = "car" | "service";

export interface PublicationComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface RatingSummary {
  averageRating: number;
  ratingCount: number;
  userRating: number | null;
}

export interface MarketplaceSearchDocument {
  id: string;
  kind: ListingType;
  userId: string;
  title: string;
  description: string;
  price: number;
  photos: string[];
  location: { lat: number; lon: number } | null;
  createdAt: string;
  make?: string;
  model?: string;
  year?: number;
  category?: ServiceType;
}

export interface MarketplaceSearchFilters {
  query: string;
  kind?: ListingType;
  category?: ServiceType;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  location?: { lat: number; lon: number; distance: string };
  page: number;
  pageSize: number;
}
