import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Verifier from "./Verifier";
import WhistleblowerDashboard from "./WhistleBlowerDashboard";
import Navigation from "../components/Navigation";
import PixelBlast from "../components/PixelBlast";
import "./styles.css";

type HealthMode = "stub" | "real-xrpl" | "unknown";
type HealthNetwork = "testnet" | "devnet" | "unknown";

type HealthState = {
  mode: HealthMode;
  network: HealthNetwork;
  xrplWss: string | null;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

function Router() {
  const [currentView, setCurrentView] = useState<'campaign' | 'verifier' | 'dashboard'>('campaign');
  const [health, setHealth] = useState<HealthState>({
    mode: "unknown",
    network: "unknown",
    xrplWss: null
  });

  const handleNavigate = (view: 'campaign' | 'verifier' | 'dashboard') => {
    setCurrentView(view);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`, {
          signal: controller.signal
        });
        const payload = await res.json();
        if (!res.ok || !payload?.ok) {
          throw new Error("Health endpoint failed");
        }

        const mode: HealthMode =
          payload.mode === "stub" || payload.mode === "real-xrpl"
            ? payload.mode
            : "unknown";
        const network: HealthNetwork =
          payload.network === "testnet" || payload.network === "devnet"
            ? payload.network
            : "unknown";

        setHealth({
          mode,
          network,
          xrplWss: typeof payload.xrplWss === "string" ? payload.xrplWss : null
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setHealth({
          mode: "unknown",
          network: "unknown",
          xrplWss: null,
          error: error instanceof Error ? error.message : "Failed to load backend mode"
        });
      }
    };

    loadHealth();
    return () => controller.abort();
  }, []);

  const modeLabel =
    health.mode === "stub"
      ? "Stub Mode"
      : health.mode === "real-xrpl"
        ? `Real XRPL Mode${health.network !== "unknown" ? ` · ${health.network}` : ""}`
        : "Mode Unknown";

  return (
    <>
      {/* Single shared PixelBlast background across all views */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", contain: "strict" }}>
        <PixelBlast
          color="#8960df"
          pixelSize={4}
          patternDensity={1}
          enableRipples={false}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 3,
            pointerEvents: "none"
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "#d7d9ff",
              background: "rgba(7, 16, 41, 0.88)",
              border: "1px solid rgba(109, 154, 255, 0.45)",
              borderRadius: "999px",
              padding: "0.4rem 0.75rem",
              backdropFilter: "blur(8px)"
            }}
          >
            {modeLabel}
            {health.mode === "unknown" && health.error ? " · backend unavailable" : ""}
          </div>
        </div>

        {currentView === 'campaign' && <App />}
        {currentView === 'verifier' && <Verifier />}
        {currentView === 'dashboard' && <WhistleblowerDashboard />}
      </div>

      <Navigation currentView={currentView} onNavigate={handleNavigate} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
