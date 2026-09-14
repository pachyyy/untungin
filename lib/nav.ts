/** Shared nav route list for the desktop sidebar, mobile bottom dock, and
 * topbar page title lookup — single source of truth for the app shell. */
export type NavItem = {
  href: string;
  label: string;
  monogram: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", monogram: "Be" },
  { href: "/produk", label: "Produk", monogram: "Pr" },
  { href: "/pesanan", label: "Pesanan", monogram: "Pe" },
  { href: "/supplier", label: "Supplier", monogram: "Su" },
  { href: "/pelanggan", label: "Pelanggan", monogram: "Pl" },
  { href: "/laporan", label: "Laporan", monogram: "La" },
  { href: "/settings", label: "Atur", monogram: "At" },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
