import { BottomNav } from "@/components/ui/BottomNav";
import { Sidebar } from "@/components/ui/Sidebar";
import { Topbar } from "@/components/ui/Topbar";
import { BackgroundMesh } from "@/components/ui/BackgroundMesh";
import { CommandPaletteProvider } from "@/components/ui/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <CommandPaletteProvider>
        <BackgroundMesh />
        <Sidebar />
        <div className="min-h-dvh pb-28 lg:pb-8 lg:pl-[220px]">
          <Topbar />
          <main className="mx-auto max-w-5xl px-4 py-5 lg:px-5">{children}</main>
        </div>
        <BottomNav />
      </CommandPaletteProvider>
    </ToastProvider>
  );
}
