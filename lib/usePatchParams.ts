"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Merges `patch` into the current URL's search params and navigates via
 * router.replace (no history entry), preserving every other existing param.
 * A `null` value in `patch` removes that key.
 *
 * Every list Manager's row-select/clear/filter/search navigation goes
 * through this instead of hand-building the URL, because the old
 * `clearSelection = () => router.replace(pathname)` pattern dropped every
 * query param, not just `id` — harmless while `id` was the only param any
 * of these pages used, but silently wrong the moment a search/filter/page
 * param is added (clearing the detail view would also reset the list).
 */
export function usePatchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (patch: Record<string, string | null>, opts?: { scroll?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: opts?.scroll ?? false });
    },
    [router, pathname, searchParams]
  );
}
