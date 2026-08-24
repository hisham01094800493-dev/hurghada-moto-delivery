import { calculateDistanceMeters, calculateOperationalQuote, deliveryServiceTypes, ServicePricingRules } from "@shared/delivery";
import { z } from "zod";

export const deliveryOrderInput = z
  .object({
    serviceType: z.enum(deliveryServiceTypes),
    customerName: z.string().trim().min(2, "أدخل الاسم الكامل."),
    customerPhone: z.string().trim().min(8, "أدخل رقم هاتف صالحًا."),
    pickupAddress: z.string().trim().min(5, "أدخل عنوان الانطلاق أو الاستلام."),
    pickupLatitude: z.number().min(-90).max(90).optional(),
    pickupLongitude: z.number().min(-180).max(180).optional(),
    destinationAddress: z.string().trim().min(5, "أدخل عنوان الوجهة أو التسليم."),
    destinationLatitude: z.number().min(-90).max(90).optional(),
    destinationLongitude: z.number().min(-180).max(180).optional(),
    requestedFor: z.string().min(1, "اختر وقت الطلب."),
    recipientName: z.string().trim().max(120).optional(),
    recipientPhone: z.string().trim().max(32).optional(),
    arrivalNotes: z.string().trim().max(500).optional(),
    packageDescription: z.string().trim().max(800).optional(),
    packageSize: z.enum(["small", "medium", "large"]).default("small"),
    itemCount: z.number().int().min(1).max(50).default(1),
    shipmentCategory: z.enum(["general", "food", "documents", "fragile", "medicine"]).default("general"),
    declaredValue: z.number().int().min(0).max(100000).default(0),
    requiresSignature: z.boolean().default(false),
    additionalStops: z.array(z.object({ address: z.string().trim().min(5), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), recipientName: z.string().trim().max(120).optional(), recipientPhone: z.string().trim().max(32).optional(), notes: z.string().trim().max(500).optional() })).max(2).default([]),
    contactless: z.boolean().default(false),
    healthNotes: z.string().trim().max(500).optional(),
    paymentMethod: z.enum(["cash", "vodafone_cash"]).default("cash"),
    paymentReference: z.string().trim().regex(/^[A-Za-z0-9_-]{6,64}$/, "رقم العملية غير صالح.").optional(),
    couponCode: z.string().trim().regex(/^[A-Za-z0-9_-]{3,40}$/, "كود الخصم غير صالح.").optional(),
  })
  .superRefine((value, ctx) => {
    if (Number.isNaN(new Date(value.requestedFor).getTime())) ctx.addIssue({ code: "custom", path: ["requestedFor"], message: "وقت الطلب غير صالح." });
    if (value.paymentMethod === "vodafone_cash" && !value.paymentReference) ctx.addIssue({ code: "custom", path: ["paymentReference"], message: "أدخل رقم عملية Vodafone Cash بعد التحويل." });
    if (value.serviceType !== "person") {
      if (!value.recipientName || value.recipientName.length < 2) ctx.addIssue({ code: "custom", path: ["recipientName"], message: "أدخل اسم المستلم." });
      if (!value.recipientPhone || value.recipientPhone.length < 8) ctx.addIssue({ code: "custom", path: ["recipientPhone"], message: "أدخل هاتف المستلم." });
      if (!value.packageDescription || value.packageDescription.length < 3) ctx.addIssue({ code: "custom", path: ["packageDescription"], message: "صف الطلب أو الشحنة." });
    }
  });

export type DeliveryOrderInput = z.infer<typeof deliveryOrderInput>;

export function buildOperationalQuote(input: DeliveryOrderInput, pricingRules?: Partial<ServicePricingRules>) {
  const points = [{ latitude: input.pickupLatitude, longitude: input.pickupLongitude }, ...(input.additionalStops ?? []).map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })), { latitude: input.destinationLatitude, longitude: input.destinationLongitude }];
  const distanceMeters = points.slice(1).reduce((total, point, index) => total + calculateDistanceMeters(points[index]!, point), 0);
  return calculateOperationalQuote({ serviceType: input.serviceType, distanceMeters, requestedFor: input.requestedFor, pricingRules });
}

export function makeOrderReference(now = Date.now()) {
  return `HGD-${String(now).slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const allowedStatusTransitions = {
  new: ["assigned", "cancelled"],
  assigned: ["driver_arrived", "cancelled"],
  driver_arrived: ["picked_up", "cancelled"],
  picked_up: ["in_delivery", "cancelled"],
  in_delivery: ["delivered", "cancelled"],
  in_progress: ["in_delivery", "cancelled"],
  delivered: [],
  cancelled: [],
} as const;

export function assertOperationalStatusTransition(currentStatus: keyof typeof allowedStatusTransitions, nextStatus: string) {
  if (!allowedStatusTransitions[currentStatus].includes(nextStatus as never)) {
    throw new Error("لا يمكن تنفيذ هذا الإجراء في الحالة الحالية للطلب.");
  }
}

export function validateDriverStatusUpdate(input: { assignedDriverId: number | null; actingDriverId: number; currentStatus: keyof typeof allowedStatusTransitions; nextStatus: string }) {
  if (input.assignedDriverId !== input.actingDriverId) throw new Error("لا يمكنك تحديث هذا الطلب.");
  assertOperationalStatusTransition(input.currentStatus, input.nextStatus);
}

export function canEnterDriverOperations(order: { paymentMethod: "cash" | "vodafone_cash"; paymentStatus: "pending" | "verifying" | "paid" | "failed" }) {
  return order.paymentMethod === "cash" || order.paymentStatus === "paid";
}

export function assertPaymentReceiptAccess(order: { userId: number; paymentMethod: "cash" | "vodafone_cash" }, requestUserId: number) {
  if (order.userId !== requestUserId || order.paymentMethod !== "vodafone_cash") throw new Error("لا يمكنك إرفاق إيصال بهذا الطلب.");
}
