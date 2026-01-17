import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import "./index.css";
import { Chat } from "./pages/Chat";
import { Home } from "./pages/Home";
import { Review } from "./pages/Review";
import { Settings } from "./pages/Settings";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const loadServerSettings = useAppStore((state) => state.loadServerSettings);
  const initializeTheme = useAppStore((state) => state.initializeTheme);

  // Load server settings and initialize theme on app startup
  useEffect(() => {
    loadServerSettings();
    initializeTheme();
  }, [loadServerSettings, initializeTheme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/chat/:sessionId" element={<Chat />} />
          <Route path="/chat/:sessionId/review/:fileIndex" element={<Review />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
