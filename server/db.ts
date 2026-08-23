import { and, desc, eq, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { chatMessages, deliveryOrders, driverOrderInvitations, drivers, InsertDeliveryOrder, InsertUser, notifications, orderEvents, savedAddresses, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { assertPaymentReceiptAccess, canEnterDriverOperations, validateDriverStatusUpdate } from "./delivery";
import { buildDailyDeliveryReport } from "../shared/reporting";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId }; const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "phone", "loginMethod"] as const) if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0]; }

export function calculateDistanceMeters(latitude1: number, longitude1: number, latitude2: number, longitude2: number) {
  const earthRadius = 6371000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLatitude = radians(latitude2 - latitude1);
  const dLongitude = radians(longitude2 - longitude1);
  const a = Math.sin(dLatitude / 2) ** 2 + Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(dLongitude / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function dispatchOrderToNearestDrivers(db: Awaited<ReturnType<typeof getDb>>, order: typeof deliveryOrders.$inferSelect) {
  if (!db || order.pickupLatitude === null || order.pickupLongitude === null) return [];
  const availableDrivers = await db.select().from(drivers).where(eq(drivers.availability, "online"));
  const nearest = availableDrivers
    .filter((driver) => driver.lastLatitude !== null && driver.lastLongitude !== null)
    .map((driver) => ({ driver, distance: calculateDistanceMeters(order.pickupLatitude!, order.pickupLongitude!, driver.lastLatitude!, driver.lastLongitude!) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 5);
  if (!nearest.length) {
    await db.insert(notifications).values({ userId: order.userId, orderId: order.id, title: "جارٍ البحث عن مندوب", body: "تم استلام طلبك، وسنخبرك فور توفر مندوب قريب." });
    return [];
  }
  const expiresAt = new Date(Date.now() + 120000);
  await db.insert(driverOrderInvitations).values(nearest.map(({ driver, distance }) => ({ orderId: order.id, driverId: driver.id, distanceMeters: distance, expiresAt })));
  await db.insert(notifications).values(nearest.map(({ driver }) => ({ userId: driver.userId, orderId: order.id, title: "طلب توصيل قريب", body: `طلب جديد قريب منك برقم ${order.reference}. يمكنك فتحه وقبوله أو رفضه.` })));
  return nearest;
}

export async function createDeliveryOrder(order: InsertDeliveryOrder) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا. حاول مرة أخرى بعد قليل.");
  await db.insert(deliveryOrders).values(order);
  const saved = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, order.reference)).limit(1))[0];
  if (!saved) throw new Error("تعذر حفظ الطلب.");
  await db.insert(orderEvents).values({ orderId: saved.id, eventType: "created", status: "new", note: "تم إنشاء الطلب وانتظار قبول مندوب قريب", actorUserId: order.userId });
  await db.insert(notifications).values({ userId: order.userId, orderId: saved.id, title: "تم إنشاء طلبك", body: `رقم الطلب ${saved.reference} قيد البحث عن مندوب قريب.` });
  await dispatchOrderToNearestDrivers(db, saved);
  return saved;
}

export async function getDeliveryOrdersForUser(userId: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا. حاول مرة أخرى بعد قليل."); return db.select().from(deliveryOrders).where(eq(deliveryOrders.userId, userId)).orderBy(desc(deliveryOrders.createdAt)); }

export async function getDeliveryOrderWithEventsForUser(reference: string, userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا. حاول مرة أخرى بعد قليل.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0];
  if (!order || order.userId !== userId) return undefined;
  const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(desc(orderEvents.createdAt));
  const driver = order.driverId ? await getDriverById(order.driverId) : undefined;
  return { order, events, driver };
}

export async function getDriverByUserId(userId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1))[0]; }

export async function getNewOrdersForDriver(driverId: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); const invitations = await db.select().from(driverOrderInvitations).where(and(eq(driverOrderInvitations.driverId, driverId), eq(driverOrderInvitations.status, "pending"))); const orderIds = invitations.filter((invitation) => invitation.expiresAt > new Date()).map((invitation) => invitation.orderId); if (!orderIds.length) return []; const orders = await db.select().from(deliveryOrders).where(and(inArray(deliveryOrders.id, orderIds), eq(deliveryOrders.status, "new"))).orderBy(desc(deliveryOrders.createdAt)); return orders.filter(canEnterDriverOperations); }

export async function getOrdersForDriver(driverId: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(deliveryOrders).where(eq(deliveryOrders.driverId, driverId)).orderBy(desc(deliveryOrders.createdAt)); }

export async function updateDriverAvailability(driverId: number, availability: "offline" | "online" | "busy" | "suspended") { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); await db.update(drivers).set({ availability }).where(eq(drivers.id, driverId)); return getDriverById(driverId); }
export async function getDriverById(driverId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1))[0]; }
export async function updateDriverLocation(driverId: number, latitude: number, longitude: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); await db.update(drivers).set({ lastLatitude: latitude, lastLongitude: longitude, lastLocationAt: new Date() }).where(eq(drivers.id, driverId)); return getDriverById(driverId); }

export async function acceptOrderForDriver(orderId: number, driverId: number, actorUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const target = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!target || target.status !== "new") throw new Error("هذا الطلب لم يعد متاحًا.");
  if (!canEnterDriverOperations(target)) throw new Error("لا يمكن بدء التنفيذ قبل اعتماد الدفع.");
  const invitation = (await db.select().from(driverOrderInvitations).where(and(eq(driverOrderInvitations.orderId, orderId), eq(driverOrderInvitations.driverId, driverId), eq(driverOrderInvitations.status, "pending"))).limit(1))[0];
  if (!invitation || invitation.expiresAt <= new Date()) throw new Error("هذه الدعوة غير متاحة أو انتهت مهلة قبولها.");
  const assignment = await db.update(deliveryOrders).set({ driverId, status: "assigned", acceptedAt: new Date() }).where(and(eq(deliveryOrders.id, orderId), eq(deliveryOrders.status, "new")));
  if (!assignment[0].affectedRows) throw new Error("تم قبول الطلب من سائق آخر قبل تأكيدك.");
  await db.update(driverOrderInvitations).set({ status: "accepted", respondedAt: new Date() }).where(eq(driverOrderInvitations.id, invitation.id));
  await db.update(driverOrderInvitations).set({ status: "cancelled", respondedAt: new Date() }).where(and(eq(driverOrderInvitations.orderId, orderId), eq(driverOrderInvitations.status, "pending")));
  await db.update(drivers).set({ availability: "busy" }).where(eq(drivers.id, driverId));
  await db.insert(orderEvents).values({ orderId, eventType: "assigned", status: "assigned", note: "تم قبول الطلب من المندوب", actorUserId });
  await db.insert(notifications).values({ userId: target.userId, orderId, title: "تم قبول طلبك", body: "تم تعيين مندوب لرحلتك ويمكنك متابعة التفاصيل الآن." });
  return (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
}

export async function rejectOrderInvitation(orderId: number, driverId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const invitation = (await db.select().from(driverOrderInvitations).where(and(eq(driverOrderInvitations.orderId, orderId), eq(driverOrderInvitations.driverId, driverId), eq(driverOrderInvitations.status, "pending"))).limit(1))[0];
  if (!invitation) throw new Error("هذه الدعوة غير متاحة.");
  await db.update(driverOrderInvitations).set({ status: "rejected", respondedAt: new Date() }).where(eq(driverOrderInvitations.id, invitation.id));
  const remaining = await db.select().from(driverOrderInvitations).where(and(eq(driverOrderInvitations.orderId, orderId), eq(driverOrderInvitations.status, "pending")));
  if (!remaining.length) {
    const target = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
    if (target && target.status === "new") await db.insert(notifications).values({ userId: target.userId, orderId, title: "جارٍ البحث عن مندوب آخر", body: "اعتذر السائقون المتاحون، وسنحاول إسناد الطلب إلى مندوب آخر." });
  }
  return { success: true } as const;
}

export async function cancelOrderForCustomer(reference: string, customerUserId: number, reason?: string) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const target = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0];
  if (!target || target.userId !== customerUserId) throw new Error("لا يمكنك إلغاء هذا الطلب.");
  if (!["new", "assigned", "driver_arrived"].includes(target.status)) throw new Error("لا يمكن إلغاء الطلب بعد استلامه أو بدء التوصيل. تواصل مع الدعم للمساعدة.");
  const cancellationReason = reason?.trim().slice(0, 500) || "تم الإلغاء من العميل";
  const updated = await db.update(deliveryOrders).set({ status: "cancelled", cancelledAt: new Date(), cancellationReason }).where(and(eq(deliveryOrders.id, target.id), inArray(deliveryOrders.status, ["new", "assigned", "driver_arrived"]))) as any;
  if (!updated[0]?.affectedRows) throw new Error("تعذر إلغاء الطلب؛ ربما تغيرت حالته.");
  await db.update(driverOrderInvitations).set({ status: "cancelled", respondedAt: new Date() }).where(and(eq(driverOrderInvitations.orderId, target.id), eq(driverOrderInvitations.status, "pending")));
  if (target.driverId) { const driver = await getDriverById(target.driverId); if (driver) { await db.update(drivers).set({ availability: "online" }).where(eq(drivers.id, driver.id)); await db.insert(notifications).values({ userId: driver.userId, orderId: target.id, title: "تم إلغاء الطلب", body: `ألغى العميل الطلب ${target.reference}.` }); } }
  await db.insert(orderEvents).values({ orderId: target.id, eventType: "cancelled", status: "cancelled", note: cancellationReason, actorUserId: customerUserId });
  await db.insert(notifications).values({ userId: customerUserId, orderId: target.id, title: "تم إلغاء الطلب", body: "تم إلغاء الطلب بنجاح." });
  return (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, target.id)).limit(1))[0];
}

export async function updateDriverOrderStatus(orderId: number, driverId: number, actorUserId: number, status: "driver_arrived" | "picked_up" | "in_delivery" | "delivered") {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const target = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!target) throw new Error("لا يمكنك تحديث هذا الطلب.");
  if (!canEnterDriverOperations(target)) throw new Error("لا يمكن تحديث الطلب قبل اعتماد الدفع.");
  validateDriverStatusUpdate({ assignedDriverId: target.driverId, actingDriverId: driverId, currentStatus: target.status, nextStatus: status });
  const dateField = { driver_arrived: { driverArrivedAt: new Date() }, picked_up: { pickedUpAt: new Date() }, in_delivery: { deliveryStartedAt: new Date() }, delivered: { deliveredAt: new Date() } }[status];
  await db.update(deliveryOrders).set({ status, ...dateField }).where(eq(deliveryOrders.id, orderId));
  if (status === "delivered") {
    const driver = await getDriverById(driverId);
    if (driver) await db.update(drivers).set({ availability: "online", totalTrips: driver.totalTrips + 1, totalEarnings: driver.totalEarnings + target.estimatedFee }).where(eq(drivers.id, driverId));
  }
  const notes = { driver_arrived: "وصل المندوب إلى موقع الاستلام", picked_up: "تم استلام الطلب", in_delivery: "بدأ المندوب التوصيل", delivered: "تم تسليم الطلب" } as const;
  await db.insert(orderEvents).values({ orderId, eventType: status, status, note: notes[status], actorUserId });
  const notificationTitles = { driver_arrived: "المندوب وصل", picked_up: "تم استلام طلبك", in_delivery: "طلبك في الطريق", delivered: "تم تسليم طلبك" } as const;
  await db.insert(notifications).values({ userId: target.userId, orderId, title: notificationTitles[status], body: notes[status] });
  return (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
}

export async function getAdminDailyReport(targetDate = new Date()) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const orders = await db.select({ status: deliveryOrders.status, deliveredAt: deliveryOrders.deliveredAt, estimatedFee: deliveryOrders.estimatedFee, serviceType: deliveryOrders.serviceType, paymentMethod: deliveryOrders.paymentMethod }).from(deliveryOrders);
  return buildDailyDeliveryReport(orders, targetDate);
}

export async function getAdminSummary() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [orders, driverRows] = await Promise.all([db.select().from(deliveryOrders), db.select().from(drivers)]);
  return { totalOrders: orders.length, activeOrders: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length, deliveredOrders: orders.filter((order) => order.status === "delivered").length, cancelledOrders: orders.filter((order) => order.status === "cancelled").length, onlineDrivers: driverRows.filter((driver) => driver.availability === "online" || driver.availability === "busy").length, offlineDrivers: driverRows.filter((driver) => driver.availability === "offline").length, estimatedRevenue: orders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + order.estimatedFee, 0) };
}

export async function getAdminDrivers() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(drivers).orderBy(desc(drivers.updatedAt)); }
export async function getAdminUsers() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)); }
export async function createDriverForUser(input: { userId: number; displayName: string; phone: string; vehicleType: string; vehiclePlate?: string }) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); await db.update(users).set({ role: "driver" }).where(eq(users.id, input.userId)); await db.insert(drivers).values({ ...input, vehiclePlate: input.vehiclePlate || null, availability: "offline" }); return getDriverByUserId(input.userId); }
export async function setDriverAdminStatus(driverId: number, availability: "offline" | "online" | "suspended") { return updateDriverAvailability(driverId, availability); }
export async function getAdminOrders() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(deliveryOrders).orderBy(desc(deliveryOrders.createdAt)); }

export async function getProfileWithAddresses(userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  const addresses = await db.select().from(savedAddresses).where(eq(savedAddresses.userId, userId)).orderBy(desc(savedAddresses.isFavorite), desc(savedAddresses.updatedAt));
  return { user, addresses };
}

export async function saveAddressForUser(input: { userId: number; label: string; address: string; isFavorite: boolean }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.insert(savedAddresses).values({ userId: input.userId, label: input.label, address: input.address, isFavorite: input.isFavorite ? 1 : 0 });
  return db.select().from(savedAddresses).where(eq(savedAddresses.userId, input.userId)).orderBy(desc(savedAddresses.updatedAt));
}

export async function updateContactForUser(userId: number, name: string, phone: string) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.update(users).set({ name, phone }).where(eq(users.id, userId));
  return getProfileWithAddresses(userId);
}

async function insertAudioMessage(input: { orderId?: number; senderUserId: number; recipientUserId: number; channel: "support" | "driver"; body?: string; attachmentUrl: string; attachmentName: string; audioDurationSeconds: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.insert(chatMessages).values({ orderId: input.orderId ?? null, senderUserId: input.senderUserId, recipientUserId: input.recipientUserId, channel: input.channel, messageType: "audio", body: input.body || null, attachmentUrl: input.attachmentUrl, attachmentName: input.attachmentName, audioDurationSeconds: input.audioDurationSeconds });
  await db.insert(notifications).values({ userId: input.recipientUserId, orderId: input.orderId ?? null, title: "رسالة صوتية جديدة", body: "أرسل لك الطرف الآخر رسالة صوتية." });
  return true;
}

export async function sendSupportAudio(senderUserId: number, attachmentUrl: string, attachmentName: string, audioDurationSeconds: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const admin = (await db.select().from(users).where(eq(users.role, "admin")).limit(1))[0]; if (!admin) throw new Error("لا يتوفر حساب دعم حاليًا.");
  await insertAudioMessage({ senderUserId, recipientUserId: admin.id, channel: "support", attachmentUrl, attachmentName, audioDurationSeconds });
  return getSupportConversation(senderUserId);
}

export async function sendCustomerDriverAudio(reference: string, customerUserId: number, attachmentUrl: string, attachmentName: string, audioDurationSeconds: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0]; if (!order || order.userId !== customerUserId || !order.driverId) throw new Error("لم يُعيّن مندوب لهذا الطلب بعد.");
  const driver = await getDriverById(order.driverId); if (!driver) throw new Error("بيانات المندوب غير متاحة.");
  await insertAudioMessage({ orderId: order.id, senderUserId: customerUserId, recipientUserId: driver.userId, channel: "driver", attachmentUrl, attachmentName, audioDurationSeconds });
  return getDriverChatForCustomer(reference, customerUserId);
}

export async function sendDriverCustomerAudio(orderId: number, driverUserId: number, attachmentUrl: string, attachmentName: string, audioDurationSeconds: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(driverUserId); const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0]; if (!driver || !order || order.driverId !== driver.id) throw new Error("لا يمكنك مراسلة هذا العميل.");
  await insertAudioMessage({ orderId, senderUserId: driverUserId, recipientUserId: order.userId, channel: "driver", attachmentUrl, attachmentName, audioDurationSeconds });
  return getDriverChatForDriver(orderId, driverUserId);
}

export async function createLiveLocationMessage(orderId: number, senderUserId: number, latitude: number, longitude: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0]; const senderDriver = await getDriverByUserId(senderUserId); if (!order || (order.userId !== senderUserId && (!senderDriver || senderDriver.id !== order.driverId))) throw new Error("لا يمكنك مشاركة موقعك في هذا الطلب.");
  const driver = order.driverId ? await getDriverById(order.driverId) : undefined; const recipientUserId = order.userId === senderUserId ? driver?.userId : order.userId; if (!recipientUserId) throw new Error("لا يوجد طرف آخر لمشاركة الموقع معه.");
  const inserted = await db.insert(chatMessages).values({ orderId, senderUserId, recipientUserId, channel: "driver", messageType: "location", body: "مشاركة موقع مباشر", locationLabel: "موقع مباشر", locationLatitude: latitude, locationLongitude: longitude, locationIsLive: 1 });
  await db.insert(notifications).values({ userId: recipientUserId, orderId, title: "تمت مشاركة موقع مباشر", body: "شارك الطرف الآخر موقعه الجغرافي معك." });
  return inserted[0].insertId;
}

export async function updateLiveLocation(messageId: number, senderUserId: number, latitude?: number, longitude?: number, isLive = true) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const message = (await db.select().from(chatMessages).where(eq(chatMessages.id, messageId)).limit(1))[0]; if (!message || message.senderUserId !== senderUserId || message.messageType !== "location") throw new Error("لا يمكنك تحديث مشاركة الموقع هذه.");
  const wasLive = message.locationIsLive === 1; const locationPatch = { locationIsLive: isLive ? 1 : 0, locationLatitude: typeof latitude === "number" ? latitude : message.locationLatitude, locationLongitude: typeof longitude === "number" ? longitude : message.locationLongitude }; await db.update(chatMessages).set(locationPatch).where(eq(chatMessages.id, messageId)); if (!isLive && wasLive) { const senderDriver = await getDriverByUserId(senderUserId); const actorLabel = senderDriver ? "المندوب" : "العميل"; const stopMessage = `أوقف ${actorLabel} مشاركة الموقع المباشر.`; await db.insert(chatMessages).values({ orderId: message.orderId, senderUserId, recipientUserId: message.recipientUserId, channel: "driver", messageType: "system", body: stopMessage, locationLabel: "إيقاف مشاركة الموقع" }); await db.insert(notifications).values({ userId: message.recipientUserId, orderId: message.orderId, title: "توقفت مشاركة الموقع المباشر", body: stopMessage }); } return true;
}

export async function getSupportConversation(userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return db.select().from(chatMessages).where(and(eq(chatMessages.channel, "support"), or(eq(chatMessages.senderUserId, userId), eq(chatMessages.recipientUserId, userId)))).orderBy(chatMessages.createdAt);
}

export async function sendSupportMessage(input: { senderUserId: number; body: string; locationLabel?: string; locationLatitude?: number; locationLongitude?: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const admin = (await db.select().from(users).where(eq(users.role, "admin")).limit(1))[0];
  if (!admin) throw new Error("لا يتوفر حساب دعم حاليًا.");
  await db.insert(chatMessages).values({ senderUserId: input.senderUserId, recipientUserId: admin.id, channel: "support", body: input.body, locationLabel: input.locationLabel || null, locationLatitude: input.locationLatitude ?? null, locationLongitude: input.locationLongitude ?? null });
  await db.insert(notifications).values({ userId: admin.id, title: "رسالة دعم جديدة", body: input.body });
  return getSupportConversation(input.senderUserId);
}

export async function markSupportMessagesRead(userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.update(chatMessages).set({ status: "read" }).where(and(eq(chatMessages.recipientUserId, userId), eq(chatMessages.channel, "support"), eq(chatMessages.status, "sent")));
  return true;
}

export async function getAdminSupportInbox(adminUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return db.select().from(chatMessages).where(and(eq(chatMessages.channel, "support"), eq(chatMessages.recipientUserId, adminUserId))).orderBy(desc(chatMessages.createdAt));
}

export async function sendAdminSupportReply(input: { adminUserId: number; recipientUserId: number; body: string }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.insert(chatMessages).values({ senderUserId: input.adminUserId, recipientUserId: input.recipientUserId, channel: "support", body: input.body });
  await db.insert(notifications).values({ userId: input.recipientUserId, title: "رد جديد من الدعم", body: input.body });
  return getAdminSupportInbox(input.adminUserId);
}

export async function getUnreadMessageCounts(userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const messages = await db.select({ channel: chatMessages.channel }).from(chatMessages).where(and(eq(chatMessages.recipientUserId, userId), eq(chatMessages.status, "sent")));
  return { support: messages.filter((message) => message.channel === "support").length, driver: messages.filter((message) => message.channel === "driver").length, total: messages.length };
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function getDriverChatForCustomer(reference: string, customerUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0];
  if (!order || order.userId !== customerUserId || !order.driverId) return { available: false as const, messages: [] };
  return { available: true as const, messages: await db.select().from(chatMessages).where(and(eq(chatMessages.orderId, order.id), eq(chatMessages.channel, "driver"))).orderBy(chatMessages.createdAt) };
}

export async function markCustomerDriverChatRead(reference: string, customerUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0];
  if (!order || order.userId !== customerUserId || !order.driverId) throw new Error("لا يمكنك تحديث رسائل هذا الطلب.");
  await db.update(chatMessages).set({ status: "read" }).where(and(eq(chatMessages.orderId, order.id), eq(chatMessages.recipientUserId, customerUserId), eq(chatMessages.channel, "driver"), eq(chatMessages.status, "sent")));
  return true;
}

export async function sendCustomerDriverMessage(reference: string, customerUserId: number, body: string) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0];
  if (!order || order.userId !== customerUserId || !order.driverId) throw new Error("لم يُعيّن مندوب لهذا الطلب بعد.");
  const driver = await getDriverById(order.driverId); if (!driver) throw new Error("بيانات المندوب غير متاحة.");
  await db.insert(chatMessages).values({ orderId: order.id, senderUserId: customerUserId, recipientUserId: driver.userId, channel: "driver", body });
  await db.insert(notifications).values({ userId: driver.userId, orderId: order.id, title: "رسالة جديدة من عميل", body });
  return getDriverChatForCustomer(reference, customerUserId);
}

export async function getDriverChatForDriver(orderId: number, driverUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(driverUserId); const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!driver || !order || order.driverId !== driver.id) throw new Error("لا يمكنك عرض رسائل هذا الطلب.");
  return db.select().from(chatMessages).where(and(eq(chatMessages.orderId, orderId), eq(chatMessages.channel, "driver"))).orderBy(chatMessages.createdAt);
}

export async function markDriverChatRead(orderId: number, driverUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(driverUserId); const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!driver || !order || order.driverId !== driver.id) throw new Error("لا يمكنك تحديث رسائل هذا الطلب.");
  await db.update(chatMessages).set({ status: "read" }).where(and(eq(chatMessages.orderId, orderId), eq(chatMessages.recipientUserId, driverUserId), eq(chatMessages.channel, "driver"), eq(chatMessages.status, "sent")));
  return true;
}

export async function sendDriverCustomerMessage(orderId: number, driverUserId: number, body: string) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(driverUserId); const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!driver || !order || order.driverId !== driver.id) throw new Error("لا يمكنك مراسلة هذا العميل.");
  await db.insert(chatMessages).values({ orderId, senderUserId: driverUserId, recipientUserId: order.userId, channel: "driver", body });
  await db.insert(notifications).values({ userId: order.userId, orderId, title: "رسالة من المندوب", body });
  return getDriverChatForDriver(orderId, driverUserId);
}

export async function getAdminPaymentOrders() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return db.select().from(deliveryOrders).where(eq(deliveryOrders.paymentMethod, "vodafone_cash")).orderBy(desc(deliveryOrders.updatedAt));
}

export async function verifyVodafonePayment(orderId: number, adminUserId: number, status: "paid" | "failed") {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!order || order.paymentMethod !== "vodafone_cash") throw new Error("طلب الدفع غير موجود.");
  await db.update(deliveryOrders).set({ paymentStatus: status }).where(eq(deliveryOrders.id, orderId));
  await db.insert(notifications).values({ userId: order.userId, orderId, title: status === "paid" ? "تم تأكيد الدفع" : "تعذر تأكيد الدفع", body: status === "paid" ? "تمت مطابقة تحويل Vodafone Cash، وسيستمر تجهيز طلبك." : "يرجى مراجعة رقم العملية والتواصل مع الدعم." });
  await db.insert(orderEvents).values({ orderId, eventType: `payment_${status}`, status: order.status, note: status === "paid" ? "تم اعتماد دفع Vodafone Cash" : "تم رفض دفع Vodafone Cash", actorUserId: adminUserId });
  return (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
}

export async function attachVodafonePaymentReceipt(orderId: number, userId: number, receiptUrl: string) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!order) throw new Error("لا يمكنك إرفاق إيصال بهذا الطلب.");
  assertPaymentReceiptAccess(order, userId);
  await db.update(deliveryOrders).set({ paymentReceiptUrl: receiptUrl, paymentStatus: "verifying" }).where(eq(deliveryOrders.id, orderId));
  return (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
}
