import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { adminMenu } from "@/components/AdminNavigation";
import { trpc } from "@/lib/trpc";
import { BadgeDollarSign, Check, CircleAlert, Percent, ShieldAlert, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statusLabel: Record<string, string> = { online: "متاح", busy: "في مشوار", offline: "غير متصل", suspended: "موقوف" };

export default function AdminWallets() {
  const { user, loading } = useAuth();
  const enabled = user?.role === "admin";
  const utils = trpc.useUtils();
  const overview = trpc.admin.walletOverview.useQuery(undefined, { enabled, retry: false });
  const [selected, setSelected] = useState<number[]>([]);
  const [commission, setCommission] = useState("10");
  const updateBulk = trpc.admin.bulkUpdateDriverCommission.useMutation({
    onSuccess: () => { toast.success("تم تحديث عمولة السائقين المحددين."); setSelected([]); utils.admin.walletOverview.invalidate(); utils.admin.drivers.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const wallets = overview.data || [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = wallets.length > 0 && selected.length === wallets.length;
  const totalBalance = wallets.reduce((sum, item) => sum + item.driver.walletBalance, 0);
  const blockedCount = wallets.filter((item) => item.isBlocked).length;

  function toggleAll() { setSelected(allSelected ? [] : wallets.map((item) => item.driver.id)); }
  function toggleDriver(id: number) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function saveCommission() { const value = Number(commission); if (!Number.isInteger(value) || value < 0 || value > 80 || !selected.length) return; updateBulk.mutate({ driverIds: selected, commissionPercent: value }); }

  if (loading) return <div className="min-h-screen bg-slate-50" />;
  if (!enabled) return <main dir="rtl" className="container py-16 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-rose-600" /><h1 className="mt-4 text-xl font-black">هذه الصفحة للإدارة فقط</h1></main>;

  return <div dir="rtl"><DashboardLayout menuItems={adminMenu} title="محافظ السائقين"><main className="mx-auto max-w-7xl"><header><p className="text-xs font-extrabold tracking-[.16em] text-teal-700">المالية والتشغيل</p><h1 className="mt-2 text-3xl font-black text-[#082538]">محافظ السائقين والعمولات</h1><p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">تابع رصيد التشغيل، راجع المشاوير المنفذة، وحدد نسبة عمولة الإدارة لسائق واحد أو لمجموعة في خطوة واحدة.</p></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-3"><article className="rounded-[2rem] bg-[#082538] p-5 text-white"><WalletCards className="h-5 w-5 text-teal-300" /><p className="mt-6 text-xs font-bold text-white/60">إجمالي أرصدة المحافظ</p><p className="mt-2 text-3xl font-black">{totalBalance} ج.م</p></article><article className="rounded-[2rem] border border-slate-200 bg-white p-5"><BadgeDollarSign className="h-5 w-5 text-teal-700" /><p className="mt-6 text-xs font-bold text-slate-500">عدد السائقين</p><p className="mt-2 text-3xl font-black text-[#082538]">{wallets.length}</p></article><article className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5"><CircleAlert className="h-5 w-5 text-rose-700" /><p className="mt-6 text-xs font-bold text-rose-700">محافظ متوقفة</p><p className="mt-2 text-3xl font-black text-rose-900">{blockedCount}</p></article></section>
    <section className="mt-8 rounded-[2rem] border border-teal-100 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Percent className="h-5 w-5 text-teal-700" /><h2 className="font-black text-[#082538]">تعديل عمولة مجموعة</h2></div><p className="mt-2 text-xs font-medium text-slate-500">حدد سائقًا أو أكثر، أدخل النسبة من 0 إلى 80، ثم احفظ. تُطبّق النسبة على المشاوير التي تُسلّم بعد الحفظ.</p></div><div className="flex w-full flex-wrap items-end gap-2 sm:w-auto"><label className="text-xs font-extrabold text-slate-600">النسبة (%)<input type="number" min="0" max="80" step="1" value={commission} onChange={(event) => setCommission(event.target.value)} className="mt-1 w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><button disabled={!selected.length || updateBulk.isPending || !Number.isInteger(Number(commission)) || Number(commission) < 0 || Number(commission) > 80} onClick={saveCommission} className="rounded-xl bg-[#082538] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">{updateBulk.isPending ? "جارٍ الحفظ…" : `حفظ لـ ${selected.length} سائق`}</button></div></div></section>
    <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><label className="flex items-center gap-3 text-sm font-black text-[#082538]"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-teal-600" />تحديد كل السائقين</label><span className="text-xs font-bold text-slate-500">{selected.length} محدد</span></div><div className="divide-y divide-slate-100">{wallets.length ? wallets.map((item) => <article key={item.driver.id} className="p-5"><div className="flex flex-wrap items-start gap-4"><input type="checkbox" checked={selectedSet.has(item.driver.id)} onChange={() => toggleDriver(item.driver.id)} className="mt-1 h-4 w-4 accent-teal-600" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#082538]">{item.driver.displayName}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600">{statusLabel[item.driver.availability] || item.driver.availability}</span>{item.isBlocked && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-extrabold text-rose-700">متوقف عند الحد الائتماني</span>}</div><p className="mt-1 text-xs font-medium text-slate-500">{item.driver.phone} · {item.orders.length} مشوار منفذ · عمولة الإدارة {item.driver.commissionPercent}%</p><div className="mt-3 grid gap-2 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold text-slate-500">رصيد المحفظة</p><strong className={item.driver.walletBalance < 0 ? "text-rose-700" : "text-teal-700"}>{item.driver.walletBalance} ج.م</strong></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold text-slate-500">إجمالي المشاوير</p><strong className="text-[#082538]">{item.orders.length}</strong></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold text-slate-500">عمولة الإدارة</p><strong className="text-[#082538]">{item.orders.reduce((sum, order) => sum + order.platformCommissionAmount, 0)} ج.م</strong></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold text-slate-500">آخر حركة</p><strong className="text-[#082538]">{item.transactions[0] ? `${item.transactions[0].amount} ج.م` : "لا توجد"}</strong></div></div><div className="mt-3 flex flex-wrap gap-2">{item.orders.slice(0, 3).map((order) => <span key={order.id} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600">{order.reference} · {order.driverEarnings} ج.م للسائق</span>)}</div></div></div></article>) : <div className="p-12 text-center text-sm font-bold text-slate-500">لا توجد ملفات سائقين لعرض المحافظ.</div>}</div></section>
  </main></DashboardLayout></div>;
}
