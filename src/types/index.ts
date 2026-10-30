export type ServiceType = "taller" | "lavadero";

export type UserRole = "usuario" | "moderador" | "admin";

/** Leaflet-friendly coordinates; PostGIS point constructors use lng before lat. */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface MapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface User {
  id: string;
  clerkUserId: string | null;
  name: string;
  email: string;
  role: UserRole;
  /** Set when a moderator verifies the user as a real business. */
  verifiedAt: Date | null;
  verifiedBy: string | null;
  /** Public name approved at verification; shown next to the check mark. */
  verifiedName: string | null;
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
  /** Free-text city and an Argentine province; null on listings created before these fields existed. */
  city: string | null;
  province: string | null;
  location: GeoCoordinates | null;
  /** The owner is a business verified by a moderator. */
  ownerVerified: boolean;
  /**
   * Owner's public name: the name approved at verification for verified
   * owners; null when the stored name is the owner's email.
   */
  ownerName: string | null;
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
  /** The owner is a business verified by a moderator. */
  ownerVerified: boolean;
  /**
   * Owner's public name: the name approved at verification for verified
   * owners; null when the stored name is the owner's email.
   */
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingType = "car" | "service";

export interface PublicationComment {
  id: string;
  content: string;
  authorName: string;
  /** Estrellas que el autor le dio a la publicación, si la calificó. */
  authorRating: number | null;
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
  /** Missing on documents indexed before owner verification existed. */
  ownerVerified?: boolean;
  ownerName?: string;
  averageRating?: number;
  ratingCount?: number;
  make?: string;
  model?: string;
  year?: number;
  city?: string;
  province?: string;
  category?: ServiceType;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** ISO date, serializable for client components. */
  verifiedAt: string | null;
  /** Name shown publicly with the check mark; may differ from the current name. */
  verifiedName: string | null;
  carCount: number;
  serviceCount: number;
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
  viewport?: { north: number; south: number; east: number; west: number };
  page: number;
  pageSize: number;
}
