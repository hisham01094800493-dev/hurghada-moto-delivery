import { useAuth } from "@/_core/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, ContactRound, FileText, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type FormState = {
  customerName: string; customerPhone: string; pickupAddress: string; destinationAddress: string; requestedFor: string;
  recipientName: string; recipientPhone: string; packageDescription: string; contactless: boolean; healthNotes: string;
};

const initialForm: FormState = { customerName: "", customerPhone: "", pickupAddress: "", destinationAddress: "", requestedFor: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16), recipientName: "", recipientPhone: "", packageDescription: "", contactless: true, healthNotes: "" };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-extrabold text-slate-800">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs font-medium text-slate-500">{hint}</span>}</label>;
}

export default function Booking() {
  const [location, navigate] = useLocation();
  const isParcel = location.includes("parcel");
  const serviceType = isParcel ? "parcel" : "person";
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [reviewOpen, setReviewOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (order) => { toast.success(`تم استلام طلبك برقم ${order?.reference}`); navigate("/my-orders"); },
    onError: (error) => toast.error(error.message || "تعذر حفظ الطلب. حاول مرة أخرى."),
  });
  const estimatedFee = useMemo(() => {
    const hour = new Date(form.requestedFor).getHours();
    return (isParcel ? 45 : 65) + (hour >= 22 || hour < 7 ? 15 : 0);
  }, [form.requestedFor, isParcel]);
  const update = (field: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const reviewBooking = (event: FormEvent) => { event.preventDefault(); if (formRef.current?.reportValidity()) setReviewOpen(true); };
  const confirmBooking = () => {
    if (!isAuthenticated) { toast.info("سجّل الدخول لحفظ طلبك ومتابعته."); startLogin(); return; }
    createOrder.mutate({ serviceType, ...form });
  };
  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100";
  const serviceName = isParcel ? "توصيل طلبات ومنتجات" : "توصيل أفراد";
  const ServiceIcon = isParcel ? Package : UserRound;

  return <div dir="rtl" className="min-h-screen bg-[#f8fbfc] text-slate-950"><AppHeader />
    <main className="container py-8 sm:py-12"><button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-600 transition hover:text-teal-700"><ArrowRight className="h-4 w-4" /> العودة للرئيسية</button>
      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,.06)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6"><div className="flex items-center gap-4"><span className={`rounded-2xl p-3.5 text-white ${isParcel ? "bg-[#ff7954]" : "bg-teal-600"}`}><ServiceIcon className="h-6 w-6" /></span><div><p className="text-xs font-extrabold text-teal-700">طلب جديد داخل الغردقة</p><h1 className="mt-1 text-2xl font-black text-[#082538]">{serviceName}</h1></div></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">الخطوة 1 من 1</span></div>
          <form ref={formRef} onSubmit={reviewBooking} className="mt-7 space-y-8">
            <div><div className="mb-4 flex items-center gap-2"><ContactRound className="h-5 w-5 text-teal-700" /><h2 className="font-black text-slate-900">بيانات التواصل</h2></div><div className="grid gap-5 sm:grid-cols-2"><Field label="الاسم الكامل"><input required value={form.customerName} onChange={(e) => update("customerName", e.target.value)} placeholder={user?.name || "مثال: أحمد محمد"} className={fieldClass} /></Field><Field label="رقم الهاتف"><input required dir="ltr" inputMode="tel" value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} placeholder="010 1234 5678" className={`${fieldClass} text-right`} /></Field></div></div>
            <div><div className="mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-teal-700" /><h2 className="font-black text-slate-900">مسار التوصيل</h2></div><div className="relative space-y-5 before:absolute before:right-[17px] before:top-12 before:h-10 before:border-r-2 before:border-dashed before:border-teal-200"><Field label={isParcel ? "عنوان الاستلام" : "نقطة الانطلاق"}><input required value={form.pickupAddress} onChange={(e) => update("pickupAddress", e.target.value)} placeholder="مثال: شارع الشيراتون، بجوار..." className={fieldClass} /></Field><Field label={isParcel ? "عنوان التسليم" : "الوجهة"}><input required value={form.destinationAddress} onChange={(e) => update("destinationAddress", e.target.value)} placeholder="مثال: الممشى السياحي، فندق..." className={fieldClass} /></Field></div><div className="mt-5 max-w-sm"><Field label="وقت الطلب" hint="تطبق رسوم إضافية بسيطة بعد الساعة 10 مساءً."><div className="relative"><Clock3 className="pointer-events-none absolute right-4 top-3.5 h-5 w-5 text-slate-400" /><input required type="datetime-local" value={form.requestedFor} onChange={(e) => update("requestedFor", e.target.value)} className={`${fieldClass} pr-11`} /></div></Field></div></div>
            {isParcel && <div><div className="mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-[#e66545]" /><h2 className="font-black text-slate-900">بيانات الشحنة والمستلم</h2></div><div className="grid gap-5 sm:grid-cols-2"><Field label="اسم المستلم"><input required value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} placeholder="الاسم الكامل" className={fieldClass} /></Field><Field label="هاتف المستلم"><input required dir="ltr" inputMode="tel" value={form.recipientPhone} onChange={(e) => update("recipientPhone", e.target.value)} placeholder="010 1234 5678" className={`${fieldClass} text-right`} /></Field></div><div className="mt-5"><Field label="وصف الشحنة أو المنتج" hint="اذكر الحجم أو أي تفاصيل تساعد في النقل بأمان."><textarea required rows={4} value={form.packageDescription} onChange={(e) => update("packageDescription", e.target.value)} placeholder="مثال: كيس طعام صغير، قابل للحمل على الموتوسيكل" className={`${fieldClass} resize-none`} /></Field></div></div>}
            <div className="rounded-2xl border border-teal-100 bg-[#effcf9] p-5"><div className="flex items-start gap-3"><input id="contactless" type="checkbox" checked={form.contactless} onChange={(e) => update("contactless", e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" /><div><label htmlFor="contactless" className="cursor-pointer text-sm font-black text-[#082538]">التوصيل دون تلامس</label><p className="mt-1 text-xs font-medium leading-6 text-slate-600">يمكن للسائق ترك الطلب في نقطة متفق عليها أو عند الباب عند الإمكان.</p></div></div><div className="mt-4 border-t border-teal-100 pt-4"><Field label="ملاحظات صحية أو تعليمات للسائق" hint="اختياري — مثل تفضيل التواصل الهاتفي أو تعليمات عند التسليم."><textarea rows={2} value={form.healthNotes} onChange={(e) => update("healthNotes", e.target.value)} placeholder="اكتب ملاحظة مختصرة..." className={`${fieldClass} resize-none bg-white`} /></Field></div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#082538]"><ShieldCheck className="h-4 w-4 text-teal-700" /> قبل تأكيد الطلب</div>
              <div className="mt-3 grid gap-3 text-xs font-medium leading-6 text-slate-600 sm:grid-cols-2"><p><strong className="text-slate-800">للعميل:</strong> راجع نقطة التسليم، وأضف أي تفضيل صحي أو فعّل خيار عدم التلامس عند الحاجة.</p><p><strong className="text-slate-800">للسائق:</strong> ستظهر له تفاصيل العنوان والملاحظات لتأكيد الاستلام والتسليم بصورة واضحة.</p></div>
            </div>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#082538] px-6 py-4 text-sm font-extrabold text-white shadow-[0_13px_24px_rgba(8,37,56,.2)] transition hover:bg-[#103a52]"><FileText className="h-4 w-4" /> مراجعة ملخص الطلب <ArrowLeft className="h-4 w-4" /></button>
          </form>
        </section>
        <aside className="sticky top-24 rounded-[2rem] border border-slate-200 bg-[#082538] p-6 text-white shadow-[0_20px_40px_rgba(8,37,56,.2)]"><div className="flex items-center justify-between"><p className="text-sm font-bold text-teal-300">ملخص سريع</p><span className="rounded-xl bg-white/10 p-2"><ServiceIcon className="h-5 w-5" /></span></div><h2 className="mt-6 text-xl font-black">{serviceName}</h2><div className="mt-6 space-y-4 border-y border-white/10 py-5 text-sm"><div><p className="text-xs text-slate-300">من</p><p className="mt-1 line-clamp-1 font-bold">{form.pickupAddress || "أضف نقطة الانطلاق"}</p></div><div><p className="text-xs text-slate-300">إلى</p><p className="mt-1 line-clamp-1 font-bold">{form.destinationAddress || "أضف الوجهة"}</p></div></div><div className="mt-5 flex items-end justify-between"><div><p className="text-xs font-bold text-slate-300">تقدير مبدئي</p><p className="mt-1 text-[11px] text-slate-400">يؤكد قبل التنفيذ وفق المسار.</p></div><p className="text-2xl font-black text-white">{estimatedFee} <span className="text-sm text-teal-300">ج.م</span></p></div><div className="mt-6 flex gap-2 rounded-xl bg-white/10 p-3 text-xs leading-5 text-slate-200"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" /> تستند الخدمة إلى تفاصيل الحجز، مع احترام خيارك للتسليم دون تلامس.</div></aside>
      </div>
    </main>
    {reviewOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center"><div role="dialog" aria-modal="true" aria-label="ملخص الطلب" className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold text-teal-700">راجع قبل الإرسال</p><h2 className="mt-1 text-2xl font-black text-[#082538]">ملخص طلبك</h2></div><button onClick={() => setReviewOpen(false)} className="rounded-xl bg-slate-100 p-2 text-slate-600">×</button></div><div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><p><span className="font-bold text-slate-500">الخدمة: </span>{serviceName}</p><p><span className="font-bold text-slate-500">المسار: </span>{form.pickupAddress} ← {form.destinationAddress}</p><p><span className="font-bold text-slate-500">التواصل: </span>{form.customerPhone}</p>{isParcel && <p><span className="font-bold text-slate-500">المستلم: </span>{form.recipientName} — {form.recipientPhone}</p>}<p className="flex items-center gap-2 text-teal-800"><Check className="h-4 w-4" /> {form.contactless ? "التوصيل دون تلامس مفعّل" : "تسليم مباشر"}</p></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-[#082538] px-4 py-3 text-white"><span className="text-sm font-bold">التقدير المبدئي</span><strong className="text-xl">{estimatedFee} ج.م</strong></div><p className="mt-4 flex gap-2 text-xs font-medium leading-6 text-slate-500"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /> السعر تقديري ويُراجع بحسب المسار الفعلي وتفاصيل الطلب قبل التنفيذ.</p><div className="mt-4 rounded-xl bg-[#effcf9] p-3 text-xs font-medium leading-6 text-teal-900"><span className="font-black">تذكير بالسلامة:</span> ستُشارك ملاحظاتك مع السائق، ويمكنك تعديل خيار عدم التلامس الآن قبل تأكيد الطلب.</div><div className="mt-5 flex gap-3"><button onClick={() => setReviewOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">تعديل</button><button disabled={createOrder.isPending} onClick={confirmBooking} className="flex-[1.4] rounded-xl bg-teal-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-teal-700 disabled:opacity-60">{createOrder.isPending ? "يُرسل الطلب..." : "تأكيد وإرسال"}</button></div></div></div>}
  </div>;
}
