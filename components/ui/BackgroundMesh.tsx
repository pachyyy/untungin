/** Fixed backdrop, shared by both design modes. Glass mode renders the
 * animated blur-mesh (.mesh-blob, hidden in brutalist via globals.css);
 * brutalist mode renders a few flat, static, rotated rectangles (.brutal-rect,
 * hidden in glass mode) — both sets always render, CSS picks which shows, so
 * there's no client-only mode check / hydration flash. */
export function BackgroundMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-base"
    >
      <div
        className="mesh-blob left-[-5%] top-[-10%] h-[420px] w-[420px] bg-blob-1 opacity-40"
        style={{ animationName: "mesh-float-a" }}
      />
      <div
        className="mesh-blob right-[-8%] top-[5%] h-[380px] w-[380px] bg-blob-2 opacity-35"
        style={{ animationName: "mesh-float-b", animationDirection: "reverse" }}
      />
      <div
        className="mesh-blob bottom-[-10%] left-[10%] h-[460px] w-[460px] bg-blob-3 opacity-40"
        style={{ animationName: "mesh-float-b" }}
      />
      <div
        className="mesh-blob bottom-[-15%] right-[5%] h-[340px] w-[340px] bg-blob-4 opacity-30"
        style={{ animationName: "mesh-float-a", animationDirection: "reverse" }}
      />

      <div
        className="brutal-rect left-[-8%] top-[-12%] h-[300px] w-[420px] bg-blob-1 opacity-[0.08]"
        style={{ transform: "rotate(-8deg)" }}
      />
      <div
        className="brutal-rect right-[-10%] top-[10%] h-[260px] w-[340px] bg-blob-2 opacity-[0.07]"
        style={{ transform: "rotate(12deg)" }}
      />
      <div
        className="brutal-rect bottom-[-10%] left-[15%] h-[280px] w-[380px] bg-blob-3 opacity-[0.08]"
        style={{ transform: "rotate(6deg)" }}
      />
    </div>
  );
}
