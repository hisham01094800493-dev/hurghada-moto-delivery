import { decimal, double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "driver", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  vehicleType: varchar("vehicleType", { length: 64 }).notNull().default("موتوسيكل"),
  vehiclePlate: varchar("vehiclePlate", { length: 32 }),
  availability: mysqlEnum("availability", ["offline", "online", "busy", "suspended"]).default("offline").notNull(),
  lastLatitude: double("lastLatitude"),
  lastLongitude: double("lastLongitude"),
  lastLocationAt: timestamp("lastLocationAt"),
  totalTrips: int("totalTrips").notNull().default(0),
  totalEarnings: int("totalEarnings").notNull().default(0),
  commissionPercent: int("commissionPercent").notNull().default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const driverWithdrawalRequests = mysqlTable("driver_withdrawal_requests", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().references(() => drivers.id),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "paid"]).default("pending").notNull(),
  note: text("note"),
  adminNote: text("adminNote"),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const servicePricingRules = mysqlTable("service_pricing_rules", {
  id: int("id").autoincrement().primaryKey(),
  serviceType: mysqlEnum("serviceType", ["person", "parcel", "documents", "items", "other"]).notNull().unique(),
  baseFare: int("baseFare").notNull(),
  perKmFare: int("perKmFare").notNull(),
  minimumFare: int("minimumFare").notNull(),
  updatedByUserId: int("updatedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const savedAddresses = mysqlTable("saved_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  label: varchar("label", { length: 80 }).notNull(),
  address: text("address").notNull(),
  latitude: double("latitude"),
  longitude: double("longitude"),
  isFavorite: int("isFavorite").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deliveryOrders = mysqlTable("delivery_orders", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  userId: int("userId").notNull().references(() => users.id),
  driverId: int("driverId").references(() => drivers.id),
  serviceType: mysqlEnum("serviceType", ["person", "parcel", "documents", "items", "other"]).notNull(),
  status: mysqlEnum("status", ["new", "assigned", "driver_arrived", "picked_up", "in_progress", "in_delivery", "delivered", "cancelled"]).default("new").notNull(),
  customerName: varchar("customerName", { length: 120 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  pickupAddress: text("pickupAddress").notNull(),
  pickupLatitude: double("pickupLatitude"),
  pickupLongitude: double("pickupLongitude"),
  destinationAddress: text("destinationAddress").notNull(),
  destinationLatitude: double("destinationLatitude"),
  destinationLongitude: double("destinationLongitude"),
  requestedFor: timestamp("requestedFor").notNull(),
  recipientName: varchar("recipientName", { length: 120 }),
  recipientPhone: varchar("recipientPhone", { length: 32 }),
  arrivalNotes: text("arrivalNotes"),
  packageDescription: text("packageDescription"),
  packageSize: mysqlEnum("packageSize", ["small", "medium", "large"]).default("small"),
  itemCount: int("itemCount").notNull().default(1),
  contactless: int("contactless").notNull().default(0),
  healthNotes: text("healthNotes"),
  distanceMeters: int("distanceMeters").notNull().default(0),
  estimatedMinutes: int("estimatedMinutes").notNull().default(0),
  estimatedFee: int("estimatedFee").notNull(),
  platformCommissionAmount: int("platformCommissionAmount").notNull().default(0),
  driverEarnings: int("driverEarnings").notNull().default(0),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "vodafone_cash"]).default("cash").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "verifying", "paid", "failed"]).default("pending").notNull(),
  paymentReference: varchar("paymentReference", { length: 64 }),
  paymentReceiptUrl: text("paymentReceiptUrl"),
  acceptedAt: timestamp("acceptedAt"),
  driverArrivedAt: timestamp("driverArrivedAt"),
  pickedUpAt: timestamp("pickedUpAt"),
  deliveryStartedAt: timestamp("deliveryStartedAt"),
  deliveredAt: timestamp("deliveredAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderReviews = mysqlTable("order_reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique().references(() => deliveryOrders.id),
  customerUserId: int("customerUserId").notNull().references(() => users.id),
  driverId: int("driverId").notNull().references(() => drivers.id),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deliveryComplaints = mysqlTable("delivery_complaints", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => deliveryOrders.id),
  customerUserId: int("customerUserId").notNull().references(() => users.id),
  category: mysqlEnum("category", ["driver_behavior", "delay", "item_issue", "payment", "safety", "other"]).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "in_review", "resolved", "closed"]).default("open").notNull(),
  adminNote: text("adminNote"),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderEvents = mysqlTable("order_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => deliveryOrders.id),
  eventType: varchar("eventType", { length: 48 }).notNull(),
  status: varchar("status", { length: 48 }).notNull(),
  note: text("note"),
  actorUserId: int("actorUserId").references(() => users.id),
  latitude: double("latitude"),
  longitude: double("longitude"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const driverOrderInvitations = mysqlTable("driver_order_invitations", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => deliveryOrders.id),
  driverId: int("driverId").notNull().references(() => drivers.id),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired", "cancelled"]).default("pending").notNull(),
  distanceMeters: int("distanceMeters").notNull().default(0),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  respondedAt: timestamp("respondedAt"),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").references(() => deliveryOrders.id),
  senderUserId: int("senderUserId").notNull().references(() => users.id),
  recipientUserId: int("recipientUserId").notNull().references(() => users.id),
  channel: mysqlEnum("channel", ["support", "driver"]).notNull().default("support"),
  messageType: mysqlEnum("messageType", ["text", "audio", "location", "system"]).notNull().default("text"),
  body: text("body"),
  audioDurationSeconds: int("audioDurationSeconds"),
  locationLabel: varchar("locationLabel", { length: 240 }),
  locationLatitude: double("locationLatitude"),
  locationLongitude: double("locationLongitude"),
  locationIsLive: int("locationIsLive").notNull().default(0),
  attachmentUrl: text("attachmentUrl"),
  attachmentName: varchar("attachmentName", { length: 255 }),
  status: mysqlEnum("status", ["sent", "read"]).notNull().default("sent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  orderId: int("orderId").references(() => deliveryOrders.id),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  isRead: int("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = typeof deliveryOrders.$inferInsert;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type DriverOrderInvitation = typeof driverOrderInvitations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type AppNotification = typeof notifications.$inferSelect;
