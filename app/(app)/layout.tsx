import { BottomNav } from "@/components/ui/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
