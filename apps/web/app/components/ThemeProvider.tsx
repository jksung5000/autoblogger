"use client";

import { useEffect } from "react";

export type ThemeMode = "light" | "dark";

export default function ThemeProvider({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [mode]);

  return null;
}
