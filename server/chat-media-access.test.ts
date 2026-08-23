import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => fakeDb) }));

import { createLiveLocationMessage, sendCustomerDriverAudio, updateLiveLocation } from "./db";

describe("chat media access boundaries", () => {
  beforeEach(() => { process.env.DATABASE_URL = "mysql://test"; vi.clearAllMocks(); fakeDb.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) }); fakeDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) }); });

  it("rejects updating a live location message owned by another sender", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 8, senderUserId: 4, messageType: "location" }] }) }) });
    await expect(updateLiveLocation(8, 99, 27.2, 33.8)).rejects.toThrow("لا يمكنك تحديث مشاركة الموقع هذه");
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  it("stops a live location without overwriting its last coordinates", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 8, senderUserId: 4, messageType: "location", locationLatitude: 27.2, locationLongitude: 33.8 }] }) }) });
    await updateLiveLocation(8, 4, undefined, undefined, false);
    const setCall = fakeDb.update.mock.results[0]?.value?.set;
    expect(setCall).toHaveBeenCalledWith({ locationIsLive: 0, locationLatitude: 27.2, locationLongitude: 33.8 });
  });

  it("creates a visible system message when live sharing stops", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 8, senderUserId: 4, recipientUserId: 9, orderId: 77, messageType: "location", locationIsLive: 1, locationLatitude: 27.2, locationLongitude: 33.8 }] }) }) });
    await updateLiveLocation(8, 4, undefined, undefined, false);
    const values = fakeDb.insert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ messageType: "system", body: expect.stringContaining("أوقف") }));
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ body: expect.any(String), createdAt: expect.any(Date) }));
  });

  it("rejects creating a location share from a user outside the order", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 8, userId: 4, driverId: 9 }] }) }) });
    await expect(createLiveLocationMessage(8, 99, 27.2, 33.8)).rejects.toThrow("لا يمكنك مشاركة موقعك في هذا الطلب");
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejects audio from a customer who does not own the order", async () => {
    fakeDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 8, userId: 4, driverId: 9 }] }) }) });
    await expect(sendCustomerDriverAudio("ORD-8", 99, "/manus-storage/audio.webm", "audio.webm", 4)).rejects.toThrow("لم يُعيّن مندوب لهذا الطلب بعد");
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });
});
