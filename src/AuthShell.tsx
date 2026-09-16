import React, { useEffect } from "react";
import { api } from "./api/electronApi";
import { useAppStore } from "./state/appStore";
import TitleBar from "./components/TitleBar";
import SetupGate from "./screens/Setup/SetupGate";
import LoginScreen from "./screens/Login/LoginScreen";
import ProfilePicker from "./screens/Profiles/ProfilePicker";
import AccountScreen from "./screens/Account/AccountScreen";

export default function AuthShell() {
  const { screen, setScreen, setOfficer } = useAppStore();

  useEffect(() => {
    (async () => {
      const configured = await api().isConfigured();
      if (!configured) {
        setScreen("setup");
        return;
      }
      // Активная сессия уже открыта (например, окно свернули, а не вышли) —
      // сразу на главный экран, без выбора профиля заново.
      const session = await api().getSession();
      if (session?.officer) {
        setOfficer(session.officer);
        setScreen("app");
        return;
      }
      // Есть сохранённые с прошлых запусков профили — предлагаем выбрать,
      // не гоняя через Discord заново, если сессия ещё не истекла.
      const profiles = await api().listProfiles();
      setScreen(profiles.length > 0 ? "profiles" : "login");
    })();
  }, []);

  return (
    <div className="app-shell">
      <TitleBar />
      {screen === "loading" && <div className="center-screen">Загрузка…</div>}
      {screen === "setup" && <SetupGate />}
      {screen === "profiles" && <ProfilePicker />}
      {screen === "login" && <LoginScreen />}
      {screen === "app" && <AccountScreen />}
    </div>
  );
}
