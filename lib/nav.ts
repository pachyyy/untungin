import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

/** Shared nav route list for the desktop sidebar, mobile bottom dock, and
 * topbar page title lookup — single source of truth for the app shell. */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/pesanan", label: "Pesanan", icon: ShoppingCart },
  { href: "/supplier", label: "Supplier", icon: Truck },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/settings", label: "Atur", icon: Settings },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
