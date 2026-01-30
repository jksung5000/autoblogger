"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ThemeProvider, { ThemeMode } from "./ThemeProvider";

export type UiSettings = {
  theme: ThemeMode;
  columnWidth: number; // px
  density: "comfortable" | "compact";
};

const DEFAULTS: UiSettings = {
  theme: "light",
  columnWidth: 320,
  density: "comfortable",
};

type UiSettingsContextValue = {
  settings: UiSettings;
  setSettings: (updater: UiSettings | ((prev: UiSettings) => UiSettings)) => void;
};

const UiSettingsContext = createContext<UiSettingsContextValue | null>(null);

export function useUiSettings() {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) throw new Error("useUiSettings must be used within UiSettingsProvider");
  return ctx;
}

export function loadUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem("ui.settings.v1");
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...v,
      columnWidth: Number(v.columnWidth ?? DEFAULTS.columnWidth),
      density: v.density === "compact" ? "compact" : "comfortable",
      theme: v.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return DEFAULTS;
  }
}

export default function UiSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<UiSettings>(DEFAULTS);

  useEffect(() => {
    setSettings(loadUiSettings());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui.settings.v1", JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const value = useMemo(() => ({ settings, setSettings }), [settings]);

  return (
    <UiSettingsContext.Provider value={value}>
      <ThemeProvider mode={settings.theme} />
      <style>{`:root { --kanban-col-width: ${settings.columnWidth}px; }`}</style>
      {children}
    </UiSettingsContext.Provider>
  );
}
