export type DailyReportOrder = {
  status: string;
  deliveredAt: Date | null;
  estimatedFee: number;
  serviceType: string;
  paymentMethod: string;
};

const REPORT_TIME_ZONE = "Africa/Cairo";

export function localDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function buildDailyDeliveryReport(orders: DailyReportOrder[], targetDate = new Date()) {
  const dateKey = localDateKey(targetDate);
  const [year, month, day] = dateKey.split("-").map(Number);
  const previousDateKey = localDateKey(new Date(Date.UTC(year, month - 1, day - 1, 12)));
  const delivered = orders.filter((order) => order.status === "delivered" && order.deliveredAt && localDateKey(order.deliveredAt) === dateKey);
  const previousDelivered = orders.filter((order) => order.status === "delivered" && order.deliveredAt && localDateKey(order.deliveredAt) === previousDateKey);
  const revenue = delivered.reduce((sum, order) => sum + order.estimatedFee, 0);
  const byService = delivered.reduce<Record<string, { count: number; revenue: number }>>((result, order) => {
    result[order.serviceType] ??= { count: 0, revenue: 0 };
    result[order.serviceType].count += 1;
    result[order.serviceType].revenue += order.estimatedFee;
    return result;
  }, {});
  const byPayment = delivered.reduce<Record<string, { count: number; revenue: number }>>((result, order) => {
    result[order.paymentMethod] ??= { count: 0, revenue: 0 };
    result[order.paymentMethod].count += 1;
    result[order.paymentMethod].revenue += order.estimatedFee;
    return result;
  }, {});
  const previousRevenue = previousDelivered.reduce((sum, order) => sum + order.estimatedFee, 0);
  return { dateKey, dateLabel: new Intl.DateTimeFormat("ar-EG", { timeZone: REPORT_TIME_ZONE, dateStyle: "full" }).format(targetDate), deliveredCount: delivered.length, revenue, averageFee: delivered.length ? Math.round(revenue / delivered.length) : 0, previousDeliveredCount: previousDelivered.length, previousRevenue, byService, byPayment };
}
