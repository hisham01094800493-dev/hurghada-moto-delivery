import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BadgeCheck, Bike, Clock3, LogIn, LocateFixed, MapPinned, Package, Route, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "wouter";

const serviceCards = [
  {
    title: "توصيل أفراد",
    description: "مشوار سريع ومريح داخل الغردقة، مع اختيار الوقت وطريقة التواصل التي تناسبك.",
    href: "/book/person",
    icon: UserRound,
    tag: "من 65 ج.م",
    accent: "bg-[#e8fbf7] text-teal-800",
    iconBg: "bg-teal-600",
  },
  {
    title: "توصيل طلبات ومنتجات",
    description: "استلام وتسليم موثوق للشحنات والطلبات الصغيرة مع بيانات واضحة للمستلم.",
    href: "/book/parcel",
    icon: Package,
    tag: "من 45 ج.م",
    accent: "bg-[#fff0eb] text-[#b84f34]",
    iconBg: "bg-[#ff7954]",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const orders = trpc.orders.mine.useQuery(undefined, { enabled: isAuthenticated });
  const activeOrder = orders.data?.find((order) => !["delivered", "cancelled"].includes(order.status));
  const highlightedOrder = activeOrder || orders.data?.[0];
  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f8fbfc] text-slate-950">
      <AppHeader />
      <main>
        {highlightedOrder && <section className="border-b border-teal-100 bg-[#effcf9]"><div className="container flex flex-wrap items-center justify-between gap-4 py-3"><div className="flex items-center gap-3"><span className="rounded-lg bg-teal-600 p-2 text-white"><Bike className="h-4 w-4" /></span><div><p className="text-xs font-extrabold text-teal-800">{activeOrder ? "لديك طلب نشط الآن" : "أحدث طلب لديك"}</p><p className="text-xs font-medium text-slate-600">{highlightedOrder.reference} · {highlightedOrder.pickupAddress} ← {highlightedOrder.destinationAddress}</p></div></div><Link href={`/track/${highlightedOrder.reference}`} className="rounded-xl bg-[#082538] px-3 py-2 text-xs font-extrabold text-white no-underline">فتح التفاصيل</Link></div></section>}
        <section className="relative isolate overflow-hidden border-b border-slate-200/70 bg-[#f8fbfc]">
          <div className="absolute left-[-8rem] top-[-10rem] -z-10 h-[28rem] w-[28rem] rounded-full bg-[#d8f7f1] blur-3xl" />
          <div className="absolute bottom-[-14rem] right-[-6rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-[#ffe4da] blur-3xl" />
          <div className="container grid min-h-[570px] items-center gap-10 py-14 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-2 text-xs font-extrabold text-teal-800 shadow-sm">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-600" /></span>
                متاح داخل الغردقة
              </div>
              <h1 className="text-4xl font-black leading-[1.18] tracking-tight text-[#082538] sm:text-5xl lg:text-6xl">
                مشوارك، طلبك، <span className="text-teal-600">بأمان</span> وفي الوقت المناسب.
              </h1>
              <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                خدمة توصيل بالموتوسيكل للأفراد والطلبات داخل الغردقة، مصممة لتمنحك حجزًا واضحًا وخيارات وقاية تراعي راحتك وسلامتك.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-3 shadow-sm"><Clock3 className="h-4 w-4 text-teal-600" /> وقت طلب مرن</span>
                <span className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-3 shadow-sm"><ShieldCheck className="h-4 w-4 text-teal-600" /> خيارات بدون تلامس</span>
              </div>
              <a href="#services" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#082538] px-6 py-4 text-sm font-extrabold text-white no-underline shadow-[0_16px_32px_rgba(8,37,56,.22)] transition hover:-translate-y-0.5 hover:bg-[#103a52]">
                ابدأ طلبًا الآن <ArrowLeft className="h-4 w-4" />
              </a>
              {!isAuthenticated && <button type="button" onClick={() => startLogin()} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-extrabold text-[#082538] shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700"><LogIn className="h-4 w-4 text-teal-700" /> إنشاء حساب سريع أو تسجيل الدخول</button>}
            </div>
            <div className="relative mx-auto w-full max-w-[460px]">
              <div className="rounded-[2.3rem] border-[9px] border-[#082538] bg-[#072130] p-4 shadow-[0_32px_70px_rgba(8,37,56,.32)]">
                <div className="overflow-hidden rounded-[1.65rem] bg-[#eefbf9] p-5">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-500"><span>09:41</span><span>الغردقة، مصر</span></div>
                  <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500">أين تريد أن تبدأ؟</p><p className="mt-1 text-sm font-black text-slate-900">ميدان السقالة</p></div><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><LocateFixed className="h-5 w-5" /></span></div>
                    <div className="mr-3 mt-3 h-6 border-r-2 border-dashed border-teal-300" />
                    <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500">إلى أين؟</p><p className="mt-1 text-sm font-black text-slate-900">الممشى السياحي</p></div><span className="rounded-xl bg-orange-50 p-2 text-[#ff7954]"><Route className="h-5 w-5" /></span></div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#082538] p-4 text-white"><span className="rounded-xl bg-teal-500 p-2.5"><Bike className="h-6 w-6" /></span><div><p className="text-xs font-medium text-slate-300">تقدير مبدئي</p><p className="text-lg font-black">65 ج.م <span className="text-xs font-medium text-slate-300">— توصيل أفراد</span></p></div></div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-6 rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-lg"><p className="flex items-center gap-2 text-xs font-black text-teal-800"><ShieldCheck className="h-4 w-4" /> توصيل دون تلامس</p></div>
            </div>
          </div>
        </section>

        <section id="services" className="container py-16 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold tracking-[.18em] text-teal-700">اختر ما تحتاج إليه</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#082538] sm:text-4xl">خدمتان، تجربة واحدة سهلة</h2></div><p className="max-w-sm text-sm font-medium leading-7 text-slate-500">اختر نوع التوصيل ثم أدخل التفاصيل، وسنعرض لك ملخص الطلب والتقدير المبدئي قبل الإرسال.</p></div>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {serviceCards.map((service) => { const Icon = service.icon; return <Link key={service.title} href={service.href} className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 no-underline shadow-[0_15px_35px_rgba(15,23,42,.05)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,.11)]"><div className={`absolute left-0 top-0 h-full w-2 ${service.iconBg}`} /><div className="flex items-start justify-between gap-6"><span className={`rounded-2xl p-4 text-white ${service.iconBg}`}><Icon className="h-7 w-7" /></span><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${service.accent}`}>{service.tag}</span></div><h3 className="mt-8 text-2xl font-black text-slate-900">{service.title}</h3><p className="mt-3 max-w-md text-sm font-medium leading-7 text-slate-600">{service.description}</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#082538] transition group-hover:text-teal-700">احجز الآن <ArrowLeft className="h-4 w-4" /></span></Link>; })}
          </div>
        </section>

        <section className="border-y border-slate-100 bg-white">
          <div className="container py-14 sm:py-16"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold tracking-[.16em] text-teal-700">داخل الغردقة</p><h2 className="mt-3 text-3xl font-black text-[#082538]">مناطق التغطية الأساسية</h2></div><p className="max-w-md text-sm font-medium leading-7 text-slate-600">تظهر لك تفاصيل العنوان والتقدير المبدئي قبل التأكيد. اكتب عنوانًا دقيقًا عند الطلب من منطقة أبعد.</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["السقالة والوسط", "الممشى السياحي", "الإنتركونتيننتال", "الأحياء والمناطق القريبة"].map((area) => <div key={area} className="flex items-center gap-3 rounded-2xl bg-[#f8fbfc] p-4"><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><MapPinned className="h-4 w-4" /></span><span className="text-sm font-extrabold text-[#082538]">{area}</span></div>)}</div></div>
        </section>

        <section id="safety" className="border-y border-teal-100 bg-[#e9faf7]">
          <div className="container grid gap-10 py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><span className="inline-flex rounded-2xl bg-[#082538] p-4 text-white"><ShieldCheck className="h-8 w-8" /></span><h2 className="mt-5 text-3xl font-black leading-tight text-[#082538]">سلامتك جزء من كل مشوار.</h2><p className="mt-4 max-w-md text-sm font-medium leading-7 text-slate-600">فعّل التسليم دون تلامس، أضف أي ملاحظة صحية لازمة، واختر ما يناسب وضعك عند الحجز.</p></div>
            <div className="grid gap-4 sm:grid-cols-3">{[["دون تلامس", "اترك الطلب عند الباب أو نقطة متفق عليها.", BadgeCheck], ["ملاحظات صحية", "أضف تفضيلاتك بوضوح قبل إرسال الطلب.", Sparkles], ["إرشادات واضحة", "تذكير هادئ بالوقاية واحترام المسافة.", ShieldCheck]].map(([title, desc, Icon]) => { const CardIcon = Icon as typeof ShieldCheck; return <div key={title as string} className="rounded-2xl border border-white bg-white/75 p-5"><CardIcon className="h-5 w-5 text-teal-700" /><h3 className="mt-4 text-base font-black text-[#082538]">{title as string}</h3><p className="mt-2 text-xs font-medium leading-6 text-slate-600">{desc as string}</p></div>; })}</div>
          </div>
        </section>
        <section className="container py-14 sm:py-16">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-2xl"><p className="text-xs font-extrabold tracking-[.16em] text-teal-700">وقاية مشتركة</p><h2 className="mt-3 text-2xl font-black text-[#082538] sm:text-3xl">إرشادات بسيطة قبل تنفيذ الطلب</h2><p className="mt-3 text-sm font-medium leading-7 text-slate-600">نحافظ على تجربة هادئة وواضحة عندما يشارك كل طرف المعلومات المهمة ويختار طريقة التسليم المناسبة.</p></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-[#effcf9] p-5"><span className="inline-flex rounded-xl bg-white p-2 text-teal-700 shadow-sm"><UserRound className="h-5 w-5" /></span><h3 className="mt-4 font-black text-[#082538]">للعميل</h3><p className="mt-2 text-sm font-medium leading-7 text-slate-600">حدد نقطة تسليم واضحة، وأضف أي تفضيل مهم في الملاحظات. عند التسليم المباشر، حافظ على مسافة مناسبة، وفعّل التسليم دون تلامس متى كان ذلك أنسب لك.</p></article>
              <article className="rounded-2xl bg-[#fff4ef] p-5"><span className="inline-flex rounded-xl bg-white p-2 text-[#d75c3e] shadow-sm"><Bike className="h-5 w-5" /></span><h3 className="mt-4 font-black text-[#082538]">للسائق</h3><p className="mt-2 text-sm font-medium leading-7 text-slate-600">راجع عنوان الطلب والملاحظات قبل الوصول، وأكّد الاستلام والتسليم بوضوح. احترم طلب عدم التلامس، واتصل بالعميل عند الحاجة إلى توضيح نقطة التسليم.</p></article>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#082538] py-8 text-center text-sm font-medium text-slate-300">اطلب أونلاين — خدمة توصيل محلية للأفراد والطلبات داخل الغردقة.</footer>
    </div>
  );
}
