export const customerNavigation = [
  { key: "home", label: "الرئيسية", path: "/" },
  { key: "new-order", label: "طلب توصيل جديد", path: "/book/parcel" },
  { key: "orders", label: "طلباتي", path: "/my-orders" },
  { key: "account", label: "الحساب والإعدادات", path: "/settings" },
  { key: "support", label: "الدعم والمساعدة", path: "/support" },
] as const;

export function isNavigationItemActive(pathname: string, path: string) {
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}
