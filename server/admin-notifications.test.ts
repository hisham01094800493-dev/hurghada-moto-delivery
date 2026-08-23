import { describe, expect, it } from "vitest";
import { hasNewPendingPayment } from "../shared/adminNotifications";

describe("admin payment notifications", () => {
  it("does not notify on initial load", () => {
    expect(hasNewPendingPayment(null, 2)).toBe(false);
  });

  it("notifies only when the pending count increases", () => {
    expect(hasNewPendingPayment(1, 2)).toBe(true);
    expect(hasNewPendingPayment(2, 2)).toBe(false);
    expect(hasNewPendingPayment(3, 1)).toBe(false);
  });
});
