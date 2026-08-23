import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const deliveryOrders = mysqlTable("delivery_orders", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  userId: int("userId").notNull().references(() => users.id),
  serviceType: mysqlEnum("serviceType", ["person", "parcel"]).notNull(),
  status: mysqlEnum("status", ["new", "in_progress", "delivered"]).default("new").notNull(),
  customerName: varchar("customerName", { length: 120 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  pickupAddress: text("pickupAddress").notNull(),
  destinationAddress: text("destinationAddress").notNull(),
  requestedFor: timestamp("requestedFor").notNull(),
  recipientName: varchar("recipientName", { length: 120 }),
  recipientPhone: varchar("recipientPhone", { length: 32 }),
  packageDescription: text("packageDescription"),
  contactless: int("contactless").notNull().default(0),
  healthNotes: text("healthNotes"),
  estimatedFee: int("estimatedFee").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = typeof deliveryOrders.$inferInsert;
