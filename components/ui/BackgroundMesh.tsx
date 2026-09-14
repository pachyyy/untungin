/** Fixed, animated gradient-mesh backdrop for the glass visual language. Purely
 * decorative — sits behind everything at z-[-1]; respects prefers-reduced-motion
 * via the .mesh-blob CSS rules in globals.css. */
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
    </div>
  );
}
