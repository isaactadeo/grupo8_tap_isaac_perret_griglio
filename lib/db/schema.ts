import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { geography } from "./custom-types";

const camposDeTiempo = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id"),
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    ...camposDeTiempo(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const cars = pgTable(
  "cars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    make: varchar("make", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    year: integer("year").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    location: geography("location"),
    ...camposDeTiempo(),
  },
);

export const carImages = pgTable("car_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  carId: uuid("car_id")
    .notNull()
    .references(() => cars.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: varchar("alt_text", { length: 250 }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    category: varchar("category", { length: 100 })
      .$type<"taller" | "lavadero">()
      .notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    location: geography("location"),
    ...camposDeTiempo(),
  },
  (table) => [
    check(
      "services_category_check",
      sql`${table.category} in ('taller', 'lavadero')`,
    ),
  ],
);

export const serviceImages = pgTable("service_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: varchar("alt_text", { length: 250 }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const carComments = pgTable(
  "car_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    carId: uuid("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: varchar("content", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("car_comments_car_created_idx").on(table.carId, table.createdAt),
  ],
);

export const serviceComments = pgTable(
  "service_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: varchar("content", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("service_comments_service_created_idx").on(
      table.serviceId,
      table.createdAt,
    ),
  ],
);

export const carRatings = pgTable(
  "car_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    carId: uuid("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: smallint("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("car_ratings_stars_check", sql`${table.stars} between 1 and 5`),
    uniqueIndex("car_ratings_car_user_idx").on(table.carId, table.userId),
  ],
);

export const serviceRatings = pgTable(
  "service_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: smallint("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "service_ratings_stars_check",
      sql`${table.stars} between 1 and 5`,
    ),
    uniqueIndex("service_ratings_service_user_idx").on(
      table.serviceId,
      table.userId,
    ),
  ],
);