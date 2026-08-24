import { Gift, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const STORAGE_KEY = "booking-coupon-code";

export function BookingCouponBar() {
  const [location] = useLocation(); const isBooking = location.startsWith("/book/");
  const [open, setOpen] = useState(false); const [code, setCode] = useState("");
  useEffect(() => { if (isBooking) setCode(window.localStorage.getItem(STORAGE_KEY) || ""); }, [isBooking]);
  if (!isBooking) return null;
  const save = () => { const normalized = code.trim().toUpperCase().replace(/\s+/g, ""); if (normalized) window.localStorage.setItem(STORAGE_KEY, normalized); else window.localStorage.removeItem(STORAGE_KEY); setCode(normalized); setOpen(false); };
  return <div dir="rtl" className="fixed bottom-5 left-3 z-50 w-[calc(100%-1.5rem)] max-w-sm sm:left-5">{open ? <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-[0_16px_38px_rgba(8,37,56,.2)]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#082538]">كود خصم أو عرض</p><p className="mt-1 text-xs font-medium text-slate-500">يُتحقق منه عند تأكيد الطلب.</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="إغلاق"><X className="h-4 w-4" /></button></div><div className="mt-3 flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value)} maxLength={40} placeholder="مثال: HURGHADA20" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold uppercase outline-none focus:border-amber-400" /><button onClick={save} className="rounded-xl bg-[#082538] px-4 text-xs font-extrabold text-white">تطبيق</button></div>{code && <button onClick={() => { setCode(""); window.localStorage.removeItem(STORAGE_KEY); }} className="mt-3 text-xs font-extrabold text-rose-700">إزالة الكود</button>}</section> : <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-[#082538] shadow-[0_10px_26px_rgba(8,37,56,.16)] ring-1 ring-amber-100 transition hover:bg-amber-50 active:scale-[.97]"><span className="rounded-lg bg-amber-100 p-1.5 text-amber-700"><Gift className="h-4 w-4" /></span>{code ? <><Tag className="h-4 w-4 text-teal-700" /> كود {code}</> : "لديك كود خصم؟"}</button>}</div>;
}
