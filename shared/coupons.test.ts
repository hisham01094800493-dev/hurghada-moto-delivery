import { describe, expect, it } from "vitest";
import { calculateCouponDiscount, normalizeCouponCode } from "./coupons";

const coupon = { code: "  welcome  ", discountType: "percent" as const, discountValue: 20, minimumOrderFee: 50, maximumDiscount: 25, maxRedemptions: 5, usedCount: 0, status: "active" as const, startsAt: null, endsAt: null };

describe("coupon rules", () => {
  it("normalizes codes and caps percentage discounts", () => {
    expect(normalizeCouponCode(coupon.code)).toBe("WELCOME");
    expect(calculateCouponDiscount(coupon, 200)).toMatchObject({ code: "WELCOME", couponDiscount: 25, finalFee: 175 });
  });

  it("rejects a coupon below its minimum order value or when redemption is exhausted", () => {
    expect(() => calculateCouponDiscount(coupon, 45)).toThrow("حدًا أدنى");
    expect(() => calculateCouponDiscount({ ...coupon, usedCount: 5 }, 100)).toThrow("اكتمل عدد استخدامات");
  });
});
