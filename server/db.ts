import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { chatMessages, coupons, deliveryComplaints, deliveryOrders, deliveryStops, driverDocuments, driverOrderInvitations, drivers, driverWithdrawalRequests, InsertDeliveryOrder, InsertUser, notifications, orderEvents, orderReviews, savedAddresses, servicePricingRules, serviceZones, shipmentAttachments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { assertPaymentReceiptAccess, canEnterDriverOperations, validateDriverStatusUpdate } from "./delivery";
import { isCancellationReason } from "../shared/cancellation";
import { buildDailyDeliveryReport } from "../shared/reporting";
import { calculatePlatformCommission, defaultServicePricingRules, DeliveryServiceType, normalizeServicePricingRules, ServicePricingRules } from "../shared/delivery";
import { calculateAvailableWithdrawalBalance } from "../shared/driver-finance";
import { calculateCouponDiscount, normalizeCouponCode } from "../shared/coupons";
import { randomBytes } from "node:crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function resolveCouponForOrder(code: string | undefined, fareBeforeDiscount: number) {
  if (!code?.trim()) return { coupon: null, couponDiscount: 0, finalFee: fareBeforeDiscount };
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const normalizedCode = normalizeCouponCode(code);
  const coupon = (await db.select().from(coupons).where(eq(coupons.code, normalizedCode)).limit(1))[0];
  if (!coupon) throw new Error("كود الخصم غير صحيح.");
  const calculation = calculateCouponDiscount(coupon, fareBeforeDiscount);
  return { coupon, couponDiscount: calculation.couponDiscount, finalFee: calculation.finalFee };
}

export async function getAdminCoupons() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(coupons).orderBy(desc(coupons.createdAt)); }

export async function createCoupon(input: { code: string; discountType: "fixed" | "percent"; discountValue: number; minimumOrderFee: number; maximumDiscount?: number | null; maxRedemptions?: number | null; startsAt?: Date | null; endsAt?: Date | null; createdByUserId: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const code = normalizeCouponCode(input.code); if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("استخدم رمزًا من حروف إنجليزية وأرقام وشرطة فقط.");
  if (input.discountType === "percent" && (input.discountValue < 1 || input.discountValue > 100)) throw new Error("نسبة الخصم يجب أن تكون بين 1 و100.");
  if (input.discountType === "fixed" && input.discountValue < 1) throw new Error("قيمة الخصم يجب أن تكون أكبر من صفر.");
  await db.insert(coupons).values({ ...input, code, discountValue: Math.round(input.discountValue), minimumOrderFee: Math.max(0, Math.round(input.minimumOrderFee)), maximumDiscount: input.maximumDiscount ? Math.max(1, Math.round(input.maximumDiscount)) : null, maxRedemptions: input.maxRedemptions ? Math.max(1, Math.round(input.maxRedemptions)) : null, startsAt: input.startsAt || null, endsAt: input.endsAt || null, status: "active" });
  return getAdminCoupons();
}

export async function updateCouponStatus(couponId: number, status: "active" | "paused" | "expired") { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); await db.update(coupons).set({ status }).where(eq(coupons.id, couponId)); return getAdminCoupons(); }

export async function getServicePricingRuleMap(): Promise<ServicePricingRules> {
  const db = await getDb();
  if (!db) return defaultServicePricingRules;
  const rows = await db.select().from(servicePricingRules);
  const overrides = rows.reduce((rules, rule) => {
    rules[rule.serviceType] = { baseFare: rule.baseFare, perKmFare: rule.perKmFare, minimumFare: rule.minimumFare };
    return rules;
  }, {} as Partial<ServicePricingRules>);
  return normalizeServicePricingRules(overrides);
}

export async function updateServicePricingRule(input: { serviceType: DeliveryServiceType; baseFare: number; perKmFare: number; minimumFare: number; updatedByUserId: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const normalized = normalizeServicePricingRules({ [input.serviceType]: input });
  const rule = normalized[input.serviceType];
  await db.insert(servicePricingRules).values({ serviceType: input.serviceType, ...rule, updatedByUserId: input.updatedByUserId }).onDuplicateKeyUpdate({ set: { ...rule, updatedByUserId: input.updatedByUserId } });
  return getServicePricingRuleMap();
}

export async function getActiveServiceZones() { const db = await getDb(); if (!db) return []; return db.select().from(serviceZones).where(eq(serviceZones.isActive, 1)).orderBy(desc(serviceZones.updatedAt)); }
export async function getAdminServiceZones() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(serviceZones).orderBy(desc(serviceZones.updatedAt)); }

export async function resolveServiceZone(latitude?: number | null, longitude?: number | null) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return null;
  const zones = await getActiveServiceZones();
  const matches = zones.map((zone) => ({ zone, distance: calculateDistanceMeters(latitude, longitude, zone.centerLatitude, zone.centerLongitude) })).filter(({ zone, distance }) => distance <= zone.radiusMeters).sort((a, b) => a.distance - b.distance);
  return matches[0]?.zone || null;
}

export async function createServiceZone(input: { name: string; centerLatitude: number; centerLongitude: number; radiusMeters: number; surcharge: number; updatedByUserId: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.insert(serviceZones).values({ ...input, name: input.name.trim(), radiusMeters: Math.max(100, Math.round(input.radiusMeters)), surcharge: Math.max(0, Math.round(input.surcharge)), isActive: 1 });
  return getAdminServiceZones();
}

export async function updateServiceZone(input: { zoneId: number; name: string; centerLatitude: number; centerLongitude: number; radiusMeters: number; surcharge: number; isActive: boolean; updatedByUserId: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.update(serviceZones).set({ name: input.name.trim(), centerLatitude: input.centerLatitude, centerLongitude: input.centerLongitude, radiusMeters: Math.max(100, Math.round(input.radiusMeters)), surcharge: Math.max(0, Math.round(input.surcharge)), isActive: input.isActive ? 1 : 0, updatedByUserId: input.updatedByUserId }).where(eq(serviceZones.id, input.zoneId));
  return getAdminServiceZones();
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

export async function createDeliveryOrder(order: InsertDeliveryOrder, couponId?: number, stops: Array<{ address: string; latitude?: number; longitude?: number; recipientName?: string; recipientPhone?: string; notes?: string }> = []) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا. حاول مرة أخرى بعد قليل.");
  await db.insert(deliveryOrders).values(order);
  const saved = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, order.reference)).limit(1))[0];
  if (!saved) throw new Error("تعذر حفظ الطلب.");
  if (couponId) await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, couponId));
  if (stops.length) await db.insert(deliveryStops).values(stops.map((stop, index) => ({ orderId: saved.id, sequence: index + 1, address: stop.address, latitude: stop.latitude ?? null, longitude: stop.longitude ?? null, recipientName: stop.recipientName || null, recipientPhone: stop.recipientPhone || null, notes: stop.notes || null })));
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
  const [events, stops] = await Promise.all([db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(desc(orderEvents.createdAt)), db.select().from(deliveryStops).where(eq(deliveryStops.orderId, order.id)).orderBy(deliveryStops.sequence)]);
  const driver = order.driverId ? await getDriverById(order.driverId) : undefined;
  return { order, events, stops, driver };
}

export async function setTrackingShareForCustomer(reference: string, userId: number, enabled: boolean) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(and(eq(deliveryOrders.reference, reference), eq(deliveryOrders.userId, userId))).limit(1))[0];
  if (!order) throw new Error("لا يمكنك مشاركة هذا الطلب.");
  const token = enabled ? randomBytes(24).toString("hex") : order.trackingShareToken;
  await db.update(deliveryOrders).set({ trackingShareEnabled: enabled ? 1 : 0, trackingShareToken: token }).where(eq(deliveryOrders.id, order.id));
  return { enabled, token: enabled ? token : null };
}

export async function getSharedTracking(token: string) {
  const db = await getDb(); if (!db) throw new Error("التتبع غير متاح حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(and(eq(deliveryOrders.trackingShareToken, token), eq(deliveryOrders.trackingShareEnabled, 1))).limit(1))[0];
  if (!order) throw new Error("رابط التتبع غير صالح أو تم إيقافه.");
  const driver = order.driverId ? await getDriverById(order.driverId) : undefined;
  return { reference: order.reference, serviceType: order.serviceType, status: order.status, estimatedMinutes: order.estimatedMinutes, pickupAddress: order.pickupAddress, destinationAddress: order.destinationAddress, requestedFor: order.requestedFor, driverLocation: driver?.lastLatitude !== null && driver?.lastLatitude !== undefined && driver?.lastLongitude !== null && driver?.lastLongitude !== undefined ? { latitude: driver.lastLatitude, longitude: driver.lastLongitude, updatedAt: driver.lastLocationAt } : null };
}

export async function getShipmentAttachmentsForCustomer(reference: string, userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(and(eq(deliveryOrders.reference, reference), eq(deliveryOrders.userId, userId))).limit(1))[0];
  if (!order) throw new Error("لا يمكنك الوصول إلى مرفقات هذا الطلب.");
  return db.select().from(shipmentAttachments).where(eq(shipmentAttachments.orderId, order.id)).orderBy(desc(shipmentAttachments.createdAt));
}

export async function saveShipmentAttachment(input: { orderId: number; uploaderUserId: number; attachmentType: "shipment_photo" | "proof_of_delivery" | "other"; fileUrl: string; fileName: string; mimeType: string; sizeBytes: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, input.orderId)).limit(1))[0];
  if (!order) throw new Error("الطلب غير موجود.");
  const driver = await getDriverByUserId(input.uploaderUserId);
  const isCustomer = order.userId === input.uploaderUserId;
  const isAssignedDriver = Boolean(driver && order.driverId === driver.id);
  if (!isCustomer && !isAssignedDriver) throw new Error("لا يمكنك رفع ملف لهذا الطلب.");
  if (input.attachmentType === "proof_of_delivery" && !isAssignedDriver) throw new Error("إثبات التسليم يرفعه المندوب المكلّف فقط.");
  if (input.attachmentType === "shipment_photo" && !isCustomer) throw new Error("صورة الشحنة يرفعها العميل صاحب الطلب فقط.");
  await db.insert(shipmentAttachments).values(input);
  if (isCustomer && order.driverId) { const assigned = await getDriverById(order.driverId); if (assigned) await db.insert(notifications).values({ userId: assigned.userId, orderId: order.id, title: "مرفق شحنة جديد", body: "أضاف العميل صورة أو ملفًا متعلقًا بالطلب." }); }
  if (isAssignedDriver) await db.insert(notifications).values({ userId: order.userId, orderId: order.id, title: "مرفق من المندوب", body: input.attachmentType === "proof_of_delivery" ? "أضاف المندوب إثبات التسليم." : "أضاف المندوب ملفًا متعلقًا بالطلب." });
  return db.select().from(shipmentAttachments).where(eq(shipmentAttachments.orderId, order.id)).orderBy(desc(shipmentAttachments.createdAt));
}

export async function getDriverByUserId(userId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1))[0]; }

export async function getOwnDriverVerification(userId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(userId); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب.");
  const documents = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driver.id)).orderBy(desc(driverDocuments.createdAt));
  return { driver, documents };
}

export async function saveDriverDocument(input: { userId: number; documentType: "national_id" | "driver_license" | "vehicle_registration" | "selfie"; fileUrl: string; fileName: string; mimeType: string; sizeBytes: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(input.userId); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب.");
  await db.insert(driverDocuments).values({ driverId: driver.id, documentType: input.documentType, fileUrl: input.fileUrl, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes });
  await db.update(drivers).set({ verificationStatus: "pending", verificationNote: null, verifiedByUserId: null, verifiedAt: null }).where(eq(drivers.id, driver.id));
  return getOwnDriverVerification(input.userId);
}

export async function getAdminDriverVerifications() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [driverRows, documents] = await Promise.all([db.select().from(drivers).orderBy(desc(drivers.updatedAt)), db.select().from(driverDocuments).orderBy(desc(driverDocuments.createdAt))]);
  return driverRows.map((driver) => ({ ...driver, documents: documents.filter((document) => document.driverId === driver.id) }));
}

export async function reviewDriverVerification(input: { driverId: number; status: "approved" | "rejected"; adminNote?: string; adminUserId: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverById(input.driverId); if (!driver) throw new Error("ملف المندوب غير موجود.");
  const documents = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driver.id));
  const required = ["national_id", "driver_license", "vehicle_registration", "selfie"];
  if (input.status === "approved" && !required.every((type) => documents.some((document) => document.documentType === type))) throw new Error("أكمل المستندات الأربعة المطلوبة قبل الاعتماد.");
  await db.update(drivers).set({ verificationStatus: input.status, verificationNote: input.adminNote?.trim() || null, verifiedByUserId: input.adminUserId, verifiedAt: new Date() }).where(eq(drivers.id, driver.id));
  await db.insert(notifications).values({ userId: driver.userId, title: "تحديث اعتماد الحساب", body: input.status === "approved" ? "تم اعتماد ملفك كسائق. يمكنك الآن تفعيل التوفر." : "تحتاج مستنداتك إلى مراجعة أو استكمال؛ راجع ملاحظة الإدارة." });
  return getAdminDriverVerifications();
}

export async function getNewOrdersForDriver(driverId: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); const invitations = await db.select().from(driverOrderInvitations).where(and(eq(driverOrderInvitations.driverId, driverId), eq(driverOrderInvitations.status, "pending"))); const orderIds = invitations.filter((invitation) => invitation.expiresAt > new Date()).map((invitation) => invitation.orderId); if (!orderIds.length) return []; const orders = await db.select().from(deliveryOrders).where(and(inArray(deliveryOrders.id, orderIds), eq(deliveryOrders.status, "new"))).orderBy(desc(deliveryOrders.createdAt)); return orders.filter(canEnterDriverOperations); }

export async function getOrdersForDriver(driverId: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(deliveryOrders).where(eq(deliveryOrders.driverId, driverId)).orderBy(desc(deliveryOrders.createdAt)); }

export async function getDeliveryStopsForDriver(orderId: number, driverUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const driver = await getDriverByUserId(driverUserId); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, orderId)).limit(1))[0];
  if (!order || order.driverId !== driver.id) throw new Error("لا يمكنك الوصول إلى نقاط توقف هذا الطلب.");
  return db.select().from(deliveryStops).where(eq(deliveryStops.orderId, orderId)).orderBy(deliveryStops.sequence);
}

export async function updateDeliveryStopStatus(stopId: number, driverId: number, actorUserId: number, status: "delivered" | "skipped") {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const stop = (await db.select().from(deliveryStops).where(eq(deliveryStops.id, stopId)).limit(1))[0];
  if (!stop) throw new Error("نقطة التوقف غير موجودة.");
  const order = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, stop.orderId)).limit(1))[0];
  if (!order || order.driverId !== driverId) throw new Error("لا يمكنك تحديث هذه النقطة.");
  if (!["picked_up", "in_delivery"].includes(order.status)) throw new Error("لا يمكن تحديث نقطة توقف قبل استلام الشحنة.");
  await db.update(deliveryStops).set({ status, completedAt: new Date() }).where(eq(deliveryStops.id, stopId));
  const note = status === "delivered" ? `تم تنفيذ التوقف رقم ${stop.sequence}.` : `تم تجاوز التوقف رقم ${stop.sequence}.`;
  await db.insert(orderEvents).values({ orderId: order.id, eventType: "stop_updated", status: order.status, note, actorUserId });
  await db.insert(notifications).values({ userId: order.userId, orderId: order.id, title: "تحديث مسار الشحنة", body: note });
  return db.select().from(deliveryStops).where(eq(deliveryStops.orderId, order.id)).orderBy(deliveryStops.sequence);
}

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

export async function cancelOrderForCustomer(reference: string, customerUserId: number, reason: string) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const target = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.reference, reference)).limit(1))[0];
  if (!target || target.userId !== customerUserId) throw new Error("لا يمكنك إلغاء هذا الطلب.");
  if (!["new", "assigned", "driver_arrived"].includes(target.status)) throw new Error("لا يمكن إلغاء الطلب بعد استلامه أو بدء التوصيل. تواصل مع الدعم للمساعدة.");
  const cancellationReason = reason.trim();
  if (!isCancellationReason(cancellationReason)) throw new Error("اختر سببًا صالحًا من قائمة الإلغاء.");
  const updated = await db.update(deliveryOrders).set({ status: "cancelled", cancelledAt: new Date(), cancellationReason }).where(and(eq(deliveryOrders.id, target.id), inArray(deliveryOrders.status, ["new", "assigned", "driver_arrived"]))) as any;
  if (!updated[0]?.affectedRows) throw new Error("تعذر إلغاء الطلب؛ ربما تغيرت حالته.");
  await db.update(driverOrderInvitations).set({ status: "cancelled", respondedAt: new Date() }).where(and(eq(driverOrderInvitations.orderId, target.id), eq(driverOrderInvitations.status, "pending")));
  const liveLocationMessages = await db.select().from(chatMessages).where(and(eq(chatMessages.orderId, target.id), eq(chatMessages.messageType, "location"), eq(chatMessages.locationIsLive, 1)));
  if (liveLocationMessages.length) await db.update(chatMessages).set({ locationIsLive: 0 }).where(and(eq(chatMessages.orderId, target.id), eq(chatMessages.messageType, "location"), eq(chatMessages.locationIsLive, 1)));
  if (target.driverId) { const driver = await getDriverById(target.driverId); if (driver) { await db.update(drivers).set({ availability: "online" }).where(eq(drivers.id, driver.id)); await db.insert(notifications).values({ userId: driver.userId, orderId: target.id, title: "تم إلغاء الطلب", body: `ألغى العميل الطلب ${target.reference}.` }); if (liveLocationMessages.length) await db.insert(chatMessages).values({ orderId: target.id, senderUserId: customerUserId, recipientUserId: driver.userId, channel: "driver", messageType: "system", body: "تم إيقاف مشاركة الموقع المباشر بسبب إلغاء الطلب.", locationLabel: "إيقاف تلقائي", createdAt: new Date() }); } }
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
  const driver = status === "delivered" ? await getDriverById(driverId) : undefined;
  const allocation = status === "delivered" && driver ? calculatePlatformCommission(target.fareBeforeDiscount || target.estimatedFee, driver.commissionPercent) : undefined;
  await db.update(deliveryOrders).set({ status, ...dateField, ...(allocation ? { platformCommissionAmount: allocation.platformCommissionAmount, driverEarnings: allocation.driverEarnings } : {}) }).where(eq(deliveryOrders.id, orderId));
  if (status === "delivered") {
    if (driver && allocation) await db.update(drivers).set({ availability: "online", totalTrips: driver.totalTrips + 1, totalEarnings: driver.totalEarnings + allocation.driverEarnings }).where(eq(drivers.id, driverId));
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
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  return { totalOrders: orders.length, activeOrders: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length, deliveredOrders: deliveredOrders.length, cancelledOrders: orders.filter((order) => order.status === "cancelled").length, onlineDrivers: driverRows.filter((driver) => driver.availability === "online" || driver.availability === "busy").length, offlineDrivers: driverRows.filter((driver) => driver.availability === "offline").length, estimatedRevenue: deliveredOrders.reduce((sum, order) => sum + order.estimatedFee, 0), platformRevenue: deliveredOrders.reduce((sum, order) => sum + order.platformCommissionAmount - order.couponDiscount, 0), driverNetEarnings: deliveredOrders.reduce((sum, order) => sum + order.driverEarnings, 0) };
}

export async function getAdminDrivers() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(drivers).orderBy(desc(drivers.updatedAt)); }
export async function getAdminUsers() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)); }
export async function createDriverForUser(input: { userId: number; displayName: string; phone: string; vehicleType: string; vehiclePlate?: string; commissionPercent?: number }) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); await db.update(users).set({ role: "driver" }).where(eq(users.id, input.userId)); await db.insert(drivers).values({ ...input, commissionPercent: Math.min(80, Math.max(0, input.commissionPercent ?? 10)), vehiclePlate: input.vehiclePlate || null, availability: "offline" }); return getDriverByUserId(input.userId); }
export async function setDriverAdminStatus(driverId: number, availability: "offline" | "online" | "suspended") { return updateDriverAvailability(driverId, availability); }
export async function setDriverCommissionPercent(driverId: number, commissionPercent: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); const normalized = Math.min(80, Math.max(0, Math.round(commissionPercent))); await db.update(drivers).set({ commissionPercent: normalized }).where(eq(drivers.id, driverId)); return getDriverById(driverId); }
export async function getAdminOrders() { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا."); return db.select().from(deliveryOrders).orderBy(desc(deliveryOrders.createdAt)); }

async function getDriverFinancialSummaryById(driverId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [driver, orders, withdrawals] = await Promise.all([
    getDriverById(driverId),
    db.select().from(deliveryOrders).where(and(eq(deliveryOrders.driverId, driverId), eq(deliveryOrders.status, "delivered"))).orderBy(desc(deliveryOrders.deliveredAt)),
    db.select().from(driverWithdrawalRequests).where(eq(driverWithdrawalRequests.driverId, driverId)).orderBy(desc(driverWithdrawalRequests.createdAt)),
  ]);
  if (!driver) throw new Error("ملف المندوب غير موجود.");
  const grossFee = orders.reduce((sum, order) => sum + order.estimatedFee, 0);
  const platformCommission = orders.reduce((sum, order) => sum + order.platformCommissionAmount, 0);
  const netEarnings = orders.reduce((sum, order) => sum + order.driverEarnings, 0);
  const { committedWithdrawals, availableToWithdraw } = calculateAvailableWithdrawalBalance(netEarnings, withdrawals);
  return { driver, grossFee, platformCommission, netEarnings, committedWithdrawals, availableToWithdraw, orders, withdrawals };
}

export async function getDriverFinancialSummary(userId: number) { const driver = await getDriverByUserId(userId); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب."); return getDriverFinancialSummaryById(driver.id); }

export async function requestDriverWithdrawal(input: { userId: number; amount: number; note?: string }) {
  const summary = await getDriverFinancialSummary(input.userId);
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > summary.availableToWithdraw) throw new Error("قيمة طلب السحب يجب أن تكون ضمن الرصيد المتاح.");
  if (summary.withdrawals.some((withdrawal) => withdrawal.status === "pending")) throw new Error("لديك طلب سحب قيد المراجعة بالفعل.");
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.insert(driverWithdrawalRequests).values({ driverId: summary.driver.id, amount: input.amount, note: input.note?.trim() || null, status: "pending" });
  return getDriverFinancialSummary(input.userId);
}

export async function getAdminWithdrawalRequests() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [withdrawals, driverRows] = await Promise.all([db.select().from(driverWithdrawalRequests).orderBy(desc(driverWithdrawalRequests.createdAt)), db.select().from(drivers)]);
  return withdrawals.map((withdrawal) => ({ ...withdrawal, driver: driverRows.find((driver) => driver.id === withdrawal.driverId) || null }));
}

export async function reviewDriverWithdrawal(input: { withdrawalId: number; status: "approved" | "rejected" | "paid"; adminUserId: number; adminNote?: string }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const withdrawal = (await db.select().from(driverWithdrawalRequests).where(eq(driverWithdrawalRequests.id, input.withdrawalId)).limit(1))[0];
  if (!withdrawal) throw new Error("طلب السحب غير موجود.");
  if (withdrawal.status === "paid" || withdrawal.status === "rejected") throw new Error("لا يمكن مراجعة طلب مغلق.");
  if (input.status === "paid" && withdrawal.status !== "approved") throw new Error("اعتمد الطلب أولًا قبل تسجيله كمدفوع.");
  await db.update(driverWithdrawalRequests).set({ status: input.status, adminNote: input.adminNote?.trim() || null, reviewedByUserId: input.adminUserId, reviewedAt: new Date(), ...(input.status === "paid" ? { paidAt: new Date() } : {}) }).where(eq(driverWithdrawalRequests.id, input.withdrawalId));
  return getAdminWithdrawalRequests();
}

async function getCustomerFeedbackOrder(reference: string, customerUserId: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const order = (await db.select().from(deliveryOrders).where(and(eq(deliveryOrders.reference, reference), eq(deliveryOrders.userId, customerUserId))).limit(1))[0];
  if (!order) throw new Error("لا يمكنك الوصول إلى ملاحظات هذا الطلب.");
  return { db, order };
}

export async function getOrderFeedbackForCustomer(reference: string, customerUserId: number) {
  const { db, order } = await getCustomerFeedbackOrder(reference, customerUserId);
  const [review, complaints] = await Promise.all([
    db.select().from(orderReviews).where(eq(orderReviews.orderId, order.id)).limit(1),
    db.select().from(deliveryComplaints).where(and(eq(deliveryComplaints.orderId, order.id), eq(deliveryComplaints.customerUserId, customerUserId))).orderBy(desc(deliveryComplaints.createdAt)),
  ]);
  return { review: review[0] || null, complaints };
}

export async function submitOrderReview(input: { reference: string; customerUserId: number; rating: number; comment?: string }) {
  const { db, order } = await getCustomerFeedbackOrder(input.reference, input.customerUserId);
  if (order.status !== "delivered" || !order.driverId) throw new Error("يمكنك تقييم الطلب بعد تسليمه فقط.");
  const existing = (await db.select().from(orderReviews).where(eq(orderReviews.orderId, order.id)).limit(1))[0];
  if (existing) throw new Error("تم إرسال تقييم لهذا الطلب بالفعل.");
  await db.insert(orderReviews).values({ orderId: order.id, customerUserId: input.customerUserId, driverId: order.driverId, rating: input.rating, comment: input.comment?.trim() || null });
  await db.insert(notifications).values({ userId: (await getDriverById(order.driverId))?.userId || input.customerUserId, orderId: order.id, title: "تقييم جديد", body: "تم إرسال تقييم لرحلة مكتملة." });
  return getOrderFeedbackForCustomer(input.reference, input.customerUserId);
}

export async function submitDeliveryComplaint(input: { reference: string; customerUserId: number; category: "driver_behavior" | "delay" | "item_issue" | "payment" | "safety" | "other"; description: string }) {
  const { db, order } = await getCustomerFeedbackOrder(input.reference, input.customerUserId);
  if (!["delivered", "cancelled"].includes(order.status)) throw new Error("يمكن إرسال شكوى تشغيلية بعد إغلاق الطلب فقط.");
  await db.insert(deliveryComplaints).values({ orderId: order.id, customerUserId: input.customerUserId, category: input.category, description: input.description.trim(), status: "open" });
  return getOrderFeedbackForCustomer(input.reference, input.customerUserId);
}

export async function getAdminFeedback() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [reviews, complaints, orders, driverRows] = await Promise.all([db.select().from(orderReviews).orderBy(desc(orderReviews.createdAt)), db.select().from(deliveryComplaints).orderBy(desc(deliveryComplaints.createdAt)), db.select().from(deliveryOrders), db.select().from(drivers)]);
  return { reviews: reviews.map((review) => ({ ...review, order: orders.find((order) => order.id === review.orderId) || null, driver: driverRows.find((driver) => driver.id === review.driverId) || null })), complaints: complaints.map((complaint) => ({ ...complaint, order: orders.find((order) => order.id === complaint.orderId) || null })) };
}

export async function reviewDeliveryComplaint(input: { complaintId: number; status: "in_review" | "resolved" | "closed"; adminUserId: number; adminNote?: string }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const complaint = (await db.select().from(deliveryComplaints).where(eq(deliveryComplaints.id, input.complaintId)).limit(1))[0];
  if (!complaint) throw new Error("الشكوى غير موجودة.");
  await db.update(deliveryComplaints).set({ status: input.status, adminNote: input.adminNote?.trim() || null, reviewedByUserId: input.adminUserId, reviewedAt: new Date() }).where(eq(deliveryComplaints.id, input.complaintId));
  await db.insert(notifications).values({ userId: complaint.customerUserId, orderId: complaint.orderId, title: "تحديث الشكوى", body: input.status === "resolved" ? "تمت معالجة شكواك." : input.status === "closed" ? "أُغلقت الشكوى بعد المراجعة." : "شكواك قيد المراجعة." });
  return getAdminFeedback();
}

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
  const wasLive = message.locationIsLive === 1; const locationPatch = { locationIsLive: isLive ? 1 : 0, locationLatitude: typeof latitude === "number" ? latitude : message.locationLatitude, locationLongitude: typeof longitude === "number" ? longitude : message.locationLongitude }; await db.update(chatMessages).set(locationPatch).where(eq(chatMessages.id, messageId)); if (!isLive && wasLive) { const senderDriver = await getDriverByUserId(senderUserId); const actorLabel = senderDriver ? "المندوب" : "العميل"; const stopMessage = `أوقف ${actorLabel} مشاركة الموقع المباشر.`; await db.insert(chatMessages).values({ orderId: message.orderId, senderUserId, recipientUserId: message.recipientUserId, channel: "driver", messageType: "system", body: stopMessage, locationLabel: "إيقاف مشاركة الموقع", createdAt: new Date() }); await db.insert(notifications).values({ userId: message.recipientUserId, orderId: message.orderId, title: "توقفت مشاركة الموقع المباشر", body: stopMessage }); } return true;
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

export async function markNotificationsRead(userId: number, notificationIds?: number[]) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  if (notificationIds?.length) await Promise.all(notificationIds.map((id) => db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)))));
  else await db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  return true;
}

export async function sendUnassignedOrderReminders() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const threshold = Date.now() - 5 * 60_000;
  const orders = (await db.select().from(deliveryOrders).where(eq(deliveryOrders.status, "new"))).filter((order) => !order.unassignedReminderSentAt && order.createdAt.getTime() <= threshold);
  if (!orders.length) return { reminded: 0 };
  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  for (const order of orders) {
    await db.update(deliveryOrders).set({ unassignedReminderSentAt: new Date() }).where(eq(deliveryOrders.id, order.id));
    const customerNotice = { userId: order.userId, orderId: order.id, title: "تحديث طلبك", body: "ما زلنا نبحث عن مندوب قريب لطلبك، وسنبلغك فور قبول أحد المندوبين." };
    const adminNotices = admins.map((admin) => ({ userId: admin.id, orderId: order.id, title: "طلب يحتاج متابعة", body: `الطلب ${order.reference} لم يُعيّن له مندوب بعد خمس دقائق.` }));
    await db.insert(notifications).values([customerNotice, ...adminNotices]);
  }
  return { reminded: orders.length };
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

export async function getAdminOperationalAuditLog() {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [cancellations, rejectedInvitations, driverRows] = await Promise.all([
    db.select({ id: deliveryOrders.id, reference: deliveryOrders.reference, customerName: deliveryOrders.customerName, cancelledAt: deliveryOrders.cancelledAt, reason: deliveryOrders.cancellationReason }).from(deliveryOrders).where(eq(deliveryOrders.status, "cancelled")).orderBy(desc(deliveryOrders.cancelledAt)).limit(30),
    db.select({ id: driverOrderInvitations.id, orderId: driverOrderInvitations.orderId, driverId: driverOrderInvitations.driverId, reference: deliveryOrders.reference, customerName: deliveryOrders.customerName, distanceMeters: driverOrderInvitations.distanceMeters, respondedAt: driverOrderInvitations.respondedAt }).from(driverOrderInvitations).innerJoin(deliveryOrders, eq(driverOrderInvitations.orderId, deliveryOrders.id)).where(eq(driverOrderInvitations.status, "rejected")).orderBy(desc(driverOrderInvitations.respondedAt)).limit(30),
    db.select({ id: drivers.id, displayName: drivers.displayName }).from(drivers),
  ]);
  const driverNames = new Map(driverRows.map((driver) => [driver.id, driver.displayName]));
  return { cancellations, rejectedInvitations: rejectedInvitations.map((invitation) => ({ ...invitation, driverName: driverNames.get(invitation.driverId) || `مندوب #${invitation.driverId}` })) };
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
