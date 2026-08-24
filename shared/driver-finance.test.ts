import { describe, expect, it } from "vitest";
import { calculateAvailableWithdrawalBalance } from "./driver-finance";

describe("driver withdrawal balance", () => {
  it("reserves pending, approved, and paid requests while ignoring rejected requests", () => {
    expect(calculateAvailableWithdrawalBalance(500, [{ amount: 100, status: "pending" }, { amount: 50, status: "approved" }, { amount: 200, status: "paid" }, { amount: 75, status: "rejected" }])).toEqual({ committedWithdrawals: 350, availableToWithdraw: 150 });
  });

  it("never exposes a negative withdrawal balance", () => {
    expect(calculateAvailableWithdrawalBalance(100, [{ amount: 150, status: "pending" }]).availableToWithdraw).toBe(0);
  });
});
