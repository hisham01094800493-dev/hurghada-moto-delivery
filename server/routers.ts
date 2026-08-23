import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createDeliveryOrder, getDeliveryOrdersForUser } from "./db";
import { deliveryOrderInput, estimateDeliveryFee, makeOrderReference } from "./delivery";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: router({
    create: protectedProcedure.input(deliveryOrderInput).mutation(async ({ ctx, input }) => {
      const estimatedFee = estimateDeliveryFee(input.serviceType, input.requestedFor);
      const order = await createDeliveryOrder({
        reference: makeOrderReference(),
        userId: ctx.user.id,
        serviceType: input.serviceType,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        pickupAddress: input.pickupAddress,
        destinationAddress: input.destinationAddress,
        requestedFor: new Date(input.requestedFor),
        recipientName: input.recipientName || null,
        recipientPhone: input.recipientPhone || null,
        packageDescription: input.packageDescription || null,
        contactless: input.contactless ? 1 : 0,
        healthNotes: input.healthNotes || null,
        estimatedFee,
      });
      return order;
    }),
    mine: protectedProcedure.query(({ ctx }) => getDeliveryOrdersForUser(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
