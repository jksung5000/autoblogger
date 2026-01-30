"use client";

import { useEffect, useState } from "react";
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

export function loadUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem("ui.settings.v1");
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...v,
      columnWidth: Number(v.columnWidth ?? DEFAULTS.columnWidth),
    };
  } catch {
    return DEFAULTS;
  }
}

export default function UiSettingsProvider() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULTS);

  useEffect(() => {
    const s = loadUiSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui.settings.v1", JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  return (
    <>
      <ThemeProvider mode={settings.theme} />
      <style>{`:root { --kanban-col-width: ${settings.columnWidth}px; }`}</style>
      <UiSettingsEditor settings={settings} setSettings={setSettings} />
    </>
  );
}

function UiSettingsEditor({
  settings,
  setSettings,
}: {
  settings: UiSettings;
  setSettings: (s: UiSettings) => void;
}) {
  // This editor is rendered inside the page header (not a separate page yet)
  return null;
}
