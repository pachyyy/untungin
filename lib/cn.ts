// Re-export from utils so both `@/lib/cn` (legacy) and `@/lib/utils` (shadcn
// convention) resolve to the same tailwind-merge-aware combiner.
export { cn } from "@/lib/utils";
