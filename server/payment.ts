export function getVodafoneCashInstructions() {
  const number = process.env.VODAFONE_CASH_NUMBER?.trim();
  if (!number) throw new Error("رقم Vodafone Cash غير مُعد.");
  return {
    number,
    title: "الدفع عبر Vodafone Cash",
    note: "حوّل قيمة الطلب ثم أدخل رقم العملية. لا تشارك رقم PIN أو أي رمز سري.",
  } as const;
}
