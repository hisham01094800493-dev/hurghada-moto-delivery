import { describe, expect, it } from "vitest";
import { buildDailyDeliveryReport } from "../shared/reporting";

describe("daily delivery report", () => {
  it("counts only orders delivered on the selected Cairo day", () => {
    const report = buildDailyDeliveryReport([
      { status: "delivered", deliveredAt: new Date("2026-08-23T12:00:00.000Z"), estimatedFee: 65, serviceType: "person", paymentMethod: "cash" },
      { status: "delivered", deliveredAt: new Date("2026-08-22T12:00:00.000Z"), estimatedFee: 80, serviceType: "parcel", paymentMethod: "vodafone_cash" },
      { status: "in_delivery", deliveredAt: null, estimatedFee: 90, serviceType: "items", paymentMethod: "cash" },
    ], new Date("2026-08-23T15:00:00.000Z"));

    expect(report.deliveredCount).toBe(1);
    expect(report.revenue).toBe(65);
    expect(report.averageFee).toBe(65);
    expect(report.byService.person).toEqual({ count: 1, revenue: 65 });
    expect(report.byPayment.cash).toEqual({ count: 1, revenue: 65 });
    expect(report.previousDeliveredCount).toBe(1);
    expect(report.previousRevenue).toBe(80);
  });

  it("returns an empty but valid report when no delivery was completed", () => {
    const report = buildDailyDeliveryReport([], new Date("2026-08-23T15:00:00.000Z"));
    expect(report.deliveredCount).toBe(0);
    expect(report.revenue).toBe(0);
    expect(report.averageFee).toBe(0);
    expect(report.byService).toEqual({});
    expect(report.byPayment).toEqual({});
    expect(report.previousDeliveredCount).toBe(0);
    expect(report.previousRevenue).toBe(0);
  });
});
