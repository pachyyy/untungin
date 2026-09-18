"use client";

import * as React from "react";

export type DesignMode = "glass" | "brutalist" | "minimal";

const STORAGE_KEY = "untungin-design-mode";
const DesignModeContext = React.createContext<{
  mode: DesignMode;
  setMode: (mode: DesignMode) => void;
} | null>(null);

/** Inline, unhydrated script: reads localStorage and stamps the attribute on
 * <html> before first paint, so switching to brutalist/minimal doesn't flash
 * glass first — same no-FOUC trick next-themes uses for the dark/light class.
 * "glass" stays the implicit default (no attribute set). */
const NO_FLASH_SCRIPT = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}');if(m==='brutalist'||m==='minimal')document.documentElement.setAttribute('data-design-mode',m);}catch(e){}})();`;

export function DesignModeScript() {
  return <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />;
}

export function DesignModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<DesignMode>("glass");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "brutalist" || stored === "minimal" || stored === "glass") {
      setModeState(stored);
    }
  }, []);

  React.useEffect(() => {
    if (mode === "brutalist" || mode === "minimal") {
      document.documentElement.setAttribute("data-design-mode", mode);
    } else {
      document.documentElement.removeAttribute("data-design-mode");
    }
  }, [mode]);

  const setMode = React.useCallback((next: DesignMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore (private mode / storage disabled)
    }
  }, []);

  return (
    <DesignModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DesignModeContext.Provider>
  );
}

export function useDesignMode() {
  const ctx = React.useContext(DesignModeContext);
  if (!ctx) throw new Error("useDesignMode must be used within DesignModeProvider");
  return ctx;
}
