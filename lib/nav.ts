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
  /** Reachable by URL and still titled in the topbar, but not shown as a
   * sidebar/dock link. */
  hideInNav?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/pesanan", label: "Pesanan", icon: ShoppingCart },
  { href: "/supplier", label: "Supplier", icon: Truck },
  { href: "/pelanggan", label: "Pelanggan", icon: Users, hideInNav: true },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/settings", label: "Atur", icon: Settings },
];

/** What the sidebar and bottom dock render. */
export const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.hideInNav);

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
