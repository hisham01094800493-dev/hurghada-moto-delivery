import { BarChart3, BadgeCheck, Bike, ClipboardList, FileCheck2, FolderKanban, Headphones, MapPinned, MessageSquareWarning, Percent, Settings2, ShieldCheck, Tags, Truck, UsersRound, WalletCards } from "lucide-react";
import type { DashboardNavigationItem } from "./DashboardLayout";

export const adminMenu: DashboardNavigationItem[] = [
  { icon: ClipboardList, label: "النظرة العامة", path: "/admin", section: "المتابعة اليومية" },
  { icon: Truck, label: "مركز العمليات", path: "/admin/operations", section: "المتابعة اليومية" },
  { icon: BarChart3, label: "التقرير اليومي", path: "/admin#daily-report", section: "المتابعة اليومية" },
  { icon: Bike, label: "السائقون والتسعير", path: "/admin/drivers", section: "التشغيل والموارد" },
  { icon: FileCheck2, label: "اعتماد السائقين", path: "/admin/verifications", section: "التشغيل والموارد" },
  { icon: WalletCards, label: "السحوبات", path: "/admin/drivers#withdrawals", section: "المالية" },
  { icon: BadgeCheck, label: "المدفوعات", path: "/admin/operations#payments", section: "المالية" },
  { icon: MapPinned, label: "المناطق والرسوم", path: "/admin/settings/zones", section: "الإعدادات" },
  { icon: Percent, label: "أسعار المسارات", path: "/admin/settings/route-prices", section: "الإعدادات" },
  { icon: Tags, label: "الكوبونات والعروض", path: "/admin/coupons", section: "الإعدادات" },
  { icon: MessageSquareWarning, label: "التقييمات والشكاوى", path: "/admin/feedback", section: "الجودة والدعم" },
  { icon: Headphones, label: "صندوق الدعم", path: "/admin/support", section: "الجودة والدعم" },
  { icon: ShieldCheck, label: "سجل التدقيق", path: "/admin/audit", section: "الجودة والدعم" },
  { icon: Settings2, label: "إعدادات الإدارة", path: "/admin/settings", section: "الجودة والدعم" },
];

export function filterAdminNavigation(items: DashboardNavigationItem[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar-EG");
  if (!normalizedQuery) return items;
  return items.filter((item) => `${item.label} ${item.path}`.toLocaleLowerCase("ar-EG").includes(normalizedQuery));
}

export const adminQuickLinks = [
  { icon: Truck, label: "مركز العمليات", path: "/admin/operations", tone: "bg-amber-50 text-amber-950" },
  { icon: Bike, label: "السائقون", path: "/admin/drivers", tone: "bg-teal-50 text-teal-950" },
  { icon: BadgeCheck, label: "المدفوعات", path: "/admin/operations#payments", tone: "bg-violet-50 text-violet-950" },
  { icon: FolderKanban, label: "التسعير والمناطق", path: "/admin/settings", tone: "bg-sky-50 text-sky-950" },
];
