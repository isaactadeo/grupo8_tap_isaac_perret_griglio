import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geography } from "./custom-types";

const timestamps = () => ({
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
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    ...timestamps(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
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
    ...timestamps(),
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

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  location: geography("location"),
  ...timestamps(),
});

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