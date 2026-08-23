import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const { updateContactForUser } = vi.hoisted(() => ({ updateContactForUser: vi.fn().mockResolvedValue({ user: { id: 21 }, addresses: [] }) }));
vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), updateContactForUser }));

const user = { id: 21, openId: "quick-account", email: "quick@example.com", name: null, phone: null, loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

describe("quick account settings", () => {
  it("updates the authenticated user's contact settings", async () => {
    await caller.profile.updateContact({ name: "أحمد علي", phone: "01012345678" });
    expect(updateContactForUser).toHaveBeenCalledWith(21, "أحمد علي", "01012345678");
  });

  it("rejects incomplete contact settings", async () => {
    await expect(caller.profile.updateContact({ name: "أ", phone: "123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
