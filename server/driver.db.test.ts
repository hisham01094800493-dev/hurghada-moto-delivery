import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = {
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => fakeDb) }));

import { updateDriverAvailability, updateDriverOrderStatus } from "./db";

function mockAssignedOrder(status: "assigned" | "driver_arrived" | "picked_up" | "in_delivery") {
  fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 77, driverId: 9, userId: 4, status, estimatedFee: 50, paymentMethod: "cash", paymentStatus: "pending" }] }) }) });
}

describe("updateDriverOrderStatus operational path", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://test";
    vi.clearAllMocks();
  });

  it("rejects assigned-to-delivered through the real update function before database mutation", async () => {
    mockAssignedOrder("assigned");
    await expect(updateDriverOrderStatus(77, 9, 42, "delivered")).rejects.toThrow("لا يمكن تنفيذ هذا الإجراء");
    expect(fakeDb.update).not.toHaveBeenCalled();
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejects putting an unverified driver online before database mutation", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 9, verificationStatus: "pending" }] }) }) });
    await expect(updateDriverAvailability(9, "online")).rejects.toThrow("لا يمكنك التفعيل قبل اعتماد مستندات الحساب");
    expect(fakeDb.update).not.toHaveBeenCalled();
  });
});
