import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => fakeDb) }));

import { getDriverChatForCustomer, sendCustomerDriverMessage } from "./db";

describe("chat access boundaries", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://test";
    vi.clearAllMocks();
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 77, userId: 4, driverId: 9 }] }) }) });
  });

  it("does not expose a driver chat to another customer", async () => {
    await expect(getDriverChatForCustomer("ORD-77", 99)).resolves.toEqual({ available: false, messages: [] });
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("does not allow another customer to send into the order chat", async () => {
    await expect(sendCustomerDriverMessage("ORD-77", 99, "رسالة غير مصرح بها")).rejects.toThrow("لم يُعيّن مندوب لهذا الطلب بعد");
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });
});
