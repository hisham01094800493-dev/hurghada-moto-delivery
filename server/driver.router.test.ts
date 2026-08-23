import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, acceptOrderForDriver: vi.fn(), getDriverByUserId: vi.fn(), updateDriverOrderStatus: vi.fn() };
});

import { acceptOrderForDriver, getDriverByUserId, updateDriverOrderStatus } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeDriverContext(): TrpcContext {
  return {
    user: { id: 42, openId: "driver-user", name: "Driver", email: null, phone: null, loginMethod: "manus", role: "driver", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("driver updateStatus router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires the driver approval action before assigning the order", async () => {
    vi.mocked(getDriverByUserId).mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getDriverByUserId>>);
    vi.mocked(acceptOrderForDriver).mockResolvedValue({ id: 777, status: "assigned", driverId: 9 } as never);
    const caller = appRouter.createCaller(makeDriverContext());
    await caller.driver.accept({ orderId: 777 });
    expect(acceptOrderForDriver).toHaveBeenCalledWith(777, 9, 42);
  });

  it("propagates a rejected operational transition through the actual tRPC procedure", async () => {
    vi.mocked(getDriverByUserId).mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getDriverByUserId>>);
    vi.mocked(updateDriverOrderStatus).mockRejectedValue(new Error("لا يمكن تنفيذ هذا الإجراء في الحالة الحالية للطلب."));
    const caller = appRouter.createCaller(makeDriverContext());
    await expect(caller.driver.updateStatus({ orderId: 777, status: "delivered" })).rejects.toThrow("لا يمكن تنفيذ هذا الإجراء");
    expect(updateDriverOrderStatus).toHaveBeenCalledWith(777, 9, 42, "delivered");
  });
});
