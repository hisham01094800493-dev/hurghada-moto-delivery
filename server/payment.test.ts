import { describe, expect, it } from "vitest";
import { assertPaymentReceiptAccess, canEnterDriverOperations, deliveryOrderInput } from "./delivery";
import { getVodafoneCashInstructions } from "./payment";

describe("Vodafone Cash configuration", () => {
  it("exposes the configured receiving number through the payment instructions", () => {
    const result = getVodafoneCashInstructions();
    expect(result.number).toBe(process.env.VODAFONE_CASH_NUMBER);
    expect(result.number).toMatch(/^01\d{9}$/);
  });

  it("rejects Vodafone Cash orders without a transaction reference", () => {
    const result = deliveryOrderInput.safeParse({ serviceType: "person", customerName: "أحمد محمد", customerPhone: "01012345678", pickupAddress: "شارع النصر الغردقة", destinationAddress: "الممشى السياحي الغردقة", requestedFor: new Date().toISOString(), paymentMethod: "vodafone_cash" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid Vodafone Cash transaction reference", () => {
    const result = deliveryOrderInput.safeParse({ serviceType: "person", customerName: "أحمد محمد", customerPhone: "01012345678", pickupAddress: "شارع النصر الغردقة", destinationAddress: "الممشى السياحي الغردقة", requestedFor: new Date().toISOString(), paymentMethod: "vodafone_cash", paymentReference: "123456789" });
    expect(result.success).toBe(true);
  });

  it("blocks driver operations until Vodafone Cash is paid", () => {
    expect(canEnterDriverOperations({ paymentMethod: "vodafone_cash", paymentStatus: "verifying" })).toBe(false);
    expect(canEnterDriverOperations({ paymentMethod: "vodafone_cash", paymentStatus: "paid" })).toBe(true);
    expect(canEnterDriverOperations({ paymentMethod: "cash", paymentStatus: "pending" })).toBe(true);
  });

  it("protects payment receipt access by order owner and method", () => {
    expect(() => assertPaymentReceiptAccess({ userId: 12, paymentMethod: "vodafone_cash" }, 99)).toThrow("لا يمكنك إرفاق إيصال");
    expect(() => assertPaymentReceiptAccess({ userId: 12, paymentMethod: "cash" }, 12)).toThrow("لا يمكنك إرفاق إيصال");
    expect(() => assertPaymentReceiptAccess({ userId: 12, paymentMethod: "vodafone_cash" }, 12)).not.toThrow();
  });
});
