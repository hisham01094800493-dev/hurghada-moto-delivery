export type CouponRule = {
  code: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  minimumOrderFee: number;
  maximumDiscount?: number | null;
  maxRedemptions?: number | null;
  usedCount: number;
  status: "active" | "paused" | "expired";
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function calculateCouponDiscount(coupon: CouponRule, fareBeforeDiscount: number, now = new Date()) {
  const fare = Math.max(0, Math.round(fareBeforeDiscount));
  if (coupon.status !== "active") throw new Error("هذا الكوبون غير متاح حاليًا.");
  if (coupon.startsAt && coupon.startsAt > now) throw new Error("هذا الكوبون لم يبدأ بعد.");
  if (coupon.endsAt && coupon.endsAt < now) throw new Error("انتهت صلاحية هذا الكوبون.");
  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined && coupon.usedCount >= coupon.maxRedemptions) throw new Error("اكتمل عدد استخدامات هذا الكوبون.");
  if (fare < coupon.minimumOrderFee) throw new Error(`يتطلب الكوبون حدًا أدنى للطلب ${coupon.minimumOrderFee} ج.م.`);
  const rawDiscount = coupon.discountType === "percent" ? Math.round((fare * coupon.discountValue) / 100) : coupon.discountValue;
  const cappedDiscount = coupon.maximumDiscount === null || coupon.maximumDiscount === undefined ? rawDiscount : Math.min(rawDiscount, coupon.maximumDiscount);
  const couponDiscount = Math.min(fare, Math.max(0, Math.round(cappedDiscount)));
  return { code: normalizeCouponCode(coupon.code), fareBeforeDiscount: fare, couponDiscount, finalFee: fare - couponDiscount };
}
