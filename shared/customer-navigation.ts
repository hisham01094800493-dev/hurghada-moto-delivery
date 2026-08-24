export type NavigationRole = "user" | "driver" | "admin" | null | undefined;

export type NavigationItem = {
  key: "home" | "new-order" | "orders" | "account" | "support" | "driver-orders" | "driver-earnings" | "admin-dashboard" | "admin-drivers" | "admin-feedback" | "admin-audit";
  label: string;
  path: string;
};

export const customerNavigation: readonly NavigationItem[] = [
  { key: "home", label: "الرئيسية", path: "/" },
  { key: "new-order", label: "طلب توصيل جديد", path: "/book/parcel" },
  { key: "orders", label: "طلباتي", path: "/my-orders" },
  { key: "account", label: "الحساب والإعدادات", path: "/settings" },
  { key: "support", label: "الدعم والمساعدة", path: "/support" },
];

export const driverNavigation: readonly NavigationItem[] = [
  { key: "driver-orders", label: "الطلبات المتاحة", path: "/driver" },
  { key: "driver-earnings", label: "أرباحي", path: "/driver/earnings" },
];

export const adminNavigation: readonly NavigationItem[] = [
  { key: "admin-dashboard", label: "لوحة الإدارة", path: "/admin" },
  { key: "admin-drivers", label: "السائقون والتسعير", path: "/admin/drivers" },
  { key: "admin-feedback", label: "التقييمات والشكاوى", path: "/admin/feedback" },
  { key: "admin-audit", label: "سجل التدقيق", path: "/admin/audit" },
];

export function getRoleNavigation(role: NavigationRole, hasDriverProfile = false) {
  return {
    driver: role === "driver" && hasDriverProfile ? driverNavigation : [],
    admin: role === "admin" ? adminNavigation : [],
  };
}

export function isNavigationItemActive(pathname: string, path: string) {
  if (pathname === path) return true;
  return path === "/support" && pathname.startsWith("/support/");
}
