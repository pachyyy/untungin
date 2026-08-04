import { UangBottomNav } from "@/components/ui/UangBottomNav";

export default function UangLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-20">
      {children}
      <UangBottomNav />
    </div>
  );
}
