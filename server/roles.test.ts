import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const ordinaryUser = {
  id: 21,
  openId: "ordinary-user",
  email: "ordinary@example.com",
  name: "Ordinary User",
  phone: null,
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("operational roles", () => {
  it("rejects admin reporting for a non-admin account", async () => {
    const caller = appRouter.createCaller(makeContext(ordinaryUser));
    await expect(caller.admin.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects customer orders without an authenticated session", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.orders.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects driver actions for an account without a driver profile", async () => {
    const nonDriver = { ...ordinaryUser, id: 987654, openId: "no-driver-profile" };
    const caller = appRouter.createCaller(makeContext(nonDriver));
    await expect(caller.driver.setAvailability({ availability: "online" })).rejects.toThrow("لا يوجد ملف مندوب");
    await expect(caller.driver.accept({ orderId: 1 })).rejects.toThrow("لا يوجد ملف مندوب");
    await expect(caller.driver.updateLocation({ latitude: 27.2, longitude: 33.8 })).rejects.toThrow("لا يوجد ملف مندوب");
    await expect(caller.driver.updateStatus({ orderId: 1, status: "driver_arrived" })).rejects.toThrow("لا يوجد ملف مندوب");
    await expect(caller.driver.chat({ orderId: 1 })).rejects.toThrow("لا يمكنك عرض رسائل هذا الطلب");
    await expect(caller.driver.sendChat({ orderId: 1, body: "رسالة اختبار" })).rejects.toThrow("لا يمكنك مراسلة هذا العميل");
  }, 15000);

  it("rejects manual payment verification for a non-admin account", async () => {
    const caller = appRouter.createCaller(makeContext(ordinaryUser));
    await expect(caller.admin.verifyPayment({ orderId: 1, status: "paid" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
