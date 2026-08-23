import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { acceptOrderForDriver, attachVodafonePaymentReceipt, createDeliveryOrder, createDriverForUser, getAdminDailyReport, getAdminDrivers, getAdminOrders, getAdminPaymentOrders, getAdminSummary, getAdminSupportInbox, getAdminUsers, getDeliveryOrderWithEventsForUser, getDeliveryOrdersForUser, getDriverByUserId, getDriverChatForCustomer, getDriverChatForDriver, getNewOrdersForDriver, getNotificationsForUser, getOrdersForDriver, getProfileWithAddresses, getSupportConversation, saveAddressForUser, sendAdminSupportReply, sendCustomerDriverMessage, sendDriverCustomerMessage, sendSupportMessage, setDriverAdminStatus, updateContactForUser, updateDriverAvailability, updateDriverLocation, updateDriverOrderStatus, verifyVodafonePayment } from "./db";
import { buildOperationalQuote, deliveryOrderInput, makeOrderReference } from "./delivery";
import { getVodafoneCashInstructions } from "./payment";
import { storagePut } from "./storage";

const availabilityInput = z.enum(["offline", "online", "busy", "suspended"]);
const driverStatusInput = z.enum(["driver_arrived", "picked_up", "in_delivery", "delivered"]);

export const appRouter = router({
  system: systemRouter,
  payment: router({ config: publicProcedure.query(() => getVodafoneCashInstructions()) }),
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  orders: router({
    create: protectedProcedure.input(deliveryOrderInput).mutation(async ({ ctx, input }) => { const quote = buildOperationalQuote(input); return createDeliveryOrder({ reference: makeOrderReference(), userId: ctx.user.id, serviceType: input.serviceType, customerName: input.customerName, customerPhone: input.customerPhone, pickupAddress: input.pickupAddress, pickupLatitude: input.pickupLatitude ?? null, pickupLongitude: input.pickupLongitude ?? null, destinationAddress: input.destinationAddress, destinationLatitude: input.destinationLatitude ?? null, destinationLongitude: input.destinationLongitude ?? null, requestedFor: new Date(input.requestedFor), recipientName: input.recipientName || null, recipientPhone: input.recipientPhone || null, arrivalNotes: input.arrivalNotes || null, packageDescription: input.packageDescription || null, packageSize: input.packageSize, itemCount: input.itemCount, contactless: input.contactless ? 1 : 0, healthNotes: input.healthNotes || null,         distanceMeters: quote.distanceMeters, estimatedMinutes: quote.estimatedMinutes, estimatedFee: quote.estimatedFee, paymentMethod: input.paymentMethod, paymentReference: input.paymentReference || null, paymentStatus: input.paymentMethod === "vodafone_cash" ? "verifying" : "pending" }); }),

    mine: protectedProcedure.query(({ ctx }) => getDeliveryOrdersForUser(ctx.user.id)),
    track: protectedProcedure.input(z.object({ reference: z.string().min(5) })).query(({ ctx, input }) => getDeliveryOrderWithEventsForUser(input.reference, ctx.user.id)),
    driverChat: protectedProcedure.input(z.object({ reference: z.string().min(5) })).query(({ ctx, input }) => getDriverChatForCustomer(input.reference, ctx.user.id)),
    sendDriverMessage: protectedProcedure.input(z.object({ reference: z.string().min(5), body: z.string().trim().min(1).max(1200) })).mutation(({ ctx, input }) => sendCustomerDriverMessage(input.reference, ctx.user.id, input.body)),
    uploadPaymentReceipt: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), fileName: z.string().trim().regex(/^[A-Za-z0-9._-]{1,120}$/), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]), dataBase64: z.string().min(20).max(6000000) })).mutation(async ({ ctx, input }) => { const bytes = Buffer.from(input.dataBase64, "base64"); if (bytes.byteLength > 4_000_000) throw new Error("حجم الإيصال يجب ألا يتجاوز 4 ميجابايت."); const uploaded = await storagePut(`payment-receipts/${ctx.user.id}/${input.orderId}-${input.fileName}`, bytes, input.mimeType); return attachVodafonePaymentReceipt(input.orderId, ctx.user.id, uploaded.url); }),
  }),
  driver: router({
    me: protectedProcedure.query(({ ctx }) => getDriverByUserId(ctx.user.id)),
    setAvailability: protectedProcedure.input(z.object({ availability: availabilityInput })).mutation(async ({ ctx, input }) => { const driver = await getDriverByUserId(ctx.user.id); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب."); return updateDriverAvailability(driver.id, input.availability); }),
    updateLocation: protectedProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).mutation(async ({ ctx, input }) => { const driver = await getDriverByUserId(ctx.user.id); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب."); return updateDriverLocation(driver.id, input.latitude, input.longitude); }),
    openOrders: protectedProcedure.query(({ ctx }) => getDriverByUserId(ctx.user.id).then((driver) => driver ? getNewOrdersForDriver() : [])),
    myOrders: protectedProcedure.query(async ({ ctx }) => { const driver = await getDriverByUserId(ctx.user.id); return driver ? getOrdersForDriver(driver.id) : []; }),
    accept: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const driver = await getDriverByUserId(ctx.user.id); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب."); return acceptOrderForDriver(input.orderId, driver.id, ctx.user.id); }),
    updateStatus: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: driverStatusInput })).mutation(async ({ ctx, input }) => { const driver = await getDriverByUserId(ctx.user.id); if (!driver) throw new Error("لا يوجد ملف مندوب مرتبط بهذا الحساب."); return updateDriverOrderStatus(input.orderId, driver.id, ctx.user.id, input.status); }),
    chat: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(({ ctx, input }) => getDriverChatForDriver(input.orderId, ctx.user.id)),
    sendChat: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), body: z.string().trim().min(1).max(1200) })).mutation(({ ctx, input }) => sendDriverCustomerMessage(input.orderId, ctx.user.id, input.body)),
  }),
  admin: router({
    summary: adminProcedure.query(() => getAdminSummary()), dailyReport: adminProcedure.query(() => getAdminDailyReport()), users: adminProcedure.query(() => getAdminUsers()), drivers: adminProcedure.query(() => getAdminDrivers()), orders: adminProcedure.query(() => getAdminOrders()), payments: adminProcedure.query(() => getAdminPaymentOrders()), supportInbox: adminProcedure.query(({ ctx }) => getAdminSupportInbox(ctx.user.id)),
    createDriver: adminProcedure.input(z.object({ userId: z.number().int().positive(), displayName: z.string().min(2).max(120), phone: z.string().min(8).max(32), vehicleType: z.string().min(2).max(64), vehiclePlate: z.string().max(32).optional() })).mutation(({ input }) => createDriverForUser(input)),
    updateDriverStatus: adminProcedure.input(z.object({ driverId: z.number().int().positive(), availability: z.enum(["offline", "online", "suspended"]) })).mutation(({ input }) => setDriverAdminStatus(input.driverId, input.availability)),
    replySupport: adminProcedure.input(z.object({ recipientUserId: z.number().int().positive(), body: z.string().trim().min(1).max(1200) })).mutation(({ ctx, input }) => sendAdminSupportReply({ adminUserId: ctx.user.id, ...input })),
    verifyPayment: adminProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(["paid", "failed"]) })).mutation(({ ctx, input }) => verifyVodafonePayment(input.orderId, ctx.user.id, input.status)),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => getProfileWithAddresses(ctx.user.id)),
    saveAddress: protectedProcedure.input(z.object({ label: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(500), isFavorite: z.boolean().default(false) })).mutation(({ ctx, input }) => saveAddressForUser({ userId: ctx.user.id, ...input })),
    updateContact: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(32) })).mutation(({ ctx, input }) => updateContactForUser(ctx.user.id, input.name, input.phone)),
  }),
  support: router({
    conversation: protectedProcedure.query(({ ctx }) => getSupportConversation(ctx.user.id)),
    send: protectedProcedure.input(z.object({ body: z.string().trim().min(1).max(1200), locationLabel: z.string().trim().max(240).optional(), locationLatitude: z.number().min(-90).max(90).optional(), locationLongitude: z.number().min(-180).max(180).optional() })).mutation(({ ctx, input }) => sendSupportMessage({ senderUserId: ctx.user.id, ...input })),
    notifications: protectedProcedure.query(({ ctx }) => getNotificationsForUser(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
