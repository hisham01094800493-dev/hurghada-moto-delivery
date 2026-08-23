import { z } from "zod";

export const deliveryOrderInput = z
  .object({
    serviceType: z.enum(["person", "parcel"]),
    customerName: z.string().trim().min(2, "أدخل الاسم الكامل."),
    customerPhone: z.string().trim().min(8, "أدخل رقم هاتف صالحًا."),
    pickupAddress: z.string().trim().min(5, "أدخل عنوان الانطلاق أو الاستلام."),
    destinationAddress: z.string().trim().min(5, "أدخل عنوان الوجهة أو التسليم."),
    requestedFor: z.string().min(1, "اختر وقت الطلب."),
    recipientName: z.string().trim().max(120).optional(),
    recipientPhone: z.string().trim().max(32).optional(),
    packageDescription: z.string().trim().max(800).optional(),
    contactless: z.boolean().default(false),
    healthNotes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (Number.isNaN(new Date(value.requestedFor).getTime())) {
      ctx.addIssue({ code: "custom", path: ["requestedFor"], message: "وقت الطلب غير صالح." });
    }
    if (value.serviceType === "parcel") {
      if (!value.recipientName || value.recipientName.length < 2) {
        ctx.addIssue({ code: "custom", path: ["recipientName"], message: "أدخل اسم المستلم." });
      }
      if (!value.recipientPhone || value.recipientPhone.length < 8) {
        ctx.addIssue({ code: "custom", path: ["recipientPhone"], message: "أدخل هاتف المستلم." });
      }
      if (!value.packageDescription || value.packageDescription.length < 3) {
        ctx.addIssue({ code: "custom", path: ["packageDescription"], message: "صف الشحنة أو المنتج." });
      }
    }
  });

export type DeliveryOrderInput = z.infer<typeof deliveryOrderInput>;

export function estimateDeliveryFee(serviceType: DeliveryOrderInput["serviceType"], requestedFor: string) {
  const orderTime = new Date(requestedFor);
  const hour = orderTime.getHours();
  const baseFee = serviceType === "person" ? 65 : 45;
  const lateHoursSurcharge = hour >= 22 || hour < 7 ? 15 : 0;
  return baseFee + lateHoursSurcharge;
}

export function makeOrderReference(now = Date.now()) {
  return `HGM-${String(now).slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
