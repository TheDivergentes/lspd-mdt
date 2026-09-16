import { create } from "zustand";
import type { Officer } from "../api/electronApi";

export type Screen = "loading" | "setup" | "login" | "profiles" | "app";

interface AppState {
  screen: Screen;
  officer: Officer | null;

  setScreen: (s: Screen) => void;
  setOfficer: (o: Officer | null) => void;
}

// Стор живёт только внутри окна логина/настройки (authWindow) — плавающие
// панели каждая в своём процессе и получают данные через useOfficer()/API.
export const useAppStore = create<AppState>((set) => ({
  screen: "loading",
  officer: null,

  setScreen: (s) => set({ screen: s }),
  setOfficer: (o) => set({ officer: o })
}));
