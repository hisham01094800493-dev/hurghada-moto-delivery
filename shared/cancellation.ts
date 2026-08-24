export const CANCELLATION_REASONS = [
  "لم أعد بحاجة إلى التوصيل",
  "تغيير موعد أو عنوان الطلب",
  "تأخر قبول السائق",
  "خطأ في تفاصيل الطلب",
  "اختيار خدمة توصيل أخرى",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export function isCancellationReason(value: string): value is CancellationReason {
  return (CANCELLATION_REASONS as readonly string[]).includes(value);
}
