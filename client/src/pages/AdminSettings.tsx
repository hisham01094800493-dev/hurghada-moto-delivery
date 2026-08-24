import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ClipboardList, MapPinned, Settings2, ShieldAlert } from "lucide-react";
import { Link } from "wouter";

const menu = [{ icon: ClipboardList, label: "نظرة عامة", path: "/admin" }, { icon: Settings2, label: "إعدادات الإدارة", path: "/admin/settings" }];

export default function AdminSettings() {
  const { user, loading } = useAuth();
  return <div dir="rtl">{loading ? <div className="min-h-screen bg-slate-50" /> : user?.role !== "admin" ? <main className="container py-16 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-rose-600" /><h1 className="mt-4 text-xl font-black">هذه الصفحة للإدارة فقط</h1></main> : <DashboardLayout menuItems={menu} title="إعدادات الإدارة"><div className="mx-auto max-w-5xl"><header><p className="text-xs font-extrabold tracking-[.16em] text-teal-700">إعدادات التشغيل</p><h1 className="mt-2 text-3xl font-black text-[#082538]">إعدادات الإدارة</h1><p className="mt-2 text-sm font-medium text-slate-600">اضبط قواعد التغطية والرسوم التي تظهر للعملاء وتُطبّق على الطلبات الجديدة.</p></header><section className="mt-8 grid gap-5 sm:grid-cols-2"><Link href="/admin/settings/zones" className="rounded-[2rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 no-underline shadow-sm transition hover:-translate-y-0.5"><span className="inline-grid rounded-2xl bg-teal-600 p-3 text-white"><MapPinned className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-black text-[#082538]">مناطق الغردقة ورسوم التوصيل</h2><p className="mt-2 text-sm font-medium leading-7 text-slate-600">أضف مناطق التغطية، حدّد مركزها ونطاقها، ثم اضبط الرسوم الإضافية وحالة التفعيل.</p><span className="mt-5 inline-flex rounded-xl bg-[#082538] px-4 py-2.5 text-sm font-extrabold text-white">فتح إدارة المناطق</span></Link></section></div></DashboardLayout>}</div>;
}
