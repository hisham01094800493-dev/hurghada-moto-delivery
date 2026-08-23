import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => fakeDb) }));

import { cancelOrderForCustomer } from "./db";

const baseOrder = { id: 41, reference: "HGD-CANCEL-41", userId: 7, driverId: null, status: "assigned", estimatedFee: 50 };

describe("customer cancellation", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://test";
    vi.clearAllMocks();
    fakeDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
    fakeDb.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) });
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [baseOrder] }) }) });
  });

  it("cancels only the customer's pending or assigned order and records the reason", async () => {
    await cancelOrderForCustomer(baseOrder.reference, 7, "تغيير الخطة");
    expect(fakeDb.update).toHaveBeenCalled();
    expect(fakeDb.insert).toHaveBeenCalledTimes(2);
    const firstInsert = fakeDb.insert.mock.results[0]?.value.values;
    expect(firstInsert).toHaveBeenCalledWith(expect.objectContaining({ eventType: "cancelled", note: "تغيير الخطة" }));
  });

  it("rejects cancellation for another customer", async () => {
    await expect(cancelOrderForCustomer(baseOrder.reference, 99)).rejects.toThrow("لا يمكنك إلغاء هذا الطلب");
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  it("rejects cancellation after pickup or delivery has started", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ ...baseOrder, status: "picked_up" }] }) }) });
    await expect(cancelOrderForCustomer(baseOrder.reference, 7)).rejects.toThrow("لا يمكن إلغاء الطلب بعد استلامه");
    expect(fakeDb.update).not.toHaveBeenCalled();
  });
});
